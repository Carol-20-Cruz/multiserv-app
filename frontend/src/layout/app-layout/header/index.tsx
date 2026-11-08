"use client";

import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { HorizontalDotsIcon, MenuTwoIcon, XIcon } from "@/icons";
import ThemeToggleButton from "@/layout/header/theme-toggler";
import { cn } from "@/utils";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";

interface AppHeaderProps {
  // Contenido del lado derecho (usuario, cerrar sesión).
  children?: React.ReactNode;
}

export default function AppHeader({ children }: AppHeaderProps) {
  const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
  const { openMobile, toggleSidebar } = useSidebar();

  return (
    <header className="sticky top-0 z-50 flex w-full shrink-0 border-gray-200 bg-white xl:border-b dark:border-gray-800 dark:bg-gray-900">
      <div className="flex grow flex-col items-center justify-between xl:flex-row xl:px-6">
        {/* Lado izquierdo */}
        <div className="flex w-full items-center justify-between gap-2 border-b border-gray-200 px-3 py-3 sm:gap-4 xl:justify-normal xl:border-b-0 xl:px-0 xl:py-4 dark:border-gray-800">
          <Button
            variant="outline"
            size="icon"
            className="text-gray-500 lg:size-11 dark:text-gray-400"
            onClick={toggleSidebar}
            aria-label="Mostrar u ocultar el menú"
          >
            {openMobile ? (
              <XIcon className="size-6" />
            ) : (
              <MenuTwoIcon className="size-auto!" />
            )}
          </Button>

          <Link href="/" className="xl:hidden">
            <Image
              width={154}
              height={32}
              className="h-8 w-auto dark:hidden"
              src="/images/logo/multiserv-logo-horizontal.svg"
              alt="MultiServ"
            />
            <Image
              width={154}
              height={32}
              className="hidden h-8 w-auto dark:block"
              src="/images/logo/multiserv-logo-horizontal-fondo-oscuro.svg"
              alt="MultiServ"
            />
          </Link>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => setApplicationMenuOpen((abierto) => !abierto)}
            aria-label="Mostrar opciones de usuario"
            className="text-gray-700 xl:hidden dark:text-gray-400"
          >
            <HorizontalDotsIcon />
          </Button>
        </div>

        {/* Lado derecho */}
        <div
          className={cn(
            "flex w-full items-center justify-between gap-4 px-5 py-4 shadow-theme-md xl:flex xl:justify-end xl:px-0 xl:shadow-none",
            isApplicationMenuOpen ? "flex" : "hidden",
          )}
        >
          <ThemeToggleButton />
          {children}
        </div>
      </div>
    </header>
  );
}
