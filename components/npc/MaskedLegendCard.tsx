import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';

export function MaskedLegendCard() {
  return (
    <View style={[styles.card, styles.locked]}>
      <View style={styles.iconCircle}>
        <Text style={styles.q}>?</Text>
      </View>
      <View style={styles.mid}>
        <Text style={styles.line}>???</Text>
        <Text style={styles.sub}>???</Text>
        <Text style={styles.sub}>??? ms</Text>
      </View>
      <Ionicons name="lock-closed" size={24} color={colors.sand} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: '#2A1810',
    borderWidth: 2,
    borderColor: '#4A3A32',
    gap: 12,
    marginBottom: 12,
  },
  locked: {
    opacity: 0.38,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1A1008',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#4A3A32',
  },
  q: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.sand,
  },
  mid: {
    flex: 1,
  },
  line: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 2,
  },
  sub: {
    marginTop: 4,
    fontSize: 13,
    color: colors.sand,
    opacity: 0.7,
  },
});
