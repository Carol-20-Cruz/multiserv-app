import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClienteForm from ".";
import { MENSAJE_AUTORIZACION } from "./schema";

// ---------- Simulaciones ----------

// Router de Next simulado: se revisa a dónde navega el formulario.
const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));

// Backend simulado: respuestas de las rutas /api según la URL y el método.
type Respuesta = { status: number; cuerpo: unknown };
let respuestaPost: Respuesta;
let respuestaVerificar: Respuesta;
const fetchFalso = vi.fn(async (url: string, init?: RequestInit) => {
  const r =
    init?.method === "POST"
      ? respuestaPost
      : url.startsWith("/api/clientes/verificar-telefono")
        ? respuestaVerificar
        : { status: 404, cuerpo: {} };
  return new Response(JSON.stringify(r.cuerpo), { status: r.status });
});

const llamadasPost = () =>
  fetchFalso.mock.calls.filter(([, init]) => init?.method === "POST");

beforeEach(() => {
  router.push.mockClear();
  router.refresh.mockClear();
  fetchFalso.mockClear();
  vi.stubGlobal("fetch", fetchFalso);
  respuestaVerificar = { status: 200, cuerpo: { existe: false } };
  respuestaPost = {
    status: 201,
    cuerpo: {
      id: 99,
      nombre: "Ana Gómez",
      telefono: "3001234567",
      activo: true,
    },
  };
});

// ---------- Ayudas ----------

// Los labels se buscan tal como se ven: "Nombre completo *" (el asterisco
// visual lleva aria-hidden, así el lector de pantalla dice "Nombre completo").
function dibujar() {
  const user = userEvent.setup();
  render(<ClienteForm />);
  return {
    user,
    nombre: screen.getByLabelText("Nombre completo *"),
    telefono: screen.getByLabelText("Teléfono *"),
    autorizacion: screen.getByRole("checkbox", {
      name: /autoriza el tratamiento de sus datos/i,
    }),
    registrar: screen.getByRole("button", { name: "Registrar cliente" }),
  };
}

describe("Formulario de cliente", () => {
  // SWR-CLI-001: los campos obligatorios tienen label visible y el botón
  // de registro está disponible.
  it("muestra los campos con label visible y el botón Registrar cliente", () => {
    // Arrange + Act
    const { nombre, telefono, autorizacion, registrar } = dibujar();

    // Assert
    expect(nombre).toHaveAttribute("aria-required", "true");
    expect(telefono).toHaveAttribute("aria-required", "true");
    expect(autorizacion).not.toBeChecked();
    expect(registrar).toBeEnabled();
    expect(screen.getByText("Nombre completo")).toBeVisible();
  });

  // SWR-CLI-001: sin nombre no se registra y se explica por qué.
  it("nombre vacío: muestra 'El nombre es obligatorio' y no envía", async () => {
    // Arrange
    const { user, telefono, autorizacion, registrar } = dibujar();
    await user.type(telefono, "3001234567");
    await user.click(autorizacion);

    // Act
    await user.click(registrar);

    // Assert
    expect(
      await screen.findByText("El nombre es obligatorio"),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Nombre completo *")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(llamadasPost()).toHaveLength(0);
  });

  // SWR-CLI-003 (frontera): 9 dígitos no es válido.
  it("teléfono de 9 dígitos: muestra el error de longitud", async () => {
    // Arrange
    const { user, telefono } = dibujar();

    // Act
    await user.type(telefono, "300123456");
    await user.tab(); // salir del campo

    // Assert
    expect(
      await screen.findByText("El teléfono debe tener exactamente 10 dígitos"),
    ).toBeInTheDocument();
    expect(telefono).toHaveAttribute("aria-invalid", "true");
  });

  // SWR-CLI-003: letras no son válidas.
  it("teléfono con letras: muestra 'solo puede tener números'", async () => {
    // Arrange
    const { user, telefono } = dibujar();

    // Act
    await user.type(telefono, "300abc4567");
    await user.tab();

    // Assert
    expect(
      await screen.findByText("El teléfono solo puede tener números"),
    ).toBeInTheDocument();
  });

  // Ley 1581: sin autorización de datos no se registra.
  it("sin marcar la autorización: muestra el error y no envía", async () => {
    // Arrange
    const { user, nombre, telefono, registrar } = dibujar();
    await user.type(nombre, "Ana Gómez");
    await user.type(telefono, "3001234567");

    // Act
    await user.click(registrar);

    // Assert
    expect(await screen.findByText(MENSAJE_AUTORIZACION)).toBeInTheDocument();
    expect(llamadasPost()).toHaveLength(0);
  });

  // SWR-CLI-004 + AJ-04: si el backend responde 409 (teléfono existente) se
  // impide el registro y se muestra el cliente existente con un enlace.
  it("teléfono duplicado (409): muestra el aviso con enlace al cliente existente", async () => {
    // Arrange
    respuestaPost = {
      status: 409,
      cuerpo: {
        message: "Ya existe un cliente con este teléfono",
        cliente: {
          id: 42,
          nombre: "Pedro Ruiz",
          telefono: "3001234567",
          activo: true,
        },
      },
    };
    const { user, nombre, telefono, autorizacion, registrar } = dibujar();
    await user.type(nombre, "Ana Gómez");
    await user.type(telefono, "3001234567");
    await user.click(autorizacion);

    // Act
    await user.click(registrar);

    // Assert
    const enlace = await screen.findByRole("link", {
      name: /ver cliente existente: pedro ruiz/i,
    });
    expect(enlace).toHaveAttribute("href", "/clientes/42");
    expect(
      screen.getByText("Este teléfono ya está registrado"),
    ).toBeInTheDocument();
    expect(router.push).not.toHaveBeenCalled();
  });

  // SWR-CLI-001 + AJ-08: datos válidos -> se envía el teléfono sin espacios,
  // se muestra el mensaje de éxito y se va al detalle del cliente.
  it("datos válidos: registra, muestra el mensaje de éxito y abre el detalle", async () => {
    // Arrange
    const { user, nombre, telefono, autorizacion, registrar } = dibujar();
    await user.type(nombre, "Ana Gómez");
    await user.type(telefono, "300 123-4567");
    await user.click(autorizacion);

    // Act
    await user.click(registrar);

    // Assert
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Cliente registrado correctamente.",
    );
    const [, init] = llamadasPost()[0];
    expect(JSON.parse(String(init?.body))).toMatchObject({
      nombre: "Ana Gómez",
      telefono: "3001234567",
      autorizaDatos: true,
    });
    expect(router.push).toHaveBeenCalledWith("/clientes/99?registrado=1");
  });
});
