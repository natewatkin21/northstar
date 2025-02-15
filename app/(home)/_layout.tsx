import { Tabs } from 'expo-router/tabs';
import { FontAwesome } from '@expo/vector-icons';

export default function Layout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="exercises/index"
        options={{
          title: 'Exercises',
          tabBarIcon: ({ color, size }) => (
            <FontAwesome name="dumbbell" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
