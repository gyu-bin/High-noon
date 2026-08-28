import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

import ko from './ko.json';
import en from './en.json';
import ja from './ja.json';

const resources = {
  ko: { translation: ko },
  en: { translation: en },
  ja: { translation: ja },
};

export function getDeviceLanguage(): string {
  const locale = Localization.getLocales()[0]?.languageCode ?? 'ko';
  if (locale.startsWith('ja')) return 'ja';
  if (locale.startsWith('en')) return 'en';
  if (locale.startsWith('ko')) return 'ko';
  return 'en';
}

/**
 * 앱 언어 변경
 * @param lang 'auto' | 'ko' | 'en' | 'ja'
 */
export function changeLanguage(lang: 'auto' | 'ko' | 'en' | 'ja'): void {
  const targetLang = lang === 'auto' ? getDeviceLanguage() : lang;
  void i18n.changeLanguage(targetLang);
}

/**
 * 현재 적용된 언어 코드 반환
 */
export function getCurrentLanguage(): string {
  return i18n.language;
}

i18n.use(initReactI18next).init({
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
