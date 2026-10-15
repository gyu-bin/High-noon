/** @expo-google-fonts/rye 로드 후 사용 */
export const FONT_RYE = 'Rye_400Regular';
export const FONT_WESTERN_SERIF = 'NanumMyeongjo_700Bold';

/** Rye에는 한·일 글리프가 없어 CJK 텍스트는 명조 계열로 전환한다. */
export function usesCjkFont(text: string): boolean {
  return /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/u.test(text);
}
