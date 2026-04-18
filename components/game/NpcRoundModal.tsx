import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { LocalDuelFireworks } from '@/components/game/LocalDuelFireworks';
import { colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { formatReactionMs } from '@/utils/formatReactionMs';

export type NpcRoundLossReason = 'early' | 'timeout' | 'slower';

export type NpcRoundModalData =
  | {
      kind: 'win';
      playerMs: number;
      npcMs: number | null;
      npcMisfire?: boolean;
      /** 라스트 스탠드로 역전 승 */
      lastStand?: boolean;
    }
  | {
      kind: 'loss';
      reason: NpcRoundLossReason;
      playerMs: number | null;
      npcMs: number | null;
      /** 망령 사수 한 번 더로 하트 유지 */
      revive?: boolean;
    };

type Props = {
  visible: boolean;
  data: NpcRoundModalData | null;
  onContinue: () => void;
  /** 승리 라운드마다 증가 → 폭죽 재생 */
  winBurstId: number;
  /** 붉은 로사 — 승리 직후 헤드샷 선택 */
  headshotOffered?: boolean;
  onHeadshotPress?: () => void;
};

export function NpcRoundModal({
  visible,
  data,
  onContinue,
  winBurstId,
  headshotOffered = false,
  onHeadshotPress,
}: Props) {
  const m = usePhoneStageMetrics();
  const halfH = m.stageHeight / 2;

  if (!data) return null;

  const showWinFx = data.kind === 'win' && winBurstId > 0;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onContinue}>
      <View style={styles.root}>
        <View style={styles.dim} />
        <View
          pointerEvents="box-none"
          style={[
            styles.stageFrame,
            {
              left: m.offsetX,
              top: m.offsetY,
              width: m.stageWidth,
              height: m.stageHeight,
            },
          ]}
        >
          {showWinFx ? (
            <View style={styles.fxLayer} pointerEvents="none">
              <LocalDuelFireworks
                origin="bottom"
                width={m.stageWidth}
                height={m.stageHeight}
                halfH={halfH}
                burstId={winBurstId}
              />
            </View>
          ) : null}
          <View style={styles.foreground} pointerEvents="box-none">
          <View style={styles.card}>
            {data.kind === 'win' ? (
              <>
                <Text style={styles.badge}>승리</Text>
                <Text style={styles.title}>라운드 승리!</Text>
                {data.lastStand ? (
                  <Text style={styles.abilityTag}>라스트 스탠드!</Text>
                ) : null}
                <Text style={styles.line}>
                  나: <Text style={styles.em}>{formatReactionMs(data.playerMs)} ms</Text>
                </Text>
                <Text style={styles.line}>
                  {data.npcMisfire ? (
                    <Text style={styles.em}>상대 오발 — 자동 승!</Text>
                  ) : (
                    <>
                      상대:{' '}
                      <Text style={styles.em}>
                        {data.npcMs != null ? `${formatReactionMs(data.npcMs)} ms` : '—'}
                      </Text>
                    </>
                  )}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.badge, styles.badgeLoss]}>패배</Text>
                <Text style={styles.title}>라운드 패배!</Text>
                {data.revive ? (
                  <Text style={styles.abilityTag}>한 번 더 — 하트 유지!</Text>
                ) : null}
                <Text style={styles.reasonSub}>
                  {data.reason === 'early' && '뱅 전에 쐈다 (얼리)'}
                  {data.reason === 'timeout' && '시간 안에 쏘지 못했다'}
                  {data.reason === 'slower' && '상대보다 늦게 쐈다'}
                </Text>
                {data.playerMs != null ? (
                  <Text style={styles.line}>
                    나: <Text style={styles.em}>{formatReactionMs(data.playerMs)} ms</Text>
                  </Text>
                ) : null}
                {data.npcMs != null && data.reason === 'slower' ? (
                  <Text style={styles.line}>
                    상대: <Text style={styles.em}>{formatReactionMs(data.npcMs)} ms</Text>
                  </Text>
                ) : null}
              </>
            )}
            {data.kind === 'win' && headshotOffered && onHeadshotPress ? (
              <Pressable
                accessibilityLabel="헤드샷 사용"
                accessibilityRole="button"
                onPress={onHeadshotPress}
                style={[styles.btn, styles.btnHeadshot]}
              >
                <Text style={styles.btnTextHeadshot}>헤드샷 사용</Text>
              </Pressable>
            ) : null}
            <Pressable
              accessibilityLabel="계속"
              accessibilityRole="button"
              accessibilityHint="다음 라운드 또는 결과로 진행합니다"
              onPress={onContinue}
              style={styles.btn}
            >
              <Text style={styles.btnText}>계속</Text>
            </Pressable>
          </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.58)',
    zIndex: 0,
  },
  stageFrame: {
    position: 'absolute',
    zIndex: 2,
    overflow: 'hidden',
  },
  fxLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
  foreground: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    padding: 24,
    zIndex: 2,
  },
  card: {
    borderRadius: 14,
    padding: 22,
    backgroundColor: '#3D2414',
    borderWidth: 2,
    borderColor: colors.sand,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    overflow: 'hidden',
    color: colors.darkBrown,
    backgroundColor: colors.ochre,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 1,
  },
  badgeLoss: {
    backgroundColor: colors.rustRed,
    color: colors.cream,
  },
  title: {
    marginTop: 12,
    fontSize: 20,
    fontWeight: '800',
    color: colors.cream,
  },
  abilityTag: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '800',
    color: colors.ochre,
    letterSpacing: 1,
  },
  reasonSub: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '600',
    color: colors.sand,
    opacity: 0.92,
  },
  line: {
    marginTop: 10,
    fontSize: 16,
    color: colors.sand,
  },
  em: {
    color: colors.ochre,
    fontWeight: '800',
  },
  btn: {
    marginTop: 22,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.ochre,
  },
  btnHeadshot: {
    marginTop: 14,
    backgroundColor: colors.rustRed,
    borderWidth: 2,
    borderColor: colors.cream,
  },
  btnText: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.darkBrown,
    fontSize: 16,
  },
  btnTextHeadshot: {
    textAlign: 'center',
    fontWeight: '900',
    color: colors.cream,
    fontSize: 16,
    letterSpacing: 2,
  },
});
