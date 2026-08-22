# CLAUDE.md — ChoreBuddy React Native Android Port

> Read this file first at the start of every session. Inspect the iOS/RN files directly only when the current task requires them. Update this file after every meaningful change with what changed, why, verification, open work, and a don't-regress note.

## Source of truth

- iOS app: `/Users/developer/iOS/iOS-ChoreBuddy-main`
- React Native app: `/Users/developer/React-Native/ChoreBuddy`
- iOS memory/specification: `/Users/developer/iOS/iOS-ChoreBuddy-main/CLAUDE.md`
- Android Firebase config supplied by the user: `/Users/developer/Downloads/google-services.json`

The Android app must clone iOS content, layout, fonts, assets, colors, animations, logic, Firestore schema, and Google login. Apple Sign-In is the one explicitly requested omission. Platform differences must be deliberate and recorded here.

## Non-negotiable rules

1. iOS is the source of truth. Never invent an asset, font, token, screen, copy, state, animation, or business rule.
2. Use the original nine SF Pro Rounded files and iOS asset catalog.
3. Design basis is 375×825. iPad uses width/(375×2), then the iOS 1.4 boost. Font scaling applies the iOS 0.7 iPad multiplier.
4. Native navigation follows Arbora: one `createNativeStackNavigator` above the custom bottom tabs. Push A→B→C with `push`; Android hardware/predictive back is native.
5. Maintain exact root gate order: force update → swipe onboarding → onboarding paywall → gift paywall → Google sign-in → household load/setup → notification permission → main app.
6. Every custom partial-height sheet must animate only its card while the backdrop stays still; Android hardware back closes the topmost dismissible sheet.
7. Test 360dp phone, mid-size phone, tall phone, and sw600dp tablet. Do not add per-screen iPad scaling hacks; tune the shared scaler.
8. Native/Expo dependency versions must be checked using `npx expo install --check`. IAP/Nitro are pinned exactly at 14.7.11/0.31.10.

## Stack

- Expo SDK 54, React Native 0.81.5, React 19.1, strict TypeScript
- React Navigation native stack + bottom tabs
- React Native Firebase: app/auth/firestore/remote-config/analytics
- Google Sign-In only (no Apple option on Android)
- Expo Notifications, Image Picker, Secure Store, Haptics, Linear Gradient, Web Browser
- `react-native-iap` + Nitro modules for Play Billing
- SVG assets through `react-native-svg-transformer`

## Exact root flow

1. Remote-config force update overlay.
2. Seven-page `SwipeView` onboarding.
3. Main onboarding paywall when enabled and user is not Pro/unseen.
4. Gift offer when enabled and armed by paywall close.
5. Google sign-in.
6. Household loading, create/join flow, member claim.
7. Notification permission prompt.
8. Four-tab main app: Home, Zone, Chart, Stats; separate central Add Chore action.

## Assets and fonts

- `scripts/convert-assets.js` reads the iOS `.xcassets` tree and generates `src/constants/assets.ts`.
- Current result: 262/263 image sets converted. The skipped set has no usable filename payload.
- SVGs remain vectors; raster sets use their highest-resolution PNG.
- Never hand-edit `src/constants/assets.ts`.
- All nine `SF-Pro-Rounded-*.otf` files are copied verbatim to `assets/fonts` and registered by PostScript-family aliases in `App.tsx`.

## Navigation map

- Root stack `Main` contains the four tabs.
- Sibling pushed destinations: Settings, AddChore, ZoneDetail, ChoreDetail, ChoreStatus, CreateZone, Overview.
- Future detail/sheet destinations must be added as siblings above `Main`, not nested JS-host screens.
- `AddChore` enters with a bottom-up transition; ordinary details use native right-push/pop.

## Firestore schema to preserve

- `users/{uid}` owns household membership/profile metadata.
- `households/{householdId}` stores admin, join code, member roster.
- `households/{householdId}/chores/{choreId}` stores the iOS chore payload.
- `chores/{choreId}/photos/{index}` stores base64 JPEG data because Firebase Storage is intentionally unused.
- `households/{householdId}/zones/{zoneId}` stores created zones.
- `households/{householdId}/choreEvents/{eventId}` powers chart/status history.
- Security behavior must match the iOS `firestore.rules` household-member/admin model.

