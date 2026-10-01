import { Image } from 'expo-image';
import { Redirect, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions, type ImageSourcePropType } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ScaledCharacterArt } from '@/components/character/ScaledCharacterArt';
import {
  PRODUCTION_ART_CANVAS,
  REDESIGN_ART_KEYS,
  REDESIGN_ART_META,
  REDESIGN_STAGED_PALE_LOCKED_SILHOUETTE,
  REDESIGN_STAGED_SOURCES,
  STAGED_POSE_SLOTS,
  artDisplayScale,
  type RedesignArtKey,
  type StagedPoseSlot,
} from '@/constants/characterArtMetadata';
import { CLARITY_NPCS, CLARITY_PLAYERS } from '@/constants/clarityCharacterAssets';
import { gameImages } from '@/constants/gameImages';
import { POSTER_NPC_IDENTITIES } from '@/constants/posterCharacterAssets';
import { uiV3Colors } from '@/constants/theme';
import { V3_PALE_LOCKED_SILHOUETTE } from '@/constants/v3UiAssets';
import { NPC_DUEL_SCALE, npcLaneBox } from '@/utils/combatReaction';
import { CAPTURE_ROUTES_ENABLED } from '@/constants/captureRoutes';

type ScaleMode = 'comp' | 'raw';
type Backdrop = 'light' | 'dark';
type CompareView = 'new' | 'old' | 'overlay';

const LABELS = {
  title: 'Redesign art preview (DEV)',
  note: 'Staged art only. Live combat mapping is unchanged.',
  select: 'A · Select size',
  duel: 'B · Duel opponent size',
  locked: 'Locked silhouette',
  posterNote: 'Poster uses the production 1254 framing (display scale 1).',
} as const;

const PAPER = '#D9C39A';
const LIGHT_BG = '#E4E0D8';
const GROUND_LINE = 'rgba(239, 68, 68, 0.8)';
const OLD_OVERLAY_OPACITY = 0.45;

