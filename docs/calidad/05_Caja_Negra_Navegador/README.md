# 05 · Pruebas de caja negra desde el navegador

14 casos (CN-01 a CN-14) que se ejecutan **solo desde el navegador**, sin
mirar el código, aplicando tres técnicas formales:

- **Partición de equivalencia:** clases válidas e inválidas de un dato
  (por ejemplo, teléfono con letras o un rol sin permiso).
- **Valores límite:** el borde exacto y un paso por fuera (9 y 11 dígitos,
  abono mínimo − 1 y mínimo exacto, saldo + 1…).
- **Transición de estados:** cambios de estado permitidos y bloqueados
  (cuenta activa → bloqueada, orden lista → entregada…).

## Resultado de la ejecución (15-nov-2026)

| ID | Resultado | Evidencia |
|---|---|---|
| CN-01 | Pasa | `CN-01.png` |
| CN-02 | Pasa | `CN-02a.png`, `CN-02b.png` |
| CN-03 | Pasa | `CN-03.png` |
| CN-04 | Pasa | `CN-04.png` |
| CN-05 | Pasa | `CN-05.png` |
| CN-06 | Pasa | `CN-06.png` |
| CN-07 | Pasa | `CN-07.png` |
| CN-08 | Pasa | `CN-08.png` |
| CN-09 | Pasa | `CN-09a.png`, `CN-09b.png` |
| CN-10 | Pasa | `CN-10.png` |
| CN-11 | Pasa | `CN-11b.png` (ver nota) |
| CN-12 | Pasa | `CN-12a.png`, `CN-12b.png` |
| CN-13 | Pasa | `CN-13a.png`, `CN-13b.png`, `CN-13c.png` |
| CN-14 | Pasa | `CN-14a.png`, `CN-14b.png` |
| **Total** | **14/14 Pasa** | |

El detalle de cada caso (resultado obtenido con el mensaje tal cual, fecha y
quién lo ejecutó) está en la hoja Casos del Excel.

Notas de la ejecución:

- **Defecto D12 encontrado durante la ejecución.** Con más de 10 clientes
  aparece la paginación y `/clientes` caía con un error de servidor. Se
  corrigió en la rama `fix/paginacion` (PR mergeado a `develop`) y el
  re-test fue correcto. Evidencias en
  `docs/calidad/capturas/defectos/defecto-12-*`.
- **CN-07 se repitió con un teléfono nuevo (3205550303).** El primero ya
  existía en un cliente desactivado: era un dato de prueba contaminado, no
  un defecto.
- **CN-09 se repitió en una orden nueva (17)** por un error de ejecución: el
  pago se registró dos veces en la orden 16.
- **CN-11:** el estado bloqueado (entrega con saldo pendiente) no tiene
  captura en esta ejecución; está cubierto por E2E-02 (Playwright) y
  API-10 SALDO_PENDIENTE (Postman).

## Archivos

| Archivo | Contenido |
|---|---|
| `05_Caja_Negra.xlsx`, hoja **Casos** | Los 14 casos con precondición, datos, pasos y resultado esperado. Las columnas «Resultado obtenido», «Estado (Pasa/Falla)», «Evidencia», «Fecha de ejecución» y «Ejecutado por» van vacías para llenarlas. |
| `05_Caja_Negra.xlsx`, hoja **Resumen** | Fórmulas `CONTAR.SI` que cuentan Pasa, Falla y Pendientes, y los casos por técnica. |
| `capturas/` | Evidencias de la ejecución. |

## Casos

