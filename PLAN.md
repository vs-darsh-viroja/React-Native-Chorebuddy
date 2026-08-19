# ChoreBuddy Android Port Plan

## Objective

Clone `/Users/developer/iOS/iOS-ChoreBuddy-main` into React Native Android with exact content, responsive design, assets, fonts, animations, Google/Firebase login, Firestore household data, purchases, notifications, and native A→B→C navigation. Apple Sign-In is intentionally omitted.

## Ordered implementation

1. Foundation: Expo scaffold, fonts, asset generator, tokens, scaling, Firebase Android config.
2. Gates: onboarding, paywall, gift offer, Google sign-in, household setup, notifications.
3. Shell: native root stack, custom Home/Zone/Chart/Stats tabs, central Add Chore action.
4. Home: empty/chore-free/today states, menus, completion, mark-all, settings/crown routes.
5. Zones: zone list, detail due/completed, create/edit zone, limits.
6. Add Chore: all home-entry and zone-entry wizard steps plus calendar/time/reminder/member/photo/options sheets and keyboard behavior.
7. Chore detail/status: view/edit, done/undo/skip/snooze, events, photos.
8. Chart: weekly member cards, filters, member sheet, download/print equivalents.
9. Stats: empty/populated, overview, filters/range picker.
10. Members/settings: create/edit profiles, household sharing/admin, account/privacy/purchase settings.
11. Data: AuthManager, HouseholdManager, ChoreStore, Firestore listeners/mutations, Remote Config, Analytics, notifications, quick actions, Play Billing.
12. Hardening: small phone, normal/tall phone, tablet; exact motion and screenshots; release setup.

## Screen inventory

- Root: Loading, Force Update, Swipe onboarding (7), Paywall, Gift Paywall, Sign In.
- Household: setup choice, create household, join household, member selection, notification permission.
- Tabs: Home, Zone, Chart, Stats.
- Pushed: Settings, Add Chore, Chore Detail, Chore Status, Zone Detail, Create/Edit Zone, Stats Overview, Members, Profile Detail, Edit Profile.
- Sheets/overlays: schedule/stats filters, chart member/report, snooze/date/status, calendar/time/month-day/reminder/options/photos/member assignment/change zone/create profile, Pro limit/admin alerts, gift banner.

## Verification gates

- `npm run typecheck`
- `npx expo install --check`
- Android `:app:assembleDebug`
- Runtime on 360dp emulator, medium phone, tall phone, and tablet
- Screenshot comparison against iOS/Figma for every finished screen
