# Implementation plan

## Completed in Phase 1

Project setup, design tokens and landing page; Clerk/Convex integration code; minimal profile sync; society search/selection/suggestions; dashboard route shells; schema and public catalog query; backend and browser test suites; CI; local n8n Compose; documentation.

## Setup needed to use it live

1. Configure Clerk development keys and activate its Convex integration.
2. Link a Convex development deployment, set its Clerk issuer environment variable, and run `npx convex dev` and `npx convex codegen`.
3. Add active societies through authorized deployment administration, using independently sourced directory coordinates.
4. Run the checks and inspect the authenticated onboarding flow with an isolated test account.

## Later phases, pending review

After Phase 3 review, design one-round negotiation, notification adapters and n8n workflows, retention/deletion processes, and eventually payments and AI.

## Completed in Phase 2

Listing creation and editing, Convex File Storage photo pipeline, in-app camera and native capture fallback, listing management, authenticated discovery with approximate society-center radius, tool detail gallery, backend authorization and privacy tests are implemented. CI retains formatting, lint, typecheck, Vitest, build and Playwright gates. Authenticated browser tests require a separate test Clerk account and development Convex deployment. Hardware camera capture still needs a manual Android/iOS check when available.

Phase 3 adds borrowing requests, owner approval/decline, transactional date reservations, loan returns and optional participant-only handover details. Negotiation, payments, n8n workflows, AI and society-admin roles remain deferred.

## Completed in Phase 3

The borrower can submit, track and cancel pending requests; the lender can approve or decline. Approval atomically reserves dates and snapshots the agreed terms in a loan. Borrowers report returns; lenders close them. Optional handover details are private to participants. Overdue derives from Kolkata dates. Convex tests cover authorization, pricing, transitions, overlap, concurrency, returns and archive history. Authenticated two-account browser tests require isolated development credentials. Before production launch, add pagination for high-volume histories, a retention policy, and explicit admin access/audit rules.