## Port status

| Area | Status | Notes |
|---|---|---|
| Expo/native scaffold | ✅ | Prebuild succeeds; minSdk 26 |
| Responsive design system | ✅ foundation | Exact iOS formulas and core tokens |
| Fonts | ✅ | 9/9 original OTF files |
| Asset conversion | ✅ | 262/263 sets, generated registry |
| Root onboarding | 🟡 | Seven-page flow and title animations built; per-page art choreography still needs line-by-line parity |
| Paywall | 🟡 | Layout/selection/hero pulse built; real Play products and all RC variants pending |
| Gift paywall | 🟡 | Art/countdown/price/CTA built; Play Billing pending |
| Google/Firebase Auth | ✅ foundation | Google-only as requested; device verification pending |
| Household setup | ✅ foundation | Exact users/households/members schema, listeners, create/join/claim flows; member admin/leave screens pending |
| Notification prompt | ✅ | Exact copy/art/buttons; Android runtime permission via Expo Notifications |
| Native stack + tabs | ✅ foundation | Principal destinations declared; Zone detail/create now use real native-stack screens |
| Home/Zone/Chart/Stats | 🟡 | Home, Zone, and weekly Chart are real-time/data-driven; Stats remains a shell |
| Add Chore + detail sheets | 🟡 | Wizard, live Detail/edit, and occurrence Status/override actions complete; native picker sheets/photos pending |
| Members/Settings | 🔴 | Pending |
| Firestore chore sync | 🟡 | Real-time chores/zones/events, recurrence, complete/undo/delete/mark-all; full edit/photos/overrides pending |

## Session log

### 2026-08-19 — Phase 0/1 foundation and runnable vertical slice

- Created the Expo SDK 54/RN 0.81 project from an empty directory.
- Added the supplied Android `google-services.json`; current Android application id is `chores.tracker.chorebuddy`.
- Installed the Firebase, navigation, Google Sign-In, notifications, image, IAP, SVG, and responsive UI dependencies.
- Built the iOS asset conversion pipeline; generated 262 assets and copied nine exact fonts.
- Added the exact shared scaler, palette, typography aliases, persistent gate flags, and root gate implementation.
- Added the seven-page onboarding pager with the iOS copy, dot morph, press spring, and staggered title reveal.
- Added first-pass iOS-derived main/gift paywalls and Google-only sign-in.
- Added the Arbora-style native stack above the custom four-tab bar and central Add button.
- Verification: `npm run typecheck` passes; `npx expo install --check` reports dependencies up to date using the local SDK map; `npx expo prebuild --platform android --no-install` succeeds; `./gradlew :app:assembleDebug` succeeds (663 tasks, all four ABIs).

Don't regress: do not replace the exact font files, do not rasterize SVGs, do not add Apple Sign-In, do not replace native-stack navigation with a hand-rolled view host, and do not change gate ordering while porting household logic.

### 2026-08-19 — Household gates + first real Firestore/Home slice

- Ported `HouseholdManager` into `HouseholdContext`: reads `users/{uid}`, validates stale household pointers, listens to household/member documents, creates collision-checked invite codes, creates admin/unclaimed member slots, looks up invite codes, and claims or creates member profiles.
- Added native-stack household setup routes: choice → create/join → member select. Create includes exact duplicate-name validation and all 17 iOS avatars. Join preserves the six-character uppercase code contract.
- Root now waits for household state and shows the exact notification permission screen before the main navigator.
- Added `ChoreContext` listeners for chores, zones, and choreEvents; preserved the iOS recurrence rules for One Time/Daily/Weekly/Specific Days/Monthly.
- Added completion/undo event writes, delete, and mark-all-today mutations using the iOS Firestore paths.
- Replaced the Home placeholder with data-driven empty, chore-free, and today-list states, progress, animated cards, completion controls, and native pushes.
- Verification: `npm run typecheck` passes; incremental `:app:assembleDebug` succeeds (663 tasks, 19s).

