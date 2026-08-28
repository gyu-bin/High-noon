import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import LandscapeRotateHintArt from '@/assets/images/ui/landscape_rotate_hint.svg';
import { FONT_RYE } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

export function LandscapeHintModal({ visible, onDismiss }: Props) {
  const { t } = useTranslation();
  const m = usePhoneStageMetrics();
  const landscape = m.windowWidth > m.windowHeight;
  const cardWidth = landscape
    ? Math.min(440, Math.max(300, m.windowWidth * 0.42))
    : Math.min(360, Math.max(260, m.stageWidth - 36));

  if (!visible) return null;

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.backdrop}>
        <View style={[styles.card, { width: cardWidth }]}>
          <View style={styles.artWrap}>
            <LandscapeRotateHintArt width="100%" height={120} />
          </View>
          <Text style={[styles.title, { fontFamily: FONT_RYE }]}>
            {t('menu.landscapeHintTitle')}
          </Text>
          <Text style={styles.body}>{t('menu.landscapeHintBody')}</Text>
          <Pressable
            accessibilityLabel={t('menu.landscapeHintOk')}
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnPrimaryText}>{t('menu.landscapeHintOk')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 55,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 18,
    backgroundColor: '#3D2414',
    borderWidth: 2,
    borderColor: colors.sand,
    gap: 10,
    alignItems: 'center',
  },
  artWrap: {
    alignSelf: 'stretch',
    marginBottom: 2,
  },
  title: {
    fontSize: 24,
    color: colors.ochre,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  body: {
    alignSelf: 'stretch',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.cream,
    textAlign: 'center',
    marginBottom: 4,
    paddingHorizontal: 2,
  },
  btnPrimary: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.ochre,
    marginTop: 4,
  },
  btnPrimaryText: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.darkBrown,
    fontSize: 16,
  },
});
