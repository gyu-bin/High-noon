import { StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { FONT_RYE } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import { formatReactionMs } from '@/utils/formatReactionMs';
import type { PvpRoundRecord } from '@/types/pvp';

/** Capture canvas — 9:16 story ratio at logical px (pixelRatio 3 → ~1080×1920) */
export const WANTED_POSTER_WIDTH = 360;
export const WANTED_POSTER_HEIGHT = 640;

export type WantedPosterProps = {
  playerName: string;
  opponentName: string;
  rounds: PvpRoundRecord[];
  playerWins: number;
  opponentWins: number;
  avgMs: number | null;
  bestMs?: number | null;
  streak?: number | null;
  won: boolean;
  draw: boolean;
  challengeCode?: string | null;
  subtitle?: string | null;
};

/**
 * SNS 공유용 WANTED 포스터 (9:16).
 * view-shot 캡처 전용 — 결과 화면에서는 미리보기/오프스크린으로 쓴다.
 */
export function WantedPosterCard({
  playerName,
  opponentName,
  rounds,
  playerWins,
  opponentWins,
  avgMs,
  bestMs,
  streak,
  won,
  draw,
  challengeCode,
  subtitle,
}: WantedPosterProps) {
  const stampColor = won ? colors.gold : draw ? colors.sand : '#C45A4A';
  const stamp = won ? 'CLEARED' : draw ? 'DRAW' : 'OUTLAWED';

  return (
    <View style={styles.root} collapsable={false}>
      <LinearGradient
        colors={['#3A2416', '#1A0C06', '#2A140C']}
        start={{ x: 0.2, y: 0 }}
        end={{ x: 0.8, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <View style={styles.frameOuter}>
        <View style={styles.frameInner}>
          <Text style={[styles.brand, { fontFamily: FONT_RYE }]}>HIGH NOON</Text>
          <Text style={[styles.wanted, { fontFamily: FONT_RYE }]}>WANTED</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}

          <Text style={[styles.ms, { fontFamily: FONT_RYE }]}>
            {avgMs != null ? formatReactionMs(avgMs) : '—'}
            <Text style={styles.msUnit}> ms</Text>
          </Text>
          <Text style={styles.msCaption}>AVG REACTION</Text>

          {(bestMs != null || (streak != null && streak > 0)) && (
            <View style={styles.metaRow}>
              {bestMs != null ? (
                <Text style={styles.metaChip}>
                  BEST {formatReactionMs(bestMs)}ms
                </Text>
              ) : null}
              {streak != null && streak > 0 ? (
                <Text style={styles.metaChip}>STREAK {streak}</Text>
              ) : null}
            </View>
          )}

          <View style={styles.divider} />

          <Text style={[styles.score, { fontFamily: FONT_RYE }]}>
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

          <View style={styles.rounds}>
            {rounds.slice(0, 3).map((r, i) => (
              <Text key={i} style={styles.roundLine}>
                {i + 1}.{' '}
                {r.playerMs != null ? `${Math.round(r.playerMs)}` : '—'} vs{' '}
                {r.opponentMs != null ? `${Math.round(r.opponentMs)}` : '—'}
                {'  '}
                {r.winner === 'player' ? '✓' : r.winner === 'opponent' ? '✗' : '='}
              </Text>
            ))}
          </View>

          <View style={[styles.stamp, { borderColor: stampColor }]}>
            <Text style={[styles.stampText, { color: stampColor, fontFamily: FONT_RYE }]}>
              {stamp}
            </Text>
          </View>

          {challengeCode ? (
            <Text style={[styles.code, { fontFamily: FONT_RYE }]}>
              CODE {challengeCode}
            </Text>
          ) : (
            <Text style={styles.hook}>너 반응속도 몇 ms야?</Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: WANTED_POSTER_WIDTH,
    height: WANTED_POSTER_HEIGHT,
    backgroundColor: '#1A0C06',
    overflow: 'hidden',
  },
  frameOuter: {
    flex: 1,
    margin: 14,
    borderWidth: 2,
    borderColor: 'rgba(232,197,71,0.55)',
    padding: 6,
  },
  frameInner: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(212,170,116,0.35)',
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 16,
    alignItems: 'center',
  },
  brand: {
    color: colors.sand,
    fontSize: 12,
    letterSpacing: 4,
  },
  wanted: {
    marginTop: 8,
    color: colors.gold,
    fontSize: 42,
    letterSpacing: 6,
    textShadowColor: 'rgba(0,0,0,0.55)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 0,
  },
  subtitle: {
    marginTop: 2,
    color: colors.sand,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  ms: {
    marginTop: 18,
    color: colors.cream,
    fontSize: 64,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 0,
  },
  msUnit: {
    fontSize: 22,
    color: colors.sand,
  },
  msCaption: {
    marginTop: -2,
    color: colors.sand,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 2,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  metaChip: {
    color: colors.gold,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  divider: {
    marginVertical: 14,
    width: '72%',
    height: 1,
    backgroundColor: 'rgba(232,197,71,0.35)',
  },
  score: {
    color: colors.gold,
    fontSize: 28,
    letterSpacing: 2,
  },
  names: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 6,
  },
  name: {
    flex: 1,
    color: colors.cream,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  vs: {
    color: colors.gold,
    fontSize: 11,
    letterSpacing: 1,
  },
  rounds: {
    marginTop: 14,
    width: '100%',
    gap: 4,
  },
  roundLine: {
    color: 'rgba(240,230,210,0.88)',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    fontVariant: ['tabular-nums'],
  },
  stamp: {
    marginTop: 16,
    borderWidth: 2,
    paddingHorizontal: 14,
    paddingVertical: 6,
    transform: [{ rotate: '-6deg' }],
  },
  stampText: {
    fontSize: 18,
    letterSpacing: 3,
  },
  code: {
    marginTop: 18,
    color: colors.gold,
    fontSize: 18,
    letterSpacing: 3,
  },
  hook: {
    marginTop: 18,
    color: colors.sand,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
