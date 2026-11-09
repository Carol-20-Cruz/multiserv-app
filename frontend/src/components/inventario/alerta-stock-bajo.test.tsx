import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import AlertaStockBajo from "./alerta-stock-bajo";
import TarjetaStockBajo from "./tarjeta-stock-bajo";

describe("Alerta de existencia baja (SWR-INV-009)", () => {
  // SWR-INV-009: con repuestos por agotarse, /inventario muestra el aviso
  // con el número y el enlace al filtro.
  it("con 2 repuestos bajos: muestra el aviso y el enlace al filtro", () => {
    // Arrange + Act
    render(<AlertaStockBajo total={2} filtrando={false} />);

    // Assert
    const alerta = screen.getByRole("alert");
    expect(alerta).toHaveTextContent("2 repuestos con existencia baja");
    expect(
      screen.getByRole("link", { name: "Ver solo stock bajo" }),
    ).toHaveAttribute("href", "/inventario?soloStockBajo=1");
  });

  // SWR-INV-009: si nada está bajo, no hay aviso.
  it("con 0 repuestos bajos: no muestra el aviso", () => {
    // Arrange + Act
    render(<AlertaStockBajo total={0} filtrando={false} />);

    // Assert
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  // Respuesta 4 de la dueña: tarjeta del Inicio con el número y el enlace
  // a /inventario?soloStockBajo=1.
  it("tarjeta del Inicio: muestra 'N repuestos con existencia baja' y enlaza al filtro", () => {
    // Arrange + Act
    render(<TarjetaStockBajo total={3} />);

    // Assert
    const enlace = screen.getByRole("link", {
      name: /3 repuestos con existencia baja/i,
    });
    expect(enlace).toHaveAttribute("href", "/inventario?soloStockBajo=1");
  });
});
