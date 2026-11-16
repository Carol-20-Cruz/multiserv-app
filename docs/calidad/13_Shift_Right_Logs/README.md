# 13 · Shift Right: logs con el sistema ejecutándose

Evidencia de cómo se comporta MultiServ **en ejecución real**, a partir de sus
logs. El backend escribe cada evento como una línea JSON
([`json-logger.ts`](../../../backend/src/logging/json-logger.ts)):

```json
{"timestamp":"…","level":"INFO|WARN|ERROR","context":"OrdenesService","event":"PAYMENT_REGISTERED","message":"Pago registrado","metadata":{…}}
```

- `event` es un nombre fijo y fácil de buscar (`LOGIN_FAILED`, `PAYMENT_REGISTERED`…).
- `metadata` lleva solo ids, rol, montos, estados y el patrón de la ruta.
- Los errores inesperados los registra `AllExceptionsFilter` como `ERROR`
  (salen por stderr) y al usuario solo le llega «Error interno del servidor».

## Cómo se capturaron y depuraron

1. Backend local en el puerto 3001 conectado a Supabase; frontend en el 3000.
   Las pruebas se hicieron desde la pantalla (navegador) o con llamadas
   directas a la API (script local o Postman).
2. Se guardó la salida del backend y se quitaron las líneas internas de
   arranque de NestJS (`NEST_LOG`).
3. Revisión de privacidad de cada archivo: se buscaron nombres y teléfonos de
   los clientes usados, correos, contraseñas y secreto JWT del `.env`, tokens
   JWT y hashes bcrypt. En todos: **0 coincidencias**.
4. En `complementario_logs.txt` la ruta absoluta del equipo que aparecía en
   un error se reemplazó por `<ruta-local>` (ver HAE-04).

## Archivos

| Archivo | Fecha | Qué contiene |
|---|---|---|
| [`auth_bloqueo_logs.txt`](auth_bloqueo_logs.txt) | 08/11/2026 | Login correcto, credencial incorrecta, bloqueo tras 5 intentos y permisos por rol |
| [`inventario_logs.txt`](inventario_logs.txt) | 09/11/2026 | Alta de repuestos, entradas, alerta de stock bajo y acceso denegado al Técnico |
| [`ordenes_logs.txt`](ordenes_logs.txt) | 10/11/2026 | Crear orden, cotización, cambio de estado y rechazos por reglas de negocio |
| [`busqueda_sin_tildes_logs.txt`](busqueda_sin_tildes_logs.txt) | 10/11/2026 | Búsquedas sin tildes (defecto 7); las búsquedas no se registran a propósito |
| [`pagos_entrega_logs.txt`](pagos_entrega_logs.txt) | 10 y 11/11/2026 | Abono, paso a reparación y a listo, entrega bloqueada por saldo, pago del saldo y entrega |
| [`complementario_logs.txt`](complementario_logs.txt) | 15/11/2026 | Dato inválido, error provocado y duración del registro de pago |
| [`sr-duracion-pagos.png`](sr-duracion-pagos.png) | 15/11/2026 | Orden MS-2026-00019 con los dos pagos del escenario de duración |

## 18.1 · Logs mínimos

| Log mínimo | Evento que lo cumple | Nivel | Qué guarda | Dónde está |
|---|---|---|---|---|
| Inicio de la aplicación | `APP_STARTED` | INFO | Puerto | Todos los archivos |
| Login correcto | `LOGIN_SUCCESS` | INFO | Solo `userId` | `auth_bloqueo_logs.txt` (escenario 2) |
| Login fallido (sin contraseñas) | `LOGIN_FAILED` y `ACCOUNT_LOCKED` | WARN | Motivo, intentos y correo enmascarado (`n***@…`) o `userId`; nunca la contraseña | `auth_bloqueo_logs.txt` (escenarios 1 y 3) |
| Operación crítica del flujo principal | `PAYMENT_REGISTERED`, `ORDER_DELIVERED` | INFO | Ids, tipo, medio, valor y saldo; nunca la referencia del pago ni quién recibe | `pagos_entrega_logs.txt`, `complementario_logs.txt` (escenario 4) |
| Validación rechazada | `VALIDATION_FAILED` (400) y los rechazos de reglas (409): `ORDER_QUOTE_REJECTED`, `ORDER_TRANSITION_REJECTED`, `DELIVERY_BLOCKED_BALANCE` | WARN | Nombre del campo (sin su valor) o motivo de la regla | `complementario_logs.txt` (escenario 2), `ordenes_logs.txt`, `pagos_entrega_logs.txt` |
| Excepción / error | `UNHANDLED_ERROR` | ERROR | Método, ruta, tipo de error y detalle | `complementario_logs.txt` (escenario 3) |
| Duración de una operación relevante | `duracionMs` en `PAYMENT_REGISTERED` | INFO | Milisegundos del registro de pago | `complementario_logs.txt` (escenario 4) |

`duracionMs` se agregó para esta evidencia (commit `b54bfbc`): mide
`registrarPago` de punta a punta (bloqueo de la fila, suma de pagos,
validación e insert), con su prueba unitaria.

## 18.2 · Escenarios con el sistema ejecutándose

