import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
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
import { pvpLogin, pvpUpdateProfile } from '@/lib/supabase/pvpApi';
import { useProgressStore } from '@/store/progressStore';
import { usePvpStore } from '@/store/pvpStore';
import { useSettingsStore } from '@/store/settingsStore';
import { getNpcDisplayName } from '@/utils/npcLabels';

export default function RankingProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('menu');

  const unlocked = useProgressStore((s) => s.unlockedCosmeticNpcIds);
  const selectedCosmetic = useSettingsStore((s) => s.pvpCosmeticNpcId);
  const setPvpCosmeticNpcId = useSettingsStore((s) => s.setPvpCosmeticNpcId);
  const setProfile = usePvpStore((s) => s.setProfile);
  const profile = usePvpStore((s) => s.profile);

  const [saving, setSaving] = useState<number | 'clear' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/ranking');
  }, [router]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void pvpLogin()
      .then(setProfile)
      .catch(() => {});
  }, [setProfile]);

  const applyCosmetic = useCallback(
    async (npcId: number | null) => {
      setSaving(npcId ?? 'clear');
      setError(null);
      setPvpCosmeticNpcId(npcId);
      try {
        if (isSupabaseConfigured) {
          const next = await pvpUpdateProfile({
            cosmeticNpcId: npcId,
            clearCosmetic: npcId == null,
          });
          setProfile(next);
        } else if (profile) {
          setProfile({ ...profile, cosmetic_npc_id: npcId });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(msg);
      } finally {
        setSaving(null);
      }
    },
    [profile, setProfile, setPvpCosmeticNpcId],
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerBackVisible: false,
          headerLeft: () => <MenuBackButton onPress={onBack} />,
        }}
      />
      <MetaScreenShell>
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

          {error ? <Text style={styles.error}>{error}</Text> : null}

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
                  <View style={styles.rowMid}>
                    <Text style={styles.rowName}>{getNpcDisplayName(t, id)}</Text>
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

          {selectedCosmetic != null ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void applyCosmetic(null)}
              style={styles.clearBtn}
            >
              {saving === 'clear' ? (
                <ActivityIndicator color={colors.sand} />
              ) : (
                <Text style={styles.clearText}>{t('ranking.profileClear')}</Text>
              )}
            </Pressable>
          ) : null}
        </ScrollView>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 24, gap: 10 },
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
  empty: { color: colors.sand, fontSize: 14, marginTop: 12 },
  error: { color: '#E8A0A0', fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
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
  clearBtn: {
    marginTop: 8,
    padding: 12,
    alignItems: 'center',
  },
  clearText: {
    color: colors.sand,
    fontSize: 13,
    fontWeight: '700',
  },
});
