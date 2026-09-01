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
| Paywall | ✅ | iOS-exact layout/slider/RC variants; live Play products `com.chorebuddy.yearly` (base `chorebuddy-yearly` + `yearly-offer`) and `com.chorebuddy.weekly` (base `chorebuddy-weekly`) |
| Gift paywall | ✅ | Art/countdown/price/CTA plus the Home+Settings banner; live Play product `com.chorebuddy.yearlygift` (base `chorebuddy-yearlygift`) |
| Google/Firebase Auth | ✅ foundation | Google-only as requested; device verification pending |
| Household setup | ✅ foundation | Exact users/households/members schema, listeners, create/join/claim flows; member admin/leave screens pending |
| Notification prompt | ✅ | Exact copy/art/buttons; Android runtime permission via Expo Notifications |
| Native stack + tabs | ✅ foundation | Principal destinations declared; Zone detail/create now use real native-stack screens |
| Home/Zone/Chart/Stats | 🟡 | Home, Zone, and weekly Chart are real-time/data-driven; Stats remains a shell |
| Add Chore + detail sheets | ✅ | Wizard, iOS-exact Chore Detail/edit (2026-08-27), occurrence Status/override actions, picker sheets, and photos |
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

### 2026-08-25 — Onboarding copy flash: the title reset ran after paint, not before

The user reported the title/subtitle still flashed on page change: they appeared instantly (already settled), vanished, then re-animated. The 2026-08-24 pass moved the copy to `settled` but left the hide in the wrong phase.

The `settled` effect did `titleIn.setValue(0)` inside `useEffect`, which runs only AFTER React commits and the frame paints. So on a page swap the new strings rendered while `titleIn` was still 1 from the previous page's finished spring → new title painted fully visible for a frame (or more, native-driven setValue is async) → the effect blanked it → the 400/600 ms springs replayed it. Exactly the reported already-there/disappear/reappear.

Rethrive already solved this in `OnboardingShell.tsx` ("Reset the title to hidden SYNCHRONOUSLY when the step changes — BEFORE paint"): setValue(0) during render, guarded by a last-seen-key ref, so the swapped text paints at opacity 0 from frame one. Ported that pattern: `lastCopyReset` ref guards a render-time `titleIn/subtitleIn` reset when `settled` changes; the effect now only starts the springs. A canceled swipe that lands back on the same page leaves the guard untouched, so the visible copy neither blanks nor re-animates. `PageReveal` needs no change — an incoming page's art is already at 0 from its deactivation reset before it ever paints as active.

Verification: `npm run typecheck` passes. Not screenshot-verified: a one-frame race is below screencap burst rate (the 2026-08-24 burst "pass" is how this survived), and only the physical device is attached, gated behind force update. The claim is mechanism removal — the value can no longer be 1 when the new text first paints.

Don't regress: animated values that gate swapped-in content must be reset synchronously during render behind a last-seen-key ref, never in `useEffect` — an after-paint reset IS the flash. The effect keyed on `settled` may only start animations.

### 2026-08-25 — Paywall vertical fit: spacing squeezes so nothing falls below the fold

On the moto g35 the paywall's helper line ("Free for 3 days…") and the Privacy/Terms row rendered below the screen edge and were only reachable by scrolling. iOS never has this problem because its paywall owns the whole screen; on Android system bars and shorter aspect ratios shrink usable height while every iOS spacing token is width-scaled (`s()` is width/375), so height never entered the layout at all.

- `PaywallView` now computes a squeeze factor `fit` ∈ [0.5, 1] applied ONLY to the vertical spacing tokens — body gap/paddingBottom, feature-list gap, plans-area gap, plan-list gap, and the bottom stack's gap (`FIT_SQUEEZE_S` = 177 s-units total). Content sizes (hero height, text, plan cards, CTA) are untouched, so the design stays iOS-exact and only breathing room compresses.
- A width-math estimate seeds the first frame (no visible jump on most devices), then `onContentSizeChange` measures the real rendered content and corrects `fit` exactly: layout is linear in `fit`, so `next = fit + (screen.height − contentHeight)/s(FIT_SQUEEZE_S)` lands in one pass. It only ever tightens (the `minHeight: screen.height` container can't report natural heights smaller than the screen, so loosening is unmeasurable) and re-runs when late content arrives (Play prices → renew line, RC join pill).
- The ScrollView remains as the fallback for extremes — at `fit` = 0.5 (e.g. very large accessibility font scales) the remaining overflow still scrolls, and the pinned `HeaderActions` keep Restore/✕ reachable regardless.
- Verification: `npm run typecheck` passes. Device screenshot verification blocked: the moto g35 is PIN-locked (secure keyguard screencaps return black), and no emulator is booted. The measured-correction mechanism is the fit guarantee, not the seed estimate — my token math for the seed under-predicted the real overflow, which is exactly why the measure pass exists.

Don't regress: never let the paywall's helper/legal rows depend on scrolling to be visible on phones; the squeeze must keep applying to spacing only — shrinking content sizes (hero, cards, CTA) to fit would silently diverge from the iOS design.

### 2026-08-25 — Bottom safe-area sweep: every bottom-anchored control made inset-aware

The gift paywall's Collect Gift CTA and the notification screen's No Thanks button rendered touching or behind Android's navigation bar. Root cause is systemic: the app runs edge-to-edge (the RN window includes the system-bar zones), and every bottom-anchored offset was a fixed width-scaled `s()` constant copied from iOS, where the safe area is the whole screen. On a 48dp 3-button bar, any offset under ~48dp lands behind the bar.

Swept the repo for `bottom: s(N)` / `paddingBottom: s(N)` on bottom-anchored bars/CTAs and applied one pattern everywhere: `Math.max(s(designValue), insets.bottom + s(12..16))` — the iOS design offset survives untouched on gesture-nav/no-inset devices, and the control lifts just clear of larger bars. Fixed: `GiftPaywallView` (CTA 38), `NotificationPermissionView` (root paddingTop/Bottom 55/40), `HouseholdSetupView` (actions 30), `CreateHouseholdView` + `MemberSelectView` (footer 20), `JoinHouseholdView` (footer padding 20), `MainTabs` tab-bar row (33), `ZoneDetailView` (bottomCta padding 40), `CreateZoneView` (footer 40), `MembersView` (both bottomCta 20 + toast), `AddChoreView` (bottomBar 20 + toast). The Members/AddChore validation toasts keep their iOS 80pt gap above the CTA (`insets.bottom + s(92)`). Deliberately unchanged: `SignInView` (`bottom: s(68)` already clears any bar), the paywall (its actions are top-pinned and its scroll content already pads `insets.bottom`), and sheet CTAs inside `BottomSheet` (the sheet card itself is height-capped).

Verification: `npm run typecheck` passes. On-device screenshots were blocked twice by the phone's secure lockscreen (PIN + short screen timeout; screencaps of the keyguard return black); the app is on Metro 8083 so Fast Refresh delivers these changes live once unlocked.

Don't regress: any new bottom-anchored bar, CTA, or toast must use `Math.max(s(iOSValue), insets.bottom + margin)` — never a bare `s()` bottom offset; the RN window includes the navigation-bar zone on edge-to-edge Android.

### 2026-08-25 — Home progress card: Android font padding pushed content out of the card

The Home progress card's caption and gradient bar rendered below the FDF2FD card instead of inside it. The RN structure was a correct port of iOS `progressCard` (150pt card, 17pt top padding, 12/9 stacks); the overflow came from text metrics: Android lays out SF Pro Rounded lines with large ascent/descent padding, so the five Texts (title 18, date 11, count 30/15, caption 12) each ran taller than SwiftUI's, adding ~40dp and shoving the tail out of the fixed-height card.

Fixed by giving the card's texts explicit iOS-equivalent line heights plus `includeFontPadding: false` (Android-only): title 22, date 14, count 36/18, caption 15 — content now sums to ~146 s-units inside the 150-unit card. Verified live on the moto g35 via Fast Refresh screenshot: caption and bar sit inside the card exactly as on iOS; the tab bar also confirmed clear of the 3-button nav bar (previous entry's fix).

Don't regress: any fixed-height layout that stacks Texts must pin `lineHeight` (and `includeFontPadding: false`) — Android's default SF Pro Rounded line boxes are much taller than SwiftUI's and will overflow iOS-sized frames.

### 2026-08-25 — Background parity: appBg image removed everywhere except the one screen iOS uses it

The user reported the Home background (and card surroundings) not matching iOS. Root cause: 14 RN screens painted the full-screen `appBg` IMAGE (baked purple gradient art) under their content, but on iOS `Image(.appBg)` appears in exactly ONE view — `NotificationPermissionView`. Every other iOS screen sits on flat `Color.appBackground` = #FBF7FD (`Color + Extension.swift`), painted by `MainView`. RN `colors.background` is already #FBF7FD, so removing the image restores exact parity.

Removed the `Images.appBg` absoluteFill from Home, Zone, Chart, Stats, Settings, Members (3 sites), Overview, ZoneDetail, CreateZone, AddChore, ChoreStatus (2 sites), ChoreDetail, and MainScreens; kept it in NotificationPermissionView only. Verified all 13 roots carry `backgroundColor: colors.background`. Home's progress card was re-verified token-by-token against `HomeView.swift` `progressCard` (card 150/#FDF2FD/radius 20, glow center x=20 vertically centered, bunny 102.7×160 trailing 8, content 20/17, gaps 12/9/4/10, fonts 18/11/30/15/12 at 100/60/100/40/50% opacity, track 151×8 FF819E 20%, FB4786→FD6A96 fill) — with the earlier line-height fix, no other deltas remain.

Figma note: the user supplied Figma dev links (file 1ydEE38jtIhIInxrjbawYt, nodes 2-397 and 2-18499) for pixel verification, but the Figma MCP account has no access to that file ("file owner can share it and make you an editor"). Once access is granted, re-audit Home against those nodes.

Don't regress: `appBg` is only for NotificationPermissionView; all other screens are flat `colors.background` — matching iOS `MainView`'s `Color.appBackground`. Never re-add background art iOS doesn't have.

### 2026-08-25 — Progress card background: user-supplied Figma SVG export

Superseding the BlurCircle glow below for THIS card only: the user exported the card background from Figma (`assets/images/bannerImg.svg`, from `~/Downloads/bannerImg.svg`) and asked to use it directly. The SVG carries the full Figma treatment the code never had: #FDF2FD fill masked by a linear fade (the card dissolves toward the bunny, which sits on the page background), a 10% gradient stroke, the top-left blurred glow (r 72.3, 10%, blur 50), and the 5% drop shadow. `HomeView.ProgressCard` renders it absolutely at (−4, 10) — the SVG's card rect sits at (4,2) in a 353×158 canvas — under the bunny/content overlays. Width is `windowWidth − 2·s(15) + s(8)` with `preserveAspectRatio="none"`: equal to s(353) on phones (no distortion), stretched on iPad where the card is fluid. Verified live on the moto g35: fade, glow, and stroke all render via react-native-svg's mask+filter support.

Don't regress: the Home progress card background is `bannerImg.svg` — do not reintroduce a code-drawn card fill/glow here without the user asking; content (badge, texts, bar, bunny) stays live RN on top.

### 2026-08-25 — Progress card glow: real Gaussian blur replaces the radial-gradient approximation (superseded for the Home card by the SVG banner above; `BlurCircle` remains for other glow sites)

The user reported the Home progress card colour still off versus iOS. The card fill/tokens were already exact; the culprit was the glow. iOS draws `Circle().fill(#FF819E).opacity(0.25).blur(radius: 45)` — a solid disc through a true Gaussian blur, which keeps a flat core and falls off softly. The RN `RadialGlow` (radial gradient 1→0.55→0, oversized to 230) read as a much stronger, harder-edged pink wash covering half the card.

- `react-native-svg` 15.12.1 ships real SVG filters (added in 15.8), so the iOS rendering is now reproduced literally: new `BlurCircle` in `components/motion.tsx` (Svg absoluteFill + `Filter`/`FeGaussianBlur`, generous filter region, values in design units). The parent card's `overflow: 'hidden'` clips it exactly like iOS `clipShape`.
- `HomeView.ProgressCard` uses `BlurCircle diameter=140 color=#FF819E opacity=0.25 blur=45 cx=20 cy=75` — the iOS geometry (leading-aligned circle, x offset −50, vertically centred in the 150pt card).
- Verified live on the moto g35 via Fast Refresh screenshot: soft diffuse glow matching the iOS reference; no filter rendering errors on Fabric.
- `RadialGlow` remains for the other glow sites (Home/Members/Stats mascots, HouseholdSetup). They can migrate to `BlurCircle` with their iOS values (e.g. Home mascot: 144 circle, purple 12%, blur 40) — do it site-by-site with the iOS numbers, not by reusing the gradient-tuned sizes.
- The user offered a Figma SVG export of the card as an alternative; not needed — the filter is exact and keeps the card fully code-driven (dynamic width, floating bunny, live progress).

Don't regress: glows that iOS builds with `.blur(radius:)` must use `BlurCircle` (real Gaussian blur), not radial gradients, when pixel parity matters; never bake the card into a static image.

### 2026-08-26 — Add Chore icons + progress-card glow: three separate root causes

**1. Back arrow "broken" — missing `fill="none"` on stroked glyph paths.** SVG's initial `fill` value is BLACK, and the source assets rely on `fill="none"` declared on the root `<svg>`. The hand-ported glyphs in `components/glyphs.tsx` set only `stroke`, so react-native-svg filled every implicitly-closed subpath black — the back arrow's "<" head rendered as a solid black triangle (same for the Continue arrow and any other closed stroke path). `CheckmarkGlyph` already had `fill="none"`, which is why the tick looked right and masked the pattern. Added `fill="none"` to all 28 stroke-only `<Path>` elements; paths that legitimately carry `fill={color}` were left untouched (verified by diff).

**2. Zone checkbox "broken" — Fabric intrinsic-size fallback.** `ChoreCheckbox` drew `choreCheckbox.png` (66x66) with `StyleSheet.absoluteFill` and no explicit width/height. On Fabric an Image sized only by absolute edges falls back to its intrinsic size, so the checkbox rendered 66dp wide and spilled outside the zone card. This is the exact bug already recorded for the paywall join-pill on 2026-08-21. Fixed with an explicit `checkboxArt` style (position absolute + width/height s(22)).

**3. Progress-card glow — Android clamps large blur radii.** Measured the rendered card against the Figma node (G channel, card fill G=242): design falls 236/239/241 at x=5/100/160 — a wide gentle wash. The `BlurCircle` (real `FeGaussianBlur`) version rendered 213/242/242 and the Figma-exported SVG's own blur rendered 231/242/242: both ~2-5x too strong at the left edge with NO spread. Cause: Android clamps Gaussian blur radii (the export asks for stdDeviation=50, ~144 physical px), collapsing the glow into a blob. Replaced the blurred circle inside `bannerImg.svg` with a `radialGradient` whose stops reproduce the blurred-disc profile analytically (disc r=72.3 blurred at sigma=50, 10% -> 7 stops over r=200 at the same centre). Predicted profile now lands within 0.4/255 of the design at every sample point. Everything else in the export (fill, fade mask, gradient stroke, drop shadow) renders correctly and was left as-is.

Also tightened the card's text line heights to the design's real SF Pro Rounded line boxes (fontSize x 1.193: 21.5/13.1/35.8/17.9/14.3), read off the Figma text styles.

Verification: `npm run typecheck` passes; the glow fix is verified analytically against sampled Figma pixels (the maths is in the session log above), NOT on device — the phone re-locked and its secure keyguard returns black screencaps. Fixes 1 and 2 are structural and need no pixel check.

Don't regress: every stroke-only `<Path>` in `glyphs.tsx` needs an explicit `fill="none"` — SVG defaults fill to black. Never size an Image by `absoluteFill` alone on Fabric. Do not reintroduce large-radius Gaussian blur for the card glow; Android clamps it — the radial-gradient approximation of the blurred disc is the accurate technique here.

### 2026-08-26 — Stroked SVG shapes, peek bunny aspect, stepper centring, instant selection

Follow-up to the same-day entry below; four more defects, three of them one-line classes of bug.

- **Clock icon rendered as a solid black disc.** The previous pass added `fill="none"` to stroke-only `<Path>` elements but NOT to the other shape primitives. `AlarmGlyph`'s clock face is a `<Circle>` with stroke and no fill, so SVG's default black fill painted the whole dial. Swept `<Circle>/<Ellipse>/<Rect>/<Line>/<Polygon>/<Polyline>` the same way (7 more elements across AlarmGlyph, SchedCustomGlyph, SubtasksGlyph and others). Rule now covers every stroked shape, not just paths.
- **Peek bunny distorted.** iOS `BlinkingBunnyPeek` is `BlinkingBunny(width: 113, height: 104)`; RN's `PeekBunny` defaulted to `88.63x104`, squashing a 337x312 asset (native ratio 1.08) into ratio 0.85 — a 22% horizontal crush. Set 113x104. Also aligned the leading anchors to the iOS sheet numbers: iOS puts the peek in a 130-wide frame with `.padding(.leading, 35)`, so the image's left edge lands at 43.5 (was 40); hands `.padding(.leading, 50)` with the row's own -5 x offset = 45 (was 54).
- **Step numbers off-centre in their badges.** `stepNumber` had no `lineHeight`/`includeFontPadding`, so Android's asymmetric font padding shifted the digit inside the 20pt circle. Pinned `lineHeight: s(20)` + `includeFontPadding: false` + `textAlign: 'center'`.
- **Selection felt slow — made instant (deliberate iOS divergence, user-requested).** Tapping a zone row, preset chore, or weekday chip ran TWO springs: `PressScale` (iOS `ScaleButtonStyle`, response 0.3) plus `ChoreCheckbox`'s selection spring (response 0.35, damping 0.6). Those three lists now use a plain `Pressable`, and `ChoreCheckbox` renders its state directly with no `Animated` value. Haptics are unchanged. `PressScale` stays everywhere else (back button, CTAs, trash/plus buttons) so the rest still matches iOS.

Verification: `npm run typecheck` passes; JSX tag balance checked programmatically after the PressScale->Pressable rewrite. Not verified on device — the phone re-locked and its secure keyguard returns black screencaps.

Don't regress: `fill="none"` is required on EVERY stroked SVG shape in `glyphs.tsx`, not only `<Path>`. The peek bunny is 113x104 — never re-narrow it. The three Add Chore selection lists are intentionally un-animated; do not "restore" the iOS press spring there without the user asking.

### 2026-08-26 — Sheet safe area moved into the shared card + nested wheel scroll

Two follow-ups after the previous entry's per-footer approach proved both incomplete and misplaced.

**Safe area now belongs to the sheet card, not each footer.** The per-footer `Math.max(...)` shims missed `assignCta` (the Assign Task sheet's Done — a different style from the ones patched), and would have gone on missing `ScheduleSheets`' download/snooze footers, `ChoreStatusView`'s `sheetFooter`, and `SelectOptionSheet`'s `optionRow`. Replaced the whole approach with one line in `BottomSheet`: the card carries `paddingBottom: insets.bottom`. Every sheet's content — CTAs included — now clears the navigation bar automatically, and each footer keeps its plain iOS design padding on top, which is exactly how iOS measures (design offsets start at the safe-area edge). Reverted the four `AddChoreSheets` footers and `ProfileSheets`' `formFooter` to their original design values and deleted the `useFooterPad` helper. Absolutely-positioned children like `assignFooter` (`bottom: 0`) were ASSUMED to land correctly inside the parent's padding box — **this turned out to be wrong**, see the 2026-08-27 sheet-footer entry; they anchor to the card's border box and need their own inset.

**Wheel pickers would not scroll.** `WheelPicker`'s `ScrollView` sits inside another vertical `ScrollView` (Add Chore step 3's page scroll, `AddChoreView.tsx:402`, holding the custom interval/unit wheels). On Android the parent keeps the drag and the inner list never moves unless the child opts into nested scrolling. Added `nestedScrollEnabled` to the wheel's ScrollView.

Verification: `npm run typecheck` passes. Not device-verified — the phone is off ADB.

Don't regress: sheet bottom insets live in `BottomSheet`'s card, once — do NOT re-add per-footer inset maths, and do not remove the card padding. Any vertical ScrollView nested in another needs `nestedScrollEnabled` on the INNER one.

### 2026-08-26 — Sheet CTA safe area + custom keyboard "Done" bar copied from SC9

**Sheet CTAs sat under the navigation bar.** The 2026-08-25 safe-area sweep deliberately skipped sheet CTAs on the assumption that the height-capped sheet card kept them clear — that assumption was wrong. The sheet card is bottom-anchored to the window, so its footer padding IS the only thing between the button and the nav bar: `createFooter`/`formFooter` used `paddingBottom: s(30)` (~33dp) against a 48dp bar, putting "Create" behind it, and `footer`'s `s(55)` left only a few dp. All sheet footers now use the standard pattern — `Math.max(s(designValue), insets.bottom + s(16))` — via a small `useFooterPad()` helper in `AddChoreSheets.tsx` and directly in `ProfileSheets.tsx`'s `CreateProfileBody`.

**Custom keyboard Done bar (`KeyboardDoneBar` in `BottomSheet.tsx`).** The user asked for SC9 ChatView's above-keyboard Done button, rebuilt by hand at the identical position. SC9 gets it from `react-native-keyboard-controller`'s `<KeyboardToolbar>`, which ChoreBuddy does not depend on — and SC9's own note records that the library toolbar closed every bottom sheet on tap (Android Modal dismiss propagation), i.e. exactly this context. So it is hand-built, with geometry copied verbatim from the library stylesheet so x/y match SC9 exactly: absolute, full width, height 42 (`KEYBOARD_TOOLBAR_HEIGHT`), row + `alignItems: center`, background `#f3f3f4`, and the Done label right-aligned with `marginLeft 8 / marginRight 16`, `fontSize 15`, `fontWeight 600`, `#2c2c2c`. These are RAW pixels, deliberately NOT `s()`-scaled — the library does not scale them and matching SC9 was the requirement.

Ported SC9's `useKeyboardHeight` hook verbatim (`src/hooks/useKeyboardHeight.ts`, plain RN `Keyboard` listeners; Will* on iOS, Did* on Android, never `didChangeFrame`). The bar sits at `bottom: kbHeight + insets.bottom` — under edge-to-edge + `adjustResize` the window is not resized and `endCoordinates.height` under-reports by the bottom inset, which is the same correction SC9's ChatView applies. It mounts once inside `BottomSheet`, so every sheet with a text field gets it, and renders nothing while the keyboard is down. ChoreBuddy's sheets are plain absolute-fill Views (no RN `Modal`), so the SC9 sheet-closing hazard cannot occur here.

Verification: `npm run typecheck` passes. NOT verified on device — the phone locked and then dropped off ADB entirely, so the keyboard offset in particular (`kbHeight + insets.bottom`) is reasoned from SC9's documented behaviour under identical Android config, not measured here. Check it on the Create Profile sheet's name field first.

Don't regress: sheet footers are bottom-anchored to the window — they need the inset pattern like every other bottom CTA. Keep `KeyboardDoneBar`'s values unscaled; they intentionally mirror the SC9/library toolbar.

### 2026-08-26 — Tab bar icon/label spacing: the tokens matched iOS, the rendered box did not

The user reported the gap between each tab icon and its label being too large, with the icon looking tight to the top of the tab. Checked both sources before changing anything: iOS `BottomTabs.tabButton` is `VStack(spacing: 2)` with a 24x24 icon and a 10pt medium label (tracking 0.2), and the Figma node agrees exactly — tab stack 60x38, `itemSpacing` 2, icon 24x24 at relY 0, label 60x12 at relY 26, font 10px lineHeight 11.9. RN already had gap `s(2)`, icon `s(24)`, `font('medium', 10)`, `letterSpacing 0.2` — token-for-token identical.

