# React Native screen implementation and verification

The numbers below refer to the supplied reference, not visible app headers. Routes are reference path equivalents; the native app uses a protected in-app screen stack with Android back handling, drawer and four bottom tabs.

Every row is implemented using native UI. **Backend: mock + API adapter, no live server connected**, for every row. **Visual QA at 390×844: unverified**, for every row. Tests use mocked native modules; they establish React rendering, navigation and state behavior, not exact device pixels or native picker/share behavior.

| # | Screen / native route (reference path) | Working controls / implementation | Verification |
|---|---|---|---|
| 1 | welcome (`/welcome`) | Register, Login, session restore | Renderer navigation |
| 2 | register (`/register`) | Required fields, masked CNIC, Pakistani phone, password/confirmation, submit | Renderer required validation; local registration service test; live registration deferred |
| 3 | login (`/login`) | Visibility, login, demo login, recovery, registration | Renderer demo login/logout; API transport auth tests |
| 4 | dashboard (`/dashboard`) | Drawer, hero shortcuts, dynamic stats, orders, notifications, demo order | Renderer login/dashboard and order navigation |
| 5 | inventory (`/inventory`) | Search, category filters, stock/reserved, edit/delete, history | Renderer search/add/edit/delete; service guards |
| 6 | product (`/inventory/add`, `/inventory/:id/edit`) | Validated form, category/unit, image picker, availability, save | Renderer add/edit/save; service stock validation; real picker unverified |
| 7 | orders (`/orders`) | New/Accepted/Preparing/Ready/Active/All, refresh, accept/reject/details | Renderer tabs/details/accept and empty state; service rejection |
| 8 | order (`/orders/:id`) | Customer telephone link, totals, instructions, receipt, lifecycle actions | Renderer workflow; service transitions/reservations |
| 9 | receipt (`/orders/:id/receipt`) | PDF file generation/share plus receipt text share | Renderer receipt + PDF adapter/HTML escaping tests; PDF generated on Android device and native share sheet verified |
| 10 | rider (`/orders/:id/rider`) | Assigned rider, phone link, timeline, OTP, demo delivery | Renderer OTP/handover/delivery; service invalid/reused OTP |
| 11 | packing (`/orders/:id/packing`) | Per-item checklist, confirm/back, status guard | Renderer checklist/packing; service missing-check rejection |
| 12 | earnings (`/earnings`) | Dynamic ledger/totals, dates, report tab, pagination, CSV share | Renderer totals; service reconciliation; share unverified |
| 13 | reports (`/reports`) | Date filters, daily/weekly/monthly chart, best sellers, CSV share | Renderer chart; derived data calculations; visual/device chart QA pending |
| 14 | preparation (`/orders/:id/preparation`) | Persistent timer start, target countdown, progress, points/history | Renderer timer screen/points/packing; timer elapsed-time boundary not separately tested |
| 15 | support (`/support`) | Tabs, create ticket, attachments, ticket conversation/reply | Renderer tickets/navigation; service create/reply; image picker unverified |
| 16 | profile (`/shop/profile`) | Address/radius, pending name-change review, hours, verification docs | Renderer profile/hours/verification; request adapter tests |
| 17 | status (`/shop/status`) | Free/Busy/Closed, confirmation, save, shortcuts | Renderer close/reopen; service closed assignment guard |
| 18 | security (`/security`) | Password form, sessions, logout; 2FA visibly disabled | Renderer navigation/logout; live password/revocation backend deferred |
| 19 | notifications (`/notifications`) | Categories, read, mark-all-read, destination navigation | Renderer filters/mark-all; persisted read service test |
| 20 | history (`/inventory/history`) | Automatic audit, filters, pagination, immutable records | Renderer history; service add/edit/delete/handover logs |
| 21 | empty orders (inside orders) | Header/tabs/bottom nav retained, refresh | Renderer Ready tab empty state |
| 22 | empty inventory (inside inventory) | Empty/no-match messaging, clear filters/add product | Renderer search/no-match/clear; zero-catalogue variant implemented, not separately rendered |
| 23 | loading (shared) | ActivityIndicator during promises; duplicate submit disabled | Async state path implemented; no device timing/animation QA |
| 24 | network error (shared) | Error message and Retry reissues request | Transport rejection/invalid JSON/timeout tests; retry UI/device behavior pending |
| 25 | delete confirmation (inventory modal) | Cancel, backdrop/back dismissal, guarded delete, busy state | Renderer open/confirm/delete; service active-order protection and audit |
| 26 | closed status (inside status) | Closed message, no new assignments, update/reopen | Renderer closed message/reopen; service guard |

Extra native screens: Settings hub, Operating Hours, Recover Password, Change Password, Active Sessions, Verification Documents, Support Conversation and Golden Points History.

## Checks and remaining work

- Native renderer integration covers onboarding validation, demo session, product CRUD/search/history, complete order-to-delivery demo, receipt, points, operating hours, verification, closed/open status, finance/report screens, support, notifications, security, sessions and protected logout.
- Service tests cover persistence writes/rollback, absence of stored passwords, local registration, protected endpoints, products/audit, stock reservations/one-time deductions, packing checklist, incorrect/reused OTP, segmented rejection and payment accounting.
- Transport tests cover JSON/cookies, unauthorized bootstrap, error status propagation, network failure, invalid JSON, timeout messaging and API data normalization.
- Native Android production JavaScript bundle generated successfully. Android assembleDebug succeeded; final arm64 build/install succeeded. Nine tests pass across four suites, lint passes (quiet mode) and tsc --noEmit passes.
- Connected CPH2449 phone, Android 16: installed/launched, demo login, welcome/dashboard/inventory/orders/receipt/settings checked, PDF generated and native chooser opened, session survived force-stop/relaunch. Display: 1440?3216 at effective 560 dpi (about 411?919 dp). Exact 390?844 visual matching, accessibility focus and photo selection remain unverified. iOS requires macOS/Xcode.
- Branding update: reference collage imports removed. Native text/control heroes now use 1024?1536 transparent shopkeeper artwork; header/drawer/profile use the same face, and rider uses a separate high-resolution portrait. Cold-start avatar splash, Android adaptive icon and complete iOS icon/launch assets added. Android on-device splash/dashboard/icon checks passed; iOS remains untested.
- Real authentication/SMS/recovery, secure password changes, server OTP, push notifications, administrator approval, support operator replies, payment providers and customer/rider external workflows remain backend integrations, as requested.
- Data is deliberately local and synthetic in mock mode. Native receipts generate PDFs and open the native share sheet; text receipt/CSV sharing also works. Dedicated in-app printing remains unimplemented.
