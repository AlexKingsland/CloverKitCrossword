# CloverKit Crossword — Shopify App

A Shopify embedded app that adds an interactive crossword puzzle to merchant storefronts, with engagement analytics for Pro subscribers.

**Stack:** React Router 7 (fullstack) · Prisma ORM · PostgreSQL · Shopify App Bridge · PostHog

---

## Prerequisites

Make sure you have the following installed before starting:

- **Node.js** `>=20.19 <22` or `>=22.12` — check with `node -v`
- **npm** — comes with Node
- **Shopify CLI** — install with `npm install -g @shopify/cli@latest`
- **PostgreSQL** — version 14+ recommended (see setup below)
- A **Shopify Partner account** with access to the `cloverkit-crossword` app

---

## 1. Install PostgreSQL

> **Note:** As of early 2026 the dev environment switched from SQLite to a local PostgreSQL instance. This is required — the app will not start without a valid Postgres `DATABASE_URL`.

### macOS (Homebrew)

```bash
brew install postgresql@16
brew services start postgresql@16
```

### macOS (Postgres.app)

Download and install from [postgresapp.com](https://postgresapp.com). Start the server from the menu bar icon.

### Windows

Download the installer from [postgresql.org/download/windows](https://www.postgresql.org/download/windows) and run it. Make sure to start the PostgreSQL service.

### Verify it's running

```bash
psql --version
psql -U postgres -c '\l'   # should list databases without error
```

---

## 2. Create the local database

Connect to Postgres and create the database:

```bash
psql postgres
```

Then inside the Postgres shell:

```sql
CREATE DATABASE cloverkit_crossword_dev;
-- If your local Postgres user isn't your OS username, also run:
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE cloverkit_crossword_dev TO your_username;
\q
```

> On macOS with Homebrew or Postgres.app, your local Postgres user is usually your macOS username and requires no password.

---

## 3. Clone and install dependencies

```bash
git clone <repo-url>
cd CloverKitCrossword
npm install
```

---

## 4. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Open `.env` and set:

```env
# PostgreSQL connection string — update username/password to match your local setup
DATABASE_URL="postgresql://your_username@localhost:5432/cloverkit_crossword_dev"

# PostHog analytics — get these from the PostHog project dashboard
# (ask a team member for access if you don't have it)
POSTHOG_API_KEY="phx_..."
POSTHOG_PROJECT_ID="360294"
```

> `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` are injected automatically by the Shopify CLI when you run `shopify app dev` — you do not need to set these manually.

---

## 5. Run Prisma migrations

Generate the Prisma client and apply all migrations to your local database:

```bash
npm run setup
```

This runs `prisma generate && prisma migrate deploy` under the hood. You should see output confirming that migrations were applied and the Prisma client was generated.

If you ever add new fields to `prisma/schema.prisma`, create a new migration with:

```bash
npx prisma migrate dev --name describe-your-change
```

To inspect your local database visually:

```bash
npx prisma studio
```

---

## 6. Start the dev server

```bash
npm run dev
```

This runs `shopify app dev`, which will:

1. Authenticate you with Shopify (opens a browser if not already logged in)
2. Link to the `cloverkit-crossword` app in the Partner account
3. Start a Cloudflare tunnel to expose your local server
4. Print a URL — press `P` to open it and install the app on your dev store

> **First time?** You'll need to be added to the Shopify Partner organisation to link to the app. Ask Alex to invite you.

---

## Project structure

```
app/
  routes/
    app._index.tsx          # Setup wizard / home page
    app.pricing.tsx         # Plan selection
    app.analytics.tsx       # Analytics dashboard (Pro only)
    app.billing.callback.tsx
    api.shop-status.ts      # Public storefront API (no auth)
    auth.$.tsx              # OAuth callback
    privacy.tsx             # Public privacy policy page
    webhooks.app.uninstalled.tsx
    webhooks.app.scopes_update.tsx
    webhooks.app.subscriptions_update.tsx
    webhooks.customers.data_request.tsx   # GDPR compliance
    webhooks.customers.redact.tsx         # GDPR compliance
    webhooks.shop.redact.tsx              # GDPR compliance
  shopify.server.ts         # Shopify SDK config
  db.server.ts              # Prisma client
extensions/
  crossword-puzzle/         # Theme app extension (storefront block)
prisma/
  schema.prisma             # Database schema
shopify.app.toml            # Shopify app manifest
```

---

## Useful commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with Shopify CLI tunnel |
| `npm run setup` | Generate Prisma client + run migrations |
| `npm run deploy` | Deploy app config to Shopify Partner Dashboard |
| `npm run build` | Build for production |
| `npx prisma studio` | Open visual DB browser |
| `npx prisma migrate dev` | Create and apply a new migration |
| `npx prisma migrate reset` | Wipe and re-seed the local database |

---

## GDPR compliance webhooks

The three mandatory GDPR compliance webhook handlers exist in `app/routes/`:

- `webhooks.customers.data_request.tsx`
- `webhooks.customers.redact.tsx`
- `webhooks.shop.redact.tsx`

These **cannot** be registered via `shopify.app.toml`. They must be set manually in the Shopify Dev Dashboard under **Settings** for the app, pointing to:

- `https://app.cloverkitstudio.com/webhooks/customers/data_request`
- `https://app.cloverkitstudio.com/webhooks/customers/redact`
- `https://app.cloverkitstudio.com/webhooks/shop/redact`

This only needs to be done once per deployment environment and is already configured in production.

---

## Common issues

**`DATABASE_URL` error on startup**

Make sure PostgreSQL is running (`brew services list` on macOS) and the database exists. Run `psql -U your_username -d cloverkit_crossword_dev` to verify you can connect.

**`The table 'Session' does not exist`**

You haven't run migrations yet. Run `npm run setup`.

**`Error: Cannot find module '.prisma/client'`**

Run `npm run setup` to regenerate the Prisma client.

**Shopify CLI asks to link to a different app**

Run `npm run config:link` and select `cloverkit-crossword` from the list.

**App doesn't load after install (redirect loop)**

This usually means the `DATABASE_URL` is wrong or the database is unreachable. Check your `.env` and that Postgres is running.

**`nbf claim timestamp check failed`**

Your system clock is out of sync. Enable "Set time and date automatically" in your OS date/time settings.
