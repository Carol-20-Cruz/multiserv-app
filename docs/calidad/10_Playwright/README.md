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
