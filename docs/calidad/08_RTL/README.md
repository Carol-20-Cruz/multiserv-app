# 08 · Pruebas de componentes con React Testing Library (frontend, Vitest)

**React Testing Library (RTL)** prueba las pantallas del frontend **como las usaría una persona**. Busca los elementos por lo que se ve en pantalla (el texto de un botón, la etiqueta de un campo) y no por detalles internos del código, como clases CSS o ids.

Una analogía: es como un **robot que solo tiene ojos y manos**. Mira la pantalla, escribe en los campos, hace clic y revisa qué mensaje aparece, sin abrir el código por dentro. Si el robot no encuentra el botón «Guardar pago», tampoco lo encontraría una persona, ni un lector de pantalla para alguien que no ve.

- **Herramientas:** Vitest (corre las pruebas), RTL (dibuja el componente y lo busca como un usuario), `user-event` (simula teclado y clics) y `jest-dom` (agrega verificaciones como `toBeVisible()` o `toBeDisabled()`).
- **jsdom:** un navegador simulado dentro de Node. No se abre ninguna ventana, por eso las pruebas son rápidas y corren en GitHub Actions.
- **Configuración:** [`frontend/vitest.config.mts`](../../../frontend/vitest.config.mts) · [`frontend/vitest.setup.ts`](../../../frontend/vitest.setup.ts) (carga `jest-dom` y limpia la pantalla después de cada prueba).
- **Pruebas:** archivos `*.test.tsx` al lado de cada componente en [`frontend/src/components/`](../../../frontend/src/components/).
- **Salida completa de la corrida:** [`resultado-vitest.txt`](resultado-vitest.txt)

## Pruebas escogidas y trazabilidad

Se escogieron 16 de las 106 pruebas, dos por cada criterio que pide el enunciado.

| ID | Criterio | Archivo → nombre del test | Qué verifica | SWR / criterio de aceptación |
|---|---|---|---|---|
| RTL-01 | Lista vacía | `ordenes/cuenta-orden.test.tsx` → «sin pagos: la tabla lo dice» | La tabla de pagos avisa que no hay pagos en lugar de quedar en blanco | SWR-PAY-004 |
| RTL-02 | Lista vacía | `inventario/alerta-stock-bajo.test.tsx` → «con 0 repuestos bajos: no muestra el aviso» | Sin repuestos bajos no aparece la alerta | SWR-INV-009 |
| RTL-03 | Datos | `ordenes/cuenta-orden.test.tsx` → «con un abono: total, pagado, saldo, 50 % y la fila del pago» | Total $ 250.000, pagado y saldo $ 125.000, barra al 50 % y la fila del abono | SWR-PAY-004 |
| RTL-04 | Datos | `inicio/dashboard.test.tsx` → «tarjetas por estado con su número y enlace a la lista filtrada» | Cada tarjeta del Inicio muestra cuántas órdenes hay y enlaza a `/ordenes?estado=…` | Dashboard (Inicio) |
| RTL-05 | Validaciones | `clientes/cliente-form/cliente-form.test.tsx` → «teléfono de 9 dígitos: muestra el error de longitud» | Mensaje «exactamente 10 dígitos» y el campo marcado como inválido | SWR-CLI-003 (límite) |
| RTL-06 | Validaciones | `inventario/repuesto-form/repuesto-form.test.tsx` → «precio con decimales y mínimo negativo: muestra los errores» | Los dos errores en español | SWR-CON-003 |
| RTL-07 | Errores del backend | `ordenes/registrar-pago.test.tsx` → «el backend responde 409 SUPERA_SALDO: muestra el mensaje» | El motivo del 409 se muestra y el formulario sigue abierto | SWR-PAY-004 |
| RTL-08 | Errores del backend | `ordenes/entregar-orden.test.tsx` → «el backend responde 500: mensaje de error inesperado» | Mensaje amable y **ningún** detalle técnico | Defecto 10 |
| RTL-09 | Formularios | `ordenes/registrar-cotizacion.test.tsx` → «valor '180.000': envía 180000 con PUT y vuelve al detalle» | El valor con puntos de miles se envía como número entero | AJ-09, SWR-CON-003 |
| RTL-10 | Formularios | `ordenes/orden-form/orden-form.test.tsx` → «sin cliente elegido: muestra 'El cliente es obligatorio' y no envía» | Sin cliente no se crea la orden | SWR-ORD-001 |
| RTL-11 | Autenticación | `auth/login/login-form.test.tsx` → «campos vacíos: muestra los dos errores y no llama a la API» | «El correo es obligatorio» y «La contraseña es obligatoria», sin llamar al backend | SWR-AUTH-001 |
| RTL-12 | Autenticación | `auth/login/login-form.test.tsx` → «el backend responde 401: muestra «Credenciales inválidas» y no entra» | Se ve «Credenciales inválidas» y no navega al Inicio | SWR-AUTH-001 |
| RTL-13 | Botones | `ordenes/avanzar-estado.test.tsx` → «bloqueo FALTA_ABONO: botón deshabilitado y aviso con los montos» | Sin abono, el botón para pasar a reparación está deshabilitado y dice cuánto falta | AJ-10 |
| RTL-14 | Botones | `ordenes/avanzar-estado.test.tsx` → «doble clic en Confirmar cambio: se envía una sola vez» | Con dos clics seguidos solo sale una petición | Verificación doble clic |
| RTL-15 | Mensaje de éxito | `clientes/mensaje-exito.test.tsx` → «se muestra una vez, limpia la URL y no aparece si el cliente se desactiva» | El aviso verde aparece una vez y la URL queda limpia | SWR-CLI-001, SWR-DATA-005 |
| RTL-16 | Mensaje de éxito | `clientes/cliente-form/cliente-form.test.tsx` → «datos válidos: registra, muestra el mensaje de éxito y abre el detalle» | «Cliente registrado correctamente.», teléfono enviado sin espacios y paso al detalle | SWR-CLI-001, AJ-08 |

