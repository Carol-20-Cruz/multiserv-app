# 09 · Pruebas de API con Postman

Pruebas de la API REST del backend de MultiServ (NestJS, `http://localhost:3001`) con Postman. Las peticiones van directo al backend, sin pasar por el navegador: se validan el código HTTP, el cuerpo de la respuesta y las **reglas del negocio** que el backend debe hacer cumplir aunque alguien se salte la pantalla.

| Archivo | Qué es |
|---|---|
| [`MultiServ_API.postman_collection.json`](MultiServ_API.postman_collection.json) | Colección: 4 carpetas por módulo, 22 peticiones, 63 assertions |
| [`MultiServ_Local.postman_environment.json`](MultiServ_Local.postman_environment.json) | Environment local. **Las contraseñas van vacías** |
| [`reporte-html/index.html`](reporte-html/index.html) | Reporte de newman (htmlextra) de la última corrida, sin datos sensibles |
| [`backend/scripts/test-api.cjs`](../../../backend/scripts/test-api.cjs) | Script de `npm run test:api` (newman) |

## Pruebas y trazabilidad con los SWR

**API-xx** son las pruebas. **AUX-xx** son peticiones de preparación (crean el equipo, avanzan el estado, etc.); también llevan assertions mínimas para que, si algo falla, se vea dónde.

| ID | Carpeta | Petición | Resultado esperado | Tipo | Regla del negocio | SWR / ajuste |
|---|---|---|---|---|---|---|
| API-01 | Auth | `POST /auth/login` Dueño, contraseña correcta | 200, `accessToken` con forma JWT, `rol = DUENO`, sin datos de contraseña; guarda `tokenDueno` | Positiva | — | SWR-AUTH-001 |
| API-02 | Auth | `POST /auth/login` contraseña incorrecta (un solo intento) | 401, «Credenciales inválidas», sin token | Negativa | — | SWR-AUTH-001 |
| API-03 | Auth | `GET /ordenes` sin token | 401, sin datos | Negativa | — | SWR-AUTH-008 |
| API-04 | Auth | `GET /repuestos` con token del Técnico | **403** (token válido, rol sin permiso) | Negativa | **Sí**: inventario solo del Dueño | SWR-AUTH-008, AJ-03 |
| API-05a | Clientes | `POST /clientes` con teléfono nuevo | 201, nombre y teléfono guardados; guarda `clienteId` | Positiva | — | SWR-CLI-001 |
| API-05b | Clientes | `POST /clientes` con el **mismo** teléfono | **409** «Ya existe un cliente con este teléfono» + el cliente existente | Negativa | **Sí**: teléfono único | SWR-CLI-001, SWR-CLI-004, AJ-04 |
| API-06 | Órdenes | `POST /ordenes` | 201, `numero` cumple `MS-AAAA-NNNNN` con el año actual (Colombia), estado `RECIBIDO` | Positiva | **Sí**: formato del número | SWR-ORD-001, SWR-ORD-002, AJ-06 |
| API-07 | Órdenes | `POST /ordenes/:id/estado` → `EN_REPARACION` sin abono | **409 `FALTA_ABONO`**; la orden sigue en `EN_DIAGNOSTICO` | Negativa | **Sí**: abono mínimo 50 % | SWR-ORD-011, AJ-10 |
| API-08 | Órdenes | `POST /ordenes/:id/pagos` por 200.001 (cotización 200.000) | **409 `SUPERA_SALDO`**, no se registra el pago | Negativa | **Sí**: nunca se cobra de más | SWR-PAY-004 |
| API-09 | Órdenes | `POST /ordenes/:id/pagos` por 100.000 | 201, `tipo = ABONO`, `saldo = total − pagado` (100.000), cubre el 50 % | Positiva | **Sí**: cálculo del saldo | SWR-PAY-004 |
| API-10 | Órdenes | `POST /ordenes/:id/entregar` con saldo pendiente | **409 `SALDO_PENDIENTE`**; la orden sigue en `LISTO_PARA_ENTREGA` | Negativa | **Sí**: no se entrega con deuda | SWR-ENT-003 |
| API-11 | Inventario | `GET /repuestos?soloStockBajo=1` | 200, lista no vacía, **todos** con `cantidad ≤ cantidadMinima` y `stockBajo = true`; incluye el repuesto de la corrida | Positiva | **Sí**: existencia baja | SWR-INV-009 |
| API-12 | Órdenes | `POST /ordenes/:id/pagos` por el saldo restante | 201, `tipo = SALDO`, `saldo = 0`, pagado = cotizado | Positiva | **Sí**: tipo de pago y saldo | SWR-PAY-004 |
| API-13 | Órdenes | `POST /ordenes/:id/entregar` con saldo 0 | 200, `estado = ENTREGADO`, garantía vence después de la entrega | Positiva | **Sí**: entrega con saldo en cero | SWR-ENT-003 |

**Resumen:** 14 pruebas (8 positivas, 6 negativas), y **10 de 14 validan reglas del negocio**, no CRUD genérico.

