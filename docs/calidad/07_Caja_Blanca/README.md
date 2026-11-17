# 07 · Pruebas de caja blanca (backend)

En la **caja negra** (carpeta 05) se prueba sin mirar el código: solo se ve qué entra y qué sale. En la **caja blanca** se abre la caja y se lee el código para encontrar cada **decisión** (`if`, `&&`, `>=`…) y cada **camino** que puede tomar la ejecución.

Una analogía: el código es un mapa de carreteras y cada `if` es un cruce. La caja blanca busca que las pruebas pasen **por cada desvío al menos una vez**, no solo por la autopista principal. La **cobertura** es como pasar un resaltador por las calles que ya se recorrieron: lo que queda sin pintar es lo que ninguna prueba visitó.

Se analizan 3 bloques del backend. Los tres son funciones puras, ya están probados con Jest y cada camino lleva un comentario `// Camino N` en el código.

| Bloque | Archivo | Función |
|---|---|---|
| 1 · Bloqueo de cuenta | [`backend/src/auth/reglas/bloqueo.ts`](../../../backend/src/auth/reglas/bloqueo.ts) | `estaBloqueada` (bloqueo.ts:18), `registrarIntentoFallido` (bloqueo.ts:37) |
| 2 · Teléfono | [`backend/src/clientes/reglas/telefono.ts`](../../../backend/src/clientes/reglas/telefono.ts) | `validarTelefono` (telefono.ts:29) (y `alternoIgualAlPrincipal`, telefono.ts:57) |
| 3 · Cambio de estado de la orden | [`backend/src/ordenes/reglas/estados.ts`](../../../backend/src/ordenes/reglas/estados.ts) | `evaluarTransicion` (estados.ts:94) |

**Salida de la cobertura:** [`cobertura-reglas.txt`](cobertura-reglas.txt)

## Cobertura que respalda el análisis (15-nov-2026)

Comando, desde `backend/`:

```bash
npm run test:cov -- --collectCoverageFrom='src/**/reglas/*.ts' --collectCoverageFrom='!src/**/*.spec.ts' --coverageReporters=text
```

| Archivo | % Instrucciones | % Ramas | % Funciones | % Líneas | Líneas sin cubrir |
|---|---|---|---|---|---|
| `auth/reglas/bloqueo.ts` | 100 | **100** | 100 | 100 | — |
| `clientes/reglas/telefono.ts` | 100 | **100** | 100 | 100 | — |
| `ordenes/reglas/estados.ts` | 100 | **96,15** | 100 | 100 | 91 |
| Todas las reglas (9 archivos) | 100 | 99,44 | 100 | 100 | — |

Resultado de esa corrida: 20 suites y **359/359 PASS**.

**Ojo: 100 % de ramas no significa «todo probado».** Jest (con su herramienta de cobertura, Istanbul) cuenta una condición `a && b` como cubierta cuando **se evaluaron** las dos partes, sin importar si cada una dio verdadero y falso. En el bloque 1 se ve un ejemplo: la cobertura dice 100 % y aun así hay un camino que ninguna prueba recorre. La cobertura es una ayuda, pero no reemplaza leer el código.

---

## Bloque 1 · Bloqueo de cuenta (SWR-AUTH-004, AJ-02)

```ts
export function estaBloqueada(bloqueadoHasta: Date | null, ahora: Date): boolean {
  return bloqueadoHasta !== null && bloqueadoHasta.getTime() > ahora.getTime();
}

export function debeBloquear(intentosFallidos: number): boolean {
  return intentosFallidos >= MAX_INTENTOS;            // MAX_INTENTOS = 5
}

export function registrarIntentoFallido(estado, ahora) {
  const bloqueoVencido =
    estado.bloqueadoHasta !== null && !estaBloqueada(estado.bloqueadoHasta, ahora);
  const previos = bloqueoVencido ? 0 : estado.intentosFallidos;
  const intentosFallidos = previos + 1;

  if (debeBloquear(intentosFallidos)) {
    return { intentosFallidos, bloqueadoHasta: ahora + 10 min, seBloqueo: true };
  }
  return { intentosFallidos, bloqueadoHasta: null, seBloqueo: false };
}
```

