import { Image } from 'expo-image';
import { Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from 'react-native-reanimated';

import { WesternButton, WesternHeader, WesternPanel } from '@/components/ui/western/WesternPrimitives';
import { FONT_WESTERN_SERIF } from '@/constants/fonts';
import { uiV3Colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { getNpcDisplayName } from '@/utils/npcLabels';
import { getNpcSpecialAbilityLabels } from '@/utils/npcAbilityLabels';
import { keepHangulWords } from '@/utils/keepHangulWords';
import type { NpcDefinition } from '@/types/npc';

/** Korean wraps at word boundaries on both platforms. */
const wrap = (text: string) => (Platform.OS === 'android' ? keepHangulWords(text) : text);

// Same aged paper as the NPC Wanted card.
const wantedPaper = require('@/assets/images/ui/western/ui_wanted_paper.png');

type Props = {
  visible: boolean;
  npc: NpcDefinition | undefined;
  onConfirm: () => void;
};

/** Leather panel like the Pause / character-ability modals, with the ability on a Wanted-paper plate.
 * Backdrop tap and Android back confirm, exactly as before. */
export function NpcAbilityIntroModal({ visible, npc, onConfirm }: Props) {
  const { t } = useTranslation();
  const m = usePhoneStageMetrics();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  if (!npc) return null;

  const ability = getNpcSpecialAbilityLabels(t, npc.specialAbility);
  if (!ability) return null;
  const opponentName = getNpcDisplayName(t, npc.id);
  const cardWidth = Math.min(400, m.windowWidth - Math.max(insets.left, 20) - Math.max(insets.right, 20));

  return (
    <Modal
      transparent
      visible={visible}
      animationType={reducedMotion ? 'none' : 'fade'}
      onRequestClose={onConfirm}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.backdrop} accessibilityViewIsModal onAccessibilityEscape={onConfirm}>
        <ScrollView contentContainerStyle={[styles.content, { paddingTop: Math.max(insets.top, 20), paddingBottom: Math.max(insets.bottom, 20) }]}>
          {/* Inside the scroll content: an iOS ScrollView swallows taps meant for a backdrop behind it. */}
          <Pressable accessible={false} style={StyleSheet.absoluteFill} onPress={onConfirm} />
          <WesternPanel style={{ width: cardWidth }}>
            <View style={styles.inner}>
              <Text style={styles.eyebrow}>{t('npcs.abilityIntro.title')}</Text>
              <WesternHeader title={opponentName} />
              <View style={styles.plate}>
                <Image source={wantedPaper} contentFit="cover" style={styles.paper} />
                <View pointerEvents="none" style={styles.paperEdge} />
                <Text style={styles.abilityName} lineBreakStrategyIOS="hangul-word">{wrap(ability.name)}</Text>
                <View style={styles.rule} />
                <Text style={styles.description} lineBreakStrategyIOS="hangul-word">{wrap(ability.description)}</Text>
              </View>
              <WesternButton title={t('npcs.abilityIntro.confirm')} onPress={onConfirm} variant="primary" />
            </View>
          </WesternPanel>
        </ScrollView>
      </View>
    </Modal>
  );
}

const INK = '#2D160E';

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(8,5,3,.78)' },
  content: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  inner: { gap: 16, paddingVertical: 6 },
  eyebrow: { color: uiV3Colors.gold, fontSize: 11, fontWeight: '800', letterSpacing: 1.5, textAlign: 'center' },
  plate: { overflow: 'hidden', paddingHorizontal: 16, paddingVertical: 16, gap: 10, backgroundColor: '#D9C29A', borderWidth: 1, borderColor: '#695038' },
  paper: { ...StyleSheet.absoluteFillObject, opacity: 0.74 },
  paperEdge: { ...StyleSheet.absoluteFillObject, borderWidth: 3, borderColor: 'rgba(83,42,16,0.16)' },
  abilityName: { fontFamily: FONT_WESTERN_SERIF, color: '#6A291C', fontSize: 20, fontWeight: '700', textAlign: 'center' },
  rule: { alignSelf: 'center', width: 64, height: 1, backgroundColor: 'rgba(83,42,16,0.45)' },
  description: { color: INK, fontSize: 15, lineHeight: 23, textAlign: 'center' },
});
