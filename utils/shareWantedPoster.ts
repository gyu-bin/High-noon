import { Platform, Share } from 'react-native';
import type { RefObject } from 'react';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import {
  cacheDirectory,
  copyAsync,
} from 'expo-file-system/legacy';

type CaptureTarget = RefObject<unknown>;

function toFileUrl(uri: string): string {
  return uri.startsWith('file://') ? uri : `file://${uri}`;
}

/**
 * Production share path for WANTED poster (iOS + Android).
 *
 * 1) view-shot → PNG tmp file
 * 2) copy into cache with `.png` name (Android MIME / FileProvider friendly)
 * 3) expo-sharing (both platforms) — FileProvider on Android, UIActivity on iOS
 * 4) iOS-only fallback: RN Share with **url only** (url+message becomes "텍스트")
 */
export async function shareWantedPosterImage(
  viewRef: CaptureTarget,
  _caption?: string,
): Promise<boolean> {
  const node = viewRef.current;
  if (node == null) {
    throw new Error('poster_not_ready');
  }

  const captured = await captureRef(node as never, {
    format: 'png',
    quality: 1,
    result: 'tmpfile',
    width: 1080,
    height: 1920,
  });

  if (!captured) {
    throw new Error('capture_failed');
  }

  const from = toFileUrl(captured);
  const cacheRoot = cacheDirectory;
  if (!cacheRoot) {
    throw new Error('cache_unavailable');
  }

  const dest = `${cacheRoot}high-noon-wanted-${Date.now()}.png`;
  await copyAsync({ from, to: dest });
  const fileUrl = toFileUrl(dest);

  // Primary: expo-sharing (store / EAS native builds include this)
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUrl, {
      mimeType: 'image/png',
      UTI: 'public.png',
      dialogTitle: 'High Noon WANTED',
    });
    return true;
  }

  // iOS fallback without ExpoSharing binary
  if (Platform.OS === 'ios') {
    await Share.share({ url: fileUrl });
    return true;
  }

  throw new Error('image_share_unavailable');
}
