// Push Notifications Service
// Requires development build (not Expo Go) for FCM
// Phase 4 - will be activated when dev build is ready

import { Platform } from 'react-native';

let Notifications = null;

async function init() {
  try {
    Notifications = require('expo-notifications');
  } catch {
    console.log('[NOTIFICATIONS] expo-notifications not available (Expo Go)');
    return false;
  }
  return true;
}

export async function registerForPushNotifications() {
  const available = await init();
  if (!available) return null;

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[NOTIFICATIONS] Permission not granted');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync();
    console.log('[NOTIFICATIONS] Push token:', tokenData.data);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('chat', {
        name: 'Chat Messages',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
      });
    }

    return tokenData.data;
  } catch (e) {
    console.log('[NOTIFICATIONS] Error registering:', e.message);
    return null;
  }
}

export function addNotificationListener(handler) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationReceivedListener(handler);
}

export function addNotificationResponseListener(handler) {
  if (!Notifications) return { remove: () => {} };
  return Notifications.addNotificationResponseReceivedListener(handler);
}
