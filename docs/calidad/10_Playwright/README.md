# 10 · Pruebas E2E con Playwright

Pruebas de extremo a extremo de MultiServ: un navegador Chromium real recorre la aplicación (frontend Next.js + backend NestJS + base de datos Supabase) como lo haría el Dueño o el Técnico.

- **Código:** [`frontend/e2e/`](../../../frontend/e2e/) · **Configuración:** [`frontend/playwright.config.ts`](../../../frontend/playwright.config.ts)
- **Reporte HTML:** [`reporte-html/index.html`](reporte-html/index.html). Para verlo: `npx --no-install playwright show-report ../docs/calidad/10_Playwright/reporte-html` desde `frontend/`.
- **Trazas, capturas y video de fallos:** `resultados/`, que **no se sube** (está en `.gitignore`).

## Pruebas y trazabilidad con los SWR

| ID | Prueba | Rol | Flujo principal | SWR / ajuste |
|---|---|---|---|---|
| E2E-01 | Login → cliente → equipo → orden → diagnóstico → cotización $ 200.000 → abono 50 % → reparación → listo → pago del saldo → entrega → garantía en la tarjeta «Cuenta» | Dueño | **Sí** | SWR-ORD-001, SWR-ORD-011, SWR-PAY-004, SWR-ENT-003 |
| E2E-02 | Login → cliente → equipo → orden → cotización → **bloqueo** sin abono (pantalla + API 409 `FALTA_ABONO`) → abono → reparación → listo → **bloqueo** de entrega con saldo (pantalla + API 409 `SALDO_PENDIENTE`) | Técnico | **Sí** | AJ-10 / SWR-ORD-011, SWR-ENT-003 |
| E2E-03 | Contraseña incorrecta: «Credenciales inválidas» y no entra; con la correcta entra al Inicio | Dueño | No | SWR-AUTH-001, SWR-AUTH-003 |
| E2E-04 | Sin sesión `/ordenes` y `/clientes` van a `/login`; el Técnico no ve «Inventario» en el menú, `/inventario` lo devuelve al Inicio y `GET /api/repuestos` responde 403 | Técnico | No | SWR-AUTH-008 (AJ-03) |
| E2E-05 | Repuesto con cantidad = mínimo → alerta «Existencia baja» y etiqueta «Stock bajo» en su fila → entrada de 5 → sale del filtro de stock bajo | Dueño | No | SWR-INV-001, SWR-INV-009 |

En el reporte HTML cada prueba lleva sus SWR como etiquetas (`@SWR-…`) y como anotaciones. Cada etapa es un `test.step`.

## Resultado de la ejecución (14-nov-2026, local, Chromium)

| ID | Resultado | Tiempo |
|---|---|---|
| E2E-01 | PASS | 34,1 s |
| E2E-02 | PASS | 28,6 s |
| E2E-03 | PASS | 4,8 s |
| E2E-04 | PASS | 5,9 s |
| E2E-05 | PASS | 16,2 s |
| **Total** | **5/5 PASS** | **1,5 min** |

La suite se corrió varias veces seguidas con el mismo resultado: cada corrida crea sus propios datos.

## Dos pruebas explicadas a nivel de código

Una prueba E2E es como un **cliente misterioso**: alguien entra al taller sin avisar, hace lo mismo que haría cualquier cliente y anota si todo salió como se prometió. Playwright es ese cliente: abre un Chromium de verdad, hace clic y escribe en la aplicación real (frontend + backend + Supabase) y revisa lo que aparece en pantalla.

Se eligieron **E2E-03** (la puerta de entrada: el login) y **E2E-01** (el recorrido completo, del login al equipo entregado con garantía). El código es el real del repositorio; solo se agregaron los comentarios numerados `// (n)` para explicarlo.

---

### Ejemplo 1 · E2E-03 · Login incorrecto y luego correcto

Archivo: [`frontend/e2e/e2e-03-login.spec.ts`](../../../frontend/e2e/e2e-03-login.spec.ts)

