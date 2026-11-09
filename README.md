# LendLoop

LendLoop is a neighborhood marketplace for borrowing and sharing tools and everyday gear. It starts with the people and places closest to home.

Good things go around.

## Marketplace

Signed-in neighbors who have selected an active society can list, discover, and borrow tools and everyday gear. Listings can be free or priced per day in INR. Owners can add up to five photos, edit listings, and manage their visibility. Explore starts with the selected society and offers nearby distance, search, category, price, and sort controls.

Borrowers choose 1–30 inclusive calendar days in Asia/Kolkata. For paid listings, they can request the listed price or make one lower offer. The lender can accept the offer, suggest one final price between the offer and the listed price, keep the listed price, or decline the request. The borrower can accept the final price or walk away. Confirmed loans reserve dates and keep their agreed price even if the listing changes. Borrowers can report a return; lenders confirm it. Handover details are visible only to the two participants. No payment is collected.

## Development

See [development setup](docs/DEVELOPMENT.md) for Clerk, Convex, test accounts, and synthetic demo data. After linking a development Convex deployment, run `npx convex dev --once` and `npx convex codegen` to sync functions and types. `npm test` runs backend tests; `npm run test:e2e` runs public browser tests and authenticated flows when isolated Clerk test accounts are configured. Keep production credentials out of tests.

## Vercel demo deployment

This deployment is for testing. The Vercel project uses a Clerk **development** instance and a Convex **development** deployment, with synthetic data only. Do not connect it to live production credentials or user data. The Vercel Production target provides a stable `*.vercel.app` URL for the demo; it does not make Clerk or Convex a production environment. Clerk development authentication on a provider domain is intended for demos and testing, not a real production launch.