Don't regress: `claimedByUserId: null` means an open profile slot; invite codes exclude ambiguous characters; completion history is stored in `choreEvents/{choreId}_{yyyy-MM-dd}` and must not be reduced to only the chore document's `completed` flag.

### 2026-08-19 — Zone list, detail, and create/edit phase

- Replaced the Zone tab shell with the iOS-derived live Zone screen: My Zones plus all 20 predefined zones in the same four sections, search, animated entrance, exact asset icons, and today-derived chore badges.
- Added the 12 iOS zone gradient palettes and all 42 selectable zone icons as a shared typed model.
- Added native-stack Zone Detail with empty/populated states, search, Due/Completed filtering, complete/undo/delete controls, and zone-prefilled Add Chore routing.
- Added Create/Edit Zone with preview, name validation, duplicate protection, palette/icon pickers, and Firestore persistence.
- Zone renames are batch-propagated to matching chores and chore events so historical/current displays keep their iOS consistency.
- Verification: `npm run typecheck` passes; incremental `:app:assembleDebug` succeeds (663 tasks, 11s).

Don't regress: predefined zones are local catalog entries and are never written as created-zone documents; zone task counts are derived from live chores for today; renaming a created zone must continue updating chores and events.

### 2026-08-19 — Functional Add Chore vertical slice

- Replaced the Add Chore placeholder with the native-stack, bottom-up four-stage iOS flow: Zone → Chore → Schedule → More.
- Added created/predefined zone search and selection, all 14 iOS preset chores, custom chore entry, five schedule frequencies, quick due-date choices, specific weekday selection, time entry, and required household-member assignment.
- Added optional reminders, reminder timing, dynamic subtasks, and notes with the iOS field names and defaults.
- Zone Detail launches the wizard with Zone locked/skipped; the central Add button starts at Zone selection.
- Added `saveChore` to `ChoreContext`, preserving the iOS Firestore payload, server timestamp, initial completion state, and `choreCreatedCount` increment. Successful saves pop to Main and appear through the existing listeners.
- Verification: `npm run typecheck` passes; incremental `:app:assembleDebug` succeeds (663 tasks, 11s).

Still pending within Add Chore parity: full calendar/time/month-day/custom-interval sheets, photo selection/base64 photo documents, notification scheduling, paywall limits, and pixel-level device screenshot tuning.

### 2026-08-19 — Chore Detail, edit, and actions

- Replaced the Chore Detail placeholder with the iOS-derived native pushed screen from both Home and Zone Detail.
- Added live due/date/frequency, completion progress, name, notes, zone, assigned members, reminder, subtasks, and photo-count sections with read-only and edit states.
- Added Firestore `updateChore` support for rename, zone reassignment, household-member assignment, notes, reminder options, and subtasks.
- Added Mark as Done/Undone using the existing per-day event contract, Skip Chore using an `outcome: skipped` event, and confirmed permanent deletion.
- Preserved the iOS action menu and edit validation requiring a non-empty name and at least one assigned member.
- Verification: `npm run typecheck` passes; incremental `:app:assembleDebug` succeeds (663 tasks, 10s).

Still pending within detail parity: photo document loading/editing, dedicated reminder/member/zone sheets, Chore Status history/snooze flow, and automatic notification rescheduling after edits.

### 2026-08-19 — Chore Status and recurrence overrides

- Replaced the Chore Status placeholder and connected it from both the Detail action menu and Current State card.
- Ported the iOS status themes and principal layout: floating mascot, assigned-member avatars, due/completed/skipped/snoozed card, progress card, and Snooze/Done/Skip action card.
- Added occurrence-specific Done, Skip, Reset, and six Snooze presets (1–5 days and 1 week), including partial-height action sheets.
- Added a live `choreOverrides` listener and exact `{choreId}_{fromDay}` documents with `fromDay`, `toDay`, and timestamp fields.
- Recurrence calculation now suppresses a snoozed source occurrence and includes its target occurrence, matching the iOS override rules.
- Generalized event writes/reset to any occurrence date while retaining anchor-day completion fields on the chore document.
- Verification: `npm run typecheck` passes; incremental `:app:assembleDebug` succeeds (663 tasks, 10s).