```ts
import { expect, test } from "@playwright/test";                                // (1)
import { credenciales, llenarLogin } from "./apoyo/sesion";                       // (2)

test(
  "E2E-03 Login: contraseña incorrecta muestra el mensaje y no entra; la correcta entra",
  {
    tag: ["@SWR-AUTH-001", "@SWR-AUTH-003"],                                     // (3)
    annotation: [
      { type: "SWR", description: "SWR-AUTH-001 inicio de sesión con correo y contraseña" },
      { type: "SWR", description: "SWR-AUTH-003 mensaje genérico ante credenciales inválidas" },
    ],
  },
  async ({ page }) => {                                                          // (4)
    const { correo, password } = credenciales("DUENO");                          // (5)

    await test.step("Contraseña incorrecta: mensaje y sigue en /login", async () => {
      await llenarLogin(page, correo, "clave-incorrecta-E2E");                   // (6)
      // Filtrado por texto: Next también pone un role="alert" vacío (el
      // anunciador de cambios de ruta para lectores de pantalla).
      await expect(
        page.getByRole("alert").filter({ hasText: "Credenciales inválidas" }),  // (7)
      ).toBeVisible();
      await expect(page).toHaveURL(/\/login$/);                                  // (8)
      await expect(page.getByRole("button", { name: "Iniciar sesión" })).toBeVisible();
    });

    await test.step("Contraseña correcta: entra al Inicio", async () => {
      await llenarLogin(page, correo, password);                                 // (9)
      await expect(page).toHaveURL("/");                                         // (10)
      await expect(page.getByRole("heading", { name: "Inicio" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Cerrar sesión" })).toBeVisible();
    });
  },
);
```

El paso de llenar el formulario está en un ayudante compartido, [`frontend/e2e/apoyo/sesion.ts`](../../../frontend/e2e/apoyo/sesion.ts) (se omiten sus comentarios largos):

```ts
export async function llenarLogin(page: Page, correo: string, password: string) {
  await page.goto("/login");                                                     // (11)
  await page.getByLabel(/^Correo electrónico/).fill(correo);                     // (12)
  const campo = page.getByLabel(/^Contraseña/);                                  // (13)
  await expect(campo).toBeEditable();                                            // (14)
  await campo.evaluate((input, valor) => {                                       // (15)
    const setter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set;
    setter?.call(input, valor);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, password);
  await page.getByRole("button", { name: "Iniciar sesión" }).click();            // (16)
}
```

| Pregunta | Respuesta |
|---|---|
| **Imports y estructura** | (1) `test` define la prueba y `expect` verifica. (2) Ayudantes propios: `credenciales` lee la contraseña del seed desde `backend/.env` sin imprimirla, y `llenarLogin` llena el formulario. (3) Las etiquetas `@SWR-…` aparecen en el reporte HTML: así se sabe qué requisito prueba. (4) `page` es la pestaña del navegador que Playwright entrega lista para usar. |
| **`page.goto`: ¿qué pantalla abre y por qué?** | (11) Abre `/login` (sobre `baseURL: http://localhost:3000` de `playwright.config.ts`). Es la puerta de entrada: la prueba empieza **desde cero**, como alguien que acaba de abrir la aplicación, sin una sesión guardada de antes. |
| **Locator: ¿por qué `getByRole` / `getByLabel` / `getByText`?** | Se busca cada cosa **como la buscaría una persona**: el campo por la etiqueta que se lee al lado (12, 13), el botón por su papel y su texto (16) y el mensaje por ser una alerta con cierto texto (7). Es como pedirle a alguien «el botón que dice *Iniciar sesión*» y no «el tercer `div` de la izquierda». Si el diseño cambia de lugar pero sigue diciendo lo mismo, la prueba no se rompe; si alguien quita la etiqueta del campo, sí falla, y con razón: un lector de pantalla tampoco lo encontraría. En (13) se usa `/^Contraseña/` porque el botón «Mostrar contraseña» también contiene esa palabra. |
| **Acción: ¿qué hace el usuario?** | (12) Escribe el correo. (15) Pone la contraseña. (16) Hace clic en «Iniciar sesión». Primero con una clave inventada (6) y después con la real (9). La contraseña se pone con `evaluate` y no con `fill()` porque `fill()` deja el valor escrito en el reporte HTML que se sube al repositorio (hallazgo H11); el envío sigue siendo un clic real. |
| **`expect`: ¿qué demuestra?** | Con la clave incorrecta: (7) aparece «Credenciales inválidas», un mensaje genérico que no dice si falló el correo o la contraseña (SWR-AUTH-003), y (8) la URL sigue en `/login`, o sea, **no entró**. Con la correcta: (10) la URL pasa a `/` y se ven el título «Inicio» y el botón «Cerrar sesión», o sea, **sí entró** (SWR-AUTH-001). Las dos mitades juntas prueban que el sistema distingue una clave de la otra. |
| **Auto-waiting: ¿qué espera Playwright solo?** | Antes de hacer clic, Playwright espera a que el botón exista, sea visible y esté habilitado. Cada `expect(...)` reintenta hasta que se cumple (máximo 15 s, `expect.timeout`): por ejemplo, (10) espera a que el backend responda y la página cambie a `/`. (14) espera a que el campo de contraseña acepte texto antes de ponerle el valor. Por eso no hay ningún `waitForTimeout`: es como esperar a que el semáforo se ponga en verde, no contar 10 segundos y cruzar. |
| **Datos: ¿cómo evita depender de otra ejecución?** | (5) Usa el usuario Dueño del seed, que siempre existe. Hace **un solo** intento fallido y luego el correcto, que pone el contador en 0 (AJ-02): aunque la prueba se repita muchas veces, nunca bloquea la cuenta (el bloqueo es al 5º fallo, SWR-AUTH-004). No crea ni necesita datos de otra prueba. |

