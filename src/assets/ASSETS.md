# ZestBasket Shopkeeper brand assets

Generated with the built-in image_gen tool (not the API/CLI). Original generated files were copied into this project. Android/iOS density variants are made by `npm run assets:brand`; no screenshot is used as a runtime hero.

## Saved assets

- `src/assets/shopkeeper-mascot.png`: 1024 × 1536 RGBA, transparent, text-free shopkeeper illustration. Used in welcome, dashboard, splash and face avatars.
- `src/assets/rider-avatar.png`: 1254 × 1254 RGBA, transparent rider portrait.
- `src/assets/shopkeeper-icon.png`: 1254 × 1254 RGB launcher master. Matches the original customer app basket/gradient, with a storefront badge distinguishing the shopkeeper app.
- `src/assets/reference.png`: original reference collage, retained for design reference only. Nothing in the native runtime imports it.
- `android/app/src/main/res/mipmap-*`: actual launcher icon densities and adaptive icon XML.
- `android/app/src/main/res/drawable-nodpi`: Android native splash mascot and adaptive foreground/background.
- `ios/ShopkeeperApp/Images.xcassets/AppIcon.appiconset`: populated iPhone/iPad/App Store icon sizes.
- `ios/ShopkeeperApp/Images.xcassets/ShopkeeperLaunch.imageset`: native iOS launch artwork.

Reference for matching the customer icon: `../hackaton/packages/design-tokens/assets/zest-icon.png` (read-only source; not modified). The new assets are not upscaled crops from the reference collage. All wording, speech bubbles and shortcut labels are React Native text and controls.

## Generation prompt set

### Shopkeeper mascot — transparent background

Use case: stylized-concept. Asset type: production React Native app transparent mascot illustration, high-resolution 1536px or larger portrait PNG. Reference image is the supplied ZestBasket UI collage; use only the friendly shopkeeper's character design as visual inspiration, do not reproduce any UI. Generate a single crisp polished glossy 3D South Asian male grocery shopkeeper, young adult, warm medium skin, thick dark side-swept hair, expressive brown eyes, neatly trimmed beard and moustache, friendly smile, purple polo shirt #5708E8 with orange collar trim #FF9817, charcoal black apron bearing a simple white basket pictogram (no letters). Waist-up/three-quarter portrait, one hand giving thumbs-up, other hand resting on a small wooden crate of fresh tomatoes, peppers and leafy greens in the foreground. Entire character and crate visible with generous transparent padding on all sides. Clean sharp edges, detailed facial features, professional high quality mobile app mascot. Transparent background. No words, no letters, no slogans, no numbers, no buttons, no frames, no watermark. This asset will be displayed at up to 420 logical pixels tall on 3x-density phones, so render sharp fine detail.

### Shopkeeper icon — edit of the customer icon

Use case: precise-object-edit. Edit target is the provided original ZestBasket CUSTOMER APP icon. Produce the matching SHOPKEEPER APP launcher icon. Preserve the original white 3D grocery basket with two leaves, its orange-pink-purple gradient background, lighting, proportions and polished style as closely as possible. Change only by adding a small but clearly readable 3D storefront badge in the lower right corner, about 26 percent of icon width, inside the central icon safe area (not at the outer edge). Badge: purple rounded square with a slim white border, white and orange striped shop awning and a simple white shop door/window, polished to match the existing 3D basket. The main basket remains dominant and recognizable. No words, no letters, no numbers, no watermark. Square high-resolution app icon, full-bleed background, no pre-rounded outer corners (OS will mask), keep essential basket and badge inside central 66% safe circle for Android adaptive icon cropping. Final source master at least 1024x1024.

### Rider portrait — transparent background

Use case: stylized-concept. Production mobile app portrait asset, 1024x1024 PNG with transparent background. A single friendly South Asian male grocery delivery rider, young adult, warm medium skin, dark brown eyes, short neatly trimmed beard, smiling, wearing a royal blue open-face motorcycle helmet and blue rider jacket. Polished glossy 3D character art, crisp facial detail and sharp edges, front-facing head and shoulders centered with generous clear padding for round avatar cropping. Match a professional cheerful grocery delivery brand with subtle purple accents. No text, no letters, no logos, no UI elements, no watermark. Transparent background.

## Device verification

CPH2449 / Android 16: updated APK built and installed; native launch avatar, branded React Native splash, dashboard face/avatar, native speech-bubble text and shortcut buttons checked. Android system app-info shows the new adaptive icon and the name **ZestBasket Shopkeeper**. Captures are in `docs/device-qa/branding/`. iOS assets/storyboard are configured but cannot be runtime-tested on Windows.

## Premium product artwork and theme refresh (2026-11-02)

Four transparent 1024px PNG product assets were generated with the built-in image_gen tool, not the API/CLI, and saved under src/assets/products/: flour.png, milk.png, bananas.png, tomatoes.png. They are used for inventory thumbnails, order items and category tiles. No labels are baked into artwork; labels remain native text.

Prompt direction shared by all four: polished premium grocery app product photography / realistic 3D studio cutout, sharp edges, transparent background, centered square composition, soft studio lighting, no UI, no text, no watermark. Subjects: cream kraft flour bag with purple/orange strip, wheat pictogram and stalks; white milk bottle with blue cap and glass; golden banana bunch; three fresh red tomatoes with vine and slice.

Customer theme reference: read-only apps/customer-mobile/src/components/zest/HomeHeader.tsx in ../hackaton. Hero gradient matches purple #6D28A8, rose #AA2C91 and amber #B85C1F. Dark surfaces and semantic colors follow the customer palette. Bundled Roboto variable font is copied as ZestSans.ttf with OFL license under src/assets/fonts; Android and iOS native font resources are configured.
