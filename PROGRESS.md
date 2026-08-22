# ChoreBuddy Android Port Progress

## 2026-08-19

Phase 0 and the foundation slice of Phase 1/2 are complete.

Completed:

- Fresh Expo/RN project and native Android prebuild.
- Exact iOS fonts, colors, responsive scaling, asset conversion, Firebase config.
- First runnable gate chain: onboarding → paywall → gift → Google sign-in → native tab shell.
- Arbora-style native stack and custom ChoreBuddy tab bar.
- TypeScript validation and a successful Android debug APK build (`:app:assembleDebug`).

Next:

- Expand Add Chore with native calendar/time/month-day/custom-interval sheets and photo documents.
- Add custom Stats calendar range and exact best/average streak history algorithms.
- Port Chart and Stats after recurrence/events are fully covered.

Newly completed:

- Real household create/join/member-claim gates and listeners.
- Notification permission gate.
- Chore/zone/event Firestore listeners and core completion mutations.
- Data-driven Home empty/chore-free/today states.
- Real Zone catalog with 20 predefined zones, created zones, live badges, and search.
- Native Zone Detail and Create/Edit Zone screens with Firestore-backed rename propagation.
- Functional four-stage Add Chore wizard with presets/custom chores, recurrence, member assignment, optional details, validation, and live Firestore save.
- Live Chore Detail/edit screen with completion, skip event, delete, rename, zone/member changes, reminders, notes, and subtasks.
- Chore Status with occurrence-specific done/skip/reset, snooze presets, Firestore overrides, and override-aware recurrence.
- Live weekly Chart grouped by member/zone with filters, event states, week navigation, and historical Chore Status entry.
- Android identity migrated to `chores.tracker.chorebuddy` with the new supplied Firebase app configuration.
- Live Stats totals/rate/ranges and native per-chore Overview event-history drill-down.
- Expanded Stats streak visuals, five periods, member/zone filters, and durable 90-day missed-event backfill.
- Functional Settings plus Firestore-backed Members create/edit/detail/admin/leave flows.
- Camera/gallery profile photos and persisted chore-reminder notification scheduling with a global Settings toggle.
- Add Chore date/time/custom-repeat sheets, custom recurrence calculations, and ordered Firestore chore-photo persistence.

Open verification:

- Device-run Google Sign-In requires the Android SHA fingerprints to be registered in Firebase if they are not already.
- Full visual parity requires emulator screenshots on small phone and tablet.
- Google Play Billing is now wired for weekly, yearly (`yearly-offer`), and yearly-gift subscriptions, including localized prices, acknowledgement, entitlement restore, paywall purchase actions, and Home/Settings gift banners.
- Final billing verification requires installing an internal/closed-test build from Google Play with a licensed tester account.
