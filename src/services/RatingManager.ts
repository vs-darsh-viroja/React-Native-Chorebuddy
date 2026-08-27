import AsyncStorage from '@react-native-async-storage/async-storage';
import * as StoreReview from 'expo-store-review';

/**
 * Port of iOS `RatingManager`. iOS asks StoreKit for a review after a chore is
 * completed or a day is marked all-done, at most twice for the lifetime of the
 * install; Android uses the equivalent Play In-App Review flow.
 *
 * Both stores decide for themselves whether to actually show the sheet, so the
 * local counter only bounds how often the app *asks*.
 */
const countKey = 'ratingPromptCount';
const maxPrompts = 2;

export const RatingManager = {
  async requestReviewIfNeeded() {
    const count = Number((await AsyncStorage.getItem(countKey)) ?? 0);
    if (count >= maxPrompts) return;
    if (!(await StoreReview.hasAction())) return;
    await AsyncStorage.setItem(countKey, String(count + 1));
    await StoreReview.requestReview().catch(() => undefined);
  },
};
