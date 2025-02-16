import { Tabs } from 'expo-router/tabs';
import { FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TouchableOpacity, Text } from 'react-native';

export default function Layout() {
  const router = useRouter();

  return (
    <Tabs screenOptions={{
      headerShown: true,
      tabBarActiveTintColor: '#0891b2',
      headerTintColor: '#0891b2',
      headerStyle: {
        backgroundColor: '#fff',
      },
      tabBarStyle: {
        backgroundColor: '#fff',
        width: '100%',
        paddingHorizontal: 0,
      },
      tabBarItemStyle: {
        width: '33.33%',
        padding: 0,
        margin: 0,
      },
      tabBarLabelStyle: {
        fontSize: 12,
      },
      // Hide all screens from tab bar by default
      tabBarButton: () => null,
    }}>
      {/* Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="home" size={size} color={color} />
          ),
          // Show this screen in tab bar
          tabBarButton: undefined,
        }}
      />

      {/* Plans Tab */}
      <Tabs.Screen
        name="plans/index"
        options={{
          title: 'Plans',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="calendar-alt" size={size} color={color} />
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/plans/new')}
              style={{ marginRight: 16 }}
            >
              <Text style={{ color: '#0891b2', fontSize: 16 }}>Create New</Text>
            </TouchableOpacity>
          ),
          // Show this screen in tab bar
          tabBarButton: undefined,
        }}
      />

      {/* Exercises Tab */}
      <Tabs.Screen
        name="exercises/index"
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome5 name="dumbbell" size={size} color={color} />
          ),
          headerRight: () => (
            <TouchableOpacity 
              onPress={() => router.push('/exercises/new')}
              style={{ marginRight: 16 }}
            >
              <Text style={{ color: '#0891b2', fontSize: 16 }}>Add New</Text>
            </TouchableOpacity>
          ),
          // Show this screen in tab bar
          tabBarButton: undefined,
        }}
      />

      {/* Other screens (hidden from tab bar) */}
      <Tabs.Screen name="plans/new" />
      <Tabs.Screen 
        name="plans/[id]" 
        options={({ route }) => ({
          headerShown: true,
          tabBarButton: () => null,
          tabBarStyle: {
            display: 'none',
          },
          headerBackVisible: false,
          title: route.params?.title || 'Plan Details',
          headerTitleStyle: {
            fontSize: 18,
            fontWeight: '600',
          },
          headerTitleAlign: 'center',
          headerLeft: () => (
            <TouchableOpacity 
              onPress={() => router.replace('/plans')}
              style={{ marginLeft: 16 }}
            >
              <FontAwesome5 name="chevron-left" size={20} color="#0891b2" />
            </TouchableOpacity>
          ),
        })}
      />
      <Tabs.Screen name="exercises/new" />
      <Tabs.Screen name="plans/[id]/add-exercise" />
    </Tabs>
  );
}
