import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { CharacterSelectCard } from '@/components/character/CharacterSelectCard';
import { PlayerCharacterSprite } from '@/components/game/CharacterSprites';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { CHARACTERS, getCharacterById } from '@/constants/characters';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { checkUnlockConditions } from '@/utils/characterAbility';

type RevealPhase = 'idle' | 'black' | 'eyes' | 'popup' | 'reveal' | 'done';

export default function CharacterSelectScreen() {
  useScreenBgm('menu');
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const hiddenCharUnlocked = useProgressStore((s) => s.hiddenCharUnlocked);
  const unlockedIds = useProgressStore((s) => s.unlockedCharacterIds);
  const selectedCharacterId = useSettingsStore((s) => s.selectedCharacterId);
  const setSelectedCharacterId = useSettingsStore((s) => s.setSelectedCharacterId);

  const [revealPhase, setRevealPhase] = useState<RevealPhase>('idle');

  const visibleCharacters = useMemo(
    () => CHARACTERS.filter((c) => !c.isHidden || hiddenCharUnlocked),
    [hiddenCharUnlocked],
  );

  useFocusEffect(
    useCallback(() => {
      const had4 = useProgressStore.getState().unlockedCharacterIds.includes(4);
      checkUnlockConditions();
      const has4 = useProgressStore.getState().unlockedCharacterIds.includes(4);
      if (!had4 && has4) {
        setRevealPhase('black');
      }
    }, []),
  );

  useEffect(() => {
    if (revealPhase === 'black') {
      const t = setTimeout(() => setRevealPhase('eyes'), 420);
      return () => clearTimeout(t);
    }
    if (revealPhase === 'eyes') {
      const t = setTimeout(() => setRevealPhase('popup'), 780);
      return () => clearTimeout(t);
    }
    if (revealPhase === 'reveal') {
      const t = setTimeout(() => setRevealPhase('done'), 900);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [revealPhase]);

  const onRevealPopupConfirm = useCallback(() => {
    setRevealPhase('reveal');
  }, []);

  const selectCharacter = useCallback(
    (id: number) => {
      if (!unlockedIds.includes(id)) return;
      setSelectedCharacterId(id);
    },
    [unlockedIds, setSelectedCharacterId],
  );

  const ghost = getCharacterById(4);

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => <MenuBackButton onPress={() => router.back()} />,
        }}
      />
      <MetaScreenShell>
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <Text style={[styles.title, { fontFamily: FONT_RYE }]}>총잡이</Text>
        <Text style={styles.sub}>대결에 사용할 캐릭터를 고릅니다</Text>

        <ScrollView
          contentContainerStyle={styles.grid}
          showsVerticalScrollIndicator={false}
        >
          {visibleCharacters.map((c) => {
            const unlocked = unlockedIds.includes(c.id);
            const selected = selectedCharacterId === c.id;
            return (
              <CharacterSelectCard
                key={c.id}
                character={c}
                unlocked={unlocked}
                selected={selected}
                onPress={() => selectCharacter(c.id)}
              />
            );
          })}
        </ScrollView>
      </View>

      {revealPhase === 'black' ? (
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(200)}
          style={styles.revealBlack}
          pointerEvents="auto"
        />
      ) : null}

      {revealPhase === 'eyes' ? (
        <View style={styles.revealEyes} pointerEvents="none">
          <View style={styles.eyeRow}>
            <View style={styles.eye} />
            <View style={styles.eye} />
          </View>
        </View>
      ) : null}

      <Modal
        transparent
        visible={revealPhase === 'popup'}
        animationType="fade"
        onRequestClose={onRevealPopupConfirm}
      >
        <Pressable style={styles.popupDim} onPress={onRevealPopupConfirm}>
          <View style={styles.popupCard}>
            <Text style={styles.popupTitle}>??? 해금됨</Text>
            <Text style={styles.popupBody}>
              숨겨진 총잡이가 모습을 드러냅니다.
            </Text>
            <Pressable style={styles.popupBtn} onPress={onRevealPopupConfirm}>
              <Text style={styles.popupBtnText}>확인</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      {revealPhase === 'reveal' ? (
        <View style={styles.revealSpotlight} pointerEvents="none">
          {ghost ? (
            <Animated.View entering={FadeIn.duration(500)} style={styles.ghostCard}>
              <View style={styles.ghostPortrait}>
                <PlayerCharacterSprite characterId={4} width={110} height={124} pose="idle" />
              </View>
              <Text style={styles.ghostCardId}>04</Text>
              <Text style={styles.ghostCardName}>{ghost.name}</Text>
              <Text style={styles.ghostAbility}>「{ghost.abilityName}」</Text>
            </Animated.View>
          ) : null}
        </View>
      ) : null}
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 18,
  },
  title: {
    fontSize: 26,
    color: colors.ochre,
    letterSpacing: 3,
  },
  sub: {
    marginTop: 6,
    marginBottom: 16,
    color: colors.sand,
    fontSize: 14,
    opacity: 0.9,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 24,
  },
  revealBlack: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 300,
  },
  revealEyes: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 301,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  eyeRow: {
    flexDirection: 'row',
    gap: 48,
  },
  eye: {
    width: 36,
    height: 18,
    borderRadius: 18,
    backgroundColor: '#B91C1C',
    shadowColor: '#DC2626',
    shadowOpacity: 1,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
    elevation: 12,
  },
  popupDim: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 24,
  },
  popupCard: {
    borderRadius: 14,
    padding: 22,
    backgroundColor: '#3D2414',
    borderWidth: 2,
    borderColor: colors.rustRed,
  },
  popupTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.cream,
    letterSpacing: 2,
  },
  popupBody: {
    marginTop: 12,
    fontSize: 15,
    color: colors.sand,
    lineHeight: 22,
  },
  popupBtn: {
    marginTop: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: colors.ochre,
  },
  popupBtnText: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.darkBrown,
    fontSize: 16,
  },
  revealSpotlight: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 302,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  ghostCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: '#3D2414',
    borderWidth: 2,
    borderColor: colors.rustRed,
    alignItems: 'center',
    minWidth: 240,
  },
  ghostPortrait: {
    height: 130,
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginBottom: 8,
  },
  ghostCardId: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 3,
  },
  ghostCardName: {
    marginTop: 8,
    fontSize: 22,
    fontWeight: '900',
    color: colors.cream,
  },
  ghostAbility: {
    marginTop: 10,
    fontSize: 15,
    color: colors.ochre,
    fontWeight: '700',
  },
});
