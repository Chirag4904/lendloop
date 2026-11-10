# LendLoop

LendLoop is a mobile-first neighborhood tool marketplace. Phase 1 established the public landing page, Clerk sign-in, Convex onboarding and dashboard. Phase 2 adds listing creation and management, photos, camera capture, society-first discovery and tool detail pages. Requests, rentals, negotiation and notifications remain later phases.

## Prerequisites

Node.js 22+, npm, a Clerk **development** application, a Convex development deployment, and Docker Compose only if you want local n8n. Vercel is the intended frontend host; no Docker service is needed to run Next.js.

## Install and configure

```bash
npm ci
cp .env.example .env.local
```

In Clerk, create a development application and enable the [Convex integration](https://docs.convex.dev/auth/clerk). Put its publishable and secret keys in `.env.local` as `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`. Set the Clerk sign-in/sign-up paths shown in `.env.example`.

In Convex, create and link a **development** deployment with `npx convex dev`. This writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local`. In that Convex deployment's environment settings, set `CLERK_JWT_ISSUER_DOMAIN` to the Clerk Frontend API URL, including `https://`. Keep `npx convex dev` running during development so schema and functions sync. Run `npx convex codegen` after linking to replace the checked-in generated-compatible references with deployment-generated ones.

Convex does not receive Clerk's secret key. Clerk stays the identity system; Convex uses its Clerk JWT integration and stores only the Clerk subject, a display name, and onboarding/admin flags. Use separate Clerk and Convex development instances for testing. **Never put production credentials in CI or E2E tests.**

Active societies can be entered by a provisioned LendLoop admin through `/admin/societies` or by a deployment operator through a controlled migration. Normal users cannot create or approve societies. Source city, locality, latitude, and longitude independently for LendLoop's own directory. Until an active society exists, onboarding shows a clear empty state and lets users submit a suggestion.

For a development preview, seed four fictional Mumbai societies near Rizvi Oak, four synthetic neighbor profiles, and eight sample tools. Their coordinates are illustrative. The profiles are Convex sample rows, not Clerk sign-in accounts. Their stored names are prefixed `Demo ·`; public Explore removes that prefix from display. Enable the seed only on your Convex development deployment, then run it once (re-running is safe):

```bash
npx convex env set LENDLOOP_DEMO_SEED_ALLOWED true
npx convex dev --once
npm run seed:dev
```

Do not enable `LENDLOOP_DEMO_SEED_ALLOWED` on production. The seed is an internal mutation and rejects calls without that flag.

## Run

```bash
npm run dev
```

Open `http://localhost:3000`. The public page also renders without credentials, with a catalog connection state. Sign-in and dashboard access need Clerk; onboarding and live data need Convex.

For local n8n only, create an ignored `.env.n8n` with a strong `N8N_ENCRYPTION_KEY` and optionally `N8N_HOST=localhost`, then:

```bash
docker compose --env-file .env.n8n up -d
docker compose --env-file .env.n8n down
```

n8n runs on `http://localhost:5678`; its data persists in the `n8n_data` volume. There are no n8n workflows or app-to-n8n calls yet.

## Check

```bash
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Backend tests use `convex-test` in memory. Public browser checks run without service credentials. Optional authenticated E2E checks run only with a Clerk **test** publishable key, dev `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CONVEX_URL`, and `E2E_CLERK_USER_EMAIL` for a development test user. The borrowing flow additionally needs `E2E_CLERK_BORROWER_EMAIL` for a second onboarded test user in the same development deployment. Set `E2E_CLERK_THIRD_EMAIL` for the optional unrelated-user security browser check. The bridge test verifies that a Clerk session token authenticates a Convex query. Set `E2E_SOCIETY_NAME` after inserting a development society to enable the onboarding search check. The suggestion check writes a pending suggestion to the development deployment, never to production. Screenshot baselines are in `tests/e2e/public.spec.ts-snapshots`; macOS runs the pixel comparison only without live service configuration, while Linux CI runs the layout and behavior checks. Update baselines intentionally with `npm run test:e2e -- --update-snapshots` when the design changes.

## Architecture and data minimization

Next.js App Router serves the public pages and protects dashboard and onboarding routes with Clerk. Convex functions enforce access to data, independent of UI navigation. The public catalog query returns only `name` and `category`. A user record is keyed by Clerk `subject`; users can change only their own display name and select an active society. Society suggestions are pending until an operator reviews them. Optional phone numbers and pickup details are stored separately after loan approval and shown only to participants. We do not require private addresses or collect GPS history or payment data. See [security and privacy](docs/SECURITY_AND_PRIVACY.md) and [architecture](docs/ARCHITECTURE.md).

| Implemented through Phase 6                                                                                                                                                               | Planned later   |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| Public catalog, Clerk auth, society onboarding, listings, photos, nearby discovery, requests, loans, returns, private handover, negotiation, n8n workflows, and LendLoop admin management | Payments and AI |

The current society search checks the first 200 active records. Add a dedicated search index when the directory grows. See [implementation plan](docs/IMPLEMENTATION_PLAN.md) for the next steps.

## Rizvi Oak CHSL demo data

The development deployment has four synthetic profiles and fifteen photo-backed tool listings in Rizvi Oak CHSL, Malad East, Mumbai. These are display-only mock profiles (`demo_rizvi_*` Clerk subjects), not real Clerk accounts or verified residents. Every tool and owner name starts with `Demo ·`. The generated source images are in `public/images/demo-rizvi/`; their serving copies are stored in Convex File Storage. No Trusted Lender badges were assigned.

The scoped seed is idempotent and only runs when `LENDLOOP_DEMO_SEED_ALLOWED=true` in the development Convex deployment:

```bash
npx convex run demoRizvi:seed '{"societyId":"j576c7743fr9d6jghg3wjer7yd8hvkz3"}'
```

`demoRizvi:preparePhotos` creates upload URLs for listings without photos; upload the local JPEGs to those URLs and call `demoRizvi:attachPhotos` with their returned storage IDs. The live development dataset already has all fifteen images attached. The four fictional neighboring societies use approximate coordinates around Rizvi Oak; they are not real building locations. Keep this seed flag disabled in production.

## Admin browser tests

On an isolated development Clerk/Convex pair, provision the test admin using the README operator procedure. Set `E2E_CLERK_ADMIN_EMAIL` for the admin smoke and responsive checks. The trust scenario also needs `E2E_ADMIN_TARGET_DISPLAY_NAME` for a uniquely named normal test account; the suggestion scenario needs `E2E_CLERK_SUGGESTER_EMAIL` for a fresh account that has not selected a society. Listing and loan scenarios reuse `E2E_CLERK_USER_EMAIL` and `E2E_CLERK_BORROWER_EMAIL`. Playwright skips these scenarios when the relevant variables are absent. Never point these tests at production: they create and moderate synthetic records.
