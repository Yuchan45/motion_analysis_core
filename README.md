# Motion Analysis API

Backend principal/orquestador de Motion Analysis. Expone autenticación, ownership, videos y análisis a React; PostgreSQL conserva metadata y FastAPI queda aislado como motor de Computer Vision.

## Desarrollo local

1. Copia `.env.example` como `.env` y reemplaza `JWT_SECRET`.
2. Inicia PostgreSQL: `docker compose up -d postgres`.
3. Instala dependencias: `npm install`.
4. Genera Prisma y crea la base: `npm run prisma:generate` y `npm run prisma:migrate -- --name init`.
5. Inicia el motor Python con el mismo directorio de storage y luego ejecuta `npm run start:dev`.

La API queda en `http://localhost:3000`. React debe usar esa URL y nunca llamar directamente a FastAPI.

## Contratos principales

- `POST /auth/register`, `POST /auth/login`, `POST /auth/logout`
- `GET /users/me`
- CRUD `/videos` y streaming en `/videos/:id/content`
- `POST|GET /videos/:videoId/analyses`
- `GET /analyses/:id/data`, `PUT /analyses/:id/editor-state`
- `POST /analyses/:id/render`, `GET /analyses/:id/result`
