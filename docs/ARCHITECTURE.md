# Architecture

- **Frontend:** Next.js 16 App Router, TypeScript strict mode, Tailwind CSS, local shadcn-compatible Button, Lucide, and CSS design tokens.
- **Identity:** Clerk owns sign-in and user sessions. `proxy.ts` provides request context; protected layouts use `auth.protect()`.
- **Backend:** Convex owns the schema and functions. `ConvexProviderWithClerk` sends Clerk tokens. Mutations and protected queries derive the user from the verified Clerk subject.
- **Public catalog:** `tools.publicList` returns only tool name and category. No private data is delivered and hidden tools are excluded.
- **Onboarding:** `users.ensureCurrent` creates a minimal user; `societies.search` reads active society names; `users.selectSociety` verifies the selected society; `suggestions.create` stores only a pending suggestion.
- **Deployment:** Next.js is prepared for Vercel. Convex and Clerk require their own development and production configurations. Local n8n runs separately through Docker Compose and uses an HTTPS webhook tunnel for Convex Cloud dispatches.

The authenticated dashboard includes listing, request, loan and notification views. See [database](DATABASE.md) and [security and privacy](SECURITY_AND_PRIVACY.md).

## Phase 5 automation

```mermaid
sequenceDiagram
  participant U as User
  participant C as Convex
  participant N as n8n
  U->>C: Request or loan transition
  C->>C: Commit domain state and outbox event
  C->>N: Signed webhook (internal action)
  N->>N: Verify signature; prepare mock message
  N->>C: Signed acknowledgement
  C->>C: Idempotently record notification and delivery
  N->>C: 09:00 IST signed overdue page request
  C->>N: Bounded eligible loan IDs
  N->>C: Signed claim and completion
  C->>C: Unique daily reminder and sent status
```

`convex/automation.ts` owns outbox state, participant-only activity reads, overdue eligibility and reminder claims. `convex/automationDispatch.ts` is the replaceable delivery adapter; only its action calls n8n. `convex/http.ts` exposes narrow signed service endpoints. `convex/signing.ts` defines the shared canonical HMAC format. n8n has no Clerk session and no database credential. It cannot approve loans or determine overdue eligibility. The in-app notification record is the Phase 5 mock delivery result, and both the notification center and loan activity query it reactively.

## Phase 2 marketplace architecture

Authenticated dashboard routes call Convex queries and mutations directly. `tools` stores owner, selected society, listing fields, active/archived state, and ordered photo IDs. `listingPhotos` maps Convex storage IDs to an owner and optional listing. `uploadTickets` are short-lived, owner-bound upload attempts with a SHA-256 fingerprint of the optimized file. The client requests a Convex upload URL, POSTs optimized JPEG bytes, registers the storage ID after backend format/size checks, then attaches photo IDs to its listing. New listings begin unlisted and become active only after attachment succeeds. Image order is the order of `tools.photoIds`; first is cover. Daily Convex crons scan storage in pages and remove unreferenced files and expired ticket records older than 48 hours.

Discovery queries use indexed active tools for each eligible society. Haversine distance is calculated from society centers. The initial implementation checks the first 200 active societies and at most 40 active tools per society, returning up to 100 matches. It needs a geographic index and pagination as the directory grows. Search and filters are applied to these bounded candidates. No external maps or geocoding service is called.

Clerk authenticates; Convex derives the owner and society from the verified subject. Public catalog responses explicitly map to name and category. Protected listing views expose limited owner display names, pricing and image URLs. Phase 3 borrowing functions are in `convex/requests.ts` and `convex/loans.ts`, with shared date and identity helpers in `convex/borrowing.ts`.

## Phase 3 transaction architecture

A request stores borrower/lender IDs derived from the verified Clerk subject and listing owner, inclusive `YYYY-MM-DD` dates, and a rate/total snapshot in INR paise. `pending → approved | declined | cancelled` is enforced by separate mutations. Approval reads indexed loans for the tool through the requested end date, rejects any inclusive overlap with a non-returned loan, then inserts a loan and approves the request in one Convex transaction. Concurrent approvals conflict through Convex optimistic concurrency; only a non-overlapping reservation can commit. The loan lifecycle is `reserved → return_pending → returned`, or `reserved → returned` when the lender records it directly. Overdue is derived in Asia/Kolkata, not stored. The indexed reservation scan is correct but will need partitioning if one tool accumulates thousands of historical loans.

Loan detail and optional `loanHandoverDetails` are returned only to the borrower or lender named on the loan. Pending request read models expose only display names, terms and listing imagery. No contact fields are copied into requests, loan activity or public profiles. The loan page presents chronology from immutable timestamps instead of a separate event table. Phase 6 admin-wide loan reads use a separate, contact-free projection.

## Phase 4 price decisions

An optional borrower offer on the existing request distinguishes negotiation from a standard request. Only the lender can accept it, counter once between the offer and listed-rate snapshot, keep that listed rate, or decline. Countering and keeping the listed rate move the request to `awaiting_borrower`; only that borrower may accept or walk away. Every successful path calls the same `confirm` function in `convex/requests.ts`, which checks the active listing, dates and conflicting loans before inserting exactly one loan and updating the request in one Convex mutation. Pending offers do not reserve dates. Convex optimistic concurrency prevents two overlapping final acceptances from both committing. The public catalog remains name and category only.

## Phase 6 admin boundary

`convex/admin.ts` is the only public admin data/action surface. Each query and mutation resolves the Clerk subject and requires the stored `admin` role. `admin:provisionInitial` is an internal mutation callable only through deployment-operator tooling, and only before any admin exists. Admin actions and their minimal `adminAudit` rows commit in the same Convex transaction. `app/admin` requires Clerk authentication, while `components/admin/admin.tsx` provides role-aware navigation and bounded pages. The backend remains the security boundary. Admin loan projections deliberately omit `loanHandoverDetails`, phone, pickup point, and instructions. Phase 5 delivery and overdue rules remain unchanged.

## Phase 7 frontend boundary

`app/page.tsx` composes the marketing shell, homepage-only `ScrollStory` client component, `SocietyShowcase` client control and existing `PublicCatalog`. The story uses GSAP, ScrollTrigger and `@gsap/react`; one SVG instance moves through coordinated scene layers, with scoped contexts and media cleanup. CSS sticky positioning retains native scrolling; stacked layouts reduce the stage to a 46svh block. All narrative copy is server-rendered and remains available without animation. Reduced-motion mode does not create a timeline.

`components/marketing/auth-nav.tsx` keeps the sign-in link visible during Clerk loading and switches to the dashboard for authenticated users. Server-rendered `/journal` and `/for-communities` share the editorial shell. Shared tokens and `next/font` update the restrained authenticated UI; no Convex APIs, permissions, transaction state or deployment configuration changed. Public catalog privacy remains the explicit name/category projection. See [design system](DESIGN_SYSTEM.md) and [QA](PHASE7_QA.md).

## Internal editorial redesign

The internal redesign reuses `marketplace.tsx`, `borrowing.tsx`, `notifications.tsx` and the existing admin markup. `DashboardShell` groups navigation without removing routes. `Profile` replaces the placeholder using existing account and society queries. Compact filtering is inline; local UI state controls scope/category/search/price/sort and the completed-return view. No backend function, permission, schema or transaction was changed.

`tests/visual/atlas-qa.mjs` bundles the real presentation components with explicit synthetic query/identity adapters using a development-only esbuild dependency. Playwright intercepts test-only URLs; no fixture route or auth bypass is shipped in Next. Mutations throw in this renderer. It validates presentation and local controls, not the live Clerk/Convex bridge or transaction subscriptions.
