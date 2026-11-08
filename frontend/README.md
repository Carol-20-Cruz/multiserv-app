# MultiServ — Frontend

Interfaz web de MultiServ construida con Next.js 16 (App Router), React 19 y
Tailwind CSS 4.

Basada en la plantilla
[TailAdmin free-nextjs-admin-dashboard](https://github.com/TailAdmin/free-nextjs-admin-dashboard)
(licencia MIT, ver `LICENSE`), adaptada a la identidad de marca de MultiServ.

## Cómo correrlo

Requisitos: Node.js 20.9+ y el backend corriendo (por defecto en `http://localhost:3001`).

```bash
cd frontend
npm install
cp .env.example .env.local   # ajusta API_URL si el backend usa otro puerto
npm run dev                  # http://localhost:3000
```

## Estructura

```
src/
├── app/
│   ├── (auth)/login/        # pantalla de inicio de sesión
│   ├── (dashboard)/         # páginas con sidebar + header
│   └── api/auth/            # login y logout (manejan la cookie de sesión)
├── components/
│   ├── ui/                  # componentes base de la plantilla
│   ├── common/              # breadcrumb, tarjetas, Próximamente, 404
│   └── auth/login/          # formulario de login
├── layout/app-layout/       # sidebar y header
├── lib/                     # sesión y conexión con el backend (solo servidor)
└── proxy.ts                 # redirige a /login si no hay sesión
```
