# ZestBasket Shopkeeper Portal

This workspace now contains a React + Vite + TypeScript shopkeeper portal (`frontend/`) and an Express + TypeScript API (`backend/`). The original React Native Android/iOS scaffold is preserved. The new portal runs in the browser; the native scaffold has not been converted into these screens.

## Run locally

Node.js 22.11 or newer is required. Dependencies have already been installed in this workspace. From this directory:

```powershell
npm.cmd start
```

Open **http://127.0.0.1:5173**. The API listens on **http://127.0.0.1:4100**. Port 4000 was already occupied by another local service, so it is intentionally not used. Use `127.0.0.1` consistently because cookies and the allowed frontend origin are configured for that hostname.

On a fresh checkout:

```powershell
npm.cmd run portal:install
npm.cmd start
```

The terminal must remain open. Ctrl+C stops the launcher. The frontend has hot reload. Restart the launcher after API source changes, or run the API separately with `npm.cmd run dev --prefix backend`.

Demo login: **03001234567 / ZestDemo123**, or use **Demo Login (For Testing)**. Test pickup OTP **4587** applies only to explicitly labelled demo orders. Demo mode is enabled locally by default. All demo identities, CNIC values, orders and payments are synthetic fixtures.

## Demo walkthrough

1. Open Welcome → Login → Demo Login.
2. View the dashboard and inventory. Add a product, upload a PNG/JPEG/WebP image, edit stock, search/filter, and review inventory history.
3. Open a New order → Accept → Start Preparing → Continue to Packing.
4. Check each item and its quantity, then confirm packing.
5. Open Rider Assignment and verify demo OTP `4587`.
6. Return to Order Details and choose **Demo: Mark Delivered & Record Payment**. The ledger, reports, dashboard and notifications update from persisted data.
7. Close/reopen the shop, edit operating hours, create a support ticket, reply to it and mark notifications read.
8. Create another demo order from the dashboard whenever needed. Closed shops reject new assignments.

The other New order can be rejected with a reason. This rejects only the current shop segment and records switch/drop choices requiring customer approval; unrelated shop segments are not cancelled.

## Storage and MongoDB Atlas

Without configuration, records persist to `backend/data/store.json` through serialized mutations and atomic file replacement. API tests use isolated temporary stores, not your demo data. Uploads persist in `backend/uploads/` and are accessible only to their owning shop. Passwords use bcrypt; sessions use JWT in HttpOnly SameSite cookies, with server-side revocation.

To use Atlas, copy `backend/.env.example` to `backend/.env`, set `MONGODB_URI` to a **dedicated development database**, and set a random `JWT_SECRET` of at least 32 characters. No credentials are included. The MongoDB adapter uses separate Mongoose collections for Users, Shops, Products, Orders, OrderShopSegments, Riders, Transactions, InventoryLogs, SupportTickets, Notifications, RewardLedger, UserSessions, ShopVerificationRequests and Uploads. Related writes share an Atlas transaction.

The adapter initializes demo records only when the database has no portal users. The seed command preserves existing data:

```powershell
npm.cmd run seed --prefix backend
```

This hackathon repository uses an in-memory working set and one serialized API writer. Run **one API process**. It is not designed for multiple API replicas; that requires replacing the repository with database-native conditional operations and distributed concurrency handling. Atlas connectivity/transactions have not been tested here because no Atlas credentials were provided.

Set a stable `JWT_SECRET` to keep signed sessions valid across API restarts. Without it, a temporary key is generated and users must log in again after a server restart. Browser refresh preserves a valid session. `DEMO_MODE=false` disables demo login/test-order/test-delivery endpoints; existing seeded accounts and records remain in the dedicated demo database. Do not use the seeded credentials for a live deployment.

## Build and tests

```powershell
npm.cmd run portal:build
npm.cmd run portal:test
```

The frontend build is in `frontend/dist/`. To preview the production build, run the API with `npm.cmd run start --prefix backend` and the frontend with `npm.cmd run preview --prefix frontend` in separate terminals. Preview uses port 5173 and proxies the API and WebSocket connection to 4100.

The automated suite covers API authentication and ownership, products and uploads, concurrent acceptance and stock reservations, preparation/packing, OTP rejection/reuse, PDF receipts, simulated payment reconciliation, profile/status/settings, support, notifications, sessions and persistence. Business-rule tests cover multi-shop fees, maximum five-shop pickup batches, service radius and customer-approved switch/drop behavior. Frontend tests render routes and shared states; they do **not** replace browser interaction or visual tests.

See [the 26-screen verification matrix](docs/VERIFICATION.md) for exact coverage and unfinished verification.

## Design and app structure

- Purple/orange ZestBasket theme, gradient CTAs, lavender borders, mobile bottom navigation, desktop sidebar, reusable cards, loading/error/empty states and confirmation dialogs.
- Poppins is bundled locally. The logo uses basket/leaf vectors. Hero/shopkeeper artwork uses clipped portions of the user-supplied reference. Product and rider fallback imagery uses emoji; uploaded product/shop images are supported. This is not a claim of pixel-perfect original artwork.
- Frontend modules: `src/app`, `src/components`, `src/features/{auth,dashboard,inventory,orders,finance,shop,support,notifications,settings}`, `src/services`.
- Backend: `src/app.ts` (API handlers/middleware), `src/models.ts` (Mongoose models), `src/store.ts` (seed/repository), `src/services/business.ts` (multi-shop rules), `src/server.ts`, `src/seed.ts`.
- Socket.IO broadcasts order, inventory, payment, notification and shop-status changes to authenticated shop rooms. Logout disconnects the current session's socket.
- Manifest and a network-error service worker support the PWA shell. Authenticated API responses are never cached. Offline business edits are not queued.

## Current limits

All specified routes and shared UI states are implemented. The local API and automatic tests are functional. Browser access was unavailable/denied in this session, so 390×844 screenshot comparison, touch interaction, installation and cross-browser QA are **not verified**. The route matrix states this explicitly.

Customer/rider/admin portals are not part of this workspace. Their live assignments, customer approval screens, verification decisions and payment provider integrations remain external integration work. The shopkeeper portal records the appropriate segment state and exposes demo events/rules; it does not pretend that external users received or approved them. Support has real persisted tickets/replies, without a fabricated live admin agent. Recovery creates an identity-verification support request; it does not send SMS or reset passwords automatically. Two-factor authentication is labelled Coming Soon and disabled. Payments and settlements remain simulations.

Original native commands remain available: `npm.cmd run native:start`, `npm.cmd run android`, `npm.cmd run ios`. Those launch the preserved React Native scaffold.
