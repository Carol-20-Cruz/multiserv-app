import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import LoginForm from "./form";

// ---------- Simulaciones ----------

// El formulario usa el router de Next para entrar al Inicio.
const router = { replace: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

// fetch falso: responde lo que diga `respuesta` sin ir al backend.
type Respuesta = { status: number; cuerpo: unknown };
let respuesta: Respuesta;
const fetchFalso = vi.fn(
  async () =>
    new Response(JSON.stringify(respuesta.cuerpo), {
      status: respuesta.status,
    }),
);

// Datos FICTICIOS: no son usuarios ni contraseñas reales.
const CORREO_FICTICIO = "prueba@ejemplo.com";
const CLAVE_FICTICIA = "ClaveFicticia-123";

beforeEach(() => {
  router.replace.mockClear();
  router.refresh.mockClear();
  fetchFalso.mockClear();
  vi.stubGlobal("fetch", fetchFalso);
  respuesta = { status: 200, cuerpo: {} };
});

describe("Formulario de inicio de sesión (SWR-AUTH-001)", () => {
  it("campos vacíos: muestra los dos errores y no llama a la API", async () => {
    // Arrange
    const user = userEvent.setup();
    render(<LoginForm />);

    // Act
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    // Assert
    expect(
      await screen.findByText("El correo es obligatorio"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("La contraseña es obligatoria"),
    ).toBeInTheDocument();
    expect(fetchFalso).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it("el backend responde 401: muestra «Credenciales inválidas» y no entra", async () => {
    // Arrange
    respuesta = {
      status: 401,
      cuerpo: { statusCode: 401, message: "Credenciales inválidas" },
    };
    const user = userEvent.setup();
    render(<LoginForm />);

    // Act
    await user.type(
      screen.getByLabelText(/Correo electrónico/),
      CORREO_FICTICIO,
    );
    await user.type(screen.getByLabelText(/^Contraseña/), CLAVE_FICTICIA);
    await user.click(screen.getByRole("button", { name: "Iniciar sesión" }));

    // Assert
    expect(
      await screen.findByText("Credenciales inválidas"),
    ).toBeInTheDocument();
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(router.replace).not.toHaveBeenCalled();
  });
});
