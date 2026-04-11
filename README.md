# Petal & Prosper

SaaS app for florists: enquiry intake, quoting with a pricing engine, production and delivery scheduling, wholesale ordering, proposals, and invoicing. Built on Next.js 14 (App Router), NextAuth v5, Drizzle ORM, and PostgreSQL, deployed on Railway.

## Stack

- **Next.js 14** App Router with three route groups: `(marketing)` owns `/`, `(auth)` owns login/signup, `(dashboard)` owns everything behind auth
- **NextAuth v5 beta** credentials provider with JWT sessions; claims carry `id`, `role`, and `companyId`
- **Drizzle ORM** with `node-postgres`, schema in `src/lib/db/schema.ts`
- **PostgreSQL** (Railway plugin in production, local Postgres in dev)
- **Tailwind** for styling, `lucide-react` for icons, `ag-grid-community` for data tables
- **Role-based access control** with three roles (`admin`, `manager`, `staff`) via `<Can permission="...">` client component and `requirePermissionApi` / `requireSessionApi` server helpers. Every query is tenant-scoped on `ctx.companyId`.

## Running locally

```bash
cd petal-and-prosper
npm install
cp .env.example .env        # then fill in DATABASE_URL and AUTH_SECRET
npm run db:push              # apply schema to your local Postgres
npm run dev                  # starts on http://localhost:3000
```

The `db:push` script uses `drizzle-kit push` to sync `src/lib/db/schema.ts` directly to the database. That's fine for dev and for the current stage of the project; when we need reviewable migrations we'll switch to `drizzle-kit generate` + `drizzle-kit migrate`.

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Next.js dev server |
| `npm run build` | Runs `drizzle-kit push && next build`. The migration step means every Railway deploy auto-applies schema changes before the new build comes up. |
| `npm start` | Production Next.js server |
| `npm run lint` | ESLint |
| `npm run db:push` | Push the Drizzle schema to the database pointed at by `DATABASE_URL` |
| `npm run db:studio` | Launch Drizzle Studio against the local database |
| `npm run db:generate` | Generate SQL migration files from the schema (only if/when we move off `push`) |
| `npm run db:seed` | Run the seed script (refuses to run when `NODE_ENV=production`) |

## Environment variables

Copy `.env.example` to `.env` locally, and set the equivalents in Railway's service Variables tab for production.

| Variable | Required | Notes |
| --- | --- | --- |
| `DATABASE_URL` | yes | On Railway the Postgres plugin sets this automatically using the internal `postgres.railway.internal` host. Locally, point at your own Postgres. |
| `AUTH_SECRET` | yes | Signs and verifies JWT session tokens. Generate with `openssl rand -base64 32`. Without this, login silently fails in production. |
| `AUTH_URL` | yes in prod | Canonical URL of the deployed app, e.g. `https://petal-and-prosper-production.up.railway.app`. No trailing slash. |
| `NEXTAUTH_SECRET` / `NEXTAUTH_URL` | optional | Legacy NextAuth v4 names. NextAuth v5 reads `AUTH_*` first and falls back to these, so you only need one pair. |
| `NEXT_PUBLIC_APP_URL` | optional | Used as the base for public proposal links (`/p/[token]`). Falls back to the incoming request origin when unset. |

### Email

Email dispatch is currently **stubbed** in `src/lib/email/send.ts`. Every call to `sendEmail` logs a preview to stderr and returns success without actually sending. The proposal send flow, the public accept/decline page, and the token-minting all still work end-to-end; only the actual outbound delivery is inert. Wire SMTP back in when we need real sends, at which point this section will grow.

## Deploying to Railway

The app is deployed on Railway as a single Next.js service plus a Postgres plugin. The flow:

1. **Connect the repo.** Railway watches `main` on GitHub. Any push kicks a new build.
2. **Build step.** Railway runs `npm install && npm run build`. Because `build` is wired to `drizzle-kit push && next build`, schema changes land before the new container boots. If a migration would be destructive, `drizzle-kit push` is interactive and the build will hang; pick the non-destructive option and rerun, or apply the migration manually first (see below).
3. **Start step.** Railway runs `npm start`, which is `next start`. Next.js picks up `PORT` from the environment automatically.
4. **Required variables** (set in Railway → service → Variables): `AUTH_SECRET`, `AUTH_URL`. `DATABASE_URL` is injected by the Postgres plugin. `NEXT_PUBLIC_APP_URL` is optional but recommended so public proposal links use the canonical host.

