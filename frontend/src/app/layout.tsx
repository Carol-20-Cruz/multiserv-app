import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/context/theme-context";
import { cn } from "@/utils";
import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

// Tipografía de marca. Se expone como --fuente-poppins y el tema la usa
// en la utilidad font-poppins (ver globals.css).
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--fuente-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MultiServ",
    template: "%s | MultiServ",
  },
  description: "Gestión de órdenes de servicio técnico multimarca.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className={poppins.variable}>
      <body className={cn("relative isolate font-poppins dark:bg-gray-900")}>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
