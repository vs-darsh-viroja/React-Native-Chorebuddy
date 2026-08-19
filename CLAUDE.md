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