(Se resumió `calcularBloqueadoHasta` como «ahora + 10 min».)

**1. ¿Qué decisión o condición contiene?**
Tres decisiones:
- **D1**, en `estaBloqueada`: ¿hay fecha de bloqueo **y** esa fecha todavía no llega?
- **D2**: ¿el bloqueo anterior ya venció? Si venció, el conteo empieza en 0.
- **D3**, en `debeBloquear`: ¿con este fallo se llega a 5 o más (`>= 5`)?

**2. ¿Cuáles son sus ramas o caminos?**
- En `estaBloqueada`: **A** sin fecha → no bloqueada · **B** fecha en el futuro → bloqueada · **C** fecha ya pasada o igual a ahora → no bloqueada.
- En `registrarIntentoFallido`: **1** sin bloqueo previo y quedan menos de 5 → suma 1, no bloquea · **2** sin bloqueo previo y llega a 5 → bloquea 10 min · **3** bloqueo vencido → reinicia y cuenta 1 · **4** bloqueo todavía vigente → sigue sumando (5 → 6) y vuelve a bloquear.

**3. ¿Qué datos ejecutan cada camino?** Están en la tabla de abajo.

**4. ¿Cuál es el valor límite?**
- **4 contra 5 intentos:** con 4 no bloquea y con 5 sí.
- **El instante exacto en que vence:** con `bloqueadoHasta = ahora` ya **no** está bloqueada, porque se usa `>` y no `>=`. Y 1 minuto antes de vencer sigue bloqueada.

**5. ¿Qué prueba cubre cada rama?** Todas están en `auth/reglas/bloqueo.spec.ts`. `AHORA` es la fecha fija `2026-11-08T15:00:00Z`.

| Camino | Entrada | Esperado | Test que lo cubre |
|---|---|---|---|
| A · sin bloqueo | `estaBloqueada(null, AHORA)` | `false` | «cuenta no bloqueada: bloqueadoHasta null no está bloqueada» |
| B · bloqueo vigente | `bloqueadoHasta = AHORA + 1 min` | `true` | «bloqueo vigente: falta 1 minuto, sigue bloqueada» |
| C · vence justo ahora (límite) | `bloqueadoHasta = AHORA` | `false` | «bloqueo que vence exactamente ahora: ya no está bloqueada» |
| C · ya venció | `bloqueadoHasta = AHORA − 1 ms` | `false` | «bloqueo vencido: ya no está bloqueada y el conteo reinicia» |
| 1 · fallo sin bloquear (límite) | `{ intentos: 3, bloqueadoHasta: null }` | 4 intentos, `seBloqueo: false` | «4 intentos fallidos (frontera): no bloquea la cuenta» (**UT-02**) |
| 1 · primer fallo tras login correcto | estado reiniciado `{ 0, null }` | 1 intento | «login correcto: reinicia el contador y quita el bloqueo» |
| 2 · 5º fallo (límite) | `{ intentos: 4, bloqueadoHasta: null }` | 5 intentos, bloqueado hasta AHORA + 10 min | «5º intento fallido: bloquea exactamente 10 minutos» (**UT-01**) |
| 3 · bloqueo vencido | `{ intentos: 5, bloqueadoHasta: AHORA − 1 ms }` | vuelve a 1, sin bloqueo | «bloqueo vencido: ya no está bloqueada y el conteo reinicia» |
| 4 · fallo con bloqueo vigente | `{ intentos: 5, bloqueadoHasta: AHORA + 5 min }` | 6 intentos y nuevo bloqueo | **Ninguno** |

**6. ¿Qué camino sigue sin cubrir?**
El **camino 4**: llamar a `registrarIntentoFallido` mientras el bloqueo sigue vigente. La cobertura marca 100 % porque la condición `&&` de D2 sí se evaluó completa (en el caso del bloqueo vencido), aunque nunca con un bloqueo vigente.
En la aplicación real ese camino **no se alcanza**: `auth.service.ts` pregunta primero `estaBloqueada(...)` y, si está bloqueada, responde 423 sin revisar la contraseña ni llamar a esta función. Por eso no es un riesgo hoy, pero si alguien cambiara el orden en el servicio, ninguna prueba unitaria de la regla lo avisaría.

