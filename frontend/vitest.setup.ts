// Se ejecuta antes de cada archivo de pruebas.
// - jest-dom: comparadores como toBeInTheDocument() o toHaveAttribute().
// - cleanup: desmonta lo que se dibujó en cada prueba para que no se mezclen.
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
