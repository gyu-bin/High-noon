import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import { WesternButton, WesternHeader, WesternPanel } from '@/components/ui/western/WesternPrimitives';
import type { PlayerCharacterId } from '@/constants/characters';
import { FONT_WESTERN_SERIF } from '@/constants/fonts';
import { uiV3Colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { useCharacterLabels } from '@/utils/characterLabels';
import { keepHangulWords } from '@/utils/keepHangulWords';

/** Korean wraps at word boundaries on both platforms. */
const wrap = (text: string) => (Platform.OS === 'android' ? keepHangulWords(text) : text);

type Props = {
  visible: boolean;
  characterId: PlayerCharacterId | null;
  unlocked: boolean;
  onClose: () => void;
};

export function CharacterAbilityModal({ visible, characterId, unlocked, onClose }: Props) {
  const { t } = useTranslation();
  const m = usePhoneStageMetrics();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const labels = useCharacterLabels(characterId ?? 1);
  if (characterId == null) return null;
  const cardWidth = Math.min(400, m.windowWidth - Math.max(insets.left, 20) - Math.max(insets.right, 20));
  return <Modal transparent visible={visible} animationType={reducedMotion ? 'none' : 'fade'} onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']}>
    <View style={styles.backdrop} accessibilityViewIsModal onAccessibilityEscape={onClose}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
        {/* Inside the scroll content: an iOS ScrollView swallows taps meant for a backdrop behind it. */}
        <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onClose} />
        <WesternPanel style={{ width: cardWidth }}>
          <View style={styles.inner}>
            <Text style={styles.eyebrow}>{t('character.abilityIntro.title')}</Text>
            <WesternHeader title={labels.name} />
            {labels.abilityName ? <View style={styles.descriptionPanel}>
              <Text style={styles.abilityName} lineBreakStrategyIOS="hangul-word">{wrap(labels.abilityName)}</Text>
              <Text style={styles.description} lineBreakStrategyIOS="hangul-word">{wrap(labels.abilityDescription ?? '')}</Text>
            </View> : <Text style={styles.description} lineBreakStrategyIOS="hangul-word">{wrap(t('character.noAbility'))}</Text>}
            {!unlocked ? <Text style={styles.lockHint} lineBreakStrategyIOS="hangul-word">{wrap(labels.unlockCondition)}</Text> : null}
            <WesternButton title={t('common.confirm')} onPress={onClose} variant="primary" />
          </View>
        </WesternPanel>
      </ScrollView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,5,3,.78)' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { gap: 16, paddingVertical: 6 },
  eyebrow: { color: uiV3Colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center' },
  descriptionPanel: { paddingHorizontal: 12, paddingVertical: 15, backgroundColor: 'rgba(0,0,0,.22)', borderWidth: 1, borderColor: '#695038', gap: 9 },
  abilityName: { fontFamily: FONT_WESTERN_SERIF, color: uiV3Colors.cream, fontSize: 19, fontWeight: '700', textAlign: 'center' },
  description: { color: uiV3Colors.cream, fontSize: 15, lineHeight: 23, textAlign: 'center' },
  lockHint: { color: uiV3Colors.ochre, fontSize: 13, lineHeight: 20, textAlign: 'center' },
});
