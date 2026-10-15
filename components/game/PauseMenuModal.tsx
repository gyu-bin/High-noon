import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';

type Props = {
  visible: boolean;
  onResume: () => void;
  /** NPC 모드: 선택 화면 복귀 등 */
  onSecondaryExit?: () => void;
  secondaryLabel?: string;
  onMainMenu: () => void;
};

export function PauseMenuModal({
  visible,
  onResume,
  onSecondaryExit,
  secondaryLabel,
  onMainMenu,
}: Props) {
  const { t } = useTranslation();
  const m = usePhoneStageMetrics();
  const landscape = m.windowWidth > m.windowHeight;

  useEffect(() => {
    if (!visible) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      onResume();
      return true;
    });
    return () => sub.remove();
  }, [visible, onResume]);

  if (!visible) return null;

  const cardWidth = landscape
    ? Math.min(480, Math.max(300, m.windowWidth * 0.44))
    : Math.min(380, Math.max(260, m.stageWidth - 40));

  return (
    <View style={styles.root} pointerEvents="box-none">
      <View style={styles.backdrop}>
        <View
          style={[
            styles.card,
            landscape && styles.cardLandscape,
            { width: cardWidth, alignSelf: 'center' },
          ]}
        >
          <Text style={[styles.title, landscape && styles.titleLandscape]}>{t('game.pause')}</Text>
          <Pressable
            accessibilityLabel={t('game.continue')}
            accessibilityRole="button"
            onPress={onResume}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnPrimaryText}>{t('game.continue')}</Text>
          </Pressable>
          {onSecondaryExit != null && secondaryLabel != null ? (
            <Pressable
              accessibilityLabel={secondaryLabel}
              accessibilityRole="button"
              onPress={onSecondaryExit}
              style={styles.btn}
            >
              <Text style={styles.btnText}>{secondaryLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={t('game.mainMenu')}
            accessibilityRole="button"
            onPress={onMainMenu}
            style={styles.btn}
          >
            <Text style={styles.btnText}>{t('game.mainMenu')}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 16,
    padding: 22,
    backgroundColor: '#3D2414',
    borderWidth: 2,
    borderColor: colors.sand,
    gap: 12,
  },
  cardLandscape: {
    paddingVertical: 18,
    paddingHorizontal: 24,
    gap: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ochre,
    marginBottom: 6,
    textAlign: 'center',
  },
  titleLandscape: {
    fontSize: 20,
    marginBottom: 4,
  },
  btnPrimary: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.ochre,
  },
  btnPrimaryText: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.darkBrown,
    fontSize: 16,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  btnText: {
    textAlign: 'center',
    fontWeight: '700',
    color: colors.cream,
    fontSize: 15,
  },
});
