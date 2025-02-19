/**
 * Root Layout for Home Screens
 * 
 * This layout defines consistent navigation behavior across all home screens.
 * Key features:
 * 1. Default Loading State
 *    - Shows "Loading..." in header during data fetches
 *    - Prevents route path flashing in title
 * 
 * 2. Consistent Back Button
 *    - Custom back button with chevron + "Back" text
 *    - Matches design across all screens
 * 
 * 3. Navigation Animation
 *    - Disabled on iOS for smoother transitions
 *    - Helps prevent title flashing during navigation
 */

import { Stack, useRouter } from 'expo-router';
import { Platform, TouchableOpacity, Text } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';

export default function Layout() {
  const router = useRouter();
  return (
    <Stack
      screenOptions={{
        animation: Platform.OS === 'ios' ? 'none' : undefined,
        headerStyle: {
          backgroundColor: '#fff',
        },
        headerTintColor: '#007AFF',
        title: 'Loading...',
        headerLeft: ({ canGoBack }) => canGoBack ? (
          <TouchableOpacity 
            onPress={() => router.back()}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingVertical: 10,
              paddingHorizontal: 10,
            }}
          >
            <FontAwesome5 name="chevron-left" size={16} color="#007AFF" />
            <Text style={{
              color: '#007AFF',
              fontSize: 17,
              marginLeft: 5,
            }}>Back</Text>
          </TouchableOpacity>
        ) : undefined
      }}
    />
  );
}