**Sobre la autenticación:** RTL-11 y RTL-12 se escribieron para esta entrega (commit `test(frontend): agrega prueba RTL del formulario de login`), porque antes no había ninguna prueba RTL del login. Usan correo y contraseña **ficticios** y nada del `.env`. Además, el control por rol (qué ve el Dueño y qué ve el Técnico) se prueba en `inicio/dashboard.test.tsx`, por ejemplo con «Técnico: no ve saldo total, saldos ni stock bajo» (AJ-03).

## Tres pruebas explicadas línea por línea

### Antes: qué es un mock y por qué se usa

Un **mock** (simulación) es un **doble de acción**, como en el cine: el actor de verdad no se tira del edificio, lo hace un doble que se ve igual. En estas pruebas se reemplazan dos cosas:

| Dependencia real | Por qué se reemplaza | Con qué se reemplaza |
|---|---|---|
| `fetch` (llamar al backend) | La prueba no debe depender de que el backend y la base estén encendidos. Además, así se puede **forzar** una respuesta difícil de conseguir de verdad, como un 409 o un 500 | `fetchFalso`: una función que devuelve la respuesta que la prueba elija y **anota** cada llamada |
| `useRouter` de `next/navigation` (cambiar de página) | Fuera de Next.js el router no existe y el componente fallaría al dibujarse | Un objeto `router` con `push`/`replace` falsos (`vi.fn()`), para revisar **si** se navegó y **a dónde** |

`vi.fn()` crea una función espía: no hace nada, pero recuerda cuántas veces y con qué datos la llamaron.

---

### Ejemplo 1 · RTL-05 · Teléfono de 9 dígitos (validación)

Archivo: [`frontend/src/components/clientes/cliente-form/cliente-form.test.tsx`](../../../frontend/src/components/clientes/cliente-form/cliente-form.test.tsx)

```tsx
import { render, screen } from "@testing-library/react";            // (1)
import userEvent from "@testing-library/user-event";                // (2)
import { beforeEach, describe, expect, it, vi } from "vitest";      // (3)
import ClienteForm from ".";                                        // (4)

const router = { push: vi.fn(), refresh: vi.fn() };                 // (5)
vi.mock("next/navigation", () => ({ useRouter: () => router }));    // (6)

function dibujar() {
  const user = userEvent.setup();                                   // (7)
  render(<ClienteForm />);                                          // (8)
  return {
    user,
    telefono: screen.getByLabelText("Teléfono *"),                  // (9)
    // …también nombre, autorización y el botón «Registrar cliente»
  };
}

// SWR-CLI-003 (frontera): 9 dígitos no es válido.
it("teléfono de 9 dígitos: muestra el error de longitud", async () => {
  // Arrange
  const { user, telefono } = dibujar();

  // Act
  await user.type(telefono, "300123456");                           // (10)
  await user.tab(); // salir del campo                              // (11)

  // Assert
  expect(
    await screen.findByText("El teléfono debe tener exactamente 10 dígitos"),  // (12)
  ).toBeInTheDocument();
  expect(telefono).toHaveAttribute("aria-invalid", "true");         // (13)
});
```

(Se muestran solo las líneas que usa esta prueba. El archivo también prepara `fetchFalso` en un `beforeEach`, para las pruebas que sí envían el formulario.)

