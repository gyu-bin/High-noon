import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PhoneStageShell } from '@/components/layout/PhoneStageShell';
import { colors } from '@/constants/theme';

export default function DuelPlaceholderScreen() {
  const { mode, npcId, preset } = useLocalSearchParams<{
    mode?: string;
    npcId?: string;
    preset?: string;
  }>();

  return (
    <PhoneStageShell>
    <View style={styles.root}>
      <Text style={styles.title}>결투</Text>
      <Text style={styles.meta}>모드: {mode ?? '—'}</Text>
      {npcId ? <Text style={styles.meta}>NPC #{npcId}</Text> : null}
      {preset ? <Text style={styles.meta}>시리즈: {preset}</Text> : null}
      <Text style={styles.hint}>게임플레이는 이후 작업에서 연결됩니다.</Text>
    </View>
    </PhoneStageShell>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.darkBrown,
    padding: 24,
    justifyContent: 'center',
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.ochre,
  },
  meta: {
    color: colors.cream,
    fontSize: 16,
  },
  hint: {
    marginTop: 20,
    color: colors.sand,
    fontSize: 14,
    opacity: 0.85,
  },
});
