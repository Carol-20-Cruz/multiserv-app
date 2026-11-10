import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegistrarPago, { valorSugerido } from "./registrar-pago";

// ---------- Simulaciones ----------

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

type Respuesta = { status: number; cuerpo: unknown };
let respuesta: Respuesta;
const fetchFalso = vi.fn(
  async () =>
    new Response(JSON.stringify(respuesta.cuerpo), {
      status: respuesta.status,
    }),
);
const cuerpoEnviado = () =>
  JSON.parse(
    String(
      (fetchFalso.mock.calls[0] as unknown as [string, RequestInit])[1].body,
    ),
  ) as Record<string, unknown>;

beforeEach(() => {
  router.push.mockClear();
  router.refresh.mockClear();
  fetchFalso.mockClear();
  vi.stubGlobal("fetch", fetchFalso);
  respuesta = { status: 201, cuerpo: { pago: { id: 1 }, saldo: 125000 } };
});

// Orden de la prueba real: cotizada en $ 250.000, abono mínimo 50 %.
async function abrir(
  props: Partial<React.ComponentProps<typeof RegistrarPago>> = {},
) {
  const user = userEvent.setup();
  render(
    <RegistrarPago
      ordenId={2}
      saldo={250000}
      abonoMinimo={125000}
      totalPagado={0}
      {...props}
    />,
  );
  await user.click(screen.getByRole("button", { name: "Registrar pago" }));
  return {
    user,
    valor: await screen.findByLabelText("Valor (pesos) *"),
    guardar: screen.getByRole("button", { name: "Guardar pago" }),
  };
}

describe("Valor sugerido del pago", () => {
  it.each([
    // [saldo, abonoMinimo, pagado, sugerido]
    [250000, 125000, 0, 125000], // falta todo el abono
    [200000, 125000, 50000, 75000], // falta parte del abono
    [125000, 125000, 125000, 125000], // abono cubierto -> todo el saldo
    [1000, null, 0, 1000], // sin abono mínimo -> todo el saldo
  ])(
    "saldo %p, abono %p, pagado %p: sugiere %p",
    (saldo, abono, pagado, esperado) => {
      // Act
      const sugerido = valorSugerido(saldo, abono, pagado);

      // Assert
      expect(sugerido).toBe(esperado);
    },
  );
});

describe("Registrar un pago", () => {
  // AJ-10: sin pagos se sugiere el abono mínimo.
  it("sin pagos: sugiere el abono mínimo de $ 125.000", async () => {
    // Act
    const { valor } = await abrir();

    // Assert
    expect(valor).toHaveValue("125000");
    expect(
      screen.getByText(/Se sugiere el abono mínimo que falta \(\$\s125\.000\)/),
    ).toBeVisible();
    expect(
      screen.getByText(
        /Queda registrado como abono\. Saldo después del pago: \$\s125\.000/,
      ),
    ).toBeVisible();
  });

  // Con el abono cubierto se sugiere el saldo y se avisa que lo cubre.
  it("abono cubierto: sugiere todo el saldo y dice que queda como saldo", async () => {
    // Act
    const { valor } = await abrir({ saldo: 125000, totalPagado: 125000 });

    // Assert
    expect(valor).toHaveValue("125000");
    expect(screen.getByText(/Se sugiere pagar todo el saldo./)).toBeVisible();
    expect(
      screen.getByText(
        "Cubre todo el saldo: queda registrado como pago del saldo.",
      ),
    ).toBeVisible();
  });

  // SWR-PAY-004 (frontera): saldo + 1 no deja enviar.
  it("valor = saldo + 1: muestra el tope y no envía", async () => {
    // Arrange
    const { user, valor, guardar } = await abrir({
      saldo: 125000,
      totalPagado: 125000,
    });
    await user.clear(valor);
    await user.type(valor, "125.001");

    // Act
    await user.click(guardar);

    // Assert
    expect(
      await screen.findByText(
        /El pago no puede superar el saldo pendiente \(\$\s125\.000\)/,
      ),
    ).toBeVisible();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it.each([
    ["", "El valor del pago es obligatorio"],
    ["0", "El valor del pago debe ser mayor que 0"],
    ["12,5", "El valor del pago debe ser un valor entero en pesos"],
  ])("valor %p: '%s'", async (escrito, mensaje) => {
    // Arrange
    const { user, valor, guardar } = await abrir();
    await user.clear(valor);
    if (escrito) await user.type(valor, escrito);

    // Act
    await user.click(guardar);

    // Assert
    expect(await screen.findByText(mensaje)).toBeVisible();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  // Frontera: exactamente el saldo, por transferencia con referencia.
  it("valor = saldo por transferencia: envía el POST y vuelve con ?pago=1", async () => {
    // Arrange
    const { user, valor, guardar } = await abrir({
      saldo: 125000,
      totalPagado: 125000,
    });
    await user.clear(valor);
    await user.type(valor, "125.000");
    await user.click(screen.getByRole("radio", { name: "Transferencia" }));
    await user.type(screen.getByLabelText("Referencia"), " PRUEBA-TRF-001 ");

    // Act
    await user.click(guardar);

    // Assert
    const [url, init] = fetchFalso.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/ordenes/2/pagos");
    expect(init.method).toBe("POST");
    expect(cuerpoEnviado()).toEqual({
      valor: 125000,
      medio: "TRANSFERENCIA",
      referencia: "PRUEBA-TRF-001",
    });
    expect(router.push).toHaveBeenCalledWith("/ordenes/2?pago=1", {
      scroll: false,
    });
  });

  it("abono en efectivo sin referencia: envía referencia null", async () => {
    // Arrange
    const { user, guardar } = await abrir();

    // Act
    await user.click(guardar);

    // Assert
    expect(cuerpoEnviado()).toEqual({
      valor: 125000,
      medio: "EFECTIVO",
      referencia: null,
    });
  });

  // Si entre tanto otro pago bajó el saldo, el backend responde 409.
  it("el backend responde 409 SUPERA_SALDO: muestra el mensaje", async () => {
    // Arrange
    respuesta = {
      status: 409,
      cuerpo: {
        statusCode: 409,
        message: "El pago no puede superar el saldo pendiente",
        motivo: "SUPERA_SALDO",
      },
    };
    const { user, guardar } = await abrir();

    // Act
    await user.click(guardar);

    // Assert
    expect(
      await screen.findByText("El pago no puede superar el saldo pendiente"),
    ).toBeVisible();
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(router.push).not.toHaveBeenCalled();
  });

  // Verificación (doble clic): mientras se guarda y después del éxito,
  // "Guardar pago" queda deshabilitado y se envía un solo POST.
  it("doble clic en Guardar pago: se envía una sola vez", async () => {
    // Arrange
    let liberar!: () => void;
    fetchFalso.mockImplementationOnce(
      () =>
        new Promise<Response>((ok) => {
          liberar = () =>
            ok(new Response(JSON.stringify({ saldo: 0 }), { status: 201 }));
        }),
    );
    const { user, guardar } = await abrir();

    // Act
    await user.click(guardar);
    await user.click(guardar);

    // Assert
    expect(guardar).toBeDisabled();
    expect(guardar).toHaveTextContent("Guardando...");
    expect(fetchFalso).toHaveBeenCalledTimes(1);

    // Tras el éxito sigue deshabilitado mientras el diálogo se cierra.
    liberar();
    await vi.waitFor(() => expect(router.push).toHaveBeenCalled());
    if (guardar.isConnected) {
      expect(guardar).toBeDisabled();
      await user.click(guardar);
    }
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });
});
