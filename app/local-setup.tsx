import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { WoodButton } from '@/components/ui/WoodButton';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import {
  LOCAL_MATCH_PRESETS,
  type LocalMatchPreset,
  useSettingsStore,
} from '@/store/settingsStore';

export default function LocalSetupScreen() {
  const router = useRouter();
  const preset = useSettingsStore((s) => s.localMatchPreset);
  const setPreset = useSettingsStore((s) => s.setLocalMatchPreset);

  const matchParam: Record<LocalMatchPreset, '3' | '5' | '7'> = {
    bo3: '3',
    bo5: '5',
    bo7: '7',
  };

  const goDuel = (p: LocalMatchPreset) => {
    setPreset(p);
    router.push({
      pathname: '/game/local',
      params: { matchType: matchParam[p] },
    });
  };

  const activeCfg = LOCAL_MATCH_PRESETS[preset];

  return (
    <PhoneStageShell>
    <View style={styles.root}>
      <Text style={[styles.title, { fontFamily: FONT_RYE }]}>판수 선택</Text>
      <Text style={styles.sub}>
        선승제에 맞춰 하트 수가 정해집니다. 버튼을 누르면 곧바로 같은 기기에서 2인
        대결이 시작됩니다.
      </Text>
      <Text style={styles.presetHint}>
        기본 선택: {activeCfg.maxRounds}판 {activeCfg.winsRequired}선
      </Text>

      <View style={styles.row}>
        {(['bo3', 'bo5', 'bo7'] as const).map((key) => {
          const cfg = LOCAL_MATCH_PRESETS[key];
          const active = preset === key;
          return (
            <WoodButton
              key={key}
              title={`${cfg.maxRounds}판 ${cfg.winsRequired}선`}
              onPress={() => goDuel(key)}
              style={[styles.btn, active && styles.btnActive]}
            />
          );
        })}
      </View>
    </View>
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.darkBrown,
    padding: 24,
    gap: 16,
  },
  title: {
    fontSize: 26,
    color: colors.ochre,
    letterSpacing: 2,
  },
  sub: {
    color: colors.cream,
    opacity: 0.88,
    fontSize: 14,
    lineHeight: 21,
  },
  presetHint: {
    marginTop: 6,
    fontSize: 13,
    fontWeight: '700',
    color: colors.ochre,
    letterSpacing: 0.3,
  },
  row: {
    gap: 14,
    marginTop: 8,
  },
  btn: {
    alignSelf: 'stretch',
  },
  btnActive: {
    borderColor: colors.ochre,
  },
});
