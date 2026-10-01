import { Redirect, Stack } from 'expo-router';

import { CAPTURE_ROUTES_ENABLED } from '@/constants/captureRoutes';

export default function CaptureLayout() {
  // Single choke point for every capture route; each screen also checks the same flag.
  if (!CAPTURE_ROUTES_ENABLED) return <Redirect href="/" />;
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    />
  );
}
