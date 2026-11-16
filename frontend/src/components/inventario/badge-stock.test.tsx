import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BadgeStock from "./badge-stock";

describe("Indicador de stock bajo en la fila", () => {
  // SWR-INV-009 (frontera): llegar al mínimo ya es existencia baja.
  it("cantidad igual al mínimo: muestra 'Stock bajo'", () => {
    // Arrange + Act
    render(<BadgeStock cantidad={3} minimo={3} />);

    // Assert
    expect(screen.getByText("Stock bajo")).toBeVisible();
  });

  // SWR-INV-009 (frontera): uno por encima del mínimo no lleva indicador.
  it("cantidad mayor que el mínimo: no muestra nada", () => {
    // Arrange + Act
    const { container } = render(<BadgeStock cantidad={4} minimo={3} />);

    // Assert
    expect(container).toBeEmptyDOMElement();
  });

  // SWR-INV-009: sin unidades se distingue como "Agotado".
  it("cantidad 0: muestra 'Agotado'", () => {
    // Arrange + Act
    render(<BadgeStock cantidad={0} minimo={2} />);

    // Assert
    expect(screen.getByText("Agotado")).toBeVisible();
    expect(screen.queryByText("Stock bajo")).not.toBeInTheDocument();
  });
});