1. Import `Chirag4904/lendloop` into a separate Vercel project, with `main` as the production branch, the repository root as Root Directory, and the Next.js framework preset. Keep Git integration enabled so pushes to `main` deploy automatically. Configure the Build Command as `npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL`. This [official Convex/Vercel workflow](https://docs.convex.dev/production/hosting/vercel) builds the frontend against the selected deployment and then pushes the matching Convex functions. No `vercel.json` or GitHub Actions deploy job is needed.
   Preview deployments are disabled for this demo project until they have separate Convex credentials; `main` continues to deploy automatically.
2. In Convex, create a deploy key scoped to the **demo development deployment** with `deployment:deploy` permission. Store it only as a sensitive Vercel environment variable named `CONVEX_DEPLOY_KEY`, targeted to this demo project's Production environment. Do not set `CONVEX_DEPLOYMENT` on Vercel: without a key, `convex deploy` may target the project's default production deployment. The key and all local `.env` files must stay out of Git.
3. Set the following variables in the Vercel Production environment. Use the keys from the same Clerk development instance that matches the Convex issuer. Do not use `pk_live_` or `sk_live_` keys on the `*.vercel.app` demo URL.

   | Variable                            | Value / purpose                                                                                          |
   | ----------------------------------- | -------------------------------------------------------------------------------------------------------- |
   | `CONVEX_DEPLOY_KEY`                 | Sensitive, deployment-scoped demo Convex key; used only during builds.                                   |
   | `NEXT_PUBLIC_CONVEX_URL`            | Public URL of that same demo Convex deployment; `convex deploy` also injects it into the frontend build. |
   | `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk development `pk_test_…` key.                                                                       |
   | `CLERK_SECRET_KEY`                  | Sensitive Clerk development `sk_test_…` key.                                                             |
   | `NEXT_PUBLIC_CLERK_SIGN_IN_URL`     | `/sign-in`                                                                                               |
   | `NEXT_PUBLIC_CLERK_SIGN_UP_URL`     | `/sign-up`                                                                                               |

4. On the demo Convex deployment, set `CLERK_JWT_ISSUER_DOMAIN` to the **Frontend API URL** of that Clerk development instance, including `https://`, and enable Clerk's Convex integration. The checked-in [auth configuration](convex/auth.config.ts) uses this value to validate session tokens. The sign-in and sign-up components use relative paths and redirect back to the current origin, so the stable `*.vercel.app` demo URL needs no hard-coded redirect URL. If a social login provider is enabled, register the Clerk development instance's callback URL with that provider.
5. Deploy from Git, then verify sign-in on two devices, society selection, Explore, listing creation/editing, and image upload. Test **Take Photo** on a real phone: Vercel serves HTTPS, which is required for camera permission. The device capture fallback remains available if a browser denies camera preview.

The existing GitHub Actions workflow still runs formatting, lint, typecheck, unit tests, build, and public browser checks without service credentials. Authenticated E2E tests require the isolated variables described in [development setup](docs/DEVELOPMENT.md); they are skipped in CI by default.

### Troubleshooting

| Symptom                                                | Check                                                                                                                                                                                                              |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Build deploys Convex to the wrong backend              | Confirm `CONVEX_DEPLOY_KEY` identifies the demo development deployment and `CONVEX_DEPLOYMENT` is absent on Vercel. Redeploy after correcting it.                                                                  |
| App says Convex is not configured, or queries fail     | Confirm `NEXT_PUBLIC_CONVEX_URL` matches the demo deployment and that the build log shows a successful Convex push.                                                                                                |
| Clerk sign-in works but Convex remains unauthenticated | Confirm the `pk_test_` and `sk_test_` keys belong to one Clerk instance, its Convex integration is enabled, and `CLERK_JWT_ISSUER_DOMAIN` matches its Frontend API URL. Redeploy Convex after changing the issuer. |
| Sign-in redirects to another site or fails on a device | Check that Clerk path variables are `/sign-in` and `/sign-up`, redirects are relative, and the browser is on the same stable HTTPS demo URL.                                                                       |
| Image upload fails                                     | Confirm the user selected an active society, the Convex `photos` functions deployed, and the file is JPEG, PNG, or WebP under 5 MB.                                                                                |
| Camera preview is unavailable                          | Use the HTTPS demo URL, allow camera access in the browser/OS, and try the device capture fallback. Test physical mobile hardware separately.                                                                      |

For a real launch, create a separate production Clerk instance on a domain you own and a separate production Convex deployment or project, then provision new keys and verify migration deliberately. Do not promote this demo configuration into a real production environment.

## Phase 5 automation setup

Convex persists one outbox event in the same transaction as each successful request, price, or return transition. An internal action sends only the event ID, type, recipient ID, request ID, item name, and delivery lease to n8n. The n8n webhook verifies the HMAC and acknowledges through a separately signed Convex HTTP action, which creates a mock in-app notification. The notification center is at `/dashboard/notifications`; each loan detail has an automation activity list. The daily n8n workflow runs at **09:00 Asia/Kolkata**, pages through overdue loans selected by Convex, claims each reminder, and writes back a mock sent record. No email or SMS provider is used.

### Run n8n locally

1. Copy `n8n.env.example` to ignored `.env.n8n`. Generate three separate random secrets of at least 32 bytes (for example `openssl rand -hex 32`). Set `N8N_ENCRYPTION_KEY`, `LENDLOOP_OUTBOUND_SECRET` (Convex → n8n), and `LENDLOOP_INBOUND_SECRET` (n8n → Convex). Set `LENDLOOP_CONVEX_SITE_URL` to the development Convex **HTTP Actions** URL ending in `.convex.site`.
2. Start n8n with `docker compose --env-file .env.n8n up -d`. Open `http://localhost:5678` and create the local owner account. Compose persists the encrypted n8n database in `n8n_data`, binds only `127.0.0.1:5678`, restarts on failure, and checks `/healthz`. Next.js still runs with `npm run dev` and needs no Docker.
3. Convex Cloud cannot reach localhost. Put an authenticated HTTPS tunnel or HTTPS reverse proxy in front of the local n8n webhook and set `N8N_WEBHOOK_URL` to its public origin. Restrict the tunnel to the webhook path if possible. The HMAC remains mandatory. Set the development Convex environment variables `LENDLOOP_N8N_WEBHOOK_URL=https://YOUR-TUNNEL/webhook/lendloop-request`, `LENDLOOP_OUTBOUND_SECRET`, and `LENDLOOP_INBOUND_SECRET` with `npx convex env set NAME VALUE`. Use distinct production values and endpoints; never point the demo deployment at production n8n.
4. Import `n8n/error-handler.json`, then `n8n/request-notification.json` and `n8n/overdue-reminders.json` through n8n's **Import from File**. Confirm both main workflows' **Error Workflow** setting points to the imported error handler; n8n may reassign IDs on import. Publish/activate all three workflows. The exported files contain no credentials. Their Code nodes read the three `LENDLOOP_*` variables from the n8n process environment; Compose explicitly allows only the built-in `crypto` module and environment access for these trusted workflows. Do not grant workflow editing access to untrusted users.

To test request notifications, sign in as two isolated development users, create a request, and inspect the lender's Updates view, then approve it and inspect the borrower's view. The webhook must use its production path (`/webhook/lendloop-request`) while the workflow is active; the n8n test URL has a different signed path.

To test overdue reminders without touching a real loan, run `npx convex env set LENDLOOP_AUTOMATION_TEST_ALLOWED true` **only** on an isolated development Convex deployment, then run `npx convex run automationFixture:seedOverdue '{"lenderClerkUserId":"TEST_LENDER_SUBJECT","borrowerClerkUserId":"TEST_BORROWER_SUBJECT"}'`. The subjects must identify two onboarded test users in one society. This internal, repeatable fixture inserts its own unlisted synthetic item, approved request and loan ending yesterday; it never edits existing loans. Run the overdue workflow manually, check the borrower's Updates view and loan activity, and run it again to verify one reminder for the loan/date. Remove the flag with `npx convex env remove LENDLOOP_AUTOMATION_TEST_ALLOWED` afterward. Inspect n8n **Executions** and Convex `automationEvents`/`overdueReminders` for failures; retrying a failed execution or rerunning the daily workflow is safe after the lease expires.

### Signing and recovery contract

Both directions use HMAC-SHA256 with separate secrets. The canonical UTF-8 bytes are `UPPERCASE_METHOD + "\\n" + PATH_WITH_QUERY + "\\n" + 13_DIGIT_UNIX_MS + "\\n" + NONCE + "\\n" + EXACT_RAW_BODY`; GET uses an empty body. The signature is lowercase hex in `X-LendLoop-Signature`; the timestamp and UUID nonce use `X-LendLoop-Timestamp` and `X-LendLoop-Nonce`. Send `Content-Type: application/json` for POST. Convex verifies signatures and rejects timestamps outside five minutes, malformed headers, and previously used nonces before any service read/write. It prunes nonces older than one day. The n8n webhook verifies exact raw-body bytes and the five-minute window with `crypto.timingSafeEqual`; its event ID and Convex acknowledgement provide durable event deduplication. HTTPS is required for externally reachable endpoints.

Outbox dispatches claim a two-minute lease and retry transient failures up to five attempts with exponential backoff capped at one hour. Authentication/configuration failures become terminal immediately. A scheduled recovery callback handles interrupted dispatch actions. Reminder claims are unique by `overdue:<loanId>:<YYYY-MM-DD>` in a Convex transaction; concurrent workers cannot claim the same active lease. A five-minute Convex maintenance cron marks stale reminder leases failed so n8n can safely retry. An acknowledgement creates no duplicate notification if repeated. A queued event or claimed reminder is never labeled sent. For a future external email provider, exactly-once delivery would require provider-side idempotency because a provider can deliver before an acknowledgement is lost.

n8n HTTP nodes make at most three attempts for transient transport failures. They reuse the signed request on a node retry, so a lost response after Convex has accepted the request can turn the retry into a replay rejection; Convex's committed state remains correct, and rerunning the workflow signs a fresh request. Check Convex state before manually retrying a failed n8n execution.

The workflow JSON is regenerated with `node n8n/generate.mjs`; keep the three exports under version control. To replace n8n later, leave the domain mutations, outbox, reminder eligibility and idempotent claim/ack functions in Convex, replace only `automationDispatch.send` with a native delivery action, and replace the n8n 09:00 trigger with a Convex cron calling the same overdue functions. The current Convex maintenance cron only recovers stale leases; it does not send reminders.

For production, deploy a separately secured n8n instance behind HTTPS, provision separate per-environment secrets, restrict editor/admin access, validate the imported workflows against the pinned image, run signed end-to-end tests against synthetic loans, monitor terminal failures, and set a retention policy for user-facing automation history. Compose retains failed n8n execution data for 14 days (at most 1,000 records) and stores no successful execution payloads. Do not configure production secrets or activate production webhooks as part of local setup.

## Phase 6 administration

LendLoop has two application roles: `user` and LendLoop `admin`. The `/admin` area provides an overview, paged Users, Listings, Loans, Societies, Suggestions, Audit, and Automation views. Every admin read and write checks the authenticated Clerk subject against the Convex `users` record; hiding a route is never the authorization boundary. Trust badges are independent, manually assigned platform designations and do not verify identity. Admin loan oversight excludes handover contact details. Listing removal archives the item and removes it from discovery; existing confirmed loans and their terms remain available to the participants. Pending requests on a removed item cannot be approved. Deactivating a society preserves existing members and history, but blocks new selection.

### Provision the first admin

1. In the correct Clerk instance, find the intended operator's **Clerk user ID (subject)**. Have that person sign in to LendLoop once so `users.ensureCurrent` creates a normal Convex profile. Confirm the matching Clerk issuer and Convex deployment before proceeding.
2. From a trusted operator workstation authenticated to **that Convex deployment** with a deployment admin key, run `npx convex run --deployment dev admin:provisionInitial '{"clerkUserId":"user_REPLACE_WITH_CLERK_ID"}'` for development. For production, deliberately select the production deployment and use its own operator credentials. Do not put the key or subject in client code or a public script.
3. The internal mutation refuses to run if any admin already exists, promotes only the existing profile, and writes a `admin.provisioned` audit record attributed to the deployment operator. Sign out and back in to refresh the admin navigation.

There is no browser-callable admin promotion. Additional admin provisioning or recovery after the first admin requires a separately reviewed operator process; this command cannot be rerun. Do not grant a role by editing browser profile fields.

Run `npm test -- convex/admin.test.ts` for the admin authorization tests. The browser admin scenarios require an isolated development Clerk admin account and Convex data; set `E2E_CLERK_ADMIN_EMAIL` alongside the existing development E2E variables after provisioning that account. The current dashboard searches and filters loaded pages; use **Load more** to expand the result set. Overview counts stop at 1,001 records per indexed read and show a lower-bound marker when capped. This avoids an unbounded dashboard scan; larger deployments need aggregates and server-side search. Society creation refuses to proceed after 1,000 directory rows until a normalized-key index/backfill is added. Automation shows Convex delivery states without requiring a live n8n instance.

## Phase 7 editorial experience

The homepage follows one original SVG drill through discovery, a request, handover and return with GSAP/ScrollTrigger. Midnight Ink (`#152D3B`), Warm Paper (`#F6F2E9`) and Electric Lime (`#D9F36A`) replace the earlier palette; Space Grotesk and DM Sans load through `next/font`. Existing app layouts use the shared brand tokens without changing their business logic.

The fictional interactive society showcase is separate from the real Convex public catalog, which still returns only name and category. `/journal` contains original borrowing guidance. `/for-communities` describes a future concept, not an existing integration or partnership. See [design and motion notes](docs/DESIGN_SYSTEM.md) and [Phase 7 QA](docs/PHASE7_QA.md) for implementation details, screenshots, validation and limits. Phase 8 has not started.

## Internal application — Neighborhood Edit × Atlas

The authenticated marketplace now uses a photo-led editorial Explore grid, compact modal filters, four primary navigation destinations, borrowing/lending activity tabs, a personal lending shelf, a real account profile, and restrained updates/admin styling. Backend rules and existing routes are unchanged. See [design conventions](docs/DESIGN_SYSTEM.md) and [actual QA results and screenshots](docs/ATLAS_QA.md). With the local development server running, `node tests/visual/atlas-qa.mjs` renders synthetic, test-only internal screens at five widths without backend writes.
