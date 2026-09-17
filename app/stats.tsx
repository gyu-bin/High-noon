import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { WesternHeader, WesternPanel } from '@/components/ui/western/WesternPrimitives';
import { NPCS } from '@/constants/npcs';
import { uiV3Colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { useProgressStore } from '@/store/progressStore';
import { useMatchHistoryStore } from '@/store/matchHistoryStore';
import { getNpcDisplayName } from '@/utils/npcLabels';

export default function StatsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  const npcById = useProgressStore((s) => s.npcById);
  const aggregate = useProgressStore((s) => s.reactionAggregate);
  const history = useMatchHistoryStore();
  const unlocked = useProgressStore((s) => s.unlockedCharacterIds);
  const bests = Object.values(npcById).flatMap((row) => row.bestReactionMs == null ? [] : [row.bestReactionMs]);
  const best = bests.length ? Math.min(...bests) : null;
  const clearedCount = NPCS.filter((npc) => npcById[npc.id]?.cleared).length;
  const average = aggregate.count ? aggregate.sumMs / aggregate.count : null;
  useScreenBgm('menu');
  const back = useCallback(() => router.replace('/menu'), [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MetaScreenShell>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 28 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.topbar}>
            <MenuBackButton onPress={back} variant="overlay" />
            <View style={styles.heading}><WesternHeader title={t('meta.stats.title')} subtitle={t('meta.stats.subtitle')} /></View>
            <View style={styles.topbarSpacer} />
          </View>
          <View style={[styles.ledger, landscape && styles.ledgerLandscape]}>
            <WesternPanel variant="leather" style={styles.stat}><Text style={styles.label}>{t('stats.avgReaction')}</Text><Text style={styles.value}>{average == null ? '—' : `${average.toFixed(1)} ms`}</Text></WesternPanel>
            <WesternPanel variant="leather" style={styles.stat}><Text style={styles.label}>{t('stats.npcCleared')}</Text><Text style={styles.value}>{clearedCount} / {NPCS.length}</Text></WesternPanel>
          </View>
          <WesternPanel variant="plain"><Text style={styles.note}>{t('stats.footnote')}</Text></WesternPanel>
          <WesternPanel>
            <Text style={styles.label}>{t('stats.myStats')}</Text>
            <Text style={styles.note}>{t('stats.npcWinRate')}   {history.npcTotal ? `${Math.round(history.npcWins / history.npcTotal * 100)}%` : '—'}</Text>
            <Text style={styles.note}>{t('stats.totalDuels')}   {history.npcTotal + history.localTotal}</Text>
            <Text style={styles.note}>{t('stats.bestReaction')}   {best == null ? '—' : `${(best / 1000).toFixed(3)}s`}</Text>
            <Text style={styles.note}>{t('stats.charactersCollected')}   {unlocked.length} / 4</Text>
            <Text style={styles.label}>{t('stats.recordingNotice')}</Text>
          </WesternPanel>
          <WesternPanel><Text style={styles.label}>{t('stats.npcRecords')}</Text>
            {NPCS.map((npc) => <Text key={npc.id} style={styles.note}>{getNpcDisplayName(t, npc.id)}   {npcById[npc.id]?.cleared ? '✓' : '—'}   {npcById[npc.id]?.bestReactionMs == null ? '' : `${npcById[npc.id]?.bestReactionMs?.toFixed(0)} ms`}</Text>)}
          </WesternPanel>
          <WesternPanel><Text style={styles.label}>{t('stats.recentDuels')}</Text>
            {history.matches.length === 0 ? <Text style={styles.note}>{t('stats.noMatches')}</Text> : history.matches.slice(0, 20).map((match) => <Text key={match.id} style={styles.note}>{match.mode === 'npc' ? getNpcDisplayName(t, match.opponentId!) : t('menu.localDuel')} · {match.winner === 'player' ? t('result.victory') : match.winner === 'npc' ? t('result.defeat') : t('stats.playerVictory', { player: match.winner.toUpperCase() })}</Text>)}
          </WesternPanel>
          <WesternPanel><Text style={styles.label}>{t('stats.achievements')}</Text>
            <Text style={styles.note}>{clearedCount > 0 ? '★' : '☆'} {t('stats.achievementFirst')}</Text>
            <Text style={styles.note}>{clearedCount >= 10 ? '★' : '☆'} {t('stats.achievementHunter')}</Text>
            <Text style={styles.note}>{clearedCount === 22 ? '★' : '☆'} {t('stats.achievementLegend')}</Text>
            <Text style={styles.note}>{best != null && best <= 200 ? '★' : '☆'} {t('stats.achievementLightning')}</Text>
          </WesternPanel>
        </ScrollView>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, gap: 16 },
  topbar: { minHeight: 76, flexDirection: 'row', alignItems: 'center' },
  heading: { flex: 1 },
  topbarSpacer: { width: 92 },
  ledger: { gap: 12 },
  ledgerLandscape: { flexDirection: 'row' },
  stat: { flex: 1, minHeight: 118, justifyContent: 'center' },
  label: { color: uiV3Colors.dustGray, fontSize: 12, fontWeight: '900', letterSpacing: 1.2 },
  value: { marginTop: 10, color: uiV3Colors.cream, fontSize: 29, fontWeight: '900' },
  note: { color: uiV3Colors.cream, fontSize: 13, lineHeight: 19, opacity: 0.9 },
});
