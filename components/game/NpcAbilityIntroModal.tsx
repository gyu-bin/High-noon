import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { getNpcDisplayName } from '@/utils/npcLabels';
import { getNpcSpecialAbilityLabels } from '@/utils/npcAbilityLabels';
import type { NpcDefinition } from '@/types/npc';

type Props = {
  visible: boolean;
  npc: NpcDefinition | undefined;
  onConfirm: () => void;
};

export function NpcAbilityIntroModal({ visible, npc, onConfirm }: Props) {
  const { t } = useTranslation();
  const m = usePhoneStageMetrics();
  const landscape = m.windowWidth > m.windowHeight;

  if (!npc) return null;

  const ability = getNpcSpecialAbilityLabels(t, npc.specialAbility);
  if (!ability) return null;

  const cardWidth = landscape
    ? Math.min(480, Math.max(300, m.windowWidth * 0.44))
    : Math.min(380, Math.max(260, m.stageWidth - 40));

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onConfirm}
    >
      <Pressable style={styles.backdrop} onPress={onConfirm}>
        <Pressable
          style={[styles.card, landscape && styles.cardLandscape, { width: cardWidth }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.eyebrow}>{t('npcs.abilityIntro.title')}</Text>
          <Text style={styles.opponent}>{getNpcDisplayName(t, npc.id)}</Text>
          <Text style={styles.abilityName}>「{ability.name}」</Text>
          <Text style={styles.description}>{ability.description}</Text>
          <Pressable
            accessibilityLabel={t('npcs.abilityIntro.confirm')}
            accessibilityRole="button"
            onPress={onConfirm}
            style={styles.btn}
          >
            <Text style={styles.btnText}>{t('npcs.abilityIntro.confirm')}</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(8, 6, 4, 0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#2C1A0E',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#C8860A',
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 18,
    gap: 10,
  },
  cardLandscape: {
    paddingHorizontal: 28,
    paddingTop: 24,
    paddingBottom: 20,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.sand,
    letterSpacing: 1.2,
    opacity: 0.85,
    textAlign: 'center',
  },
  opponent: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ochre,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  abilityName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#F5E6C8',
    textAlign: 'center',
    letterSpacing: 0.4,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.sand,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 6,
  },
  btn: {
    marginTop: 4,
    alignSelf: 'stretch',
    backgroundColor: colors.ochre,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  btnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#2C1A0E',
    letterSpacing: 0.5,
  },
});
