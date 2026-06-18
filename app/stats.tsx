import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { META_PANEL_BG, META_PANEL_BORDER, metaTextShadow } from '@/constants/westernBackground';
import { NPCS } from '@/constants/npcs';
import { useProgressStore } from '@/store/progressStore';

export default function StatsScreen() {
  useScreenBgm('menu');
  const router = useRouter();
  const onBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/menu');
    }
  }, [router]);

  const npcById = useProgressStore((s) => s.npcById);
  const aggregate = useProgressStore((s) => s.reactionAggregate);
  const clearedCount = NPCS.filter((n) => npcById[n.id]?.cleared).length;
  const avg =
    aggregate.count > 0 ? aggregate.sumMs / aggregate.count : null;

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => <MenuBackButton onPress={onBack} />,
        }}
      />
      <MetaScreenShell>
        <View style={styles.root}>
          <Text style={[styles.head, { fontFamily: FONT_RYE }]}>기록</Text>

          <View style={styles.card}>
            <Text style={styles.label}>전체 평균 반응</Text>
            <Text style={styles.value}>{avg != null ? `${avg.toFixed(1)} ms` : '—'}</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>NPC 클리어</Text>
            <Text style={styles.value}>
              {clearedCount} / {NPCS.length}
            </Text>
          </View>

          <Text style={styles.footnote}>
            vs NPC·2인 대결에서 반응이 기록될 때마다 평균이 갱신됩니다.
          </Text>
        </View>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    padding: 24,
    gap: 16,
  },
  head: {
    fontSize: 28,
    color: colors.gold,
    marginBottom: 8,
    letterSpacing: 2,
    ...metaTextShadow,
  },
  card: {
    padding: 18,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
  },
  label: {
    color: colors.sand,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
    ...metaTextShadow,
  },
  value: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: '800',
    color: colors.cream,
    ...metaTextShadow,
  },
  footnote: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 18,
    color: colors.cream,
    opacity: 0.88,
    ...metaTextShadow,
  },
});