**7. ¿Qué defecto podría quedar oculto si solo se probara el caso correcto?**
Si solo se probara «contraseña correcta → entra»:
- Que alguien cambie `>= 5` por `> 5`: la cuenta se bloquearía en el **6º** intento. Solo UT-01 (5 bloquea) lo detecta.
- Que se olvide reiniciar el conteo después de que el bloqueo vence: el usuario que vuelve a los 10 minutos y se equivoca **una vez** quedaría bloqueado otra vez de inmediato (5 + 1 = 6 ≥ 5). Lo detecta «bloqueo vencido… el conteo reinicia».
- Que `estaBloqueada` use `>=`: la cuenta seguiría bloqueada justo en el instante en que debía liberarse. Lo detecta «vence exactamente ahora».

---

## Bloque 2 · Teléfono del cliente (SWR-CLI-003, AJ-08)

```ts
export function validarTelefono(valor: unknown): ResultadoTelefono {
  // Camino 1: no llegó texto o solo trae espacios/guiones.
  const limpio = typeof valor === 'string' ? normalizarTelefono(valor) : '';
  if (limpio === '') return invalido('VACIO');

  // Camino 2: quedan caracteres que no son dígitos (letras, +, puntos...).
  if (!/^\d+$/.test(limpio)) return invalido('CARACTERES_INVALIDOS');

  // Camino 3: dígitos de más o de menos.
  if (limpio.length !== LONGITUD_TELEFONO) return invalido('LONGITUD');   // 10

  // Camino 4: válido; se devuelve ya normalizado para guardarlo así.
  return { valido: true, telefono: limpio };
}
```

`normalizarTelefono` quita espacios (incluido el tabulador) y guiones. Así `300 123 4567` y `300-123-4567` quedan como `3001234567`.

**1. ¿Qué decisión o condición contiene?**
Cuatro preguntas en fila, como un filtro de tres coladores:
- ¿Es texto? Si no, se trata como vacío.
- ¿Quedó vacío después de limpiar?
- ¿Tiene algo que no sea un dígito?
- ¿Tiene exactamente 10 dígitos?

El orden importa: `300abc4567` tiene 10 caracteres, pero cae en el colador de «caracteres» antes de llegar al del largo.

**2. ¿Cuáles son sus ramas o caminos?**
- **1a** no es texto → VACIO
- **1b** texto que queda vacío al limpiarlo → VACIO
- **2** tiene caracteres que no son dígitos → CARACTERES_INVALIDOS
- **3** largo distinto de 10 → LONGITUD
- **4** válido

**3. ¿Qué datos ejecutan cada camino?** Están en la tabla de abajo.

**4. ¿Cuál es el valor límite?**
**9, 10 y 11 dígitos.** El 10 es el único válido. También se prueba el límite «disfrazado»: `300 123 456` parece un número completo, pero al quitar los espacios quedan 9 dígitos.

**5. ¿Qué prueba cubre cada rama?** Todas están en `clientes/reglas/telefono.spec.ts`.

| Camino | Entrada | Esperado | Test que lo cubre |
|---|---|---|---|
| 1a · no es texto | `undefined` | `VACIO` | «camino 1a: valor no texto (undefined) → VACIO» |
| 1b · vacío al limpiar | `'  - -  '` | `VACIO`, «El teléfono es obligatorio» | «camino 1b: solo espacios y guiones → VACIO» |
| 2 · letras | `'300abc4567'` | `CARACTERES_INVALIDOS` | «con letras (10 caracteres): inválido por caracteres» (**UT-04**) |
| 2 · prefijo y puntos | `'+57 300 123 4567'`, `'300.123.4567'` | `CARACTERES_INVALIDOS` | «camino 2: con +57 o puntos → CARACTERES_INVALIDOS» |
| 3 · 9 dígitos (límite) | `'300123456'` | `LONGITUD` | «9 dígitos: inválido por longitud» |
| 3 · 11 dígitos (límite) | `'30012345678'` | `LONGITUD` | «11 dígitos: inválido por longitud» |
| 3 · 9 dígitos con espacios | `'300 123 456'` | `LONGITUD` | «con espacios y 9 dígitos: inválido por longitud» |
| 4 · 10 dígitos (límite) | `'3001234567'` | válido, `'3001234567'` | «10 dígitos: válido» (**UT-03**) |
| 4 · con espacios | `'300 123 4567'` | válido, `'3001234567'` | «con espacios (300 123 4567): válido y normalizado» |
| 4 · con guiones | `'300-123-4567'` | válido, `'3001234567'` | «con guiones (300-123-4567): válido y normalizado» |

