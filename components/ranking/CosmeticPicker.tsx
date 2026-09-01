import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { RankingPortrait } from '@/components/ranking/RankingPortrait';
import { FONT_RYE } from '@/constants/fonts';
import {
  META_PANEL_BG,
  META_PANEL_BORDER,
} from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { getNpcById } from '@/constants/npcs';
import { selectPaleRiderUnlocked, useProgressStore } from '@/store/progressStore';
import { useRankingRewardStore } from '@/store/rankingRewardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { pvpSetCosmeticNpc } from '@/lib/supabase/pvpApi';
import { usePvpStore } from '@/store/pvpStore';
import { getNpcDisplayName } from '@/utils/npcLabels';
import { unlockedCosmeticNpcIds } from '@/utils/pvpRewards';
import { trigger } from '@/utils/hapticService';

type Props = {
  /** 모달 안에서 쓸 때 중복 제목 숨김 */
  compact?: boolean;
};

export function CosmeticPicker({ compact = false }: Props) {
  const { t } = useTranslation();
  const npcById = useProgressStore((s) => s.npcById);
  const paleFlag = useProgressStore((s) => s.paleRiderUnlocked);
  const selected = useRankingRewardStore((s) => s.selectedCosmeticNpcId);
  const setCosmeticNpcId = useRankingRewardStore((s) => s.setCosmeticNpcId);
  const characterId = useSettingsStore((s) => s.selectedCharacterId);
  const profile = usePvpStore((s) => s.profile);
  const setProfile = usePvpStore((s) => s.setProfile);

  const unlocked = useMemo(
    () =>
      unlockedCosmeticNpcIds({
        npcById,
        paleRiderUnlocked: paleFlag || selectPaleRiderUnlocked(),
      }),
    [npcById, paleFlag],
  );

  const apply = useCallback(
    async (id: number | null) => {
      setCosmeticNpcId(id);
      void trigger('selection');
      if (profile) {
        setProfile({ ...profile, cosmetic_npc_id: id });
      }
      try {
        const updated = await pvpSetCosmeticNpc(id);
        setProfile(updated);
      } catch (e) {
        console.warn('[pvp] set cosmetic failed', e);
      }
    },
    [profile, setCosmeticNpcId, setProfile],
  );

  return (
    <View style={[styles.card, compact && styles.cardCompact]}>
      {!compact ? (
        <>
          <Text style={[styles.head, { fontFamily: FONT_RYE }]}>
            {t('ranking.cosmeticTitle')}
          </Text>
          <Text style={styles.sub}>{t('ranking.cosmeticSub')}</Text>
        </>
      ) : (
        <Text style={styles.sub}>{t('ranking.cosmeticSub')}</Text>
      )}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('ranking.cosmeticDefault')}
          onPress={() => void apply(null)}
          style={[styles.chip, selected == null && styles.chipOn]}
        >
          <RankingPortrait
            width={96}
            height={112}
            characterId={characterId}
            cosmeticNpcId={null}
          />
          <Text style={styles.chipName} numberOfLines={1}>
            {t('ranking.cosmeticDefault')}
          </Text>
        </Pressable>
        {unlocked.map((id) => {
          const npc = getNpcById(id);
          if (!npc) return null;
          const on = selected === id;
          return (
            <Pressable
              key={id}
              accessibilityRole="button"
              accessibilityLabel={getNpcDisplayName(t, id)}
              onPress={() => void apply(id)}
              style={[styles.chip, on && styles.chipOn]}
            >
              <RankingPortrait
                width={96}
                height={112}
                cosmeticNpcId={id}
                characterId={characterId}
              />
              <Text style={styles.chipName} numberOfLines={1}>
                {getNpcDisplayName(t, id)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
      {unlocked.length === 0 ? (
        <Text style={styles.empty}>{t('ranking.cosmeticLocked')}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    gap: 10,
  },
  cardCompact: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  head: {
    color: colors.gold,
    fontSize: 16,
    letterSpacing: 1,
  },
  sub: {
    color: colors.sand,
    fontSize: 12,
    lineHeight: 17,
  },
  row: {
    gap: 12,
    paddingVertical: 6,
    paddingRight: 8,
  },
  chip: {
    width: 118,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    backgroundColor: 'rgba(12, 6, 4, 0.35)',
    alignItems: 'center',
    gap: 8,
  },
  chipOn: {
    borderColor: colors.gold,
    backgroundColor: 'rgba(232, 197, 71, 0.12)',
  },
  chipName: {
    color: colors.cream,
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  empty: {
    color: colors.sand,
    fontSize: 12,
    lineHeight: 17,
  },
});
