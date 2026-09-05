import { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { LocalDuelSkinSprite } from '@/components/game/CharacterSprites';
import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { WoodButton } from '@/components/ui/WoodButton';
import { FONT_RYE } from '@/constants/fonts';
import type { PlayerCharacterId } from '@/constants/characters';
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
import { useCharacterLabels } from '@/utils/characterLabels';
import { getNpcDisplayName } from '@/utils/npcLabels';

type Slot = 'p1' | 'p2';

const SKINS = listLocalDuelSkins();
const PORTRAIT_W = 72;
const PORTRAIT_H = 82;

function SkinName({ skin }: { skin: LocalDuelSkin }) {
  const { t } = useTranslation();
  if (skin.kind === 'npc') {
    return (
      <Text style={styles.cardName} numberOfLines={2}>
        {getNpcDisplayName(t, skin.id)}
      </Text>
    );
  }
  return <PlayerSkinName id={skin.id as PlayerCharacterId} />;
}

function PlayerSkinName({ id }: { id: PlayerCharacterId }) {
  const labels = useCharacterLabels(id);
  return (
    <Text style={styles.cardName} numberOfLines={2}>
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
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={[styles.slotCard, active && styles.slotCardActive]}
    >
      <Text style={styles.slotLabel}>{label}</Text>
      <View style={styles.slotPortrait}>
        <LocalDuelSkinSprite skin={skin} width={PORTRAIT_W} height={PORTRAIT_H} pose="idle" />
      </View>
      <SkinName skin={skin} />
    </Pressable>
  );
}

export default function LocalSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('menu');
  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/menu');
  }, [router]);

  const preset = useSettingsStore((s) => s.localMatchPreset);
  const setPreset = useSettingsStore((s) => s.setLocalMatchPreset);
  const p1Skin = useSettingsStore((s) => s.localP1Skin);
  const p2Skin = useSettingsStore((s) => s.localP2Skin);
  const setLocalP1Skin = useSettingsStore((s) => s.setLocalP1Skin);
  const setLocalP2Skin = useSettingsStore((s) => s.setLocalP2Skin);

  const [activeSlot, setActiveSlot] = useState<Slot>('p1');

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

  const activeCfg = LOCAL_MATCH_PRESETS[preset];
  const listHeader = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <Text style={[styles.title, { fontFamily: FONT_RYE }]}>
          {t('localDuel.selectRounds')}
        </Text>
        <Text style={styles.sub}>{t('localDuel.sub')}</Text>

        <Text style={styles.sectionTitle}>{t('localDuel.selectCharacters')}</Text>
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

        <Text style={styles.sectionTitle}>{t('localDuel.rosterTitle')}</Text>
      </View>
    ),
    [activeSlot, p1Skin, p2Skin, t],
  );

  const listFooter = useMemo(
    () => (
      <View style={styles.footerBlock}>
        <Text style={styles.presetHint}>
          {t('localDuel.defaultPreset', {
            rounds: activeCfg.maxRounds,
            wins: activeCfg.winsRequired,
          })}
        </Text>
        <View style={styles.row}>
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
                style={[styles.btn, active && styles.btnActive]}
              />
            );
          })}
        </View>
      </View>
    ),
    [activeCfg.maxRounds, activeCfg.winsRequired, goDuel, preset, t],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => <MenuBackButton onPress={onBack} />,
        }}
      />
      <MetaScreenShell>
        <FlatList
          style={styles.root}
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
          data={SKINS}
          keyExtractor={(item) => encodeLocalDuelSkin(item)}
          numColumns={3}
          ListHeaderComponent={listHeader}
          ListFooterComponent={listFooter}
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
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  headerBlock: {
    gap: 10,
    marginBottom: 12,
  },
  footerBlock: {
    marginTop: 18,
    gap: 12,
  },
  title: {
    fontSize: 26,
    color: colors.ochre,
    letterSpacing: 2,
  },
  sub: {
    color: colors.cream,
    opacity: 0.88,
    fontSize: 14,
    lineHeight: 21,
  },
  sectionTitle: {
    marginTop: 8,
    fontSize: 15,
    fontWeight: '800',
    color: colors.cream,
  },
  pickHint: {
    fontSize: 13,
    color: colors.ochre,
    fontWeight: '700',
  },
  slotRow: {
    flexDirection: 'row',
    gap: 12,
  },
  slotCard: {
    flex: 1,
    padding: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.sand,
    backgroundColor: '#3D2414',
    alignItems: 'center',
    gap: 6,
  },
  slotCardActive: {
    borderColor: colors.ochre,
    backgroundColor: 'rgba(200, 134, 10, 0.14)',
  },
  slotLabel: {
    alignSelf: 'flex-start',
    fontSize: 12,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 1,
  },
  slotPortrait: {
    height: 90,
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
  presetHint: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.ochre,
    letterSpacing: 0.3,
  },
  row: {
    gap: 14,
  },
  btn: {
    alignSelf: 'stretch',
  },
  btnActive: {
    borderColor: colors.ochre,
  },
});
