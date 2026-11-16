"use client";

import { SidebarHeader } from "@/components/ui/sidebar";
import { cn } from "@/utils";
import Image from "next/image";
import Link from "next/link";

interface AppSidebarHeaderProps {
  showContent: boolean;
}

export default function AppSidebarHeader({
  showContent,
}: AppSidebarHeaderProps) {
  return (
    <SidebarHeader className="px-5 py-8">
      <Link
        href="/"
        aria-label="MultiServ, ir al inicio"
        className={cn(
          "flex items-center",
          !showContent ? "justify-center" : "justify-start",
        )}
      >
        {showContent ? (
          <>
            <Image
              className="h-11 w-auto dark:hidden"
              src="/images/logo/multiserv-logo-horizontal.svg"
              alt="MultiServ"
              width={159}
              height={44}
              priority
            />
            <Image
              className="hidden h-11 w-auto dark:block"
              src="/images/logo/multiserv-logo-horizontal-fondo-oscuro.svg"
              alt="MultiServ"
              width={159}
              height={44}
              priority
            />
          </>
        ) : (
          <Image
            className="size-9"
            src="/images/logo/multiserv-isotipo.svg"
            alt="MultiServ"
            width={36}
            height={36}
            priority
          />
        )}
      </Link>
    </SidebarHeader>
  );
}
