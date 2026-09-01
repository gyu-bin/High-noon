import { Ionicons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import {
  META_PANEL_BG,
  META_PANEL_BORDER,
  metaTextShadow,
} from '@/constants/westernBackground';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import {
  fetchAdminOverview,
  type AdminOverview,
} from '@/lib/supabase/analyticsApi';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardLabel}>{label}</Text>
      <Text style={styles.cardValue}>{value}</Text>
    </View>
  );
}

export default function AdminDashboardScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [pin, setPin] = useState('');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/menu');
  }, [router]);

  const loadOverview = useCallback(async () => {
    if (!pin.trim()) {
      setError(t('admin.pinRequired'));
      return;
    }
    if (!isSupabaseConfigured) {
      setError(t('admin.supabaseMissing'));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchAdminOverview(pin);
      setOverview(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      setError(msg === 'invalid_pin' ? t('admin.invalidPin') : t('admin.loadFailed'));
      setOverview(null);
    } finally {
      setLoading(false);
    }
  }, [pin, t]);

  const formatMs = (value: number | null | undefined) =>
    value != null && Number.isFinite(value) ? `${value.toFixed(1)} ms` : '—';

  return (
    <>
      <Stack.Screen
        options={{
          title: t('admin.title'),
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
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Ionicons name="stats-chart-outline" size={28} color={colors.gold} />
            <Text style={[styles.heroTitle, { fontFamily: FONT_RYE }]}>
              {t('admin.title')}
            </Text>
            <Text style={styles.heroDesc}>{t('admin.desc')}</Text>
          </View>

          <View style={styles.pinRow}>
            <TextInput
              value={pin}
              onChangeText={setPin}
              placeholder={t('admin.pinPlaceholder')}
              placeholderTextColor="rgba(245,230,211,0.45)"
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.pinInput}
            />
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadOverview()}
              disabled={loading}
              style={({ pressed }) => [
                styles.pinBtn,
                pressed && styles.pinBtnPressed,
                loading && styles.pinBtnDisabled,
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.darkBrown} />
              ) : (
                <Text style={styles.pinBtnText}>{t('admin.load')}</Text>
              )}
            </Pressable>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {overview ? (
            <>
              <StatCard
                label={t('admin.totalMatches')}
                value={String(overview.total_matches)}
              />
              <StatCard
                label={t('admin.uniqueDevices')}
                value={String(overview.unique_devices)}
              />
              <StatCard
                label={t('admin.medianReaction')}
                value={formatMs(overview.median_reaction_ms)}
              />
              <StatCard
                label={t('admin.avgProgress')}
                value={
                  overview.avg_highest_unlocked != null
                    ? t('admin.npcProgress', {
                        value: overview.avg_highest_unlocked.toFixed(1),
                      })
                    : '—'
                }
              />
              <StatCard
                label={t('admin.last7d')}
                value={String(overview.last_7d_matches)}
              />

              <Text style={styles.sectionTitle}>{t('admin.funnelTitle')}</Text>
              {overview.progress_funnel.slice(0, 12).map((row) => (
                <View key={row.npc_id} style={styles.funnelRow}>
                  <Text style={styles.funnelNpc}>NPC {row.npc_id}</Text>
                  <Text style={styles.funnelStat}>
                    {t('admin.funnelLine', {
                      wins: row.wins,
                      matches: row.matches,
                    })}
                  </Text>
                </View>
              ))}
            </>
          ) : null}
        </ScrollView>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { padding: 20, gap: 12 },
  hero: { alignItems: 'center', gap: 8, marginBottom: 8 },
  heroTitle: {
    fontSize: 26,
    color: colors.gold,
    letterSpacing: 2,
    ...metaTextShadow,
  },
  heroDesc: {
    textAlign: 'center',
    color: colors.sand,
    fontSize: 13,
    lineHeight: 20,
    ...metaTextShadow,
  },
  pinRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  pinInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.cream,
    backgroundColor: META_PANEL_BG,
  },
  pinBtn: {
    minWidth: 88,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    backgroundColor: colors.gold,
  },
  pinBtnPressed: { opacity: 0.85 },
  pinBtnDisabled: { opacity: 0.6 },
  pinBtnText: {
    color: colors.darkBrown,
    fontWeight: '800',
    fontSize: 14,
  },
  error: {
    color: '#ffb4a2',
    fontSize: 13,
    ...metaTextShadow,
  },
  card: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
  },
  cardLabel: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    ...metaTextShadow,
  },
  cardValue: {
    marginTop: 6,
    fontSize: 22,
    fontWeight: '800',
    color: colors.cream,
    ...metaTextShadow,
  },
  sectionTitle: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: '800',
    color: colors.gold,
    letterSpacing: 1.2,
    ...metaTextShadow,
  },
  funnelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: META_PANEL_BORDER,
  },
  funnelNpc: {
    color: colors.cream,
    fontWeight: '700',
    ...metaTextShadow,
  },
  funnelStat: {
    color: colors.sand,
    fontSize: 13,
    ...metaTextShadow,
  },
});