En el mismo archivo, `alternoIgualAlPrincipal` (el teléfono alterno no puede ser el mismo número que el principal, defecto 6) tiene 3 caminos y todos están cubiertos:

| Camino | Entrada (principal, alterno) | Esperado | Test que lo cubre |
|---|---|---|---|
| 1 · falta alguno | `('3001234567', undefined)`, `(…, null)`, `(undefined, …)` | `false` | «camino 1: …: no son iguales» (3 casos) |
| 2 · alterno vacío | `('3001234567', '  - ')` | `false` | «camino 2: alterno vacío: no son iguales» |
| 3 · se comparan limpios | `('300 123 4567', '300-123-4567')` | `true` | «principal … y alterno …: iguales» (3 casos) |
| 3 · números distintos | `('3001234567', '3001234568')` | `false` | «camino 3: números distintos: no son iguales» |

**6. ¿Qué camino sigue sin cubrir?**
Por ramas, ninguno: la cobertura da **100 %**. Pero hay un **dato** dentro del camino 1a que no se prueba: un teléfono que llega como **número** y no como texto (`3001234567` sin comillas en el JSON). La regla lo trata como «no es texto» y responde «El teléfono es obligatorio», un mensaje que confunde porque el teléfono sí llegó. No es un riesgo para los datos (igual se rechaza), y desde el formulario no puede pasar porque el navegador siempre envía texto. Solo podría pasar llamando a la API directamente (por ejemplo, con Postman). Queda como observación, sin cambiar el código.

**7. ¿Qué defecto podría quedar oculto si solo se probara el caso correcto?**
Con solo `3001234567 → válido`:
- Una regla que **solo contara el largo** dejaría pasar `300abc4567`, que también tiene 10 caracteres. Lo detecta UT-04.
- Cambiar `!== 10` por `< 10` aceptaría 11 dígitos. Lo detecta «11 dígitos».
- Validar **antes** de limpiar rechazaría `300 123 4567`, que la dueña pidió aceptar (AJ-08). Lo detecta «con espacios… válido y normalizado».
- Olvidar el chequeo de vacío dejaría pasar `'  - -  '` como si fuera un error de largo, con un mensaje equivocado.

---

## Bloque 3 · Cambio de estado de la orden (SWR-ORD-011, AJ-07, AJ-09, AJ-10)

```ts
export function evaluarTransicion(actual, nuevo, ctx): ResultadoTransicion {
  // Camino 1: dato imposible. Error de programación.
  if (!Number.isInteger(ctx.totalPagado) || ctx.totalPagado < 0) throw new RangeError(...);

  const desde = SECUENCIA_ESTADOS.indexOf(actual);
  const hacia = SECUENCIA_ESTADOS.indexOf(nuevo);

  if (actual === ENTREGADO) return rechazo('YA_ENTREGADO');        // Camino 2
  if (hacia === desde)      return rechazo('MISMO_ESTADO');        // Camino 3
  if (hacia < desde)        return rechazo('RETROCESO');           // Camino 4
  if (hacia > desde + 1)    return { …, motivo: 'SALTO', … };       // Camino 5
  if (nuevo === ENTREGADO)  return rechazo('ENTREGA_POR_OTRA_RUTA'); // Camino 6

  if (nuevo === EN_REPARACION) {
    if (ctx.valorCotizado === null) return rechazo('FALTA_VALOR_COTIZADO');  // Camino 7
    const minimo = abonoMinimo(ctx.valorCotizado, ctx.porcentajeAbono);
    if (ctx.totalPagado < minimo) return { …, motivo: 'FALTA_ABONO', abonoMinimo: minimo, … }; // Camino 8
  }
  return { permitido: true };                                       // Camino 9
}
```