| # | Escenario | Archivo de log | Qué se observó | Qué aprendimos |
|---|---|---|---|---|
| 1 | **Flujo principal correcto** (INFO en secuencia) | `pagos_entrega_logs.txt` (y `complementario_logs.txt`, escenario 4) | En dos días (10 y 11/11): `LOGIN_SUCCESS` → `PAYMENT_REGISTERED` (ABONO) → `ORDER_STATUS_CHANGED` ×2 → `DELIVERY_BLOCKED_BALANCE` (WARN) → `PAYMENT_REGISTERED` (SALDO) → `ORDER_DELIVERED`. Los pasos del flujo son INFO y salen en orden. | La secuencia permite reconstruir qué pasó con una orden solo con ids, sin datos de la persona. El intento de entrega con saldo quedó como `DELIVERY_BLOCKED_BALANCE` (WARN) en medio del flujo, así que el bloqueo SWR-ENT-003 se ve en el log. |
| 2 | **Credencial incorrecta** (WARN controlado) | `auth_bloqueo_logs.txt` | Intentos 1-4: `LOGIN_FAILED` con el motivo y el número de intentos; intento 5: `ACCOUNT_LOCKED` con la hora de desbloqueo; con correo inexistente, solo el correo enmascarado. | Los intentos fallidos se pueden contar para detectar a alguien adivinando contraseñas, sin exponerlas. La respuesta 423 revela que la cuenta existe; se aceptó como decisión de diseño. |
| 3 | **Dato inválido** (validación + mensaje) | `complementario_logs.txt` (escenario 2) | `POST /clientes` con teléfono de 9 dígitos: 400 «El teléfono debe tener exactamente 10 dígitos» y `VALIDATION_FAILED` con `campos: ["telefono"]`. No se creó nada. | El usuario recibe el mensaje exacto y el log guarda solo el nombre del campo, nunca el valor. Desde el navegador esto no llega al backend (el formulario valida antes), por eso se probó con una llamada directa. |
| 4 | **Error provocado/controlado** (ERROR con contexto) | `complementario_logs.txt` (escenario 3) | `GET /clientes/99999999999` (solo lectura): 500 «Error interno del servidor» y `UNHANDLED_ERROR` con método, ruta, `PrismaClientKnownRequestError` y «out of range for type integer». | El log dio la causa sin abrir el código y destapó **D14**. También mostró **HAE-04**: `detail` guarda el mensaje completo, con la ruta del equipo y el código fuente. |
| 5 | **Operación relevante** (duración) | `complementario_logs.txt` (escenario 4) | Orden MS-2026-00019: abono de $ 50.000 en **889 ms** y saldo de $ 50.000 en **846 ms**; saldo final $ 0. | Unos 850-890 ms es la línea base de un pago. El tiempo lo dominan las idas y vueltas a Supabase. Si sube mucho con varios usuarios a la vez, la causa probable es la espera del bloqueo de la fila. |

## Hallazgos encontrados con los logs

Registrados en [`11_Errores_Defectos_Fallas_Incidentes.xlsx`](../11_Errores_Defectos_Fallas_Incidentes.xlsx):

| Id | Hallazgo | Severidad | Estado |
|---|---|---|---|
| **D14** | Un id fuera del rango de un entero de 32 bits (`/clientes/99999999999`) pasa `ParseIntPipe`, llega a Prisma y responde 500. Debería responder 400 o 404. El mismo patrón está en las demás rutas con `:id`. | Media | Abierto, sin corregir |
| **HAE-04** | `UNHANDLED_ERROR` registra `detail: error.message`. Con Prisma ese mensaje trae la ruta absoluta del equipo (con el usuario de Windows), líneas del código y los valores de la consulta, que en un insert podrían ser datos personales. Propuesta: registrar solo el tipo y el código del error. | Media | Abierto |

Antes de esta etapa, los logs ya habían servido para encontrar **D1** (faltaba
`CLIENT_DUPLICATE_PHONE` en uso real) y para diagnosticar **D10** (el backend
nunca recibió el pago: era un problema de entorno, no del código).

## Conclusiones

1. **Los logs no guardan datos personales (Ley 1581 de 2012).** Solo
   llevan ids, rol, montos, estados, nombres de campos y el patrón de la ruta.
   Nunca nombres, teléfonos, correos completos, contraseñas, tokens, la
   referencia de un pago ni el nombre de quien recibe el equipo. Las búsquedas
   no se registran porque el texto buscado puede ser un dato personal. La
   única excepción encontrada es HAE-04, y está registrada para corregirla.
2. **Los WARN muestran lo que el sistema rechaza** (credenciales, datos
   inválidos, reglas de negocio, permisos) con su motivo. Así se distingue un
   uso normal de un error del usuario o de un posible ataque.
3. **Los ERROR tienen contexto para el equipo y un mensaje genérico para el
   usuario.** Con un solo log se llegó a la causa de D14.
4. **La duración da una línea base** (unos 850-890 ms por pago) para comparar
   cuando haya más usuarios o datos.
5. **Shift Right encontró lo que las pruebas anteriores no vieron:** D14 y
   HAE-04 solo aparecieron al ejecutar el sistema real con una entrada
   extrema y leer su log.
