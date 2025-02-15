import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { TokenCache } from '@clerk/clerk-expo/dist/cache';

const createTokenCache = (): TokenCache => {
  return {
    getToken: async (key: string) => {
      try {
        return SecureStore.getItemAsync(key);
      } catch (err) {
        console.error('Error getting token from secure store:', err);
        return null;
      }
    },
    saveToken: (key: string, token: string) => {
      try {
        return SecureStore.setItemAsync(key, token);
      } catch (err) {
        console.error('Error saving token to secure store:', err);
      }
    },
  };
};

// SecureStore is not supported on web
export const tokenCache = Platform.OS !== 'web' ? createTokenCache() : undefined;
