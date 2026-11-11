import { SesionProvider } from "@/context/sesion-context";
import type { ResumenOrdenes } from "@/lib/tipos-ordenes";
import type { Usuario } from "@/lib/tipos-sesion";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import InicioContenido from ".";
import { porcentajes } from "./distribucion-estados";

const dueno = { id: 1, nombre: "Carol", rol: "DUENO" } as Usuario;
const tecnico = { id: 2, nombre: "Luis", rol: "TECNICO" } as Usuario;

const porEstado = {
  RECIBIDO: 1,
  EN_DIAGNOSTICO: 2,
  EN_REPARACION: 0,
  LISTO_PARA_ENTREGA: 1,
  ENTREGADO: 4,
};
const reciente = {
  id: 2,
  numero: "MS-2026-00002",
  estado: "LISTO_PARA_ENTREGA" as const,
  creadoEn: "2026-11-09T15:00:00.000Z",
  cliente: { id: 10, nombre: "Ana Gómez" },
  equipo: {
    marca: "Samsung",
    referencia: null,
    tipoEquipo: { nombre: "Nevera" },
  },
};

// Lo que el backend devuelve a cada rol.
const resumenDueno: ResumenOrdenes = {
  porEstado,
  total: 8,
  saldoPendienteTotal: 215000,
  recientes: [{ ...reciente, saldo: 125000 }],
};
const resumenTecnico: ResumenOrdenes = {
  porEstado,
  total: 8,
  recientes: [reciente],
};

function pintar(
  usuario: Usuario,
  props: React.ComponentProps<typeof InicioContenido>,
) {
  render(
    <SesionProvider usuario={usuario}>
      <InicioContenido {...props} />
    </SesionProvider>,
  );
}

describe("Porcentajes de la distribución", () => {
  it("8 órdenes: redondea cada estado", () => {
    // Act
    const pct = porcentajes(porEstado, 8);

    // Assert
    expect(pct).toEqual({
      RECIBIDO: 13,
      EN_DIAGNOSTICO: 25,
      EN_REPARACION: 0,
      LISTO_PARA_ENTREGA: 13,
      ENTREGADO: 50,
    });
  });

  // Frontera: sin órdenes no divide entre 0.
  it("0 órdenes: todo en 0 %", () => {
    // Act
    const pct = porcentajes(
      {
        RECIBIDO: 0,
        EN_DIAGNOSTICO: 0,
        EN_REPARACION: 0,
        LISTO_PARA_ENTREGA: 0,
        ENTREGADO: 0,
      },
      0,
    );

    // Assert
    expect(Object.values(pct)).toEqual([0, 0, 0, 0, 0]);
  });
});

describe("Inicio (dashboard)", () => {
  it("tarjetas por estado con su número y enlace a la lista filtrada", () => {
    // Act
    pintar(dueno, { resumen: resumenDueno, stockBajo: 3 });

    // Assert
    const enlace = screen.getByRole("link", {
      name: "2 órdenes en «En diagnóstico»: ver la lista",
    });
    expect(enlace).toHaveAttribute("href", "/ordenes?estado=EN_DIAGNOSTICO");
    expect(
      screen.getByRole("link", {
        name: "4 órdenes en «Entregado»: ver la lista",
      }),
    ).toHaveAttribute("href", "/ordenes?estado=ENTREGADO");
  });

  it("Dueño: ve el saldo pendiente total y el stock bajo", () => {
    // Act
    pintar(dueno, { resumen: resumenDueno, stockBajo: 3 });

    // Assert
    expect(screen.getByText("Saldo pendiente por cobrar")).toBeVisible();
    expect(screen.getByText(/\$\s215\.000/)).toBeVisible();
    expect(
      screen.getByRole("link", { name: /3 repuestos con existencia baja/ }),
    ).toHaveAttribute("href", "/inventario?soloStockBajo=1");
  });

  it("Dueño: la tabla de recientes trae la columna Saldo", () => {
    // Act
    pintar(dueno, { resumen: resumenDueno, stockBajo: 0 });

    // Assert
    const tabla = screen.getByRole("table", { name: "Órdenes recientes" });
    expect(
      within(tabla).getByRole("columnheader", { name: "Saldo" }),
    ).toBeInTheDocument();
    expect(within(tabla).getByText(/\$\s125\.000/)).toBeInTheDocument();
    expect(
      within(tabla).getByRole("link", { name: "MS-2026-00002" }),
    ).toHaveAttribute("href", "/ordenes/2");
  });

  // AJ-03: el Técnico no ve el saldo total, ni saldos, ni el stock bajo.
  it("Técnico: no ve saldo total, saldos ni stock bajo", () => {
    // Act
    pintar(tecnico, { resumen: resumenTecnico });

    // Assert
    expect(
      screen.queryByText("Saldo pendiente por cobrar"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/existencia baja/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
    const tabla = screen.getByRole("table", { name: "Órdenes recientes" });
    expect(
      within(tabla).queryByRole("columnheader", { name: "Saldo" }),
    ).not.toBeInTheDocument();
    // Sí ve las órdenes por estado y las recientes.
    expect(within(tabla).getByText("Ana Gómez")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "1 orden en «Recibido»: ver la lista" }),
    ).toBeInTheDocument();
  });

  // Aunque por error llegara el stock, el Técnico no lo ve.
  it("Técnico con stockBajo y saldo por error: tampoco los ve", () => {
    // Act
    pintar(tecnico, { resumen: resumenDueno, stockBajo: 3 });

    // Assert
    expect(
      screen.queryByText("Saldo pendiente por cobrar"),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/existencia baja/)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("columnheader", { name: "Saldo" }),
    ).not.toBeInTheDocument();
  });

  it("distribución: leyenda con número y porcentaje de cada estado", () => {
    // Act
    pintar(dueno, { resumen: resumenDueno });

    // Assert
    const seccion = screen.getByRole("region", {
      name: "Distribución por estado",
    });
    expect(within(seccion).getByText("8 órdenes en total")).toBeVisible();
    expect(within(seccion).getByText("4 (50 %)")).toBeVisible();
    expect(within(seccion).getByText("0 (0 %)")).toBeVisible();
  });

  it("accesos a los módulos en una fila compacta, según el rol", () => {
    // Act
    pintar(tecnico, { resumen: resumenTecnico });

    // Assert
    const accesos = screen.getByRole("navigation", {
      name: "Accesos rápidos",
    });
    expect(
      within(accesos)
        .getAllByRole("link")
        .map((a) => a.textContent),
    ).toEqual(["Clientes", "Órdenes"]); // AJ-03: sin Inventario
  });

  it("sin resumen: muestra el aviso", () => {
    // Act
    pintar(dueno, { resumen: null });

    // Assert
    expect(
      screen.getByText(/No se pudo cargar el resumen de órdenes/),
    ).toBeVisible();
  });
});
