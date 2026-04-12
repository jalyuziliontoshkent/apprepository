import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { captureException } from './monitoring';
import { api } from './apiClient';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export const registerForPushNotifications = async () => {
  try {
    if (!Device.isDevice) return null;

    const { status: current } = await Notifications.getPermissionsAsync();
    let finalStatus = current;
    if (current !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;

    const projectId = Constants?.expoConfig?.extra?.eas?.projectId;
    const tokenResp = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenResp.data;

    // Non-blocking backend sync.
    api('/notifications/push-token', {
      method: 'POST',
      body: JSON.stringify({ token, platform: Device.osName }),
      retries: 0,
    }).catch(() => {});

    return token;
  } catch (error) {
    captureException(error, { source: 'registerForPushNotifications' });
    return null;
  }
};
