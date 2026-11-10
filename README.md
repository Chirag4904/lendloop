# LendLoop

**Borrow what you need. Lend what you don't.**

LendLoop is a neighborhood lending board for tools and everyday items. Things like drills, projectors, and camping gear are useful but often spend most of their time unused. LendLoop helps neighbors find those items close to home, request them for the days they need, and keep track of the loan through its return.

This repository is a demo application. Listings and neighbor profiles can contain fictional data; the app does not process payments.

## How it works

- Visitors can browse and filter actual listings on Explore. The homepage cards are illustrative examples. Public Explore shows a listing's name, category, and cover photo, without the owner's identity, price, dates, or availability details.
- Signed-in neighbors choose a society, create and manage listings, and search for items nearby. A listing can include its category, condition, description, photos, and an optional daily price.
- A borrower requests a date range. The owner can approve or decline, and the app tracks the loan and return. For paid listings, the participants can also agree on a price; payment takes place outside the app.
- Updates link to the relevant request or loan. Automated events and daily overdue reminders are recorded as in-app mock notifications, with recent automation activity available on the loan.
- Administrators can moderate listings, view loans, manage societies, and assign Trusted Lender status. Convex checks roles and ownership on the backend.

## Technology

The app uses Next.js App Router, React, and TypeScript for the interface; Clerk for authentication; Convex for the database, storage, and backend functions; and n8n for notification and reminder workflows. Convex remains responsible for authorization, loan state, and overdue eligibility; n8n delivers automation events and writes results back.

## Run locally

