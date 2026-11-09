# Architecture

- **Frontend:** Next.js 16 App Router, TypeScript strict mode, Tailwind CSS, local shadcn-compatible Button, Lucide, and CSS design tokens.
- **Identity:** Clerk owns sign-in and user sessions. `proxy.ts` provides request context; protected layouts use `auth.protect()`.
- **Backend:** Convex owns the schema and functions. `ConvexProviderWithClerk` sends Clerk tokens. Mutations and protected queries derive the user from the verified Clerk subject.
- **Public catalog:** `tools.publicList` returns only tool name and category. No private data is delivered and hidden tools are excluded.
- **Onboarding:** `users.ensureCurrent` creates a minimal user; `societies.search` reads active society names; `users.selectSociety` verifies the selected society; `suggestions.create` stores only a pending suggestion.
- **Deployment:** Next.js is prepared for Vercel. Convex and Clerk require their own development and production configurations. Local n8n is separate Docker Compose infrastructure and has no workflows yet.

The authenticated dashboard now includes listing creation, management, discovery and detail routes. Requests, loans, automation adapters, and contact disclosure are later phases. See [database](DATABASE.md) and [security and privacy](SECURITY_AND_PRIVACY.md).

## Phase 2 marketplace architecture

Authenticated dashboard routes call Convex queries and mutations directly. `tools` stores owner, selected society, listing fields, active/archived state, and ordered photo IDs. `listingPhotos` maps Convex storage IDs to an owner and optional listing. `uploadTickets` are short-lived, owner-bound upload attempts with a SHA-256 fingerprint of the optimized file. The client requests a Convex upload URL, POSTs optimized JPEG bytes, registers the storage ID after backend format/size checks, then attaches photo IDs to its listing. New listings begin unlisted and become active only after attachment succeeds. Image order is the order of `tools.photoIds`; first is cover. Daily Convex crons scan storage in pages and remove unreferenced files and expired ticket records older than 48 hours.

Discovery queries use indexed active tools for each eligible society. Haversine distance is calculated from society centers. The initial implementation checks the first 200 active societies and at most 40 active tools per society, returning up to 100 matches. It needs a geographic index and pagination as the directory grows. Search and filters are applied to these bounded candidates. No external maps or geocoding service is called.

Clerk authenticates; Convex derives the owner and society from the verified subject. Public catalog responses explicitly map to name and category. Protected listing views expose limited owner display names, pricing and image URLs. Borrowing requests and transactions are not implemented.
