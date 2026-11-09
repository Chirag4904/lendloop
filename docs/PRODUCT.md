# Product

LendLoop helps neighbors lend or rent everyday items. Phase 1 establishes a polished public entry point and society-first onboarding. A user can eventually be both lender and borrower. The intended roles are `user` and LendLoop-managed `admin`; Trusted Lender and Trusted Borrower are independent badges assigned by LendLoop.

Lending flow: browse by society, optionally expand to 500 m or 1 km, request dates, lender approves or declines, participants agree, then private handover details become available. Paid requests may include one borrower offer below the listing price. The lender can accept, counter strictly between offer and list price, or keep the list price. The borrower accepts that final price or walks away. No further bargaining. Requests and returns were implemented in Phase 3; one-round negotiation is implemented in Phase 4.

Future marketing ideas such as society-app partnerships and competitor comparisons are concepts only. There are no claimed integrations, usage statistics, testimonials, or verified residency checks in the current product.

## Implemented in Phase 2

A signed-in, onboarded neighbor can list a tool, preview it, add up to five photos, capture with a camera, manage photo order and cover, edit, unlist, relist or archive. Explore defaults to My Society with 500 m and 1 km scopes, text/category/free-paid filters and sorting. Detail pages show full listing information and a responsive gallery. Distance comes from society centers and is labeled approximate. Active means listed for discovery, not date-checked availability. Phase 3 adds requests, approval or decline, reserved loans, returns and optional private handover details. Phase 4 adds one-round negotiation for paid listings. Payments remain future work.

## Implemented in Phase 3

Any onboarded user may borrow or lend. Borrowers request 1–30 inclusive Kolkata calendar days at a listing’s free or INR daily rate. The owner approves or declines. Pending requests do not reserve dates; approved requests do. My Requests and Incoming Requests show live status. The borrower can report a return and the lender confirms it; the lender can also record a return directly. Participants may share optional handover details after approval. Completed loans remain in history. No money is collected.

## Phase 6 administration

LendLoop has only `user` and platform `admin` roles. LendLoop admins can review all loan statuses and prices without participant contact details, archive any listing, manually grant or revoke Trusted Lender and Trusted Borrower independently, manage the curated society directory, moderate suggestions, inspect an audit trail, and view automation delivery states. Badges denote an administrator assignment, not identity or residency verification. Users keep their own listing, borrowing, negotiation, return, and society-choice permissions. An archived listing leaves confirmed loan history intact. Inactive societies remain linked to historical records but cannot be newly selected. Suggestion approval never automatically moves a submitter into the society.

## Phase 7 public experience

The editorial homepage follows one drill through six chapters: waiting in a cupboard, found next door, requested, handed over, put to use, and returned. Benefits use qualitative messaging without invented usage, savings or environmental statistics. A labeled fictional radius demonstration precedes the unchanged real public catalog. Sign-in leads into the existing marketplace. Journal guidance and a secondary future community-integration concept live at `/journal` and `/for-communities`. No competitor comparison or partnership is claimed. See [design notes](DESIGN_SYSTEM.md) for responsive and static behavior.
