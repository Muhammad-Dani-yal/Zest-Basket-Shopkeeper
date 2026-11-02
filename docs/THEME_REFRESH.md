# Shopkeeper theme refresh

Customer palette matched from the sibling customer app source: warm purple/rose/amber hero with transparent shopkeeper mascot. New consistent Lucide vectors, tonal icon frames, floating bottom navigation, larger readable bundled Roboto font, transparent product artwork and native labels.

Appearance: Settings > Appearance > Light, Dark or System. Header toggle switches modes quickly. Preference persists in AsyncStorage; failed saves keep the current mode. Dark tokens cover screens, inputs, cards, dialogs, navigation, charts and branded React splash.

Validation: 10 tests passed, ESLint clean, TypeScript check and Android production JS bundle passed. Android debug APK built at android/app/build/outputs/apk/debug/app-debug.apk. Installation failed due to the device transport; ADB shell timed out, and after restarting the ADB server the CPH2449 device reported offline. Updated theme has not been visually verified on the physical phone. iOS font and assets are configured but untested on Windows.

Remaining work: real API authentication/OTP/password recovery, payment settlement integration, push notifications, server-backed verification/support, offline synchronization and production release signing. API seam and local demo remain available. System native launch screen precedes the in-app themed splash; saved manual theme is restored in React Native.

Product image follow-up: local artwork remains rendered beneath uploaded photos while loading and after errors. Category fallbacks cover renamed grocery/fruit/vegetable/dairy items. Order summary cards now show thumbnails, and product edit previews show the bundled artwork even without an upload. 11 tests passed including image error fallback. Device remains offline, so physical verification is pending.