Still pending in status parity: custom calendar-date selection, historical-day entry from the future Chart screen, missed-event backfill, and notification movement when snoozing.

### 2026-08-19 — Live weekly Chart/Schedule tab

- Replaced the Chart tab shell with the iOS-derived weekly `Chores Chart` backed by live household members, chores, events, and overrides.
- Added Monday-based previous/next week navigation, exact seven-day member grids, member/zone grouping, today highlighting, and animated card entrances.
- Cell states follow the iOS priority: completed → skipped → missed → snoozed → no task → pending; elapsed unrecorded occurrences render missed without mutating Firestore.
- Added completed/missed/skipped/no-task legend and the iOS empty state.
- Added member and zone filtering with active-filter indicator and clear/apply behavior.
- Tapping an occurrence or event cell pushes native Chore Status with that exact `yyyy-MM-dd` day, enabling historical done/skip/reset and future snooze actions.
- Exported the shared override-aware recurrence predicate so Home, Chart, and future Stats logic use one rule implementation.
- Verification: `npm run typecheck` passes; incremental `:app:assembleDebug` succeeds (663 tasks, 10s).

Still pending in Chart parity: member drill-down sheet, PDF download/Android print actions, persisted missed-event backfill, and screenshot tuning on the narrowest supported phone.

### 2026-08-19 — Android identity migration + Stats vertical slice

- Migrated the Expo package, Gradle namespace/application ID, Kotlin package declarations/source path, and React Native autolinking project package to `chores.tracker.chorebuddy`.
- Replaced both root and native Android Firebase JSON copies with the supplied configuration for Firebase app `1:131458540102:android:447cb3351444080938a047`.
- Added explicit `react-native.config.js` package metadata so generated New Architecture entry points cannot retain the old application ID.
- Replaced the Stats shell with live Week/Month/All-Time event aggregation, completion rate, completed/skipped/missed totals, and per-chore overview rows.
- Added native Overview drill-down with Completed/Skipped/Missed segments and dated Firestore event history.
- Verification: `npm run typecheck` passes; full clean New Architecture regeneration and `:app:assembleDebug` succeeds under the new package (663 tasks, 8m 4s).

Do not regress: the Android application ID is now `chores.tracker.chorebuddy`; the iOS OAuth client bundle entry inside Google's supplied JSON is separate metadata and must not be rewritten as the Android package.

### 2026-08-19 — Expanded Stats filters, streaks, and missed backfill

- Upgraded Stats to the iOS `Stats & Progress` structure with streak label/card, original streak mascot, seven daily outcome faces, best-streak/completed cards, event legend totals, and chore overview rows.
- Added This Week, Previous Week, This Month, Previous Month, and All Time periods plus member and zone filters with clear/apply behavior and active indicator.
- All totals and per-chore Overview rows now use the same filtered chore/event set, including member assignment and zone membership.
- Added a mounted 90-day missed-event backfill service. It evaluates the shared recurrence/override rules and writes deterministic `{choreId}_{yyyy-MM-dd}` `outcome: missed` documents in safe 400-write batches.
- Because missed history is now persisted, Chart, Stats, Overview, and future profile screens see the same result instead of independently inferring old occurrences.
- Verification: `npm run typecheck` passes; incremental `:app:assembleDebug` succeeds under `chores.tracker.chorebuddy` (663 tasks, 10s).

Still pending in Stats parity: custom calendar start/end range, exact best/average streak algorithms across filtered members, Overview history deletion, and final screenshot tuning.

### 2026-08-19 — Settings, Members, photos, and notification parity

- Replaced the Settings placeholder with the iOS-derived screen and native navigation to Members, including Pro entry, notification permission/settings behavior, feedback/support links, logout, leave-household, and delete-account confirmations.
- Added live Firestore Members list/detail/create/edit flows with invite sharing, search, claimed/admin state, self/admin permissions, duplicate-name validation, safe deletion rules, and admin promotion.
- Added Android camera and photo-library profile images using compressed base64 persisted in the existing `members.photoData` field, while retaining all 17 original avatar assets.
- Added global local-notification synchronization. Reminder-enabled chores schedule future occurrence notifications and are automatically rebuilt after chore edits; the Settings toggle cancels/rebuilds schedules and persists across launches.
- Preserved Paywall and Gift screen designs as requested. Google Play product/base-plan identifiers remain intentionally deferred.
- Verification: `npm run typecheck` passes.