| Pregunta | Respuesta |
|---|---|
| **Imports** | (1) `render` dibuja el componente y `screen` es «la pantalla» donde se buscan los elementos. (2) `userEvent` simula a la persona. (3) Las piezas de Vitest: `it` define la prueba, `expect` verifica y `vi` crea simulaciones. (4) El componente real que se prueba: el formulario de cliente. |
| **¿Qué monta `render()`?** | (8) El formulario completo de «Registrar cliente», con sus campos, validaciones y botón, dentro del navegador simulado (jsdom). Es el mismo componente que usa la aplicación, no una copia. |
| **¿Cómo lo encuentra `screen.getBy…` como el usuario?** | (9) `getByLabelText("Teléfono *")` busca el campo **por la etiqueta que se lee al lado**, igual que una persona que busca «Teléfono». Si alguien borrara la etiqueta o la desconectara del campo, la prueba fallaría, y con razón: un lector de pantalla tampoco sabría qué campo es. |
| **¿Qué interacción simula `userEvent`?** | (7) `setup()` prepara un «usuario». (10) `type` escribe `300123456` tecla por tecla, como alguien que teclea. (11) `tab` presiona Tab para salir del campo. El formulario valida al salir del campo (`mode: "onTouched"`), así que sin este paso no aparecería el error. |
| **¿Qué verifica `expect()`?** | (12) Que aparezca el texto exacto «El teléfono debe tener exactamente 10 dígitos». Se usa `findByText`, que **espera** un momento a que el mensaje aparezca, porque la validación no es instantánea. (13) Que el campo quede marcado `aria-invalid="true"`, que es lo que hace que se vea en rojo y que el lector de pantalla diga «inválido». |
| **¿Qué reemplaza el mock y por qué?** | (5)-(6) Reemplaza `useRouter` de Next.js: fuera de Next el router no existe y el formulario ni siquiera se podría dibujar. En esta prueba no se navega; el mock solo permite montar el componente. |

**Por qué 9 y no otro número:** es el valor límite justo debajo de 10. Es la misma regla que UT-03 en el backend (carpeta 06), ahora vista desde la pantalla.

---

### Ejemplo 2 · RTL-07 · El backend responde 409 SUPERA_SALDO (error)

Archivo: [`frontend/src/components/ordenes/registrar-pago.test.tsx`](../../../frontend/src/components/ordenes/registrar-pago.test.tsx)

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import RegistrarPago, { valorSugerido } from "./registrar-pago";      // (1)

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));    // (2)

type Respuesta = { status: number; cuerpo: unknown };
let respuesta: Respuesta;                                           // (3)
const fetchFalso = vi.fn(                                           // (4)
  async () =>
    new Response(JSON.stringify(respuesta.cuerpo), {
      status: respuesta.status,
    }),
);

beforeEach(() => {
  router.push.mockClear();
  fetchFalso.mockClear();                                           // (5)
  vi.stubGlobal("fetch", fetchFalso);                               // (6)
  respuesta = { status: 201, cuerpo: { pago: { id: 1 }, saldo: 125000 } };
});

// Orden de la prueba: cotizada en $ 250.000, abono mínimo 50 %.
async function abrir() {
  const user = userEvent.setup();
  render(                                                           // (7)
    <RegistrarPago ordenId={2} saldo={250000} abonoMinimo={125000} totalPagado={0} />,
  );
  await user.click(screen.getByRole("button", { name: "Registrar pago" }));  // (8)
  return {
    user,
    guardar: screen.getByRole("button", { name: "Guardar pago" }),  // (9)
  };
}

