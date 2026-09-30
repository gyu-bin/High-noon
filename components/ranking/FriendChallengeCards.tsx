import { Image } from 'expo-image';
import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';

import { RankingPortrait } from '@/components/ranking/RankingPortrait';
import { WesternPanel } from '@/components/ui/western/WesternPrimitives';
import { FONT_RYE, FONT_WESTERN_SERIF, usesCjkFont } from '@/constants/fonts';
import { uiV3Colors } from '@/constants/theme';
import { formatReactionMs } from '@/utils/formatReactionMs';

// Existing V3 textures only (NEW ART = 0).
const wantedPaper = require('@/high_noon_terra_asset_pack/output/ui/textures/wanted_paper.png');

const INK = '#2D160E';
const INK_SOFT = '#5B3521';
const CODE_LENGTH = 6;

/** Parchment is reserved for the invitation, the code and the opponent Wanted. */
export function ParchmentSheet({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return (
    <WesternPanel variant="plain" style={[styles.sheet, style]}>
      <Image source={wantedPaper} contentFit="cover" style={styles.paper} />
      {children}
    </WesternPanel>
  );
}

function Stamp({ label }: { label: string }) {
  return (
    <View style={styles.stamp}>
      <Text style={styles.stampText}>{label}</Text>
    </View>
  );
}

function StatLine({ label, ms }: { label: string; ms: number | null | undefined }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{ms == null ? '—' : `${formatReactionMs(ms)}ms`}</Text>
    </View>
  );
}

/** Six ticket cells. `selectable` lets the player long-press to copy the code. */
function CodeCells({ code, active = -1, dim = false }: { code: string; active?: number; dim?: boolean }) {
  return (
    <View style={styles.cells} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: CODE_LENGTH }, (_, i) => (
        <View key={i} style={[styles.cell, i === active && styles.cellActive, dim && styles.cellDim]}>
          <Text style={styles.cellText}>{code[i] ?? ''}</Text>
        </View>
      ))}
    </View>
  );
}

export function ChallengeTicket({
  code,
  eyebrow,
  caption,
  expiryLabel,
  children,
}: {
  code: string;
  eyebrow: string;
  caption: string;
  expiryLabel: string | null;
  children?: ReactNode;
}) {
  return (
    <ParchmentSheet>
      <View style={styles.ticketHead}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        {expiryLabel ? <Text style={styles.expiry}>{expiryLabel}</Text> : null}
      </View>
      <View>
        <CodeCells code={code} />
        {/* Transparent twin over the cells: a long-press selects and copies the whole code. */}
        <Text selectable accessibilityLabel={code} style={styles.selectableCode}>
          {code}
        </Text>
      </View>
      <Text style={styles.caption}>{caption}</Text>
      {children ? <View style={styles.ticketActions}>{children}</View> : null}
    </ParchmentSheet>
  );
}

/**
 * Visually six ticket cells; underneath, one ordinary TextInput (stable
 * keyboard, paste, autofill). Tapping anywhere on the ticket focuses it.
 */
export function ChallengeCodeInput({
  value,
  onChangeText,
  onSubmit,
  label,
  disabled = false,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSubmit: () => void;
  label: string;
  disabled?: boolean;
}) {
  const inputRef = useRef<TextInput>(null);
  return (
    <Pressable
      accessibilityRole="none"
      onPress={() => inputRef.current?.focus()}
      style={styles.inputWrap}
    >
      <CodeCells code={value} active={disabled ? -1 : Math.min(value.length, CODE_LENGTH - 1)} dim={disabled} />
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onSubmitEditing={onSubmit}
        editable={!disabled}
        autoCapitalize="characters"
        autoCorrect={false}
        autoComplete="off"
        spellCheck={false}
        maxLength={CODE_LENGTH}
        returnKeyType="go"
        caretHidden
        accessibilityLabel={label}
        style={styles.hiddenInput}
      />
    </Pressable>
  );
}

export function MyChallengeCard({
  characterId,
  alias,
  bestMs,
  avgMs,
  labels,
  footer,
}: {
  characterId: number;
  alias: string;
  bestMs: number | null;
  avgMs: number | null;
  labels: { title: string; best: string; avg: string; unranked: string; note: string };
  footer?: ReactNode;
}) {
  return (
    <ParchmentSheet>
      <View style={styles.cardHead}>
        <Text style={styles.cardTitle}>{labels.title}</Text>
        <Stamp label={labels.unranked} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.portrait}>
          <RankingPortrait width={112} height={150} characterId={characterId} />
        </View>
        <View style={styles.details}>
          <Text numberOfLines={2} style={styles.alias}>
            {alias}
          </Text>
          <View style={styles.rule} />
          <StatLine label={labels.best} ms={bestMs} />
          <StatLine label={labels.avg} ms={avgMs} />
        </View>
      </View>
      <Text style={[styles.note, usesCjkFont(labels.note) && styles.cjk]}>{labels.note}</Text>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </ParchmentSheet>
  );
}

