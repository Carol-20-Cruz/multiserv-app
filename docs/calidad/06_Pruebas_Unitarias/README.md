# 06 · Pruebas unitarias (backend, Jest)

Una **prueba unitaria** revisa una sola pieza del programa, aislada del resto. Es como probar un bombillo en un probador antes de instalarlo en la casa: si no prende, el problema es el bombillo, no los cables.

En MultiServ esas piezas son las **reglas del negocio**, que viven en las carpetas `reglas/` del backend. Son **funciones puras**: reciben datos y devuelven un resultado, sin base de datos, sin internet y sin leer el reloj (la hora llega como parámetro). Por eso cada prueba tarda alrededor de 1 milisegundo y siempre da el mismo resultado.

- **Código de las reglas:** [`backend/src/auth/reglas/`](../../../backend/src/auth/reglas/), [`backend/src/clientes/reglas/`](../../../backend/src/clientes/reglas/), [`backend/src/inventario/reglas/`](../../../backend/src/inventario/reglas/), [`backend/src/ordenes/reglas/`](../../../backend/src/ordenes/reglas/)
- **Pruebas:** el archivo `*.spec.ts` al lado de cada regla.
- **Configuración:** [`backend/jest.config.ts`](../../../backend/jest.config.ts)
- **Salida completa de la corrida:** [`resultado-jest.txt`](resultado-jest.txt)

## Cómo se lee una prueba: Arrange · Act · Assert

Todas siguen el mismo patrón de tres pasos, como una receta:

| Paso | Qué significa | En la receta |
|---|---|---|
| `// Arrange` (preparar) | Se arman los datos de entrada | Alistar los ingredientes |
| `// Act` (actuar) | Se llama **una vez** a la función que se prueba | Cocinar |
| `// Assert` (verificar) | Se compara el resultado con lo esperado usando `expect(...)` | Probar si quedó bien |

Si `expect` no se cumple, Jest marca la prueba en rojo y dice qué esperaba y qué recibió.

## Pruebas escogidas y trazabilidad con los SWR

Se escogieron 11 de las 360 pruebas del backend, una o dos por cada regla del negocio. La mayoría son de **valor límite**, porque es ahí donde se esconden los errores: la diferencia entre `>` y `>=` solo se nota justo en el borde.

| ID | Archivo → nombre del test | Regla / SWR | Tipo |
|---|---|---|---|
| UT-01 | `auth/reglas/bloqueo.spec.ts` → «5º intento fallido: bloquea exactamente 10 minutos» | Bloqueo de cuenta · SWR-AUTH-004 | Límite |
| UT-02 | `auth/reglas/bloqueo.spec.ts` → «4 intentos fallidos (frontera): no bloquea la cuenta» | Bloqueo de cuenta · SWR-AUTH-004 | Límite |
| UT-03 | `clientes/reglas/telefono.spec.ts` → «10 dígitos: válido» | Teléfono · SWR-CLI-003 | Normal |
| UT-04 | `clientes/reglas/telefono.spec.ts` → «con letras (10 caracteres): inválido por caracteres» | Teléfono · SWR-CLI-003, AJ-08 | Inválido |
| UT-05 | `ordenes/reglas/abono.spec.ts` → «180001 al 50 %: 90001 (nunca menos del 50 %)» | Abono mínimo · SWR-CON-003, AJ-10 | Límite |
| UT-06 | `ordenes/reglas/saldo.spec.ts` → «valor = saldo + 1 (125001): SUPERA_SALDO» | Saldo y pagos · SWR-PAY-004 | Límite |
| UT-07 | `ordenes/reglas/estados.spec.ts` → «RECIBIDO -> EN_REPARACION: SALTO con el siguiente en el mensaje» | Estados · SWR-ORD-011, AJ-07 | Inválido |
| UT-08 | `ordenes/reglas/cotizacion.spec.ts` → «EN_DIAGNOSTICO con 1 pago: TIENE_PAGOS» | Cotización · SWR-PAY-004 (AJ-09) | Inválido (límite: 1 pago) |
| UT-09 | `inventario/reglas/stock.spec.ts` → «5 con mínimo 5: stock bajo» | Stock · SWR-INV-009 | Límite |
| UT-10 | `ordenes/reglas/numero-orden.spec.ts` → «2027-01-01T04:59:59Z: todavía es 2026 en Colombia» | Número de orden · SWR-ORD-002, AJ-06 | Límite |
| UT-11 | `ordenes/reglas/saldo.spec.ts` → «0 días: vence al final del día de la entrega» | Garantía · SWR-ENT-003 | Límite |

