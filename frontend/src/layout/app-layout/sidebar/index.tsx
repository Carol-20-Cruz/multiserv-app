"use client";

import { Sidebar, SidebarContent, useSidebar } from "@/components/ui/sidebar";
import { useUsuario } from "@/context/sesion-context";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { menusParaRol, navItems } from "./data";
import AppSidebarHeader from "./sidebar-header";
import { esRutaActiva } from "./sidebar-menu-item";
import SidebarNavGroup from "./sidebar-nav-group";

const findMatchingSubmenu = (items: typeof navItems, path: string) => {
  const index = items.findIndex((nav) =>
    nav.subItems?.some((subItem) => esRutaActiva(subItem.path, path)),
  );
  return index === -1 ? null : index;
};

export default function AppSidebar() {
  const { open, isMobile, isHovered } = useSidebar();
  const pathname = usePathname();
  const { rol } = useUsuario();
  const items = menusParaRol(rol);

  const showContent = open || isHovered || isMobile;

  const [openSubmenu, setOpenSubmenu] = useState<number | null>(() =>
    findMatchingSubmenu(items, pathname),
  );

  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setOpenSubmenu(findMatchingSubmenu(items, pathname));
  }

  const handleSubmenuToggle = (index: number) => {
    setOpenSubmenu((prev) => (prev === index ? null : index));
  };

  return (
    <Sidebar side="left" collapsible="icon">
      <AppSidebarHeader showContent={showContent} />

      <SidebarContent className="overflow-y-auto px-5 duration-300 ease-linear">
        <nav className="mb-6" aria-label="Menú principal">
          <SidebarNavGroup
            label="Menú"
            items={items}
            openSubmenu={openSubmenu}
            showContent={showContent}
            pathname={pathname}
            onToggleSubmenu={handleSubmenuToggle}
          />
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}