The mismatch was the RENDERED box, the same Android font-padding class of bug as the Home progress card and the Add Chore step numbers: with default `includeFontPadding` the 10pt label's box gains ~4-5dp above and below the glyphs, so (a) the visible icon-to-text gap read as ~6-7dp instead of 2, and (b) the stack rendered taller than 38, which — centred in the 54-tall tab — left the icon tight to the top. Pinned `lineHeight: s(11.9)` (the design's real line box, 10 x 1.193) + `includeFontPadding: false`, so the stack renders 24 + 2 + 11.9 = 37.9 ≈ the design's 38 and re-centres.

Verification: `npm run typecheck` passes; the target geometry is read directly from the Figma node and iOS source rather than eyeballed. Not device-verified — the phone is off ADB.

Don't regress: this is the third instance of the same root cause. ANY Text inside a fixed-height or tightly-spaced iOS-derived layout needs an explicit `lineHeight` plus `includeFontPadding: false`; matching the spacing tokens alone does not make Android match iOS.

### 2026-08-26 — Empty-state mascot glow: matched to the Figma node (2-30678)

The user reported the pink glow behind the Chart empty-state bunny as too big, too dark and the wrong colour. Pulled the node (`2:30678`, Chores Chart -> Empty state) and read the real spec: `Ellipse 1546`, 144.6 diameter, fill **#FFC7CE**, node opacity **0.30**, LAYER_BLUR radius **100** (Figma radius = 2x Gaussian sigma, so sigma 50 — same source geometry as the Home progress-card glow).

The code had `RadialGlow size={190} color="#FFC7CE73"`. The colour was right but the alpha was **0.45 vs the design's 0.30**, and `RadialGlow`'s generic 1 -> 0.55 -> 0 ramp packs that into a 190-wide disc, so it read as a small dark blob instead of the design's wide, very light wash (the real one only reaches ~0.2 alpha at its centre and fades out by ~200 units).

Added `SoftGlow` to `motion.tsx`: the analytic blurred-disc falloff for that circle as a 7-stop radial gradient over radius 200, parameterised by colour + Figma fill opacity. Android clamps large blur radii, so a real `FeGaussianBlur` cannot be used here (documented on the progress card) — the gradient is the accurate technique. **Verified numerically against the Figma render**: predicted vs sampled green channel at d = 60/80/100/120/140/170 is 240.3/242.0/243.6/245.0/245.9/246.6 against 240/242/244/245/246/247 — within 0.4/255 everywhere. Each instance gets a unique gradient id (`useId`) so several glows on one screen cannot share a paint.

