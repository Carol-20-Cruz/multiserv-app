import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MensajeExito from "./mensaje-exito";

// Router de Next simulado: estamos en el detalle del cliente 5.
const router = { replace: vi.fn() };
vi.mock("next/navigation", () => ({
  useRouter: () => router,
  usePathname: () => "/clientes/5",
}));

beforeEach(() => router.replace.mockClear());

describe("Mensaje de éxito del detalle del cliente", () => {
  // SWR-CLI-001 (defecto corregido): el mensaje de éxito se muestra una sola
  // vez. Quita ?registrado=1 de la URL y, si la página se vuelve a dibujar
  // sin el parámetro, el mensaje sigue visible pero no se repite la limpieza;
  // si luego el cliente se desactiva (SWR-DATA-005), el mensaje desaparece.
  it("se muestra una vez, limpia la URL y no aparece si el cliente se desactiva", () => {
    // Arrange
    const { rerender } = render(
      <MensajeExito mensaje="Cliente registrado correctamente." visible />,
    );

    // Act 1: la URL ya quedó limpia y la página se vuelve a dibujar.
    rerender(<MensajeExito mensaje={null} visible />);

    // Assert 1
    expect(screen.getByRole("status")).toHaveTextContent(
      "Cliente registrado correctamente.",
    );
    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith("/clientes/5", {
      scroll: false,
    });

    // Act 2: el cliente se desactiva.
    rerender(<MensajeExito mensaje={null} visible={false} />);

    // Assert 2
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  // SWR-DATA-005: al abrir el detalle de un cliente desactivado con el
  // parámetro en la URL, no se felicita por el registro.
  it("cliente desactivado: no muestra el mensaje de éxito", () => {
    // Arrange + Act
    render(
      <MensajeExito
        mensaje="Cliente registrado correctamente."
        visible={false}
      />,
    );

    // Assert
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });
});
