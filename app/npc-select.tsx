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
import { useProgressStore } from '@/store/progressStore';
import type { NpcDefinition, NpcTier } from '@/types/npc';

const MASTER_BOSS_ID = 17;

const TIER_ORDER: NpcTier[] = [
  'bronze',
  'silver',
  'gold',
  'platinum',
  'diamond',
  'master',
  'legend',
];

const TIER_TITLE: Record<NpcTier, string> = {
  bronze: '브론즈',
  silver: '실버',
  gold: '골드',
  platinum: '플래티넘',
  diamond: '다이아',
  master: '마스터',
  legend: '레전드',
};

type FlatRow =
  | { type: 'header'; key: string; title: string; legendReveal?: boolean }
  | { type: 'npc'; key: string; npc: NpcDefinition; revealDelayMs?: number }
  | { type: 'masked'; key: string; id: number };

function buildRows(masterBossCleared: boolean, legendRevealBurst: number): FlatRow[] {
  const rows: FlatRow[] = [];
  for (const tier of TIER_ORDER) {
    if (tier === 'legend' && !masterBossCleared) {
      rows.push({
        type: 'header',
        key: 'header-legend-hidden',
        title: '???',
      });
      for (const id of [18, 19, 20]) {
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
      legendReveal: tier === 'legend' && masterBossCleared && legendRevealBurst > 0,
    });

    const list = NPCS.filter((n) => n.tier === tier);
    for (const npc of list) {
      const revealDelayMs =
        tier === 'legend' && masterBossCleared && legendRevealBurst > 0
          ? (npc.id - 18) * 90
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
  const masterBossCleared = npcById[MASTER_BOSS_ID]?.cleared ?? false;

  const [legendRevealBurst, setLegendRevealBurst] = useState(0);
  const wasLegendHiddenRef = useRef(!masterBossCleared);

  useEffect(() => {
    if (wasLegendHiddenRef.current && masterBossCleared) {
      setLegendRevealBurst((n) => n + 1);
    }
    wasLegendHiddenRef.current = !masterBossCleared;
  }, [masterBossCleared]);

  const rows = useMemo(
    () => buildRows(masterBossCleared, legendRevealBurst),
    [masterBossCleared, legendRevealBurst],
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
      const locked = npc.id > highestUnlocked;
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
    [highestUnlocked, npcById, onSelect],
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
            extraData={{ highestUnlocked, npcById, legendRevealBurst }}
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
    /** 네비 헤더·노치와 첫 티어(브론즈) 라벨이 겹치지 않도록 여유 */
    paddingTop: 28,
    paddingBottom: 12,
  },
});
