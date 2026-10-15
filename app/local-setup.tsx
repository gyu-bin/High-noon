import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LocalDuelSkinSprite } from '@/components/game/CharacterSprites';
import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { WoodButton } from '@/components/ui/WoodButton';
import type { PlayerCharacterId } from '@/constants/characters';
import { FONT_RYE } from '@/constants/fonts';
import {
  encodeLocalDuelSkin,
  isSameLocalDuelSkin,
  listLocalDuelSkins,
  type LocalDuelSkin,
} from '@/constants/localDuelSkin';
import { colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import {
  LOCAL_MATCH_PRESETS,
  type LocalMatchPreset,
  useSettingsStore,
} from '@/store/settingsStore';
import { play } from '@/utils/audioService';
import { useCharacterLabels } from '@/utils/characterLabels';
import { trigger } from '@/utils/hapticService';
import { getNpcDisplayName } from '@/utils/npcLabels';

type Slot = 'p1' | 'p2';
type SetupStep = 'characters' | 'rounds';

const SKINS = listLocalDuelSkins();
const PORTRAIT_W = 72;
const PORTRAIT_H = 82;
const SLOT_PORTRAIT_W = 64;
const SLOT_PORTRAIT_H = 72;

function SkinName({ skin, compact }: { skin: LocalDuelSkin; compact?: boolean }) {
  const { t } = useTranslation();
  if (skin.kind === 'npc') {
    return (
      <Text
        style={[styles.cardName, compact && styles.cardNameCompact]}
        numberOfLines={compact ? 1 : 2}
      >
        {getNpcDisplayName(t, skin.id)}
      </Text>
    );
  }
  return <PlayerSkinName id={skin.id as PlayerCharacterId} compact={compact} />;
}

function PlayerSkinName({ id, compact }: { id: PlayerCharacterId; compact?: boolean }) {
  const labels = useCharacterLabels(id);
  return (
    <Text
      style={[styles.cardName, compact && styles.cardNameCompact]}
      numberOfLines={compact ? 1 : 2}
    >
      {labels.name}
    </Text>
  );
}

function SlotPreview({
  label,
  skin,
  active,
  onPress,
}: {
  label: string;
  skin: LocalDuelSkin;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(active) }}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.slotCard, active && styles.slotCardActive]}
    >
      <Text style={styles.slotLabel}>{label}</Text>
      <View style={styles.slotPortrait}>
        <LocalDuelSkinSprite
          skin={skin}
          width={SLOT_PORTRAIT_W}
          height={SLOT_PORTRAIT_H}
          pose="idle"
        />
      </View>
      <SkinName skin={skin} compact />
    </Pressable>
  );
}

function HeaderNextButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={10}
      onPress={() => {
        void play('ready_click');
        void trigger('selection');
        onPress();
      }}
      style={styles.headerNext}
    >
      <Text style={styles.headerNextText}>{label}</Text>
    </Pressable>
  );
}

