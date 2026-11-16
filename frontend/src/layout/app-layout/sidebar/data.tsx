import { BoxIcon, LayoutGridIcon, ListIcon, UsersIcon } from "@/icons";
import type { Rol } from "@/lib/tipos-sesion";
import type { NavItem } from "./types";

export const navItems: NavItem[] = [
  {
    icon: <LayoutGridIcon className="size-6" />,
    label: "Inicio",
    path: "/",
  },
  {
    icon: <UsersIcon className="size-6" />,
    label: "Clientes",
    path: "/clientes",
  },
  {
    icon: <ListIcon className="size-6" />,
    label: "Órdenes",
    path: "/ordenes",
  },
  {
    // AJ-03: el Técnico no registra repuestos.
    icon: <BoxIcon className="size-6" />,
    label: "Inventario",
    path: "/inventario",
    roles: ["DUENO"],
  },
];

// Menús visibles para un rol.
export const menusParaRol = (rol: Rol) =>
  navItems.filter((item) => !item.roles || item.roles.includes(rol));
