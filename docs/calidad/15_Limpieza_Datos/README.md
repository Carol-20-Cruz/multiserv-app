# 15 · Limpieza de los datos de prueba

**Objetivo:** dejar la base de Supabase sin los datos que crearon las pruebas
(caja negra, Postman, Playwright, Shift Right y exploratorias) antes de la
sustentación, y dejar registro de qué se borró.

**Fecha:** 16-nov-2026. **Script:**
[`backend/scripts/limpiar-datos-prueba.ts`](../../../backend/scripts/limpiar-datos-prueba.ts)

## Qué se consideró dato de prueba

Un registro cuyo texto propio (nombre del cliente o del repuesto, marca o
referencia del equipo, falla o «recibido por» de la orden) **empieza** por:

- **Prefijos:** `CN-`, `API-`, `E2E-`, `SR-`, `EXP-`.
- **Patrones de Playwright** (no ponen `E2E-` al inicio): `Cliente E2E-`,
  `Repuesto E2E-`, `MarcaE2E`, `E2E0`, `Prueba E2E-`, `Recibe E2E-`.

Además, todo lo que depende de ellos: sus equipos, órdenes, pagos, historial
de estados, avances, cotizaciones y movimientos de inventario.

La comparación se hace en JavaScript con `startsWith`, no con `LIKE`, para que
un `%` o un `_` no actúen como comodín (ver D15).

## Tablas que NO se tocaron

| Tabla | Por qué |
|---|---|
| Usuario | Son las cuentas del Dueño y del Técnico. |
| Configuracion | % de abono y días de garantía del taller. |
| TipoEquipo | Catálogo que usan equipos y repuestos. |
| ConsecutivoOrden | Si se reiniciara, se repetirían números de orden (SWR-ORD-002). |
| Auditoria | No tiene llave hacia estos datos (y está vacía). |

## Antes y después

| Tabla | Antes | De prueba (borrados) | Después |
|---|---:|---:|---:|
| Cliente | 20 | 16 | 4 |
| Equipo | 21 | 15 | 6 |
| OrdenServicio | 19 | 17 | 2 |
| HistorialEstado | 79 | 72 | 7 |
| Pago | 30 | 28 | 2 |
| Repuesto | 17 | 11 | 6 |
| MovimientoInventario | 21 | 14 | 7 |
| Avance, Cotizacion, CotizacionItem | 0 | 0 | 0 |
| Usuario / Configuracion / TipoEquipo / ConsecutivoOrden | 2 / 1 / 6 / 1 | 0 | 2 / 1 / 6 / 1 |

Total borrado: 153 registros. Sin conflictos (ningún dato real dependía de un
dato de prueba).

| Archivo | Contenido |
|---|---|
| [`antes_simulacion.txt`](antes_simulacion.txt) | Simulación antes de borrar |
| [`ejecucion.txt`](ejecucion.txt) | Salida del borrado |
| [`despues_verificacion.txt`](despues_verificacion.txt) | Simulación después: 0 registros de prueba en todas las tablas |

Las salidas solo traen conteos e ids; ningún nombre, teléfono, correo ni
dirección.

## Cómo se borró

- **Respaldo previo:** los 153 registros completos se exportaron a un JSON en
  `backend/.tmp/`, carpeta ignorada por git. No se sube porque contiene los
  datos tal cual.
- **Una sola transacción:** si cualquier paso fallaba o borraba una cantidad
  distinta a la esperada, se revertía todo.
- **Orden de borrado** (de las hojas hacia la raíz, porque ninguna relación
  tiene borrado en cascada): CotizacionItem → Cotizacion → Pago → Avance →
  HistorialEstado → MovimientoInventario → OrdenServicio → Equipo → Cliente →
  Repuesto.

## Nota sobre MS-2026-00019

La orden **MS-2026-00019** (cliente con prefijo `SR-`) se usó en Shift Right
(duración del pago) y en la sesión exploratoria (EXP-02 y EXP-06). Se
borró con los demás datos de prueba, pero su evidencia sigue en las capturas y
los logs de [`12_ISO25010.xlsx`](../12_ISO25010.xlsx),
[`capturas/exploratorias/`](../capturas/exploratorias/) y
[`13_Shift_Right_Logs/`](../13_Shift_Right_Logs/).

## Cómo correr el script

Desde `backend/`, se compila primero (igual que el seed: `ts-node` no resuelve
los imports `.js` del cliente generado de Prisma):

```bash
npx --no-install tsc -p tsconfig.json --outDir .tmp/limpieza --incremental false --sourceMap false
```

| Qué | Comando |
|---|---|
| Simulación (por defecto, no borra) | `node .tmp/limpieza/scripts/limpiar-datos-prueba.js` |
| Simulación + respaldo JSON en `backend/.tmp/` | `node .tmp/limpieza/scripts/limpiar-datos-prueba.js --respaldo` |
| Borrado real (respaldo + una transacción) | `node .tmp/limpieza/scripts/limpiar-datos-prueba.js --ejecutar` |

La conexión se lee de `backend/.env` y nunca se imprime.
