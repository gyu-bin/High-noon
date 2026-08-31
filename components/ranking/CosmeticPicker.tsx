import { useCallback, useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { NpcCharacterSprite } from '@/components/game/CharacterSprites';
import { FONT_RYE } from '@/constants/fonts';
import {
  META_PANEL_BG,
  META_PANEL_BORDER,
} from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { getNpcById } from '@/constants/npcs';
import { selectPaleRiderUnlocked, useProgressStore } from '@/store/progressStore';
import { useRankingRewardStore } from '@/store/rankingRewardStore';
import { pvpSetCosmeticNpc } from '@/lib/supabase/pvpApi';
import { usePvpStore } from '@/store/pvpStore';
import { getNpcDisplayName } from '@/utils/npcLabels';
import { unlockedCosmeticNpcIds } from '@/utils/pvpRewards';
import { trigger } from '@/utils/hapticService';

export function CosmeticPicker() {
  const { t } = useTranslation();
  const npcById = useProgressStore((s) => s.npcById);
  const paleFlag = useProgressStore((s) => s.paleRiderUnlocked);
  const selected = useRankingRewardStore((s) => s.selectedCosmeticNpcId);
  const setCosmeticNpcId = useRankingRewardStore((s) => s.setCosmeticNpcId);
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
    <View style={styles.card}>
      <Text style={[styles.head, { fontFamily: FONT_RYE }]}>
        {t('ranking.cosmeticTitle')}
      </Text>
      <Text style={styles.sub}>{t('ranking.cosmeticSub')}</Text>
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
          <View style={styles.spriteBox}>
            <Text style={styles.meMark}>ME</Text>
          </View>
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
              <View style={styles.spriteBox}>
                <NpcCharacterSprite npcId={id} width={48} height={54} pose="idle" />
              </View>
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
    gap: 8,
  },
  head: {
    color: colors.gold,
    fontSize: 16,
    letterSpacing: 1,
  },
  sub: {
    color: colors.sand,
    fontSize: 12,
  },
  row: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    width: 88,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    backgroundColor: 'rgba(12, 6, 4, 0.28)',
    alignItems: 'center',
    gap: 4,
  },
  chipOn: {
    borderColor: 'rgba(232, 197, 71, 0.7)',
  },
  spriteBox: {
    width: 48,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meMark: {
    color: colors.gold,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 1,
  },
  chipName: {
    color: colors.cream,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    width: '100%',
  },
  empty: {
    color: colors.sand,
    fontSize: 12,
  },
});
