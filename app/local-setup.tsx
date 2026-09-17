import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { WesternButton, WesternHeader } from '@/components/ui/western/WesternPrimitives';
import { CLARITY_NPCS, CLARITY_PLAYERS } from '@/constants/clarityCharacterAssets';
import type { PlayerCharacterId } from '@/constants/characters';
import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { encodeLocalDuelSkin, isSameLocalDuelSkin, listLocalDuelSkins, type LocalDuelSkin } from '@/constants/localDuelSkin';
import { uiV3Colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { LOCAL_MATCH_PRESETS, type LocalMatchPreset, useSettingsStore } from '@/store/settingsStore';
import { useCharacterLabels } from '@/utils/characterLabels';
import { getNpcDisplayName } from '@/utils/npcLabels';

type Slot = 'p1' | 'p2';
const SKINS = listLocalDuelSkins();
const sourceFor = (skin: LocalDuelSkin) =>
  (skin.kind === 'player' ? CLARITY_PLAYERS[skin.id] : CLARITY_NPCS[skin.id])?.idle;

function PlayerName({ id }: { id: number }) {
  const labels = useCharacterLabels(id as PlayerCharacterId);
  return <Text numberOfLines={2} style={[styles.name, usesCjkFont(labels.name) && styles.nameCjk]}>{labels.name}</Text>;
}
function SkinName({ skin }: { skin: LocalDuelSkin }) {
  const { t } = useTranslation();
  const npcName = skin.kind === 'npc' ? getNpcDisplayName(t, skin.id) : '';
  return skin.kind === 'player' ? <PlayerName id={skin.id} /> :
    <Text numberOfLines={2} style={[styles.name, usesCjkFont(npcName) && styles.nameCjk]}>{npcName}</Text>;
}

export default function LocalSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [step, setStep] = useState<'characters' | 'rounds'>('characters');
  const [activeSlot, setActiveSlot] = useState<Slot>('p1');
  const p1Skin = useSettingsStore(s => s.localP1Skin);
  const p2Skin = useSettingsStore(s => s.localP2Skin);
  const setP1 = useSettingsStore(s => s.setLocalP1Skin);
  const setP2 = useSettingsStore(s => s.setLocalP2Skin);
  const preset = useSettingsStore(s => s.localMatchPreset);
  const setPreset = useSettingsStore(s => s.setLocalMatchPreset);
  const activeSkin = activeSlot === 'p1' ? p1Skin : p2Skin;
  const artSize = Math.min(width - 64, Math.max(170, height * 0.32), 330);
  useScreenBgm('menu');

  const pick = useCallback((skin: LocalDuelSkin) => {
    if (activeSlot === 'p1') setP1(skin); else setP2(skin);
  }, [activeSlot, setP1, setP2]);
  const move = (direction: -1 | 1) => {
    const index = SKINS.findIndex(skin => isSameLocalDuelSkin(skin, activeSkin));
    pick(SKINS[(index + direction + SKINS.length) % SKINS.length]!);
  };
  const back = () => {
    if (step === 'rounds') setStep('characters');
    else router.replace('/menu');
  };
  const start = () => {
    const matchType = String(LOCAL_MATCH_PRESETS[preset].maxRounds);
    router.push({ pathname: '/game/local', params: {
      matchType, p1Skin: encodeLocalDuelSkin(p1Skin), p2Skin: encodeLocalDuelSkin(p2Skin),
    } });
  };
  const confirm = () => {
    if (activeSlot === 'p1') setActiveSlot('p2');
    else setStep('rounds');
  };

  return <>
    <Stack.Screen options={{ headerShown: false }} />
    <MetaScreenShell>
      <ScrollView contentContainerStyle={[styles.page, {
        paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 16),
        minHeight: height,
      }]} showsVerticalScrollIndicator={false}>
        <View style={styles.nav}><MenuBackButton onPress={back} variant="overlay" />
          <Text style={styles.eyebrow}>LOCAL DUEL · 2 PLAYERS</Text></View>
        <WesternHeader title={t(step === 'characters' ? 'localDuel.selectCharacters' : 'localDuel.selectRounds')} />
        <View style={styles.slots}>
          {(['p1', 'p2'] as const).map(slot => {
            const skin = slot === 'p1' ? p1Skin : p2Skin;
            return <Pressable key={slot} accessibilityRole="button"
              accessibilityLabel={slot.toUpperCase()}
              accessibilityState={{ selected: activeSlot === slot && step === 'characters' }}
              onPress={() => { setActiveSlot(slot); setStep('characters'); }}
              style={[styles.slot, activeSlot === slot && step === 'characters' && styles.active]}>
              <Image source={sourceFor(skin)} contentFit="contain" transition={0} style={styles.slotArt} />
              <View style={styles.slotCopy}><Text style={styles.slotLabel}>PLAYER {slot === 'p1' ? '1' : '2'}</Text><SkinName skin={skin} /></View>
            </Pressable>;
          })}
        </View>
        {step === 'characters' ? <>
          <Text style={styles.hint}>{t(activeSlot === 'p1' ? 'localDuel.pickingP1' : 'localDuel.pickingP2')}</Text>
          <View style={styles.stage}>
            <Pressable accessibilityRole="button" accessibilityLabel={t('meta.character.previous')} onPress={() => move(-1)} style={[styles.arrow, { left: 0 }]}>
              <Ionicons name="chevron-back" size={28} color={uiV3Colors.cream} />
            </Pressable>
            <Image source={sourceFor(activeSkin)} contentFit="contain" transition={0}
              style={{ width: artSize, height: artSize }} />
            <Pressable accessibilityRole="button" accessibilityLabel={t('meta.character.next')} onPress={() => move(1)} style={[styles.arrow, { right: 0 }]}>
              <Ionicons name="chevron-forward" size={28} color={uiV3Colors.cream} />
            </Pressable>
          </View>
          <View style={styles.identity}><SkinName skin={activeSkin} />
            <Text style={styles.eyebrow}>{activeSkin.kind === 'player' ? 'GUNSLINGER' : 'OUTLAW'} · {String(activeSkin.id).padStart(2, '0')}</Text></View>
          <FlatList horizontal data={SKINS} keyExtractor={encodeLocalDuelSkin}
            showsHorizontalScrollIndicator={false} style={styles.roster}
            contentContainerStyle={styles.rosterContent} extraData={activeSkin}
            renderItem={({ item }) => <Pressable accessibilityRole="button"
              accessibilityLabel={`${item.kind} ${item.id}`}
              accessibilityState={{ selected: isSameLocalDuelSkin(item, activeSkin) }}
              onPress={() => pick(item)} style={[styles.thumbnail, isSameLocalDuelSkin(item, activeSkin) && styles.active]}>
              <Image source={sourceFor(item)} contentFit="contain" transition={0} style={styles.thumbArt} />
              <Text style={styles.thumbLabel}>{item.kind === 'player' ? 'P' : 'N'}{String(item.id).padStart(2, '0')}</Text>
            </Pressable>} />
          <WesternButton variant="primary" title={`PLAYER ${activeSlot === 'p1' ? '1' : '2'} · ${t('meta.character.select')}`} onPress={confirm} />
        </> : <>
          <Text style={styles.hint}>{t('localDuel.roundsSub')}</Text>
          <View style={styles.roundChoices}>
            {(['bo3', 'bo5', 'bo7'] as const).map(key => <WesternButton key={key}
              variant={preset === key ? 'primary' : 'secondary'}
              title={`${preset === key ? '✓ ' : ''}${t('localDuel.roundButton', {
                rounds: LOCAL_MATCH_PRESETS[key].maxRounds, wins: LOCAL_MATCH_PRESETS[key].winsRequired,
              })}`} onPress={() => setPreset(key as LocalMatchPreset)} />)}
          </View>
          <View style={styles.instructions}><Text style={styles.instructionsTitle}>READY → STEADY → BANG!</Text>
            <Text style={styles.hint}>{t('localDuel.portraitInstructions')}</Text></View>
          <WesternButton title={t('meta.npc.duel')} variant="primary" onPress={start} />
        </>}
      </ScrollView>
    </MetaScreenShell>
  </>;
}
const styles = StyleSheet.create({
  page: { flexGrow: 1, paddingHorizontal: 18, gap: 12 },
  nav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 48 },
  eyebrow: { color: uiV3Colors.gold, fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
  slots: { flexDirection: 'row', gap: 10 },
  slot: { flex: 1, minHeight: 90, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#66503A', backgroundColor: 'rgba(18,11,7,0.9)', padding: 6 },
  active: { borderColor: '#F0CE96', backgroundColor: '#49301D' },
  slotArt: { width: 56, height: 76 },
  slotCopy: { flex: 1, gap: 5 },
  slotLabel: { color: uiV3Colors.gold, fontSize: 10, fontWeight: '900' },
  name: { color: uiV3Colors.cream, fontFamily: FONT_RYE, fontSize: 16, fontWeight: '800', letterSpacing: 0.4, textAlign: 'center', textShadowColor: '#090402', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  nameCjk: { fontFamily: FONT_WESTERN_SERIF, fontSize: 15, fontWeight: '700', letterSpacing: 0.65 },
  hint: { color: uiV3Colors.cream, fontSize: 13, lineHeight: 20, textAlign: 'center' },
  stage: { alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  arrow: { width: 40, height: 48, alignItems: 'center', justifyContent: 'center', position: 'absolute', zIndex: 1 },
  identity: { alignItems: 'center', gap: 6 },
  roster: { flexGrow: 0, height: 92 },
  rosterContent: { gap: 8 },
  thumbnail: { width: 62, height: 88, borderWidth: 1, borderColor: '#66503A', backgroundColor: 'rgba(20,12,8,0.9)', alignItems: 'center' },
  thumbArt: { width: 60, height: 66 },
  thumbLabel: { color: uiV3Colors.cream, fontSize: 10, fontWeight: '700' },
  roundChoices: { gap: 12, marginVertical: 14 },
  instructions: { borderWidth: 1, borderColor: '#695038', backgroundColor: 'rgba(18,11,7,0.9)', padding: 18, gap: 12 },
  instructionsTitle: { color: uiV3Colors.gold, fontFamily: FONT_RYE, fontSize: 17, textAlign: 'center' },
});
