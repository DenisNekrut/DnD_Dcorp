# DnD_Dcorp API

NestJS API package. The frontend remains at the repository root; the backend is isolated in `apps/api` so the current Vite workflow remains intact.

## Local setup

1. Copy `.env.example` to `.env` and set a long random `JWT_SECRET`.
2. Start PostgreSQL and set `DATABASE_URL`.
3. Run `npm install` in this directory.
4. Run `npx prisma generate`.
5. Run `npx prisma migrate dev --name init` against a development database.
6. Run `npm run start:dev`.

The API listens on port 3000 by default and exposes routes under `/api`.

## Authentication

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Authentication uses Argon2id password hashes and an HttpOnly session cookie. Configure HTTPS and `COOKIE_SECURE=true` in production. Never commit real environment files or secrets.

## Campaigns

- `GET /api/campaigns/discover` — open campaigns visible to authenticated users.
- `GET /api/campaigns/mine` — campaigns owned by or joined by the current user.
- `POST /api/campaigns` — create a campaign.
- `POST /api/campaigns/join/:inviteToken` — request access using an invitation.
- `POST /api/campaigns/:campaignId/apply` — request access using the campaign ID.
- `GET /api/campaigns/:campaignId/requests` — list pending requests for campaign managers.
- `POST /api/campaigns/:campaignId/requests/:membershipId/approve`
- `POST /api/campaigns/:campaignId/requests/:membershipId/reject`
- `POST /api/campaigns/:campaignId/applications?open=true|false`

## Character sheets

All character endpoints require authentication.

- `GET /api/characters/personal` — list personal character templates.
- `POST /api/characters/personal` — create a personal character sheet.
- `PATCH /api/characters/personal/:characterId` — update an owned personal sheet.
- `DELETE /api/characters/personal/:characterId` — delete an owned personal sheet.
- `POST /api/characters/campaigns/:campaignId/from/:characterId` — create an independent campaign copy from an owned personal sheet.
- `GET /api/characters/campaigns/:campaignId` — list campaign character copies for approved members.
- `PATCH /api/characters/campaign-copies/:characterId` — update a campaign copy when permitted.

The character data stores the sheet fields while the API calculates ability modifiers, proficiency bonus, saving throw modifiers, skill modifiers, and passive Perception from the supplied D&D 5e values. Character levels are limited to 1–20 and player ability scores to 1–20.

Personal templates and campaign copies are separate database records. Editing a campaign copy never writes back to its personal source or to copies in other campaigns. Campaign access and edit permissions are checked server-side; observers have read-only access.

The API schema change is validated by CI. A deployment must apply the generated Prisma migration to its PostgreSQL database before using these endpoints.
