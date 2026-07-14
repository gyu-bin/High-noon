import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { FONT_RYE } from '@/constants/fonts';
import { colors } from '@/constants/theme';

type Props = {
  visible: boolean;
  playerWins: number;
  opponentWins: number;
  loading?: boolean;
  onWatchAd: () => void;
  onDecline: () => void;
};

/** 접전 패배(예: 2:3) 시 광고 보고 한 판 더 도전 제안 */
export function AdReviveModal({
  visible,
  playerWins,
  opponentWins,
  loading = false,
  onWatchAd,
  onDecline,
}: Props) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDecline}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[styles.title, { fontFamily: FONT_RYE }]}>아직 끝난 게 아니야</Text>
          <Text style={styles.score}>
            {playerWins} <Text style={styles.dash}>—</Text> {opponentWins}
          </Text>
          <Text style={styles.desc}>
            광고를 보면 한 판 더 도전할 수 있습니다.{'\n'}이번 기회는 한 번뿐입니다.
          </Text>
          <Pressable
            accessibilityLabel="광고 보고 한 판 더 도전"
            accessibilityRole="button"
            onPress={onWatchAd}
            disabled={loading}
            style={[styles.watchBtn, loading && styles.watchBtnDisabled]}
          >
            <Text style={styles.watchText}>
              {loading ? '광고 준비 중…' : '광고 보고 한 판 더'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="포기하고 결과 보기"
            accessibilityRole="button"
            onPress={onDecline}
            disabled={loading}
            style={styles.declineBtn}
          >
            <Text style={styles.declineText}>포기</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 3, 2, 0.78)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: 'rgba(18, 10, 6, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.5)',
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 26,
    color: colors.ochre,
    letterSpacing: 2,
    textShadowColor: 'rgba(0,0,0,0.9)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 4,
  },
  score: {
    fontSize: 40,
    fontWeight: '900',
    color: colors.cream,
    letterSpacing: 4,
    marginVertical: 4,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  dash: {
    color: colors.sand,
    opacity: 0.65,
  },
  desc: {
    fontSize: 14,
    color: colors.cream,
    opacity: 0.9,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  watchBtn: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.rustRed,
    borderWidth: 1,
    borderColor: 'rgba(245, 230, 200, 0.45)',
    alignItems: 'center',
  },
  watchBtnDisabled: {
    opacity: 0.6,
  },
  watchText: {
    color: colors.cream,
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 1.5,
  },
  declineBtn: {
    alignSelf: 'stretch',
    paddingVertical: 10,
    alignItems: 'center',
  },
  declineText: {
    color: colors.sand,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 1,
    opacity: 0.8,
  },
});
