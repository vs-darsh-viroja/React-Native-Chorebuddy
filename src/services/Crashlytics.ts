import crashlytics from '@react-native-firebase/crashlytics';

/** Port of iOS `CrashlyticsManager`. */
export const Crashlytics = {
  setUserId(id: string | null) {
    void crashlytics().setUserId(id ?? '').catch(() => undefined);
  },

  setValue(value: string | number | boolean, key: string) {
    void crashlytics().setAttribute(key, String(value)).catch(() => undefined);
  },

  log(message: string) {
    crashlytics().log(message);
  },

  record(error: unknown) {
    crashlytics().recordError(error instanceof Error ? error : new Error(String(error)));
  },
};
