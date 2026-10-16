/**
 * Android breaks Korean lines between any two syllables ("연승하/면"). Joining the syllables of each
 * word with U+2060 WORD JOINER leaves spaces as the only break points, like CSS `word-break: keep-all`.
 * iOS gets the same result natively from `lineBreakStrategyIOS="hangul-word"`.
 */
export function keepHangulWords(text: string): string {
  return text.replace(/([가-힣])(?=[가-힣])/g, '$1⁠');
}