---

### Ejemplo 2 · E2E-01 · Flujo principal completo (Dueño)

Archivo: [`frontend/e2e/e2e-01-flujo-principal-dueno.spec.ts`](../../../frontend/e2e/e2e-01-flujo-principal-dueno.spec.ts) (se omiten los imports y el comentario inicial).

```ts
test(
  "E2E-01 Dueño: login → cliente → equipo → orden → cotización → abono → reparación → pago del saldo → entrega con garantía",
  {
    tag: ["@flujo-principal", "@SWR-ORD-001", "@SWR-ORD-011", "@SWR-PAY-004", "@SWR-ENT-003"],
    annotation: [
      { type: "SWR", description: "SWR-ORD-001 registrar orden de servicio" },
      { type: "SWR", description: "SWR-ORD-011 secuencia de estados" },
      { type: "SWR", description: "SWR-PAY-004 cotización, abono y pago del saldo" },
      { type: "SWR", description: "SWR-ENT-003 entrega con saldo en cero y garantía" },
    ],
  },
  async ({ page }) => {
    const sufijo = sufijoUnico();                                                // (1)
    const nombreCliente = `Cliente E2E-01 ${sufijo}`;
    const marca = `MarcaE2E01-${sufijo}`;

    await test.step("Iniciar sesión como Dueño", async () => {
      await iniciarSesion(page, "DUENO");                                        // (2)
    });

    await test.step("Registrar cliente", async () => {
      await registrarCliente(page, nombreCliente);                               // (3)
    });

    await test.step("Agregar equipo al cliente", async () => {
      await agregarEquipo(page, marca);
    });

    await test.step("Crear la orden de servicio (SWR-ORD-001)", async () => {
      await crearOrdenDesdeFicha(page, `Prueba E2E-01 ${sufijo}: no enciende`);
      await expect(page.getByText("Recibido").first()).toBeVisible();            // (4)
    });

    await test.step("Pasar a diagnóstico (SWR-ORD-011)", async () => {
      await pasarA(page, "En diagnóstico");                                      // (5)
    });

    await test.step("Registrar cotización de $ 200.000", async () => {
      await registrarCotizacion(page, "Tarjeta principal dañada (dato ficticio E2E)", "200000");
      await expect(page.getByText(/\$\s200\.000/).first()).toBeVisible();
      await expect(page.getByText(/\$\s100\.000/).first()).toBeVisible(); // abono mínimo 50 %   (6)
    });

    await test.step("Registrar abono del 50 % (SWR-PAY-004)", async () => {
      await registrarPago(page, "100000", /Queda registrado como abono/);        // (7)
    });

    await test.step("Pasar a reparación y a listo para entrega", async () => {
      await pasarA(page, "En reparación");
      await pasarA(page, "Listo para entrega");
      await expect(page.getByText(/El equipo está listo/)).toBeVisible();
    });

    await test.step("Pagar el saldo pendiente", async () => {
      await registrarPago(page, "100000", /Cubre todo el saldo/);
      await expect(page.getByRole("button", { name: "Entregar equipo" })).toBeEnabled();   // (8)
    });

    await test.step("Entregar el equipo (SWR-ENT-003)", async () => {
      await page.getByRole("button", { name: "Entregar equipo" }).click();      // (9)
      const dialogo = page.getByRole("dialog");                                  // (10)
      await dialogo.getByLabel("Recibido por").fill(`Recibe E2E-01 ${sufijo}`);
      await dialogo.getByRole("button", { name: "Confirmar entrega" }).click();
      await expect(dialogo).toBeHidden();                                        // (11)
      await expect(page.getByText("Equipo entregado correctamente.")).toBeVisible();
    });

    await test.step("Ver la garantía en la tarjeta «Cuenta»", async () => {
      await expect(page.getByText("La orden ya fue entregada: su estado no cambia.")).toBeVisible();
      await expect(page.getByText("Entregada", { exact: true })).toBeVisible();
      await expect(page.getByText(`Recibe E2E-01 ${sufijo}`)).toBeVisible();
      await expect(page.getByText("Entregó", { exact: true })).toBeVisible();
      // Etiqueta "Garantía hasta" y, junto a ella, la fecha a las 11:59 p. m.
      const garantia = page.getByText("Garantía hasta", { exact: true }).locator("..");
      await expect(garantia).toContainText(/11:59\sp\.\s?m\./);                 // (12)
    });
  },
);
```

