# Phase 7 QA — 9 November 2026

## Implemented direction

An original lime-and-graphite SVG drill stays continuous across a Midnight Ink story: unused shelf, nearby discovery, illustrative request, handover, and a return loop. Warm Paper benefits and discovery lead into the real catalog. GSAP/ScrollTrigger and `@gsap/react` drive the homepage only; native scrolling, responsive media cleanup and reduced-motion text remain available. Space Grotesk and DM Sans use `next/font`.

Main implementation: `app/page.tsx`, `app/globals.css`, `app/layout.tsx`, `components/story/`, `components/marketing/marketing-shell.tsx`, `components/marketing/auth-nav.tsx`, `app/journal/page.tsx`, and `app/for-communities/page.tsx`. Tests, CI artifact retention and the design/product/architecture documentation were updated. ESLint now ignores generated Playwright reports so running browser QA does not lint third-party trace-viewer bundles.

## Actual checks

| Check                  | Result                                                                                                                                                                                                                              |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run format:check` | Passed                                                                                                                                                                                                                              |
| `npm run lint`         | Passed; 10 existing `no-img-element` warnings in functional screens                                                                                                                                                                 |
| `npm run typecheck`    | Passed                                                                                                                                                                                                                              |
| `npm test`             | 39 tests passed across 8 files                                                                                                                                                                                                      |
| `npm run build`        | Passed; homepage, journal and community page prerendered                                                                                                                                                                            |
| `npx playwright test`  | 11 passed; 28 authenticated scenarios skipped for missing isolated test-user credentials                                                                                                                                            |
| Viewports              | 360, 390, 768, 1280 and 1600px                                                                                                                                                                                                      |
| Browser behaviors      | Forward/backward story, overflow, radius controls, keyboard activation, reduced motion, live preference change, viewport resize, emulated touch scrolling, no-JavaScript narrative, journal navigation and sign-in redirects passed |
| Visual regression      | Updated desktop/mobile macOS baselines, then passed a normal comparison run                                                                                                                                                         |
| Lighthouse             | Not measured                                                                                                                                                                                                                        |

The final build needed a retry outside the filesystem sandbox after clearing only the generated Turbopack build cache: it had retained a CSS-worker local-port permission failure. The default build command and deployment configuration were not changed.

The public catalog rendered actual connected demo listings during local inspection. Backend tests continue to verify its exact name/category response and hidden/archive filtering. No backend source was changed. Successful account sign-in and the two-account borrowing UI were not exercised; those require isolated test accounts. Public navigation produced no captured page errors in the smoke test.

## Screenshots and visual review

Chromium captures were saved locally in the ignored `artifacts/phase7/` directory and are not included in the repository. Both `desktop-` (1280×900) and `mobile-` (390×844) prefixes are available for:

- `hero.png`
- `nearby.png`
- `request.png`
- `handover.png`
- `return.png`
- `our-story.png`
- `discovery.png`
- `tools.png`
- `journal.png`

Hero, neighborhood, request, handover, return, benefits, discovery, catalog and journal captures were visually inspected, including mobile layouts and the 360/768px test artifacts. Review found and corrected decorative horizontal overflow, a mobile drill/title overlap, clipped map buildings and a disappearing sign-in link while Clerk loaded. Screenshots supplement the behavioral assertions; they are not the only verification. Additional viewport screenshots live in the ignored `test-results/` folder and are uploaded by CI.

## Manual review on the Vercel demo

1. Review the illustration style, story pacing, full handover and return journey on a physical phone and desktop. Browser touch emulation is not a physical-device performance check.
2. Complete Clerk sign-in/sign-out, confirm the authenticated header switches to the dashboard, and check society onboarding.
3. With isolated lender/borrower accounts, check listing creation/photos, discovery, one-round offers, approval, return, private handover, notifications and admin screens under the shared fonts/tokens.
4. Check the disconnected/empty catalog state and verify the public network response still contains only name/category.
5. Measure Lighthouse against the deployed build if performance scores are needed. No score or real-device smoothness claim is made here.

No deploy, external integration, competitor comparison, invented impact metric or Phase 8 work was performed. Static mode preserves all story information in text with the original drill illustration; it does not reproduce all moving scenes. The authenticated layouts were rebranded through shared styling rather than rewritten.
