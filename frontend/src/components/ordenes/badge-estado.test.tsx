import { ETIQUETA_ESTADO, SECUENCIA_ESTADOS } from "@/lib/tipos-ordenes";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import BadgeEstado, { COLOR_ESTADO } from "./badge-estado";

describe("Indicador del estado de la orden", () => {
  // SWR-ORD-011: cada uno de los 5 estados se muestra con su nombre legible
  // (no con el código del backend).
  it.each(SECUENCIA_ESTADOS)("%s: muestra su nombre legible", (estado) => {
    // Arrange + Act
    render(<BadgeEstado estado={estado} />);

    // Assert
    expect(screen.getByText(ETIQUETA_ESTADO[estado])).toBeVisible();
    expect(screen.queryByText(estado)).not.toBeInTheDocument();
  });

  // Cada estado tiene un color distinto para reconocerlo en la lista.
  it("los 5 estados usan colores distintos", () => {
    // Arrange + Act
    const colores = new Set(SECUENCIA_ESTADOS.map((e) => COLOR_ESTADO[e]));

    // Assert
    expect(colores.size).toBe(SECUENCIA_ESTADOS.length);
  });

  // Los nombres con tilde se muestran completos.
  it("EN_DIAGNOSTICO: 'En diagnóstico' con tilde", () => {
    // Arrange + Act
    render(<BadgeEstado estado="EN_DIAGNOSTICO" />);

    // Assert
    expect(screen.getByText("En diagnóstico")).toBeVisible();
  });
});
