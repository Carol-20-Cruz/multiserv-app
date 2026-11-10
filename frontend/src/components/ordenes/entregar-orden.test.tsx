import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EntregarOrden, { motivoNoEntrega } from "./entregar-orden";

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
  respuesta = { status: 200, cuerpo: { id: 2, estado: "ENTREGADO" } };
});

type Props = React.ComponentProps<typeof EntregarOrden>;
const lista: Props = {
  ordenId: 2,
  estado: "LISTO_PARA_ENTREGA",
  saldo: 0,
  puedeEntregar: true,
  fechaEntrega: null,
  recibidoPorNombre: null,
  fechaVencGarantia: null,
  entregadoPor: null,
};
const pintar = (props: Partial<Props> = {}) =>
  render(<EntregarOrden {...lista} {...props} />);

const botonEntregar = () =>
  screen.getByRole("button", { name: "Entregar equipo" });

async function abrir(props: Partial<Props> = {}) {
  const user = userEvent.setup();
  pintar(props);
  await user.click(botonEntregar());
  return {
    user,
    recibido: await screen.findByLabelText("Recibido por *"),
    confirmar: screen.getByRole("button", { name: "Confirmar entrega" }),
  };
}

describe("Motivo para no entregar", () => {
  it.each([
    ["LISTO_PARA_ENTREGA", 0, true, null],
    ["LISTO_PARA_ENTREGA", 1, false, /Saldo pendiente \$\s1: no se puede/],
    ["EN_REPARACION", 0, false, /lista para entrega/],
    ["LISTO_PARA_ENTREGA", null, false, /no tiene cotización/],
  ] as const)(
    "%s con saldo %p (puede %p)",
    (estado, saldo, puedeEntregar, esperado) => {
      // Act
      const motivo = motivoNoEntrega({ estado, saldo, puedeEntregar });

      // Assert
      if (esperado === null) expect(motivo).toBeNull();
      else expect(motivo).toMatch(esperado);
    },
  );
});

describe("Entregar el equipo", () => {
  // SWR-ENT-003 (frontera): saldo 1 -> deshabilitado con el saldo.
  it("LISTO con saldo $ 125.000: deshabilitado y dice el saldo", () => {
    // Act
    pintar({ saldo: 125000, puedeEntregar: false });

    // Assert
    expect(botonEntregar()).toBeDisabled();
    expect(
      screen.getByText(/Saldo pendiente \$\s125\.000: no se puede entregar/),
    ).toBeVisible();
    expect(botonEntregar()).toHaveAttribute(
      "aria-describedby",
      "bloqueo-entrega",
    );
  });

  it("en reparación: deshabilitado hasta que esté lista", () => {
    // Act
    pintar({ estado: "EN_REPARACION", puedeEntregar: false });

    // Assert
    expect(botonEntregar()).toBeDisabled();
    expect(
      screen.getByText("Se entrega cuando la orden esté lista para entrega."),
    ).toBeVisible();
  });

  // Frontera: saldo 0 -> habilitado y sin aviso.
  it("LISTO con saldo 0: habilitado", () => {
    // Act
    pintar();

    // Assert
    expect(botonEntregar()).toBeEnabled();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("Recibido por vacío o de 2 letras: muestra el error y no envía", async () => {
    // Arrange
    const { user, recibido, confirmar } = await abrir();

    // Act
    await user.click(confirmar);
    expect(
      await screen.findByText("El nombre de quien recibe es obligatorio"),
    ).toBeVisible();
    await user.type(recibido, "  Al  ");
    await user.click(confirmar);

    // Assert
    expect(
      screen.queryByText("El nombre de quien recibe es obligatorio"),
    ).not.toBeInTheDocument();
    expect(
      await screen.findByText(
        "El nombre de quien recibe debe tener entre 3 y 100 caracteres",
      ),
    ).toBeVisible();
    expect(fetchFalso).not.toHaveBeenCalled();
  });

  it("Recibido por válido: envía el nombre recortado y vuelve con ?entregada=1", async () => {
    // Arrange
    const { user, recibido, confirmar } = await abrir();
    await user.type(recibido, "  Ana Gómez ");

    // Act
    await user.click(confirmar);

    // Assert
    const [url, init] = fetchFalso.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("/api/ordenes/2/entregar");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      recibidoPorNombre: "Ana Gómez",
    });
    expect(router.push).toHaveBeenCalledWith("/ordenes/2?entregada=1", {
      scroll: false,
    });
  });

  // Si entre tanto cambió algo, el 409 del backend se muestra tal cual.
  it("el backend responde 409 SALDO_PENDIENTE: muestra el mensaje", async () => {
    // Arrange
    respuesta = {
      status: 409,
      cuerpo: {
        statusCode: 409,
        message: "Saldo pendiente $ 1: no se puede entregar",
        motivo: "SALDO_PENDIENTE",
      },
    };
    const { user, recibido, confirmar } = await abrir();
    await user.type(recibido, "Ana Gómez");

    // Act
    await user.click(confirmar);

    // Assert
    expect(
      await screen.findByText("Saldo pendiente $ 1: no se puede entregar"),
    ).toBeVisible();
    expect(screen.getByRole("dialog")).toBeVisible();
    expect(router.push).not.toHaveBeenCalled();
  });

  // Verificación (doble clic): una sola entrega.
  it("doble clic en Confirmar entrega: se envía una sola vez", async () => {
    // Arrange
    let liberar!: () => void;
    fetchFalso.mockImplementationOnce(
      () =>
        new Promise<Response>((ok) => {
          liberar = () =>
            ok(new Response(JSON.stringify({ id: 2 }), { status: 200 }));
        }),
    );
    const { user, recibido, confirmar } = await abrir();
    await user.type(recibido, "Ana Gómez");

    // Act
    await user.click(confirmar);
    await user.click(confirmar);

    // Assert
    expect(confirmar).toBeDisabled();
    expect(confirmar).toHaveTextContent("Guardando...");
    expect(fetchFalso).toHaveBeenCalledTimes(1);

    liberar();
    await vi.waitFor(() => expect(router.push).toHaveBeenCalled());
    if (confirmar.isConnected) {
      expect(confirmar).toBeDisabled();
      await user.click(confirmar);
    }
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it("ya entregada: muestra la entrega y no ofrece entregar", () => {
    // Act
    pintar({
      estado: "ENTREGADO",
      puedeEntregar: false,
      fechaEntrega: "2026-11-11T04:30:00.000Z",
      recibidoPorNombre: "Ana Gómez",
      fechaVencGarantia: "2026-12-11T04:59:59.999Z",
      entregadoPor: { id: 1, nombre: "Carol Cruz" },
    });

    // Assert
    expect(
      screen.queryByRole("button", { name: "Entregar equipo" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Ana Gómez")).toBeVisible();
    expect(screen.getByText("Carol Cruz")).toBeVisible();
    // Fin del 10/12/2026 en Colombia.
    expect(
      screen.getByText("Garantía hasta").nextElementSibling,
    ).toHaveTextContent("10/12/2026, 11:59");
  });
});
