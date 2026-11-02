# Avatar, splash and icon verification

Updated Android APK built successfully and installed on CPH2449 (Android 16).

- Original collage is no longer imported by native runtime (confirmed against served Metro bundle).
- High-resolution transparent mascot is used in native dashboard, splash and face avatars.
- Hero headings, bubble copy and buttons are native Text/Pressable components.
- Native pre-JS splash and full branded React Native splash were captured on cold start.
- Native splash automatically advances to the saved session dashboard.
- System app-info shows the new adaptive basket/storefront icon and ZestBasket Shopkeeper name.
- Captures: dashboard.png, splash.png (native launch), splash-js.png (full branded splash), icon-info.png (actual installed app icon).
- Nine tests passed; lint and TypeScript no-emit checks passed. Android build/install succeeded.
- iOS icons and launch storyboard configured; iOS runtime not checked on Windows.

Asset generation prompts and master paths are in src/assets/ASSETS.md.