export default function LocalSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('menu');

  const preset = useSettingsStore((s) => s.localMatchPreset);
  const setPreset = useSettingsStore((s) => s.setLocalMatchPreset);
  const p1Skin = useSettingsStore((s) => s.localP1Skin);
  const p2Skin = useSettingsStore((s) => s.localP2Skin);
  const setLocalP1Skin = useSettingsStore((s) => s.setLocalP1Skin);
  const setLocalP2Skin = useSettingsStore((s) => s.setLocalP2Skin);

  const [step, setStep] = useState<SetupStep>('characters');
  const [activeSlot, setActiveSlot] = useState<Slot>('p1');

  const leaveSetup = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/menu');
  }, [router]);

  const onBack = useCallback(() => {
    if (step === 'rounds') {
      setStep('characters');
      return;
    }
    leaveSetup();
  }, [leaveSetup, step]);

  const goNext = useCallback(() => {
    setStep('rounds');
  }, []);

  const goDuel = useCallback(
    (p: LocalMatchPreset) => {
      const matchParam: Record<LocalMatchPreset, '3' | '5' | '7'> = {
        bo3: '3',
        bo5: '5',
        bo7: '7',
      };
      setPreset(p);
      router.push({
        pathname: '/game/local',
        params: {
          matchType: matchParam[p],
          p1Skin: encodeLocalDuelSkin(p1Skin),
          p2Skin: encodeLocalDuelSkin(p2Skin),
        },
      });
    },
    [p1Skin, p2Skin, router, setPreset],
  );

  const pickSkin = useCallback(
    (skin: LocalDuelSkin) => {
      if (activeSlot === 'p1') setLocalP1Skin(skin);
      else setLocalP2Skin(skin);
    },
    [activeSlot, setLocalP1Skin, setLocalP2Skin],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => <MenuBackButton onPress={onBack} />,
          headerRight:
            step === 'characters'
              ? () => <HeaderNextButton label={t('localDuel.next')} onPress={goNext} />
              : undefined,
        }}
      />
      <MetaScreenShell>
        {step === 'characters' ? (
          <View style={styles.root}>
            <View style={styles.topFixed}>
              <Text style={[styles.title, { fontFamily: FONT_RYE }]}>
                {t('localDuel.selectCharacters')}
              </Text>
              <Text style={styles.sub}>{t('localDuel.sub')}</Text>
              <Text style={styles.pickHint}>
                {activeSlot === 'p1' ? t('localDuel.pickingP1') : t('localDuel.pickingP2')}
              </Text>
              <View style={styles.slotRow}>
                <SlotPreview
                  label="P1"
                  skin={p1Skin}
                  active={activeSlot === 'p1'}
                  onPress={() => setActiveSlot('p1')}
                />
                <SlotPreview
                  label="P2"
                  skin={p2Skin}
                  active={activeSlot === 'p2'}
                  onPress={() => setActiveSlot('p2')}
                />
              </View>
              <Text style={styles.rosterTitle}>{t('localDuel.rosterTitle')}</Text>
            </View>

            <FlatList
              style={styles.rosterList}
              contentContainerStyle={[
                styles.rosterContent,
                { paddingBottom: insets.bottom + 16 },
              ]}
              data={SKINS}
              keyExtractor={(item) => encodeLocalDuelSkin(item)}
              numColumns={3}
              showsVerticalScrollIndicator={false}
              columnWrapperStyle={styles.gridRow}
              renderItem={({ item }) => {
                const selected =
                  isSameLocalDuelSkin(item, p1Skin) || isSameLocalDuelSkin(item, p2Skin);
                const selectedForActive =
                  activeSlot === 'p1'
                    ? isSameLocalDuelSkin(item, p1Skin)
                    : isSameLocalDuelSkin(item, p2Skin);
                return (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectedForActive }}
                    onPress={() => pickSkin(item)}
                    style={[
                      styles.gridCard,
                      selected && styles.gridCardUsed,
                      selectedForActive && styles.gridCardActive,
                    ]}
                  >
                    <Text style={styles.cardId}>
                      {item.kind === 'player' ? 'P' : 'N'}
                      {String(item.id).padStart(2, '0')}
                    </Text>
                    <View style={styles.gridPortrait}>
                      <LocalDuelSkinSprite
                        skin={item}
                        width={PORTRAIT_W}
                        height={PORTRAIT_H}
                        pose="idle"
                      />
                    </View>
                    <SkinName skin={item} />
                  </Pressable>
                );
              }}
            />
          </View>
        ) : (
          <View style={[styles.roundsRoot, { paddingBottom: insets.bottom + 24 }]}>
            <Text style={[styles.title, { fontFamily: FONT_RYE }]}>
              {t('localDuel.selectRounds')}
            </Text>
            <Text style={styles.sub}>{t('localDuel.roundsSub')}</Text>

            <View style={styles.slotRow}>
              <SlotPreview label="P1" skin={p1Skin} />
              <SlotPreview label="P2" skin={p2Skin} />
            </View>

            <Text style={styles.presetHint}>
              {t('localDuel.defaultPreset', {
                rounds: LOCAL_MATCH_PRESETS[preset].maxRounds,
                wins: LOCAL_MATCH_PRESETS[preset].winsRequired,
              })}
            </Text>

            <View style={styles.roundButtons}>
              {(['bo3', 'bo5', 'bo7'] as const).map((key) => {
                const cfg = LOCAL_MATCH_PRESETS[key];
                const active = preset === key;
                return (
                  <WoodButton
                    key={key}
                    title={t('localDuel.roundButton', {
                      rounds: cfg.maxRounds,
                      wins: cfg.winsRequired,
                    })}
                    onPress={() => goDuel(key)}
                    style={[styles.roundBtn, active && styles.roundBtnActive]}
                  />
                );
              })}
            </View>
          </View>
        )}
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  roundsRoot: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  topFixed: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 6,
  },
  rosterList: {
    flex: 1,
  },
  rosterContent: {
    paddingHorizontal: 16,
  },
  headerNext: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 4,
  },
  headerNextText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.ochre,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 22,
    color: colors.ochre,
    letterSpacing: 1.5,
  },
  sub: {
    color: colors.cream,
    opacity: 0.8,
    fontSize: 13,
    lineHeight: 18,
  },
  pickHint: {
    fontSize: 12,
    color: colors.ochre,
    fontWeight: '700',
  },
  rosterTitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '800',
    color: colors.cream,
    opacity: 0.9,
  },
  presetHint: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '700',
    color: colors.ochre,
  },
  roundButtons: {
    marginTop: 4,
    gap: 12,
  },
  roundBtn: {
    alignSelf: 'stretch',
  },
  roundBtnActive: {
    borderColor: colors.ochre,
  },
  slotRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 2,
  },
  slotCard: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.sand,
    backgroundColor: '#3D2414',
    alignItems: 'center',
    gap: 4,
  },
  slotCardActive: {
    borderColor: colors.ochre,
    backgroundColor: 'rgba(200, 134, 10, 0.14)',
  },
  slotLabel: {
    alignSelf: 'flex-start',
    fontSize: 11,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 1,
  },
  slotPortrait: {
    height: 78,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  gridRow: {
    gap: 8,
    marginBottom: 8,
  },
  gridCard: {
    flex: 1,
    maxWidth: '33%',
    padding: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 165, 112, 0.45)',
    backgroundColor: '#3D2414',
    alignItems: 'center',
    gap: 4,
  },
  gridCardUsed: {
    borderColor: colors.sand,
  },
  gridCardActive: {
    borderColor: colors.ochre,
    backgroundColor: 'rgba(200, 134, 10, 0.16)',
  },
  cardId: {
    alignSelf: 'flex-start',
    fontSize: 10,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 1,
  },
  gridPortrait: {
    height: 86,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  cardName: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.cream,
    textAlign: 'center',
    minHeight: 28,
  },
  cardNameCompact: {
    minHeight: 16,
    fontSize: 11,
  },
});
