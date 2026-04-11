import { useRouter } from 'expo-router';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DustParticles } from '@/components/effects/DustParticles';
import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { WoodButton } from '@/components/ui/WoodButton';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import { NPCS } from '@/constants/npcs';
import { useProgressStore } from '@/store/progressStore';
import { useSettingsStore } from '@/store/settingsStore';

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
});
