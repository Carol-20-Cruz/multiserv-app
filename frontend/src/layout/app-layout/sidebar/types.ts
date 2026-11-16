import type { Rol } from "@/lib/tipos-sesion";
import React from "react";

export interface SubItem {
  label: string;
  path: string;
  target?: string;
}

export interface NavItem {
  label: string;
  icon: React.ReactNode;
  path?: string;
  target?: string;
  subItems?: SubItem[];
  // Si se indica, el menú solo se muestra a estos roles (SWR-AUTH-008).
  roles?: Rol[];
}
