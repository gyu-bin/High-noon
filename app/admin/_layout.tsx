import { Stack } from 'expo-router';

import { colors } from '@/constants/theme';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.darkBrown },
        headerTintColor: colors.cream,
        headerTitleStyle: { fontWeight: '700', color: colors.cream },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.darkBrown },
      }}
    />
  );
}
