import * as Linking from 'expo-linking';
import { Platform } from 'react-native';

export const nativeOAuthRedirectUrl = 'applyloop:///';

export function getOAuthRedirectUrl() {
  if (Platform.OS === 'web') {
    return Linking.createURL('/');
  }

  return Linking.createURL('/', { scheme: 'applyloop' });
}
