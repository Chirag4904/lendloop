# Phase 7 design system

## Identity

“Good things deserve to go around.” The public experience follows one original, layered SVG cordless drill from an unused shelf to discovery, agreement, handover, and return. It uses an editorial ink canvas before opening into warm paper benefits, society discovery, and the real catalog. The authenticated app keeps its existing functional layouts and uses the new shared colors and fonts.

| Token           | Value     | Role                                                    |
| --------------- | --------- | ------------------------------------------------------- |
| `--brand-ink`   | `#152D3B` | Midnight Ink; dark story, text and primary app controls |
| `--brand-paper` | `#F6F2E9` | Warm Paper; editorial background                        |
| `--brand-lime`  | `#D9F36A` | Electric Lime; dark-surface CTAs and discovery accents  |
| `--muted`       | `#536269` | Secondary text on light surfaces                        |
| `--paper`       | `#FFFFFF` | Functional cards and inputs                             |

Existing `--blue`, `--blue-dark`, `--blue-soft`, `--cream` and `--tangerine` names remain compatibility tokens for existing components, now using the new identity. Do not use lime for small text on paper. Color-pair contrast tests cover ink/paper, ink/lime, secondary text and primary controls.

Space Grotesk headings and DM Sans body/interface text use `next/font/google`, Latin subsets and `display: swap`; the generated fonts are served locally by Next. Georgia supplies a few italic editorial accents without another download. The original drill SVG has no external assets, listing photos, fonts or licensing dependencies.

## Story and motion

`components/story/scroll-story.tsx` owns one scrubbed GSAP timeline with ScrollTrigger and the supported `@gsap/react` `useGSAP` integration. `drill.tsx` owns the single central object. `scene-art.tsx` owns the decorative shelf, apartments, illustrative listing, handover path and return loop. Transforms and opacity update directly without React state updates on each scroll frame. `gsap.matchMedia` scopes responsive and reduced-motion setup; both media and React contexts revert on changes/unmount.

Desktop uses a CSS-sticky illustration beside five naturally scrolling chapters. Mobile (up to 760px) uses a compact 260px sticky illustration above vertically flowing copy. There is no scroll interception, full-screen mobile pin, snapping or artificial loading delay. Keyboard and anchor navigation retain native behavior. The journey reverses when scrolling backward.

Reduced motion omits the timeline, shows the original static drill and keeps every chapter's copy, request sequence and CTA available. Server-rendered content also remains readable when JavaScript is disabled; the radius control requires JavaScript. The catalog still requires its existing Convex client connection. A skip link, semantic headings, visible focus styles and minimum-size controls support navigation.

## Public pages

- `/`: five story chapters, three qualitative benefits, fictional interactive radius demonstration, real public catalog, trust/borrowing explanation, final CTA and footer.
- `/journal`: two original guidance articles anchored at `#before-you-buy` and `#how-neighborhood-lending-works`. No fabricated publication dates, competitor claims or research.
- `/for-communities`: a clearly labeled future integration concept. MyGate is a category example; no partnership or integration is claimed.

The society showcase has explicitly fictional names and toggles My Society / Within 500 m / Within 1 km. It never queries resident or society records. The listing and agreement shown in the animation are illustrations, not an embedded transaction.

## Privacy and performance

`tools.publicList` remains unchanged: the validated response and explicit projection contain exactly `name` and `category`. No public photos, owner data, pricing, storage IDs, society IDs or handover data were added. Authentication and all borrowing, negotiation, return, moderation and automation rules are unchanged.

GSAP is imported only by the homepage story. Journal, benefits, trust copy and page shells use server components. Font loading is optimized by Next. No raster hero, WebGL, video, remote image request or per-frame React rendering is needed. The SVG wrappers reserve dimensions to avoid asset layout shifts. Lighthouse has not been measured; no performance score is claimed.

## Validation and limits

Playwright exercises 360, 390, 768, 1280 and 1600px, reversible transforms, horizontal overflow, radius toggles, reduced motion, keyboard activation, JavaScript-disabled reading, navigation and sign-in redirects. macOS hero image baselines cover desktop/mobile; all platforms run responsive assertions. CI uploads browser artifacts on success and failure. Physical touch feel and authenticated screens still require review with real test accounts. CSS branding changes do not substitute for authenticated visual QA.

The SVG is deliberately an editorial illustration, not photorealistic. Static mode retains the narrative in text rather than replaying each moving scene. There are no competitor comparisons, external integrations, impact measurements or new backend features in Phase 7.

## References consulted

The React integration and media cleanup follow [GSAP's React documentation](https://gsap.com/resources/React/) and [matchMedia documentation](<https://gsap.com/docs/v3/GSAP/gsap.matchMedia()/>). The [Dribbble scrollytelling collection](https://dribbble.com/search/scrollytelling) was used for broad composition research; artwork and layouts here are original. The Awwwards storytelling category could not be fetched in this session, so no claim of inspecting those live sites is made.

## Internal application — The Neighborhood Edit × Atlas

The application uses the same Midnight Ink, Warm Paper, Electric Lime, Space Grotesk and DM Sans identity. Additional semantic surfaces are `--surface-muted` (#EBECE2), `--surface-selected` (#E7EDCF) and `--border-strong` (#A5B0A5). Lime identifies navigation; photographic inventory leads Explore and My Listings. No marketing scroll timeline runs in transactional screens.

`DashboardShell` exposes Explore, My Activity, My Listings and Updates. Borrowing and Incoming remain distinct existing routes, connected by activity tabs. Profile and authorized Admin remain in the header. Below 1000px, the four destinations move to a safe-area-aware bottom bar. `ToolCard` remains shared; Explore uses an even photo-led grid and a compact inline filter console. Listing status indicates discoverability, not date-specific availability. User photos are unchanged, reserved by aspect ratio, and card images load lazily.

Search, category chips, society scope, price, sorting and reset are available directly on the Explore page. Mobile category chips scroll within their own region. Request progress reflects real states; it does not invent a pickup/borrowed event. Completed returns filters the currently returned loans in each existing request list. Existing confirmations, negotiations and return actions remain intact.

Profile displays only the current account and administrator-assigned trust flags. Society labels reuse the existing bounded directory search; if the selected society is outside its first 20 results or inactive, the UI honestly falls back to “Your selected society.” A backend lookup was deliberately not introduced. Notification delivery and sent states retain distinct labels. See [internal UI QA](ATLAS_QA.md).

## Listing Studio

Create and edit use the same Listing Studio in `components/listing-form.tsx`: essentials, optional photos and terms beside a live preview. The preview uses only the entered details and the current actual cover image; when there is no photo it displays a neutral placeholder. On smaller screens it follows the form. The existing validation, review, upload retry, camera, photo ordering and save flow remain authoritative.
