import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import type { PlayerCharacterId } from '@/constants/characters';
import { colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';
import { useCharacterLabels } from '@/utils/characterLabels';

type Props = {
  visible: boolean;
  characterId: PlayerCharacterId | null;
  unlocked: boolean;
  onClose: () => void;
};

export function CharacterAbilityModal({ visible, characterId, unlocked, onClose }: Props) {
  const { t } = useTranslation();
  const m = usePhoneStageMetrics();
  const landscape = m.windowWidth > m.windowHeight;
  const labels = useCharacterLabels(characterId ?? 1);

  if (characterId == null) return null;

  const cardWidth = landscape
    ? Math.min(480, Math.max(300, m.windowWidth * 0.44))
    : Math.min(380, Math.max(260, m.stageWidth - 40));

  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable
          style={[styles.card, landscape && styles.cardLandscape, { width: cardWidth }]}
          onPress={(e) => e.stopPropagation()}
        >
          <Text style={styles.eyebrow}>{t('character.abilityIntro.title')}</Text>
          <Text style={styles.name}>{labels.name}</Text>
          {labels.abilityName ? (
            <>
              <Text style={styles.abilityName}>「{labels.abilityName}」</Text>
              <Text style={styles.description}>{labels.abilityDescription}</Text>
            </>
          ) : (
            <Text style={styles.noAbility}>{t('character.noAbility')}</Text>
          )}
          {!unlocked ? (
            <Text style={styles.lockHint}>{labels.unlockCondition}</Text>
          ) : null}
          <Pressable
            accessibilityLabel={t('common.confirm')}
            accessibilityRole="button"
            onPress={onClose}
            style={styles.btn}
          >
            <Text style={styles.btnText}>{t('common.confirm')}</Text>
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
  name: {
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
  noAbility: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.sand,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 6,
    opacity: 0.9,
  },
  lockHint: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.sand,
    textAlign: 'center',
    opacity: 0.85,
    marginTop: 2,
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
