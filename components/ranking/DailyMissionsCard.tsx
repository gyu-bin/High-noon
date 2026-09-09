import { Ionicons } from '@expo/vector-icons';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FONT_RYE } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import {
  useDailyMissionStore,
  whenDailyMissionsReady,
} from '@/store/dailyMissionStore';
import { useProgressStore } from '@/store/progressStore';
import { getNpcDisplayName } from '@/utils/npcLabels';

type RowProps = {
  done: boolean;
  label: string;
};

function MissionRow({ done, label }: RowProps) {
  return (
    <View style={styles.row}>
      <Ionicons
        name={done ? 'checkbox' : 'square-outline'}
        size={18}
        color={done ? colors.gold : colors.sand}
      />
      <Text style={[styles.rowLabel, done && styles.rowDone]}>{label}</Text>
    </View>
  );
}

type Props = {
  /** 모달 안에서 쓸 때 — 결투 진입 전 시트를 닫는다 */
  onClose?: () => void;
};

export function DailyMissionsCard({ onClose }: Props) {
  const { t } = useTranslation();
  const router = useRouter();
  const ensureToday = useDailyMissionStore((s) => s.ensureToday);
  const todayBossNpcId = useDailyMissionStore((s) => s.todayBossNpcId);
  const rankingPlay = useDailyMissionStore((s) => s.rankingPlay);
  const rankingWin = useDailyMissionStore((s) => s.rankingWin);
  const todayBoss = useDailyMissionStore((s) => s.todayBoss);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    return whenDailyMissionsReady(() => {
      ensureToday(useProgressStore.getState().highestUnlockedNpcId);
      setReady(true);
    });
  }, [ensureToday]);

  const onFight = useCallback(() => {
    // Modal이 열린 채 push하면 네이티브 오버레이가 결투 화면을 가려 "멈춘 것처럼" 보인다
    onClose?.();
    requestAnimationFrame(() => {
      router.push({
        pathname: '/game/npc',
        params: { npcId: String(todayBossNpcId), fromDaily: '1' },
      } as Href);
    });
  }, [onClose, router, todayBossNpcId]);

  if (!ready) return null;

  const bossName = getNpcDisplayName(t, todayBossNpcId);
  const allDone = rankingPlay && rankingWin && todayBoss;

  return (
    <View style={styles.root}>
      <Text style={styles.sub}>{t('ranking.dailySub')}</Text>

      <View style={styles.bossSection}>
        <View style={styles.bossTop}>
          <Ionicons name="skull" size={18} color={colors.cream} />
          <Text style={styles.bossLabel}>{t('ranking.todayBoss')}</Text>
        </View>
        <Text style={[styles.bossName, { fontFamily: FONT_RYE }]} numberOfLines={1}>
          {bossName}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ranking.todayBossFight')}
          disabled={todayBoss}
          onPress={onFight}
          style={[styles.fightBtn, todayBoss && styles.fightBtnDone]}
        >
          <Text style={styles.fightText}>
            {todayBoss ? t('ranking.todayBossDone') : t('ranking.todayBossFight')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.list}>
        <MissionRow done={rankingPlay} label={t('ranking.missionPlay')} />
        <MissionRow done={rankingWin} label={t('ranking.missionWin')} />
        <MissionRow
          done={todayBoss}
          label={t('ranking.missionBoss', { name: bossName })}
        />
      </View>

      {allDone ? (
        <Text style={styles.allDone}>{t('ranking.dailyAllDone')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    gap: 12,
  },
  sub: {
    color: colors.sand,
    fontSize: 12,
    lineHeight: 18,
  },
  bossSection: {
    gap: 6,
    paddingTop: 2,
  },
  bossTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bossLabel: {
    color: colors.sand,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  bossName: {
    color: colors.cream,
    fontSize: 22,
    letterSpacing: 0.6,
  },
  fightBtn: {
    alignSelf: 'flex-start',
    marginTop: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#4A2E18',
    borderWidth: 2,
    borderColor: '#2C1810',
  },
  fightBtnDone: { opacity: 0.45 },
  fightText: {
    color: colors.ochre,
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    gap: 10,
    paddingTop: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rowLabel: {
    flex: 1,
    color: colors.cream,
    fontSize: 13,
  },
  rowDone: {
    color: colors.sand,
    textDecorationLine: 'line-through',
  },
  allDone: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
  },
});