La secuencia es `RECIBIDO(0) → EN_DIAGNOSTICO(1) → EN_REPARACION(2) → LISTO_PARA_ENTREGA(3) → ENTREGADO(4)`. Los números son la posición, y con ellos se compara `desde` y `hacia`.

**1. ¿Qué decisión o condición contiene?**
Ocho preguntas que se hacen **en orden**, como el control de seguridad de un aeropuerto: la primera que falla te detiene y ya no se revisa lo demás.
1. ¿El total pagado es un dato posible?
2. ¿La orden ya fue entregada?
3. ¿Pide el mismo estado?
4. ¿Pide volver atrás?
5. ¿Se salta algún estado?
6. ¿Pide «Entregado»? Eso va por otra ruta, que exige saldo 0.
7. Si va a reparación: ¿hay cotización?
8. Si va a reparación: ¿se pagó el abono mínimo?

**2. ¿Cuáles son sus ramas o caminos?**
Nueve: un error (camino 1), siete rechazos con motivo (caminos 2 a 8) y un permitido (camino 9).

**3. ¿Qué datos ejecutan cada camino?** Están en la tabla de abajo. `CTX_COMPLETO` es una cotización de 180.000 con 90.000 pagados, es decir, todo en regla, para que lo único que falle sea la secuencia.

**4. ¿Cuál es el valor límite?**
- **El abono:** con cotización de 180.001 el mínimo es 90.001 (techo del 50 %). **90.000 pagados → FALTA_ABONO** y **90.001 → permitido**. Esto prueba que se usa `<` y no `<=`.
- **El salto:** pasar a `desde + 1` es válido y a `desde + 2` ya es SALTO.

**5. ¿Qué prueba cubre cada rama?** Todas están en `ordenes/reglas/estados.spec.ts`.

| Camino | Entrada (actual → nuevo, contexto) | Esperado | Test que lo cubre |
|---|---|---|---|
| 1 · dato imposible | `RECIBIDO → EN_DIAGNOSTICO`, `totalPagado` = −1, 10.5 o NaN | lanza `RangeError` | «total pagado %p: lanza RangeError» (3 casos) |
| 2 · ya entregada | `ENTREGADO → ENTREGADO`, `CTX_COMPLETO` | `YA_ENTREGADO` (y no MISMO_ESTADO) | «ENTREGADO -> ENTREGADO: YA_ENTREGADO (antes que MISMO_ESTADO)» |
| 3 · mismo estado | `EN_DIAGNOSTICO → EN_DIAGNOSTICO` | `MISMO_ESTADO` | «EN_DIAGNOSTICO -> EN_DIAGNOSTICO: MISMO_ESTADO» |
| 4 · retroceso | `EN_REPARACION → EN_DIAGNOSTICO` | `RETROCESO` | «EN_REPARACION -> EN_DIAGNOSTICO: RETROCESO» |
| 5 · salto | `RECIBIDO → EN_REPARACION` | `SALTO`, «el siguiente es «En diagnóstico»» | «RECIBIDO -> EN_REPARACION: SALTO…» (**UT-07**) |
| 6 · entrega | `LISTO_PARA_ENTREGA → ENTREGADO` | `ENTREGA_POR_OTRA_RUTA` | «LISTO_PARA_ENTREGA -> ENTREGADO: ENTREGA_POR_OTRA_RUTA» |
| 7 · sin cotización | `EN_DIAGNOSTICO → EN_REPARACION`, `valorCotizado: null`, pagado 50.000 | `FALTA_VALOR_COTIZADO` | «a reparación sin valor cotizado: FALTA_VALOR_COTIZADO» |
| 8 · falta abono (límite) | ídem, cotizado 180.001, pagado **90.000** | `FALTA_ABONO`, mínimo 90.001 | «a reparación con 90000 pagados de 90001 mínimos: FALTA_ABONO» |
| 8 · nada pagado | ídem, cotizado 180.000, pagado 0 | `FALTA_ABONO`, mínimo 90.000 | «a reparación con cotización y 0 pagado: FALTA_ABONO» |
| 9 · abono justo (límite) | ídem, cotizado 180.001, pagado **90.001** | permitido | «a reparación con 90001 pagados de 90001 mínimos: permitido» |
| 9 · paso normal | `RECIBIDO → EN_DIAGNOSTICO`, sin cotización ni pagos | permitido | «RECIBIDO -> EN_DIAGNOSTICO sin cotización ni pagos: permitido» |
| 2 a 6 y 9 · todas las parejas | las 25 parejas (5 estados × 5), `CTX_COMPLETO` | solo 3 permitidas | «%s -> %s» (tabla 5 × 5, 25 casos) |

