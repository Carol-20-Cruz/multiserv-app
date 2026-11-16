import type { Pago } from "@/lib/tipos-ordenes";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CuentaOrden from "./cuenta-orden";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const abono: Pago = {
  id: 1,
  tipo: "ABONO",
  medio: "EFECTIVO",
  valor: 125000,
  referencia: null,
  fecha: "2026-11-10T15:00:00.000Z",
  usuario: { nombre: "Carol Cruz" },
};
const pagoSaldo: Pago = {
  id: 2,
  tipo: "SALDO",
  medio: "TRANSFERENCIA",
  valor: 125000,
  referencia: "PRUEBA-TRF-001",
  fecha: "2026-11-10T20:00:00.000Z",
  usuario: { nombre: "Carol Cruz" },
};

type Props = React.ComponentProps<typeof CuentaOrden>;
const base: Props = {
  id: 2,
  estado: "EN_REPARACION",
  valorCotizado: 250000,
  totalPagado: 125000,
  saldo: 125000,
  abonoMinimo: 125000,
  pagos: [abono],
};
const pintar = (props: Partial<Props> = {}) =>
  render(<CuentaOrden {...base} {...props} />);

// Valor de una cifra de la cuenta (Total, Pagado o Saldo).
const cifra = (etiqueta: string) =>
  screen.getByText(etiqueta, { selector: "dt" }).nextElementSibling;

describe("Cuenta de la orden", () => {
  it("sin cotización: lo explica y no ofrece registrar pago", () => {
    // Act
    pintar({ valorCotizado: null, saldo: null, totalPagado: 0, pagos: [] });

    // Assert
    expect(screen.getByText(/Aún no hay cotización aprobada/)).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Registrar pago" }),
    ).not.toBeInTheDocument();
  });

  it("con un abono: total, pagado, saldo, 50 % y la fila del pago", () => {
    // Act
    pintar();

    // Assert
    expect(cifra("Total")).toHaveTextContent(/\$\s250\.000/);
    expect(cifra("Pagado")).toHaveTextContent(/\$\s125\.000/);
    expect(cifra("Saldo")).toHaveTextContent(/\$\s125\.000/);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "50",
    );
    expect(screen.getByText("50 %")).toBeVisible();
    const tabla = screen.getByRole("table", { name: "Pagos de la orden" });
    const filas = within(tabla).getAllByRole("row");
    expect(filas).toHaveLength(2); // encabezado + 1 pago
    expect(filas[1]).toHaveTextContent("Abono");
    expect(filas[1]).toHaveTextContent("Efectivo");
    expect(filas[1]).toHaveTextContent("Carol Cruz");
    expect(
      screen.getByRole("button", { name: "Registrar pago" }),
    ).toBeVisible();
  });

  // Frontera: saldo 0 -> 100 % y ya no se ofrece registrar pago.
  it("saldo 0: 100 %, muestra la referencia y no ofrece pagar", () => {
    // Act
    pintar({
      estado: "LISTO_PARA_ENTREGA",
      totalPagado: 250000,
      saldo: 0,
      pagos: [abono, pagoSaldo],
    });

    // Assert
    expect(cifra("Saldo")).toHaveTextContent(/\$\s0/);
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "100",
    );
    expect(screen.getByText("Ref. PRUEBA-TRF-001")).toBeVisible();
    expect(screen.getByText("Saldo", { selector: "td" })).toBeVisible();
    expect(
      screen.queryByRole("button", { name: "Registrar pago" }),
    ).not.toBeInTheDocument();
  });

  // Frontera: saldo 1 -> todavía se puede pagar.
  it("saldo 1: ofrece registrar pago", () => {
    // Act
    pintar({ totalPagado: 249999, saldo: 1 });

    // Assert
    expect(
      screen.getByRole("button", { name: "Registrar pago" }),
    ).toBeVisible();
  });

  it("sin pagos: la tabla lo dice", () => {
    // Act
    pintar({
      estado: "EN_DIAGNOSTICO",
      totalPagado: 0,
      saldo: 250000,
      pagos: [],
    });

    // Assert
    expect(screen.getByText("Aún no hay pagos registrados.")).toBeVisible();
    expect(screen.getByRole("progressbar")).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });
});
