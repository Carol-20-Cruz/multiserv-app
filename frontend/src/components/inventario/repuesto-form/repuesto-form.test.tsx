import type { Repuesto } from "@/lib/tipos-inventario";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RepuestoForm from ".";

// ---------- Simulaciones ----------

// Router de Next simulado: se revisa a dónde navega el formulario.
const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

// Backend simulado: la ruta /api responde lo que diga cada prueba.
type Respuesta = { status: number; cuerpo: unknown };
let respuesta: Respuesta;
const fetchFalso = vi.fn(async () => {
  return new Response(JSON.stringify(respuesta.cuerpo), {
    status: respuesta.status,
  });
});

const TIPOS = [
  { id: 1, nombre: "Nevera" },
  { id: 2, nombre: "Lavadora" },
];

const repuestoGuardado: Repuesto = {
  id: 15,
  nombre: "Bomba de desagüe",
  referencia: "W10276397",
  marcaCompatible: "Whirlpool",
  cantidad: 6,
  cantidadMinima: 2,
  precioVenta: 95000,
  activo: true,
  tipoEquipo: { id: 2, nombre: "Lavadora" },
  stockBajo: false,
};

beforeEach(() => {
  router.push.mockClear();
  router.refresh.mockClear();
  fetchFalso.mockClear();
  vi.stubGlobal("fetch", fetchFalso);
  respuesta = { status: 201, cuerpo: repuestoGuardado };
});

// ---------- Ayudas ----------

// Los labels se buscan como se ven: "Referencia *".
function dibujar(repuesto?: Repuesto) {
  const user = userEvent.setup();
  render(<RepuestoForm tipos={TIPOS} repuesto={repuesto} />);
  return {
    user,
    nombre: screen.getByLabelText("Nombre del repuesto *"),
    referencia: screen.getByLabelText("Referencia *"),
    marca: screen.getByLabelText("Marca compatible *"),
    precio: screen.getByLabelText("Precio de venta (COP) *"),
    minimo: screen.getByLabelText("Cantidad mínima (alerta) *"),
  };
}

const cuerpoEnviado = () => {
  const [, init] = fetchFalso.mock.calls[0] as unknown as [string, RequestInit];
  return JSON.parse(String(init.body)) as Record<string, unknown>;
};

describe("Formulario de repuesto", () => {
  // SWR-INV-001 + AJ-05: sin datos no se registra y cada campo explica qué falta.
  it("enviar vacío: muestra los mensajes en español y no llama a la API", async () => {
    // Arrange
    const { user } = dibujar();

    // Act
    await user.click(
      screen.getByRole("button", { name: "Registrar repuesto" }),
    );

    // Assert
    expect(
      await screen.findByText("El nombre es obligatorio"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("La referencia es obligatoria"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("El tipo de equipo es obligatorio"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("La cantidad inicial es obligatoria"),
    ).toBeInTheDocument();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  // SWR-CON-003: pesos sin decimales; el mínimo no puede ser negativo.
  it("precio con decimales y mínimo negativo: muestra los errores", async () => {
    // Arrange
    const { user, precio, minimo } = dibujar();

    // Act
    await user.type(precio, "1500,5");
    await user.clear(minimo);
    await user.type(minimo, "-1");
    await user.tab();

    // Assert
    expect(
      await screen.findByText(
        "El precio de venta debe ser un valor entero en pesos",
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "La cantidad mínima debe ser un número entero (0 o más)",
      ),
    ).toBeInTheDocument();
    expect(precio).toHaveAttribute("aria-invalid", "true");
  });

  // SWR-INV-009: avisa ANTES de guardar que el repuesto quedará en
  // existencia baja (cantidad inicial 1 con mínimo 1).
  it("cantidad inicial igual al mínimo: avisa que quedará con existencia baja", async () => {
    // Arrange
    const { user } = dibujar();

    // Act
    await user.type(screen.getByLabelText("Cantidad inicial *"), "1");

    // Assert
    expect(await screen.findByRole("status")).toHaveTextContent(
      "quedará con existencia baja",
    );
  });

  // Edición: se envían los datos con números enteros ("95.000" -> 95000) y
  // la cantidad NO viaja (solo cambia con "Registrar entrada").
  it("editar: envía PATCH sin cantidad y abre el detalle", async () => {
    // Arrange
    respuesta = { status: 200, cuerpo: repuestoGuardado };
    const { user, precio, minimo } = dibujar(repuestoGuardado);
    expect(
      screen.queryByLabelText("Cantidad inicial *"),
    ).not.toBeInTheDocument();
    await user.clear(precio);
    await user.type(precio, "99.000");
    await user.clear(minimo);
    await user.type(minimo, "3");

    // Act
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // Assert
    expect(router.push).toHaveBeenCalledWith("/inventario/15?actualizado=1");
    const [url, init] = fetchFalso.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/repuestos/15");
    expect(init.method).toBe("PATCH");
    const cuerpo = cuerpoEnviado();
    expect(cuerpo).toMatchObject({
      tipoEquipoId: 2,
      precioVenta: 99000,
      cantidadMinima: 3,
    });
    expect(cuerpo).not.toHaveProperty("cantidad");
    expect(cuerpo).not.toHaveProperty("cantidadInicial");
  });

  // Respuesta 5 de la dueña: referencia de un repuesto desactivado -> 409
  // y el mensaje queda en el campo Referencia.
  it("referencia de un repuesto desactivado (409): muestra el mensaje en el campo", async () => {
    // Arrange
    respuesta = {
      status: 409,
      cuerpo: {
        statusCode: 409,
        message: "Existe un repuesto desactivado con esta referencia",
      },
    };
    const { user, referencia } = dibujar(repuestoGuardado);

    // Act
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // Assert
    expect(
      await screen.findByText(
        "Existe un repuesto desactivado con esta referencia",
      ),
    ).toBeInTheDocument();
    expect(referencia).toHaveAttribute("aria-invalid", "true");
    expect(router.push).not.toHaveBeenCalled();
  });

  // Verificación (doble clic): mientras se envía y después del éxito (la
  // navegación tarda), el botón queda deshabilitado: un segundo clic no
  // envía otra vez. (Es el mismo botón que "Registrar repuesto"; se prueba
  // al editar porque el formulario ya viene completo.)
  it("doble clic en Guardar cambios: se envía una sola vez", async () => {
    // Arrange: el backend tarda en responder hasta que lo liberamos.
    let liberar!: () => void;
    fetchFalso.mockImplementationOnce(
      () =>
        new Promise<Response>((ok) => {
          liberar = () =>
            ok(new Response(JSON.stringify(repuestoGuardado), { status: 200 }));
        }),
    );
    const { user } = dibujar(repuestoGuardado);
    const guardar = screen.getByRole("button", { name: "Guardar cambios" });

    // Act
    await user.click(guardar);
    await user.click(guardar);

    // Assert 1: mientras se envía.
    expect(guardar).toBeDisabled();
    expect(guardar).toHaveTextContent("Guardando...");
    expect(fetchFalso).toHaveBeenCalledTimes(1);

    // Act 2: el backend responde; la página aún no cambia.
    liberar();
    await vi.waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));
    await user.click(guardar);

    // Assert 2
    expect(guardar).toBeDisabled();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });
});
