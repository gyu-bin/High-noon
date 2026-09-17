import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { CharacterAbilityModal } from '@/components/character/CharacterAbilityModal';
import { CharacterSelector } from '@/components/character/CharacterSelector';
import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { CHARACTERS, getCharacterById, type PlayerCharacterId } from '@/constants/characters';
import { DEV_UNLOCK_ALL_CHARACTERS } from '@/constants/devFlags';
import { FONT_RYE } from '@/constants/fonts';
import { uiV3Colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { checkUnlockConditions } from '@/utils/characterAbility';
import { useCharacterLabels } from '@/utils/characterLabels';

export default function CharacterSelectScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const unlockedIds = useProgressStore((s) => s.unlockedCharacterIds);
  const selectedCharacterId = useSettingsStore((s) => s.selectedCharacterId);
  const setSelectedCharacterId = useSettingsStore((s) => s.setSelectedCharacterId);
  const [focusedId, setFocusedId] = useState<PlayerCharacterId>(selectedCharacterId as PlayerCharacterId);
  const [abilityModalId, setAbilityModalId] = useState<PlayerCharacterId | null>(null);
  const character = useMemo(() => getCharacterById(focusedId) ?? CHARACTERS[0]!, [focusedId]);
  const labels = useCharacterLabels(character.id);
  const unlocked = DEV_UNLOCK_ALL_CHARACTERS || unlockedIds.includes(character.id);

  useScreenBgm('menu');
  useFocusEffect(useCallback(() => {
    checkUnlockConditions();
  }, []));
  useEffect(() => { setFocusedId(selectedCharacterId as PlayerCharacterId); }, [selectedCharacterId]);

  const step = useCallback((direction: -1 | 1) => {
    const index = CHARACTERS.findIndex((item) => item.id === character.id);
    const next = CHARACTERS[(index + direction + CHARACTERS.length) % CHARACTERS.length]!;
    setFocusedId(next.id);
  }, [character.id]);
  const select = useCallback(() => {
    if (!unlocked) return;
    setSelectedCharacterId(character.id);
  }, [character.id, setSelectedCharacterId, unlocked]);
  const back = useCallback(() => router.replace('/menu'), [router]);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <MetaScreenShell>
        <ScrollView contentContainerStyle={[styles.root, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.topbar}>
            <MenuBackButton onPress={back} variant="overlay" />
            <View style={styles.heading}>
              <Text style={styles.eyebrow}>CHOOSE YOUR</Text>
              <Text style={styles.title}>GUNSLINGER</Text>
            </View>
            <View style={styles.topbarSpacer} />
          </View>
          <CharacterSelector
            character={character}
            unlocked={unlocked}
            selected={selectedCharacterId === character.id}
            onPrevious={() => step(-1)}
            onNext={() => step(1)}
            onSelect={select}
            onLongPress={() => setAbilityModalId(character.id)}
            name={labels.name}
            ability={labels.abilityName || undefined}
            unlockHint={unlocked ? t('character.holdForAbility') : labels.unlockCondition}
            selectLabel={t('meta.character.select')}
            previousLabel={t('meta.character.previous')}
            nextLabel={t('meta.character.next')}
          />
          <CharacterAbilityModal
            visible={abilityModalId != null}
            characterId={abilityModalId}
            unlocked={unlocked}
            onClose={() => setAbilityModalId(null)}
          />
        </ScrollView>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flexGrow: 1, paddingHorizontal: 18, gap: 8 },
  topbar: { minHeight: 76, flexDirection: 'row', alignItems: 'center' },
  heading: { flex: 1 },
  topbarSpacer: { width: 92 },
  eyebrow: { color: uiV3Colors.gold, fontSize: 9, fontWeight: '900', letterSpacing: 2.4, textAlign: 'center' },
  title: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 20, letterSpacing: 0.8, textAlign: 'center', marginTop: 2 },
});
