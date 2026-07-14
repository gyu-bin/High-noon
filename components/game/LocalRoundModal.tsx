import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { LocalDuelFireworks } from '@/components/game/LocalDuelFireworks';
import { FONT_RYE } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import type {
  LocalPlayerRoundState,
  LocalRoundOutcome,
} from '@/hooks/useLocalDuelEngine';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { formatReactionMs } from '@/utils/formatReactionMs';

type Props = {
  visible: boolean;
  outcome: LocalRoundOutcome | null;
  onContinue: () => void;
  fxBurstId: number;
  paddingBottom?: number;
};

function resultLine(s: LocalPlayerRoundState): string {
  if (s.earlyTap) return '얼리 탭';
  if (s.timeout) return '타임아웃';
  if (s.reactionMs != null) return `${formatReactionMs(s.reactionMs)} ms`;
  return '—';
}

function lossReason(s: LocalPlayerRoundState): string | null {
  if (s.earlyTap) return '얼리 탭';
  if (s.timeout) return '시간 초과';
  return null;
}

export function LocalRoundModal({
  visible,
  outcome,
  onContinue,
  fxBurstId,
  paddingBottom = 0,
}: Props) {
  const m = usePhoneStageMetrics();
  const halfH = m.stageHeight / 2;
  const landscape = m.windowWidth > m.windowHeight;

  if (!outcome) return null;

  const p1Won = outcome.winner === 'p1';
  const p2Won = outcome.winner === 'p2';
  const draw = outcome.winner === 'draw';
  const p1Loss = lossReason(outcome.p1);
  const p2Loss = lossReason(outcome.p2);

  // 가로 — 스테이지 프레임 대신 전체 화면 기준 (좌우 캐릭터 정면 대치와 정렬)
  const frame = landscape
    ? { left: 0, top: 0, width: m.windowWidth, height: m.windowHeight }
    : {
        left: m.offsetX,
        top: m.offsetY,
        width: m.stageWidth,
        height: m.stageHeight,
      };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onContinue}
      supportedOrientations={['portrait', 'landscape']}
    >
      <Pressable
        accessibilityLabel="탭하여 다음 라운드"
        accessibilityRole="button"
        onPress={onContinue}
        style={styles.root}
      >
        <View pointerEvents="box-none" style={[styles.stageFrame, frame]}>
          {p1Won && fxBurstId > 0 ? (
            <View style={styles.fxLayer} pointerEvents="none">
              <LocalDuelFireworks
                origin={landscape ? 'left' : 'bottom'}
                width={frame.width}
                height={frame.height}
                halfH={halfH}
                burstId={fxBurstId}
              />
            </View>
          ) : null}
          {p2Won && fxBurstId > 0 ? (
            <View style={styles.fxLayer} pointerEvents="none">
              <LocalDuelFireworks
                origin={landscape ? 'right' : 'top'}
                width={frame.width}
                height={frame.height}
                halfH={halfH}
                burstId={fxBurstId}
              />
            </View>
          ) : null}

          <View pointerEvents="none" style={styles.labelsLayer}>
            {/*
              세로 2P — 위쪽 P2 시점을 위해 상단 절반은 180° 회전.
              그래야 두 플레이어 모두 자기 결과를 정방향으로 읽음.
            */}
            <View
              style={
                landscape
                  ? styles.p2BlockLandscape
                  : [styles.p2BlockPortrait, { transform: [{ rotate: '180deg' }] }]
              }
            >
              <Text style={[styles.outcomeLabel, p2Won ? styles.winText : styles.loseText]}>
                {draw ? '무승부' : p2Won ? '승리!' : '패배'}
              </Text>
              <Text style={styles.statsText}>P2 · {resultLine(outcome.p2)}</Text>
              {!p2Won && p2Loss ? (
                <Text style={styles.reasonText}>{p2Loss}</Text>
              ) : null}
            </View>

            {/* P1 — portrait: 하단 정방향 · landscape: 좌측 정면 */}
            <View style={landscape ? styles.p1BlockLandscape : styles.p1BlockPortrait}>
              <Text style={[styles.outcomeLabel, p1Won ? styles.winText : styles.loseText]}>
                {draw ? '무승부' : p1Won ? '승리!' : '패배'}
              </Text>
              <Text style={styles.statsText}>P1 · {resultLine(outcome.p1)}</Text>
              {!p1Won && p1Loss ? (
                <Text style={styles.reasonText}>{p1Loss}</Text>
              ) : null}
            </View>
          </View>

          {/* 계속 안내 — landscape는 중앙, portrait은 양쪽 (P2는 180° 회전) */}
          {landscape ? (
            <View
              pointerEvents="none"
              style={[styles.bottomBarLandscape, { bottom: Math.max(paddingBottom, 8) + 6 }]}
            >
              <Text style={styles.continueHint}>탭하여 다음 라운드</Text>
            </View>
          ) : (
            <>
              <View
                pointerEvents="none"
                style={[styles.hintP1, { bottom: Math.max(paddingBottom, 8) + 10 }]}
              >
                <Text style={styles.continueHint}>탭하여 다음 라운드</Text>
              </View>
              <View
                pointerEvents="none"
                style={[
                  styles.hintP2,
                  { top: Math.max(paddingBottom, 8) + 10, transform: [{ rotate: '180deg' }] },
                ]}
              >
                <Text style={styles.continueHint}>탭하여 다음 라운드</Text>
              </View>
            </>
          )}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stageFrame: {
    position: 'absolute',
    overflow: 'hidden',
  },
  fxLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  labelsLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
  },
  p2Block: {
    position: 'absolute',
    top: '20%',
    right: '8%',
    alignItems: 'flex-end',
    gap: 4,
  },
  p1Block: {
    position: 'absolute',
    left: '8%',
    bottom: '36%',
    alignItems: 'flex-start',
    gap: 4,
  },
  /* 세로 2P — 각 플레이어 절반 중앙, P2는 180° 회전으로 정방향 */
  p1BlockPortrait: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '58%',
    alignItems: 'center',
    gap: 6,
  },
  p2BlockPortrait: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '18%',
    alignItems: 'center',
    gap: 6,
  },
  /* landscape — 좌우 정면 대치와 정렬, 캐릭터 머리 위 */
  p1BlockLandscape: {
    position: 'absolute',
    left: '8%',
    top: '18%',
    alignItems: 'flex-start',
    gap: 4,
  },
  p2BlockLandscape: {
    position: 'absolute',
    right: '8%',
    top: '18%',
    alignItems: 'flex-end',
    gap: 4,
  },
  outcomeLabel: {
    fontFamily: FONT_RYE,
    fontSize: 32,
    letterSpacing: 1,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },
  winText: {
    color: colors.ochre,
  },
  loseText: {
    color: colors.sand,
    opacity: 0.92,
  },
  statsText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.cream,
    letterSpacing: 0.3,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  reasonText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sand,
    opacity: 0.88,
    letterSpacing: 0.4,
  },
  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3,
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 10,
    backgroundColor: 'rgba(12, 8, 5, 0.96)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(212, 165, 116, 0.35)',
  },
  /* landscape — 하단 중앙 콤팩트 카드 (캐릭터·불꽃 안 가림) */
  bottomBarLandscape: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 3,
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    backgroundColor: 'rgba(8, 5, 3, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.28)',
    borderRadius: 14,
    maxWidth: '46%',
  },
  /* 세로 2P — 각자 자기 쪽 화면 끝의 "탭하여 계속" 힌트 */
  hintP1: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 3,
    alignItems: 'center',
  },
  hintP2: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 3,
    alignItems: 'center',
  },
  continueHint: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(245, 230, 200, 0.55)',
    letterSpacing: 0.8,
  },
});
