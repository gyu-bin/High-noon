import { Image } from 'expo-image';
import { View } from 'react-native';
import { CLARITY_NPCS } from '@/constants/clarityCharacterAssets';

/** Crop the supplied production reference in layout; keep the source image intact. */
export function NpcPortrait({ id, size }: { id: number; size: number }) {
  const clean = CLARITY_NPCS[id];
  if (clean) {
    // Crop the same high-resolution identity used in the duel, not a roster-board thumbnail.
    return <View style={{ width: size, height: size * 0.92, overflow: 'hidden', backgroundColor: '#342015' }}>
      <Image source={clean.idle} contentFit="contain" transition={0} accessibilityLabel={`Portrait ${id}`}
        style={{ position: 'absolute', width: size * 1.85, height: size * 1.85, left: -size * 0.425, top: -size * 0.015 }} />
    </View>;
  }
  const index = Math.max(0, Math.min(21, id - 1));
  const x = 19 + (index % 11) * 137;
  const y = index < 11 ? 136 : 310;
  const scale = size / 128;
  return <View style={{ width: size, height: size * 0.92, overflow: 'hidden', backgroundColor: '#342015' }}>
    <Image source={require('@/assets/branding/reference/npc-roster-board.png')}
      transition={0} contentFit="fill" accessibilityLabel={`Portrait ${id}`}
      style={{ position: 'absolute', width: 1536 * scale, height: 1024 * scale, left: -x * scale, top: -y * scale }} />
  </View>;
}
