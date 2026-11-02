# Connected Android device QA

- Device: CPH2449, Android 16, arm64-v8a.
- Installed package: `com.shopkeeperapp`, display name ZestBasket.
- Final Android debug build succeeded and was installed/launched through React Native CLI.
- Native app stayed in the foreground without an application crash in the checked flows.
- Welcome → Login → Demo Login → Dashboard verified.
- Inventory shows all four seeded products, physical and reserved quantities, low-stock status and native controls.
- Orders → Order Details → Receipt verified.
- Download / Share PDF generated a 53,472-byte PDF in the app cache; `%PDF-` signature checked. Android's native chooser displayed the generated PDF. No message/file was sent to another person.
- Settings hub verified.
- Force-stop and relaunch restored the demo session and dashboard automatically.
- Metro remains running on port 8081, with USB reverse forwarding. This is a development install; keep Metro/USB connected for development. See README for startup commands.
- Screenshots: welcome.png, dashboard.png, inventory.png, receipt.png, settings.png. These are actual device captures.
- demo-receipt.pdf was generated on the phone, then copied from this app's own cache for verification.
- Exact reference matching at 390×844, live backend integration, physical photo-picker selection, screen-reader focus, native printing and iOS remain unverified.
