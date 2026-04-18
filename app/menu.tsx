import { useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DustParticles } from '@/components/effects/DustParticles';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { WoodButton } from '@/components/ui/WoodButton';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { NPCS } from '@/constants/npcs';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';
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
  const hapticEnabled = useSettingsStore((s) => s.hapticEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
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

  return (
    <PhoneStageShell>
      <View
        style={[
          styles.root,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 16 },
        ]}
      >
      <DustParticles />
      <View style={styles.header}>
        <Text style={[styles.brand, { fontFamily: FONT_RYE }]}>HIGH NOON</Text>
        <Text style={styles.tagline}>반응속도 결투</Text>
      </View>

      <View style={styles.buttonsWrap}>
        <View style={styles.buttons}>
          <WoodButton
            title="vs NPC"
            accessibilityHint="NPC 목록으로 이동합니다"
            onPress={() => router.push('/npc-select')}
          />
          <WoodButton
            title="2인 대결"
            accessibilityHint="판수를 고른 뒤 같은 기기에서 둘이 플레이합니다"
            onPress={() => router.push('/local-setup')}
          />
          <WoodButton
            title="기록"
            accessibilityHint="평균 반응 시간과 NPC 클리어 수를 봅니다"
            onPress={() => router.push('/stats')}
          />
          <WoodButton
            title="캐릭터"
            accessibilityHint="플레이 캐릭터를 선택합니다"
            onPress={() => router.push('/character-select' as Href)}
          />
        </View>
      </View>

      <View style={styles.settingsCard}>
        <Text style={styles.settingsTitle}>플레이 설정</Text>
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
        <Text style={styles.footerValue}>{unlockedLabel}</Text>
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
                pressed && styles.adRemovalBtnPressed,
                purchaseBusy && styles.adRemovalBtnDisabled,
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
                pressed && styles.adRemovalBtnPressed,
                purchaseBusy && styles.adRemovalBtnDisabled,
              ]}
            >
              {purchaseBusy ? (
                <ActivityIndicator color={colors.darkBrown} />
              ) : (
                <Text style={styles.adRemovalBtnText}>High noon Pro</Text>
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="구매 복원"
              disabled={purchaseBusy}
              onPress={onRestorePurchases}
              style={({ pressed }) => [styles.restoreBtn, pressed && styles.restoreBtnPressed]}
            >
              <Text style={styles.restoreBtnText}>구매 복원</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#2C1A0E',
    paddingHorizontal: 28,
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
    zIndex: 1,
  },
  brand: {
    fontSize: 28,
    color: colors.ochre,
    letterSpacing: 4,
  },
  tagline: {
    marginTop: 6,
    color: colors.sand,
    fontSize: 14,
    letterSpacing: 3,
    opacity: 0.9,
  },
  buttonsWrap: {
    flex: 1,
    justifyContent: 'center',
    zIndex: 1,
  },
  buttons: {
    gap: 18,
  },
  settingsCard: {
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: 'rgba(45, 28, 14, 0.92)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.35)',
    gap: 12,
    zIndex: 1,
  },
  settingsTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.sand,
    letterSpacing: 1.2,
    opacity: 0.9,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  settingLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.cream,
  },
  footer: {
    alignItems: 'center',
    paddingTop: 20,
    zIndex: 1,
  },
  footerLabel: {
    color: colors.sand,
    fontSize: 12,
    letterSpacing: 1.5,
    opacity: 0.75,
  },
  footerValue: {
    marginTop: 4,
    fontSize: 22,
    fontWeight: '800',
    color: colors.ochre,
    letterSpacing: 2,
  },
  adRemovalRow: {
    marginTop: 16,
    alignItems: 'center',
    zIndex: 1,
  },
  proRow: {
    alignItems: 'center',
    gap: 10,
  },
  proColumn: {
    alignItems: 'center',
    gap: 10,
  },
  manageSubBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(45, 28, 14, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.45)',
    minWidth: 160,
    alignItems: 'center',
  },
  manageSubBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.cream,
  },
  restoreBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  restoreBtnPressed: {
    opacity: 0.75,
  },
  restoreBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.sand,
    textDecorationLine: 'underline',
  },
  adFreeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.sand,
    letterSpacing: 0.5,
  },
  adRemovalBtn: {
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: 'rgba(212, 165, 116, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.55)',
    minWidth: 220,
    alignItems: 'center',
  },
  adRemovalBtnPressed: {
    opacity: 0.88,
  },
  adRemovalBtnDisabled: {
    opacity: 0.55,
  },
  adRemovalBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.cream,
  },
});
