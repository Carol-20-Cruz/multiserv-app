import type { ClienteDetalle } from "@/lib/tipos-clientes";
import type { OrdenDetalle, Responsable } from "@/lib/tipos-ordenes";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import OrdenForm from ".";
import {
  MENSAJE_CLIENTE,
  MENSAJE_DIRECCION_DOMICILIO,
  MENSAJE_FALLA,
} from "./schema";

// ---------- Simulaciones ----------

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

// Backend simulado: una respuesta para cada método.
type Respuesta = { status: number; cuerpo: unknown };
let respuestaGuardar: Respuesta;
let respuestaGet: (url: string) => Respuesta;
const fetchFalso = vi.fn(async (url: string, init?: RequestInit) => {
  const r =
    init?.method === "POST" || init?.method === "PATCH"
      ? respuestaGuardar
      : respuestaGet(url);
  return new Response(JSON.stringify(r.cuerpo), { status: r.status });
});

const llamadas = (metodo: string) =>
  fetchFalso.mock.calls.filter(([, init]) => init?.method === metodo);
const cuerpoDe = (metodo: string) =>
  JSON.parse(String(llamadas(metodo)[0][1]?.body)) as Record<string, unknown>;

// ---------- Datos ----------

const responsables: Responsable[] = [
  { id: 1, nombre: "Dueño de prueba", rol: "DUENO" },
  { id: 2, nombre: "Técnico de prueba", rol: "TECNICO" },
];

const equipo = (id: number, marca: string) => ({
  id,
  marca,
  referencia: null,
  serial: null,
  creadoEn: "2026-11-09T15:00:00.000Z",
  tipoEquipo: { id: 5, nombre: "Nevera" },
});

const cliente: ClienteDetalle = {
  id: 7,
  nombre: "Ana Gómez",
  telefono: "3001234567",
  activo: true,
  telefonoAlterno: null,
  correo: null,
  direccion: null,
  barrio: null,
  ciudad: "Neiva",
  autorizaDatos: true,
  fechaAutorizacion: "2026-11-09T15:00:00.000Z",
  creadoEn: "2026-11-09T15:00:00.000Z",
  equipos: [equipo(11, "Haceb"), equipo(12, "LG")],
};

beforeEach(() => {
  router.push.mockClear();
  router.refresh.mockClear();
  fetchFalso.mockClear();
  vi.stubGlobal("fetch", fetchFalso);
  respuestaGuardar = {
    status: 201,
    cuerpo: { id: 77, numero: "MS-2026-00001", estado: "RECIBIDO" },
  };
  respuestaGet = () => ({ status: 404, cuerpo: {} });
});

// Orden nueva abierta desde la fila del equipo 12 del cliente 7.
function dibujarNueva(
  props: Partial<React.ComponentProps<typeof OrdenForm>> = {},
) {
  const user = userEvent.setup();
  render(
    <OrdenForm
      responsables={responsables}
      usuarioId={2}
      clienteInicial={cliente}
      equipoInicialId={12}
      {...props}
    />,
  );
  return {
    user,
    falla: screen.getByLabelText("Falla reportada *"),
    crear: screen.getByRole("button", { name: "Crear orden" }),
  };
}

