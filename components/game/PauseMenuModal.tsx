import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import { WesternButton, WesternHeader, WesternPanel } from '@/components/ui/western/WesternPrimitives';
import { FONT_RYE } from '@/constants/fonts';
import { uiV3Colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';

type Props = {
  visible: boolean;
  onResume: () => void;
  onSecondaryExit?: () => void;
  secondaryLabel?: string;
  /** Ranked forfeiture warning remains visible before either exit action. */
  notice?: string;
  onMainMenu: () => void;
};

/** Native modal isolates touch/accessibility focus from the paused arena.
 * Its Android back action resumes, exactly like the explicit primary button. */
export function PauseMenuModal({ visible, onResume, onSecondaryExit, secondaryLabel, notice, onMainMenu }: Props) {
  const { t } = useTranslation();
  const m = usePhoneStageMetrics();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const cardWidth = Math.min(400, m.windowWidth - Math.max(insets.left, 20) - Math.max(insets.right, 20));
  return <Modal transparent visible={visible} animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onResume} supportedOrientations={['portrait', 'landscape']}>
    <View style={styles.backdrop} accessibilityViewIsModal onAccessibilityEscape={onResume}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
        <WesternPanel style={{ width: cardWidth }}>
          <View style={styles.inner}>
            <Text style={styles.eyebrow}>HIGH NOON</Text>
            <WesternHeader title={t('game.pause')} />
            {notice ? <Text accessibilityRole="alert" style={styles.notice}>{notice}</Text> : null}
            <View style={styles.actions}>
              <WesternButton title={t('game.continue')} onPress={onResume} variant="primary" />
              {onSecondaryExit != null && secondaryLabel != null ? <WesternButton title={secondaryLabel} onPress={onSecondaryExit} variant="secondary" /> : null}
              <WesternButton title={t('game.mainMenu')} onPress={onMainMenu} variant="secondary" />
            </View>
          </View>
        </WesternPanel>
      </ScrollView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,5,3,.78)' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { gap: 15, paddingVertical: 5 },
  eyebrow: { fontFamily: FONT_RYE, color: uiV3Colors.gold, fontSize: 11, letterSpacing: 3, textAlign: 'center' },
  notice: { color: uiV3Colors.cream, fontSize: 13, lineHeight: 20, textAlign: 'center', paddingHorizontal: 6 },
  actions: { gap: 10, marginTop: 4 },
});