Peticiones de preparación: AUX-01 login del Técnico · AUX-02 tipos de equipo · AUX-03 equipo del cliente · AUX-04 → `EN_DIAGNOSTICO` · AUX-05 cotización $ 200.000 · AUX-06 → `EN_REPARACION` (ya con abono: la misma transición de API-07 ahora sí pasa) · AUX-07 → `LISTO_PARA_ENTREGA` · AUX-08 repuesto con cantidad 0 y mínimo 1.

## Cómo está encadenada

- **Orden fijo.** La colección se corre completa y en orden: Auth → Clientes → Órdenes → Inventario. Cada petición usa lo que guardó la anterior.
- **Variables de colección** (las escriben los scripts Post-response con `pm.collectionVariables.set`): `tokenDueno`, `tokenTecnico`, `run`, `telefono`, `clienteId`, `tipoEquipoId`, `equipoId`, `ordenId`, `numeroOrden`, `valorCotizado`, `totalPagado`, `saldo`, `repuestoId`. En el archivo van vacías.
- **Variables de environment** (dependen de la máquina): `baseUrl`, `correoDueno`, `correoTecnico`, `passwordDueno`, `passwordTecnico`.
- **Datos nuevos en cada corrida.** El Pre-request de la primera petición (API-02) borra las variables de la corrida anterior y genera `run = Date.now()`. Con él se arman el celular ficticio (`3` + 9 dígitos), `API-Cliente <run>`, el equipo `API-<run>` y el repuesto `API-Rep <run>` / `API-R<run>`. Todos los datos creados llevan el prefijo **API-**.
- **Token.** La colección entera usa `Bearer {{tokenDueno}}`. API-03 va sin autenticación y API-04 usa `{{tokenTecnico}}`.
- **Sin fallos en cadena.** Si una petición base falla (login, cliente, orden…), su script llama `pm.execution.setNextRequest(null)` y la corrida se detiene.
- **Bloqueo de cuenta.** El único intento fallido (API-02) va **antes** del login correcto, que reinicia el contador. La cuenta nunca acumula intentos (se bloquea a los 5).
- **Seguridad.** Ningún script hace `console.log`. Los tokens solo viven en variables de colección durante la corrida.

## Cómo correrla en VS Code (extensión de Postman)

1. Panel de Postman → **Import** → los dos archivos `.json` de esta carpeta.
2. **Environments** → *MultiServ Local* → escribe `passwordDueno` y `passwordTecnico` en la columna **Current value** (en versiones nuevas puede llamarse *Local value*). Deja vacío el **Initial value** (*Shared value*). El current value se queda en tu equipo y no se exporta ni se sincroniza.
3. Selecciona *MultiServ Local* en el selector de environment (arriba a la derecha).
4. Con el backend encendido en `:3001`: clic derecho en la colección → **Run collection** → *Run MultiServ API* (sin cambiar el orden).

> Si vuelves a exportar el environment desde Postman, revisa que las contraseñas sigan vacías antes de hacer commit.

## Cómo correrla desde la terminal (newman)

Con el backend encendido, desde `backend/`:

```bash
npm run test:api
```

- El script lee las contraseñas de `backend/.env` (`SEED_DUENO_PASSWORD`, `SEED_TECNICO_PASSWORD`) **en memoria** y se las pasa a newman. No las imprime ni las escribe en ningún archivo.
- Genera `reporte-html/index.html` con `skipSensitiveData`, sin cuerpos ni headers, así que no queda la contraseña del login ni el token Bearer.
- Termina con código 1 si alguna assertion falla.
- **No corre en el CI:** necesita el backend y la base reales. El workflow solo ejecuta `lint`, `test`, `test:e2e` y `build`.
- Versiones fijas (devDependencies de `backend/`): `newman 6.2.3`, `newman-reporter-htmlextra 1.23.1`.

## Resultado de la ejecución (14-nov-2026, local, newman 6.2.3)

Dos corridas seguidas para comprobar que la colección se puede repetir con datos nuevos:

| Corrida | `run` | Peticiones* | Assertions | Fallos | Duración |
|---|---|---|---|---|---|
| 1 | 1794710495430 | 25 | 63 | **0** | 12,9 s |
| 2 | 1794710511243 | 25 | 63 | **0** | 12,3 s |

\* 22 peticiones de la colección + 3 consultas internas de verificación (`pm.sendRequest`: estado de la orden en API-07 y API-10, búsqueda del repuesto en API-11).

Códigos HTTP de cada corrida: 12 × 200, 6 × 201, 2 × 401, 1 × 403, 4 × 409.

**Revisión de seguridad antes del commit.** Se buscó en los dos JSON, el reporte y el script: `eyJ` (tokens JWT) y el valor de cada variable de `backend/.env`. Resultado: 0 contraseñas, 0 tokens y 0 secretos. Las únicas coincidencias fueron el número de puerto de `http://localhost:3001`, que no es secreto.

**Datos que deja cada corrida en la base:** 1 cliente, 1 equipo, 1 orden entregada (consume un consecutivo `MS-2026-…`), 2 pagos y 1 repuesto, todos con prefijo `API-`.
