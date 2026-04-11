import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function ResultLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.darkBrown },
      }}
    >
      <Stack.Screen name="npc" />
    </Stack>
  );
}
