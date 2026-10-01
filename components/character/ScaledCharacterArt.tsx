import { Image } from 'expo-image';
import { StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

/**
 * Square character art whose canvas may be larger than the production 1254 frame.
 * The layout box stays `size`; the image is drawn `size * displayScale`, centred, so the
 * production frame (and the body inside it) lands exactly where 1:1 art would.
 * Overflow is visible — the caller's container decides any clipping.
 */
export function ScaledCharacterArt({
  source,
  size,
  displayScale = 1,
  opacity = 1,
  style,
}: {
  source: ImageSourcePropType;
  size: number;
  displayScale?: number;
  opacity?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const render = size * displayScale;
  const offset = (size - render) / 2;
  return (
    <View pointerEvents="none" style={[{ width: size, height: size }, styles.box, style]}>
      <Image
        source={source}
        contentFit="contain"
        transition={0}
        style={[styles.art, { left: offset, top: offset, width: render, height: render, opacity }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: { overflow: 'visible' },
  art: { position: 'absolute' },
});
