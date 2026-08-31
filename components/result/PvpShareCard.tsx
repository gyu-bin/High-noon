import { StyleSheet, Text, View } from 'react-native';

import { FONT_RYE } from '@/constants/fonts';
import {
  META_PANEL_BG,
  META_PANEL_BORDER,
  metaTextShadow,
} from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { formatReactionMs } from '@/utils/formatReactionMs';
import type { PvpRoundRecord } from '@/types/pvp';

type Props = {
  playerName: string;
  opponentName: string;
  rounds: PvpRoundRecord[];
  playerWins: number;
  opponentWins: number;
  avgMs: number | null;
  won: boolean;
  draw: boolean;
  title: string;
  avgLabel: string;
  dailyBadge?: string | null;
  cosmeticLabel?: string | null;
};

/** 공유·결과 화면용 — ms를 크게 노출하는 세로 카드 */
export function PvpShareCard({
  playerName,
  opponentName,
  rounds,
  playerWins,
  opponentWins,
  avgMs,
  won,
  draw,
  title,
  avgLabel,
  dailyBadge,
  cosmeticLabel,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={[styles.brand, { fontFamily: FONT_RYE }]}>HIGH NOON</Text>
      <Text
        style={[
          styles.title,
          {
            fontFamily: FONT_RYE,
            color: won ? colors.gold : draw ? colors.sand : '#E8A0A0',
          },
        ]}
      >
        {title}
      </Text>

      <Text style={styles.avgHuge}>
        {avgMs != null ? formatReactionMs(avgMs) : '—'}
        <Text style={styles.avgUnit}> ms</Text>
      </Text>
      <Text style={styles.avgCaption}>{avgLabel}</Text>

      <Text style={styles.score}>
        {playerWins} — {opponentWins}
      </Text>

      <View style={styles.names}>
        <Text style={styles.name} numberOfLines={1}>
          {playerName}
        </Text>
        <Text style={[styles.vs, { fontFamily: FONT_RYE }]}>VS</Text>
        <Text style={styles.name} numberOfLines={1}>
          {opponentName}
        </Text>
      </View>

      {cosmeticLabel ? (
        <Text style={styles.cosmetic}>{cosmeticLabel}</Text>
      ) : null}

      <View style={styles.rounds}>
        {rounds.map((r, i) => (
          <View key={i} style={styles.roundRow}>
            <Text style={styles.roundIdx}>{i + 1}</Text>
            <Text
              style={[
                styles.roundMs,
                r.winner === 'player' && styles.msWin,
                r.winner === 'opponent' && styles.msLose,
              ]}
            >
              {r.playerMs != null ? formatReactionMs(r.playerMs) : '—'}
            </Text>
            <Text style={styles.roundSep}>vs</Text>
            <Text
              style={[
                styles.roundMs,
                r.winner === 'opponent' && styles.msWin,
                r.winner === 'player' && styles.msLose,
              ]}
            >
              {r.opponentMs != null ? formatReactionMs(r.opponentMs) : '—'}
            </Text>
            <Text
              style={[
                styles.mark,
                r.winner === 'player' && styles.markWin,
                r.winner === 'opponent' && styles.markLose,
              ]}
            >
              {r.winner === 'player' ? '✓' : r.winner === 'opponent' ? '✗' : '='}
            </Text>
          </View>
        ))}
      </View>

      {dailyBadge ? <Text style={styles.badge}>🏅 {dailyBadge}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: 20,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    alignItems: 'center',
    gap: 6,
  },
  brand: {
    color: colors.sand,
    fontSize: 13,
    letterSpacing: 3,
    ...metaTextShadow,
  },
  title: {
    fontSize: 28,
    letterSpacing: 2,
    ...metaTextShadow,
  },
  avgHuge: {
    marginTop: 8,
    color: colors.cream,
    fontSize: 52,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    ...metaTextShadow,
  },
  avgUnit: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.sand,
  },
  avgCaption: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 4,
  },
  score: {
    color: colors.gold,
    fontSize: 22,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  names: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    width: '100%',
  },
  name: {
    flex: 1,
    color: colors.cream,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  vs: { color: colors.gold, fontSize: 12, letterSpacing: 1 },
  cosmetic: {
    color: colors.sand,
    fontSize: 11,
    fontStyle: 'italic',
  },
  rounds: {
    marginTop: 10,
    width: '100%',
    gap: 6,
  },
  roundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  roundIdx: {
    width: 16,
    color: colors.sand,
    fontWeight: '700',
    fontSize: 12,
  },
  roundMs: {
    flex: 1,
    textAlign: 'center',
    color: colors.cream,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  roundSep: {
    color: 'rgba(212,170,116,0.55)',
    fontSize: 11,
    fontWeight: '700',
  },
  msWin: { color: colors.gold },
  msLose: { color: '#E8A0A0' },
  mark: {
    width: 20,
    textAlign: 'center',
    color: colors.sand,
    fontWeight: '800',
  },
  markWin: { color: colors.gold },
  markLose: { color: '#E8A0A0' },
  badge: {
    marginTop: 10,
    color: colors.gold,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
});
