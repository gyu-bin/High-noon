import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function RankingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.darkBrown },
        animation: 'fade',
      }}
    />
  );
}
