import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { MaskedLegendCard } from '@/components/npc/MaskedLegendCard';
import { NpcListTierHeader } from '@/components/npc/NpcListTierHeader';
import { NpcSelectCard } from '@/components/npc/NpcSelectCard';
import { colors } from '@/constants/theme';
import { NPCS } from '@/constants/npcs';
import { selectPaleRiderUnlocked, useProgressStore } from '@/store/progressStore';
import type { NpcDefinition, NpcTier } from '@/types/npc';

/** 레전드 티어 공개: 마스터 보스 #18 레드 아이 오라클 클리어 후 */
const MASTER_LEGEND_GATE_ID = 18;

const TIER_ORDER: NpcTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'master',
  'legend',
  'hidden',
];

const TIER_TITLE: Record<NpcTier, string> = {
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플래티넘',
  diamond: '다이아',
  master: '마스터',
  legend: '레전드',
  hidden: '???',
};

type FlatRow =
  | { type: 'header'; key: string; title: string; legendReveal?: boolean }
  | { type: 'npc'; key: string; npc: NpcDefinition; revealDelayMs?: number }
  | { type: 'masked'; key: string; id: number };

function buildRows(
  masterLegendGateCleared: boolean,
  legendRevealBurst: number,
  paleUnlocked: boolean,
): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const tier of TIER_ORDER) {
    if (tier === 'hidden') {
      if (!paleUnlocked) continue;
      rows.push({ type: 'header', key: 'header-hidden', title: TIER_TITLE.hidden });
      const hidden = NPCS.filter((n) => n.tier === 'hidden');
      for (const npc of hidden) {
        rows.push({ type: 'npc', key: `npc-${npc.id}`, npc });
      }
      continue;
    }

    if (tier === 'legend' && !masterLegendGateCleared) {
      rows.push({
        type: 'header',
        key: 'header-legend-hidden',
        title: '???',
      });
      for (const id of [19, 20, 21]) {
        rows.push({ type: 'masked', key: `masked-${id}`, id });
      }
      continue;
    }

    rows.push({
      type: 'header',
      key:
        tier === 'legend'
          ? `header-legend-${legendRevealBurst}`
          : `header-${tier}`,
      title: TIER_TITLE[tier],
      legendReveal: tier === 'legend' && masterLegendGateCleared && legendRevealBurst > 0,
    });

    const list = NPCS.filter((n) => n.tier === tier);
    for (const npc of list) {
      const revealDelayMs =
        tier === 'legend' && masterLegendGateCleared && legendRevealBurst > 0
          ? (npc.id - 19) * 90
          : undefined;
      rows.push({
        type: 'npc',
        key: `npc-${npc.id}`,
        npc,
        revealDelayMs,
      });
    }
  }
  return rows;
}

export default function NpcSelectScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const highestUnlocked = useProgressStore((s) => s.highestUnlockedNpcId);
  const npcById = useProgressStore((s) => s.npcById);
  const paleUnlocked = useProgressStore(() => selectPaleRiderUnlocked());
  const masterLegendGateCleared = npcById[MASTER_LEGEND_GATE_ID]?.cleared ?? false;

  const [legendRevealBurst, setLegendRevealBurst] = useState(0);
  const wasLegendHiddenRef = useRef(!masterLegendGateCleared);

  useEffect(() => {
    if (wasLegendHiddenRef.current && masterLegendGateCleared) {
      setLegendRevealBurst((n) => n + 1);
    }
    wasLegendHiddenRef.current = !masterLegendGateCleared;
  }, [masterLegendGateCleared]);

  const rows = useMemo(
    () => buildRows(masterLegendGateCleared, legendRevealBurst, paleUnlocked),
    [masterLegendGateCleared, legendRevealBurst, paleUnlocked],
  );

  const onSelect = useCallback(
    (npc: NpcDefinition) => {
      router.push({
        pathname: '/game/npc',
        params: { npcId: String(npc.id) },
      });
    },
    [router],
  );

  const renderItem: ListRenderItem<FlatRow> = useCallback(
    ({ item }) => {
      if (item.type === 'header') {
        const reveal = item.legendReveal ? 'spring' : undefined;
        return (
          <NpcListTierHeader title={item.title} revealAnimation={reveal} />
        );
      }
      if (item.type === 'masked') {
        return <MaskedLegendCard />;
      }
      const npc = item.npc;
      const locked =
        npc.id === 22
          ? !paleUnlocked
          : npc.secret === true
            ? !paleUnlocked
            : npc.id > highestUnlocked;
      const row = npcById[npc.id] ?? { cleared: false, bestReactionMs: null };
      const cleared = row.cleared;
      const bestMs = row.bestReactionMs;
      return (
        <NpcSelectCard
          npc={npc}
          locked={locked}
          cleared={cleared}
          bestMs={bestMs}
          revealDelayMs={item.revealDelayMs}
          onPress={locked ? undefined : () => onSelect(npc)}
        />
      );
    },
    [highestUnlocked, npcById, onSelect, paleUnlocked],
  );

  const keyExtractor = useCallback((item: FlatRow) => item.key, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: false,
          headerBackVisible: false,
          headerLeft: () => (
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={styles.headerBack}
              accessibilityRole="button"
              accessibilityLabel="뒤로, 이전 화면"
            >
              <Ionicons name="chevron-back" size={22} color={colors.cream} />
              <Text style={styles.headerBackLabel}>메뉴</Text>
            </Pressable>
          ),
        }}
      />
      <PhoneStageShell>
        <View style={[styles.root, { paddingBottom: insets.bottom + 16 }]}>
          <FlatList
            data={rows}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            style={styles.listFlex}
            contentContainerStyle={styles.list}
            extraData={{ highestUnlocked, npcById, legendRevealBurst, paleUnlocked }}
          />
        </View>
      </PhoneStageShell>
    </>
  );
}

const styles = StyleSheet.create({
  headerBack: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingRight: 10,
    marginLeft: 4,
  },
  headerBackLabel: {
    color: colors.cream,
    fontSize: 17,
    fontWeight: '600',
  },
  root: {
    flex: 1,
    backgroundColor: colors.darkBrown,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 28,
    paddingBottom: 12,
  },
});
