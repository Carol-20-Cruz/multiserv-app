"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "@/context/theme-context";
import { MoonIcon, SunIcon } from "@/icons";

export default function ThemeToggleButton() {
  const { toggleTheme, theme } = useTheme();

  return (
    <Button
      variant="outline"
      size="icon-lg"
      className="relative"
      aria-label={theme === "dark" ? "Activar modo claro" : "Activar modo oscuro"}
      onClick={toggleTheme}
    >
      {theme === "dark" ? <SunIcon /> : <MoonIcon />}
    </Button>
  );
}