| ID | Módulo | SWR | Técnica | Resultado esperado |
|---|---|---|---|---|
| CN-01 | Autenticación | SWR-AUTH-001 | Partición | «Credenciales inválidas» y no entra. |
| CN-02 | Autenticación | SWR-AUTH-004 | Límite + transición | Intentos 1-4: «Credenciales inválidas». Intento 5, y el 6 aun con la contraseña correcta: «Cuenta bloqueada temporalmente. Intente más tarde.» (10 minutos). |
| CN-03 | Clientes | SWR-CLI-001 / 003 | Límite (9 dígitos) | «El teléfono debe tener exactamente 10 dígitos». |
| CN-04 | Clientes | SWR-CLI-003 | Límite (11 dígitos) | «El teléfono debe tener exactamente 10 dígitos». |
| CN-05 | Clientes | SWR-CLI-003 | Partición (letras) | «El teléfono solo puede tener números». |
| CN-06 | Clientes | SWR-CLI-004 / AJ-04 | Partición (duplicado) | «Este teléfono ya está registrado», con el cliente existente y el enlace a su ficha. |
| CN-07 | Clientes | SWR-CLI-003 (defecto 6) | Partición | «El teléfono alterno debe ser diferente al principal». |
| CN-08 | Clientes (búsqueda) | Defecto 7 | Partición | Buscar «jose nunez» encuentra a «CN-José Ñúñez Peña». |
| CN-09 | Órdenes / Pagos | SWR-ORD-011 / AJ-10 | Límite + transición | Con $ 90.000 de abono: botón deshabilitado y «Falta el abono mínimo para pasar a reparación (mínimo $ 90.001; pagado $ 90.000).». Con $ 90.001: pasa a «En reparación». |
| CN-10 | Pagos | SWR-PAY-004 | Límite (saldo + 1) | «El pago no puede superar el saldo pendiente ($ 90.000)». |
| CN-11 | Entrega | SWR-ENT-003 | Transición | «Entregar equipo» deshabilitado y «Saldo pendiente $ 90.000: no se puede entregar». Con saldo $ 0: se entrega. |
| CN-12 | Permisos | SWR-AUTH-008 / AJ-03 | Partición (rol) | El Técnico no ve «Inventario» y /inventario lo devuelve a Inicio. |
| CN-13 | Órdenes (cotización) | SWR-CON-003 / AJ-09 | Límite (0, tope, tope + 1) | 0: «El valor cotizado debe ser mayor que 0». 1.000.000.000: «El valor cotizado no puede superar $ 999.999.999». 999.999.999: se guarda. |
| CN-14 | Inventario | SWR-INV-009 | Límite + transición | Cantidad = mínimo: «Stock bajo». Mínimo + 1: la etiqueta desaparece. |

Los pasos completos y los datos de entrada, todos ficticios con prefijo
`CN-` y teléfonos que empiezan por 3, están en el Excel.

## Precondiciones

- Backend en `:3001` y frontend en `http://localhost:3000`, encendidos.
- Usuarios `dueno@multiserv.test` y `tecnico@multiserv.test`. Las
  contraseñas están en `backend/.env`, que no se copia a ningún documento.
- Abono configurado en el 50 %, redondeado hacia arriba: con una cotización
  de $ 180.001, el abono mínimo es $ 90.001.

## Orden de ejecución

El orden permite reutilizar los datos de un caso en el siguiente:

1. **CN-01** con el Dueño. Al final, entrar con la contraseña correcta.
2. **CN-03, CN-04, CN-05, CN-07** en Nuevo cliente. No se guarda nada.
3. **CN-08**: crea el cliente base. Luego **CN-06**, que reutiliza su teléfono.
4. **Preparación de la orden:**
   1. En la ficha de CN-José Ñúñez Peña, usar «Agregar equipo» (Lavadora,
      marca `CN-Marca`).
   2. Crear una «Nueva orden» en Taller con la falla `CN-No centrifuga`.
   3. Hacer «Pasar a «En diagnóstico»».
5. **CN-13 → CN-09 → CN-10 → CN-11**, todos sobre la misma orden.
6. **CN-14** con el Dueño.
7. Cerrar sesión y hacer **CN-12** con el Técnico. El inicio de sesión
   correcto deja su contador de intentos en 0.
8. **CN-02 de último.** Deja al Técnico **bloqueado 10 minutos**. Pasado ese
   tiempo puede volver a entrar.

## Capturas

Guardar en `capturas/` con el ID del caso:
`CN-01.png`, `CN-02.png`, … `CN-14.png`.

Donde hay un antes y un después, usar dos capturas:

- `CN-02a.png` (5.º intento) y `CN-02b.png` (6.º intento con la contraseña
  correcta)
- `CN-09a.png` (abono de $ 90.000, botón deshabilitado) y `CN-09b.png`
  (orden en reparación)
- `CN-11b.png` (entregada)
- `CN-13a.png` (0), `CN-13b.png` (tope + 1) y `CN-13c.png` (tope guardado)
- `CN-14a.png` (Stock bajo) y `CN-14b.png` (sin la etiqueta)

En la columna «Evidencia» del Excel se escribe el nombre del archivo.

## Cómo registrar los resultados

En la hoja Casos, por cada caso:

- **Resultado obtenido:** lo que mostró la pantalla, con el mensaje tal cual.
- **Estado:** «Pasa» o «Falla», elegido de la lista.
- **Evidencia:** el nombre de la captura.
- **Fecha de ejecución** y **Ejecutado por**.

La hoja Resumen se actualiza sola. Un caso que combina dos técnicas cuenta
en las dos.