Applied to all three screens carrying this identical element: `ChartView` (empty state, plus the Figma -6.6 y offset from the mascot's centre), `MembersView`, and `ZoneDetailView`. `MembersView`'s separate purple member-empty glow still uses `RadialGlow` and is untouched.

Verification: `npm run typecheck` passes; glow correctness is verified against sampled Figma pixels rather than by eye. Not device-verified — the phone is off ADB.

Don't regress: this glow is #FFC7CE at 0.30 through `SoftGlow`, not `RadialGlow` — `RadialGlow`'s fixed ramp is far too strong for design glows and remains only for the sites not yet checked against Figma. Never raise the alpha to "make it visible"; the design really is that light.

### 2026-08-26 — Every mascot glow swept onto SoftGlow

Audited all nine glow sites in the app against both sources.

iOS (`grep 'blur(radius' *.swift`) — Home mascot / Stats / ForceUpdate / JoinHousehold use `appPurple` at 0.12 (144 circle, blur 40); Members-empty and HouseholdSetup use `appPurple` at 0.18 (145/160, blur 45); Chart, ZoneDetail and the member profile use `#FFC7CE` at 0.45 (144/135/120, blur 40).

Figma — EVERY mascot glow is the same construction: `#FFC7CE`, fill opacity **0.30**, LAYER_BLUR **100**, differing only in diameter (144.6 on Empty Home / Empty member / Stats-empty / Chart-empty, 134.8 on the zone empty, 97.9 on the owner-profile empty). Verified on nodes 2:397, 2:439, 2:5378, 2:13634, 2:5577, 2:30678.

So iOS and Figma genuinely disagree on this element: iOS paints several of them purple at 0.12/0.18, the design paints all of them pink at 0.30. Put the question to the user, who **chose iOS** — purple stays purple. Only the RENDERING was fixed; every site keeps its iOS colour and opacity. This is now a settled decision: do NOT "correct" these glows to the Figma pink in a future parity pass.

- `SoftGlow` now takes `diameter` and covers the design's three circle sizes. A smaller disc under the same blur keeps nearly the same extent but a lower peak, so 134.8 and 97.9 carry numerically-derived peak scales (0.917 / 0.590) instead of assuming the glow scales proportionally. A numeric blurred-disc model was also written and CHECKED against the sampled Figma pixels — it ran ~15% low, so the hand-verified 7-stop profile (within 0.4/255) was kept as the base and the model used only for ratios.
- Converted all nine sites: Chart, Home mascot, Stats, ForceUpdate, Members-empty, member-profile empty (diameter 97.9), ZoneDetail (134.8), HouseholdSetup, JoinHousehold.
- The two household gates were the worst offenders — a plain `View` with `borderRadius` and a flat `purple2E`/`purple1F` fill, i.e. a HARD-EDGED disc with no gradient or blur at all. They now use `SoftGlow` too.
- Deleted `RadialGlow`. It is unused now, and its fixed 1 -> 0.55 -> 0 ramp is what made every one of these read as a dark blob; leaving it exported invites the regression back.

Verification: `npm run typecheck` passes. Not device-verified (phone off ADB); glow accuracy rests on the pixel comparison recorded in the previous entry.

Don't regress: mascot glows go through `SoftGlow` with the design's diameter — never a plain `View` circle, never a generic radial ramp, and never a raised alpha to "make it visible". Glow COLOURS follow iOS by explicit user decision (2026-08-26), even though Figma shows pink for all of them.

### 2026-08-26 — Create Zone chip: plus icon now white

The plus inside the Zone tab's purple "Create Zone" chip rendered dark. iOS draws it as a template tinted white (`ZoneView.swift:222`: `Image(.zoneDownloadIcon).renderingMode(.template).foregroundColor(.white)`), but the RN code imported the SVG component directly and `zoneDownloadIcon.svg` hard-codes `stroke="black"` on its path — a `color`/`stroke` prop on the root `<Svg>` cannot override an attribute the child sets itself. Same reason the Copy/Share/Edit/Chevron glyphs were hand-ported earlier.

Added `ZonePlusGlyph` to `glyphs.tsx` (same path/strokeWidth/linecap as the asset, plus the mandatory `fill="none"`) and used it at `colors.white`. `zoneDownloadIcon` had no other call site.

Verification: `npm run typecheck` passes. Not device-verified (phone off ADB).

Don't regress: an SVG asset with a hard-coded `stroke`/`fill` cannot be tinted by props — port it into `glyphs.tsx` as a tintable glyph, and remember `fill="none"`.

### 2026-08-27 — ROOT CAUSE of "chore saved but not displayed": Hermes cannot parse the stored due-date format

Not a Firestore problem at all. The user's follow-up localised it precisely: the same Google account showed the new chore **on iOS**, and on Android it appeared in **Stats** but not on Home or Chart. Data was reaching the device; a filter was rejecting it.

`ChoreContext.parseDate` (and the identical `dueState.parseDueDate`) turned the stored `"27 August, 2026"` into a Date via ``new Date(`${month} ${day}, ${year} 00:00:00`)``. That string format is implementation-defined: **iOS's JavaScriptCore accepts it, Hermes does not.** Proved it by running the actual Hermes binary shipped in the repo (`node_modules/react-native/sdks/hermesc/osx-bin/hermes`):

    non-ISO 'August 27, 2026 00:00:00' -> Invalid Date
    ISO     '2026-08-27T00:00:00'      -> Thu Aug 27 2026 00:00:00
    components new Date(2026,7,27)     -> Thu Aug 27 2026 00:00:00

So on Android `parseDate` returned null for EVERY chore, `choreOccurs` bailed at `if (!anchor) return false`, and `todaysChores` was always empty — Home showed "Looks like today is chore-free" and Chart showed nothing. Stats was unaffected because it derives from `choreEvents` documents and `dayKey` strings parsed as `${key}T00:00:00`, which is ISO and works on Hermes. That asymmetry is exactly what the user observed.

Both parsers now build the date from its components (`new Date(year, monthIndex, day)`), with a case-insensitive month lookup and a null return for an unknown month. Re-ran the fixed parser under Hermes across several dates including a lowercase month and invalid input — all correct, and the due-today occurrence check now returns true.

Only these two sites used the non-ISO form; the six `${key}T00:00:00` parses elsewhere are ISO and were verified fine on Hermes.

Don't regress: NEVER pass a non-ISO date string to `new Date()` — Hermes only guarantees ISO 8601, so anything else works on iOS and silently returns Invalid Date on Android. Build dates from components, or use `YYYY-MM-DDTHH:mm:ss`. The Hermes binary at `node_modules/react-native/sdks/hermesc/osx-bin/hermes` runs plain JS and is the fastest way to settle engine-behaviour questions without a device.

### 2026-08-26 — Chore saved but not displayed: hardened the Firestore read path (the listener audit that preceded the real fix above)

User reported creating a chore and not seeing it. Could NOT reproduce — the phone is off ADB, so no logcat and no way to inspect the document. Audited the write -> read path instead and found three real defects, one of which can produce exactly this symptom.

1. **`orderBy('createdAt')` can exclude the document you just wrote.** Both the chores and zones listeners queried `.orderBy('createdAt')`, while `saveChore` writes `createdAt: serverTimestamp()`. Firestore's `orderBy` drops any document lacking the ordered field, and a server timestamp is unresolved on the local snapshot until the server acknowledges it — so a freshly created chore can be saved yet missing from the query result. Both listeners now read unordered and sort in JS (`byCreatedAt`), with unresolved writes sorting last (newest), which is where a new chore belongs. Ordering behaviour is unchanged for existing documents.
2. **Every listener swallowed its errors.** All six `onSnapshot` calls passed only a success callback, so a rules rejection or failed query left the screen silently empty. They now pass `listenerError(label)`, which warns to console and records to Crashlytics. `saveChore`'s `catch { return null; }` also discarded the error — it now logs and records before returning null.
3. **The listener effect keyed on the `household` OBJECT.** `parseHousehold` builds a new object per snapshot, and `saveChore` bumps `choreCreatedCount` on the household doc — so every chore creation changed the object identity, tore down all six listeners, cleared every list, and resubscribed. Keyed on `household?.id` instead.

Verification: `npm run typecheck` passes. NOT verified against a live Firestore — the fix for (1) is reasoned from documented `orderBy` semantics, and (2)/(3) are unambiguous defects regardless of what caused this specific report.

Diagnostic for next time: Home distinguishes the two cases. "No Chores Yet!" means `chores.length === 0`, i.e. nothing loaded from Firestore. "Looks like today is chore-free." means the chore DID load but `choreOccurs` says it is not due today — expected for a Monthly/custom-interval/future-dated chore, not a bug. Ask which one appeared before digging into Firestore.

Don't regress: never `orderBy` a field written with `serverTimestamp()` in a listener that must show freshly created documents. Every `onSnapshot` needs an error callback. Effects that open listeners key on `household?.id`, never the household object.

### 2026-08-27 — Gift banner rebuilt against LifeTimeGiftOfferBannerView.swift

The Home lifetime-offer banner was visibly broken. Five divergences from the iOS source:

1. **Price row stacked instead of inline.** iOS is `HStack(spacing: 6) { originalPrice, discountPrice, rightArrowIcon }`; RN had two Texts in a default-column View with a literal "›" glued onto the price string, so the struck-through price wrapped onto its own line. This was the most visible break.
2. **Banner was double-padded.** It carried `marginHorizontal: s(15)` while all three call sites (Home's scroll, the chore-free body, Settings' content) already pad 15 — so it rendered 30 in from each edge, visibly narrower than the progress card above it. iOS puts the banner inside containers that supply the 15. The component now carries no horizontal margin. The Home-only `.padding(.top, 15)` moved into `HomeGiftBanner`, because iOS Settings drops the banner straight into a `VStack(spacing: 15)` with no extra top padding.
3. **Timer pill too tall.** iOS frames the label 100x12 then pads 10/6, i.e. a fixed 112x32 pill; RN let the 16pt label's own line box set the height (~42 on Android). Pinned to the iOS box with an explicit `lineHeight` + `includeFontPadding: false`.
4. **Arrow was a text chevron**, not `Images.rightArrowIcon` at 16x16.
5. **Shadow/size drift**: `elevation: 5` instead of iOS's black-30% / radius 10 / y 6, and the price box was 38 tall instead of 35.

Also added the iPad variants iOS has (`ipadGiftBg`, pill 130 wide, price 156.33, bottom padding 20), the `ActivityIndicator` in-progress state, `resizeMode="stretch"` for the background (iOS `.resizable()` with no aspect ratio stretches, it does not crop), and the iOS press spring (response .3, damping .7) in place of the old speed/bounciness values.

Deliberate deviation, documented in the file: the price box is `minWidth: 116` rather than a hard 116. iOS's fixed frame lets a long price overflow the white background — fine for "$9.99", but "₹1,450.00" alongside a struck-through "₹2,850.00" would spill outside the card. Growing keeps it identical where iOS fits and intact where iOS would not.

Verified on the moto g35 via Fast Refresh: full-bleed banner matching the progress card's width, pill hanging from the top edge with only its bottom corners rounded, and the price row inline as `₹2,850.00  ₹1,450.00  →`.

Don't regress: the banner has no horizontal margin of its own — the parent supplies it. Never re-add one.

### 2026-08-27 — Gift banner "bent" top-leading edge: the Fabric intrinsic-size bug, third occurrence

User reported the banner's top-left edge looking bent/over-curved. Measured it off a device screenshot rather than guessing:

- Banner renders 993x291 px = 345x101 design units — correct size.
- Its top-left corner, however, measured an inset of **144 px** at the top row, decaying gradually to 24 px some 70 px down. A `borderRadius: s(20)` corner should inset ~58 px at the top row and reach 0 by 58 px down. So the rendered curve was roughly 2.5x too large — exactly the "bent" look.

Cause: `iphoneGiftBg` is 1035x303 px with NO `@3x` suffix, so RN treats its intrinsic size as 1035x303 **dp**. The Image was sized only by `StyleSheet.absoluteFill`, and on Fabric that falls back to the intrinsic size (already recorded for the paywall join-pill on 2026-08-21 and the Add Chore checkbox on 2026-08-26). The banner was therefore showing a 3x-magnified crop of the artwork's top-left corner — and the asset has its OWN rounded corners baked in at radius ~17.3 design units. 17.3 x 3 = 51.9 design units = ~149 px predicted, against 144 px measured: the arithmetic confirms the mechanism.

Fixes: explicit `width: '100%', height: '100%'` on the background image (absolute edges alone are not enough on Fabric), plus `backgroundColor: colors.purple` on the card — the artwork's own base colour, sampled from the asset as #9871E8 and identical to `colors.purple`. The fill means the asset's baked transparent corners can never disagree with our radius-20 clip, so the corner is defined solely by `borderRadius`, exactly like iOS's `.clipShape(RoundedRectangle(cornerRadius: 20))`.

Verification: `npm run typecheck` passes. NOT re-measured on device — the phone locked before the reloaded bundle could be captured, so the corner geometry after the fix is unconfirmed. Re-run the corner scan (scratchpad script measures inset-per-row from the banner's top-left) once it is unlocked; a correct radius-20 corner reads ~58 px inset at dy=0 and 0 by dy=58.

Don't regress: NEVER size an Image by `StyleSheet.absoluteFill` alone — always add explicit width/height (or 100%/100%). This is the third time this exact bug has shipped.

### 2026-08-27 — Tab bar now hides behind sheets (iOS `hideBottomBar`), + Stats filter Save button

**Tab bar drew over open sheets.** iOS keeps `AppState.hideBottomBar`, which `MainView` reads as `BottomTabs().opacity(hideBottomBar ? 0 : 1)`; `ScheduleView.openMember/openFilter/openDownload`, `StatsView.openFilter` and every pushed destination set it by hand. Android had no equivalent, so the floating tab bar painted on top of every sheet.

Ported it as `src/services/BottomBar.ts` — a tiny external store read through `useSyncExternalStore`. Two deliberate differences from iOS:
- It is a **counter**, not a boolean, so a sheet presented from another sheet (Add Chore's member sheet opening Create Profile, the Stats filter opening its range picker) cannot un-hide the bar when only the inner one closes.
- It is driven from **`useSheetAnimation`**, the one primitive every sheet uses — the shared `BottomSheet` plus the two hand-rolled sheets in `StatsFilterSheet`. iOS sets the flag at each call site, which is exactly the kind of thing that gets forgotten; doing it in the hook means every current and future sheet is covered for free.

`TabBar` also sets `pointerEvents: 'none'` alongside the opacity: iOS's sheet is a real presentation that swallows touches, whereas here the bar is a sibling view and an opacity-0 view would still eat taps through the sheet.

**Stats filter Save button collapsed to a circle.** Spotted while verifying the above. `PressScale` applies the caller's `style` to an INNER `Animated.View`, so `saveButton`'s `flex: 1` never reached the footer row and the button shrank to its content. Wrapped it in a `saveSlot: { flex: 1 }` layout parent and dropped the ineffective `flex` from the button itself.

Verified on the moto g35: opening the Chart member sheet and the Stats filter sheet hides the bar; closing either (and a Fast Refresh unmount) restores it; Save now fills the row beside Clear all.

**Stats filter footers made safe-area aware.** `StatsFilterSheet` and its nested `StatsRangePicker` are hand-rolled on `useSheetAnimation` rather than the shared `BottomSheet`, so they do NOT inherit its card `paddingBottom: insets.bottom` — their footers sat close to the navigation bar. Both now use `Math.max(s(designValue), insets.bottom + s(10))`: Clear all / Save (design 40) and the range picker's Done (design 55). Measured on device: the Save button's bottom edge now sits 57 dp above the screen edge against a 48 dp bar, i.e. the requested ~10 gap.

Don't regress: sheet presentation state belongs in `useSheetAnimation` — do not re-add per-call-site hide/show. And remember `PressScale` styles land on an inner view: layout props like `flex` must go on a wrapper, not on the PressScale `style`. The two `StatsFilterSheet` sheets bypass `BottomSheet`, so any new footer there needs its own inset maths.

### 2026-08-27 — Stats screen: sheet took seconds to open and the peek bunny froze on dismiss

Both symptoms were one cause: `StatsView` ran the entire stats engine on EVERY render, so a local `showFilter` toggle redid all of it. Sequence on dismiss: the 280 ms exit animation finishes → `onClose()` → `setShowFilter(false)` → StatsView re-renders (expensive) → only then does the sheet unmount. The already-animated bunny therefore sat on screen for the whole re-render. On open the same stall delayed the mount, so the present animation could not start.

Per render, un-memoised, it was doing: two `statsEvents` passes; `currentStreak` + `bestStreak` + `averageStreak`, each calling `perfectStreakDays` separately (three full passes over the event list); `weekStatuses` filtering the events seven times; and `overviewRows` re-formatting every event date with **two `toLocaleDateString` calls each**.

Measured that last one with the repo's Hermes binary — Intl is the dominant cost:

    manual format, 3700 calls .................... 7 ms
    toLocaleDateString, 3700 events (7400 calls) . 1188 ms

~170x. So `overviewRows` now builds "Thu, 27 Aug 2026" by hand from `WEEKDAY_SHORT`/`MONTH_SHORT` arrays (byte-identical output), and every computation is wrapped in `useMemo` keyed on `[store, filter]`. `store` is ChoreContext's memoised value, so toggling the sheet no longer invalidates anything — the toggle now does zero recomputation.

Verification: `npm run typecheck` passes; the Intl cost is measured, not estimated. NOT confirmed on device — the phone dozed before the timing could be re-tested.

Separate finding, NOT addressed: `MissedEventBackfill` keys its effect on `store.events`, and re-scans 90 days x every chore (each iteration calling `choreOccurs`, which re-parses the chore's due date) on every event write — so it repeats the whole scan once per backfill batch. Worth revisiting if the Stats/Chart screens still feel heavy.

Don't regress: `StatsView`'s derived values must stay memoised — un-memoising them puts the stats engine back on every keystroke-level re-render. And avoid `toLocaleDateString` in any per-item loop; on Hermes it is ~170x slower than manual formatting.

### 2026-08-27 — Chore Detail rebuilt against ChoreDetailView.swift + bottom CTAs made inset-aware

The user reported the Chore Details / Edit Chore / Chore Status screens as broken, with buttons under the navigation bar. Two separate causes.

**1. `ChoreDetailView` was never actually ported.** It was still the 21-line placeholder from the 2026-08-19 phase — 1,334 lines of iOS reduced to a generic label/value card stack. Every card differed from `AddChore/ChoreDetailView.swift`: the Due On card was a white card with a blue frequency pill instead of the state-tinted card (fill `EAF6E6`/`DBE8FD`/`FFE7E7`, accent stroke, 40pt accent circle with the white `dueOnIcon`, and a **Repeat / One Time** pill — not the raw frequency); the name card printed a "Chore Name" label above a 19pt name instead of iOS's bare 18pt medium row with the edit glyph; the progress card had an invented "Current State" title, a 10pt bar and a "Manage Chore Status →" link that iOS does not have; the zone/assign card was a plain checkbox list; and Reminder/Sub-tasks/Photos were `Switch` rows with no Pro lock, no reminder fields, and no photo UI at all.

Rebuilt as a structural port: header with the 40pt back/3-dot circles, the 161pt **Skip Chore / Delete Chore** menu (iOS has exactly these two rows — no "Chore Status" entry; `ChoreStatusView` is reached from the Schedule tab on iOS and still is here), the eight iOS cards in order (dueOn, name, progress with the 25pt bar and its two white ticks at 61%/87%, notes, zone+assign, reminder, sub-tasks, photos), the `ScaleButtonStyle` CTA over the 184pt fade, and the red validation toast. Edit mode carries iOS's behaviours: the Pro lock badge on all three toggle cards, `Add member` pill and removable 46pt ring avatars, the "Assign at least one member to save" invalid state, per-field trash/plus buttons, and `saveEditsIfNeeded` on unmount so backing out of edit mode still persists.

Also added: `ChangeZoneSheet` (iOS `ChangeZoneSheet`, searchable zone list on the shared `BottomSheet`) in `AddChoreSheets.tsx`; tintable `MarkDoneGlyph`/`UndoGlyph` in `glyphs.tsx` (the assets hardcode `#2DA100`/`#1F1F1F`, and iOS renders both white on the CTA); and `ChoreDetail: { choreId, editing? }` so the chore menus' **Edit Chore** row opens edit mode the way iOS's `choreDetailEditing` flag does — previously Android could only ever open the read-only screen.

Two deliberate Android divergences, both documented in the file: iOS renames via `.alert` with an inline `TextField`, which Android's `Alert` cannot do, so the identical copy/actions render as a centred dialog card; and iOS's photo picker is `PhotosPicker`, so this reuses the existing `pickAvatarPhoto` encoder that already backs Add Chore.

**2. Safe area.** `ChoreDetailView`'s CTA sat at a bare `bottom: s(20)` (~22dp) against a 48dp navigation bar — the "Mark as Done" / "Save Changes" buttons in the screenshots. It now uses the standard `Math.max(s(20), insets.bottom + s(12))`, its scroll pads `s(140) + insets.bottom`, and the toast uses the `insets.bottom + s(92)` form. `ChoreStatusView`'s scroll content had a bare `s(40)` bottom pad, so the action card ended under the bar at full scroll; it now adds `insets.bottom`. Its progress fill also gained the 0.6 white capsule stroke iOS overlays on the gradient.

**3. Android font padding, fourth occurrence.** Every static `Text` on both screens now pins `lineHeight` (fontSize × 1.193, the real SF Pro Rounded line box) plus `includeFontPadding: false`. Without it the "Daily"/"Repeat" pill renders ~32dp instead of iOS's ~24, and each card's internal 4/10/12pt gaps read several dp wider than the design.

Verification: `npm run typecheck` passes. NOT device-verified — `adb devices` is empty, so nothing is attached to screenshot; Metro 8083 will deliver these over Fast Refresh once the phone reconnects.

Don't regress: `ChoreDetailView` is a real port of the iOS file — do not re-add the "Current State" heading, the "Manage Chore Status" link, or a "Chore Status" menu row; iOS has none of them. Every bottom-anchored CTA needs `Math.max(s(iOSValue), insets.bottom + margin)`, and any scroll whose last card must be fully readable needs `insets.bottom` in its content padding.

### 2026-08-27 — Paywall "Save 85%" badge height + its gap to the join pill

Two small deltas against `PaywallPartials.swift`, both visible when the Android and iOS screenshots are put side by side.

**Badge too tall.** iOS draws it as `Text(12pt semiBold).padding(.horizontal, 12).padding(.vertical, 5)` inside a `Capsule` with a 1pt stroke `inset(by: 0.5)` — a 24.3-unit-high pill (12 x 1.193 line box + 10). The RN copy used the same tokens but no line metrics, so Android's default `includeFontPadding` added ~4 units, and RN's border adds outside the padding box for a further 2 — measured ~28 against iOS's ~24 in the screenshots. Fixed by pinning `lineHeight: s(14.3)` + `includeFontPadding: false` and trimming the padding to 11/4 so the border lands the total back on iOS's 24.3. Radius is now `s(100)` (a real capsule) rather than `s(15)`. `joinText` got the same line-box treatment so it centres in the 32-unit pill the way iOS does.

**No gap to the join pill.** iOS spaces the pill 8 above the plan list and offsets the badge `y: -12`, so the badge's top edge genuinely sits 4 ABOVE the pointer tip — it just never reads as a collision, because the pointer is centred and the badge is at the trailing edge. Android's badge is wider and the two read as touching. The gap is now `JOIN_GAP_S = 16` (12 of badge overhang + 4 of clearance) and — importantly — it is **exempt from the `fit` squeeze**: `FIT_SQUEEZE_S` drops from 177 to 169 and `FIT_FIXED_S` rises to 366, so a short screen compresses the other spacing tokens instead of closing this gap again. Checked the asset before assuming: `pillPointerShapeIcon.png` is 777x121 with zero transparent padding (pill body ends at 78.5% of the height, the pointer runs to the last row), so the pointer tip really is flush with the container's bottom edge and the gap is the only lever.

**Follow-up, same day — the join label sat low in the pill.** iOS centres the text in the 32-unit container and then applies `.offset(y: -3)`, which translates AFTER layout, so the glyph centre lands at 13 — just about the true centre of the pill BODY, which is only the top ~77% of the asset (the rest is the pointer). RN used `marginTop: s(-3)`, which is not the same thing: on a `justifyContent: 'center'` child a negative margin shrinks the margin box, so the free space is re-split and the text only moves half the distance (1.5 of 3), leaving its centre at 14.5 — about 2 units low inside the body. Changed to `transform: [{ translateY: s(-3) }]`, the true equivalent of `.offset(y:)`.

Verification: `npm run typecheck` passes; the badge height and the label centre are derived arithmetically from the iOS tokens and the asset's measured alpha bounds, not eyeballed. Not device-verified — `adb devices` is empty.

Don't regress: the join-pill gap is deliberately 16, not iOS's 8, and must stay out of the `fit` squeeze. A SwiftUI `.offset(y:)` ports to `transform: translateY`, NEVER to a negative margin — inside a centring container a negative margin moves the child only half as far. Any capsule that wraps a `Text` needs its line box pinned, and remember RN adds `borderWidth` OUTSIDE the padding box while SwiftUI's `.stroke(inset:)` draws inside.

### 2026-08-27 — Settings: the Log Out icon was invisible (SVG component handed to `<Image source>`)

`logoutIcon` is one of the 42 catalog entries that resolve to an SVG **component**, not a PNG asset id, and `SettingsView`'s `Row` chose its renderer from an explicit `svg` prop. The Log Out row did not pass it, so the component went to `<AppImage source={...}>`, which renders nothing — the row showed its label with an empty 22pt gap where the glyph belongs. Audited every icon on the screen: `logoutIcon` and `deleteIcon` are the only SVG ones, and only `deleteIcon`'s row carried the flag.

Rather than add the missing flag, `Row` now DETECTS the case (`typeof icon === 'function'`, or an object carrying `$$typeof` for a forwardRef) and picks the renderer itself; the `svg` prop still overrides. That kills the whole class of bug for any icon added later. A repo-wide scan for `source={Images.<svgKey>}` found no other direct instances, and `ChoreCardKit`'s `MenuEntry` already types its icon as a component, so the chore menus were never affected.

Verification: `npm run typecheck` passes. Not device-verified — `adb devices` is empty. `logoutIcon.svg` strokes `#1F1F1F` with no hardcoded fill, so it renders as the grey glyph iOS shows at `.opacity(0.5)` with no tint work needed.

Don't regress: never pick an icon renderer from a hand-passed flag when the catalog mixes SVG components and PNG ids — an SVG in `<Image source>` fails silently, with no warning and no placeholder.

### 2026-08-27 — Sheet Done button behind the nav bar, and two clipped labels in Chore Detail

**1. Absolute sheet footers escape the card's safe-area padding.** The 2026-08-26 entry claimed `BottomSheet`'s card `paddingBottom: insets.bottom` also lifts absolutely-positioned footers "because Yoga positions absolute children inside the parent's padding box". The device screenshot disproves it: the Change Zone sheet's Done button rendered with its bottom edge 69px (~29 units) from the window bottom, i.e. exactly its own `paddingBottom: s(30)` with the inset contributing nothing — `bottom: 0` lands on the card's BORDER box, behind the navigation bar. Every absolute sheet footer therefore needs its own inset: `assignCta` (used by both `ChangeZoneSheet` and `AssignMemberSheet`) and `ScheduleSheets`' `bottomBar` now use `Math.max(s(designValue), insets.bottom + s(16))`. Flow-layout footers are unaffected and still inherit the card padding.

**2. Zone name clipped to "K…".** `zoneChip` carried `maxWidth: '65%'`. `PressScale` puts the caller's style on an inner `Animated.View`, so that percentage resolves against the wrapping `Pressable` — whose width is itself derived from this very view. The chip ended up clamped to 65% of its own content width, and the name ellipsized. Confirmed by the pixel geometry: the Pressable spanned the full chip width (594→824) while the painted chip stopped at 750, which is 65% of it. Removed the percentage; the chip and the Add-member pill are now `flexShrink: 0` so nothing can squeeze them.

**3. "Add member" pill painting only "Add".** The pill's LAYOUT was correct — measured 94 units, exactly the full string plus padding and chevron — but only the first word painted. Rebuilt it with the shape `AddChoreView`'s pill already uses on this device: an explicit `height: s(26)` / `borderRadius: s(13)` with the padding moved onto the children, and the chevron in a sized `View` (an `Svg` sibling with no layout box was the one remaining measurement variable). Same iOS geometry — `.padding(10/6)` on a 12pt label is a 26.3-unit capsule — with no freedom left in the row.

Verification: `npm run typecheck` passes. Fix 1 is derived from the screenshot's measured 69px offset and fix 2 from the measured 65% clamp, so both causes are established; **fix 3 is a mitigation, not a proven root cause** — the truncation mechanism was never identified, and it needs a device check. The phone is on ADB again but PIN-locked with the screen off, so nothing could be confirmed live this session.

Don't regress: `bottom: 0` inside `BottomSheet`'s card is the WINDOW bottom, not the safe-area edge — absolute footers carry their own inset. Never use a percentage `maxWidth`/`width` on a style passed to `PressScale`; it resolves against the wrapper `Pressable`, which is sized by that same view.

### 2026-08-27 — Play internal-testing readiness pass (fresh signed AAB, permissions trimmed)

Pre-upload audit before the first internal-testing release.

**The documented force-update blocker is gone — verified, not assumed.** The 2026-08-24 entry warned that live Remote Config had `isForceUpdateRequired: true` / `minimumAppVersion: "1.1"` against an `app.json` version of `1.0.0`, which would hard-block every tester on the Update Required screen. Read the actual activated config off the device instead of trusting the note: `adb shell run-as chores.tracker.chorebuddy cat files/frc_<appId>_firebase_activate.json`. It now reports `isForceUpdateRequired: 'false'` and `minimumAppVersion: '1.0'`, so 1.0.0 ships fine. A version bump to 1.1.0 was made and then REVERTED once the real values came back — there was no reason to change the user-visible version. That RC dump is the fastest way to settle any "what is Remote Config actually set to" question while a debug build is installed.

**versionCode 1 → 2.** An AAB carrying code 1 was built on 2026-08-21; if it ever reached Play, re-uploading code 1 is rejected. Bumped in both `app.json` and `android/app/build.gradle` (the embedded `app.config` asset confirms 1.0.0 / 2 reached the bundle).

**Permissions trimmed to what the app uses.** The previous release manifest requested five things that create Play Console friction, none of which the app needs:
- `RECORD_AUDIO` and `SYSTEM_ALERT_WINDOW` — Expo's legacy default permission list, unused here.
- `SCHEDULE_EXACT_ALARM` — forces the exact-alarm policy declaration that only alarm/calendar apps qualify for. Chore reminders are fine with inexact alarms.
- `com.google.android.gms.permission.AD_ID` — arrives with Firebase Analytics and forces an advertising-ID declaration; the app has no ads.
- `READ/WRITE_EXTERNAL_STORAGE` unbounded — reads as broad storage access. Capped at `maxSdkVersion="32"`, which is safe because `ImagePickerModule.getMediaLibraryPermissions` returns an EMPTY array on TIRAMISU+ (Android 13 uses the system photo picker with no permission at all).

Applied in two places on purpose: `android.blockedPermissions` in `app.json` so a future prebuild keeps them out, and `tools:node="remove"` / `tools:replace` directly in `android/app/src/main/AndroidManifest.xml` so no prebuild had to run — `expo prebuild` would have wiped the release signing block out of `android/app/build.gradle`.

**Fresh AAB.** The Aug 21 artifact predates `expo-print`, `expo-sharing`, `expo-clipboard`, `expo-image-manipulator`, `expo-store-review` and Crashlytics, so it would have crashed on launch. `android/local.properties` was also missing (`sdk.dir`), which failed the first build attempt with "SDK location not found".

Verification of the shipped bundle (`android/app/build/outputs/bundle/release/app-release.aab`, 133 MB, `BUILD SUCCESSFUL in 12m 14s`): signed by the upload key (`keytool -printcert -jarfile` → SHA1 `D2:BF:E1:E2:…:ED:0A`, `CN=ChoreBuddy`); bundle manifest reads `versionCode="2"` / `versionName="1.0.0"`; `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `SCHEDULE_EXACT_ALARM` and the gms `AD_ID` are all absent; both storage permissions carry `maxSdkVersion="32"`. Also checked: targetSdk 36 (Play floor is 35), `minifyEnabled` false so there is no ProGuard risk, both `google-services.json` copies identical, `npx expo install --check` clean, no `BYPASS` left in the gate chain, and `freeChoreLimit`/`freeZoneLimit` are absent from RC but `setDefaults` supplies 10/5 so free users are not accidentally locked out.

**Still account-side and still blocking sign-in:** Play App Signing re-signs the bundle, so an internal-testing install is signed with the APP SIGNING key, while `google-services.json` only carries the upload-key SHA-1 (`d2bfe1e2…`). Until the Play App Signing SHA-1 (Play Console → Setup → App signing) is added to the Firebase Android app, Google Sign-In fails with `DEVELOPER_ERROR` for every tester — and sign-in gates the whole app. The registration is server-side, so it needs no rebuild.

**Upload outcome (2026-08-27 evening).** Internal testing now serves **3 (1.0.0)** — 76.4 MB for new installs, 21.1 MB updates, target SDK 36, 4 ABIs, 17,239 supported devices; bundle 2 is deactivated. Play's highest versionCode is therefore 3, and the repo has been moved to **4** so the next `bundleRelease` cannot collide. Bundle 3 reports 3 required features against bundle 2's 4, which is the `android.hardware.microphone` feature disappearing with `RECORD_AUDIO` — the permission trim is confirmed present in the live release.

Testers immediately hit the predicted `DEVELOPER_ERROR` on Google Sign-In, since Play App Signing re-signs the bundle and only the upload key (`d2bfe1e2…`) is registered. The fingerprint to add is under Play Console → **App integrity** → App signing; the debug key (`5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25`) is still unregistered too and should go in at the same time.

Don't regress: `android/` is gitignored and prebuild rewrites `build.gradle`, so permission edits must live in `app.json` too, and the signing block must be re-applied after any `expo prebuild`. Bump `android.versionCode` in `app.json` for every Play upload — check the live value in Play Console first, since uploads can happen outside this repo.

### 2026-08-27 — Assigned-member ✕ badge sat on the name, not the avatar corner

Side-by-side iOS/Android shots of Edit Chore showed the remove badge in the wrong place: iOS puts it on the avatar's top-right corner, Android drew it bottom-left, overlapping the member's name.

The iOS numbers were already right in both screens — `ChoreDetailView.swift` overlays the 46pt avatar `.topTrailing` with `.offset(x: 6, y: -2)`, `AddChoreView.swift`'s `memberAvatarCell` uses `.offset(x: 4, y: -4)`, and the RN styles carried exactly those values. The bug was WHERE they applied: `PressScale` puts the caller's `style` on an inner `Animated.View`, so `position: 'absolute'` resolved against the wrapping `Pressable` — an ordinary flow child sitting after the avatar in the column — instead of against the avatar. The badge therefore positioned itself relative to a box that sits next to the name.

Fixed in both screens by moving the offset onto a plain wrapper `View` (`avatarRemoveSlot` / `assignedRemoveSlot`) and leaving only the circle's visual styling on the `PressScale`. `ChoreDetailView` also gained an explicit `avatarStack` (46x46) so the badge anchors to the avatar's frame rather than the whole cell, which is taller because of the name label — matching iOS, where the `.overlay` is attached to the avatar and the name lives outside it in the `VStack`.

Swept the repo afterwards for any other `PressScale` whose style contains `position: 'absolute'`: none remain.

Verification: `npm run typecheck` passes; the geometry is taken from the two iOS sources rather than eyeballed. Not device-verified this session.

Don't regress: this is the third distinct symptom of the same root cause (Stats filter Save collapsing, the zone chip's percentage `maxWidth`, now this). ANY layout or positioning prop — `flex`, `position`, `top/right`, percentage `width`/`maxWidth` — must go on a wrapper around `PressScale`, never in its `style`, which lands on an inner view.

### 2026-08-27 — Launcher icon looked zoomed: the adaptive foreground was full-bleed

Side-by-side home screens showed the Android icon cropped to the bunny's head while iOS shows the whole scene (bunny + broom + bucket).

Not an asset-quality problem. `assets/images/adaptive-icon.png` was a byte-identical copy of the 1024x1024 iOS artwork with **zero transparent padding** (measured: opaque bbox filled 1.000 of the canvas, and so did every generated `ic_launcher_foreground.webp` at all five densities). Android draws an adaptive icon's layers at 108dp and masks them to the central ~72dp safe zone, so an edge-to-edge foreground is effectively magnified 1.5x and only its middle two-thirds survives. iOS has no equivalent stage — its rounded-rect mask keeps ~96% of the artwork — which is why the same file looks right there and cropped here.

- New foreground: transparent 108dp canvas with the artwork scaled to **72%** (~77.8dp). That fully covers the 72dp mask — so no background shows through on a circle or squircle — while keeping the whole scene inside the visible area. Written to `assets/images/adaptive-icon.png` (the prebuild source) **and** directly to `android/app/src/main/res/mipmap-{m,h,x,xx,xxx}dpi/ic_launcher_foreground.webp` as lossless WebP, because running `expo prebuild` would wipe the release signing block out of `android/app/build.gradle`.
- `iconBackground` moved from the near-white `#FBF7FD` to **`#FBCBC9`**, the average of the artwork's own border pixels, so a launcher whose mask is larger than the safe zone reveals a colour continuous with the scene instead of a pale ring. Changed in both `app.json` and `android/app/src/main/res/values/colors.xml`.
- `assets/images/app-icon.png` is deliberately untouched at full bleed — it is `expo.icon`, used for iOS and the store listing, where edge-to-edge is correct.

Verification: rendered the launcher masks offline (composite foreground over the background colour, then clip to a 72/108 circle and to a squircle) for old vs new at xxxhdpi. Old crops to the head; new shows the full scene and matches the iOS tile. The generated foregrounds measure `fill 0.720` where they previously measured `1.000`. Requires a rebuild to reach a device — launcher resources are compiled, so Fast Refresh cannot deliver this.

Don't regress: an Android adaptive-icon foreground is NOT the iOS icon. It needs ~28% transparent padding; reusing the full-bleed artwork always reads as zoomed. Keep `expo.icon` and `adaptiveIcon.foregroundImage` as two different files.

### 2026-08-27 — Create Zone color/icon grid: the aspect ratio was on the wrong node

Side-by-side shots showed the Android colour swatches and icon tiles as portrait rounded rectangles where iOS has squares, which also made the 26pt glyphs read small inside their tiles.

iOS is `LazyVGrid(columns: 6 x GridItem(.flexible(), spacing: 9), spacing: 9)` with every item `.aspectRatio(1, contentMode: .fit)` — six 45x45 squares, the 9-unit gutters falling only BETWEEN columns ((315 - 5x9)/6 = 45 inside the card's 315 of content width).

The port had `aspectRatio: 1` on the **cell** plus `paddingHorizontal: s(4.5)`, with the swatch/tile as `flex: 1` inside. The padding took 9 off the width and nothing off the height, so each item rendered **43.5 wide x 52.5 tall** — a 9-unit portrait stretch, and 1.5 narrower than iOS as well because the outer half-gutters were being charged against the row.

Fixed by moving the aspect ratio onto the item (`swatch`/`iconTile`) and giving the grid `marginHorizontal: -s(4.5)` so the gutters land only between columns. Verified arithmetically: the item now measures exactly **45.0**, matching iOS, against the old 43.5x52.5. Everything else in the two cards was already correct — radius 16 on swatches, 14 on tiles, 1pt border / 1.5 purple when selected, 26pt untinted glyphs, the 20pt white+appText check on colours and 20pt purple+appBackground check on icons.

Checked the other percentage grids for the same shape: `ProfileSheets.gridCell` has no aspect ratio and centres fixed-size avatars, and `AddChoreSheets.photoCell` already carries its aspect ratio on the item. No other instances.

Verification: `npm run typecheck` passes; geometry derived from `CreateZoneView.swift` and confirmed by arithmetic. Not device-verified — the phone is off ADB.

Don't regress: in a wrapped percentage grid, `aspectRatio` belongs on the ITEM, never on a cell that also carries horizontal padding — the padding shrinks width only and the square becomes a portrait rectangle. Cancel the outer half-gutters with a negative margin on the grid so N columns get N-1 gaps like SwiftUI's `GridItem` spacing.

### 2026-08-27 — Bottom fades grow by the navigation-bar lift

The Create Zone gradient was already present at iOS's exact `183.5` (`CreateZoneView.swift:110`) — the reported 140 belongs to a different screen. The real defect is a knock-on of the safe-area sweep: the fade is anchored to the WINDOW bottom, but every Android bottom CTA is lifted by `Math.max(s(iOSValue), insets.bottom + margin)`. So the button rises while the gradient does not, and the fade reaches less far above it than on iOS.

Measured on a 48dp three-button bar (`s(v) == v` at 375dp width):

| Screen | iOS fade reaches above CTA | Android before | after |
|---|---|---|---|
| CreateZone | 143.5 | 119.5 | 143.5 |
| ChoreDetail | 164.0 | 124.0 | 164.0 |
| AddChore | 164.0 | 124.0 | 164.0 |
| Members (x2) | 164.0 | 124.0 | 164.0 |

`BottomFade` gained an `extra` prop — RAW dp, added after the scaled design height — and each call site passes the amount its own CTA was lifted (`ctaBottom - s(iOSDesignOffset)`, floored at 0). `ChoreDetailView` and `AddChoreView` use a raw `LinearGradient` rather than `BottomFade`, so they apply the same term inline. On a gesture-nav device the extra is 0 and the layout stays byte-identical to iOS.

Deliberately NOT changed: `ZoneDetailView` and `AssignMemberSheet` pair a short fade (60) with a SOLID `colors.background` block whose padding already absorbs the inset, so their gradient-to-button distance never changed. `HomeView`'s fade sits behind the tab bar, which handles its own inset and is not a lifted CTA.

Verification: `npm run typecheck` passes; the table above is computed, not eyeballed. Not device-verified — the phone is on ADB but dozing behind the keyguard.

Don't regress: a window-anchored bottom fade must grow by whatever its CTA was lifted, or the two drift apart on devices with a navigation bar. Pair every `insets.bottom` CTA lift with the matching fade `extra`.

### 2026-08-31 — Sign-in and launch loaders: in-button spinner, and the splash was rendering as a 2.6x crop

Reported with three screenshots: Android showed a blank pink page with a speck of a loader after Google sign-in, where iOS shows (a) the spinner INSIDE the Google button while the flow runs and (b) the splash artwork with a spinner while the household loads. Three separate causes.

**1. Android had no in-button loading state at all.** iOS `AuthManager` publishes `loadingProvider`, and `SignInView` reads it: the label and the Google mark go to opacity 0, a `ProgressView().tint(.black)` appears centred in the pill, and the button is disabled — the screen itself never changes. Android's `AuthValue` only had `loading`, which covers the initial `onAuthStateChanged` and stays false during an interactive sign-in, so pressing the button gave zero feedback until `signInWithCredential` resolved and the gate jumped to `LoadingScreen`. Added `loadingProvider: 'google' | null` (set at the top of `signInGoogle`, cleared in `finally`, mirroring iOS's `defer`), plus the success haptic iOS fires (`HapticManager.notification(.success)`), and `App.tsx` passes `loading={auth.loadingProvider === 'google'}`. Also ported the two bits of `SignInView.swift` that were missing: the 301-tall `appPurple` 0.2 → 0 wash from the top edge, and `ScaleButtonStyle` (`PressScale`) on the button. The background is now `resizeMode="stretch"` because iOS is `.resizable()` with no aspect ratio.

**2. The splash on `LoadingScreen` was the Fabric intrinsic-size bug — fourth occurrence.** `Splash_screen.png` is 1125x2436 with no `@3x` suffix and was sized only by `StyleSheet.absoluteFill`, so Fabric fell back to 1125x2436 **dp** and drew a ~2.6x magnified crop of the artwork's top-left corner at density 2.5. Confirmed from the screenshot rather than assumed: the yellow sparkle, the small pink sparkle and the bottom-left heart all sit at exactly 2.55-2.6x their asset positions measured from the top-left, and the icon/wordmark (asset centre) lands off-screen right and below — which is why the page read as blank pink. Fixed with explicit `width: '100%', height: '100%'`. Swept the repo for the same shape and found one more: `NotificationPermissionView`'s `appBg` (also 1125x2436) had it too.

**3. `ActivityIndicator` is the wrong loader here, and rendered a few pixels wide.** In the report's screenshot the spinner measures ~5dp against the 36dp box `size="large"` gives it; the mechanism was never identified. It is also the wrong shape — RN's Android `ActivityIndicator` is a Material `ProgressBar` arc, while every iOS loader in this app is `ProgressView(.circular)`. New `components/Spinner.tsx` draws the iOS indicator directly: eight rounded spokes on `UIActivityIndicatorView` geometry (length 0.30 of the frame, width 0.09, tips at the frame edge, opacity fading around the ring), rotated by a single native-driven transform. Sizes are explicit, so it cannot collapse. Converted all seven call sites — `LoadingScreen`, the new sign-in button, `PaywallView`'s CTA, `AddChoreView`'s save, `GiftBanner`, and the three household footers — which is exactly the set where iOS uses `ProgressView`; no `ActivityIndicator` remains in `src/`.

Verification: `npm run typecheck` passes. NOT device-verified — the moto g35 is attached with Metro running on 8081 (`expo run:android`), but it sits on its PIN keyguard and Android kills the app process while the screen is locked, so the flow could not be exercised. Unlocking it delivers all of this over Fast Refresh; check the button loader first, then the splash after sign-in.

Don't regress: the sign-in screen owns its own progress indicator — never route an interactive sign-in through the full-screen `LoadingScreen`. Loaders go through `Spinner`, not `ActivityIndicator`. And a full-screen `AppImage` needs explicit width/height; `StyleSheet.absoluteFill` alone gives it the file's pixel dimensions as dp.

### 2026-08-31 — Launcher quick actions ported (iOS `QuickActionManager`)

The last unported helper. iOS puts two retention affordances in the home-screen
long-press menu — the same gesture that reaches Uninstall — and the user asked for
the Arbora treatment here:

| iOS | Android |
|---|---|
| `"Wait! Don't go yet"` / `"Unlock a special offer just for you"`, `.love` icon, free users only | `"Unlock your special offer"`, `ic_shortcut_gift` |
| `"Help us improve"` / `"Tell us what went wrong, let's fix it"`, `.mail` icon | `"Tell us what went wrong"`, `ic_shortcut_help` |

- `src/services/QuickActions.ts` (port of `QuickActionManager`) + `src/hooks/useQuickActions.ts` (port of `ContentView.processQuickAction` / `openHelpImprove`), on `expo-quick-actions` 6.0.2. Structure follows Arbora's proven implementation; copy and behaviour follow ChoreBuddy's iOS.
- **Android shows ONE line, so the title carries the payload.** `ExpoQuickActionsModule.kt` builds every shortcut `setShortLabel(title).setLongLabel(title)` — there is no third label and `subtitle` is iOS-only. A single visible line reading "Wait! Don't go yet" never states the offer, so the titles are the Arbora strings the user pointed at (25 and 23 chars, inside the ~25-char long-label budget), with iOS's own strings kept as `subtitle` so an iOS build of this code still renders two lines.
- Shortcuts are DYNAMIC, not `res/xml/shortcuts.xml`: the gift entry must not exist for a subscriber, and entitlement is only known at runtime. `syncQuickActions(hasPro)` replaces the set wholesale, mirroring iOS assigning `shortcutItems` on every `hasPro` change.
- **Re-synced on every return to the foreground, and that is load-bearing.** The module builds each shortcut's intent as `Intent(context, currentActivity!!::class.java)`, so a sync with no live activity throws — which is precisely what happened when I started the process with the screen locked (the app ran, `dumpsys shortcut` listed Arbora but not ChoreBuddy). Without the foreground re-sync the menu stays stale until the next relaunch.
- Icons: iOS asks UIKit for `.love` / `.mail`, and the catalog has neither a heart nor an envelope, so `plugins/withQuickActionIcons.js` writes those two standard glyphs as VectorDrawables in `colors.purple` with a lifted `drawable-night` variant — a shortcut icon is drawn by the LAUNCHER, in its own context, so it follows the system theme and not the app's forced light mode. `expo-quick-actions` resolves an icon by resource NAME (`getIdentifier(...)` → `Icon.createWithResource`), so the 42 SVG components are unusable here. Written both through the plugin and directly into `android/app/src/main/res/` for the same reason as `withLaunchScreenFill`: `android/` is gitignored and prebuild would wipe hand-written files, but running prebuild today would wipe the release signing block.
- Routing lives in `App.tsx`'s `Gate` because both handlers need app state. The gift entry presents `GiftPaywallView isPermanentOffer` as an OVERLAY above `gateContent()` rather than as another gate branch — iOS uses a `fullScreenCover`, and a branch would unmount the navigator underneath. `isPermanentOffer` is new on the RN screen and matches iOS: the countdown card goes to `opacity: 0` (not removed) so nothing below it shifts. Guarded exactly like iOS: `if (purchases.hasPro || giftGateShowing) return`.
- The mail entry reuses the existing `AppConstant.supportMailto('Help Us Improve', uid)` — same subject/body shape as iOS and as Settings → Contact Us, to `uttamchandsancheti.apps@gmail.com` (confirmed identical to iOS `AppConstant.supportEmail`). Cold-launch handling waits for `app.hydrated && !auth.loading`: iOS reads `Auth.auth().currentUser` synchronously so its subject always carries a uid, while Android's `onAuthStateChanged` is async and would otherwise mail `Help Us Improve - ChoreBuddy V 1.0.0 - -`.
- `QA.initial` keeps returning the launch action for the whole session, so it is consumed behind a one-shot ref — otherwise a later re-render re-presents the paywall over itself.

Verification: `npm run typecheck` passes; `:app:assembleDebug` succeeds (703 tasks, 22s) and the installed APK contains `expo.modules.quickactions` (50 refs in classes2.dex) plus all four `ic_shortcut_*` drawables in `res/drawable` and `res/drawable-night`. NOT functionally verified — the phone is on its PIN keyguard, and as described above that is the one state where publishing cannot work, so `dumpsys shortcut` still shows no entry for the package. Once it is unlocked: bring the app to the foreground, then `adb shell dumpsys shortcut | grep -A20 chores.tracker.chorebuddy` should list both ids, and long-pressing the icon should show the two rows with their glyphs.

Adding a native module means the release AAB is stale: a `bundleRelease` (and a versionCode bump past Play's highest) is required before the next upload, or the shortcuts ship missing.

Don't regress: quick-action titles are the single visible line on Android — don't swap them for the iOS titles, and don't lengthen them past ~25 chars. Keep the foreground re-sync. If either shortcut glyph changes, change it in `plugins/withQuickActionIcons.js` AND re-run its `writeIcons` into `android/`.

### 2026-08-31 — Overview history card ran under the navigation bar

Side-by-side shots of Overview showed the iOS card ending cleanly above the screen
edge with both bottom corners visible, while Android's ran off the bottom.

The card is not a fixed height on either platform — `OverviewView.swift` makes the
`TabView` the flexible element of a `VStack` that `.ignoresSafeArea(.container,
edges: .all)`, with `.padding(.bottom, 30)`, so it ends 30 above the physical
screen edge (right about where an iPhone's home indicator sits). The RN port
already had `flex: 1` + `marginBottom: s(30)` — token-correct — but Android's
window includes the navigation-bar zone under edge-to-edge, and s(30) is ~34.6dp at
this device's 432dp width against a 48dp three-button bar. So the last ~13dp of the
card, including its rounded corners, rendered BEHIND the bar.

Fixed with the standard pattern: `Math.max(s(30), insets.bottom + s(12))`, applied
inline so the iOS offset still wins on a gesture-nav device with no inset. Swept the
repo for other `flex: 1` blocks carrying their own bottom margin — this was the only
one; every other bottom-anchored element already uses the pattern.

Verification: `npm run typecheck` passes; the overlap is arithmetic (34.6dp margin
vs a 48dp bar) rather than eyeballed. Not device-verified — the phone is back on its
PIN keyguard with the app not running.

Don't regress: a `flex: 1` card that must show its own bottom edge needs the safe-area
lift exactly like a bottom CTA does; a bare `marginBottom: s(iOSValue)` is measured
from the window edge, not from above the navigation bar.

### 2026-08-31 — Chore photos: multi-select up to 10, matching iOS `PhotosPicker`

The Add Photos entry point could only ever add ONE photo per tap, and cropped it to
a square on the way in. iOS opens
`PhotosPicker(selection: $photoItems, maxSelectionCount: 10, matching: .images)`
from both `AddChoreView` and `ChoreDetailView` — a multi-select picker with no
cropping stage.

Cause: both RN screens called `pickAvatarPhoto(false)`, which is the PROFILE picker
— iOS `PhotoPickers.swift` sets `config.selectionLimit = 1` there, and the RN
version accordingly passes `allowsEditing: true, aspect: [1, 1]`. Right function,
wrong screen. (`allowsEditing` is also mutually exclusive with
`allowsMultipleSelection` in expo-image-picker, so the crop had to go regardless.)

- New `pickChorePhotos(limit)` in `components/AvatarView.tsx` alongside the existing
  encoder: `allowsMultipleSelection: true` with `selectionLimit` set to the REMAINING
  budget under the new `MAX_CHORE_PHOTOS = 10`, so the system picker enforces the cap
  itself instead of the app discarding the overflow after the user picked it. Every
  asset still goes through `encodeAvatarPhoto` (512px long edge, ≤300KB), which is
  what keeps each `chores/{id}/photos/{index}` document under Firestore's 1MB limit.
  The permission alert moved into a shared `accessDeniedAlert` so both pickers keep
  iOS's exact copy.
- Both screens now append the picked batch under the 10 cap. **Deliberate divergence
  on Add Chore:** iOS's `loadPhotos()` there REPLACES the list (`photoImages = images`),
  which is only safe because SwiftUI's PhotosPicker retains its `selection` binding —
  reopening it shows the earlier picks still ticked. Android's system picker starts
  empty every time, so replacing would silently drop everything added on an earlier
  trip. iOS's Edit screen appends (de-duplicated) anyway, so appending is the
  behaviour that matches on both.
- Unchanged, because they already match iOS: the strip shows `prefix(3)` thumbs with
  the add tile only while `count < 3`, "View All" opens `PhotosSheet`, and the camera
  is deliberately absent (iOS offers the library only for chore photos).

Verification: `npm run typecheck` passes. Not device-verified — the phone is on its
PIN keyguard with the app not running.

Don't regress: chore photos go through `pickChorePhotos`, profile photos through
`pickAvatarPhoto` — they are different iOS pickers (limit 10 vs 1, no crop vs square
crop). Never point a chore-photo call site at the avatar picker again.

### 2026-08-31 — Photo upload box audited against iOS; the add tile's plus was invisible

The user put iOS's empty "Upload Images" box next to Android's add tile and asked for
the purple square, plus icon and background to match.

**The upload box was already token-exact.** Checked every value in
`uploadBoxLabel` (both `AddChoreView.swift` and `ChoreDetailView.swift`): 90x90 box,
radius 12, `appBackground` fill, 1pt dashed `appText` 0.2 border, a 28x28 radius-7
square at `appPurple` 0.12, the 20x20 `plusIcon` over it, 6 gap, and "Upload Images"
in regular 11 at `appText` 0.5. The RN styles carried all of it. The only real delta
was the standing Android font-padding rule: `AddChoreView`'s `uploadLabel` had no
`lineHeight`, so its 11pt line box ran ~4dp tall and pushed the content low inside the
fixed 90x90 frame (`ChoreDetailView`'s copy already had it). Pinned to 13.1 +
`includeFontPadding: false`.

**The two screenshots were showing different STATES** — iOS with no photos (the upload
box) against Android with one photo (the add tile) — and iOS's `addThumbLabel` is
genuinely just the bare `plusIcon` on `appBackground`, no square and no label. But
`plusIcon.png` is pure WHITE (it is drawn for purple buttons; both iOS imagesets,
NavBar and Common, are 100% white pixels), and white against #FBF7FD differs by
(4,8,2)/255 — so on iOS that tile is an empty-looking dashed box too. Against the 12%
purple square the same plus differs by (16,24,5), which is what makes it read in the
upload box.

So the add tile now carries that same 28x28 purple square behind the plus, in both
screens. **This is a deliberate deviation from the iOS source, made on the user's
request**, and it is commented as such at both call sites — everything else about the
tile (90x90, radius 12, dashed border, 20x20 plus, the `count < 3` rule) stays iOS-exact.

Known unfixable difference: iOS specifies `StrokeStyle(dash: [4])`; RN's
`borderStyle: 'dashed'` gives no control over dash length on Android, so the dash
rhythm differs slightly. Matching it would mean drawing the border in SVG.

Verification: `npm run typecheck` passes; the contrast figures above are computed from
the actual asset pixels and the palette, not eyeballed. Not device-verified — the phone
is on its PIN keyguard.

Don't regress: `plusIcon` is a WHITE asset — never place it on a light fill without the
purple square behind it (or a tint). The add tile's purple square is intentional and is
not to be "corrected" back to the iOS bare plus.

### 2026-08-31 — Reminder sheet's Done button fell off the bottom (Android font padding, 5th occurrence)

Reported as the sheet "ignoring safe area". It was not a missing inset — `BottomSheet`'s
card already carries `paddingBottom: insets.bottom` and this footer is a flow child, so
it inherits it. The content was simply TALLER than the card, and because the card is
`overflow: hidden` and bottom-anchored to the window, the surplus pushed the Done button
off the bottom of the screen.

Measured the cause off the screenshot rather than guessing: the option rows render at a
**93.5dp pitch** where iOS's tokens predict 69dp (`.padding(.vertical, 12)` around a
`VStack(spacing: 4)` of a 15pt medium title and a 12pt regular subtitle). Every token in
`optionRow`/`optionTitle`/`optionSubtitle` already matched `ReminderSheet.swift` — but
neither Text pinned its line box, and at these sizes Android's default
`includeFontPadding` adds ~12dp per Text. Five rows x ~24dp = ~120dp of invented height,
which is what pushed the footer out.

- Pinned `lineHeight` (fontSize x 1.193, the real SF Pro Rounded line box) plus
  `includeFontPadding: false` on `optionTitle` (17.9), `optionSubtitle` (14.3),
  `fieldLabel` (14.3) and `fieldValue` (16.7). Recomputed tally: rows return to exactly
  iOS's 60.2 design units (69dp) and the sheet's content lands at ~701dp against ~701dp
  of usable card height.
- That is too tight to rely on, so the options list is now a `ScrollView` with
  `flexShrink: 1`. RN defaults `flexShrink` to 0, which is why the overflow propagated
  instead of being absorbed; with it, the list keeps iOS's natural height whenever it
  fits and gains a scroll only when it cannot — so the Done button stays reachable on any
  screen height or system font scale. iOS needs none of this because its card is ~48dp
  taller in usable terms (no navigation-bar padding) and its `Spacer` soaks up the slack.

Checked the sibling sheets for the same shape: `CalendarSheet`, `TimeSheet` and
`MonthDaySheet` size their content from fixed-size day boxes and a fixed wheel, so their
Texts sit inside explicit frames and cannot inflate the column; `ChangeZoneSheet` and
`AssignMemberSheet` already scroll. The Reminder sheet was the only flow-layout list.

Verification: `npm run typecheck` passes; the 93.5dp row pitch is measured from the
reported screenshot and the corrected tally is arithmetic. Not device-verified — the phone
is on its PIN keyguard.

Don't regress: this is the fifth instance of the same root cause — ANY Text in an
iOS-derived layout needs `lineHeight` + `includeFontPadding: false`, and it matters most
inside a height-capped sheet, where the invented height does not just look wrong, it
pushes the CTA off screen. A list inside a fixed-height sheet card needs `flexShrink: 1`
too; RN's default of 0 makes overflow propagate rather than compress.

### 2026-08-31 — Assign Task sheet's Done sat 114dp up: the safe-area inset was counted twice

Reported as too much padding under the Done button. It was, by exactly one navigation
bar: the button's bottom edge was **114dp** above the window edge where the app-wide
convention is 66dp (a 48dp three-button bar plus s(16)).

Settled the mechanism in Yoga's source rather than guessing, because the 2026-08-27
entry and this symptom pointed opposite ways. In `AbsoluteLayout.cpp`'s
`positionAbsoluteChild`, the branch taken when an inset IS defined computes
`parentHeight - childHeight - borderEnd - marginEnd - bottom` — padding is never
subtracted. So `bottom: 0` measures from the parent's BORDER box, and what matters is
WHICH parent:

- `ChangeZoneSheet`'s footer is a direct child of the sheet card, whose border box is
  the window edge, so it must carry the whole offset itself. Correct as it was.
- `AssignMemberSheet`'s footer lives inside the `flex: 1` horizontal pager page — a
  flow child of the card — so it had already been lifted by the card's
  `paddingBottom: insets.bottom` (2026-08-26). Adding `insets.bottom + s(16)` on top
  double-counted the bar: 48 + 66 = 114dp.

Both call sites now go through `ctaPadBottom(insets.bottom, liftedByCard)`, which
returns `Math.max(s(30) - inset, s(16))` for the nested case and the usual
`Math.max(s(30), inset + s(16))` for a direct child — so both land at 66dp above the
window on a bar device and at iOS's bare s(30) on a gesture-nav device.

Checked the other absolute sheet footers for the same nesting: `ScheduleSheets`'
`bottomBar` is a direct child of the card (correct), and `StatsFilterSheet`'s two
footers bypass `BottomSheet` entirely so no card padding exists there (correct).

Verification: `npm run typecheck` passes; the 114 → 66dp figures are computed from the
styles and the device's 48dp bar, and the padding rule is read out of Yoga's source.
Not device-verified — the phone is on its PIN keyguard.

Don't regress: `bottom: 0` inside `BottomSheet` measures from the WINDOW, but only for
a DIRECT child of the card — a footer nested inside any flow child has already been
lifted by the card's padding. Use `ctaPadBottom` rather than repeating the
`Math.max(...)` inline, and check the nesting before choosing the flag.

### 2026-08-31 — Camera / Gallery glyphs redrawn to the real SF Symbols geometry

iOS's `SelectOptionSheet` draws these with
`Image(systemName: "camera.fill" / "photo.fill").font(.system(size: 30))`. SF Symbols
are Apple artwork and cannot ship on Android, so the port hand-traced them — but the
traces were drawn edge-to-edge in a 30x30 box with radius-2 corners, which is why they
read as blockier, squarer and heavier than iOS's.

Measured the real symbols instead of guessing at them: rendered both with
`NSImage(systemSymbolName:)` at 120pt on this Mac, then took row-by-row alpha scans and
divided by 4 to get iOS's 30pt numbers. **No Apple artwork is bundled** — the renders
were reference only, and are gone with the scratchpad.

    camera.fill  ink 36.0 x 28.0 in a 43.5 x 32 layout box
                 body corner radius 3.8, top edge y 6.4
                 viewfinder hump flares x 8.8..27.2, flat crest 14.6..21.2
                 lens is a RING: outer r 7.9, core r 5.7, centre (17.9, 15.6)
                 flash dot centre (30.25, 9.4) r 1.75
    photo.fill   ink 34.8 x 27.0 in a 42.25 x 31 layout box
                 frame corner radius 4.0
                 sun centre (11.1, 10.0) r 3.5
                 landscape x 2.5..32.0, base band bottom y 24.4, its bottom
                 corners rounded r 2

Both Svgs now carry the ~2-unit vertical bearing the symbol images have, so the
`VStack(spacing: 12)` gap to the label matches iOS as well. Knockouts fill with
`colors.white` — the option card's own fill — since `react-native-svg` cannot erase.

Verification: rendered the finished components' own paths in WebKit side by side with
the reference PNGs (a throwaway HTML page driven from the component source, so the
comparison used the shipped `d` attributes, not a copy). Silhouettes, lens ring, hump
crest, corner radii and the rounded base band all line up; the largest remaining
deviation is a fraction of a design unit on the hump shoulders. `npm run typecheck`
passes. Not device-verified, but the glyphs are resolution-independent vectors and were
checked at 6x.

Don't regress: these are measured reproductions, not guesses — do not "simplify" the
paths or re-square the corners. Never bundle a rendered SF Symbol; the geometry may be
matched, the artwork may not be shipped.

### 2026-08-31 — Add-member pill re-centred, and the keyboard Done bar made app-wide

Two reports from the Edit Chore screen.

**1. "Add member" label off centre.** iOS has TWO different pills and the port had
crossed them. `AddChoreView.swift`'s is the split design — label, a 1pt divider, then a
25-wide `appBackground` compartment holding the chevron — and the RN copy of that one is
correct. `ChoreDetailView.swift`'s is the plain capsule:
`HStack(spacing: 6) { Text 12pt, chevron 5x9 }` with `.padding(.horizontal, 10)`, i.e.
EQUAL side paddings. The RN version had inherited a 16-wide chevron compartment from the
other pill, so its paddings were 10 left and (16-5)/2 = 5.5 right — the label sat 4.5
units left of centre. Now `paddingHorizontal: s(10)` + `gap: s(6)` with the chevron
wrapper cut to the glyph's own 5x9. The wrapper stays (2026-08-27: a bare `Svg` sibling
was the one unexplained variable when this pill truncated to "Add") — it is just no
longer oversized.

**2. No Done button above the keyboard on the notes field.** `KeyboardDoneBar` was
rendered inside `BottomSheet`, so only sheet text fields had it. iOS has it over EVERY
field in the app: `SceneDelegate` sets
`IQKeyboardManager.shared.enableAutoToolbar = true` (QuickActionManager.swift), which is
global. Moved the bar to a single mount in `App.tsx`, rendered last in the root tree so
it also paints above an open sheet, and removed the per-sheet copy. Every screen-level
field — Chore Detail notes and rename, Add Chore's notes/sub-tasks/custom name, Create
Zone, the household setup fields, Members search — now gets it for free, and there is
exactly one instance so two bars can never stack.

Verification: `npm run typecheck` passes; the pill's 10/5.5 asymmetry is arithmetic from
the styles, and the single mount was checked by grep. Not device-verified — the phone is
on its PIN keyguard.

**Follow-up, same day — that centring change broke the label again.** Re-centring by
moving the offsets onto the pill (`paddingHorizontal: s(10)` + `gap: s(6)`) reintroduced
the 2026-08-27 truncation from the other end: the row then painted only "member", where
the original defect painted only "Add". The 2026-08-27 entry had already recorded that the
padding-on-CHILDREN shape is the one that renders the full string and that the mechanism
was never identified — so reshaping the row was the mistake, not the padding values.

Restored that shape and rebalanced within it: the label keeps `paddingLeft: s(10)` and the
chevron's box carries `paddingLeft: s(6)` + `paddingRight: s(10)`. Total geometry is
identical to iOS — 10 either side, 6 between label and glyph — with no container padding
and no `gap`.

Don't regress: the two "Add member" pills are DIFFERENT iOS designs — Add Chore's is
split with a divider, Chore Detail's is a plain capsule with symmetric padding; do not
unify them. Chore Detail's pill has now truncated on device TWICE when reshaped; keep the
offsets on its children and leave the row's structure alone. `KeyboardDoneBar` is mounted
once at the root — never re-add it to `BottomSheet` or any screen.

### 2026-08-31 — Member profile's last chore card sat under the navigation bar

Same mechanism as the Overview card earlier today, one level down: `ProfileDetailView.swift`
puts `.padding(.bottom, 40)` on its ScrollView content, and only the BACKGROUND carries
`.ignoresSafeArea` — so on iOS that 40 sits above the home indicator. Android's scroll
spans the whole window, so s(40) (~46dp) was the entire gap between the last chore card
and a 48dp three-button bar, leaving the card flush with it.

`MemberDetailView`'s scroll now pads `s(40) + insets.bottom`. Swept every vertical page
scroll for the same shape while in there:

| scroll | pad | clears | verdict |
|---|---|---|---|
| MemberDetail | s(40) → +inset | nav bar | **fixed** |
| Settings | s(60) → +inset | nav bar | fixed (was 21dp, iOS gives 60 above the indicator) |
| Members list / EditProfile | s(140)/s(160) → +inset | bottom CTA | fixed for consistency |
| Home s(260), Zone/Chart/Stats s(140) | 161–300dp | tab bar top at ~131dp | already fine |
| CreateZone s(150), ZoneDetail s(150), AddChore s(140) | 161–173dp | CTA top at ~126dp | already fine |

Verification: `npm run typecheck` passes; the clearances in that table are computed from
the styles against this device's 48dp bar. Not device-verified — the phone is on its PIN
keyguard.

Don't regress: iOS ScrollViews here respect the safe area even when the background does
not, so an iOS `.padding(.bottom, N)` becomes `s(N) + insets.bottom` on Android whenever
the scroll reaches the window edge. Screens whose scroll only has to clear a floating tab
bar or CTA already budget for it and need no inset.

### 2026-08-31 — Pushed-screen headers had no height, so scrolled cards slid under the buttons

Reported as "no spacing at the top when scrolling" on Edit Chore / Chore Details. The
content was not merely close to the header — it was passing BEHIND the 40pt circle
buttons, which is why the header appeared to sit on the card's white surface.

iOS's header is a `ZStack { title, HStack of circleButton }` inside
`VStack(spacing: 0) { header.padding(.top, 59); ScrollView }`, so the row's height is its
tallest child — the 40pt buttons — and the ScrollView starts at exactly 59 + 40 = 99.

The RN headers had NO explicit height, so each row was only as tall as its title's line
box (22 x 1.193 = 26.2 units). Two consequences: the scroll began ~14 units too high, and
the `headerButtons` row — absolutely positioned and vertically centred — overhung the
scroll's top edge by (40 - 26.2)/2 = 6.9 units (~8dp), so scrolled content ran underneath
it instead of clipping cleanly below the header.

Added iOS's row height to the five screens that were missing it: `ChoreDetailView` and
`AddChoreView` (`height: s(40)`, since their `headerWrap` carries the 59), and
`CreateZoneView`, `OverviewView` and `ChoreStatusView` (`height: s(99)`, or s(80) on the
small-phone variant, since the 59/40 top pad lives on the header itself — RN heights are
border-box, so this is the same 40 of content). `MembersView` and `SettingsView` already
did exactly this with `height: s(99)`, which is how the correct value was confirmed.

Verification: `npm run typecheck` passes; the 26.2-vs-40 arithmetic comes from the styles
and matches the screenshot, where the header buttons are painted over the card. Not
device-verified — the phone is on its PIN keyguard.

Don't regress: a header whose buttons are absolutely positioned MUST carry iOS's row
height (40, plus the top pad when that pad is on the same view). Without it the row
collapses to the title's line box and every absolutely-placed child overhangs whatever
follows.

### 2026-08-31 — Sheet footers were double-padded: the card's inset plus their own iOS offset

Reported on the Reminder sheet: far more space under Done than iOS. The measurement:
iOS's footer is `.padding(.bottom, 55)`, which is ~63dp here, while Android was rendering
**111dp** — the footer's own s(55) *plus* the card's `paddingBottom: insets.bottom`
(2026-08-26), which a flow child inherits. Every flow footer in every sheet had the same
double count:

| iOS design offset | Android before | after | iOS equivalent |
|---|---|---|---|
| 55 | 111dp | 66dp | 63dp |
| 40 | 94dp | 66dp | 46dp |
| 30 | 83dp | 66dp | 35dp |

New `sheetFooterPad(design, bottomInset)` in `BottomSheet.tsx` returns
`Math.max(s(design) - bottomInset, s(16))`, so the TOTAL from the window edge is
`Math.max(s(design), bottomInset + s(16))` — the same rule every bottom CTA in the app
follows, within ~3dp of iOS on a three-button bar and exactly iOS's value on a
gesture-nav device with no inset. Applied at all 12 flow-footer sites: `AddChoreSheets`
(`footer` x3, `footerTall`, `photoGrid`, `createFooter`), `ProfileSheets` (`optionRow`,
`formFooter`), `ScheduleSheets` (`downloadFooter`, `memberSheetContent`, `snoozeFooter`)
and `ChoreStatusView`'s `sheetFooter`.

Note the three design values now collapse to the same 66dp on a bar device. That is
inherent, not a bug: iOS's 30 and 40 offsets sit partly INSIDE the home-indicator zone,
which has no Android equivalent — the bar is opaque and cannot be drawn under.

The card keeps its blanket inset on purpose: a future sheet that forgets the helper is
then merely over-padded rather than putting its CTA behind the navigation bar.

Verification: `npm run typecheck` passes; the table is computed from the styles against
this device's 48dp bar, and the reported 111dp matches the screenshot. Checked that no
component ended up with a duplicate `useSafeAreaInsets()` after the sweep. Not
device-verified — the phone is off ADB.

Don't regress: a flow footer inside `BottomSheet` must use `sheetFooterPad`, never a bare
`s(design)` (double-pads) and never the `Math.max(s(design), inset + s(16))` form used for
window-anchored CTAs (also double-pads, since the card already added the inset).
Absolutely-positioned sheet footers are the separate case — they use `ctaPadBottom`.

### 2026-08-31 — Assign Task sheet: ticks are now a draft, committed only by Done

The user reported that ticking members and dismissing the sheet without pressing Done
still changed the chore's assignment. It did: `onToggle` wrote straight into the parent's
`assigned` state on every tap, and in `ChoreDetailView` that also calls `markDirty()`, so
`saveEditsIfNeeded` on unmount persisted the discarded selection to Firestore.

`AssignMemberBody` now seeds a local `draft` from `selected` and every tick edits only
that; Done commits with `close(() => onSave(picked))` — the same shape `ChangeZoneSheet`
already used for its Done. ✕, the backdrop and drag-to-dismiss therefore discard. The API
changed from `onToggle(id)` to `onSave(ids)`, updated at both call sites (`ChoreDetailView`
and `AddChoreView`), so the parents can no longer be mutated a tick at a time.

**Deliberate divergence from iOS, at the user's request.** iOS's `AssignMemberSheet` takes
`@Binding var selected` and mutates it inside the row's action
(`selected.removeAll` / `selected.append`), so on iOS a dismissed sheet DOES keep the
change — its Done button only calls `animateClose()`. The requested behaviour is better and
is what ships here; recording the difference so it is not "corrected" back later.

Unchanged, matching iOS: creating a profile from page 2 commits immediately (it is a real
household mutation, not part of the assignment), and a newly created member is NOT
auto-ticked — iOS's `saveNewProfile` only returns to the list.

Still live-committing, and NOT changed because the report was specific to assignment: the
Calendar, Time, Month-day and Reminder sheets call `onPick`/`onTime`/`onNotify` as the user
interacts, with Done only closing — same as iOS's bindings.

Verification: `npm run typecheck` passes. Not device-verified — the phone is off ADB.

Don't regress: the assign sheet's ticks are a draft. Do not reintroduce a per-tap callback,
and remember `close(cb)` runs the callback after the dismiss animation, which is how the
commit stays ordered behind the sheet closing.

### 2026-08-31 — Keyboard auto-scroll ported to the four screens iOS implements it on

The user asked where iOS scrolls a focused field into view and for the same on Android.

**It is NOT IQKeyboardManager.** `SceneDelegate` sets
`IQKeyboardManager.shared.isEnabled = false` and keeps only `enableAutoToolbar`
(QuickActionManager.swift), so the scrolling is hand-written per screen. Grepping
`ScrollViewReader` + `keyboardHeight` finds exactly four:

| iOS screen | fields | keyboard padding |
|---|---|---|
| `JoinHouseholdView` | the invite-code field (`.id("codeField")`) | `.padding(.bottom, keyboardHeight)` on the header+scroll VStack |
| `CreateHouseholdView` | household name, your name, every member row | `max(0, keyboardHeight - 80)` |
| `AddChoreView` | More step's sub-task and note rows (reader at :1799 — the custom-name field on step 2 deliberately has none) | `.padding(.bottom, keyboardHeight)` |
| `ChoreDetailView` | note and sub-task rows | `.padding(.bottom, keyboardHeight)` |

Each runs the same thing on BOTH focus change and keyboard change:
`asyncAfter(0.05) { withAnimation(.easeOut(0.25)) { proxy.scrollTo(field, anchor: .center) } }`.
(`OnboardingUserSayView` also uses a `ScrollViewReader`, but for its testimonial
carousel — nothing to do with the keyboard.)

New `src/hooks/useKeyboardAutoScroll.ts` reproduces it. Android needs it for a different
reason than iOS: the app is edge-to-edge, so the window is not resized when the keyboard
opens and content simply ends up behind it.

- The focused field comes from `TextInput.State.currentlyFocusedInput()` and is measured
  with `measureInWindow`, so screens do NOT need iOS's per-field `.id(...)` plumbing —
  each input just passes `onFocus={autoScroll.onFocus}`, and the ScrollView takes `ref`,
  `onScroll`, `scrollEventThrottle` and adds `padBottom` to its content padding.
- The visible region is `windowHeight - (keyboard + insets.bottom) - KEYBOARD_TOOLBAR_HEIGHT`:
  `endCoordinates.height` under-reports by the bottom inset under edge-to-edge (same
  correction `KeyboardDoneBar` applies), and the Done bar sits on top of the keyboard.
- Deliberately one-directional: it only ever pulls a field UP. iOS's `anchor: .center`
  can also scroll back down, which on Android fought the user during relayout.
- Same 50ms delay before measuring, and `animated: true` for the 0.25s ease-out.

Wired into all four screens, matching iOS's field set exactly. Screens iOS does NOT
auto-scroll and which therefore were left alone: `MemberSelectView`, `EditProfileView`,
the Members search, every sheet's text field, and Add Chore's step-2 name field.

Verification: `npm run typecheck` passes (tsc parses the JSX, so the Join screen's new
ScrollView is structurally sound). NOT device-verified — the phone is off ADB, and this
is behavioural rather than arithmetic, so it does need a real check: focus the last
sub-task on Add Chore's More step and the notes field on Chore Detail.

**Follow-up, same day — the first pass overshot and hid the field.** Reported on the More
step: the scroll jumped far too high and the field ended up behind the header. Two causes,
both in the centring maths:

1. It derived the keyboard's top edge as `Dimensions.get('window').height - (keyboard +
   insets.bottom) - 42`. Those three values do not agree about which system-bar zones the
   window includes under edge-to-edge, so the derived edge was too high. The hook now reads
   `endCoordinates.screenY` from the keyboard event (new `useKeyboardTop`) — an absolute
   coordinate that needs no correction.
2. It centred the field in `[0, keyboardTop]`, i.e. the whole screen, where iOS's
   `anchor: .center` centres within the SCROLL VIEW's frame. On this screen the scroll
   starts ~200dp down, so every scroll was ~100dp too far, and a tall multiline notes box
   ended up with its top above the scroll's frame — behind the header, exactly as reported.
   The hook now measures the scroll's own frame (`getScrollableNode()` +
   `measureInWindow`) and centres within `[frame.top, min(frame.bottom, keyboardTop - 42)]`,
   with a hard clamp so the field's own top can never be pushed above `frame.top`.

Verification: `npm run typecheck` passes; walked the arithmetic through this device's
measurements from the report's screenshot (keyboard top ~573dp, scroll frame from ~200dp:
a 90dp-tall notes field 470dp down now scrolls 150dp and lands at 320-410dp, well clear of
the 531dp occlusion line). Still not device-verified.

**Second follow-up — the overshoot fix killed the hook entirely.** Measuring the scroll's
frame used `ScrollView.getScrollableNode()`, which returns a node HANDLE (`?number`,
`ScrollView.js:853` → `findNodeHandle`), not a host instance — so it has no
`measureInWindow`, the hardened guard resolved null, and the effect returned before
scrolling anything. The measurable ref is `getNativeScrollRef()` (`() => HostInstance |
null`). Verified both signatures in RN's own source rather than by trial.

The guard that hid this is now a degradation instead of a dead end: with no frame the hook
falls back to making the field merely VISIBLE (scroll by the overlap plus 16) rather than
skipping the scroll, so a future API change can no longer silently disable the feature.

Also confirmed from RN's Android source that `endCoordinates.screenY` really is emitted
there (`ReactRootView.java:910-918, 1048-1057`) — the other candidate for "nothing
happens", since the effect bails when `keyboardTop <= 0`.

Don't regress: keyboard auto-scroll belongs to these four screens only — that is iOS's
own scope, not an oversight. Screens must not use `KeyboardAvoidingView` for this on
Android; it is a no-op there under edge-to-edge. Take the keyboard's top edge from
`endCoordinates.screenY`, never from `windowHeight - height`; centre within the scroll's
measured frame rather than the screen; and measure it through `getNativeScrollRef()`,
never `getScrollableNode()`.

### 2026-08-31 — Due-badge calendar rendered black instead of blue (hardcoded SVG fill, again)

`zoneCalendarIcon.svg` bakes `fill="black"`, and the member profile's due badge used the
raw asset — `<Images.zoneCalendarIcon width={s(14)} height={s(14)} />` — so no colour prop
could reach it. iOS draws it as a template:
`Image(.zoneCalendarIcon).renderingMode(.template).foregroundColor(DueState.today.accent)`
(`ProfileDetailView.swift:573-581`), i.e. #3F81FF, the same blue as the "Today" label and
the progress gradient beside it. Switched to the existing tintable `ZoneCalendarGlyph` at
`colors.blue` (verified identical to `dueAccent.today`).

Swept every remaining calendar-asset call site:
- `StatsFilterSheet`'s range picker used the raw `choreCalendarIcon` inside an
  `opacity: 0.7/0.3` wrapper. iOS tints it `appText` at those opacities, and the asset's
  baked black is #000 against `appText`'s #1F1F1F — a real, if small, deviation. Now
  `ChoreCalendarGlyph` with `colors.text` at B3/4D.
- `OnboardingProgressView`'s `calendarGlyphIcon` is correct as-is: the asset is WHITE, and
  iOS deliberately renders it without `renderingMode(.template)` — no tint on either side.
- `calendarImg` in onboarding is illustration art, not a glyph.

Every other calendar in the app was already going through `ZoneCalendarGlyph` /
`ChoreCalendarGlyph` (Home, Zone, chore cards, schedule sheets, Add Chore, Chore Detail).

Verification: `npm run typecheck` passes; the tint values are read from the iOS source and
the asset fills were confirmed by grepping the SVGs. Not device-verified — the phone is off
ADB.

Don't regress: this is the third icon shipped from a hardcoded-fill asset where iOS uses a
template (`zoneDownloadIcon` 2026-08-26, `logoutIcon` 2026-08-27, now `zoneCalendarIcon`).
When iOS says `renderingMode(.template)`, the Android side MUST use the `glyphs.tsx`
equivalent — a `color` prop on the raw asset component is silently ignored.

### 2026-08-31 — Remote Config: one fetch per 24h, cached in between, refetched when the day rolls over

Requested policy: fetch at most once per 24 hours, reuse the cached values, and refetch on
app open if the calendar day changed. `PaywallConfig.ts` previously used
`minimumFetchIntervalMillis: 3600000` (one hour) and fetched only once per mount, so it
both fetched more often than wanted and never picked up a change without a relaunch.

- `minimumFetchIntervalMillis` is now `DAY_MS` in release (still 0 in `__DEV__`). That is
  what enforces the cap: inside the window `fetch()` resolves locally without touching the
  network, and the SDK keeps the last activated values on disk — so `readConfig` returns
  them on a cold start with no fetch at all. Cache reuse needs no code of our own.
- The day-change refetch has to BYPASS that cap, because a day boundary can fall well
  short of 24h since the last fetch (fetch at 23:50, open at 08:00). `rc.fetch(0)`
  overrides the minimum interval for that one call; the normal path just calls `activate()`.
- "When did we last fetch" comes from `rc.fetchTimeMillis` — the SDK's own persisted
  timestamp of the last SUCCESSFUL fetch (`-1` on Android / `0` on iOS when there has never
  been one), read after the awaited `setConfigSettings`/`setDefaults` calls, both of which
  refresh it through `_promiseWithConstants`. No AsyncStorage bookkeeping, so nothing can
  drift out of sync with the SDK's own throttle.
- A fresh install still fetches immediately — otherwise the whole first session would run
  on in-app defaults.
- The check runs on mount AND on every `AppState` 'active', which is what makes "on app
  open" work for a process that survives midnight. It only reaches the network when the day
  actually changed, and `setConfig` is skipped when every value is unchanged so a
  foreground sync cannot re-render the gate for nothing.
- `readConfig` was factored out of the old inline object literal; the key list and the
  `showForceUpdateAlert` derivation are unchanged.

Verification: `npm run typecheck` passes; the day-boundary predicate was exercised over
four cases (same day +2h/+23h → no fetch, next day +8h and +3 days → fetch). The RNFB
semantics above were read out of `@react-native-firebase/remote-config/lib/index.js`
(`fetchTimeMillis`, `_updateFromConstants`, `_promiseWithConstants`) rather than assumed.
Not device-verified — the phone is off ADB.

Don't regress: the 24h cap lives in `minimumFetchIntervalMillis`, and the day-change path
MUST use `fetch(0)` to get past it — calling plain `fetch()`/`fetchAndActivate()` there
would be silently throttled and the new day's values would never arrive. Keep reading the
last-fetch time from `fetchTimeMillis`; a parallel timestamp in AsyncStorage can disagree
with the SDK and cause either double fetches or none.

### 2026-09-01 — Onboarding page-1 jerk: 278ms of empty page after the swipe landed

The user sent a screen recording (`screen-20260901-104212.mp4`, 81 frames / 4.08s) of the
swipe from the welcome page onto "Keep Your Home Organized". Measured it frame by frame
(ffmpeg extract + an ink ratio over the page body) rather than eyeballing:

| frame | t | content on the page |
|---|---|---|
| f009 | 1.008s | 7.0% — welcome art sliding out |
| f011 | 1.074s | **0.1% — page landed, completely empty** |
| f012 | 1.119s | 0.1% (the CTA label flips to "Continue" here) |
| f013 | 1.352s | 0.9% — first pixels of the card |
| f017 | 1.475s | 4.7% |

So the pager lands at ~1.07s and nothing is on screen until 1.35s: **278ms of a blank
page**, then everything pops in. That empty beat is the jerk. The frame timings agree —
the recorder emits on change, and there is a 233ms gap with no frame at all right there.

Cause: `PAGE_REVEAL_DELAY`. It was 180 → 300 → 200 across earlier passes, every value
compensating for activation happening MID-DRAG (the page became `active` as soon as the
scroll crossed the dead zone, so the delay held its art back until the pager had visually
settled). Activation has been driven by `settled` — momentum end — since 2026-08-24, so
the delay stopped deferring anything and became pure dead time. Set to 0: the 220ms fade
now starts on the landing frame.

Checked and cleared while in there: every animation on this page is native-driven
(`parts.spring` passes `useNativeDriver: true`, the ring is Reanimated on the UI thread),
and all seven pages are mounted up front with `PageReveal` only animating opacity, so the
task-card bitmaps are already decoded before the reveal — no JS-thread or decode work in
the reveal window.

One thing NOT explained: f018 (t=1.540s) is a single fully-blank frame in the middle of
the reveal, preceded by a 65ms inter-frame gap against a 34ms median — a dropped frame.
The reveal resumes at f019 further along than it left off, so it is not the fade
restarting (a restart would blank for a full cycle). Most likely the recorder captured a
surface mid-hitch; no code path sets the page's opacity to 0 at that point. Worth
re-checking on a fresh recording now that the dead beat is gone.

Verification: `npm run typecheck` passes; the timing table above is measured from the
user's own recording. Not re-recorded after the change — the phone is off ADB.

Don't regress: `PAGE_REVEAL_DELAY` exists only as a hook for a future need; it must stay 0
while activation is settle-driven. Re-adding a delay here re-adds a visible empty page
after every swipe.

Still divergent from iOS, and NOT changed here: iOS's `TabView` renders the incoming
page's content while it slides, with the entrance animations firing on `.onAppear`, so
there is no empty slide-in at all. Android reveals the page only once it has landed, so
the incoming page slides in blank. Fixing that means driving `PageReveal`'s opacity from
`scrollX` positionally (the same technique `copyFade` already uses in this file) instead
of a timed fade — a bigger change to the exact mechanism that has regressed three times,
so it needs its own pass.

### 2026-09-01 — Gift banner flicker: Remote Config was EIGHT independent copies, not one manager

Reported as the banner appearing with its countdown, then losing the countdown, then
disappearing, on both Home and Settings — "state loading issue", and a request to check
how iOS loads TimerManager / RemoteConfig.

**iOS's structure is the answer.** `ChoreBuddyApp` creates ONE `@StateObject` per manager
(`TimerManager`, `PurchaseManager`, `RemoteConfigManager`, …) and injects them with
`.environmentObject`, so every view reads the same instance — and each of those managers
has its state available synchronously at init (`UserDefaults` for the timer, the SDK's
cached values for Remote Config, StoreKit entitlements). Its banner is therefore either
there or not on the first frame.

Android had `GiftTimer` and `PurchaseManager` as proper contexts, but `usePaywallConfig`
was a plain hook: **eight call sites** (`App`'s gate, Settings, MainTabs, Zone, Zone
Detail, Paywall, and both gift banners) each held their own `useState(defaults)` and
settled independently. That is exactly the reported sequence — Settings' copy had already
loaded `showLifeTimeBannerAtHome: false`, so it rendered the banner, while the banner's
own copy was still on the default `true`, so it drew the countdown pill. As each copy
settled they contradicted each other one at a time: pill goes, then the banner goes.

- `PaywallConfig.ts` → `.tsx`, now a `PaywallConfigProvider` + context mounted once in
  `App.tsx` beside the other managers. One instance, one fetch cycle, one AppState
  listener (the per-instance listener added earlier today was quietly running eight times).
- The sync is split: `primeRemoteConfig` is entirely LOCAL (settings, defaults, activate
  what is on disk) so the real configuration is available almost immediately, and
  `refreshRemoteConfig` is the only part that can touch the network, still under the 24h
  cap with the day-change `fetch(0)` bypass.
- Added `ready` to the config context AND to `GiftTimer` (false until the AsyncStorage
  read resolves — before this `isExpired` reported `false`, the "offer is live" state, on
  the first frame). `GiftBanner`/`HomeGiftBanner` render nothing until the RC flag, the
  timer and `hasLoadedInitialStatus` are all known, so the banner draws once, in its final
  state, instead of correcting itself twice.
- The root gate also waits for `config.ready`: three of its branches (force update,
  onboarding paywall, gift) are Remote Config decisions, and iOS makes them from
  synchronously-cached values. `ready` flips in a `finally`, so a Remote Config failure
  can never strand the app on the LoadingScreen.

The visibility RULES were already correct and are unchanged — verified against the iOS
source as a truth table over flag × expired × hasPro, all six rows matching
`HomeView.swift:163`, `SettingsView.swift:43` and the pill's
`.opacity(showLifeTimeBannerAtHome ? 1 : 0)`: Settings deliberately has NO timer check, so
an expired countdown still shows the banner there, with the pill hidden rather than
removed.

Verification: `npm run typecheck` passes; the truth table was checked mechanically against
the iOS conditions. Not device-verified — the phone is off ADB.

Don't regress: app-wide managers belong in ONE provider, mirroring iOS's
`@StateObject` + `.environmentObject` — never a bare hook with local state, or every call
site gets its own asynchronously-settling copy. Anything whose visibility depends on
Remote Config, the countdown or entitlement must wait for the matching `ready`/
`hasLoadedInitialStatus` flag; iOS can render immediately because its three sources are
synchronous, and Android's are not.

### 2026-09-01 — Home showed its empty state for ~1s before the chores arrived

Reported as: Home appears empty, then the data pops in — and the splash is already
showing a loader, so that is where the wait belongs.

**How iOS avoids it.** `ContentView.onAppear` calls `choreStore.bind(householdId:)`, and
`.onChange(of: householdManager.household?.id)` re-binds — both while `LoadingScreen` is
still on screen, because the gate holds there until `householdManager.loadState` is
`.ready`. By the time `MainView` appears, Firestore has served the local cache (persistence
is on by default), so Home draws its real state on the first frame. iOS has no explicit
"chores loaded" flag; it simply never renders Home before the listener has had its moment.

Android binds at the same point — `ChoreProvider` is keyed on `household?.id` and the
household resolves during the LoadingScreen gate — but it did NOT wait for the first
snapshot, so Home rendered `chores.length === 0` ("No Chores Yet!" / "chore-free") for as
long as the read took.

- `ChoreContext` now exposes `ready`, false from each (re)bind until the chores listener
  delivers its first snapshot. It also flips on the listener's ERROR callback, so a rules
  rejection cannot strand the app on the splash, and it is true immediately when there is
  no household to read from.
- The root gate holds `LoadingScreen` on `!chores.ready`, placed after the notification
  prompt so only the main app waits.
- A 4s cap releases the gate regardless. Persistence is enabled by default (verified in
  `UniversalFirebaseFirestoreCommon.java` — RNFB defers to the SDK default), so a warm
  launch waits milliseconds; the cap only matters on a first-ever launch with no cache and
  a slow network, where it restores exactly the old behaviour instead of a stuck splash.

Verification: `npm run typecheck` passes. Not device-verified — the phone is off ADB. The
thing to watch on device is the cold-start feel: splash → Home with data, and no
intermediate empty state.

Don't regress: anything the first screen renders conditionally on Firestore data needs a
"first snapshot" flag, not just the data itself — an empty array means "nothing yet" and
"nothing exists" at the same time. Keep the error callback flipping `ready`, and keep the
timeout cap.

### 2026-09-01 — Release version check before the Play push

The user asked to make the version "proper" ahead of pushing, pointing at iOS's
`IPHONEOS_DEPLOYMENT_TARGET = 16.6` and asking for the modern equivalent here.

Read both projects rather than assuming:

| | iOS | Android |
|---|---|---|
| user-visible version | `MARKETING_VERSION = 1.1` | **1.0.0** |
| build number | `CURRENT_PROJECT_VERSION = 1` | versionCode 4 |
| OS floor | deployment target 16.6 | minSdk 26 |
| API target | — | targetSdk / compileSdk 36 |

**The version is `1.0`, by the user's decision.** I first aligned it to iOS's 1.1 on the
assumption that one release should carry one number across both stores; the user corrected
that — this is Android's FIRST production release, so it starts at 1.0 regardless of where
iOS has got to, and the two listings have separate release histories. They then asked for
the two-component form iOS uses, so it is `1.0`, not `1.0.0`. `versionName` is a free-form
string on Android, so Play accepts it, and it makes `AppConstant.appVersionLabel` read
`ChoreBuddy V 1.0` — the same shape as iOS's support subjects. Set in `app.json`, mirrored
by hand into `android/app/build.gradle` (prebuild is not being run), with the
`AppConstant.appVersion` fallback and its doc comment moved to match.

Checked the force-update path, since `isVersionOlder` now compares a two-component string:
it pads missing components with 0, so installed `1.0` is NOT older than a minimum of `1.0`
or `1.0.0` (no false force-update — and live RC is `1.0` with the flag off), while `1.0.1`
and `1.1` both correctly trigger it.

**minSdk stays 26, deliberately.** The iOS deployment target is not something to mirror
numerically: 16.6 drops roughly three years of iOS releases, and the Android equivalent of
that aggressiveness (minSdk 29-31) would cut real users for nothing. API 26 is the common
modern floor — it is what notification channels and adaptive icons need, it is above React
Native 0.81's own minimum of 24, and Play reported 17,239 supported device models at this
level for bundle 3. Nothing in the app needs a higher API.

**targetSdk 36** already clears Play's floor (35 since August 2025), and compileSdk matches.

Verification: values read out of `ChoreBuddy.xcodeproj/project.pbxproj`, `app.json` and the
merged debug manifest (`minSdkVersion=26 targetSdkVersion=36`); `npm run typecheck` passes.

Don't regress: Android's version line is independent of iOS's — do not "sync" them.
`android.versionCode` must exceed Play's highest before each upload; the repo is at 4 and
Play's highest was 3 as of 2026-08-27, but uploads can happen outside this repo, so check
the Play Console rather than trusting that number. Keep `app.json` and
`android/app/build.gradle` in step whenever prebuild is not run.

### Signing keys and SHA-1 fingerprints (Android)

Four distinct certificates are in play. Google Sign-In validates the RUNNING app's signing cert against OAuth clients registered in the Firebase project, so every cert a build can be signed with must be registered or that build gets `DEVELOPER_ERROR` (GMS status 10).

| Cert | SHA-1 | Signs | Must be in Firebase |
|---|---|---|---|
| **Play App Signing key** (Play Console → App integrity → App signing → *App signing key* card → Classical key) | `72:6D:FA:0D:F4:B8:BA:78:9E:02:F9:B6:DF:DA:B2:B3:A8:E6:2A:89` | every APK Play delivers — internal testing included | **YES** — this is the one testers need |
| Local debug keystore (`android/app/debug.keystore`) | `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` | `assembleDebug` / Metro builds | yes, for local dev |
| Local upload keystore (`credentials/upload-keystore.jks`) | `D2:BF:E1:E2:A0:31:F3:B4:D6:54:7E:80:1A:43:34:B8:9B:88:ED:0A` | locally installed release APK/AAB | yes, for local release testing |
| Play *Upload key* certificate (Play Console → App signing → bottom section) | `B7:6A:2E:D3:76:F1:74:B6:A9:81:CE:D5:AE:DA:91:94:F3:50:35:13` | nothing on-device — Play only checks it at upload | no (registering it is harmless but pointless) |

**Open discrepancy:** Play lists the upload key as `B7:6A…` while `credentials/upload-keystore.jks` is `D2:BF…`. Those should match. Combined with the "Previous app signing keys" entry dated 19 Aug 2026, either the upload key was reset or a bundle was built with a keystore outside this repo (an EAS-managed credential behaves that way). Resolve this BEFORE the next release: if Play expects `B7:6A…`, a `bundleRelease` signed by this repo's keystore is rejected at upload.

Registering a fingerprint in Firebase creates the OAuth client server-side, so sign-in starts working WITHOUT a rebuild or re-upload. Re-downloading `google-services.json` only keeps the checked-in file in sync for future builds.

**Resolved 2026-08-27:** all four certs are now registered and the refreshed `google-services.json` is installed at both the repo root and `android/app/` (identical md5). It carries four `client_type: 1` entries — one per fingerprint above — plus the unchanged `client_type: 3` web client `131458540102-g56h4ush…`, which `AuthProvider` hardcodes as `webClientId`. Diffed the old and new files before installing: project number/id, `mobilesdk_app_id`, package name, api key and web client are byte-identical; only the Android OAuth client list grew. Nothing in code needed to change.

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

### 2026-08-22 — iOS-exact Home + Zone/ZoneDetail/CreateZone port

- Rebuilt `HomeView` as a structural port of `HomeView.swift`: logo/settings/crown header (crown only when not Pro, opens the new pushable `Paywall` route), empty/chore-free/today-list bodies, the FDF2FD progress card (pink radial glow, floating heart bunny, calendar badge, N/M figures, 151pt gradient bar), gift banner below the card, `Today's Chores` header with the green mark-all checkbox (Pro-gated, toggles done/undone), iOS chore cards, gradient 🎉 completed header, and the anchored 161pt three-dot menu (Done/Edit/Skip or Undo/Edit).
- Rebuilt `ZoneView` with iOS badge logic (`All Done` / `Overdue` / `N Today` with the calendar glyph), task + red overdue subtitles, hidden-zone filtering, per-index slide-in entrances, and scale-on-press cards.
- Rebuilt `ZoneDetailView`: centered title bar, zone dropdown (Edit Zone/Delete Zone admin-gated with the iOS alert, Mark all Done Pro-gated), search, capsule segmented control with animated thumb + swipeable Due/Completed pager, iOS chore cards with due badges and the four-row chore menu (incl. confirmed Delete), blinking-bunny empty state, bottom `Add New Chore` CTA over a fade.
- Rebuilt `CreateZoneView`: back-circle header, shadowed cards, bordered name field, live icon preview, 6-column color/icon grids with drawn checkmark glyphs, and the purple-edge save capsule (disabled opacity 0.8) over a 183.5pt bottom fade.
- New shared kit: `components/motion.tsx` (PressScale = iOS ScaleButtonStyle, SlideInCard, BlinkingBunny, useFloat, RadialGlow, BottomFade, CapsuleCTA with the appPurpleEdge 3D edge, CircleButton), `components/ChoreCardKit.tsx` (iOS chore card, overlapping avatars with photoData support, anchored ChoreMenu, MarkAllCheck), `components/glyphs.tsx` (calendar/more-dots/checkmark glyphs generated from the asset SVGs so they tint like iOS template images).
- `ChoreContext` gained iOS logic: `hiddenZones` listener + `deleteZone` (created-zone doc removal, `hiddenZones/{name}` for predefined, chore + photo-doc cleanup), `isOverdueNow` ("h:mm a" elapsed today), `markAllTodayUndone`, zone-scoped `markAllDone`.
- Added root `Paywall` route (slide-from-bottom) so crown/lock entry points can present the paywall post-onboarding.
- Verification: `npm run typecheck` passes; bundle loads on the emulator via a dedicated Metro on port 8082 with no module-eval errors (port 8081 belongs to Arbora's Metro — always check `lsof -iTCP:8081` before assuming whose packager is serving).
- Known deliberate deltas: iOS blurred glow circles are radial gradients (RN has no layer blur); "Edit Chore" menu rows push ChoreDetail (its edit mode) instead of a dedicated editor; Home/Zone entrance animations replay on mount rather than on every tab re-focus.

Don't regress: chore-card menus must stay anchored overlays (not modals); `hiddenZones` docs use the slash-sanitized zone name as the document id; the mark-all checkbox is Pro-gated and toggles undone when everything is complete.

### 2026-08-22 — iOS Schedule/Chores Chart parity port

- Rebuilt `ChartView` from `ScheduleView.swift`: Monday-based week navigation, recurrence-aware seven-day status grid, zone-grouped member cards, completed/skipped/missed/snoozed/pending states, current-day emphasis, empty mascot, and alternating staggered card entrances.
- Ported the Schedule overflow menu and native Android report actions: Download PDF creates one shareable report (including a single combined multi-week monthly PDF), while Print opens the system print dialog.
- Ported `ScheduleFilterSheet`: Zones/Member/Due Within tabs, draft selections, member search, Clear All, Save, active-filter indicator, and animated bottom-sheet presentation.
- Ported `ChartDownloadSheet`: Time Period/Member modes, This Week/Previous Week/This Month choices, member selection, and localized report week headings.
- Ported the member drill-down sheet with zone grouping, occurrence status, chore-detail navigation, and quick Mark Done/Skip/Snooze actions backed by the existing Firestore event/override logic.
- Added `expo-print` and `expo-sharing` for native PDF generation, printing, and Android share-sheet delivery.
- Verification: `npm run typecheck` passes and `:app:compileDebugKotlin` completes successfully.

Don't regress: report month export must create one PDF/share action, not one dialog per week; member occurrences must use the resolved status function so Firestore snooze overrides appear on their moved date.

### 2026-08-24 — iOS-exact Stats, Overview, and Settings port

- Rebuilt `StatsView` from `StatsView.swift`: title bar with settings + non-Pro crown (pushes `Paywall`), streak label shown only when the streak is non-zero, the FFEDF4→white streak card with the floating mascot and pink-gradient CURRENT STREAK figures, Mon–Sun face columns with statsCheck/statsCross/statsDash glyphs, Best/Average streak cards, `Chores Overview` with the completed/skipped/missed legend pills, filter button with active dot, slide-in overview rows, and the floating-mascot empty state.
- Rebuilt `OverviewView` from `OverviewView.swift`: back + delete-history circle buttons, floating `overviewMascot`, 30pt name with zone dot row, tri-segment control whose thumb takes the segment's accent colour, swipeable Completed/Skipped/Missed pages inside one shadowed card, per-row status marks (tick / dash / cross) with dividers, and the iOS "Delete History" confirmation that removes the chore's events.
- Rebuilt `SettingsView` from `SettingsView.swift`: `Access all features` Try-Pro banner with the tryProBadge, the iOS-styled `ModernToggle` for notifications (request → open-settings alert → persist + reschedule), Members row, feedback card (Rate Us / Share App / About App version), support card (Restore Purchase only when not Pro, Contact Us with the user id in the mailto, Privacy, Terms), and Log Out / Leave Household / Delete Account cards with the exact iOS alert copy.
- New `components/StatsFilterSheet.tsx`: iOS `StatsFilterSheet` with the peeking blinking bunny and hands above the card, `Filter By` header, left tab rail (Zones / Member / Time Period, defaulting to Time Period), zone rows with gradient tiles, member rows with search and avatars, period rows with live week/month subtitles, Clear all + Save — plus the nested `StatsRangePicker` calendar (start/end fields, month paging, purple range fill with rounded endpoints, Sunday coral). Sheets use the iOS `BottomSheetAnimation` values (present spring response .42/damping .9, dismiss easeIn 280 ms) and drag-to-dismiss past 110pt.
- `ChoreContext` gained the iOS stats engine: `statsEvents` (member/zone/range filtering), `overviewChores`, `perfectStreakDays`-based `currentStreak`/`bestStreak`/`averageStreak`, Monday-start `weekStatuses` where today only reports whether it is perfect, and `deleteChoreEvents`.
- `HouseholdContext` now matches iOS leave semantics: `leaveDeletesHousehold`, the exact `leaveMessage` copy, and a cascade delete (chores + photo docs, zones, hiddenZones, choreEvents, choreOverrides, members, then the household) when the last claimed member leaves.
- Added the `showLifeTimeBannerAtHome` Remote Config flag so Settings shows the gift banner only when Home is not already showing it, as on iOS.
- Verification: `npm run typecheck` passes; a fresh debug APK loads the bundle on the Pixel_4a emulator with no module-evaluation errors (all four screens are in the eagerly-imported navigation graph). Visual verification of these screens is blocked at the Google sign-in gate — the debug keystore SHA-1 is still unregistered in Firebase, so sign-in fails on emulator/debug builds.
- The emulator's debug APK must be rebuilt after native dependencies change; the previous one predated `expo-print` and failed with "Cannot find native module 'ExpoPrint'".

Don't regress: Stats period ranges are Sunday-first weeks (matching iOS `firstWeekday = 1`) while `weekStatuses` is Monday-first (iOS `firstWeekday = 2`) — these differ deliberately. Overview receives its date lists as route params from Stats so the drill-down respects active filters; the Chart entry point passes none and falls back to live events.

### 2026-08-24 — iOS-exact Members and Schedule port

- New shared sheet kit `components/BottomSheet.tsx`: the iOS sheet chrome in one place — dimmed backdrop, top-rounded 617/812-height card, grab handle, `SheetHeader` with the bordered ✕, peeking `BlinkingBunnyPeek` + `BunnyPeekHands` (offset and leading anchors), `SheetCheckbox`/`SheetRadio`/`SheetCTA`, and iOS `BottomSheetAnimation` timings (present spring response .42/damping .9, dismiss easeIn 280 ms) with drag-to-dismiss past 110pt.
- `components/ProfileSheets.tsx`: iOS `SelectOptionSheet` (Camera/Gallery cards), `ProfileFormCards` (Member Name card with the 20-char cap and duplicate/limit errors, 6-column avatar grid with the dashed add-photo cell, custom-photo cell, and purple check badges), and `CreateProfileSheet` at 80% height.
- Rebuilt `MembersView` from `MembersView.swift`: purple owner card with the crown-notched avatar and the invite-code bar (Copy via expo-clipboard + the "Invite code copied" toast, Share), search with clear button, `Members` section with the total count, member rows with You/Joined pills and per-row menus (Make Admin — admin-only and only for claimed non-admins — Edit Profile, Delete Profile), the memberEmpty empty state, and the bottom Add New Member CTA over a 184pt fade.
- Rebuilt `MemberDetailView` from `ProfileDetailView.swift`: avatar with the purple edit badge (opens the photo sheet), Monday-start weekly face streak with tick/cross/dash status dots, Current/Best/Average stat cards computed with the iOS longest-run and current-run rules, and the Due/Completed/Skipped/Missed tabs with the full due card (badge + segmented progress bar) or status pill cards, plus the blinking-bunny empty state.
- Added `EditProfileView` (`EditProfileView.swift`) as its own `EditProfile` route: header with back and delete, live avatar block, the shared profile form, and Save Changes over the bottom fade.
- Rebuilt `ChartView` from `ScheduleView.swift`: drawn status glyphs replace the old text markers (check/cross/dash/dot per iOS `cellGlyph`), member cards use the real `card1`–`card10` accent for the avatar ring, weekday header, and cell tints; zone sections are split by dividers; the week pill uses drawn chevrons in 28pt circles; legend, floating-mascot empty state, and the 171pt Download PDF / Print menu match iOS.
- New `components/ScheduleSheets.tsx`: `ScheduleFilterSheet` (Zones / Member / Due Within rail with gradient zone tiles, member search, and the coloured due tiles), `ChartDownloadSheet` (Time Period / Member segmented control, calendar-tiled period rows with radios, Select All, card-colour member rings), `ChartMemberSheet` (zone-grouped occurrence cards with the due badge + progress bar, per-card Mark as Done / Skip / Snooze menu), and `SnoozeUntilSheet` (six preset cards + Done).
- Rebuilt `ChoreStatusView` from `ChoreStatusView.swift`: floating statusMascot, the four themed states (Due On / Completed / Skipped / Snoozed) driving accent, card fill, pill, progress track and gradient, the reset button that clears whichever outcome is active, and the Snooze/Done/Skip action card whose active button switches to its gradient + alternate icon. The Done sheet is the iOS month grid capped at today; Snooze reuses the shared preset sheet.
- New `models/dueState.ts`: a faithful port of iOS `DueState` (accents, card/track fills, bar gradients, `live(from:)`, `calendarState(from:)`) plus the chart-sheet badge/fraction helpers, so detail, chart, and status screens share one source.
- `ChoreContext` gained per-occurrence lookups used across both areas: `occurs`, `hasEvent`, `isDoneOn`, `isSnoozed`, and `setOccurrenceStatus` now takes an optional completion time so the Done sheet records the picked date in one write (matching iOS `setOccurrenceCompleted(time:)`).
- Added `cardColors`/`cardColor` to the theme from the iOS `card1`–`card10` colorsets, and generated tintable Copy/Share/MemberAdd/Edit/DueOn/Cross/Chevron glyphs because those SVGs ship with hardcoded fills that a `color` prop cannot override.
- Verification: `npm run typecheck` passes. Runtime check on the Pixel_4a emulator required rebuilding the debug APK because `expo-clipboard` adds a native module — the same class of failure as `expo-print` earlier.

Don't regress: the Schedule tab is Monday-first (`firstWeekday = 2`) everywhere, including report weeks; chart cell colours come from the member's roster index via `cardColor`, not a local palette; sheets must use the shared `BottomSheet` so the peeking bunny, drag-dismiss, and iOS timings stay consistent. Adding any native dependency requires a fresh debug APK (and a fresh release AAB before the next Play upload).

### 2026-08-24 — iOS `View/Common` audit: every shared primitive accounted for

Audited all 13 iOS `View/Common` files against the RN port. Three had no equivalent at all, one was wrong, and several were duplicated inline rather than shared.

| iOS Common file | RN home | Status before this pass |
|---|---|---|
| `AdminOnlyAlert` | `components/alerts.ts` (`adminOnlyAlert` + the three message constants) | duplicated inline in 3 screens |
| `AvatarView` / `AvatarPhoto` | `components/AvatarView.tsx` (`AvatarView`, `encodeAvatarPhoto`, `pickAvatarPhoto`) | data-URI logic inline in 8 files; **no resize/size cap at all** |
| `BlinkingBunny` / `BlinkingBunnyPeek` / `BunnyPeekHands` | `motion.tsx` `BlinkingBunny`; `BottomSheet.tsx` `PeekBunny`/`PeekHands` | peek bunny duplicated in StatsFilterSheet |
| `BottomTabs` (+`ScaleButtonStyle`, `SlideInCard`) | `navigation/MainTabs.tsx`, `motion.tsx` `PressScale`/`SlideInCard` | tab bar lacked the 183.5pt scrim, sliding pill, and press scale |
| `ComingSoonView` | — | unused in iOS too (all four tabs are built); deliberately omitted |
| `DragToDismiss` (`BottomSheetAnimation`) | `BottomSheet.tsx` `useSheetAnimation` | duplicated in StatsFilterSheet |
| `EditableField` | plain `string[]` subtasks in AddChore | an iOS-only identity wrapper for `ForEach`; RN keys by index, so no port needed |
| `FloatingBunny` | `motion.tsx` `useFloat` | ✅ already shared |
| `ForceUpdateAlertView` | `screens/ForceUpdateView.tsx` | **missing** — the gate was documented but never built |
| `LoadingScreen` | `ForceUpdateView.tsx` `LoadingScreen` | was a bare ActivityIndicator, not the splash + spinner |
| `ModernToggleStyle` | `SettingsView.tsx` `ModernToggle` | **wrong geometry** (51×31 iOS-system size instead of iOS's 41×24 with a 20pt knob) |
| `PhotoPickers` (+`cameraSettingsAlert`) | `AvatarView.tsx` `pickAvatarPhoto` | permission-denied copy did not match iOS |
| `ProLimitPopup` | `components/ProLimitPopup.tsx` | **missing entirely** — locked actions jumped straight to the paywall |

- Added `ProLimitPopup` with the iOS card (325pt, 41pt radius, peeking bunny, hand/lock art, May be later / Unlock Pro) and wired all four iOS call sites: the central Add button and Zone Detail's Add New Chore check `freeChoreLimit`, Create Zone checks `freeZoneLimit`, and both mark-all controls (Home + Zone Detail) now raise the `markAllDone` popup instead of pushing the paywall.
- Limit evaluation mirrors iOS `choreLimitReached`/`zoneLimitReached`: `ChoreContext` now listens to the household document for `choreCreatedCount`/`zoneCreatedCount`, and `limitReached(created, freeLimit, isPro)` lives next to it.
- Added the `freeChoreLimit` (10) and `freeZoneLimit` (5) Remote Config keys plus force-update keys, including a port of iOS's component-wise `isVersion(_:olderThan:)` so `showForceUpdateAlert` only fires when the installed version really is older than `minimumAppVersion`.
- `App.tsx` now opens with the force-update gate ahead of onboarding, matching the documented iOS gate order, and every loading state uses the splash `LoadingScreen`.
- `encodeAvatarPhoto` implements iOS `AvatarPhoto.encode` properly: downscale to 512px on the long edge, then step JPEG quality down from 0.7 until the payload is under ~300KB. Previously photos were stored at whatever size the picker returned, which risked exceeding Firestore's 1MB document limit.
- Verification: `npm run typecheck` passes; the emulator loads the bundle with no module errors after rebuilding the debug APK for `expo-clipboard` and `expo-image-manipulator`.

Don't regress: avatars render through `AvatarView` only — never re-inline the `data:image/jpeg;base64,` prefix; profile photos must go through `encodeAvatarPhoto` so the 300KB cap holds; locked Pro actions show `ProLimitPopup` first and only reach the paywall via its Unlock button; the notification toggle is 41×24, not the iOS-system 51×31.

**Force-update gate — live Remote Config blocked the current version (RESOLVED 2026-08-27: RC now reads `isForceUpdateRequired: false` / `minimumAppVersion: 1.0`).** The new gate was verified on the emulator and rendered the Update Required screen because the project's Remote Config really is set to `isForceUpdateRequired: true` with `minimumAppVersion: "1.1"`, while `app.json` version is `1.0.0`. The gate is behaving correctly, but shipping as-is would hard-block every Android user. Before the next Play upload either raise `app.json` `version` to at least `1.1` or change `minimumAppVersion`/`isForceUpdateRequired` in Firebase Remote Config.

### 2026-08-24 — Add Chore wizard rebuilt against AddChoreView.swift

Verified the Android Add Chore flow line-by-line against the iOS sources and rebuilt it. The previous version had the right four steps but generic UI: one shared `ChoiceSheet` stood in for six distinct iOS sheets, and the step indicator, presets, pro locks, and validation toast were missing.

- Rewrote `AddChoreView` as a structural port: "New Chore" header with the arrow-circle back and purple Cancel, the step indicator (circleBg1/circleBg2 art, numbers, gradient connector, Zone/Chore/Schedule/More labels, collapsing to three steps when a zone is pre-selected), and the 300 ms ease-in-out horizontal pager.
- Step 2 now has all three iOS states: the hero card ("Add to {zone}" with the 55pt zone tile) with the Add Preset / Create Custom option cards, the preset list (single-select, and the selected card expands to show Next Cleaning + Frequency pills), and the custom-name card with autofocus.
- Step 3 matches iOS exactly: the five frequency rows with tinted glyph tiles and radios, then the `Occurs On`/`Repeat` block whose content switches per frequency — date+time, time only, the weekday chip row with the "Selected: …" caption, day-of-month + time, or the custom interval/unit wheels — plus the Assign card with the split "Add member" pill, horizontal avatars with remove badges, and the red invalid state.
- Step 4 matches iOS: Current State card with the segmented progress bar, and Reminder / Sub-tasks / Add Photos toggle cards that show the **Pro lock badge** for free users (previously these were always editable), plus notes with per-field trash buttons.
- Continue/Save bar per step with the iOS red validation toast (4 s auto-dismiss, tap to clear) instead of silently disabled buttons.
- New `components/AddChoreSheets.tsx` ports the six iOS sheets on the shared `BottomSheet`: CalendarSheet (min-date greying), TimeSheet, MonthDaySheet, ReminderSheet (two selectable fields switching between the wheel and the notify options), PhotosSheet, and the two-page AssignMemberSheet (member list ↔ create profile, sliding horizontally).
- New `components/WheelPicker.tsx`: iOS uses `DatePicker(.wheel)`, which Android has no equivalent for (the platform picker is a clock dialog), so the snapping hour/minute/AM-PM wheel is rebuilt with a centred selection band. It also backs the custom interval/unit pickers, replacing iOS's `Menu` dropdowns.
- `saveChore` now returns the new chore's document id, so photos attach to that exact document; the previous `attachPhotosToNewestChore` helper queried by chore name and picked the newest match, which could attach photos to the wrong chore when two chores shared a name. That helper and the module-level `pendingChorePhotos` global are deleted.
- Generated tintable glyphs for the arrow, schedule, reminder/subtask/photo, and alarm icons because those SVGs ship with hardcoded black and iOS renders them as templates in purple/white.
- Verification: `npm run typecheck` passes; the bundle loads on the emulator with no module errors.

Deliberate difference from iOS: iOS has **two divergent zone catalogs** — `ZoneData` (Zone tab: Basement, Closet, Workspace, Study Room, Workout Area, Gaming Zone) and `ChoreZoneData` (Add Chore: Storage, Hallway, Home Office, Study, Gym, Library). Android uses the single Zone-tab catalog everywhere, because following iOS would let users file chores into zones that never appear in the Zone tab.

Don't regress: Add Chore's zone list must stay the same catalog as the Zone tab; the More step's three toggles are Pro-gated; photos attach via the id returned from `saveChore`, never by name lookup.

### 2026-08-24 — Helper-layer audit against ChoreBuddy/Helper/*.swift

Audited all 21 iOS helper files against the Android tree by counting real call sites on both sides, then ported what was missing. Six helpers had no Android equivalent at all.

New files:

- `src/services/Analytics.ts` — `AnalyticsManager`. Same event names and parameter keys as iOS so both platforms share one Firebase funnel. `@react-native-firebase/analytics` was already installed but **never imported anywhere**: the Android app was shipping zero analytics. Wired all iOS call sites — screen views (7 screens plus the tab titles), sign-in/out, delete account, household created/joined, chore added/completed/skipped/snoozed, mark-all-done, zone created, paywall view, purchase success, force-update shown/tapped. Booleans are sent as 1/0 because the RN SDK rejects boolean params.
- `src/services/Crashlytics.ts` — `CrashlyticsManager`. Added `@react-native-firebase/crashlytics` (pinned `^24.1.1` to match the other RNFB packages; `latest` pulls 26.x and fails peer resolution) plus the config plugin in `app.json`.
- `src/constants/AppConstant.ts` — `AppConstant`. URLs were previously inlined across four screens, and **the support email was wrong**: Contact Us wrote to `support@chorebuddy.app`, which is not the address iOS uses. iOS's numeric App Store id becomes `packageName`, and `itms-apps://` becomes `market://`.
- `src/services/GiftTimer.tsx` — `TimerManager`. The 24-hour gift countdown persists its start date and expires once, and Home now hides the banner when it has expired. Previously `GiftPaywallView` hardcoded `23:15:23` on every mount and nothing ever expired, so the "limited time" offer ran forever. The banner also gained the iOS countdown pill.
- `src/services/RatingManager.ts` — `RatingManager` via `expo-store-review` (Play In-App Review), at most two prompts per install, requested after a chore is completed or a day is marked all-done.
- `src/services/Browser.ts` — `SafariView`. Policy/terms links open in Android Custom Tabs instead of ejecting to the system browser.

Remote Config gained the eight keys Android was missing: `isShowOnboardingPaywall`, `isShowGiftPaywall`, and the five inactivity keys plus `isShowInactivityNotification`. The first two are now honored by the root gate — until this change neither paywall could be switched off remotely on Android. `NotificationManager.scheduleInactivityReminders` is ported and re-armed on background; chore and inactivity requests are now identified by `chore_`/`inactivity_` prefix so the two schedulers cannot wipe each other (the old code called `cancelAllScheduledNotificationsAsync`).

Bugs found during the audit and fixed:

- `DocumentSnapshot.exists` is a **method** in RNFirebase v24, and `HouseholdContext` was reading it as a property. The condition was always false, so a deleted household was never detected. Also added iOS's `handleRemovedFromHousehold`: an admin removing your profile now returns you to household setup instead of leaving the app pointed at a member document that no longer exists.
- Account deletion only called `user.delete()`. iOS hands the household to the next claimed member or cascade-deletes it, removes the departing member document, and deletes `users/{uid}`. Android was orphaning the household and leaving the member slot claimed by a uid that no longer existed, so that profile could never be claimed again. Also added the `requires-recent-login` re-authentication path.
- `users/{uid}` was only ever created as a side effect of household setup, so `email`, `createdAt`, and `lastSeenAt` never existed. Ported `upsertUserDocument`.
- Editing a **predefined** zone pushed a blank Create Zone screen and created a second zone, leaving the catalog entry visible and the chores behind. Ported `convertPredefinedZone` (create real zone, hide the catalog name, migrate chores and events) and wired it through a `convertFrom` route param. A rename now also redirects the Zone Detail screen to the new name instead of leaving it on a stale empty zone.
- Permanent chore delete leaked the chore's `photos` subcollection and `choreOverrides` documents.
- Skipping an occurrence never rolled the stored due date forward, so the chore stayed pinned to the skipped date and kept reporting itself overdue. Ported `skipOnce`'s advance step, the shared `dueFields(for:)` writer, and `unskipOccurrence`.
- Settings → Delete Account called `leaveHousehold()` before `deleteAccount()`, which left a ghost unclaimed profile; it now matches iOS and calls delete directly.

Deliberately not ported, with reasons:

- `LocalImageStore`, `ImageResizer`, `ShareablePhoto` — dead code on iOS (zero references outside their own files; leftovers from the sibling Pixvert/GLBQ apps).
- `AppClock` — a debug date override whose only UI (Settings) is commented out on iOS, so `AppClock.now` is identical to `Date()` in every shipping path. Adding the indirection across ~15 Android files would buy nothing.
- `QuickActionManager` — iOS home-screen quick actions ("Wait! Don't go yet" → gift paywall, "Help us improve" → support mail). The Android equivalent is launcher app shortcuts, which needs a new native module (`expo-quick-actions`) and its own Android semantics. **PORTED 2026-08-31 — see that session entry.**
- `Enums.KeychainHelper` / `UserSettings`' Keychain mirroring — Android persists the same flags in AsyncStorage; the iOS Keychain copy exists to survive reinstall, which is a separate decision.

Verification: `npm run typecheck` passes; `:app:assembleDebug` succeeds (683 tasks, 9m 13s) with the Crashlytics Gradle plugin applied and the release signing block intact after prebuild; the app launches on emulator-5554 against Metro 8082 with no fatals, native Crashlytics initializes (collection off in debug, as intended), and `logScreenView` plus the new Remote Config reads are visible in logcat.

Don't regress: never read `snapshot.exists` as a property on RNFirebase v24; keep chore and inactivity notifications on separate identifier prefixes; the gift countdown must stay persisted rather than a per-mount constant; analytics calls must stay wrapped so a bad event name can never break a user action.

### 2026-08-24 — Icon "blink" fixed (it was Android's fadeDuration, not the PNGs)

Investigated the reported icon blink/jerk. The premise that PNGs were at fault did not hold, and the actual cause was a React Native default.

**PNG → SVG is not available as a fix.** The iOS asset catalog has 263 imagesets containing 662 PNGs and exactly **42 SVGs**. Those 42 are already imported as vectors on Android (`assets.ts` has 42 `.svg` imports and the catalog holds 42 `.svg` files) — a 1:1 match, so nothing vector-sourced is being rasterized. The other 220 imagesets ship **raster only on iOS**; there is no vector source to convert. Tracing them would mean inventing assets (rule #1) and would visibly destroy the rendered 3D-style mascot artwork, which is illustration, not glyph geometry.

**Actual cause: `fadeDuration`.** React Native's Android `Image` cross-fades every bitmap in over **300 ms** by default; iOS has no equivalent, which is precisely why the pop-in showed on Android only. The prop appeared **zero times** in the codebase, so every icon, avatar, and background was ramping from transparent on mount — and inside an entrance animation the two overlapped and read as a jerk.

- New `components/AppImage.tsx`: `AppImage`, `AppImageBackground`, and `AnimatedAppImage`, all transparent pass-throughs that set `fadeDuration={0}` before the prop spread (so a caller can still opt into a fade). `forwardRef` keeps the host node reachable, so `useNativeDriver` animations are unaffected.
- Codemodded all **132 call sites across 41 files**; no raw `<Image>`, `<Animated.Image>`, or `<ImageBackground>` remains outside the wrapper. `Image` stays imported in `MultiImageSlider` for `Image.resolveAssetSource`. `fadeDuration` is a per-Image prop with no global setting, and React 19 removed `defaultProps` for function components, so the wrapper is the only reliable way to apply it everywhere.
- Biggest single win: **14 screens** render the full-screen `appBg`, which was fading in on every navigation push.
- Icon sizing was already correct and is not a factor — `homeIcon` is 72×72 for a ~24pt render, i.e. @3x.
- Verification: `npm run typecheck` passes; the bundle reloads on emulator-5554 with no errors and the Update Required screen renders pixel-identically (the codemod is a visual no-op apart from removing the fade).

**Known remaining inefficiency, not addressed here.** `scripts/convert-assets.js` keeps only the highest-scale PNG per imageset (`.sort((a, b) => scale b - scale a)[0]`), discarding the @1x/@2x variants and dropping the `@2x`/`@3x` filename suffixes. RN's asset resolver picks a density variant from those suffixes, so with them gone **every device loads the @3x bitmap** — `welcomeScreenImg`/`signInBg`/`Splash_screen` are 1125×2436, about 10 MB each once decoded to ARGB_8888. `fadeDuration={0}` removes the fade but not decode time, so if a gap remains on the full-screen art, that is why. The fix would be emitting `name.png`/`name@2x.png`/`name@3x.png` from the script and letting RN choose per device.

Don't regress: never reintroduce a raw `<Image>` from `react-native` in a screen or component — import from `@/components/AppImage`, or Android's 300 ms fade comes back for that asset. Do not attempt to vectorize the 220 raster-only imagesets.

### 2026-08-24 — Onboarding page-change jerk: the reveal reset was on the wrong side of the early return

The reported symptom — swiping index 1 → 2 shows the page's art already in place, it disappears, then re-appears — was caused by the `PageReveal` change made on 2026-08-21, and Rethrive already had the fix.

`ReactNative-Rethrive-App-main/src/components/home/GestureControlsSheet.tsx` resets its entry animations **before** the early return, with the reason in a comment: *"Always start hidden — so an INACTIVE page never shows stale content (the user's 'swipe back shows old content, then it re-animates' bug)."* ChoreBuddy did the opposite — `if (!active) return;` came first, so a deactivated page kept `opacity: 1`. Revisiting it therefore slid in fully lit, and activation then called `setValue(0)` **while it was on screen**, blanking it for the reveal delay before fading it back. That is exactly the disappear/re-appear.

- `PageReveal` now resets to hidden on every effect run, deactivation included, so a non-settled page can never hold visible content.
- Split the single `index` into two signals. `index` still comes from `onScroll` (with the 0.45 dead zone) and drives the title/subtitle/dots, because those must track the drag — that was the original 2026-08-21 fix and it stays. New `settled` only advances once the pager has landed, and is what drives page art and each page's inner animations. Activating art mid-drag was the second half of the problem: the reset fired while the incoming page was already ~55% visible. Rethrive likewise sets its page `active` flag from `onMomentumScrollEnd` alone.
- Added the slow-drag fallback Rethrive documents: a slow drag-release can snap without ever emitting `onMomentumScrollEnd`, which would leave `settled` stale and the incoming page blank forever. `onScrollEndDrag` now arms a 180 ms timer that settles from the last `onScroll` offset, cancelled if momentum-end arrives first.
- `PAGE_REVEAL_DELAY` 300 → 200 ms. The 300 was compensating for activation happening mid-drag; with settled activation the delay starts after the page lands, and 200 matches Rethrive's `SETTLE_DELAY_MS`.
- Applied the same reset-before-return ordering to the five page components that hold staged state (`Calendar`, `Progress`, `Streak`, `Zone`, `UserSay`), so stale content cannot flash even if the opacity mask changes. `OnboardingAvatarView` is deliberately untouched: its drift values are a continuous ambient animation, and resetting them would snap the avatars.

**Follow-up, same day — the copy overlay was still on the drag index.** The user reported the jerk survived on swipe but was absent on Continue, which localised the rest of it exactly. The page art had moved to `settled`, but the fixed bottom copy overlay was still reading `COPY[index]`, so the incoming page's title swapped in as soon as the drag crossed the dead zone and its 400/600 ms springs ran from mid-gesture. On the CTA path the scroll takes 300 ms, which both delays outlast, so the copy could never appear early there — hence swipe-only.

- Copy text, the copy reveal effect, and the CTA label are now keyed to `settled`. `index` survives for the dots alone, where tracking the finger is desirable and cannot flash content.
- Because the copy overlay is fixed and does not travel with the pager, pinning it to `settled` would have left it parked at full opacity for the whole drag (the original 2026-08-21 complaint). So its *visibility* is now gesture-linked instead: `copyFade` interpolates a native-driven `scrollX` to 0 by the time the neighbouring page is centred. The pager is now an `Animated.ScrollView` with `Animated.event({useNativeDriver: true, listener})`, the listener carrying the existing dead-zone/settle-fallback logic.
- Removed the `titleIn`/`subtitleIn` reset from `selectPage`. With the copy on `settled` that reset would have blanked the copy of the page still on screen the instant a drag crossed the dead zone — reintroducing the flash from the other direction.

Verification: `npm run typecheck` passes, and the forward swipe path is confirmed on emulator-5554 by burst screenshots across a 1 → 2 swipe: page 1 content → page 2 landed with art and copy both hidden → page 2 art + copy revealed with the typing animation restarting from empty. One direction only (blank → content), never content → blank → content. The revisit path (2 → 1 → 2) was NOT exercised: synthetic backward swipes would not register on the emulator (and a left-edge swipe triggers Android's system back gesture instead of the pager), but it runs the identical `PageReveal` path. A temporary gate bypass in `App.tsx` was used to reach the pager and has been reverted — `App.tsx:48` must read `if (config.showForceUpdateAlert) return <ForceUpdateView />;`.

Don't regress: in any pager page, reset entry animations BEFORE `if (!active) return`, never after. Nothing content-bearing may key off the scroll-derived `index` — text, art, and labels all come from `settled`; only the dots may follow the drag. Gesture responsiveness for content belongs in a scroll-linked opacity, not in an early index flip. Never drop the `onScrollEndDrag` settle fallback.

### 2026-08-24 — Page 1's remaining jerk: the progress ring was the only JS-thread animation

After the pager fixes, the user reported page 1 ("Keep Your Home Organized") still jerked while every other page felt fine. That localisation was the answer: page 1 held the only content animation in onboarding that could not use the native driver.

`OnboardingProgressView` animated the ring with `Animated.timing(ring, { duration: 1000, useNativeDriver: false })` bound to `strokeDashoffset` on an `Animated.createAnimatedComponent(Circle)`. The native driver only handles transform and opacity, so SVG geometry has to go through JS — and under Fabric there is no `setNativeProps` fallback, so every one of ~60 frames became a full shadow-tree commit, for a solid second, overlapping the page reveal, the three task-card springs, and the title/subtitle springs. Every other page's animations are `useNativeDriver: true`, which is exactly why only this one stuttered.

- The ring now animates through Reanimated on the UI thread: `useSharedValue` + `useAnimatedProps` on a `Reanimated.createAnimatedComponent(Circle)`, with `withDelay(350, withTiming(1000, inOut(ease)))` reproducing iOS's `Circle().trim` and its lead-in exactly. The 350 ms lead-in is now a UI-thread delay rather than a `setTimeout`.
- **No new setup was required.** `babel-preset-expo` adds `react-native-worklets/plugin` automatically when Reanimated is installed (`babel-preset-expo/build/index.js`), the project has no `babel.config.js` to conflict with, and `libreanimated.so`/`libworklets.so` were already in the debug APK because Reanimated is an existing dependency — so this needed no babel config, no prebuild, and no native rebuild.
- Dash geometry is precomputed at module scope (`RING_FULL_LENGTH`, `RING_SWEEP_LENGTH`) because the worklet must capture plain numbers and can never call `s()`.

Verification: `npm run typecheck` passes; no Reanimated or worklet errors in logcat; a burst across the 0 → 1 swipe caught the entrance mid-flight — ring at trim ≈ 0 showing only the round cap at 12 o'clock, task card 1 in, card 2 sliding in, copy partway up — then near-complete, then the full 39.1% sweep. So the trim genuinely animates (it does not snap to final) and the staggered choreography is unchanged. Whether the stutter is *gone* is a feel judgement for a real device; the mechanism is removed.

Two JS-driven animations remain, both unavoidable and both fine: `OnboardingView`'s `offset` and `OnboardingUserSayView`'s carousel `driver` each feed an imperative `scrollTo`, which cannot be native-driven by definition. The carousel only runs 600 ms every 2 s.

Don't regress: never animate react-native-svg geometry (`strokeDashoffset`, `strokeDasharray`, `d`, `r`, `cx`) with RN `Animated` — under Fabric that is a per-frame shadow-tree commit. Use Reanimated `useAnimatedProps` for SVG, and RN `Animated` with `useNativeDriver: true` for transform/opacity. `useNativeDriver: false` is acceptable only when the value drives an imperative call such as `scrollTo`.

### 2026-08-24 — Google Sign-In failure diagnosed (unregistered debug SHA-1) + failures made visible

Reproduced on the connected moto g35 5G (Android 15). Tapping **Sign in with Google** opens the GMS account chooser, and the attempt dies after account selection with no feedback at all.

**Root cause is a signing-certificate mismatch, and it is an account-side item, not a code bug.** The APK installed on the device is the debug build:

- installed APK cert SHA-1 (`apksigner verify --print-certs`): `5e8f16062ea3cd2c4a0d547876baa6f38cabf625`, DN `CN=Android Debug` — matches `android/app/debug.keystore`
- the only Android OAuth client in `google-services.json` (`client_type: 1`) carries `certificate_hash: d2bfe1e2a031f3b4d6547e801a4334b89b88ed0a` — the **upload** key

So Google has no OAuth client for the running build and rejects the ID-token request with `DEVELOPER_ERROR` (GMS status 10). `@react-native-google-signin` surfaces that as a rejection with `code: "10"` (`RNGoogleSigninModule.java:168`). The debug SHA-1 being unregistered was already recorded as outstanding on 2026-08-21; this is that item biting.

Fix (Firebase Console, cannot be done from the repo): add `5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25` to the `chores.tracker.chorebuddy` Android app, re-download `google-services.json` to both the repo root and `android/app/`, then rebuild. Local **release** builds already work, because the upload key is registered. Play-delivered builds still need the Play App Signing SHA-1 added after the first upload.

Code fixes made while diagnosing:

- **`App.tsx:48` held a live `return <PaywallView onClose={()=>{}} />; // TEMP VERIFY BYPASS`** ahead of every gate — a leftover of the same kind the 2026-08-24 onboarding session warned about. Anything built from this tree could never reach sign-in at all; it would sit on the paywall forever. Removed. The device happened to be running an older bundle, which is why it still showed the sign-in screen.
- The sole call site was `onGoogle={() => { void auth.signInGoogle(); }}`, so every rejection became an unhandled promise rejection and the button silently did nothing — which is why a hard, fully-diagnosable `DEVELOPER_ERROR` presented as "not working". `signInGoogle` now catches, records to Crashlytics, and shows an alert; `describeSignInError` spells out the SHA-1 remedy for code `10` and handles `PLAY_SERVICES_NOT_AVAILABLE`/`IN_PROGRESS`.
- Dismissing the account chooser previously fell through to `throw new Error('Google Sign-In did not return an ID token.')`. `googleCredential` now returns `null` on `isCancelledResponse`, and both `signInGoogle` and the `deleteAccount` re-authentication path treat that as a no-op.

Verification: `npm run typecheck` passes. The cert mismatch is verified directly from the installed APK, and the chooser-then-nothing behaviour was observed live on the device; the post-selection `DEVELOPER_ERROR` itself was not captured, because selecting an account would have signed the user's real Google identity into the app.

Don't regress: never leave a `return <SomeView />` bypass above the gate chain in `App.tsx` — grep for `BYPASS` before committing. Sign-in must never be invoked as a bare `void` call again; failures have to reach the user.

### 2026-08-24 — Paywall hero jerk: the wipe was animating a layout `width` on the JS driver

The reported hero jerk was not the image order or the swap timing (both were fixed on 2026-08-21) — it was the same anti-pattern this file already bans for the onboarding ring, in a second place.

`MultiImageSlider`'s wipe animated the mask View's **`width`** with `useNativeDriver: false`. Layout props cannot go on the native driver, so each of the ~46 frames per 770 ms wipe was a JS-thread shadow-tree commit plus a Yoga layout pass — and unlike the onboarding ring, which runs once, this loops forever for as long as the paywall is on screen.

- The wipe is now **transform-only** and native-driven. A clip View of fixed `screen.width` translates by `dir * W * p` while the image inside counter-translates by `-dir * W * p`, so the image stays screen-fixed while the clip window's on-screen span shrinks. Geometry is provably identical to the old animated-`width` mask in both directions (verified algebraically for `right` true/false, and the image's net screen offset stays `inset` throughout).
- The out-of-bounds part of the clip View is clipped by the root's `overflow: 'hidden'`. **Confirmed empirically on device** — Android does clip transformed children against a parent's overflow clip, so nothing overhangs the hero band.
- Reordered the two source swaps so neither can flash regardless of which frame React commits on. At wipe = 1 the top layer is fully clipped, so promoting it to the image the base is already showing is invisible **and leaves both layers showing the same image**; the subsequent `wipe.setValue(0)` then paints identical pixels whether or not the native reset and the React commit land together, and advancing the base under that full coverage is invisible too. The old code relied on the swap + reset + relaunch all landing in one JS tick.
- Added a hidden full-size preload layer for `images[next + 1]`. The base layer previously switched to a not-yet-decoded 1125px PNG and began revealing it in the same tick, which could show a sliver of empty layer at the reveal edge. Fresco now has the bitmap cached a full cycle ahead (3 layers ≈ 14MB rather than 2 ≈ 9MB).
- Memoised the per-source `Image.resolveAssetSource` fill maths, which previously re-ran for both layers on every render.
- `PaywallView`'s close-button countdown ring had the **same** bug: `strokeDashoffset` on an SVG `Circle` via RN `Animated` with `useNativeDriver: false`, running concurrently with the hero whenever `isShowDelayPaywallCloseButton` is on. Moved to Reanimated `useAnimatedProps` (UI thread), matching `OnboardingProgressView`; `ready` now flips on a one-shot `setTimeout` instead of an animation callback.

Verification: `npm run typecheck` passes. Verified on the physical device (ZA223H5ZQ3) with a temporary `App.tsx` gate bypass, since the device sits at the Google sign-in gate — **the bypass has been reverted**; `App.tsx:48` must read `if (config.showForceUpdateAlert) return <ForceUpdateView />;`. A 10-frame burst across the hero shows clean vertical wipe boundaries mid-transition, correct pw1→pw6 cycling with no repeats or skips, no blank sliver at the reveal edge, and no overhang outside the hero band. Real Play prices load on this device (₹54.81/week yearly, ₹590/week weekly).

`dumpsys gfxinfo` before/after was **inconclusive** and should not be cited as evidence: one pair of runs showed the fix at 7 ms/9 ms (p90/p95) against the old code's 16 ms/16 ms, but a repeat run of the fix gave 10 ms/16 ms. Janky-frame percentage stayed ~1.1–1.3% throughout, and this is a debug build with Metro attached, whose dev-mode overhead swamps the difference on a 120 Hz panel. The mechanism removal is the claim here, not a measured frame-time win.

Don't regress: the hero wipe must stay transform-only — never reintroduce an animated `width`/`height` on the mask. Keep the two source swaps split across the pause (promote top at wipe = 1, advance base at wipe = 0) rather than collapsing them into one tick. Keep the preload layer. `useNativeDriver: false` remains acceptable only when the value drives an imperative call such as `scrollTo`.

### 2026-08-24 — Paywall close button unreachable: the actions row scrolled away with the content

Reported as "cross button not working". The button was never disabled — it was off the screen.

`Restore` and the close ✕ were absolutely positioned inside `Header`, which is the ScrollView's first child, so the whole row scrolled with the page. iOS's paywall does not scroll, so its buttons are always at the window top; the Android port scrolls whenever system bars or a compact screen reduce usable height (added deliberately on 2026-08-21), and scrolling down carries the row off the top of the screen, where the remaining sliver is effectively untappable.

- `Header` is now the hero band only. The new `HeaderActions` renders as a sibling AFTER the ScrollView inside `st.root`, so it is pinned to the window and unaffected by scroll position. It keeps the same `insets.top + s(10 / iPad 20)` offset, so the resting layout is pixel-identical.
- The strip is `pointerEvents="box-none"` so the gap between Restore and ✕ does not swallow scroll gestures on the hero.
- `GiftPaywallView` has no ScrollView and is unaffected.

Verification: `npm run typecheck` passes. **Not yet confirmed on device** — the moto g35 locked itself mid-session and unlocking it is the user's to do, so the tap was never exercised after the fix. The diagnosis itself is from a device capture (`scratchpad/pw_b.png`) that shows the paywall scrolled down with the hero's top third gone and both the Restore pill and the ✕ ring clipped above y=0. Note that capture's scroll offset came from launching with `adb shell monkey ... 1`, which injects one random event — but a real user scrolling the paywall reaches the identical state, which is the bug.

Don't regress: never put the paywall's close affordance inside the ScrollView. Launch with `adb shell am start -n chores.tracker.chorebuddy/.MainActivity`, not `monkey`, when the scroll position matters to what you are looking at.

### 2026-08-27 — Members row menu: the backdrop was on top of it, and Delete was blocked by a non-iOS rule

The Edit Profile / Delete Profile rows in the Members list menu did nothing when tapped. Three separate causes, all in `MembersView`.

**1. The dismiss backdrop covered the menu.** The menu was rendered inside the member row, i.e. inside the `ScrollView`, while `{openMenu && <Pressable style={StyleSheet.absoluteFill} …/>}` was a LATER sibling of that ScrollView — so the full-screen backdrop painted above the menu card. Every tap on Edit/Delete hit the backdrop, which only called `setOpenMenu(null)`: the menu closed and nothing else happened, exactly the reported symptom.

**2. The menu also rendered outside its parent's bounds.** `rowMenu` was `position: absolute, top: s(60)` inside a `s(69)`-tall row, so ~90% of the card lay outside the row. Android does not dispatch touches to a child drawn outside its parent's bounds, so even with the backdrop gone the two lower rows would have stayed dead.

Both are fixed by adopting the pattern `ChoreCardKit.ChoreMenu` already uses everywhere else: the row `View` carries a ref, the kebab `measureInWindow`s it and stores `{ memberId, top: y + s(60) }`, and the menu renders as a screen-level overlay — backdrop FIRST, card second — after the bottom CTA so the `Add New Member` capsule cannot cover it either. `rowMenu` keeps its design geometry, with `right` re-expressed in window space (`s(10)` from the row + the content's `s(15)` inset = `s(25)`).

**3. Delete was rejected for any joined member.** `HouseholdContext.deleteMember` threw on `target.claimedByUserId`, a guard iOS does not have — `HouseholdManager.deleteMember` (line 437) deletes unconditionally, and `MembersView.requestDeleteProfile` blocks only `profile.isAdmin`. So deleting anyone with the "Joined" pill (Eve in the report) could never work. Dropped the claimed check; the admin guard stays, matching iOS's call-site rule.

That throw was also invisible: all six member mutations were fired as `void household.x()`, so a rejection became an unhandled promise rejection and the button silently did nothing — the same class of bug as the 2026-08-24 sign-in failure. Added `reportMemberError(action)` and attached it to every add/update/delete/makeAdmin call site; the two delete sites that pop the screen now `goBack()` only on success.

Verification: `npm run typecheck` passes. NOT device-verified — the moto g35 is on its secure keyguard again (`mDreamingLockscreen=true`), whose screencaps return black. Metro 8083 is up, so Fast Refresh delivers this once it is unlocked; check that Edit Profile pushes the edit screen and that deleting a "Joined" member works.

Don't regress: anchored menus put the backdrop INSIDE the overlay, below the card — never as a later sibling of the scroll view holding the menu; and never draw a menu outside its parent's bounds on Android. Member mutations must never be called as bare `void` promises.

### 2026-08-27 — Select Option sheet: `flex: 1` on a `PressScale` never reached the row (fixed in `PressScale` itself)

The Camera/Gallery cards in the profile photo sheet rendered as narrow columns hugging their labels instead of iOS's two half-width 110pt cards. `optionCard` already carried `flex: 1` — but `PressScale` applies the caller's style to an INNER `Animated.View` (so the whole button scales, like iOS `ScaleButtonStyle`), so the flex landed on a child of the `Pressable` and the `Pressable` itself shrink-wrapped to the text. The row therefore divided nothing. This is the same defect recorded for the Stats filter Save button on 2026-08-27, which was patched at that one call site with a `saveSlot` wrapper.

Fixed at the source instead: `PressScale` now flattens the incoming style, hoists `flex`/`flexGrow`/`flexShrink`/`flexBasis` onto the outer `Pressable`, and strips them from the inner style so the value cannot apply twice. `StyleSheet.flatten` can hand back the registered style object itself, so the inner style is copied before any delete — mutating it would corrupt the global registry. Only flex props are hoisted: hoisting `position`/offsets would MOVE things, because a `position: absolute` inner currently resolves against a zero-size `Pressable` sitting at its flow position, not against the grandparent.

That one change fixes four sites carrying the identical bug — the sheet's option cards, `ProLimitPopup`'s May be later / Unlock Pro row, `ScheduleSheets`' filter Save, and `ChoreStatusView`'s Snooze/Done/Skip action row (`actionButtonWrap`). Each card in the sheet now measures (375 − 30 − 15)/2 = 165 × 110 design units, matching `SelectOptionSheet.swift`.

Also pinned two line boxes per the standing Android font-padding rule: the option label (15 → `lineHeight` 17.9) and `SheetHeader`'s title (20 → 23.9), the latter shared by every sheet — without it the default `includeFontPadding` added ~5dp to each sheet's header row.

Verification: `npm run typecheck` passes; the geometry is derived from the iOS tokens. NOT device-verified — the moto g35 is attached but asleep behind its secure keyguard, so screencaps return black. Metro 8083 is running, so unlocking the phone delivers this over Fast Refresh; re-check the sheet then (each card should span half the row).

Don't regress: `PressScale` hoists flex props — do NOT re-add per-call-site `flex: 1` wrapper Views for it, and do not extend the hoist to `position`/`top`/`left`/`right`/`bottom` without re-checking every absolutely-positioned call site. Never mutate the object `StyleSheet.flatten` returns.

### 2026-08-31 — Android launch screen: full-bleed artwork over pink, ported from Arbora

The launch screen showed the 1125×2436 splash artwork as a small centred rectangle floating in a pale `#FBF7FD` field. Not an asset problem — the same two-screen Android 12+ split Arbora already documented and solved:

1. **The system splash** (`Theme.App.SplashScreen`) draws `windowSplashScreenAnimatedIcon` centred in a fixed icon slot that Android sizes itself, scaling the image to FIT. Handing it the whole launch canvas is exactly what produced the small centred rectangle, and **no drawable can make it full-bleed** — that slot is not overridable. Its background accepts a COLOR only, never a gradient.
2. **The window that follows it** via `postSplashScreenTheme` (`AppTheme`) holds until React Native's view attaches — and holds *again* for as long as `App.tsx` returns `null` while `useFonts` resolves. Expo leaves `AppTheme` with no `android:windowBackground`, so this stretch was blank. That is the "blank colour screen" in the report.

Ported `Arbora/plugins/withLaunchScreenFill.js` (itself a port of TC9's hand-written native files) as `plugins/withLaunchScreenFill.js`, adapted for the user's gradient:

- (1) is now a **bare `#FED6DC` field with no icon**: `expo-splash-screen` gets a blank 48×48 transparent PNG (`assets/images/splash-blank.png`, generated) at `imageWidth: 1`. The legacy `expo.splash` block is gone.
- (2) is a layer-list — `LinearGradient(#FFD6DC → #FCA3B0, top→bottom)` as a `<shape>` base, then `splash.png` as a `<bitmap android:gravity="fill">` — set as `AppTheme`'s `android:windowBackground`. The gradient is the user's SwiftUI stops verbatim; because the system splash can only take a flat colour, the requested `#FED6DC` fallback is what the first screen uses and the gradient lives on the second.
- **`.ignoresSafeArea()` equivalent:** `AppTheme` also gets `statusBarColor`/`navigationBarColor` transparent and `windowLightStatusBar` true. Expo had written an opaque `android:statusBarColor` of `#FBF7FD`, which would have painted a pale band across the top of an otherwise full-bleed launch screen. `androidStatusBar: { barStyle: "dark-content", translucent: true }` in `app.json` makes prebuild emit the same (`backgroundColor` is deliberately omitted — setting it makes Expo warn that it conflicts with the splash colour, and `translucent: true` ignores it anyway).
- `App.tsx` now holds the native splash with `preventAutoHideAsync()` and hides it once `useFonts` resolves **or errors** (never strand the user on a splash), matching Arbora. `LoadingScreen`'s root background moved from `colors.background` to `#FED6DC` so a slow bitmap decode cannot flash pale lavender between the native window and the JS screen.

Applied in **both** places on purpose, as with the permission trim and the launcher icon: the config plugin so a future prebuild reproduces it, and directly into `android/app/src/main/res/` so no prebuild had to run — `expo prebuild` would have wiped the release signing block out of `android/app/build.gradle`.

`android:gravity="fill"` stretches on both axes rather than aspect-filling like iOS `scaleAspectFill`. Harmless on a phone (artwork 0.462, a 1080×2400 device 0.450, under 3% distortion) but it WOULD distort on a tablet; the fix there is per-orientation assets, not a different gravity — a layer-list `<bitmap>` has no centre-crop.

Verification: `npm run typecheck` passes; `:app:assembleDebug` succeeds (683 tasks, 19s) and the APK was installed. Checked in the **compiled** `resources.arsc` rather than trusting the source XML — `style/AppTheme` carries `0x01010054` (windowBackground) `= @drawable/launch_screen`, `0x01010451`/`0x01010452` (status/navigation bar colour) `= @android:color/transparent`, `0x010104e0` (windowLightStatusBar) `= true`, and `color/splashscreen_background = #fffed6dc`; the artwork is packaged at `drawable-nodpi-v4` and `drawable-night-nodpi-v8`, and all five `splashscreen_logo.png` densities are now the 88-byte transparent PNG. The plugin's `withAndroidStyles` half was separately exercised against the pre-plugin `styles.xml` shape and OVERWRITES the existing opaque `statusBarColor` rather than appending a duplicate. **Not seen on screen** — the moto g35 is asleep behind its secure keyguard (`mDreamingLockscreen=true`), whose screencaps return black, and launch resources are compiled so Fast Refresh cannot deliver them; the build is installed and will show on the next cold start after unlock.

Don't regress: the launch artwork lives on `AppTheme`'s `windowBackground`, NOT on the system splash — never hand the full canvas back to `windowSplashScreenAnimatedIcon`, it can only ever shrink it into the icon slot. Keep `expo-splash-screen` pointed at the blank 1dp image. `android/` is gitignored and prebuild rewrites it, so any change here must land in `plugins/withLaunchScreenFill.js` too, and the signing block must be re-applied after any `expo prebuild`.

### 2026-09-01 — Snoozed chart cells now show a pause glyph; the dot means "no task"

Reported against Figma node `2-29230`: the pause icon is missing, and a snoozed
occurrence is drawn with the same dot as a day with nothing scheduled.

**The Figma node could not be read** — `get_screenshot`/`get_design_context` still
return "you don't have edit access to this file" for `1ydEE38jtIhIInxrjbawYt`
(same block recorded on 2026-08-25). Implemented from the iOS source and the
report instead; re-check the cell against that node once access is granted.

The status DERIVATION was already correct — `ChartView.status()` maps a `paused`
event to `snoozed` and a non-occurring day to `noTask`. Only the rendering
conflated them, and it does so on iOS too: `ScheduleView.cellGlyph` has
`case .noTask, .snoozed:` drawing one member-coloured 5pt circle for both. So
this is a **deliberate divergence from iOS, at the user's request**, not a port
gap:

- `PauseGlyph` added to `glyphs.tsx` (two rounded bars, 6×8 viewBox) — there is
  no pause asset in the catalog on either platform; `statusSnoozeIcon` is the
  moon+ZZZ art used by `ChoreStatusView`, not a pause mark.
- Snoozed cells draw the pause at `colors.purple` on a `${colors.purple}1A`
  fill. That accent is not invented: `ChoreStatusView`'s Snoozed theme already
  uses purple accent / `1A` card fill / `1F` track, so the chart now agrees with
  the status screen. `noTask` keeps iOS's member-coloured dot; `pending` stays
  empty.
- Legend gained a fifth **Snoozed** item. Five items fit a 375-wide row
  (≈301 of 345 usable at 11pt), and `flexWrap`/`rowGap` were added as a
  safety net rather than a layout the design relies on.
- **PDF/print report**: `CELL_TEXT` marks were `snoozed: '•'` and `noTask: ''`,
  i.e. the same conflation plus a missing no-task mark. Now completed ✓ /
  missed ✕ / skipped – / snoozed pause / noTask • / pending blank, each tinted
  to the on-screen colour, with a symbol key under the title so a printed chart
  is readable without the app. The pause is inline SVG, not a glyph character,
  so the print engine cannot substitute a missing font.

No other screen renders these cells — `noTaskDot` occurs only in `ChartView`,
and the member sheet, member profile streak, Stats faces and Overview all key
off `done`/`skipped`/`missed` events, never `paused`.

Verification: `npm run typecheck` passes. The report HTML was rendered through
headless Chrome using the strings pulled straight out of `ChartView.tsx` (pause
bars and dot both correct, key row laid out), and the six cell states were
rendered at 6× to check the pause's weight against the existing check/cross/bar
glyphs. NOT device-verified — the moto g35 is attached with Metro on 8081 but
sits screen-off behind its PIN keyguard, whose screencaps return black; Fast
Refresh delivers this once unlocked.

Don't regress: the dot is reserved for `noTask` — never draw it for `snoozed`
again, even though iOS's `cellGlyph` does. Keep the screen and the PDF marks in
step; they are two renderers of one `Cell` union and drifting apart is how the
snoozed dot survived this long.

### 2026-09-01 — Chore Status showed the chore's anchor date for every occurrence

Reported from the chart member sheet: tapping the Overdue, Due Tomorrow and
Due on 4 Sept cards for the same recurring chore all opened Chore Status
reading **"Due On / 31 August, 2026"**.

`ChoreStatusView` is a per-OCCURRENCE screen — it is pushed with a `day`, and
Done, Skip, Snooze and Reset all write to `occurrenceDay`. But the Due On theme
was built from `chore.dueDate`, the single anchor string stored on the chore
document, and `liveDueState(chore.dueDate)` themed the card and progress bar
from it too. So tapping "Due Tomorrow" and pressing Done marked **2 September**
done while the card said 31 August — not just cosmetic, actively misleading.

This is faithful to iOS (`ChoreStatusView.swift:95` `detail: current.draft?.dueDate`,
:46 `DueState.live(from: draft.dueDate)`), so it is a **deliberate divergence,
at the user's request**. Two things settle which date is correct: every mutation
on the screen targets `occurrenceDay`, and the Completed/Skipped branches of
`statusTheme` were ALREADY using `dayText(occurrenceDay)` — Due On and Snoozed
were the only outliers.

- `liveDueStateOn(day: Date | null)` added to `models/dueState.ts`; the existing
  `liveDueState(string)` is now a thin wrapper, so the bucketing/label/fraction
  rules are unchanged and shared — only the date they are computed FROM moved.
- Due On and Snoozed details now render `dayText(occurrenceDay)`.
- With no `day` route param the occurrence now falls back to the chore's parsed
  anchor rather than today, so a future entry point cannot make the screen
  describe today for a chore due next week. (Chart is currently the only pusher
  and always passes a day.)

Note the ≤1-day bucket is iOS's and was kept: an occurrence due TOMORROW themes
red with the label "Due tomorrow", exactly as `ChoreDetailView` already shows a
chore due tomorrow. The chart sheet's green "Due Tomorrow" badge uses the
coarser `occurrenceDueState`; those two ramps differing is iOS's design, not
this change.

Verification: `npm run typecheck` passes; the three tapped occurrences from the
report were run through the shipped function under the repo's Hermes binary
against a 1 Sep 2026 clock — 31 Aug → overdue / "Overdue by 1 day", 2 Sep →
"Due tomorrow", 4 Sep → "Due in 3 days", each captioned with its own date. Not
device-verified — the moto g35 is on its PIN keyguard.

Don't regress: `ChoreStatusView` describes ONE occurrence. Anything it renders
must derive from `occurrenceDay`, never from `chore.dueDate` — the anchor is the
same for every occurrence of a recurring chore.

### 2026-09-01 — Due badges: the label sat 9px below the calendar icon (Android font padding, 6th occurrence)

Reported on Zone Detail: the calendar glyph and its "Overdue" / "Today" label
are not centred with each other. Measured on the device rather than eyeballed —
the phone was unlocked this session, so the app was driven to Zone → Kitchen and
the badge's pixels were analysed (pill background sampled as the modal colour,
then ink split into column groups to separate the glyph from the text):

| | icon ink centre | label ink centre | delta |
|---|---|---|---|
| Overdue badge, before | 936.5 | 945.5 | **+9.0 px** (~3.1 design units low) |
| Overdue badge, after | 936.5 | 937.0 | +0.5 px |
| Zone list badge, after | 726.5 | 727.5 | +1.0 px |

The badge pill also shrank 81 → 77 px, landing on iOS's real 26.3-unit height
(12 × 1.193 line box + 2 × 6 padding = 75.8 px at this device's 2.88 px per
design unit).

Cause is the standing rule: `dueText` was `font('medium', 12)` with no
`lineHeight` and no `includeFontPadding: false`. The row is `alignItems:
'center'`, so Android centres the text's PADDED box — which is ~1.8 design units
taller than the real line box and asymmetric — while the 14-unit glyph centres on
its own box, and the two ended up ~3 units apart. Note the OTF's own metrics do
NOT predict this (`hhea` ascent/descent equal `usWinAscent/Descent`, and the
cap block centres to within 0.04 dp either way), so the shift comes from
Android's own top/bottom padding for this CFF font — which is exactly why this
class of bug has to be measured on device, not derived from the font tables.

Fixed at all four badge sites that share the shape — `ChoreCardKit.dueText`
(Home + Zone Detail cards), `ZoneView.badgeText`, `MembersView.badgeText` and
`ScheduleSheets.dueBadgeText` — with `lineHeight: s(14.3)` (12 × 1.193) +
`includeFontPadding: false`. `ChoreDetailView.pillText` already had it, which is
how the correct value was confirmed.

Also checked and NOT a factor: `plusIcon.png`'s ink is exactly centred in its
canvas (alpha bbox inset 0.131 on all four sides), and `ZoneCalendarGlyph`'s ink
fills its viewBox, so neither icon contributes an offset.

Verification: `npm run typecheck` passes; both the fix and the residual were
measured on the moto g35 over Fast Refresh, and a 3× before/after crop of the
Overdue badge shows the label rising onto the icon's centre line. The "Today"
badge measures +4 px only because the ink bbox of "Today" includes the 'y'
descender — isolating a cap glyph gives +0.0 px.

Don't regress: ANY Text sharing a row with an icon needs `lineHeight`
(fontSize × 1.193) + `includeFontPadding: false`. Matching the iOS spacing
tokens is not enough — Android centres the padded box, so the glyphs drift even
when every token is right.
