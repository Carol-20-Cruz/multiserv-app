# MultiServ

[![CI](https://github.com/Carol-20-Cruz/multiserv-app/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/Carol-20-Cruz/multiserv-app/actions/workflows/ci.yml)

Sistema web para la gestión de servicios de MultiServ, desarrollado como proyecto de la asignatura **Calidad de Software** en CORHUILA (2026).

## Autoras

- Carol Liceth Cruz Roa
- Vanesa Vargas Gamboa

## Tecnologías

| Capa | Tecnología |
|------|------------|
| Backend | NestJS |
| ORM | Prisma 7 |
| Base de datos | Supabase (PostgreSQL) |
| Frontend | Next.js |

## Estructura de carpetas

```
multiserv-app/
├── backend/            # API en NestJS + Prisma
│   ├── prisma/         # Esquema y migraciones de la base de datos
│   ├── src/            # Código fuente
│   ├── test/           # Pruebas end-to-end
│   └── .env.example    # Plantilla de variables de entorno
├── frontend/           # Aplicación Next.js (próximamente)
└── docs/
    └── calidad/        # Documentación de calidad de software
```

## Cómo correr el backend

Requisitos: Node.js y npm instalados.

```bash
cd backend

# 1. Instalar dependencias
npm install

# 2. Crear el archivo .env a partir de la plantilla y poner los datos reales de Supabase
cp .env.example .env

# 3. Generar el cliente de Prisma
npx prisma generate --config prisma7.config.ts

# 4. Aplicar las migraciones a la base de datos
npx prisma migrate deploy --config prisma7.config.ts

# 5. Iniciar en modo desarrollo
npm run start:dev
```

El backend queda disponible en `http://localhost:3001`.

## Estrategia de ramas

- `main`: versión estable.
- `develop`: integración de funcionalidades.
- `feature/<modulo>`: una rama por cada módulo.

Flujo con Pull Requests: `feature/<modulo>` → `develop` → `main`.