## El código de cada prueba

> **Nota:** UT-05 y UT-08 no tenían el comentario `// Arrange` porque sus datos van directo en la llamada. Se agregó en el archivo, **solo como comentario** (commit `test(backend): agrega el comentario Arrange…`); la suite siguió en 359/359. UT-06, UT-07 y UT-11 tampoco lo tienen: aquí se muestran **anotados para el documento** (las líneas marcadas «anotado»), y el archivo original no cambia.

### UT-01 · 5º intento fallido: bloquea exactamente 10 minutos

**Qué prueba:** si la cuenta ya tenía 4 fallos y llega uno más, se bloquea por 10 minutos. Es el borde de arriba: el 5 es justo el número que bloquea.

```ts
// SWR-AUTH-004: en el 5º intento fallido consecutivo se bloquea 10 minutos.
it('5º intento fallido: bloquea exactamente 10 minutos', () => {
  // Arrange
  const estado = { intentosFallidos: 4, bloqueadoHasta: null };

  // Act
  const resultado = registrarIntentoFallido(estado, AHORA);

  // Assert
  expect(MAX_INTENTOS).toBe(5);
  expect(MINUTOS_BLOQUEO).toBe(10);
  expect(resultado.intentosFallidos).toBe(5);
  expect(resultado.seBloqueo).toBe(true);
  expect(resultado.bloqueadoHasta).toEqual(
    new Date(AHORA.getTime() + minutos(10)),
  );
  expect(calcularBloqueadoHasta(AHORA)).toEqual(resultado.bloqueadoHasta);
});
```

`AHORA` es una fecha fija (`2026-11-08T15:00:00Z`) declarada arriba en el archivo. Así la prueba no depende de la hora real del computador.

### UT-02 · 4 intentos fallidos: no bloquea la cuenta

**Qué prueba:** el borde de abajo. Con 3 fallos previos más uno quedan 4, y la cuenta **no** se bloquea. UT-01 y UT-02 juntas detectan si alguien cambia `>=` por `>` (bloquearía en el 6º) o pone un 4 (bloquearía antes de tiempo).

```ts
it('4 intentos fallidos (frontera): no bloquea la cuenta', () => {
  // Arrange
  const estado = { intentosFallidos: 3, bloqueadoHasta: null };

  // Act
  const resultado = registrarIntentoFallido(estado, AHORA);

  // Assert
  expect(resultado.intentosFallidos).toBe(4);
  expect(resultado.seBloqueo).toBe(false);
  expect(resultado.bloqueadoHasta).toBeNull();
  expect(debeBloquear(4)).toBe(false);
});
```

### UT-03 · 10 dígitos: válido

**Qué prueba:** el caso correcto. Un celular colombiano de 10 dígitos pasa, y se devuelve tal cual para guardarlo.

```ts
// SWR-CLI-003: exactamente 10 dígitos es válido.
it('10 dígitos: válido', () => {
  // Arrange
  const telefono = '3001234567';

  // Act
  const resultado = validarTelefono(telefono);

  // Assert
  expect(LONGITUD_TELEFONO).toBe(10);
  expect(resultado).toEqual({ valido: true, telefono: '3001234567' });
});
```

### UT-04 · Con letras (10 caracteres): inválido por caracteres

**Qué prueba:** un dato con trampa. Tiene **10 caracteres**, así que si la regla solo contara el largo lo dejaría pasar. La prueba confirma que el motivo es «caracteres» y que el mensaje es el que ve el usuario.

```ts
// SWR-CLI-003: con letras es inválido aunque tenga 10 caracteres.
it('con letras (10 caracteres): inválido por caracteres', () => {
  // Arrange
  const telefono = '300abc4567';

  // Act
  const resultado = validarTelefono(telefono);

  // Assert
  expect(resultado).toEqual({
    valido: false,
    motivo: 'CARACTERES_INVALIDOS',
    mensaje: MENSAJES_TELEFONO.CARACTERES_INVALIDOS,
  });
});
```

### UT-05 · 180001 al 50 %: 90001

**Qué prueba:** la mitad de 180.001 es 90.000,5, pero los pesos no tienen decimales. La regla **redondea hacia arriba** para que el taller nunca reciba menos del 50 %. Si se redondeara hacia abajo daría 90.000 y esta prueba fallaría.