Los pasos repetidos viven en [`frontend/e2e/apoyo/flujo.ts`](../../../frontend/e2e/apoyo/flujo.ts). Por ejemplo, registrar el cliente:

```ts
export async function registrarCliente(page: Page, nombre: string) {
  await page.goto("/clientes/nuevo");                                            // (13)
  await page.getByLabel("Nombre completo").fill(nombre);
  await page
    .getByRole("textbox", { name: "Teléfono", exact: true })                     // (14)
    .fill(telefonoUnico());                                                      // (15)
  await page
    .getByRole("checkbox", { name: /autoriza el tratamiento de sus datos/ })
    .check();
  await page.getByRole("button", { name: "Registrar cliente" }).click();

  await expect(page).toHaveURL(/\/clientes\/\d+/);                               // (16)
  await expect(page.getByText("Cliente registrado correctamente.")).toBeVisible();
  await expect(page.getByRole("heading", { name: nombre })).toBeVisible();
  return idDesdeUrl(page.url(), "clientes");
}
```

| Pregunta | Respuesta |
|---|---|
| **Estructura** | Cada `test.step` es una etapa del trabajo real del taller, como los pasos de una receta. En el reporte HTML se ve cuál pasó y en cuál se detuvo, sin leer el código. Las etiquetas del inicio ligan la prueba con 4 SWR. |
| **`page.goto`: ¿qué pantalla abre y por qué?** | (2) `iniciarSesion` abre `/login`, igual que E2E-03. (13) `registrarCliente` abre `/clientes/nuevo` directamente, porque el objetivo es el flujo de la orden y no navegar por el menú. Después de eso **no hay más `goto`**: la orden se crea desde la ficha del cliente y el resto ocurre en el detalle de la orden, como lo haría el Dueño en el mostrador. |
| **Locator: ¿por qué `getByRole` / `getByLabel` / `getByText`?** | Igual que en E2E-03: se busca lo que la persona ve. (10) `getByRole("dialog")` encuentra la ventana de confirmación, y dentro de ella se busca el campo «Recibido por»: así se evita tocar por error otro campo con el mismo nombre en la página. (14) En el teléfono se usa `getByRole("textbox", { name: "Teléfono", exact: true })` porque «Teléfono alterno» también contiene la palabra. |
| **Acción: ¿qué hace el usuario?** | Recorre el trabajo completo del taller: entra (2), registra el cliente (3) y su equipo, crea la orden, la pasa a diagnóstico (5), registra la cotización de $ 200.000, paga el abono de $ 100.000 (7), pasa a reparación y a listo, paga el saldo y entrega el equipo (9) escribiendo quién lo recibe. |
| **`expect`: ¿qué demuestra?** | Que cada regla del negocio se cumple **vista desde la pantalla**: (4) la orden nace en «Recibido» (SWR-ORD-001); (6) la pantalla calcula el abono mínimo del 50 % ($ 100.000); (7) el pago se reconoce como abono; (8) «Entregar equipo» solo se habilita cuando el saldo queda en 0 (SWR-ENT-003); (11) la entrega se confirma y (12) aparece la garantía con hora 11:59 p. m., el final del día. Es el **resultado final** del flujo: el equipo entregado y con garantía. |
| **Auto-waiting: ¿qué espera Playwright solo?** | Después de cada clic que guarda algo, la prueba no duerme: espera a que **pase algo visible**. (11) `toBeHidden()` espera a que la ventana se cierre (el backend respondió) y luego espera el mensaje de éxito. (16) `toHaveURL` espera a que la página cambie a la ficha del cliente recién creado. Es como el cliente misterioso que espera a que le entreguen el recibo antes de irse, no un tiempo fijo. Por eso la prueba funciona igual si Supabase responde en 300 ms o en 3 s. |
| **Datos: ¿cómo evita depender de otra ejecución?** | (1) `sufijoUnico()` arma un sufijo con fecha, hora y 4 caracteres al azar (por ejemplo `20261114-203015-k3f9`) y lo pone en el nombre del cliente, la marca y la falla. (15) `telefonoUnico()` genera un teléfono de 10 dígitos que empieza por 3 y no se repite, para no chocar con el aviso de teléfono duplicado (AJ-04). La prueba **crea todo lo que usa**: no busca un cliente u orden que haya dejado otra corrida, así que se puede correr sola, en cualquier orden y muchas veces. Todo lleva el prefijo E2E; los datos de las corridas anteriores se borraron con el script de la carpeta 15. |

