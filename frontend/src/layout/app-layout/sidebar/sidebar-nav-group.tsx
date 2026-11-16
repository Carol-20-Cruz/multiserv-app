"use client";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { HorizontalDotsIcon } from "@/icons";
import { cn } from "@/utils";
import SidebarMenuItem from "./sidebar-menu-item";
import { NavItem } from "./types";

interface SidebarNavGroupProps {
  label: string;
  items: NavItem[];
  openSubmenu: number | null;
  showContent: boolean;
  pathname: string;
  onToggleSubmenu: (index: number) => void;
}

export default function SidebarNavGroup({
  label,
  items,
  openSubmenu,
  showContent,
  pathname,
  onToggleSubmenu,
}: SidebarNavGroupProps) {
  return (
    <SidebarGroup className="p-0">
      <SidebarGroupLabel
        className={cn(
          "mb-4 flex h-auto p-0 text-xs leading-5 text-gray-400 uppercase",
          !showContent ? "xl:justify-center" : "justify-start",
        )}
      >
        {showContent ? label : <HorizontalDotsIcon />}
      </SidebarGroupLabel>
      <SidebarMenu className="gap-1">
        {items.map((nav, index) => (
          <SidebarMenuItem
            key={nav.label}
            nav={nav}
            isOpen={openSubmenu === index}
            showContent={showContent}
            pathname={pathname}
            onToggle={() => onToggleSubmenu(index)}
          />
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
