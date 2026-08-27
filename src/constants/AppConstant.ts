import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Port of iOS `AppConstant` — the single source of truth for every external URL
 * and support address the app links out to. Change a URL here and Settings, the
 * force-update screen, and the paywall footers all pick it up; never inline a
 * URL at the call site.
 *
 * iOS addresses the store by its numeric App Store id; Android addresses it by
 * the application id, so `appID` becomes `packageName` and the App Store
 * `itms-apps://` scheme becomes Play's `market://`.
 */
const androidPlatform = Platform.constants as { Model?: string; Release?: string };

export const AppConstant = {
  appName: Constants.expoConfig?.name ?? 'ChoreBuddy',
  appVersion: Constants.expoConfig?.version ?? '1.0.0',

  packageName: 'chores.tracker.chorebuddy',

  /** e.g. `ChoreBuddy V 1.0.0` — shown in Settings → About App and in support subjects. */
  get appVersionLabel() { return `${this.appName} V ${this.appVersion}`; },

  /** Play listing over https — used by the Settings → Share row. */
  get shareAppIDURL() { return `https://play.google.com/store/apps/details?id=${this.packageName}`; },

  /**
   * `market://` opens the Play Store app directly on the listing, where the
   * rating widget lives. Play has no equivalent of the App Store's
   * `?action=write-review` deep link, so in-app review is handled separately by
   * `RatingManager`; this is the manual "Rate Us" path.
   */
  get ratingPopupURL() { return `market://details?id=${this.packageName}`; },

  /** Opens the listing in the Play Store app — the force-update screen's button. */
  get appStoreURL() { return `market://details?id=${this.packageName}`; },

  supportEmail: 'uttamchandsancheti.apps@gmail.com',

  aboutAppURL: 'https://sites.google.com/view/chorebuddy/',
  contactUSURL: 'https://sites.google.com/view/chorebuddy/support',
  supportURL: 'https://sites.google.com/view/chorebuddy/support',
  privacyURL: 'https://sites.google.com/view/chorebuddy/privacy-policy',
  termsAndConditionURL: 'https://sites.google.com/view/chorebuddy/terms-conditions',

  /**
   * iOS `supportMailto(subjectPrefix:userId:)` — subject is
   * `<prefix> - <appVersionLabel> - <userId>`, body carries the user id, app
   * version, and device/OS details so support can reproduce a report.
   */
  supportMailto(subjectPrefix: string, userId: string) {
    const subject = `${subjectPrefix} - ${this.appVersionLabel} - ${userId}`;
    const body = [
      '',
      '',
      '---',
      `User ID: ${userId}`,
      `App Version: ${this.appVersionLabel}`,
      `Device: ${androidPlatform.Model ?? 'Android'}`,
      `Android: ${androidPlatform.Release ?? String(Platform.Version)}`,
    ].join('\n');
    return `mailto:${this.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  },
};
