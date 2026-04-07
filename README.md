# Nuxt OIDC Scaffold (Pocket ID Ready)

Nuxt 4 starter with:

- `@nuxt/ui` for UI components
- `nuxt-auth-utils` for sealed cookie session auth
- Generic OIDC flow for Pocket ID (`/auth/oidc`)
- Token refresh endpoint and client refresh scheduler
- Protected route middleware and auth stub pages

## Setup

1. Install dependencies

```bash
pnpm install
```

2. Create environment file from sample

```bash
cp .env.example .env
```

3. Fill required values in `.env`

```bash
NUXT_SESSION_PASSWORD=<long-random-value-at-least-32-chars>
NUXT_OAUTH_OIDC_CLIENT_ID=<client-id>
NUXT_OAUTH_OIDC_CLIENT_SECRET=<client-secret>
NUXT_OAUTH_OIDC_OPENID_CONFIG=https://id.example.com/.well-known/openid-configuration
NUXT_OAUTH_OIDC_REDIRECT_URL=http://localhost:3000/auth/oidc
```

4. In Pocket ID client settings, set callback URL to:

```text
http://localhost:3000/auth/oidc
```

## Run

```bash
pnpm dev
```

Then open:

- `/auth/login` for sign-in
- `/dashboard` as protected route example
- `/profile`, `/settings` as protected stubs

## Auth routes

- `GET /auth/oidc`: starts OIDC flow and handles callback
- `POST /api/auth/refresh`: refreshes tokens using `refresh_token`
- `POST /api/auth/logout`: clears local session

## Notes

- By default all routes are protected except `/`, `/auth/*`, `/auth-error`, `/logout`.
- Refresh is scheduled client-side before token expiration.
- `refresh_token` is stored in server-only secure session data.
