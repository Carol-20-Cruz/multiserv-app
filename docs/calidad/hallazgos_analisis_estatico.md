# Hallazgos de análisis estático

Hallazgos que se resuelven en la etapa de CI. Cada uno indica dónde se
encontró y qué se hizo mientras tanto.

| Id | Fecha | Hallazgo | Dónde | Estado |
|----|-------|----------|-------|--------|
| HAE-01 | 10/11/2026 | El backend no tiene ESLint instalado ni archivo `eslint.config.*`: el código NestJS no pasa por lint. (El frontend sí tiene ESLint 9 con `eslint-config-next`.) | `backend/package.json` | Abierto: se configura en la etapa de CI. Mientras tanto el backend se revisa con `tsc --noEmit` y Prettier. |
| HAE-02 | 10/11/2026 | Prettier marca formato distinto en archivos ya guardados: 25 del backend (`clientes`, `inventario` y otros) y 41 del frontend. Los archivos nuevos de órdenes sí pasan `prettier --check`. | `backend/src`, `frontend/src` | Abierto: se corrige en bloque en la etapa de CI, en un commit solo de formato. |

Nota: las herramientas se ejecutan siempre con `npx --no-install`, para no
descargar paquetes que no estén en el proyecto.
