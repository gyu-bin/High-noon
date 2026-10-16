import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { CLARITY_NPCS, CLARITY_PLAYERS } from '@/constants/clarityCharacterAssets';
import { duelVictoryArt } from '@/constants/duelVictoryArt';
import { RESULT_POSE_BOUNDS } from '@/constants/resultPoseBounds';
import { getNpcDisplayName } from '@/utils/npcLabels';

/** Fit the visible silhouette, not its transparent canvas, to a grounded slot. */
export function resultPoseFrame(key: string, width: number, height: number, won: boolean) {
  const { canvas: [cw, ch], bounds: [left, top, right, bottom] } = RESULT_POSE_BOUNDS[key]!;
  const scale = Math.min(width * .94 / (right - left), height * (won ? .96 : .64) / (bottom - top));
  return {
    width: cw * scale, height: ch * scale,
    left: (width - (right - left) * scale) / 2 - left * scale,
    top: height - bottom * scale,
  };
}

export function DuelResultFaceoff({ playerId, npcId, playerWon, width, height }: {
  playerId: number; npcId: number; playerWon: boolean; width: number; height: number;
}) {
  const { t } = useTranslation();
  const safePlayerId = CLARITY_PLAYERS[playerId] ? playerId : 1;
  const safeNpcId = CLARITY_NPCS[npcId] ? npcId : 1;
  const columnWidth = (width - 12) / 2;
  const actors = [
    { kind: 'player' as const, prefix: 'p', id: safePlayerId, won: playerWon, name: t('result.me') },
    { kind: 'npc' as const, prefix: 'n', id: safeNpcId, won: !playerWon, name: getNpcDisplayName(t, safeNpcId) },
  ];
  return <View style={[styles.row, { width }]}>
    {actors.map(actor => {
      const pose = actor.won ? 'victory' : 'kneel';
      const source = actor.won ? duelVictoryArt(actor)
        : (actor.kind === 'player' ? CLARITY_PLAYERS : CLARITY_NPCS)[actor.id]!.down;
      return <View key={actor.kind} style={{ width: columnWidth }}>
        <View pointerEvents="none" style={{ height }}>
          <View style={[styles.shadow, { left: columnWidth * .12, width: columnWidth * .76 }]} />
          <Image source={source} contentFit="fill" transition={0}
            style={[styles.art, resultPoseFrame(`${actor.prefix}:${actor.id}:${pose}`, columnWidth, height, actor.won)]} />
        </View>
        <View style={[styles.caption, actor.won && styles.winnerCaption]}>
          <Text numberOfLines={1} style={[styles.name, actor.won && styles.winnerText]}>{actor.name}</Text>
          <Text style={[styles.status, actor.won && styles.winnerText]}>{actor.won ? `★ ${t('result.winner')}` : t('result.defeat')}</Text>
        </View>
      </View>;
    })}
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, alignItems: 'flex-end' },
  art: { position: 'absolute' },
  shadow: { position: 'absolute', bottom: -2, height: 9, backgroundColor: 'rgba(0,0,0,.32)', borderRadius: 999 },
  caption: { alignItems: 'center', paddingVertical: 7, marginTop: 10, gap: 3, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(212,165,116,.25)', backgroundColor: 'rgba(20,12,7,.75)' },
  winnerCaption: { borderColor: '#A87936' },
  name: { fontSize: 11, color: '#D8C4AA', fontWeight: '700', paddingHorizontal: 3 },
  status: { fontSize: 10, color: '#C59B91', fontWeight: '700' },
  winnerText: { color: '#F7D891' },
});
