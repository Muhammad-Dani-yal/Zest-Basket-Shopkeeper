# Project audit — 2 November 2026

Scope: main React Native app, its 26 reference screen states, the preserved web portal, and backend. Existing workspace changes were preserved.

## Changes

- Added an inventory Restock Planner. It sorts products with five or fewer available units, subtracts reservations, and suggests enough replenishment for 15 available units. Each recommendation opens the existing product editor; it never changes stock automatically.
- Added All Stock / Needs Restock filters, with reset through Clear Filters. Search now ignores surrounding whitespace.
- Added dashboard Preparation Priority, oldest preparation first, with elapsed minutes, a ten-minute target warning, and direct preparation navigation. Values update when dashboard data refreshes; this is not a background alarm.
- Dashboard today's sales uses the device's local calendar day and delivery update time rather than UTC order-placement day.
- Reject negative stock and edits to deleted/nonexistent products; a missing product lookup now returns a clear error.
- Reject tickets with a missing description and handle login with an omitted phone without a TypeError.
- Generate unique demo order/ticket IDs, including multiple creations in one millisecond.
- Derive settlement from amount minus commission, avoiding independently rounded totals. Regression: Rs 105 = Rs 11 commission + Rs 94 settlement.
- Make local logout idempotent so repeated logout remains safe.

## Automated coverage of the 26 reference states

These are renderer/service checks, not a claim of 26 physical-device visual reviews.

| # | State | Current automated check |
|---|---|---|
| 1 | Welcome | Native rendering, splash completion, registration navigation |
| 2 | Register | Required-field errors; local registration and password non-storage |
| 3 | Login | Demo login, malformed credentials, logout/session protection |
| 4 | Dashboard | Session bootstrap, home navigation, dynamic orders, priority queue and preparation shortcut |
| 5 | Inventory | Search/reset, new restock filter, CRUD and stock guards |
| 6 | Add/edit product | Save, edit quantity, stale-edit rejection, image mapping |
| 7 | Orders | New/Ready/Preparing tabs and detail navigation |
| 8 | Order details | Accept and preparation transition, duplicate transition rejection |
| 9 | Receipt | Navigation, PDF adapter and escaped receipt contents |
| 10 | Rider | Invalid/correct/reused OTP, handover and demo delivery |
| 11 | Packing | Checklist, missing-item rejection and confirmation |
| 12 | Earnings | Ledger totals, exact reconciliation and duplicate delivery rejection |
| 13 | Reports | Sales overview rendering; web date-range checks |
| 14 | Preparation | Timer screen, target-boundary calculation, points/packing navigation |
| 15 | Support | Ticket list/conversation, create/reply, missing-description rejection |
| 16 | Profile | Details, hours and verification navigation |
| 17 | Shop status | Close/reopen and assignment/acceptance restrictions |
| 18 | Security | Password screen, sessions and protected logout |
| 19 | Notifications | Mark-all-read, category empty state and persistence |
| 20 | Inventory history | CRUD/handover audit entries and screen rendering |
| 21 | Empty orders | Ready tab empty state, page navigation retained |
| 22 | Empty inventory | Zero-catalogue rendering, add-product route, search no-match/reset |
| 23 | Loading | Deferred product request displays ActivityIndicator |
| 24 | Network error | Failed product request shows error; Retry loads inventory |
| 25 | Delete confirmation | Cancel preserves product; confirm removes it |
| 26 | Closed shop | Closed message, blocked new orders, reopening |

## Verification results

- Native: 17 tests across 7 suites passed.
- Backend: 21 tests passed, including ownership, real-time session rooms, order lifecycle, uploads, persistence and authentication.
- Web: 25 tests passed, including route and shared-state rendering.
- Native ESLint: zero errors; existing inline-style warnings remain.
- Root TypeScript check and backend/frontend production build passed.
- Android production JavaScript bundle generated successfully.
- Android arm64 debug APK compilation passed. Gradle reports existing deprecation and Kotlin/KSP version warnings; they did not fail the build.
- Connected Android device: current source loaded through Metro; dashboard, inventory, Restock Planner, Needs Restock, recommendation-to-Tomatoes-editor navigation, settings, light-theme switch and orders checked. XML/screenshot evidence is under `docs/device-qa/audit-*`.

## Remaining integration/device scope

Native defaults to persisted local demo mode. The native API adapter was not connected to a deployed backend in this audit. Real SMS/recovery, payment providers, push delivery, operator replies, administrator approvals and two-factor authentication still require the corresponding integrations. Existing web/backend tests do not establish that every native API contract matches a live deployment.

All 26 states have automated coverage; only the device checks explicitly listed above were repeated physically. Real photo selection, native PDF/share behavior, accessibility focus and all iOS behavior were not rechecked in this run. Existing prior device evidence is not counted as fresh verification.