function pick<T extends string>(value: string | undefined, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

type PreviewParams = { char?: string; mode?: string; bg?: string; view?: string; only?: string; pose?: string };

/** DEV-only visual QA for the locked redesign masters at production UI sizes. */
export default function CharacterArtPreview() {
  const params = useLocalSearchParams<PreviewParams>();
  // The route stays mounted across deep links; remount so params re-seed the toggles.
  return <CharacterArtPreviewBody key={JSON.stringify(params)} params={params} />;
}

function CharacterArtPreviewBody({ params }: { params: PreviewParams }) {
  const { width, height } = useWindowDimensions();
  const [key, setKey] = useState<RedesignArtKey>(pick(params.char, REDESIGN_ART_KEYS, 'NPC15'));
  const [mode, setMode] = useState<ScaleMode>(pick(params.mode, ['comp', 'raw'] as const, 'comp'));
  const [backdrop, setBackdrop] = useState<Backdrop>(pick(params.bg, ['light', 'dark'] as const, 'dark'));
  const [view, setView] = useState<CompareView>(pick(params.view, ['new', 'old', 'overlay'] as const, 'new'));
  const [pose, setPose] = useState<StagedPoseSlot>(pick(params.pose, STAGED_POSE_SLOTS, 'idle'));
  if (!CAPTURE_ROUTES_ENABLED) return <Redirect href="/" />;

  const meta = REDESIGN_ART_META[key];
  const staged = REDESIGN_STAGED_SOURCES[key];
  const scale = mode === 'comp' ? artDisplayScale(meta) : 1;
  const liveSet = meta.kind === 'player' ? CLARITY_PLAYERS[meta.id] : CLARITY_NPCS[meta.id];
  const liveIdle = liveSet?.idle;
  const livePoster = meta.kind === 'npc' ? POSTER_NPC_IDENTITIES[meta.id] : undefined;
  if (!staged || !liveIdle) return <Redirect href="/" />;
  // Capture helper: `only=select|duel` renders a single section so it fits one screenshot.
  const showSelect = params.only !== 'duel';
  const showDuel = params.only !== 'select';
  const stagedPose = pose === 'idle' ? staged.idle : staged.poses?.[pose];
  const livePose = liveSet?.[pose] ?? liveIdle;
  const availablePoses = STAGED_POSE_SLOTS.filter((p) => p === 'idle' || staged.poses?.[p] != null);

  // Same formulas as CharacterSelector / NpcWantedCard / NpcFirstPersonDuelArena (portrait).
  const playerArt = Math.min(width * 0.78, 340);
  const posterHeight = Math.max(448, Math.min(466, height * 0.484));
  const cardInner = Math.min(width * 0.79, 360) - 32;
  const posterArt = Math.min(256, posterHeight - 192);
  const posterSlot = Math.min(270, posterHeight - 190);
  const duelBox = npcLaneBox({ baseSize: Math.min(width * 0.48, height * 0.29), footY: 0, scale: NPC_DUEL_SCALE }).size;
  const duelGroundY = duelBox * (meta.frameGroundY / PRODUCTION_ART_CANVAS);
  const laneHeadroom = duelBox * 0.25;

  const renderPair = (size: number, newSource: ImageSourcePropType, oldSource: ImageSourcePropType, newScale: number) => (
    <View style={{ width: size, height: size }}>
      {view !== 'new' ? <ScaledCharacterArt source={oldSource} size={size} opacity={view === 'overlay' ? OLD_OVERLAY_OPACITY : 1} style={StyleSheet.absoluteFill} /> : null}
      {view !== 'old' ? <ScaledCharacterArt source={newSource} size={size} displayScale={newScale} style={StyleSheet.absoluteFill} /> : null}
    </View>
  );

  return (
    <SafeAreaView edges={['top', 'bottom']} style={[styles.root, backdrop === 'light' && styles.rootLight]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, backdrop === 'light' && styles.textDark]}>{LABELS.title}</Text>
        <Text style={[styles.note, backdrop === 'light' && styles.textDark]}>{LABELS.note}</Text>
        <View style={styles.row}>{REDESIGN_ART_KEYS.map((k) => <Chip key={k} label={k} active={k === key} onPress={() => setKey(k)} />)}</View>
        <View style={styles.row}>
          <Chip label={`COMPENSATED ×${artDisplayScale(meta).toFixed(3)}`} active={mode === 'comp'} onPress={() => setMode('comp')} />
          <Chip label="RAW ×1" active={mode === 'raw'} onPress={() => setMode('raw')} />
        </View>
        <View style={styles.row}>
          <Chip label="DARK" active={backdrop === 'dark'} onPress={() => setBackdrop('dark')} />
          <Chip label="LIGHT" active={backdrop === 'light'} onPress={() => setBackdrop('light')} />
          <Chip label="NEW" active={view === 'new'} onPress={() => setView('new')} />
          <Chip label="OLD" active={view === 'old'} onPress={() => setView('old')} />
          <Chip label="OVERLAY" active={view === 'overlay'} onPress={() => setView('overlay')} />
        </View>
        <View style={styles.row}>
          {availablePoses.map((p) => <Chip key={p} label={p === 'down' ? 'DOWN (KNEEL)' : p.toUpperCase()} active={p === pose} onPress={() => setPose(p)} />)}
        </View>

        {showSelect ? <Text style={[styles.section, backdrop === 'light' && styles.textDark]}>{LABELS.select}</Text> : null}
        {!showSelect ? null : meta.kind === 'player' ? (
          <View style={[styles.selectStage, { height: playerArt }]}>{renderPair(playerArt, staged.idle, liveIdle, scale)}</View>
        ) : (
          <>
            <View style={[styles.card, { width: cardInner + 32, height: posterSlot + 24 }]}>
              {renderPair(posterArt, staged.poster ?? staged.idle, livePoster ?? liveIdle, 1)}
            </View>
            <Text style={[styles.note, backdrop === 'light' && styles.textDark]}>{LABELS.posterNote}</Text>
            {key === 'NPC22' && REDESIGN_STAGED_PALE_LOCKED_SILHOUETTE ? (
              <>
                <Text style={[styles.section, backdrop === 'light' && styles.textDark]}>{LABELS.locked}</Text>
                <View style={[styles.card, styles.lockedRow, { width: cardInner + 32, height: posterSlot + 24 }]}>
                  <Image source={V3_PALE_LOCKED_SILHOUETTE} contentFit="contain" style={{ width: cardInner / 2, height: posterArt }} />
                  <Image source={REDESIGN_STAGED_PALE_LOCKED_SILHOUETTE} contentFit="contain" style={{ width: cardInner / 2, height: posterArt }} />
                </View>
              </>
            ) : null}
          </>
        )}

        {showDuel ? <Text style={[styles.section, backdrop === 'light' && styles.textDark]}>{LABELS.duel}</Text> : null}
        {showDuel ? <View style={[styles.duelLane, { width, height: duelBox + laneHeadroom * 2 }, backdrop === 'light' && styles.duelLaneLight]}>
          {backdrop === 'dark' ? <Image source={gameImages.duelBgNightFull} contentFit="cover" style={StyleSheet.absoluteFill} /> : null}
          <View style={[styles.groundLine, { top: laneHeadroom + duelGroundY }]} />
          <View style={{ position: 'absolute', top: laneHeadroom, left: (width - duelBox) / 2 }}>
            {renderPair(duelBox, stagedPose ?? staged.idle, livePose, scale)}
          </View>
        </View> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: uiV3Colors.background },
  rootLight: { backgroundColor: LIGHT_BG },
  content: { paddingBottom: 48, alignItems: 'center', gap: 8 },
  title: { color: uiV3Colors.cream, fontSize: 16, fontWeight: '800', marginTop: 8 },
  note: { color: uiV3Colors.dustGray, fontSize: 11, textAlign: 'center', paddingHorizontal: 16 },
  textDark: { color: uiV3Colors.darkBrown },
  section: { color: uiV3Colors.gold, fontSize: 13, fontWeight: '700', marginTop: 12, alignSelf: 'flex-start', paddingHorizontal: 16 },
  row: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, paddingHorizontal: 12 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 4, borderWidth: 1, borderColor: uiV3Colors.dustGray },
  chipActive: { backgroundColor: uiV3Colors.gold, borderColor: uiV3Colors.gold },
  chipText: { color: uiV3Colors.dustGray, fontSize: 11, fontWeight: '700' },
  chipTextActive: { color: uiV3Colors.darkBrown },
  selectStage: { alignItems: 'center', justifyContent: 'center' },
  // Mirrors the NpcWantedCard art area: overflow hidden at the card bounds.
  card: { backgroundColor: PAPER, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', borderRadius: 2 },
  lockedRow: { flexDirection: 'row', gap: 12 },
  // Screen-width lane: clipping matches the device edge in the duel.
  duelLane: { overflow: 'hidden', backgroundColor: uiV3Colors.voidBlack },
  duelLaneLight: { backgroundColor: LIGHT_BG },
  groundLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: GROUND_LINE },
});
