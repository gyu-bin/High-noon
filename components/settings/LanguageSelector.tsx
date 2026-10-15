import { Ionicons } from '@expo/vector-icons';
import { useCallback, useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { META_PANEL_BG, META_PANEL_BORDER, metaTextShadow } from '@/constants/westernBackground';
import { colors } from '@/constants/theme';
import { resolveLanguage } from '@/locales';
import type { AppLanguage } from '@/store/settingsStore';
import { trigger } from '@/utils/hapticService';

const LANGUAGE_OPTIONS: AppLanguage[] = ['auto', 'ko', 'en', 'ja'];

const TITLE_KEYS: Record<AppLanguage, string> = {
  auto: 'settings.languageAuto',
  ko: 'settings.languageKo',
  en: 'settings.languageEn',
  ja: 'settings.languageJa',
};

type Props = {
  value: AppLanguage;
  onChange: (lang: AppLanguage) => void;
};

export function LanguageSelector({ value, onChange }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const resolvedDeviceLabel = useMemo(() => {
    const code = resolveLanguage('auto');
    return t(TITLE_KEYS[code]);
  }, [t]);

  const displayLabel = useMemo(() => {
    if (value === 'auto') {
      return `${t('settings.languageAuto')} · ${resolvedDeviceLabel}`;
    }
    return t(TITLE_KEYS[value]);
  }, [resolvedDeviceLabel, t, value]);

  const onSelect = useCallback(
    (lang: AppLanguage) => {
      setOpen(false);
      if (lang === value) return;
      void trigger('selection');
      onChange(lang);
    },
    [onChange, value],
  );

  return (
    <>
      <View style={styles.row}>
        <Text style={styles.label}>{t('menu.language')}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('menu.language')}
          accessibilityHint={displayLabel}
          onPress={() => setOpen(true)}
          style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        >
          <Text style={styles.triggerText} numberOfLines={1}>
            {displayLabel}
          </Text>
          <Ionicons name="chevron-down" size={14} color={colors.sand} />
        </Pressable>
      </View>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable style={styles.menu} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.menuTitle}>{t('menu.language')}</Text>
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = value === opt;
              const label = t(TITLE_KEYS[opt]);
              const sub =
                opt === 'auto'
                  ? t('settings.languageAutoHint', { lang: resolvedDeviceLabel })
                  : null;

              return (
                <Pressable
                  key={opt}
                  accessibilityRole="menuitem"
                  accessibilityState={{ selected: active }}
                  onPress={() => onSelect(opt)}
                  style={({ pressed }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed && styles.optionPressed,
                  ]}
                >
                  <View style={styles.optionTextWrap}>
                    <Text style={[styles.optionLabel, active && styles.optionLabelActive]}>
                      {label}
                    </Text>
                    {sub ? <Text style={styles.optionSub}>{sub}</Text> : null}
                  </View>
                  {active ? (
                    <Ionicons name="checkmark" size={18} color={colors.gold} />
                  ) : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: colors.cream,
    ...metaTextShadow,
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '52%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.28)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.35)',
  },
  triggerPressed: {
    opacity: 0.85,
  },
  triggerText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
    color: colors.sand,
    ...metaTextShadow,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  menu: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: META_PANEL_BG,
    borderWidth: 1,
    borderColor: META_PANEL_BORDER,
    gap: 2,
  },
  menuTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.sand,
    letterSpacing: 1.1,
    paddingHorizontal: 10,
    paddingBottom: 6,
    ...metaTextShadow,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  optionActive: {
    backgroundColor: 'rgba(212, 160, 23, 0.14)',
  },
  optionPressed: {
    opacity: 0.88,
  },
  optionTextWrap: {
    flex: 1,
    gap: 2,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.cream,
    ...metaTextShadow,
  },
  optionLabelActive: {
    color: colors.gold,
  },
  optionSub: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(212, 170, 112, 0.75)',
    ...metaTextShadow,
  },
});
