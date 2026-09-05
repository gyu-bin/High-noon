import { Stack, useRouter, type Href } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { RankingPortrait } from '@/components/ranking/RankingPortrait';
import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { FONT_RYE } from '@/constants/fonts';
import {
  META_PANEL_BG,
  META_PANEL_BORDER,
  metaTextShadow,
} from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { pvpLogin, pvpSetCosmeticNpc } from '@/lib/supabase/pvpApi';
import { selectPaleRiderUnlocked, useProgressStore } from '@/store/progressStore';
import { usePvpStore } from '@/store/pvpStore';
import { useRankingRewardStore } from '@/store/rankingRewardStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getNpcDisplayName } from '@/utils/npcLabels';
import { unlockedCosmeticNpcIds } from '@/utils/pvpRewards';
import { trigger } from '@/utils/hapticService';

export default function RankingProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('menu');

  const npcById = useProgressStore((s) => s.npcById);
  const paleFlag = useProgressStore((s) => s.paleRiderUnlocked);
  const selectedCosmetic = useRankingRewardStore((s) => s.selectedCosmeticNpcId);
  const setCosmeticNpcId = useRankingRewardStore((s) => s.setCosmeticNpcId);
  const setPvpCosmeticNpcId = useSettingsStore((s) => s.setPvpCosmeticNpcId);
  const characterId = useSettingsStore((s) => s.selectedCharacterId);
  const setProfile = usePvpStore((s) => s.setProfile);
  const profile = usePvpStore((s) => s.profile);

  const [saving, setSaving] = useState<number | 'clear' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unlocked = useMemo(
    () =>
      unlockedCosmeticNpcIds({
        npcById,
        paleRiderUnlocked: paleFlag || selectPaleRiderUnlocked(),
      }),
    [npcById, paleFlag],
  );

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/ranking' as Href);
  }, [router]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void pvpLogin()
      .then((me) => {
        setProfile(me);
        if (
          useRankingRewardStore.getState().selectedCosmeticNpcId == null &&
          me.cosmetic_npc_id != null
        ) {
          setCosmeticNpcId(me.cosmetic_npc_id);
          setPvpCosmeticNpcId(me.cosmetic_npc_id);
        }
      })
      .catch(() => {});
  }, [setCosmeticNpcId, setProfile, setPvpCosmeticNpcId]);

  const applyCosmetic = useCallback(
    async (npcId: number | null) => {
      setSaving(npcId ?? 'clear');
      setError(null);
      setCosmeticNpcId(npcId);
      setPvpCosmeticNpcId(npcId);
      void trigger('selection');
      if (profile) {
        setProfile({ ...profile, cosmetic_npc_id: npcId });
      }
      try {
        if (isSupabaseConfigured) {
          const next = await pvpSetCosmeticNpc(npcId);
          setProfile(next);
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setSaving(null);
      }
    },
    [profile, setCosmeticNpcId, setProfile, setPvpCosmeticNpcId],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <MetaScreenShell>
        <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
          <MenuBackButton onPress={onBack} />
        </View>
        <ScrollView
          style={styles.root}
          contentContainerStyle={[
            styles.content,
            { paddingBottom: insets.bottom + 24 },
          ]}
        >
          <Text style={[styles.head, { fontFamily: FONT_RYE }]}>
            {t('ranking.profileTitle')}
          </Text>
          <Text style={styles.sub}>{t('ranking.profileSub')}</Text>

          {profile ? (
            <View style={styles.meCard}>
              <RankingPortrait
                width={72}
                height={84}
                characterId={characterId}
                cosmeticNpcId={selectedCosmetic ?? profile.cosmetic_npc_id}
              />
              <View style={styles.meText}>
                <Text style={styles.meName}>{profile.display_name}</Text>
                <Text style={styles.meMeta}>
                  {t('ranking.recordLine', {
                    wins: profile.wins,
                    losses: profile.losses,
                  })}
                  {` · ${profile.rating}`}
                </Text>
              </View>
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Text style={styles.section}>{t('ranking.cosmeticTitle')}</Text>

          <Pressable
            accessibilityRole="button"
            onPress={() => void applyCosmetic(null)}
            style={[
              styles.row,
              selectedCosmetic == null && styles.rowActive,
            ]}
          >
            <RankingPortrait width={48} height={56} characterId={characterId} />
            <View style={styles.rowMid}>
              <Text style={styles.rowName}>{t('ranking.cosmeticDefault')}</Text>
            </View>
            {saving === 'clear' ? (
              <ActivityIndicator color={colors.gold} />
            ) : (
              <Text
                style={[
                  styles.check,
                  selectedCosmetic == null && styles.checkActive,
                ]}
              >
                {selectedCosmetic == null ? '✓' : ''}
              </Text>
            )}
          </Pressable>

          {unlocked.length === 0 ? (
            <Text style={styles.empty}>{t('ranking.profileEmpty')}</Text>
          ) : (
            unlocked.map((id) => {
              const active = selectedCosmetic === id;
              return (
                <Pressable
                  key={id}
                  accessibilityRole="button"
                  onPress={() => void applyCosmetic(id)}
                  style={[styles.row, active && styles.rowActive]}
                >
                  <RankingPortrait
                    width={48}
                    height={56}
                    characterId={characterId}
                    cosmeticNpcId={id}
                  />
                  <View style={styles.rowMid}>
                    <Text style={styles.rowName}>
                      {getNpcDisplayName(t, id)}
                    </Text>
                    <Text style={styles.rowMeta}>#{id}</Text>
                  </View>
                  {saving === id ? (
                    <ActivityIndicator color={colors.gold} />
                  ) : (
                    <Text style={[styles.check, active && styles.checkActive]}>
                      {active ? '✓' : ''}
                    </Text>
                  )}
                </Pressable>
              );
            })
          )}
        </ScrollView>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  topBar: {
    paddingHorizontal: 12,
    zIndex: 2,
  },
  root: { flex: 1 },
  content: { paddingHorizontal: 24, gap: 10 },
  head: {
    fontSize: 26,
    color: colors.gold,
    letterSpacing: 2,
    ...metaTextShadow,
  },
  sub: {
    color: colors.sand,
    fontSize: 13,
    marginBottom: 8,
    ...metaTextShadow,
  },
  meCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    marginBottom: 8,
  },
  meText: { flex: 1, gap: 4 },
  meName: {
    color: colors.cream,
    fontSize: 17,
    fontWeight: '800',
    ...metaTextShadow,
  },
  meMeta: { color: colors.sand, fontSize: 12 },
  section: {
    marginTop: 8,
    color: colors.gold,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  empty: { color: colors.sand, fontSize: 14, marginTop: 4 },
  error: { color: '#E8A0A0', fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
  },
  rowActive: {
    borderColor: colors.gold,
  },
  rowMid: { flex: 1, gap: 2 },
  rowName: { color: colors.cream, fontWeight: '700', fontSize: 15 },
  rowMeta: { color: colors.sand, fontSize: 11 },
  check: {
    width: 24,
    textAlign: 'center',
    color: colors.sand,
    fontSize: 18,
    fontWeight: '800',
  },
  checkActive: { color: colors.gold },
});