**6. ¿Qué camino sigue sin cubrir?**
- **Línea 91 (la única rama que la cobertura marca sin cubrir):** está en `mensajeSalto`, que arma el texto del camino 5. Usa `siguiente ?? actual` por si no hubiera estado siguiente, y eso solo pasaría desde ENTREGADO. Pero el camino 2 detiene a ENTREGADO antes de llegar al 5, así que esa rama **no se puede alcanzar** desde `evaluarTransicion`. Es una protección de reserva, no un camino real.
- **Combinaciones que no se prueban aquí:** una cotización imposible (por ejemplo, 0) al pasar a reparación hace que `abonoMinimo` lance `RangeError`, y un porcentaje de abono de 0 % deja pasar a reparación sin pagar nada. Las dos están probadas en `abono.spec.ts` («valor %p: lanza RangeError» y «180001 al 0 %: 0»), pero no a través de `evaluarTransicion`.

**7. ¿Qué defecto podría quedar oculto si solo se probara el caso correcto?**
Si solo se probara `RECIBIDO → EN_DIAGNOSTICO → permitido`:
- **`<` en lugar de `<=` en el abono:** si alguien escribiera `totalPagado <= minimo`, el cliente que paga **exactamente** el 50 % quedaría bloqueado. Lo detecta el caso de 90.001 de 90.001.
- **El orden de las preguntas:** si «mismo estado» se revisara antes que «ya entregada», una orden entregada respondería «La orden ya está en ese estado» en vez de «ya fue entregada». Lo detecta «ENTREGADO -> ENTREGADO».
- **Saltos y retrocesos:** sin la tabla 5 × 5 nadie notaría si, por ejemplo, se pudiera pasar de RECIBIDO a LISTO_PARA_ENTREGA sin reparar.
- **Entregar sin pagar:** si el camino 6 no existiera, se podría marcar ENTREGADO por aquí y saltarse la regla de saldo 0 (SWR-ENT-003).

---

## Cómo correrlas

Desde `backend/`:

| Qué | Comando |
|---|---|
| Solo las pruebas de un bloque | `npm test -- src/auth/reglas/bloqueo.spec.ts` (o `clientes/reglas/telefono.spec.ts`, `ordenes/reglas/estados.spec.ts`) |
| Cobertura de las reglas en la terminal | el comando `test:cov` de arriba |
| Cobertura de todo el backend | `npm run test:cov` (deja un reporte en `backend/coverage/`, que no se sube) |

## Decisiones de calidad

- **Caminos numerados en el código:** cada `if` de las reglas lleva su comentario `// Camino N`, y los tests usan ese mismo número en su nombre o comentario. Así la tabla camino → test se arma leyendo los dos archivos.
- **Funciones puras:** la hora (`ahora`) y los datos de la orden llegan como parámetros, así que cada camino se fuerza con un dato fijo, sin preparar la base de datos.
- **Cobertura como respaldo, no como meta:** se usa para confirmar lo que dice el análisis y para encontrar la línea 91. El camino 4 del bloque 1 muestra que el 100 % de ramas no basta.
