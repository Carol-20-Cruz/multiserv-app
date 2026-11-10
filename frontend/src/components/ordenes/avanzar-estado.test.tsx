import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AvanzarEstado from "./avanzar-estado";

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

beforeEach(() => {
  router.push.mockClear();
  router.refresh.mockClear();
  fetchFalso.mockClear();
  vi.stubGlobal("fetch", fetchFalso);
  respuesta = { status: 200, cuerpo: { id: 5, estado: "EN_DIAGNOSTICO" } };
});

const MENSAJE_FALTA_ABONO = "Falta el abono mínimo para pasar a reparación";

describe("Avanzar el estado de la orden", () => {
  // AJ-10 (frontera): en diagnóstico con cotización de 180.001 y 0 pagado,
  // el botón queda deshabilitado y el aviso dice cuánto falta (techo del
  // 50 % = 90.001).
  it("bloqueo FALTA_ABONO: botón deshabilitado y aviso con los montos", () => {
    // Arrange + Act
    render(
      <AvanzarEstado
        ordenId={5}
        estado="EN_DIAGNOSTICO"
        siguienteEstado="EN_REPARACION"
        bloqueo={{ motivo: "FALTA_ABONO", mensaje: MENSAJE_FALTA_ABONO }}
        abonoMinimo={90001}
        totalPagado={0}
      />,
    );

    // Assert
    const boton = screen.getByRole("button", {
      name: "Pasar a «En reparación»",
    });
    expect(boton).toBeDisabled();
    const aviso = screen.getByText(new RegExp(MENSAJE_FALTA_ABONO));
    expect(aviso).toHaveTextContent("$ 90.001");
    expect(aviso).toHaveTextContent("$ 0");
    expect(boton).toHaveAttribute("aria-describedby", "bloqueo-estado");
  });

  // AJ-09: sin cotización aprobada, el aviso lo dice (sin montos).
  it("bloqueo FALTA_VALOR_COTIZADO: deshabilitado con su mensaje", () => {
    // Arrange + Act
    render(
      <AvanzarEstado
        ordenId={5}
        estado="EN_DIAGNOSTICO"
        siguienteEstado="EN_REPARACION"
        bloqueo={{
          motivo: "FALTA_VALOR_COTIZADO",
          mensaje:
            "Falta registrar la cotización aprobada para pasar a reparación",
        }}
        abonoMinimo={null}
        totalPagado={0}
      />,
    );

    // Assert
    expect(
      screen.getByRole("button", { name: "Pasar a «En reparación»" }),
    ).toBeDisabled();
    expect(
      screen.getByText(
        "Falta registrar la cotización aprobada para pasar a reparación",
      ),
    ).toBeVisible();
  });

  // SWR-ORD-011: se pide el estado AL QUE se pasa (no "avanzar"), con el
  // comentario; luego se vuelve al detalle con el aviso de éxito.
  it("sin bloqueo: confirma y envía estadoNuevo con el comentario", async () => {
    // Arrange
    const user = userEvent.setup();
    render(
      <AvanzarEstado
        ordenId={5}
        estado="RECIBIDO"
        siguienteEstado="EN_DIAGNOSTICO"
        bloqueo={null}
        abonoMinimo={null}
        totalPagado={0}
      />,
    );

    // Act
    await user.click(
      screen.getByRole("button", { name: "Pasar a «En diagnóstico»" }),
    );
    await user.type(
      await screen.findByLabelText("Comentario"),
      "Se revisa mañana",
    );
    await user.click(screen.getByRole("button", { name: "Confirmar cambio" }));

    // Assert
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFalso.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/ordenes/5/estado");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      estadoNuevo: "EN_DIAGNOSTICO",
      comentario: "Se revisa mañana",
    });
    expect(router.push).toHaveBeenCalledWith("/ordenes/5?estado=1", {
      scroll: false,
    });
  });

  // AJ-07: si otra persona ya cambió el estado (doble clic, dos pestañas),
  // el backend responde 409 MISMO_ESTADO y se muestra su mensaje.
  it("el backend responde 409: muestra el motivo y no navega", async () => {
    // Arrange
    respuesta = {
      status: 409,
      cuerpo: {
        statusCode: 409,
        message: "La orden ya está en ese estado",
        motivo: "MISMO_ESTADO",
      },
    };
    const user = userEvent.setup();
    render(
      <AvanzarEstado
        ordenId={5}
        estado="RECIBIDO"
        siguienteEstado="EN_DIAGNOSTICO"
        bloqueo={null}
        abonoMinimo={null}
        totalPagado={0}
      />,
    );

    // Act
    await user.click(
      screen.getByRole("button", { name: "Pasar a «En diagnóstico»" }),
    );
    await user.click(
      await screen.findByRole("button", { name: "Confirmar cambio" }),
    );

    // Assert
    expect(
      await screen.findByText("La orden ya está en ese estado"),
    ).toBeVisible();
    expect(router.push).not.toHaveBeenCalled();
  });

  // SWR-ENT-003: de LISTO_PARA_ENTREGA no se pasa con este botón; la
  // entrega tiene su propia acción (Entrega B).
  it("listo para entrega: no hay botón y explica que la entrega va aparte", () => {
    // Arrange + Act
    render(
      <AvanzarEstado
        ordenId={5}
        estado="LISTO_PARA_ENTREGA"
        siguienteEstado={null}
        bloqueo={null}
        abonoMinimo={90001}
        totalPagado={90001}
      />,
    );

    // Assert
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Entregar equipo");
  });
});