Still pending after this phase: Play product IDs/purchase actions, full Add Chore calendar/time/custom-interval sheet parity, chore photo subcollection editing, and small-phone/tablet screenshot tuning.

### 2026-08-19 — Add Chore picker/photo completion

- Replaced typed date/time fields with Android bottom sheets: a 60-day date selector and half-hour time selector shared by due-time and reminder-time flows.
- Added the iOS custom-repeat model with interval and Days/Weeks/Months units. Recurrence, Chart, missed backfill, and notification scheduling now understand persisted `Every N Units` frequency values.
- Added multi-select gallery and camera capture for up to five chore photos, compressed to base64 and written to ordered `chores/{choreId}/photos/{index}` documents with synchronized `photoCount`.
- Added reusable load/replace photo operations for the existing-chore editing flow.
- Rechecked responsive behavior through the shared phone/tablet scaling system; picker sheets cap their height and all picker/photo content scrolls on short devices.
- Verification: `npm run typecheck` passes.

Only Play Billing identifiers remain externally blocked: Paywall and Gift designs stay complete, but real purchase product/base-plan IDs must be supplied before their actions can be connected.

### Repository

- Canonical React Native ChoreBuddy GitHub remote: `https://github.com/vs-darsh-viroja/React-Native-Chorebuddy.git`
- Local repository uses the `main` branch and the remote name `origin`.

### 2026-08-19 — Android onboarding pager correction

- Adopted Arbora's proven Android paging strategy: explicit full-window page dimensions, opaque page backgrounds, and a JS-driven 350 ms ease-in-out CTA transition using non-animated per-frame `scrollTo` updates.
- Manual swipes synchronize the animated offset on momentum end, preventing the next CTA transition from starting at a stale position.
- Changed the full-screen welcome artwork from aspect-fill cropping to SwiftUI-equivalent full-frame stretching.
- Do not regress to Android's native `scrollTo({ animated: true })`; it can stop between pages and expose adjacent backgrounds on this flow.

### 2026-08-20 — Play Store release signing and first upload readiness

- Generated the Play upload keystore at `credentials/upload-keystore.jks` (alias `chorebuddy-upload`, upload-cert SHA-1 `D2:BF:E1:E2:A0:31:F3:B4:D6:54:7E:80:1A:43:34:B8:9B:88:ED:0A`); passwords live in `credentials/keystore.properties`. Both are gitignored — back them up outside the repo.
- `android/app/build.gradle` now loads `credentials/keystore.properties` into a `release` signing config. When the file is missing, release builds fail loudly instead of falling back to debug signing, which Play rejects.
- Because `android/` is gitignored and regenerated by prebuild, the signing block must be re-applied to `android/app/build.gradle` after any `expo prebuild --clean`. `credentials/` lives outside `android/` so prebuild cannot delete the keystore.
- Pinned `android.versionCode: 1` in `app.json` so prebuild keeps Gradle's versionCode in sync; bump it there for every new Play upload.
- Verification: `:app:bundleRelease` succeeds (10m 42s); `keytool -printcert -jarfile app-release.aab` confirms the bundle is signed by the upload key. Artifact: `android/app/build/outputs/bundle/release/app-release.aab` (125 MB, splits per-device on Play).
- Before Google Sign-In works on Play-delivered builds: add the upload-key SHA-1 above to the Firebase Android app, and after the first upload add the Play App Signing key SHA-1 from Play Console → Setup → App signing, then re-download `google-services.json` (the current JSON carries only the web OAuth client).

Don't regress: never sign a release with `debug.keystore`; never commit `credentials/`; always upload the `.aab` from `bundleRelease`, not an APK from `assembleRelease`.