## Cómo correrlas (solo local)

No corren en GitHub Actions porque necesitan la base real y las credenciales del seed.

1. `backend/` → `npm run start` (puerto 3001)
2. `frontend/` → `npm run dev` (puerto 3000)
3. `frontend/` → `npm run test:e2e`, o una sola con `npx --no-install playwright test e2e-03`

Playwright no levanta ni compila la app: usa los servidores que ya están encendidos.

## Decisiones de calidad

- **Locators semánticos:** `getByRole`, `getByLabel` y `getByText`, con aserciones `expect` que esperan solas (auto-waiting). **No hay ningún `waitForTimeout`.**
- **Independencia:** cada prueba inicia sesión y crea sus datos. Ninguna usa lo que dejó otra, así que se pueden correr solas o en cualquier orden.
- **Datos únicos y ficticios:** sufijo `AAAAMMDD-HHMMSS-xxxx` en nombres y referencias, y teléfono de 10 dígitos armado con la hora. Todo lleva el prefijo **E2E**.
- **Datos que quedan en la base por corrida:** 2 clientes con un equipo cada uno, 2 órdenes (una entregada y otra lista con saldo), 3 pagos, 1 repuesto y su entrada. Por ahora no se borran.
- **E2E-03 no bloquea la cuenta:** hace un solo intento fallido y después el login correcto pone el contador en 0 (AJ-02).
- **Fallos:** `trace: retain-on-failure`, captura y video solo cuando una prueba falla. Hay `retries: 0`, por eso no se usa `on-first-retry`, que nunca grabaría nada.
- **`workers: 1`:** `next dev` compila cada página la primera vez y la base está en la nube, así que en serie los tiempos son estables.

## Credenciales y secretos

- Las contraseñas se leen de `backend/.env` (que no se sube) con `process.loadEnvFile`. Si falta una variable, la prueba falla nombrando la variable, nunca su valor.
- **Hallazgo:** el reporte HTML guarda cada `fill()` como `Fill "<valor>"`. En la primera versión la contraseña real quedaba dentro del reporte. Por eso **solo el campo Contraseña** se llena con `locator.evaluate()` (setter nativo + evento `input`), y el reporte muestra únicamente «Evaluate».
- **Antes de subir el reporte** se revisa con un script que descomprime los datos embebidos en `index.html` y busca las dos contraseñas en varias codificaciones. Resultado de este reporte: **limpio**.
- Las trazas sí pueden guardar el login (por ejemplo, el cuerpo del POST), por eso `resultados/` nunca se sube.