export function ChallengeWantedCard({
  characterId,
  alias,
  bestMs,
  avgMs,
  expiryLabel,
  labels,
}: {
  characterId: number;
  alias: string;
  bestMs: number | null;
  avgMs: number | null;
  expiryLabel: string | null;
  labels: { wanted: string; best: string; avg: string; unranked: string; recordDuel: string };
}) {
  return (
    <ParchmentSheet style={styles.wanted}>
      <Text style={styles.wantedTitle}>{labels.wanted}</Text>
      <Text style={styles.recordDuel}>{labels.recordDuel}</Text>
      <View style={styles.wantedArt}>
        <RankingPortrait width={150} height={200} characterId={characterId} />
      </View>
      <Text numberOfLines={2} style={[styles.alias, styles.wantedAlias]}>
        {alias}
      </Text>
      <View style={styles.rule} />
      <View style={styles.wantedStats}>
        <StatLine label={labels.best} ms={bestMs} />
        <StatLine label={labels.avg} ms={avgMs} />
      </View>
      <View style={styles.wantedFoot}>
        <Stamp label={labels.unranked} />
        {expiryLabel ? <Text style={styles.expiry}>{expiryLabel}</Text> : null}
      </View>
    </ParchmentSheet>
  );
}

/** Dark leather notice for states (invalid / expired / offline / own / settled). */
export function ChallengeNotice({ title, body }: { title: string; body: string }) {
  return (
    <WesternPanel style={styles.notice}>
      <Text style={styles.noticeTitle}>{title}</Text>
      <Text style={[styles.noticeBody, usesCjkFont(body) && styles.cjk]}>{body}</Text>
    </WesternPanel>
  );
}

const styles = StyleSheet.create({
  sheet: {
    borderColor: '#B68043',
    backgroundColor: '#C79A61',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.42,
    shadowRadius: 7,
    elevation: 6,
  },
  paper: { ...StyleSheet.absoluteFillObject, opacity: 0.88 },
  ticketHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  eyebrow: { color: INK, fontFamily: FONT_RYE, fontSize: 12, letterSpacing: 2.4 },
  expiry: { color: '#7A2B12', fontFamily: FONT_RYE, fontSize: 9, letterSpacing: 1.2 },
  cells: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  cell: {
    width: 40,
    height: 52,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: 'rgba(65,31,17,0.55)',
    backgroundColor: 'rgba(255,240,210,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellActive: { borderColor: '#7A2B12', backgroundColor: 'rgba(255,240,210,0.5)' },
  cellDim: { opacity: 0.55 },
  cellText: { color: INK, fontFamily: FONT_RYE, fontSize: 26 },
  selectableCode: {
    ...StyleSheet.absoluteFillObject,
    lineHeight: 52,
    textAlign: 'center',
    color: 'transparent',
    fontSize: 30,
    letterSpacing: 18,
  },
  caption: { color: INK_SOFT, fontFamily: FONT_WESTERN_SERIF, fontSize: 11, textAlign: 'center', marginTop: 10 },
  ticketActions: { marginTop: 12, gap: 8 },
  inputWrap: { paddingVertical: 4 },
  hiddenInput: { ...StyleSheet.absoluteFillObject, opacity: 0.02, color: 'transparent' },
  cardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: INK, fontFamily: FONT_RYE, fontSize: 20, letterSpacing: 1.6 },
  stamp: {
    borderWidth: 1.5,
    borderColor: '#8B2500',
    borderRadius: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    transform: [{ rotate: '-4deg' }],
  },
  stampText: { color: '#8B2500', fontFamily: FONT_RYE, fontSize: 10, letterSpacing: 1.6 },
  cardBody: { flexDirection: 'row', alignItems: 'flex-end', marginTop: 4 },
  portrait: { width: 116, height: 150, alignItems: 'center', justifyContent: 'flex-end', marginLeft: -8 },
  details: { flex: 1, gap: 6, paddingLeft: 6, paddingBottom: 12 },
  alias: { color: INK, fontFamily: FONT_RYE, fontSize: 18, lineHeight: 22 },
  rule: { height: 1, backgroundColor: 'rgba(65,31,17,0.34)' },
  statRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 },
  statLabel: { color: INK_SOFT, fontFamily: FONT_RYE, fontSize: 10, letterSpacing: 1 },
  statValue: { color: '#2B150D', fontFamily: FONT_RYE, fontSize: 15 },
  note: { color: INK_SOFT, fontSize: 11, textAlign: 'center', marginTop: 8 },
  cjk: { fontFamily: FONT_WESTERN_SERIF },
  footer: { marginTop: 12, gap: 8 },
  wanted: { alignItems: 'stretch' },
  wantedTitle: { color: INK, fontFamily: FONT_RYE, fontSize: 34, letterSpacing: 4, textAlign: 'center' },
  recordDuel: { color: INK_SOFT, fontFamily: FONT_RYE, fontSize: 10, letterSpacing: 2.4, textAlign: 'center', marginTop: -2 },
  wantedArt: { alignItems: 'center', height: 200, marginTop: 4 },
  wantedAlias: { textAlign: 'center', fontSize: 22, lineHeight: 26, marginVertical: 6 },
  wantedStats: { gap: 4, marginTop: 8, paddingHorizontal: 12 },
  wantedFoot: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  notice: { alignItems: 'center', gap: 6 },
  noticeTitle: { color: uiV3Colors.gold, fontFamily: FONT_RYE, fontSize: 16, letterSpacing: 1.6, textAlign: 'center' },
  noticeBody: { color: uiV3Colors.cream, fontSize: 12, textAlign: 'center', lineHeight: 17 },
});
