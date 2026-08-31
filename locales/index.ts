import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import * as Linking from 'expo-linking';

import ko from './ko.json';
import en from './en.json';
import ja from './ja.json';
import { npcTranslationBlock } from './npcI18n';

const resources = {
  ko: { translation: { ...ko, npcs: npcTranslationBlock('ko') } },
  en: { translation: { ...en, npcs: npcTranslationBlock('en') } },
  ja: { translation: { ...ja, npcs: npcTranslationBlock('ja') } },
};

export function getDeviceLanguage(): string {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'ko';
  if (locale.startsWith('ja')) return 'ja';
  if (locale.startsWith('en')) return 'en';
  if (locale.startsWith('ko')) return 'ko';
  return 'en';
}

/** 설정값(auto 포함)을 실제 적용 언어 코드로 변환 */
export function resolveLanguage(lang: 'auto' | 'ko' | 'en' | 'ja'): 'ko' | 'en' | 'ja' {
  return lang === 'auto' ? (getDeviceLanguage() as 'ko' | 'en' | 'ja') : lang;
}

/** 기기 로케일 태그 (예: ko-KR) — 자동 모드 안내용 */
export function getDeviceLocaleTag(): string {
  return Localization.getLocales()[0]?.languageTag ?? 'ko-KR';
}

/**
 * 앱 언어 변경
 * @param lang 'auto' | 'ko' | 'en' | 'ja'
 */
export function changeLanguage(lang: 'auto' | 'ko' | 'en' | 'ja'): void {
  const targetLang = resolveLanguage(lang);
  void i18n.changeLanguage(targetLang);
}

/**
 * 현재 적용된 언어 코드 반환
 */
export function getCurrentLanguage(): string {
  return i18n.language;
}

/** 스크린샷 딥링크 `high-noon://menu?lang=en` — 앱 i18n을 그대로 켠다. */
export function languageFromCaptureUrl(url: string | null): 'ko' | 'en' | 'ja' | null {
  if (!url) return null;
  const raw = Linking.parse(url).queryParams?.lang;
  const lang = Array.isArray(raw) ? raw[0] : raw;
  if (lang === 'ko' || lang === 'en' || lang === 'ja') return lang;
  return null;
}

export const i18nInitPromise = i18n.use(initReactI18next).init({
  resources,
  lng: getDeviceLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
  react: {
    useSuspense: false,
  },
});

export default i18n;
