import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
          <Text style={[styles.title, { fontFamily: FONT_RYE }]}>{t('revive.title')}</Text>
          <Text style={styles.score}>
            {playerWins} <Text style={styles.dash}>—</Text> {opponentWins}
          </Text>
          <Text style={styles.desc}>{t('revive.desc')}</Text>
          <Pressable
            accessibilityLabel={t('revive.watchAdA11y')}
            accessibilityRole="button"
            onPress={onWatchAd}
            disabled={loading}
            style={[styles.watchBtn, loading && styles.watchBtnDisabled]}
          >
            <Text style={styles.watchText}>
              {loading ? t('revive.watchAdLoading') : t('revive.watchAd')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t('revive.declineA11y')}
            accessibilityRole="button"
            onPress={onDecline}
            disabled={loading}
            style={styles.declineBtn}
          >
            <Text style={styles.declineText}>{t('revive.giveUp')}</Text>
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
    borderRadius: 16,
    padding: 22,
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    color: colors.cream,
    letterSpacing: 1,
    textAlign: 'center',
  },
  score: {
    marginTop: 14,
    fontSize: 28,
    fontWeight: '900',
    color: colors.ochre,
  },
  dash: {
    color: colors.sand,
    fontWeight: '600',
  },
  desc: {
    marginTop: 14,
    fontSize: 14,
    lineHeight: 21,
    color: colors.sand,
    textAlign: 'center',
  },
  watchBtn: {
    marginTop: 20,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.ochre,
    alignItems: 'center',
  },
  watchBtnDisabled: {
    opacity: 0.65,
  },
  watchText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.darkBrown,
  },
  declineBtn: {
    marginTop: 12,
    paddingVertical: 10,
  },
  declineText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.sand,
  },
});
