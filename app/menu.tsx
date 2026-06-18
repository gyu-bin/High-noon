import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { WoodButton } from '@/components/ui/WoodButton';
import {
  META_PANEL_BG,
  META_PANEL_BORDER,
  metaTextShadow,
} from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { NPCS } from '@/constants/npcs';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { playBgm, syncBgmWithSettings } from '@/utils/bgmService';
import {
  presentCustomerCenter,
  presentSubscriptionPaywall,
  restorePurchases,
} from '@/utils/purchaseService';

export default function MenuScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const highestUnlocked = useProgressStore((s) => s.highestUnlockedNpcId);
  const maxId = NPCS[NPCS.length - 1]!.id;
  const unlockedLabel = `${Math.min(highestUnlocked, maxId)} / ${maxId}`;

  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const musicEnabled = useSettingsStore((s) => s.musicEnabled);
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const setMusicEnabled = useSettingsStore((s) => s.setMusicEnabled);
  const setHapticEnabled = useSettingsStore((s) => s.setHapticEnabled);
  const isAdFree = useProgressStore((s) => s.isAdFree);
  const [purchaseBusy, setPurchaseBusy] = useState(false);

  const onOpenProPaywall = useCallback(async () => {
    if (isAdFree || purchaseBusy) return;
    setPurchaseBusy(true);
    try {
      await presentSubscriptionPaywall();
    } finally {
      setPurchaseBusy(false);
    }
  }, [isAdFree, purchaseBusy]);

  const onRestorePurchases = useCallback(async () => {
    if (purchaseBusy) return;
    setPurchaseBusy(true);
    try {
      await restorePurchases();
    } finally {
      setPurchaseBusy(false);
    }
  }, [purchaseBusy]);

  const onManageSubscription = useCallback(async () => {
    if (purchaseBusy) return;
    setPurchaseBusy(true);
    try {
      await presentCustomerCenter();
    } finally {
      setPurchaseBusy(false);
    }
  }, [purchaseBusy]);

  useScreenBgm('menu');

  const onMusicToggle = useCallback(
    (value: boolean) => {
      setMusicEnabled(value);
      syncBgmWithSettings();
      if (value) playBgm('menu');
    },
    [setMusicEnabled],
  );

  return (
    <MetaScreenShell>
      <View
        style={[
          styles.root,
          {
            paddingTop: insets.top + 8,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        <View style={styles.header}>
          <Text style={[styles.brand, { fontFamily: FONT_RYE }]}>HIGH NOON</Text>
          <Text style={styles.tagline}>반응속도 결투</Text>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>플레이</Text>
            <View style={styles.primaryButtons}>
              <WoodButton
                title="vs NPC"
                accessibilityHint="NPC 목록으로 이동합니다"
                onPress={() => router.push('/npc-select')}
                style={styles.primaryBtn}
              />
              <WoodButton
                title="2인 대결"
                accessibilityHint="판수를 고른 뒤 같은 기기에서 둘이 플레이합니다"
                onPress={() => router.push('/local-setup')}
                style={styles.primaryBtn}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>더보기</Text>
            <View style={styles.secondaryRow}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="기록"
                onPress={() => router.push('/stats')}
                style={({ pressed }) => [styles.secondaryTile, pressed && styles.secondaryTilePressed]}
              >
                <Text style={styles.secondaryTileText}>기록</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="캐릭터"
                onPress={() => router.push('/character-select')}
                style={({ pressed }) => [styles.secondaryTile, pressed && styles.secondaryTilePressed]}
              >
                <Text style={styles.secondaryTileText}>캐릭터</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.settingsCard}>
            <Text style={styles.settingsTitle}>플레이 설정</Text>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>배경음악</Text>
              <Switch
                accessibilityLabel="배경음악"
                value={musicEnabled}
                onValueChange={onMusicToggle}
                trackColor={{ false: '#2A1810', true: 'rgba(212, 165, 116, 0.45)' }}
                thumbColor={musicEnabled ? colors.ochre : colors.sand}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>효과음</Text>
              <Switch
                accessibilityLabel="효과음"
                value={soundEnabled}
                onValueChange={setSoundEnabled}
                trackColor={{ false: '#2A1810', true: 'rgba(212, 165, 116, 0.45)' }}
                thumbColor={soundEnabled ? colors.ochre : colors.sand}
              />
            </View>
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>진동</Text>
              <Switch
                accessibilityLabel="진동"
                value={hapticEnabled}
                onValueChange={setHapticEnabled}
                trackColor={{ false: '#2A1810', true: 'rgba(212, 165, 116, 0.45)' }}
                thumbColor={hapticEnabled ? colors.ochre : colors.sand}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerLabel}>진행 — 해금 NPC</Text>
            <Text style={[styles.footerValue, { fontFamily: FONT_RYE }]}>
              {unlockedLabel}
            </Text>
          </View>

          <View style={styles.adRemovalRow}>
            {isAdFree ? (
              <View style={styles.proRow}>
                <Text style={styles.adFreeLabel}>High noon Pro ✓</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="구독 및 구매 관리"
                  disabled={purchaseBusy}
                  onPress={onManageSubscription}
                  style={({ pressed }) => [
                    styles.manageSubBtn,
                    pressed && styles.btnPressed,
                    purchaseBusy && styles.btnDisabled,
                  ]}
                >
                  {purchaseBusy ? (
                    <ActivityIndicator color={colors.cream} />
                  ) : (
                    <Text style={styles.manageSubBtnText}>구독 관리</Text>
                  )}
                </Pressable>
              </View>
            ) : (
              <View style={styles.proColumn}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="High noon Pro 구독"
                  disabled={purchaseBusy}
                  onPress={onOpenProPaywall}
                  style={({ pressed }) => [
                    styles.adRemovalBtn,
                    pressed && styles.btnPressed,
                    purchaseBusy && styles.btnDisabled,
                  ]}
                >
                  {purchaseBusy ? (
                    <ActivityIndicator color={colors.cream} />
                  ) : (
                    <Text style={styles.adRemovalBtnText}>High noon Pro</Text>
                  )}
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="구매 복원"
                  disabled={purchaseBusy}
                  onPress={onRestorePurchases}
                  style={({ pressed }) => [styles.restoreBtn, pressed && styles.btnPressed]}
                >
                  <Text style={styles.restoreBtnText}>구매 복원</Text>
                </Pressable>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </MetaScreenShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 22,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
    zIndex: 1,
  },
  brand: {
    fontSize: 28,
    color: colors.gold,
    letterSpacing: 3,
    ...metaTextShadow,
  },
  tagline: {
    marginTop: 6,
    color: colors.cream,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1.5,
    ...metaTextShadow,
  },
  scroll: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    gap: 18,
    paddingBottom: 12,
  },
  section: {
    gap: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.cream,
    letterSpacing: 1.4,
    marginLeft: 2,
    ...metaTextShadow,
  },
  primaryButtons: {
    gap: 10,
  },
  primaryBtn: {
    paddingVertical: 14,
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryTile: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
  },
  secondaryTilePressed: {
    opacity: 0.85,
  },
  secondaryTileText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.cream,
    ...metaTextShadow,
  },
  settingsCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    gap: 10,
  },
  settingsTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 1.2,
    marginBottom: 2,
    ...metaTextShadow,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.cream,
    ...metaTextShadow,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
  },
  footerLabel: {
    color: colors.sand,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    ...metaTextShadow,
  },
  footerValue: {
    marginTop: 4,
    fontSize: 22,
    color: colors.gold,
    letterSpacing: 1.5,
    ...metaTextShadow,
  },
  adRemovalRow: {
    alignItems: 'center',
    paddingTop: 2,
  },
  proRow: {
    alignItems: 'center',
    gap: 8,
  },
  proColumn: {
    alignItems: 'center',
    gap: 8,
  },
  manageSubBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    minWidth: 160,
    alignItems: 'center',
  },
  manageSubBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cream,
  },
  restoreBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  btnPressed: {
    opacity: 0.82,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  restoreBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.sand,
    textDecorationLine: 'underline',
  },
  adFreeLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cream,
    ...metaTextShadow,
  },
  adRemovalBtn: {
    paddingVertical: 11,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    minWidth: 200,
    alignItems: 'center',
  },
  adRemovalBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.gold,
    ...metaTextShadow,
  },
});
