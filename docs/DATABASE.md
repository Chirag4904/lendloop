# Database

Convex schema is defined in `convex/schema.ts` with validators and indexes.

| Table                | Current purpose                                                                                                                           | Key indexes              |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `users`              | Clerk subject, display name, optional society, role and independent trust flags, timestamps                                               | Clerk subject, society   |
| `societies`          | LendLoop-owned directory entry: name, city, locality, coordinates, active/inactive status, timestamps                                     | status                   |
| `societySuggestions` | Authenticated user's proposed society and pending/approved/rejected status, timestamps                                                    | user, status             |
| `tools`              | Foundation fields for active public catalog: owner, society, name, category, condition, description, optional INR daily price, timestamps | active, society + active |

The eight tool categories are Power Tools, Garden, Kitchen, Electronics, Camping & Outdoors, Sports & Fitness, Home & Cleaning, and Other. Public clients can only call the read-only `tools.publicList`; there is no Phase 1 tool write function. Only the Convex Dashboard or a controlled operator migration can add active societies. Users cannot set their own role or trust flags.

Automation events, reminders and audit logs remain planned. Retention and deletion policy needs a separate review before production launch.

## Phase 2 schema additions

`tools` now has `by_owner`, optional `archived`, and optional ordered `photoIds` for compatibility with existing rows. Conditions include Like New (`likeNew`) and Well Used (`wellUsed`); legacy `new` remains readable. `pricing.dailyAmount` is integer INR paise, or absent for free. `listingPhotos` contains `ownerId`, optional `toolId`, `storageId`, and creation time, with owner, owner+tool, tool and storage indexes. `uploadTickets` contains `ownerId`, a SHA-256 fingerprint and creation time, indexed for expiration cleanup. Photos are removed from storage when detached from a listing. Archived listings remain in the database and cannot be relisted. Future transaction tables can reference them.

## Phase 3 schema

| Table                 | Contents                                                                                                                                       | Indexes                                               |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `borrowRequests`      | Tool, borrower and lender IDs; inclusive dates; duration, immutable INR paise terms; pending/approved/declined/cancelled status and timestamps | borrower, lender, tool + borrower                     |
| `loans`               | One approved request, confirmed dates and terms, reserved/return_pending/returned status and return timestamps                                 | request, tool + status + start date, borrower, lender |
| `loanHandoverDetails` | Optional phone, pickup point and instructions supplied by one loan participant                                                                 | loan + author                                         |

Historical loans retain confirmed terms and remain after listing archive. Returned loans are excluded from blocking overlaps. The public catalog remains exactly name and category.
