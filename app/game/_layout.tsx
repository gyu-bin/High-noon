import { router, Stack, type ErrorBoundaryProps } from 'expo-router';

import { AppErrorBoundary } from '@/components/ui/AppErrorBoundary';
import { colors } from '@/constants/theme';
import { useGameStore } from '@/store/gameStore';

/**
 * 결투 화면 전용 폴백. 매치 도중 렌더 에러가 나면 재시도만으로는 회복이 어렵고
 * 진행 상태(하트·라운드)가 persist되어 있어 그대로 두면 다음 진입까지 오염된다.
 * 따라서 메인 메뉴 탈출구에서 매치 상태를 초기화한다.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <AppErrorBoundary
      error={error}
      retry={retry}
      onMainMenu={() => {
        useGameStore.getState().resetToIdle();
        router.replace('/menu');
      }}
    />
  );
}

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
