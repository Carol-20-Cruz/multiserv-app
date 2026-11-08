"use client";

import type React from "react";
import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
} from "react";

type ThemeMode = "light" | "dark" | "auto";
type ResolvedTheme = "light" | "dark";

type ThemeContextType = {
  theme: ResolvedTheme; // Tema realmente activo ("light" o "dark")
  themeMode: ThemeMode; // Preferencia guardada ("light", "dark" o "auto")
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const CLAVE_MODO = "theme-mode";
const CONSULTA_OSCURO = "(prefers-color-scheme: dark)";

// La preferencia vive en localStorage (sistema externo). Se lee con
// useSyncExternalStore: en el servidor vale "light" y en el navegador el valor
// guardado, sin setState dentro de efectos ni errores de hidratación.
const oyentesModo = new Set<() => void>();

function suscribirModo(avisar: () => void) {
  oyentesModo.add(avisar);
  window.addEventListener("storage", avisar); // cambios desde otras pestañas
  return () => {
    oyentesModo.delete(avisar);
    window.removeEventListener("storage", avisar);
  };
}

function leerModo(): ThemeMode {
  const guardado = localStorage.getItem(CLAVE_MODO);
  return guardado === "dark" || guardado === "auto" ? guardado : "light";
}

function guardarModo(mode: ThemeMode) {
  localStorage.setItem(CLAVE_MODO, mode);
  oyentesModo.forEach((avisar) => avisar());
}

function suscribirSistema(avisar: () => void) {
  const consulta = window.matchMedia(CONSULTA_OSCURO);
  consulta.addEventListener("change", avisar);
  return () => consulta.removeEventListener("change", avisar);
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const themeMode = useSyncExternalStore(
    suscribirModo,
    leerModo,
    () => "light" as ThemeMode,
  );
  const sistemaOscuro = useSyncExternalStore(
    suscribirSistema,
    () => window.matchMedia(CONSULTA_OSCURO).matches,
    () => false,
  );

  const theme: ResolvedTheme =
    themeMode === "auto" ? (sistemaOscuro ? "dark" : "light") : themeMode;

  // Sincroniza el DOM con el tema (efecto hacia un sistema externo).
  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.toggle("dark", theme === "dark");
    raiz.setAttribute("data-color-scheme", theme);
  }, [theme]);

  const toggleTheme = () => guardarModo(theme === "light" ? "dark" : "light");

  return (
    <ThemeContext.Provider
      value={{ theme, themeMode, setThemeMode: guardarModo, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
