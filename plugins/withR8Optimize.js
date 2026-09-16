/**
 * withR8Optimize — point the release build at AGP's OPTIMIZING default ProGuard
 * file (2026-09-16).
 *
 * The React Native / Expo template writes
 *
 *     proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
 *
 * and AGP's `proguard-android.txt` contains `-dontoptimize`, with a comment
 * saying so ("Optimization is turned off by default... you cannot just include
 * optimization flags in your own project configuration file; instead you will
 * need to point to the proguard-android-optimize.txt file"). Confirmed in the
 * R8 dump for the first minified build:
 * `android/app/build/outputs/mapping/release/configuration.txt:159` was
 * `-dontoptimize`.
 *
 * Consequence: enabling `minifyEnabled` alone gets SHRINKING and OBFUSCATION but
 * not OPTIMIZATION, which is a metric Play Console reports separately
 * ("Optimization percentage" / "App optimization: Low"). `-dontoptimize` cannot
 * be cancelled by a later flag, so the only fix is to stop including that file.
 *
 * `android/` is gitignored and prebuild rewrites `app/build.gradle`, and
 * `expo-build-properties` has no knob for the default ProGuard file — hence a
 * plugin. As with `withLaunchScreenFill`, the same edit is also applied directly
 * in `android/` today, because running `expo prebuild` would wipe the release
 * signing block out of `app/build.gradle`.
 */

const { withAppBuildGradle } = require('expo/config-plugins');

const FROM = 'getDefaultProguardFile("proguard-android.txt")';
const TO = 'getDefaultProguardFile("proguard-android-optimize.txt")';

module.exports = function withR8Optimize(config) {
  return withAppBuildGradle(config, (cfg) => {
    const contents = cfg.modResults.contents;

    if (contents.includes(TO)) return cfg;
    if (!contents.includes(FROM)) {
      throw new Error(
        '[withR8Optimize] could not find the default proguardFiles line in ' +
          'app/build.gradle — the template changed; re-check which default ' +
          'ProGuard file the release build uses.'
      );
    }

    cfg.modResults.contents = contents.replace(FROM, TO);
    return cfg;
  });
};
