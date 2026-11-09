<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## LendLoop Phase 2 conventions

`convex/tools.ts` owns listing validation, owner authorization and bounded society-center Haversine discovery. `convex/photos.ts` owns Convex upload tickets, storage registration, photo attachment and the 48-hour cleanup cron. `components/listing-form.tsx` is the create/edit flow; `components/marketplace.tsx` renders Explore, My Listings and detail. Public catalog responses must remain exactly name and category. Preserve the generated Next.js rule block above and read the installed Next docs before editing routes. Keep borrowing, payments and n8n workflows out of Phase 2.

## LendLoop Phase 3 conventions

`convex/requests.ts` owns request creation, transitions and the transactional overlap check. `convex/loans.ts` owns returns and private handover details; `convex/borrowing.ts` owns Kolkata calendar-day helpers and participant identity. Pending requests do not reserve dates. Keep public catalog output at name and category, and keep private handover data out of request/listing read models. No negotiation, payment or n8n workflow in Phase 3.