// Si entre tanto otro pago bajó el saldo, el backend responde 409.
it("el backend responde 409 SUPERA_SALDO: muestra el mensaje", async () => {
  // Arrange
  respuesta = {                                                     // (10)
    status: 409,
    cuerpo: {
      statusCode: 409,
      message: "El pago no puede superar el saldo pendiente",
      motivo: "SUPERA_SALDO",
    },
  };
  const { user, guardar } = await abrir();

  // Act
  await user.click(guardar);                                        // (11)

  // Assert
  expect(
    await screen.findByText("El pago no puede superar el saldo pendiente"),  // (12)
  ).toBeVisible();
  expect(screen.getByRole("dialog")).toBeVisible();                 // (13)
  expect(router.push).not.toHaveBeenCalled();                       // (14)
});
```

(Se resumieron `beforeEach` y `abrir()`. En el archivo, `beforeEach` también limpia `router.refresh`, y `abrir()` acepta props distintas y devuelve el campo «Valor».)

| Pregunta | Respuesta |
|---|---|
| **Imports** | Los mismos de RTL, `user-event` y Vitest. (1) Se importa el componente `RegistrarPago` (el botón y la ventana para registrar un pago) y `valorSugerido`, que usa otra prueba del archivo. |
| **¿Qué monta `render()`?** | (7) El componente de pago para una orden con saldo de $ 250.000 y abono mínimo de $ 125.000, como en la prueba real con la dueña. Se le pasan esos datos como *props* (parámetros), sin base de datos. |
| **¿Cómo lo encuentra `screen.getBy…` como el usuario?** | (8) y (9) `getByRole("button", { name: "Registrar pago" })` busca **un botón que diga** «Registrar pago». El *rol* es el tipo de elemento (botón, enlace, diálogo…) y el *name* es lo que dice. (13) `getByRole("dialog")` encuentra la ventana emergente. |
| **¿Qué interacción simula `userEvent`?** | (8) Un clic en «Registrar pago» abre la ventana, que ya trae sugerido el abono de $ 125.000. (11) Un clic en «Guardar pago» envía el formulario. |
| **¿Qué verifica `expect()`?** | (12) Que la persona **vea** el motivo que mandó el backend. (13) Que la ventana **siga abierta**, para que pueda corregir el valor sin volver a empezar. (14) Que **no** se haya navegado a otra página, como pasaría si el pago se hubiera guardado. |
| **¿Qué reemplaza el mock y por qué?** | (4) y (6) `fetchFalso` reemplaza al `fetch` real: el componente cree que habla con el backend, pero responde la prueba. (10) Se elige un **409**, que en la vida real solo ocurre si otra persona registra un pago al mismo tiempo; sin el mock sería casi imposible de reproducir. (5) `mockClear()` borra las anotaciones de la prueba anterior. (2) El router se reemplaza para poder revisar en (14) que **no** navegó. |

**Por qué importa:** la pantalla ya impide escribir más que el saldo, pero el backend es la última defensa. Esta prueba confirma que, cuando el backend dice que no, la persona entiende por qué.

---

### Ejemplo 3 · RTL-14 · Doble clic en «Confirmar cambio» (botón)

Archivo: [`frontend/src/components/ordenes/avanzar-estado.test.tsx`](../../../frontend/src/components/ordenes/avanzar-estado.test.tsx)

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AvanzarEstado from "./avanzar-estado";                       // (1)

const router = { push: vi.fn(), refresh: vi.fn() };
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const fetchFalso = vi.fn(/* … responde 200 … */);
// beforeEach: limpia los espías y pone fetchFalso en lugar de fetch

it("doble clic en Confirmar cambio: se envía una sola vez", async () => {
  // Arrange
  let liberar!: () => void;                                         // (2)
  fetchFalso.mockImplementationOnce(                                // (3)
    () =>
      new Promise<Response>((ok) => {
        liberar = () =>
          ok(new Response(JSON.stringify({ id: 5 }), { status: 200 }));
      }),
  );
  const user = userEvent.setup();
  render(                                                           // (4)
    <AvanzarEstado
      ordenId={5}
      estado="RECIBIDO"
      siguienteEstado="EN_DIAGNOSTICO"
      bloqueo={null}
      abonoMinimo={null}
      totalPagado={0}
    />,
  );
  await user.click(
    screen.getByRole("button", { name: "Pasar a «En diagnóstico»" }),       // (5)
  );
  const confirmar = await screen.findByRole("button", {
    name: "Confirmar cambio",                                       // (6)
  });

  // Act
  await user.click(confirmar);                                      // (7)
  await user.click(confirmar);                                      // (8)

  // Assert
  expect(confirmar).toBeDisabled();                                 // (9)
  expect(confirmar).toHaveTextContent("Guardando...");              // (10)
  expect(fetchFalso).toHaveBeenCalledTimes(1);                      // (11)

  // Limpieza
  liberar();                                                        // (12)
  await vi.waitFor(() => expect(router.push).toHaveBeenCalledTimes(1));     // (13)
  expect(fetchFalso).toHaveBeenCalledTimes(1);                      // (14)
});
```

