"use client";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import AppHeader from "@/layout/app-layout/header";
import AppSidebar from "@/layout/app-layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <AppHeader />

        <div className="mx-auto w-full max-w-(--breakpoint-2xl) p-4 md:p-6">
          {children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
