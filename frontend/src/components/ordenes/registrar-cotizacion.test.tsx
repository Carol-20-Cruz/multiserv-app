import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegistrarCotizacion from "./registrar-cotizacion";

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
  respuesta = { status: 200, cuerpo: { id: 5, valorCotizado: 180000 } };
});

// Abre el diálogo y devuelve sus campos.
async function abrir(
  props: Partial<React.ComponentProps<typeof RegistrarCotizacion>> = {},
) {
  const user = userEvent.setup();
  render(
    <RegistrarCotizacion
      ordenId={5}
      porcentajeAbono={50}
      diagnostico={null}
      valorCotizado={null}
      {...props}
    />,
  );
  await user.click(screen.getByRole("button", { name: /cotización$/ }));
  return {
    user,
    diagnostico: await screen.findByLabelText("Diagnóstico *"),
    valor: screen.getByLabelText("Valor aprobado (pesos) *"),
    guardar: screen.getByRole("button", { name: "Guardar cotización" }),
  };
}

describe("Registrar la cotización aprobada", () => {
  // SWR-PAY-004 / AJ-09: diagnóstico y valor son obligatorios.
  it("campos vacíos: muestra los dos errores y no envía", async () => {
    // Arrange
    const { user, guardar } = await abrir();

    // Act
    await user.click(guardar);

    // Assert
    expect(
      await screen.findByText("El diagnóstico es obligatorio"),
    ).toBeVisible();
    expect(screen.getByText("El valor cotizado es obligatorio")).toBeVisible();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  // SWR-CON-003 (fronteras): 0 no es válido; con coma decimal tampoco.
  it.each([
    ["0", "El valor cotizado debe ser mayor que 0"],
    ["12,5", "El valor cotizado debe ser un valor entero en pesos"],
    ["1.000.000.000", "El valor cotizado no puede superar $ 999.999.999"],
  ])("valor %s: '%s'", async (escrito, mensaje) => {
    // Arrange
    const { user, diagnostico, valor, guardar } = await abrir();
    await user.type(diagnostico, "Compresor dañado");
    await user.type(valor, escrito);

    // Act
    await user.click(guardar);

    // Assert
    expect(await screen.findByText(mensaje)).toBeVisible();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  // Datos válidos: el valor con puntos de miles se envía como entero y se
  // vuelve al detalle con el aviso de éxito.
  it("valor '180.000': envía 180000 con PUT y vuelve al detalle", async () => {
    // Arrange
    const { user, diagnostico, valor, guardar } = await abrir();
    await user.type(diagnostico, "Compresor dañado, se cambia");
    await user.type(valor, "180.000");

    // Act
    await user.click(guardar);

    // Assert
    const [url, init] = fetchFalso.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/ordenes/5/cotizacion");
    expect(init.method).toBe("PUT");
    expect(cuerpoEnviado()).toEqual({
      diagnostico: "Compresor dañado, se cambia",
      valorCotizado: 180000,
    });
    expect(router.push).toHaveBeenCalledWith("/ordenes/5?cotizacion=1", {
      scroll: false,
    });
  });

  // Corrección (respuesta de la dueña): con cotización previa el botón dice
  // "Corregir", el diálogo trae lo guardado y se envía el valor nuevo.
  it("corregir: trae lo guardado y envía el valor nuevo", async () => {
    // Arrange
    const { user, diagnostico, valor, guardar } = await abrir({
      diagnostico: "Compresor dañado",
      valorCotizado: 180000,
    });
    expect(diagnostico).toHaveValue("Compresor dañado");
    expect(valor).toHaveValue("180000");
    expect(screen.getByText(/Valor actual: \$\s180\.000/)).toBeVisible();

    // Act
    await user.clear(valor);
    await user.type(valor, "180001");
    await user.click(guardar);

    // Assert
    expect(cuerpoEnviado()).toMatchObject({ valorCotizado: 180001 });
  });

  // AJ-09: si entre tanto se registró un pago, el backend responde 409
  // TIENE_PAGOS y se muestra su mensaje sin cerrar el diálogo.
  it("el backend responde 409 TIENE_PAGOS: muestra el mensaje", async () => {
    // Arrange
    respuesta = {
      status: 409,
      cuerpo: {
        statusCode: 409,
        message: "La orden ya tiene pagos: el valor cotizado quedó fijo",
        motivo: "TIENE_PAGOS",
      },
    };
    const { user, guardar } = await abrir({
      diagnostico: "Compresor dañado",
      valorCotizado: 180000,
    });

    // Act
    await user.click(guardar);

    // Assert
    expect(
      await screen.findByText(
        "La orden ya tiene pagos: el valor cotizado quedó fijo",
      ),
    ).toBeVisible();
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(router.push).not.toHaveBeenCalled();
  });
});
