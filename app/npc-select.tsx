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
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { MaskedLegendCard } from '@/components/npc/MaskedLegendCard';
import { NpcSelectCard } from '@/components/npc/NpcSelectCard';
import { colors } from '@/constants/theme';
import { getNpcById, NPCS } from '@/constants/npcs';
import {
  selectPaleRiderUnlocked,
  useProgressStore,
} from '@/store/progressStore';
import type { NpcDefinition } from '@/types/npc';
import { formatReactionMs } from '@/utils/formatReactionMs';

/** 레전드 공개: #18 레드 아이 오라클 클리어 후 */
const MASTER_LEGEND_GATE_ID = 18;

const GRID_COLUMNS = 3;

type GridCell =
  | { type: 'npc'; key: string; npc: NpcDefinition; revealDelayMs?: number }
  | { type: 'masked'; key: string }
  | { type: 'empty'; key: string };

function buildGridCells(
  masterLegendGateCleared: boolean,
  legendRevealBurst: number,
  paleUnlocked: boolean,
): GridCell[] {
  const cells: GridCell[] = [];

  for (let id = 1; id <= 18; id++) {
    const npc = getNpcById(id);
    if (!npc) continue;
    cells.push({ type: 'npc', key: `npc-${id}`, npc });
  }

  if (!masterLegendGateCleared) {
    for (const id of [19, 20, 21]) {
      cells.push({ type: 'masked', key: `masked-${id}` });
    }
  } else {
    for (let id = 19; id <= 21; id++) {
      const npc = getNpcById(id)!;
      cells.push({
        type: 'npc',
        key: `npc-${id}`,
        npc,
        revealDelayMs:
          legendRevealBurst > 0 ? (id - 19) * 90 : undefined,
      });
    }
  }

  if (paleUnlocked) {
    const pale = getNpcById(22);
    if (pale) cells.push({ type: 'npc', key: 'npc-22', npc: pale });
  }

  while (cells.length % GRID_COLUMNS !== 0) {
    cells.push({ type: 'empty', key: `empty-${cells.length}` });
  }

  return cells;
}

function NpcSelectStatsHeader({ paleUnlocked }: { paleUnlocked: boolean }) {
  const avg = useProgressStore((s) => {
    if (s.reactionAggregate.count <= 0) return null;
    return s.reactionAggregate.sumMs / s.reactionAggregate.count;
  });
  const clearCount = useProgressStore((s) => {
    let n = 0;
    for (const npc of NPCS) {
      if (s.npcById[npc.id]?.cleared) n += 1;
    }
    return n;
  });
  const total = paleUnlocked ? NPCS.length : NPCS.length - 1;

  return (
    <View style={styles.statsBar}>
      <Text style={styles.statsText}>
        평균 반응{' '}
        <Text style={styles.statsValue}>
          {avg != null ? `${formatReactionMs(avg)} ms` : '—'}
        </Text>
      </Text>
      <Text style={styles.statsText}>
        클리어{' '}
        <Text style={styles.statsValue}>
          {clearCount} / {total}
        </Text>
      </Text>
    </View>
  );
}

export default function NpcSelectScreen() {
  const router = useRouter();
  useScreenBgm('menu');
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

  const cells = useMemo(
    () => buildGridCells(masterLegendGateCleared, legendRevealBurst, paleUnlocked),
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

  const renderItem: ListRenderItem<GridCell> = useCallback(
    ({ item }) => {
      if (item.type === 'empty') {
        return <View style={styles.emptyCell} />;
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
      return (
        <NpcSelectCard
          npc={npc}
          locked={locked}
          cleared={row.cleared}
          bestMs={row.bestReactionMs}
          revealDelayMs={item.revealDelayMs}
          onPress={locked ? undefined : () => onSelect(npc)}
        />
      );
    },
    [highestUnlocked, npcById, onSelect, paleUnlocked],
  );

  const keyExtractor = useCallback((item: GridCell) => item.key, []);

  return (
    <>
      <Stack.Screen
        options={{
          headerTransparent: false,
          headerBackVisible: false,
          headerLeft: () => <MenuBackButton onPress={() => router.back()} />,
        }}
      />
      <PhoneStageShell>
        <View style={[styles.root, { paddingBottom: insets.bottom + 16 }]}>
          <NpcSelectStatsHeader paleUnlocked={paleUnlocked} />
          <FlatList
            data={cells}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            numColumns={GRID_COLUMNS}
            style={styles.listFlex}
            contentContainerStyle={styles.list}
            columnWrapperStyle={styles.row}
            extraData={{ highestUnlocked, npcById, legendRevealBurst, paleUnlocked }}
          />
        </View>
      </PhoneStageShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.darkBrown,
  },
  listFlex: {
    flex: 1,
  },
  list: {
    paddingHorizontal: 8,
    paddingTop: 4,
    paddingBottom: 12,
  },
  row: {
    justifyContent: 'flex-start',
  },
  emptyCell: {
    flex: 1,
    marginHorizontal: 4,
    marginBottom: 10,
    minHeight: 148,
  },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginHorizontal: 8,
    marginTop: 10,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(60, 36, 20, 0.92)',
    borderWidth: 1,
    borderColor: colors.sand,
  },
  statsText: {
    fontSize: 15,
    color: colors.cream,
    fontWeight: '600',
  },
  statsValue: {
    color: colors.ochre,
    fontWeight: '800',
  },
});
