# DnD_Dcorp API

NestJS API package. The frontend remains at the repository root; the backend is isolated in `apps/api` so the current Vite workflow remains intact.

## Local setup

1. Copy `.env.example` to `.env` and set a long random `JWT_SECRET`.
2. Start PostgreSQL and set `DATABASE_URL`.
3. Run `npm install` in this directory.
4. Run `npx prisma generate`.
5. Run `npx prisma migrate dev --name init`.
6. Run `npm run start:dev`.

The API listens on port 3000 by default and exposes routes under `/api`.

## Initial endpoints

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Authentication uses Argon2id password hashes and an HttpOnly session cookie. Configure HTTPS and `COOKIE_SECURE=true` in production. Never commit real environment files or secrets.

Campaign and character modules and the initial relational data model are scaffolding for the next implementation step. Authorization checks must be enforced server-side before campaign data or private game state is returned.