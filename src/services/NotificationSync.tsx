import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { useChores, choreOccurs, type Chore } from './ChoreContext';

export const notificationKey = 'notificationsEnabled';

/**
 * iOS `NotificationManager` keys its requests by prefix so chore reminders and
 * inactivity nudges can be replaced independently. Android has to do the same:
 * the two schedulers run at different times, so a blanket
 * `cancelAllScheduledNotificationsAsync()` from one would silently wipe the
 * other's pending requests.
 */
const chorePrefix = 'chore_';
const inactivityPrefix = 'inactivity_';

const parseTime = (value: string): [number, number] => {
  const match = value.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return [9, 0];
  let hour = Number(match[1]);
  const period = match[3]?.toUpperCase();
  if (period === 'PM' && hour < 12) hour += 12;
  if (period === 'AM' && hour === 12) hour = 0;
  return [hour, Number(match[2])];
};

async function cancelByPrefix(prefix: string) {
  const pending = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  await Promise.all(
    pending
      .filter(request => request.identifier.startsWith(prefix))
      .map(request => Notifications.cancelScheduledNotificationAsync(request.identifier).catch(() => undefined)),
  );
}

export async function syncNotifications(chores: Chore[]) {
  await cancelByPrefix(chorePrefix);
  if ((await AsyncStorage.getItem(notificationKey)) === 'false') return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  const now = new Date();
  for (const chore of chores.filter(item => item.reminderOn)) {
    let scheduled = 0;
    for (let offset = 0; offset < 60 && scheduled < 8; offset += 1) {
      const day = new Date(now);
      day.setDate(now.getDate() + offset);
      if (!choreOccurs(chore, day)) continue;
      const [hour, minute] = parseTime(chore.reminderTime || chore.dueTime);
      day.setHours(hour, minute, 0, 0);
      if (day <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: `${chorePrefix}${chore.id}_${scheduled}`,
        content: { title: chore.name, body: `${chore.zoneName} chore is due`, data: { choreId: chore.id } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: day },
      });
      scheduled += 1;
    }
  }
}

/**
 * iOS `NotificationManager.scheduleInactivityReminders` — re-armed every time the
 * app is backgrounded, so each nudge fires only if the user stays away that many
 * days. Re-opening the app reschedules from zero, which cancels the pending ones.
 */
export async function scheduleInactivityReminders(options: {
  enabled: boolean;
  days: number[];
  title: string;
  body: string;
}) {
  await cancelByPrefix(inactivityPrefix);
  if (!options.enabled) return;
  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) return;

  for (const day of [...new Set(options.days.filter(value => value > 0))]) {
    await Notifications.scheduleNotificationAsync({
      identifier: `${inactivityPrefix}${day}`,
      content: { title: options.title, body: options.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: day * 24 * 60 * 60, repeats: false },
    }).catch(() => undefined);
  }
}

export function NotificationSync() {
  const { chores } = useChores();
  useEffect(() => { void syncNotifications(chores); }, [chores]);
  return null;
}
