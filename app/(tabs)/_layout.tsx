import { Tabs } from 'expo-router';
import { CheckSquare, Home, Settings, Users } from 'lucide-react-native';

import { useTheme } from '@/src/theme/useTheme';

export default function TabLayout() {
  const { colors } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.subtle,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          minHeight: 64,
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontWeight: '800',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Home tab',
          tabBarIcon: ({ color }) => <Home size={21} color={color} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: 'Friends',
          tabBarAccessibilityLabel: 'Friends tab',
          tabBarIcon: ({ color }) => <Users size={21} color={color} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarAccessibilityLabel: 'Tasks tab',
          tabBarIcon: ({ color }) => <CheckSquare size={21} color={color} strokeWidth={2.4} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarAccessibilityLabel: 'Settings tab',
          tabBarIcon: ({ color }) => <Settings size={21} color={color} strokeWidth={2.4} />,
        }}
      />
    </Tabs>
  );
}