| Pregunta | Respuesta |
|---|---|
| **Imports** | Los mismos de RTL, `user-event` y Vitest. (1) Se importa `AvanzarEstado`: el botón «Pasar a…» de la orden y su ventana de confirmación. |
| **¿Qué monta `render()`?** | (4) El componente para una orden 5 en estado RECIBIDO cuyo siguiente estado es EN_DIAGNOSTICO, **sin bloqueo** (`bloqueo={null}`). Así el botón está habilitado y lo único que se prueba es el doble clic. |
| **¿Cómo lo encuentra `screen.getBy…` como el usuario?** | (5) Busca el botón por lo que dice: «Pasar a «En diagnóstico»». (6) `findByRole` **espera** a que aparezca el botón «Confirmar cambio» dentro de la ventana, que aparece un instante después del clic, no al mismo tiempo. |
| **¿Qué interacción simula `userEvent`?** | (7) y (8) **Dos clics seguidos** en «Confirmar cambio», como una persona impaciente o un mouse que rebota. |
| **¿Qué verifica `expect()`?** | (9) Que después del primer clic el botón quede **deshabilitado**. (10) Que diga «Guardando...», para que la persona sepa que algo está pasando. (11) Que `fetch` se haya llamado **una sola vez**: el segundo clic no envió nada. (13) Que, cuando el backend responde, la pantalla navega una vez, y (14) que ni siquiera entonces se envió un segundo cambio. |
| **¿Qué reemplaza el mock y por qué?** | (2)-(3) Aquí el mock hace algo más: `mockImplementationOnce` hace que el primer `fetch` **quede esperando** («en el aire») hasta que la prueba llame a `liberar()` en (12). Es como poner en pausa al backend para revisar el botón **mientras** se guarda. Con un backend real la respuesta llega tan rápido que no daría tiempo de ver ese momento. El router se reemplaza para contar en (13) cuántas veces se navegó. |

**Por qué importa:** sin esta protección, un doble clic podría mandar dos cambios de estado y la orden avanzaría dos pasos, o se registraría dos veces el mismo pago (hay pruebas iguales para «Guardar pago», «Guardar cotización», «Confirmar entrega» y «Registrar cliente»).

## Resultado de la ejecución (15-nov-2026, local, Windows)

| Dato | Valor |
|---|---|
| Archivos de prueba | **15/15 PASS** |
| Pruebas | **106/106 PASS** (0 fallidas, 0 omitidas) |
| Tiempo total | **17,9 s** (casi la mitad es crear el navegador simulado, jsdom, en cada archivo) |
| Las 16 pruebas escogidas | **16/16 PASS** |
| Las 3 explicadas | RTL-05: 349 ms · RTL-07: 156 ms · RTL-14: 302 ms |

La salida completa, con el nombre de cada prueba, está en [`resultado-vitest.txt`](resultado-vitest.txt). Las rutas del computador aparecen como `<repo>`. Estas pruebas también corren en GitHub Actions en cada PR (`npm test` del frontend).

## Cómo correrlas

Todo desde la carpeta `frontend/`:

| Qué | Comando |
|---|---|
| Todas | `npm test` |
| Todas, con el nombre de cada prueba | `npx --no-install vitest run --reporter=verbose` |

### Cómo correr una prueba al azar en la sustentación

**Una sola prueba, por su nombre.** Se le pasa la ruta del archivo y, con `-t`, un pedazo del nombre del test:

```bash
npx --no-install vitest run src/components/auth/login -t "Credenciales inválidas"
```

Resultado esperado: `Tests 1 passed | 1 skipped (2)`. Sin la ruta (`npx --no-install vitest run -t "Credenciales inválidas"`) también funciona, pero revisa los 15 archivos: `1 passed | 105 skipped`.

**Un archivo completo** (o una carpeta):

```bash
npx --no-install vitest run src/components/clientes/cliente-form
```

Resultado esperado: `Tests 10 passed (10)`.

Para cualquier otra prueba de la tabla, se cambia la ruta y el texto entre comillas. Por ejemplo: `npx --no-install vitest run src/components/ordenes/avanzar-estado -t "doble clic"`.

## Decisiones de calidad

- **Buscar como el usuario:** se prefiere `getByRole` (botón, diálogo, tabla…) y `getByLabelText` (campo por su etiqueta), como recomienda RTL. No se usan clases CSS ni `data-testid`. Si una prueba no encuentra algo, normalmente una persona tampoco lo encontraría.
- **`findBy…` para lo que tarda:** los mensajes que aparecen después de validar o de responder el backend se buscan con `findBy…`, que espera solo. No hay pausas fijas.
- **Mocks solo en los bordes:** se simulan `fetch` y el router de Next, y nada más. El formulario, sus validaciones y sus mensajes son el código real.
- **Datos ficticios:** nombres, teléfonos, correos y contraseñas de prueba son inventados. Ninguna prueba lee el `.env` ni llama al backend real.
- **Independencia:** `beforeEach` limpia los espías y `vitest.setup.ts` desmonta la pantalla después de cada prueba, así que se pueden correr solas o en cualquier orden.
