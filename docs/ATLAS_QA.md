# Internal application QA

The Neighborhood Edit × Atlas redesign reuses the existing query/mutation surfaces, functional forms and permission checks. It changes `dashboard-shell.tsx`, `dashboard-view.tsx`, `marketplace.tsx`, `borrowing.tsx`, `notifications.tsx`, adds `profile.tsx`, and extends shared CSS. Public homepage behavior and backend code are unchanged by this redesign.

## Screenshots

Actual Chromium captures of the real React components with synthetic data are in [`../artifacts/atlas/`](../artifacts/atlas/). Every image is labeled as a visual QA fixture. Each of `explore`, `listings`, `requests`, `incoming`, `detail`, `notifications`, `profile` and `admin` has captures at **360, 390, 768, 1280 and 1440px**, named `<view>-<width>.png`.

Desktop/mobile captures were visually reviewed across the major screens. Iteration tightened mobile category controls, ensured photos finish loading for screenshots, corrected native filter labels, removed old blue request accents, and fixed lender-facing “Your decision” wording. Fixed bottom navigation appears partway down full-page screenshots because it remains attached to the viewport; page content can scroll beneath it with bottom clearance.

## Actual validation

- Fixture browser run: 40 page/viewport combinations passed overflow checks; search, free-price filtering, reset, completed returns, lender-facing progress wording and Escape dismissal checked. No captured page errors. This is presentation testing, not live-service validation.
- Vitest: 39 tests passed across 8 files, including privacy, borrowing, negotiation and admin rules.
- Existing Playwright suite: 11 passed; 29 authenticated scenarios skipped because isolated test credentials are absent. Existing selectors were updated for new headings and inline filters, and 1440px was added to marketplace checks.
- Production build and TypeScript passed. Lint has the existing image optimization warnings. No Lighthouse score measured.

## Limits and manual review

Live sign-in completion, Convex subscription updates, listing upload/edit, two-account borrowing/negotiation/returns, notification delivery and admin mutations were **not** exercised by the fixture renderer. Use isolated accounts to verify these on the deployment. No live mutations were made, and no production records were modified. Admin screenshots cover Overview; the existing administrative pages retain their functional markup and shared table/card styling, but their populated data states need live visual review.

The selected society name can be unavailable through the existing bounded directory search; the UI then uses a generic selected-society label. The first photo-bearing result is visually emphasized, not labeled as verified availability or a manually curated recommendation. Product images use the existing upload pipeline and authentic photo URLs; responsive layout and lazy loading do not introduce a new server image-optimization service. Profile has no new personal-data collection or self-assigned trust controls. Physical-phone touch ergonomics and account-menu behavior still need manual review.

No deployment, backend feature or further product phase was performed.
