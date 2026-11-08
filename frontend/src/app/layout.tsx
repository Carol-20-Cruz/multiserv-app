import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/theme-context";
import { cn } from "@/utils";
import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "MultiServ",
    template: "%s | MultiServ",
  },
  description: "Gestión de órdenes de servicio técnico multimarca.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={cn("relative isolate dark:bg-gray-900", outfit.className)}>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
