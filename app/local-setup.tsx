import { Stack, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { MetaScreenShell } from '@/components/layout/MetaScreenShell';
import { MenuBackButton } from '@/components/ui/MenuBackButton';
import { useScreenBgm } from '@/hooks/useScreenBgm';
import { WoodButton } from '@/components/ui/WoodButton';
import { colors } from '@/constants/theme';
import { FONT_RYE } from '@/constants/fonts';
import {
  LOCAL_MATCH_PRESETS,
  type LocalMatchPreset,
  useSettingsStore,
} from '@/store/settingsStore';

export default function LocalSetupScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  useScreenBgm('menu');
  const onBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/menu');
  }, [router]);
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
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { fontFamily: FONT_RYE }]}>
            {t('localDuel.selectRounds')}
          </Text>
          <Text style={styles.sub}>{t('localDuel.sub')}</Text>
          <Text style={styles.presetHint}>
            {t('localDuel.defaultPreset', {
              rounds: activeCfg.maxRounds,
              wins: activeCfg.winsRequired,
            })}
          </Text>

          <View style={styles.row}>
            {(['bo3', 'bo5', 'bo7'] as const).map((key) => {
              const cfg = LOCAL_MATCH_PRESETS[key];
              const active = preset === key;
              return (
                <WoodButton
                  key={key}
                  title={t('localDuel.roundButton', {
                    rounds: cfg.maxRounds,
                    wins: cfg.winsRequired,
                  })}
                  onPress={() => goDuel(key)}
                  style={[styles.btn, active && styles.btnActive]}
                />
              );
            })}
          </View>
        </ScrollView>
      </MetaScreenShell>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  content: {
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
