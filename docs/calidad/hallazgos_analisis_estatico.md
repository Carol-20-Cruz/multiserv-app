# Hallazgos de análisis estático

Hallazgos que se resuelven en la etapa de CI. Cada uno indica dónde se
encontró y qué se hizo mientras tanto.

| Id | Fecha | Hallazgo | Dónde | Estado |
|----|-------|----------|-------|--------|
| HAE-01 | 10/11/2026 | El backend no tiene ESLint instalado ni archivo `eslint.config.*`: el código NestJS no pasa por lint. (El frontend sí tiene ESLint 9 con `eslint-config-next`.) | `backend/package.json` | Abierto: se configura en la etapa de CI. Mientras tanto el backend se revisa con `tsc --noEmit` y Prettier. |
| HAE-02 | 10/11/2026 | Prettier marca formato distinto en archivos ya guardados: 25 del backend (`clientes`, `inventario` y otros) y 41 del frontend. Los archivos nuevos de órdenes sí pasan `prettier --check`. | `backend/src`, `frontend/src` | Abierto: se corrige en bloque en la etapa de CI, en un commit solo de formato. |
| HAE-03 | 11/11/2026 | oxlint 1.90.0 avisa `no-unsafe-optional-chaining` en el validador `AlternoDistinto` (defecto 6): `(args?.object as ...).telefono`. Si `args` llega `undefined`, el `?.` devuelve `undefined` y leer `.telefono` lanza `TypeError`. | `backend/src/clientes/dto/transformaciones.ts:23` | Cerrado el 11/11/2026: `oxlint src/ test/` sin avisos. Ver el detalle abajo. |

## HAE-03: encadenamiento opcional inseguro en `AlternoDistinto`

Encontrado al correr el lint del backend (`npm run lint` = `oxlint src/ test/`)
en la rama `feature/pagos-entrega`. El código viene del defecto 6
(commit `678738a`).

Antes (salida de oxlint 1.90.0):

```text
src/clientes/dto/transformaciones.ts:23:12: warning eslint(no-unsafe-optional-chaining): Unsafe usage of optional chaining help: If this short-circuits with 'undefined' the evaluation will throw TypeError
```

Código:

```ts
validate: (alterno: unknown, args) =>
  !alternoIgualAlPrincipal(
    (args?.object as { telefono?: unknown }).telefono,
    alterno,
  ),
```

Riesgo: el `as` le dice a TypeScript que el objeto siempre existe, pero el
`?.` admite que `args` falte. Si class-validator llamara al validador sin
`args`, la validación lanzaría `TypeError` (respuesta 500) en vez de responder
400. En el uso normal `args` siempre llega, por eso las pruebas no lo vieron.

Después: el validador pasa a una función con nombre, `alternoDistintoValido`,
que trata `args` como opcional de punta a punta:

```ts
export function alternoDistintoValido(
  alterno: unknown,
  args?: ValidationArguments,
): boolean {
  const cuerpo = args?.object as { telefono?: unknown } | undefined;
  return !alternoIgualAlPrincipal(cuerpo?.telefono, alterno);
}
```

Sin `args` no hay teléfono principal con qué comparar, y la regla pura
`alternoIgualAlPrincipal` ya devuelve `false` cuando falta uno de los dos: el
alterno se acepta y no hay `TypeError`. El comportamiento con `args` no cambia.

Verificación:

- `npx --no-install oxlint src/ test/`: sin avisos, código de salida 0.
- Dos pruebas nuevas en `backend/src/clientes/dto/dto.spec.ts`: sin `args` no
  lanza error y devuelve `true`; con `args` rechaza el alterno igual al
  principal. Todas las pruebas del backend en verde.

Nota: las herramientas se ejecutan siempre con `npx --no-install`, para no
descargar paquetes que no estén en el proyecto.
