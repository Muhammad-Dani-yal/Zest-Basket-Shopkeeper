# ZestBasket — React Native Shopkeeper App

The main app is now a **native React Native Android/iOS app**, not a WebView or a screenshot. All management screens use native controls. It starts in local demo mode, without a server. The older browser portal and backend remain in `frontend/` and `backend/`; they are optional and are not started by the native app.

## Run Android

Use Node.js 22.13+ and the installed Android Studio SDK/JDK. Start an Android emulator, or connect an Android phone with USB debugging.

```powershell
npm.cmd install --cache .npm-cache
npm.cmd start
```

Keep that terminal open. In another terminal:

```powershell
npm.cmd run android
```

`npm start` now starts **Metro**, as expected for React Native. `npm run portal` still starts the optional older browser application. No backend, database, API key or `.env` is needed for the native demo.

On macOS for iOS:

```sh
npm install
cd ios
bundle install
bundle exec pod install
cd ..
npm start
# another terminal:
npm run ios
```

iOS requires Xcode and has not been compiled on this Windows machine.

## Demo

Tap **Login → Demo Login (For Testing)**, or use **03001234567 / ZestDemo123**. Demo rider OTP is **4587**. These are synthetic fixtures, not production authentication credentials.

1. Dashboard → Inventory: search, filter, add/edit/delete products, choose a photo and review inventory history.
2. Orders → New → Details → Accept → Start Preparing.
3. Continue to Packing → check every item → Haan, Confirm Karo.
4. Rider → enter `4587` → Verify OTP & Hand Over.
5. Demo: Mark Delivered & Record Payment. Earnings, reports, notifications and stock update.
6. Settings → change shop status, opening hours, holidays, address and service radius; create support tickets/replies; submit a verification document.
7. Dashboard → Create Demo Order produces another order. Closed shops cannot receive or accept new orders; existing accepted orders remain accessible.

Demo changes and the local session persist in AsyncStorage after closing/reopening the app. Photos are resized and stored with local demo data. This storage is for a small demo, not a production catalogue. Register previews validated onboarding and saves a pending shop profile; it does not create a secure server account or store passwords. Demo Login resumes this local workspace.

## Backend handoff

Change `src/services/config.js`:

```js
mode: 'api',
baseURL: 'https://your-api.example.com/api',
```

All screens use the same `request()` service, so they do not need to be rewritten. Android emulator localhost is `10.0.2.2`; a physical phone needs your computer's LAN address or HTTPS server. Authentication expects a server-managed cookie session. Use HTTPS outside local development.

See [the complete native API contract](docs/NATIVE_API.md) for endpoints, payloads, response shapes, ownership, OTP, stock and payment requirements. API mode has request timeouts, error/retry states, upload handling, pull-to-refresh and 15-second foreground polling. No live backend connection is claimed. Your backend remains your work, as requested.

## Verification

Latest audit: [26-state coverage, fixes, new Restock Planner / Preparation Priority and remaining scope](docs/PROJECT_AUDIT_2026-11-02.md).

```powershell
npm.cmd test -- --runInBand --testTimeout=60000
npm.cmd run lint
npx.cmd tsc --noEmit
npm.cmd run native:bundle
# Android compile, from android/:
.\gradlew.bat assembleDebug --no-daemon
```

Tests exercise native navigation and the order workflow through preparation, checklist packing, rider handover and delivery, plus inventory search, profile, operating hours, closed/reopened status, reports, support, verification, notifications, sessions and logout. Service tests verify stock reservation/deduction, duplicate/invalid transitions, OTP attempts/reuse, audit history, earnings reconciliation, persistence rollback and route protection.

See [all 26 screen states and verification scope](docs/NATIVE_VERIFICATION.md). Emulator/device screenshots at 390×844, real photo picker, platform share/print behavior, screen-reader focus and iOS runtime are not visually/device verified. Receipts generate an actual PDF file and open the native share sheet for saving/sharing; CSV reports use text sharing. Dedicated in-app printing is not implemented.

## Structure

- `App.jsx`: native entry.
- `src/app/Portal.js`: native screen router, session shell, drawer, bottom tabs and feature screens.
- `src/components/ui.js`: shared cards, gradients, forms, buttons, logo, loading/error/empty states and badges.
- `src/services/client.js`: configurable API client and transactional local mock repository.
- `src/services/seed.js`: synthetic demo data.
- `src/services/media.js`: native image picker and upload adapter.
- `src/components/branding.js`: native welcome/dashboard heroes, consistent avatars, brand logo and timed startup splash.
- `src/assets/`: high-resolution transparent shopkeeper/rider artwork and the customer-matching shopkeeper icon. All hero wording and controls are native text; the reference collage is no longer rendered. See [asset prompts and platform icon sizes](src/assets/ASSETS.md).
- `npm run assets:brand`: regenerate launcher densities and native splash images from the committed master assets. System fonts and product emoji fallbacks are still used.
- `__tests__/`: native renderer integration and domain/service tests.

Real account registration/login, secure password change, recovery SMS, server-side OTP verification, external support responses, verification decisions, push notifications, customer/rider portals and payment providers require your backend. Two-factor authentication is visibly disabled as Coming Soon. Demo payments do not transfer money. Shop name changes create a pending review request and do not bypass administrator approval.

Documentation for the preserved browser project is in [WEB_PORTAL.md](docs/WEB_PORTAL.md); its instructions are separate from the React Native app above.