```ts
// SWR-CON-003 (frontera): un valor impar redondea hacia arriba.
it('180001 al 50 %: 90001 (nunca menos del 50 %)', () => {
  // Arrange: valor cotizado 180001 (impar) y porcentaje 50; van
  // directo en la llamada porque son solo dos números.

  // Act
  const abono = abonoMinimo(180001, 50);

  // Assert
  expect(abono).toBe(90001);
});
```

### UT-06 · Valor = saldo + 1: SUPERA_SALDO

**Qué prueba:** una orden cotizada en $ 250.000 con un pago de $ 125.000 tiene saldo $ 125.000. Pagar $ 125.001 (un peso de más) se rechaza. La prueba hermana «valor = saldo (125000): válido» confirma que pagar **exactamente** el saldo sí se permite.

```ts
it('valor = saldo + 1 (125001): SUPERA_SALDO', () => {
  // Arrange (anotado): orden() arma una orden EN_DIAGNOSTICO cotizada en
  // 250000; con un pago de 125000 el saldo queda en 125000.

  // Act
  const resultado = validarPago(125001, orden({ pagos: [125000] }));

  // Assert
  expect(resultado).toEqual({
    valido: false,
    motivo: 'SUPERA_SALDO',
    mensaje: MENSAJES_PAGO.SUPERA_SALDO,
  });
});
```

### UT-07 · RECIBIDO → EN_REPARACION: SALTO

**Qué prueba:** los estados van en fila, como los pisos de un edificio por las escaleras: no se puede ir del piso 1 al 3 sin pasar por el 2. Además, el mensaje dice **cuál es el paso correcto**.

```ts
// Camino 5 (SWR-ORD-011): saltarse un estado; el mensaje dice cuál sigue.
it('RECIBIDO -> EN_REPARACION: SALTO con el siguiente en el mensaje', () => {
  // Arrange (anotado): CTX_COMPLETO (arriba en el archivo) trae cotización
  // y abono completos, para que lo único que falle sea el salto.

  // Act
  const resultado = evaluarTransicion(RECIBIDO, EN_REPARACION, CTX_COMPLETO);

  // Assert
  expect(resultado).toEqual({
    permitido: false,
    motivo: 'SALTO',
    mensaje: 'Los estados van en orden: el siguiente es «En diagnóstico»',
  });
});
```

### UT-08 · EN_DIAGNOSTICO con 1 pago: TIENE_PAGOS

**Qué prueba:** la cotización se puede corregir mientras no haya pagos. Con **un solo** pago el valor queda fijo, porque ya hay plata recibida sobre ese precio. Con 0 pagos sí se permite (prueba hermana «EN_DIAGNOSTICO con 0 pagos: permitido»).

```ts
// UT-08 · SWR-PAY-004 (ajuste AJ-09)
// Camino 3 (frontera): con 1 pago el valor queda fijo (respuesta de la dueña).
it('EN_DIAGNOSTICO con 1 pago: TIENE_PAGOS', () => {
  // Arrange: orden EN_DIAGNOSTICO con 1 pago registrado; van directo
  // en la llamada (estado y cantidad de pagos).

  // Act
  const resultado = evaluarCotizacion(EstadoOrden.EN_DIAGNOSTICO, 1);

  // Assert
  expect(resultado).toEqual({
    permitido: false,
    motivo: 'TIENE_PAGOS',
    mensaje: MENSAJES_COTIZACION.TIENE_PAGOS,
  });
});
```

### UT-09 · 5 con mínimo 5: stock bajo

**Qué prueba:** la dueña dijo que un repuesto está «bajo» cuando **llega** al mínimo, no solo cuando baja de él. Por eso 5 de 5 ya es bajo (la regla usa `<=`). Las hermanas «4 con mínimo 5» (bajo) y «6 con mínimo 5» (normal) cierran el borde.

```ts
// SWR-INV-009 (frontera): igual al mínimo ("llega al mínimo") -> bajo.
it('5 con mínimo 5: stock bajo', () => {
  // Arrange
  const cantidad = 5;
  const minimo = 5;

  // Act
  const bajo = esStockBajo(cantidad, minimo);

  // Assert
  expect(bajo).toBe(true);
});
```

### UT-10 · 2027-01-01T04:59:59Z: todavía es 2026 en Colombia