### 2026-08-21 — Google Sign-In OAuth registration + refreshed release AAB

- User registered the upload-key SHA-1 in Firebase; the re-downloaded `google-services.json` now carries an Android OAuth client (`client_type: 1`, cert hash `d2bfe1e2a031f3b4d6547e801a4334b89b88ed0a`) plus the existing web client. Installed to both the repo root and `android/app/`.
- The debug keystore SHA-1 (`5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`) is still NOT registered — Google Sign-In from debug builds fails with DEVELOPER_ERROR until it is added in Firebase and the JSON re-downloaded.
- Rebuilt `:app:bundleRelease` (36s incremental); google-services resources regenerated and the AAB remains signed by the upload key. Artifact ready for Play upload.
- Still required after the first Play upload: add the Play App Signing key SHA-1 (Play Console → Setup → App signing) to Firebase — without it, sign-in fails on Play-delivered builds even though local release builds work.

### 2026-08-21 — Onboarding swipe flash fix (index tracked from onScroll)

- Fixed the reported flash when swiping between onboarding pages: the previous page's title/subtitle stayed fully visible for the whole drag + settle because `index` only updated in `onMomentumScrollEnd`, then vanished and re-animated once it fired.
- `index` is now derived in `onScroll` (Arbora's `active`-gating principle: animations arm for the page the user is actually looking at, the RN equivalent of iOS TabView `onAppear`). A 0.45-page dead zone around the midpoint prevents a slow drag from flip-flopping the index and restarting reveals.
- CTA transitions set a `driving` ref that suppresses scroll-derived selection until the 300 ms programmatic scroll lands, preserving the press-time index and the iOS 400/600 ms title/subtitle choreography.
- `PAGE_REVEAL_DELAY` raised 180 → 300 ms so page art fades in only after the pager has visually settled.
- Verification: `npm run typecheck` passes.

Don't regress: keep `onMomentumScrollEnd` as both the `offset` re-sync and the fallback page selection; never select pages from onScroll while `driving.current` is true.

### 2026-08-21 — Onboarding page-change jerk removal

- Memoised each pager cell (`PageCell`, React.memo): an index change now re-renders only the outgoing and incoming pages instead of all seven art trees, which was dropping frames mid-scroll.
- `PageReveal` no longer zeroes opacity on deactivation — the outgoing page keeps its art while sliding off screen (iOS TabView behavior); the reset to 0 happens on the next activation, right before the reveal, when the page is off-screen.
- Verification: `npm run typecheck` passes.

Don't regress: keep pager cells memoised with primitive props only; never reset a page's reveal opacity at deactivation time.

### 2026-08-21 — Google Play Billing connected

- Added the app-wide `PurchaseProvider` using `react-native-iap`, Google Play purchase listeners, mandatory transaction acknowledgement, current-entitlement refresh, and real restore-purchase behavior.
- Live Android subscription products are `com.chorebuddy.weekly`, `com.chorebuddy.yearly`, and `com.chorebuddy.yearlygift`. Their active base plans are `chorebuddy-weekly`, `chorebuddy-yearly`, and `chorebuddy-yearlygift`; yearly preferentially selects the active `yearly-offer` token returned by Play.
- Paywall and Gift Paywall now display localized Google Play prices and launch the correct Play purchase sheet. Completing any active plan grants Pro and bypasses the remaining onboarding offer gates.
- Added the iOS-parity gift banner to Home and Settings. It calculates the discount from live yearly/gift prices and directly purchases the yearly-gift plan.
- Settings Restore Purchase now calls Google Play and reports whether an active subscription was found. Pro users no longer see the purchase banners.
- Verification: `npm run typecheck` passes.

Billing testing must use a Play-installed internal/closed-test build and a licensed tester account. A sideloaded debug APK may not return products. The Play Console payments-profile/KYC warning is an account-side release blocker and cannot be resolved in app code.

### 2026-08-21 — iOS-exact Paywall behavior port

- Replaced the simplified Android paywall with a structural port of `PaywallView.swift`, `PaywallPartials.swift`, and `MultiImageSlider.swift`.
- The header now cycles all six phone (`pw1`–`pw6`) or tablet (`pw7`–`pw12`) assets with the iOS alternating wipe transition (770 ms), 180 ms pause, and continuous 3.5% zoom pulse.
- Added the staggered feature-row entrance animation, persisted once-per-day randomized join count, selected-plan haptics, yearly per-week price calculation, dynamic localized renewal/trial copy, discount badge, CTA press scale, nudging arrow, loading state, legal links, restore action, and optional guarantee row.
- Ported all paywall Remote Config controls and defaults: default plan, close visibility/delay/progress ring, discount, approved price presentation, guarantee, user count/range, and free-trial CTA wording.
- Extended normalized Play products with free-trial day extraction from Google Play pricing phases.
- The layout retains iOS small-phone and iPad-specific header heights/vertical offsets and becomes vertically scrollable when Android system bars or compact screens reduce usable height.
- Verification: `npm run typecheck` and `:app:compileDebugKotlin` both pass.

Don't regress the paywall back to a single cross-fading/zooming image: its transition is an alternating directional reveal between two full-width images, matching the Swift mask animation.

### 2026-08-21 — Paywall iOS parity pass (slider fix + header/pill/haptics)

- Fixed the hero `MultiImageSlider` flash: indices were swapped at wipe completion while the mask stayed collapsed through the 180ms pause, exposing the image AFTER next each cycle. Now the pause happens first (base layer correctly shows the just-arrived image) and the swap + mask reset + relaunch run in one JS tick, which paints identical pixels on both sides of the swap. Timings locked to iOS effective values: ~770ms ease-in-out slide, 182ms pause, 1.1s autoreversing 3.5% zoom.
- Slider images now use iOS top-anchored aspect-fill (computed from `Image.resolveAssetSource`) instead of RN center-crop `cover`, preserving the artwork's baked-in bottom fade.
- Header actions row now uses the real `useSafeAreaInsets().top` (+10 phone / +20 iPad) instead of a hardcoded s(38) inset.
- Close button parity: two drawn 11×1.5 rotated bars replace the text '×'; base ring is solid white unless the RC close delay is on (then 0.4 white + animated trim, matching iOS `delayCloseButton`); the button stays VISIBLE during the countdown (opacity is governed only by `isShowPaywallCloseButton`) but disabled, as on iOS.
- Join pill corrected to iOS 258.83×32 (was 259×40) and the -2 bottom margin removed.
- Added iOS light-impact haptics on Restore, close, CTA, and the legal links; renew line is hidden when the store product is not loaded (iOS conditional).
- Plan rows deliberately remain visible with '—' prices until Google Play subscription products are configured (iOS hides unloaded plans); this is the documented Play-Billing-pending platform difference.
- Verification: `npm run typecheck` passes.

Don't regress: never swap slider indices while the wipe mask is collapsed with the pause pending; keep the slider's one-tick swap; keep the close ring conditional on the delay flag.

### 2026-08-21 — Paywall verified on emulator; pill/hero rendering fixes

- Reproduced the user's broken paywall on the Pixel_4a emulator (debug APK + Metro) and verified fixes visually via screencap bursts.
- Root cause of the "destroyed" layout: on Fabric, `Image` with `StyleSheet.absoluteFill` and no explicit dimensions rendered the join-pill PNG at its intrinsic 777×121 size, overflowing over the yearly plan card. Fixed with explicit width/height (s(258.83)×s(32)). Never size a Fabric `Image` by absolute edges alone.
- Slider verified frame-by-frame: clean alternating wipe boundary, correct image order, no wrong-image flash, top-anchored fill correct.
- Added `paddingBottom: insets.bottom` to the paywall ScrollView content so the legal row clears 3-button navigation bars.
- Emulator left booted (Pixel_4a, swiftshader GPU). RN-IAP does not initialize on the emulator (no Play Billing) — plans show the '—' placeholder there; real prices load on physical devices with Play services.
- Verification: `npm run typecheck` passes; final emulator screenshot matches the iOS reference layout.

Don't regress: keep explicit dimensions on the pill image; keep the bottom-inset padding on the paywall scroll content.
