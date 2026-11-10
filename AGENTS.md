<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## LendLoop Phase 2 conventions

`convex/tools.ts` owns listing validation, owner authorization and bounded society-center Haversine discovery. `convex/photos.ts` owns Convex upload tickets, storage registration, photo attachment and the 48-hour cleanup cron. `components/listings/listing-form.tsx` is the create/edit flow; `components/marketplace/` renders Explore, My Listings and tool detail. Public catalog responses must remain exactly name and category. Preserve the generated Next.js rule block above and read the installed Next docs before editing routes. Keep borrowing, payments and n8n workflows out of Phase 2.

## LendLoop Phase 3 conventions

`convex/requests.ts` owns request creation, transitions and the transactional overlap check. `convex/loans.ts` owns returns and private handover details; `convex/borrowing.ts` owns Kolkata calendar-day helpers and participant identity. Pending requests do not reserve dates. Keep public catalog output at name and category, and keep private handover data out of request/listing read models. No negotiation, payment or n8n workflow in Phase 3.

## LendLoop Phase 5 conventions

`convex/automation.ts` owns transactional outbox state, overdue eligibility, reminder claims, and participant-only activity queries. `convex/automationDispatch.ts` is the replaceable n8n delivery action; `convex/http.ts` exposes signed service endpoints and `convex/signing.ts` defines their canonical HMAC format. Keep external calls out of mutations, keep handover details out of automation payloads, and keep n8n from deciding borrowing or overdue state. The only active overdue schedule is the n8n 09:00 Asia/Kolkata workflow; Convex's automation cron only recovers stale leases and prunes nonces.

## LendLoop Phase 6 conventions

`convex/admin.ts` owns LendLoop-only admin checks, bounded admin reads, trust and moderation mutations, society validation, first-admin provisioning, and transactional audit writes. The first-admin mutation stays internal and requires deployment-operator credentials. Admin loan projections never return `loanHandoverDetails`; public catalog output remains exactly name and category. Society deactivation and listing archiving preserve historical relationships. Keep the dashboard independent of n8n availability. Search and filters currently operate on loaded pages, and overview counts are capped at 1,000 until aggregates are introduced.

## LendLoop Phase 7 conventions

`components/story/scroll-story.tsx` owns the homepage-only GSAP/ScrollTrigger timeline and media cleanup; `drill.tsx` is the single original SVG object and `scene-art.tsx` supplies illustrative layers. Keep narrative copy readable without animation, preserve reduced-motion behavior and native scrolling, and do not add per-frame React state. `society-showcase.tsx` is explicitly fictional and separate from authenticated discovery. Shared identity is Midnight Ink, Warm Paper and Electric Lime with Space Grotesk/DM Sans through `next/font`; existing color-token names remain compatibility aliases. Public catalog responses remain exactly name and category. Journal articles must not fabricate research, dates, comparisons or impact statistics. Community integrations remain future concepts. See `docs/DESIGN_SYSTEM.md` and `docs/PHASE7_QA.md`; stop after Phase 7 until user review.

## Internal application design conventions

Keep the four primary DashboardShell destinations; requests/incoming remain existing routes under My Activity, with Profile and authorized Admin in the header. ToolCard is shared by Explore and My Listings. Filters are inline on Explore; retain keyboard behavior and all query arguments. Request progress must reflect recorded statuses, never infer a pickup or invent a completed step. Profile trust flags remain admin-assigned. `tests/visual/` is test-only synthetic rendering, never an app route or authentication bypass. See `docs/ATLAS_QA.md` for the distinction between fixture UI checks and live transaction verification.

## Design System & UI Implementation Rules

- Before UI changes, read [the design system](docs/DESIGN_SYSTEM.md) and [UI architecture](docs/UI_ARCHITECTURE.md), then inspect the existing components, styles and callers.
- Reuse established tokens, fonts, spacing, components and interaction patterns. Keep marketing expressive and transactional screens usable. Avoid parallel design systems.
- Build mobile-first. Preserve semantics, focus, keyboard operation and reduced-motion behavior. Verify responsive behavior and review desktop and mobile Playwright screenshots for meaningful visual changes.
- Update the design docs when introducing an intentional pattern. Preserve Clerk, Convex and authorization behavior, including private data boundaries.
