import { Redirect, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';

import { NpcWantedCard } from '@/components/npc/NpcWantedCard';
import { getNpcById } from '@/constants/npcs';
import { uiV3Colors } from '@/constants/theme';
import { getNpcDisplayName } from '@/utils/npcLabels';
import { CAPTURE_ROUTES_ENABLED } from '@/constants/captureRoutes';

/** DEV-only: the real NPC Select card at its production size. ?npc=22&locked=1 */
export default function NpcCardCapture() {
  const params = useLocalSearchParams<{ npc?: string; locked?: string }>();
  const { width, height } = useWindowDimensions();
  const { t } = useTranslation();
  if (!CAPTURE_ROUTES_ENABLED) return <Redirect href="/" />;
  const npc = getNpcById(Number(params.npc) || 22);
  if (!npc) return <Redirect href="/" />;
  const locked = params.locked === '1';
  // Same sizing as app/npc-select.tsx (portrait).
  const posterHeight = Math.max(448, Math.min(466, height * 0.484));
  return (
    <View style={styles.root}>
      <NpcWantedCard
        npc={npc} locked={locked}
        name={getNpcDisplayName(t, npc.id)} tier={npc.tier.toUpperCase()} typeLabel="QA"
        duelLabel="DUEL" lockedLabel="LOCKED" bossLabel="BOSS"
        posterHeight={posterHeight} onDuel={() => {}}
        style={{ width: Math.min(width * 0.79, 360) }}
      />
    </View>
  );
}

const styles = StyleSheet.create({ root: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: uiV3Colors.background } });
