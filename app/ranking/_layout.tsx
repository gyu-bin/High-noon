import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function RankingLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1a1208' },
        headerTintColor: colors.gold,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: '#1a1208' },
      }}
    />
  );
}
