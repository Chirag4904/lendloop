# Implementation plan

## Completed in Phase 1

Project setup, design tokens and landing page; Clerk/Convex integration code; minimal profile sync; society search/selection/suggestions; dashboard route shells; schema and public catalog query; backend and browser test suites; CI; local n8n Compose; documentation.

## Setup needed to use it live

1. Configure Clerk development keys and activate its Convex integration.
2. Link a Convex development deployment, set its Clerk issuer environment variable, and run `npx convex dev` and `npx convex codegen`.
3. Add active societies through authorized deployment administration, using independently sourced directory coordinates.
4. Run the checks and inspect the authenticated onboarding flow with an isolated test account.

## Later phases, pending review

After Phase 5 review, decide the production retention/deletion policy and whether to configure production n8n. Payments and AI remain later work.

## Completed in Phase 2

Listing creation and editing, Convex File Storage photo pipeline, in-app camera and native capture fallback, listing management, authenticated discovery with approximate society-center radius, tool detail gallery, backend authorization and privacy tests are implemented. CI retains formatting, lint, typecheck, Vitest, build and Playwright gates. Authenticated browser tests require a separate test Clerk account and development Convex deployment. Hardware camera capture still needs a manual Android/iOS check when available.

Phase 3 adds borrowing requests, owner approval/decline, transactional date reservations, loan returns and optional participant-only handover details. Phase 4 adds one-round price negotiation. Phase 5 adds n8n automation. Payments, AI and society-admin roles remain deferred.

## Completed in Phase 5

Successful request, negotiation and return transitions now insert transactional outbox events and schedule signed n8n delivery. The importable request, overdue and error workflows, signed Convex HTTP actions, nonce replay protection, bounded retries, daily reminder claims, notification center, loan activity, and pinned local Compose configuration are implemented. Convex retains the business rules and can later swap the n8n delivery action and daily trigger. Live workflow import/execution and an HTTPS tunnel require local operator configuration; no production n8n secrets or webhook were activated.

## Completed in Phase 4

Paid listings offer a standard request or one borrower offer. The owner can accept, counter once, keep the listed price, or decline the request. The borrower can accept the final price or walk away. All confirmed paths reuse the Phase 3 reservation transaction; request and loan prices are snapshotted in integer INR paise. My Requests and Incoming Requests show live price decisions and a compact timeline. Backend tests cover pricing, authorization, state changes and conflicting final acceptances. Authenticated browser tests require isolated development accounts.

## Completed in Phase 3

The borrower can submit, track and cancel pending requests; the lender can approve or decline. Approval atomically reserves dates and snapshots the agreed terms in a loan. Borrowers report returns; lenders close them. Optional handover details are private to participants. Overdue derives from Kolkata dates. Convex tests cover authorization, pricing, transitions, overlap, concurrency, returns and archive history. Authenticated two-account browser tests require isolated development credentials. Before production launch, add pagination for high-volume histories, a retention policy, and explicit admin access/audit rules.