describe("Formulario de orden de servicio", () => {
  // SWR-ORD-001: desde el detalle del cliente llega con el cliente y el
  // equipo elegidos; la falla es obligatoria y tiene label visible.
  it("prellenado con ?clienteId&equipoId: muestra el cliente y el equipo", () => {
    // Arrange + Act
    const { falla, crear } = dibujarNueva();

    // Assert
    expect(screen.getByText("Ana Gómez")).toBeVisible();
    expect(screen.getByText("Nevera LG")).toBeVisible();
    expect(falla).toHaveAttribute("aria-required", "true");
    expect(crear).toBeEnabled();
  });

  // SWR-ORD-001: sin falla reportada no se crea la orden.
  it("falla vacía: muestra el error y no envía", async () => {
    // Arrange
    const { user, crear } = dibujarNueva();

    // Act
    await user.click(crear);

    // Assert
    expect(await screen.findByText(MENSAJE_FALLA)).toBeInTheDocument();
    expect(screen.getByLabelText("Falla reportada *")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(llamadas("POST")).toHaveLength(0);
  });

  // SWR-ORD-001: sin cliente no se crea la orden.
  it("sin cliente elegido: muestra 'El cliente es obligatorio' y no envía", async () => {
    // Arrange
    const { user, falla, crear } = dibujarNueva({ clienteInicial: null });
    await user.type(falla, "No enfría");

    // Act
    await user.click(crear);

    // Assert
    expect(await screen.findByText(MENSAJE_CLIENTE)).toBeInTheDocument();
    expect(llamadas("POST")).toHaveLength(0);
  });

  // SWR-ORD-001: a domicilio, la dirección es obligatoria.
  it("a domicilio sin dirección: muestra el error y no envía", async () => {
    // Arrange
    const { user, falla, crear } = dibujarNueva();
    await user.type(falla, "No enfría");
    await user.click(screen.getByRole("radio", { name: "A domicilio" }));

    // Act
    await user.click(crear);

    // Assert
    expect(
      await screen.findByText(MENSAJE_DIRECCION_DOMICILIO),
    ).toBeInTheDocument();
    expect(llamadas("POST")).toHaveLength(0);
  });

  // SWR-ORD-001 + SWR-ORD-002: datos válidos -> se envían ids numéricos
  // (nunca el número de orden ni el estado), y se abre el detalle con el
  // aviso de éxito.
  it("datos válidos: crea la orden y abre su detalle", async () => {
    // Arrange
    const { user, falla, crear } = dibujarNueva();
    await user.type(falla, "  No enfría  ");

    // Act
    await user.click(crear);

    // Assert
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Orden creada correctamente.",
    );
    const cuerpo = cuerpoDe("POST");
    expect(cuerpo).toMatchObject({
      clienteId: 7,
      equipoId: 12,
      responsableId: 2,
      modalidad: "TALLER",
      direccionVisita: null,
      fechaVisita: null,
      fallaReportada: "No enfría",
    });
    expect(cuerpo).not.toHaveProperty("numero");
    expect(cuerpo).not.toHaveProperty("estado");
    expect(router.push).toHaveBeenCalledWith("/ordenes/77?creada=1");
  });

  // A domicilio con fecha: la hora escrita es la de Colombia (UTC-5).
  it("a domicilio con dirección y fecha: envía la fecha en hora de Colombia", async () => {
    // Arrange
    const { user, falla, crear } = dibujarNueva();
    await user.type(falla, "No enciende");
    await user.click(screen.getByRole("radio", { name: "A domicilio" }));
    await user.type(
      screen.getByLabelText("Dirección de la visita *"),
      "Calle 8 # 5-20",
    );
    await user.type(
      screen.getByLabelText("Fecha de la visita"),
      "2026-11-12T14:30",
    );

    // Act
    await user.click(crear);

    // Assert
    await screen.findByRole("status");
    expect(cuerpoDe("POST")).toMatchObject({
      modalidad: "DOMICILIO",
      direccionVisita: "Calle 8 # 5-20",
      fechaVisita: "2026-11-12T19:30:00.000Z",
    });
  });

  // Elegir el cliente: se busca por nombre y, al elegirlo, se cargan sus
  // equipos; con un solo equipo, queda elegido.
  it("buscar y elegir un cliente con un solo equipo: lo deja elegido", async () => {
    // Arrange
    const unEquipo = { ...cliente, equipos: [equipo(11, "Haceb")] };
    respuestaGet = (url) =>
      url.startsWith("/api/clientes?")
        ? {
            status: 200,
            cuerpo: {
              datos: [
                {
                  id: 7,
                  nombre: "Ana Gómez",
                  telefono: "3001234567",
                  activo: true,
                  barrio: null,
                  ciudad: "Neiva",
                  equipos: 1,
                },
              ],
              total: 1,
              pagina: 1,
              porPagina: 10,
            },
          }
        : { status: 200, cuerpo: unEquipo };
    const { user } = dibujarNueva({ clienteInicial: null });

    // Act
    await user.type(screen.getByLabelText("Cliente *"), "Ana");
    await user.click(screen.getByRole("button", { name: "Buscar" }));
    await user.click(await screen.findByRole("button", { name: /Ana Gómez/ }));

    // Assert
    expect(
      await screen.findByRole("button", { name: "Cambiar cliente" }),
    ).toBeVisible();
    expect(screen.getByText("Nevera Haceb")).toBeVisible();
    expect(fetchFalso).toHaveBeenCalledWith(
      "/api/clientes?buscar=Ana",
      expect.anything(),
    );
  });

  // Error del backend (p. ej. cliente desactivado entre tanto): se muestra
  // su mensaje y no se navega.
  it("el backend responde 409: muestra su mensaje y no navega", async () => {
    // Arrange
    respuestaGuardar = {
      status: 409,
      cuerpo: {
        message: "No se pueden crear órdenes para un cliente desactivado",
      },
    };
    const { user, falla, crear } = dibujarNueva();
    await user.type(falla, "No enfría");

    // Act
    await user.click(crear);

    // Assert
    expect(
      await screen.findByText(
        "No se pueden crear órdenes para un cliente desactivado",
      ),
    ).toBeVisible();
    expect(router.push).not.toHaveBeenCalled();
  });

  // Editar: el cliente y el equipo no se envían (no se cambian); pasar a
  // taller borra la dirección.
  it("editar: envía solo los datos de la recepción con PATCH", async () => {
    // Arrange
    const orden = {
      id: 77,
      numero: "MS-2026-00001",
      estado: "EN_DIAGNOSTICO",
      modalidad: "DOMICILIO",
      direccionVisita: "Calle 8 # 5-20",
      fechaVisita: null,
      fallaReportada: "No enfría",
      accesorios: null,
      estadoEquipo: null,
      cliente: {
        id: 7,
        nombre: "Ana Gómez",
        telefono: "3001234567",
        activo: true,
      },
      equipo: { ...equipo(12, "LG"), tipoEquipo: { nombre: "Nevera" } },
      responsable: { id: 1, nombre: "Dueño de prueba" },
    } as unknown as OrdenDetalle;
    respuestaGuardar = { status: 200, cuerpo: { id: 77 } };
    const user = userEvent.setup();
    render(<OrdenForm responsables={responsables} orden={orden} />);

    // Act
    await user.click(screen.getByRole("radio", { name: "En el taller" }));
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // Assert
    await screen.findByRole("status");
    const cuerpo = cuerpoDe("PATCH");
    expect(cuerpo).toMatchObject({
      responsableId: 1,
      modalidad: "TALLER",
      direccionVisita: null,
      fallaReportada: "No enfría",
    });
    expect(cuerpo).not.toHaveProperty("clienteId");
    expect(cuerpo).not.toHaveProperty("equipoId");
    expect(llamadas("PATCH")[0][0]).toBe("/api/ordenes/77");
    expect(router.push).toHaveBeenCalledWith("/ordenes/77?actualizada=1");
  });
});
