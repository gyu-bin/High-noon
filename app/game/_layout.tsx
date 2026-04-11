import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function GameLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.darkBrown },
      }}
    >
      <Stack.Screen name="npc" />
      <Stack.Screen
        name="local"
        options={{
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
    </Stack>
  );
}