**Qué prueba:** el número de orden lleva el año (`MS-2026-00001`) y el consecutivo vuelve a 1 cada año. El servidor guarda la hora en UTC, que va 5 horas adelante de Colombia. Las 04:59:59 UTC del 1 de enero son las **11:59:59 p. m. del 31 de diciembre** en Colombia, así que el año todavía es 2026. La prueba hermana con 05:00:00 UTC confirma que ahí ya es 2027.

```ts
// AJ-06 (frontera): 31/12/2026 11:59 p. m. en Colombia = 04:59 UTC del 1/1.
it('2027-01-01T04:59:59Z: todavía es 2026 en Colombia', () => {
  // Arrange
  const fecha = new Date('2027-01-01T04:59:59Z');

  // Act
  const anio = anioColombia(fecha);

  // Assert
  expect(anio).toBe(2026);
});
```

### UT-11 · 0 días: vence al final del día de la entrega

**Qué prueba:** el borde inferior de la garantía. Con 0 días, la garantía dura hasta las 11:59:59 p. m. (hora Colombia) del mismo día de la entrega. En UTC eso es `04:59:59.999` del día siguiente.

```ts
// UT-11 · SWR-ENT-003
// Frontera: 0 días -> vence al final del mismo día de la entrega.
it('0 días: vence al final del día de la entrega', () => {
  // Arrange (anotado): entrega el 10/11/2026 a las 3:00 p. m. de Colombia
  // (20:00 UTC) con 0 días de garantía; van directo en la llamada.

  // Act
  const vence = vencimientoGarantia(new Date('2026-11-10T20:00:00Z'), 0);

  // Assert
  expect(vence.toISOString()).toBe('2026-11-11T04:59:59.999Z');
});
```

## Resultado de la ejecución (16-nov-2026, local, Windows)

| Dato | Valor |
|---|---|
| Archivos de prueba (suites) | **20/20 PASS** |
| Pruebas | **360/360 PASS** (0 fallidas, 0 omitidas) |
| Tiempo total | **7,7 s** (una sola hebra, `--runInBand`) |
| Las 11 pruebas escogidas | **11/11 PASS**, cada una entre 0 y 1 ms |

La salida completa, con el nombre de cada prueba, está en [`resultado-jest.txt`](resultado-jest.txt). Las rutas del computador aparecen como `<repo>`.

Las 360 pruebas incluyen, además de las reglas, los servicios con la base de datos simulada (`*.service.spec.ts`), los DTO y el guard de roles. También corren en GitHub Actions en cada PR.

## Cómo correrlas

Todo desde la carpeta `backend/`:

| Qué | Comando |
|---|---|
| Toda la suite | `npm test` |
| Toda la suite mostrando el nombre de cada prueba | `npm test -- --runInBand --verbose --reporters=default` |

### Cómo correr una prueba al azar en la sustentación

**Una sola prueba, por su nombre.** Se le pasa el archivo y, con `-t`, un pedazo del nombre del test:

```bash
npm test -- src/auth/reglas/bloqueo.spec.ts -t "5º intento fallido"
```

Resultado esperado: `Tests: 6 skipped, 1 passed, 7 total`. Corre solo esa y salta las otras 6 del archivo. Si se omite el archivo (`npm test -- -t "5º intento fallido"`) también funciona, pero tarda más porque abre los 20 archivos para buscarla.

**Un archivo completo:**

```bash
npm test -- src/clientes/reglas/telefono.spec.ts
```

Resultado esperado: `Tests: 19 passed, 19 total`.

Para cualquier otra prueba de la tabla, se cambia la ruta y el texto entre comillas. Por ejemplo: `npm test -- src/ordenes/reglas/saldo.spec.ts -t "saldo \+ 1"`. El `\` va delante del `+` porque `-t` interpreta el texto como expresión regular, y ahí `+` tiene otro significado.

Los dos comandos se probaron en PowerShell y en Git Bash.

## Decisiones de calidad

- **Funciones puras:** las reglas no tocan la base ni el reloj, así que se prueban sin montar NestJS ni Supabase. Por eso 360 pruebas corren en segundos.
- **Valores límite:** casi todas las reglas tienen el trío «uno antes, justo en el borde, uno después» (4/5 intentos, 9/10/11 dígitos, saldo/saldo + 1, 4/5/6 unidades).
- **Una sola acción por prueba:** el `// Act` llama una vez a la función. Si una prueba falla, el nombre dice exactamente qué caso se rompió.
- **Sin datos reales:** nombres, teléfonos y montos son inventados. Ninguna prueba lee el `.env`.