You need Node.js 22 or newer, npm, a [Clerk account](https://dashboard.clerk.com/), and internet access for Clerk. Docker and Docker Compose are only needed for the optional local n8n setup.

**Where services run:** Next.js runs on your computer. Convex can run either as a [local development deployment](https://docs.convex.dev/cli/local-deployments) (currently beta, and available without a Convex account) or as a cloud development deployment. Clerk uses a hosted [development instance](https://clerk.com/docs/guides/development/managing-environments) even when the app runs on localhost. The setup below uses a Convex cloud development deployment because it makes the n8n integration easier to connect.

### 1. Install dependencies

```bash
git clone https://github.com/Chirag4904/lendloop.git
cd lendloop
npm ci
cp .env.example .env.local
```

### 2. Configure Clerk

Create a Clerk application with a development instance and activate its [Convex integration](https://docs.convex.dev/auth/clerk). Copy its publishable key and secret key into `.env.local`:

```dotenv
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_publishable_key
CLERK_SECRET_KEY=your_secret_key
```

Keep the sign-in and sign-up paths from `.env.example`. Copy the same Clerk instance's **Frontend API URL**, including `https://`; you will use it as the Convex issuer below.

In Clerk's **User & authentication → User model → User permissions**, turn off allowing users to change their email address. In **Sessions → Customize session token**, keep the existing `aud` claim and add these claims so Convex can store the verified address:

```json
{
  "aud": "convex",
  "email": "{{user.primary_email_address}}",
  "email_verified": "{{user.email_verified}}"
}
```

Clerk administrators can still change addresses. Such operator changes are not automatically synced; update the Convex record through a reviewed operator process if an address must change.

### 3. Start Convex

In a terminal, run the following and follow the prompts to create or select a cloud development deployment:

```bash
npx convex dev
```

The CLI writes `CONVEX_DEPLOYMENT` and `NEXT_PUBLIC_CONVEX_URL` to `.env.local` and watches for backend changes. Keep it running. In another terminal, configure the Clerk issuer on that deployment:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN https://your-clerk-frontend-api-url
```

Replace the example URL with the Frontend API URL from Clerk. If the first Convex sync reports a missing issuer, setting this variable allows the running command to retry. Use development credentials and never commit `.env.local`.

To use Convex locally instead, select local development when the CLI prompts you, or follow the [local deployment guide](https://docs.convex.dev/cli/local-deployments) for an existing project. Keep `npx convex dev` running: the local backend stops with it. Local deployments have no public URL, so services outside your computer need a tunnel to reach them. The cloud-specific admin and seed commands below target a cloud development deployment.

### 4. Start the app

In another terminal:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign up using your Clerk development instance. A fresh database needs an active society before a user can finish onboarding; add demo data or create a society as an administrator using the steps below.

### Optional: add demo data

For an isolated **cloud development** deployment, enable the guarded seed and add fictional societies, profiles, and listings:

```bash
npx convex env set LENDLOOP_DEMO_SEED_ALLOWED true
npx convex dev --once
npm run seed:dev
npx convex env remove LENDLOOP_DEMO_SEED_ALLOWED
```

The fictional profiles are not Clerk accounts and cannot respond to requests. Use two real Clerk development accounts to try a complete borrowing flow. Do not enable the seed on production.

### Provision the first admin

For a cloud development deployment, sign in once so the app creates a Convex user profile. Find that user's Clerk ID in the same Clerk development instance, then run this from a workstation authorized for the intended Convex deployment:

```bash
npx convex run --deployment dev admin:provisionInitial '{"clerkUserId":"user_REPLACE_WITH_CLERK_ID"}'
```

The internal mutation promotes an existing profile only if no admin exists and records an audit entry. Sign out and back in to refresh navigation, then use `/admin/societies` to add a society. This is an operator action, not a browser-accessible way to grant yourself a role.

## Run automation locally

The app can be explored without n8n, but request notifications and overdue reminders require the workflows to be configured and active. These workflows record mock in-app notifications; they do not send email or SMS.

1. Copy `n8n.env.example` to `.env.n8n`. Generate three independent secrets, for example by running `openssl rand -hex 32` three times. Set `N8N_ENCRYPTION_KEY`, `LENDLOOP_OUTBOUND_SECRET`, and `LENDLOOP_INBOUND_SECRET`. Set `LENDLOOP_CONVEX_SITE_URL` to the cloud development deployment's HTTP Actions URL, which ends in `.convex.site`.
2. Start n8n with `docker compose --env-file .env.n8n up -d`, open [http://localhost:5678](http://localhost:5678), and create its local owner account. Data persists in the `n8n_data` Docker volume.
3. Convex Cloud cannot call localhost. Expose the n8n webhook through an HTTPS tunnel or reverse proxy, restrict access to the webhook path where possible, and set `N8N_WEBHOOK_URL` in `.env.n8n` to its public origin. Restart Compose after changing environment values. Configure these variables on the same Convex development deployment with `npx convex env set NAME VALUE`:
   - `LENDLOOP_N8N_WEBHOOK_URL`: `https://YOUR-TUNNEL/webhook/lendloop-request`
   - `LENDLOOP_OUTBOUND_SECRET`: the same outbound secret as in `.env.n8n`
   - `LENDLOOP_INBOUND_SECRET`: the same inbound secret as in `.env.n8n`
4. In n8n, import [the error handler](n8n/error-handler.json), then [request notifications](n8n/request-notification.json) and [overdue reminders](n8n/overdue-reminders.json). Check that both workflows point to the imported error workflow, since n8n can assign new IDs, and activate all three. The request workflow uses the active `/webhook/lendloop-request` path, not n8n's test URL.

The daily reminder workflow runs at 09:00 Asia/Kolkata. To check notifications, create a request between two onboarded development accounts and inspect each participant's Updates view after the request and approval. Inspect n8n executions and Convex automation records if delivery fails. Stop n8n with `docker compose --env-file .env.n8n down`.

Keep `.env.n8n` private and use separate secrets per environment. The included Compose configuration grants environment access to workflow Code nodes for signing; only trusted users should be able to edit those workflows.

## Security and automation design

Convex enforces permissions for listings, requests, loans, and admin actions. Private handover details are available only to the loan participants and are excluded from admin loan projections and automation payloads. The public Explore projection omits owner and pricing details. The smaller public catalog query returns only name and category.

Request changes create a transactional outbox event; a separate Convex action sends only the fields needed by n8n. Both directions use HMAC-SHA256 signatures with separate environment-held secrets, timestamp checks, and replay protection. Reminder claims and write-backs use idempotency keys so retries do not create duplicate records. Dispatch retries, lease recovery, an n8n error workflow, and stored failed executions make failures visible. Exported workflow files contain no credentials.

## Checks

```bash
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:e2e
```

Some authenticated browser tests require isolated Clerk development accounts and Convex data; see [development notes](docs/DEVELOPMENT.md) for their environment variables. Do not run data-changing tests against production.

## Before a production launch

Use separate production Clerk, Convex, and n8n environments and credentials; secure n8n behind HTTPS and restrict editor access. Replace mock notifications with a delivery provider, test the complete signed workflows and retry behavior, and monitor failures. Review data retention, backup and recovery, search and pagination limits, and the handling of real personal data before inviting real users.