### Running a manual migration against live

If `drizzle-kit push` hits an interactive prompt during a deploy (for example when adding a unique constraint on a table with existing rows), you'll want to apply it from your laptop instead so you can see the prompts:

```bash
# Grab the public connection string from Railway → Postgres service →
# Variables → DATABASE_PUBLIC_URL (the *.proxy.rlwy.net one, NOT the
# internal postgres.railway.internal one — that only resolves inside
# Railway's network).
cd petal-and-prosper
DATABASE_URL="postgresql://postgres:...@hopper.proxy.rlwy.net:PORT/railway" npm run db:push
```

When prompted about truncating a table to apply a constraint, always pick the non-destructive option (it's the default — just press Enter). The constraint will apply as long as the existing rows don't actually violate it.

## Architecture notes

### Route groups and the `/home` landing

`src/app/(marketing)/page.tsx` owns `/`, so the dashboard landing lives at `/home` (not `/`). Login and signup push the user to `/home` after auth succeeds. The middleware allowlist in `src/middleware.ts` is explicit, so any new top-level dashboard route needs adding there.

### Tenancy and RBAC

Every mutating API route follows the same pattern:

```ts
const gate = await requirePermissionApi("orders:create");
if ("response" in gate) return gate.response;
const { ctx } = gate;
// ctx.companyId is the tenant; every query must filter on it.
```

Reads go through `requireSessionApi` when any signed-in user can see the data. Client components use `<Can permission="orders:update">…</Can>` to hide actions the user isn't allowed to take. Permissions are defined in `src/lib/auth/permissions.ts`.

### Pricing engine

`src/lib/pricing/engine.ts` is a pure deterministic function. It takes line items, the tenant's pricing rules (markup multiple, flower buffer, fuel cost per litre, MPG, staff cost per hour, staff margin), and optional delivery miles / labour hours, and produces priced line items plus fuel and labour add-on lines. The result is stored as a JSON snapshot on `orders.pricing_snapshot` so a quote can be re-opened later and the exact rules that were applied are visible. `POST /api/orders/[id]/apply-pricing` is the entry point.

### Dashboard

`src/app/(dashboard)/home/page.tsx` renders the today / this week / needs-attention widgets and the onboarding checklist. All data comes from a single aggregator endpoint at `GET /api/dashboard`, which runs the relevant queries in parallel and returns onboarding flags alongside the widgets.

### Onboarding wizard

`src/components/onboarding/wizard.tsx` is a 4-step modal (company details, logo, pricing rules, first team member). It auto-opens on `/home` the first time a newly-signed-up tenant lands, and the user can skip or dismiss. Dismissal is persisted in `localStorage` under the key `pp.onboardingWizardDismissed`. Signup seeds empty rows in `price_settings`, `proposal_settings`, and `invoice_settings` so the wizard's PUTs have something to update.

### Proposals and the public accept flow

Proposals carry `subject`, `body_html`, `public_token`, `accepted_at`, and `rejected_at` columns on top of the basic status row. `POST /api/proposals/[id]/send` mints an opaque 32-byte `public_token`, renders the email template, calls the (stubbed) email service, and persists `status='sent'`. The client follows the link to `/p/[token]`, which is served outside every route group (no auth) and backed by `/api/public/proposals/[token]`. Accepting the proposal advances the parent order to `status='confirmed'`; declining leaves the order untouched so the florist can re-quote.

### Invoice auto-numbering

`POST /api/invoices` accepts optional `invoiceNumber` and `totalAmount`. When either is omitted, the handler derives the value: the number becomes the next `INV-{year}-{NNNN}` sequence for the tenant (scan-and-increment — not transactionally safe, acceptable at florist scale), and the total pulls from the parent order's items or falls back to `orders.totalPrice`.

## Database schema

The schema is the single source of truth in `src/lib/db/schema.ts`. The important additions made during the rebuild:

- `orders.pricing_snapshot` (text, nullable) — JSON snapshot of the pricing rules applied when `apply-pricing` ran
- `proposals.subject`, `proposals.body_html`, `proposals.public_token`, `proposals.accepted_at`, `proposals.rejected_at` — for the send + public accept flow

Any further schema changes go into `schema.ts` and land via `npm run db:push`, which is invoked automatically as part of `npm run build` and therefore on every Railway deploy.
