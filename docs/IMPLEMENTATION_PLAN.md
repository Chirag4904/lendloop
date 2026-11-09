# Implementation plan

## Completed in Phase 1

Project setup, design tokens and landing page; Clerk/Convex integration code; minimal profile sync; society search/selection/suggestions; dashboard route shells; schema and public catalog query; backend and browser test suites; CI; local n8n Compose; documentation.

## Setup needed to use it live

1. Configure Clerk development keys and activate its Convex integration.
2. Link a Convex development deployment, set its Clerk issuer environment variable, and run `npx convex dev` and `npx convex codegen`.
3. Add active societies through authorized deployment administration, using independently sourced directory coordinates.
4. Run the checks and inspect the authenticated onboarding flow with an isolated test account.

## Later phases, pending review

After Phase 2 review, design request/approval and one-round negotiation state machines, loans and return tracking, participant contact disclosure, notification adapters and n8n workflows, retention/deletion processes, and eventually payments and AI.

## Completed in Phase 2

Listing creation and editing, Convex File Storage photo pipeline, in-app camera and native capture fallback, listing management, authenticated discovery with approximate society-center radius, tool detail gallery, backend authorization and privacy tests are implemented. CI retains formatting, lint, typecheck, Vitest, build and Playwright gates. Authenticated browser tests require a separate test Clerk account and development Convex deployment. Hardware camera capture still needs a manual Android/iOS check when available.

Next phase, after review: borrowing requests and owner approval/decline, date-aware availability, negotiation, loan state and participant contact disclosure. Payments, n8n workflows, AI and society-admin roles remain outside Phase 2.
