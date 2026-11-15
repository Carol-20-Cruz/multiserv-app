import { isValidElement, type ReactElement } from "react";
import { describe, expect, it } from "vitest";
import { PaginationLink } from "./pagination";

// D12 — encontrado ejecutando caja negra: con más de 10 clientes, /clientes
// mostraba "Event handlers cannot be passed to Client Component props".
// PaginationLink se ejecuta como Server Component y entrega su <a> al Button
// de @base-ui ('use client'); todo lo que cruza esa frontera debe ser
// serializable. jsdom no tiene esa frontera, así que se revisa la regla
// directamente: ninguna prop (ni las del <a> que va en `render`) puede ser
// una función.
function funcionesEnProps(nodo: unknown, ruta = "Button"): string[] {
  if (!isValidElement(nodo)) return [];
  const props = (nodo as ReactElement<Record<string, unknown>>).props;
  return Object.entries(props).flatMap(([clave, valor]) => {
    if (typeof valor === "function") return [`${ruta}.${clave}`];
    if (isValidElement(valor)) return funcionesEnProps(valor, `${ruta}.${clave}`);
    return [];
  });
}

describe("PaginationLink (D12)", () => {
  it("deshabilitado no pasa funciones al componente cliente", () => {
    const elemento = PaginationLink({
      href: "/clientes?pagina=0",
      disabled: true,
      children: "Anterior",
    });
    expect(funcionesEnProps(elemento)).toEqual([]);
  });

  it("habilitado no pasa funciones al componente cliente", () => {
    const elemento = PaginationLink({
      href: "/clientes?pagina=2",
      children: "2",
    });
    expect(funcionesEnProps(elemento)).toEqual([]);
  });

  it("deshabilitado no tiene href (no navega); habilitado conserva ?pagina=", () => {
    const enlaceDe = (e: ReactElement) =>
      (e.props as { render: ReactElement<{ href?: string }> }).render.props;

    const off = PaginationLink({ href: "/clientes?pagina=0", disabled: true });
    expect(enlaceDe(off).href).toBeUndefined();

    const on = PaginationLink({ href: "/clientes?buscar=ana&pagina=2" });
    expect(enlaceDe(on).href).toBe("/clientes?buscar=ana&pagina=2");
  });
});
