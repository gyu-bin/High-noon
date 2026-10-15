import { useCallback, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { FONT_RYE } from '@/constants/fonts';
import { colors } from '@/constants/theme';
import { exportProgressCode, importProgressCode } from '@/utils/progressBackup';

type Props = {
  visible: boolean;
  onClose: () => void;
};

/**
 * 진행도 백업 코드 발급·복원.
 *
 * 앱을 지우면 진행도가 함께 사라지기 때문에(AsyncStorage는 앱 컨테이너 안에 있다),
 * 유저가 코드를 보관했다가 새 설치에서 되돌릴 수 있게 한다.
 *
 * 클립보드 라이브러리를 쓰지 않는다 — 새 네이티브 의존성이 생기면 스토어 재빌드가
 * 필요해진다. 대신 코드를 길게 눌러 복사할 수 있게 하고(`selectable`),
 * 내보내기는 OS 공유 시트(react-native 내장 `Share`)로 넘긴다.
 */
export function ProgressBackupModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [input, setInput] = useState('');

  const revealCode = useCallback(() => {
    setCode(exportProgressCode());
  }, []);

  const shareCode = useCallback(() => {
    const value = code || exportProgressCode();
    setCode(value);
    void Share.share({ message: value }).catch(() => {
      /* 유저가 취소한 경우 등 */
    });
  }, [code]);

  const restore = useCallback(() => {
    const raw = input.trim();
    if (!raw) return;

    // 되돌릴 수 없는 덮어쓰기라 한 번 묻는다
    Alert.alert(t('backup.restoreConfirmTitle'), t('backup.restoreConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('backup.restore'),
        style: 'destructive',
        onPress: () => {
          const result = importProgressCode(raw);
          if (!result.ok) {
            Alert.alert(t('backup.failTitle'), t(`backup.fail.${result.reason}`));
            return;
          }
          setInput('');
          Alert.alert(
            t('backup.doneTitle'),
            t('backup.doneBody', { count: result.clearedCount }),
          );
          onClose();
        },
      },
    ]);
  }, [input, onClose, t]);

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[styles.title, { fontFamily: FONT_RYE }]}>{t('backup.title')}</Text>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.desc}>{t('backup.desc')}</Text>

            <Text style={styles.sectionLabel}>{t('backup.exportLabel')}</Text>
            {code ? (
              <Text selectable style={styles.codeBox}>
                {code}
              </Text>
            ) : null}
            <View style={styles.row}>
              <Pressable
                accessibilityRole="button"
                onPress={revealCode}
                style={[styles.btn, styles.btnGhost]}
              >
                <Text style={styles.btnGhostText}>{t('backup.showCode')}</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={shareCode}
                style={[styles.btn, styles.btnPrimary]}
              >
                <Text style={styles.btnPrimaryText}>{t('backup.share')}</Text>
              </Pressable>
            </View>
            {code ? <Text style={styles.hint}>{t('backup.copyHint')}</Text> : null}

            <Text style={styles.sectionLabel}>{t('backup.importLabel')}</Text>
            <TextInput
              value={input}
              onChangeText={setInput}
              placeholder={t('backup.inputPlaceholder')}
              placeholderTextColor="rgba(214, 199, 176, 0.4)"
              style={styles.input}
              multiline
              autoCapitalize="none"
              autoCorrect={false}
            />
            <Pressable
              accessibilityRole="button"
              onPress={restore}
              disabled={!input.trim()}
              style={[styles.btn, styles.btnPrimary, !input.trim() && styles.btnDisabled]}
            >
              <Text style={styles.btnPrimaryText}>{t('backup.restore')}</Text>
            </Pressable>
            <Text style={styles.warn}>{t('backup.adFreeNote')}</Text>
          </ScrollView>

          <Pressable accessibilityRole="button" onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeText}>{t('common.confirm')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(6, 3, 2, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    maxHeight: '86%',
    backgroundColor: 'rgba(18, 10, 6, 0.98)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.5)',
    borderRadius: 16,
    padding: 20,
  },
  title: { fontSize: 20, color: colors.cream, letterSpacing: 1, textAlign: 'center' },
  scroll: { marginTop: 14 },
  scrollBody: { paddingBottom: 4 },
  desc: { fontSize: 13, lineHeight: 20, color: colors.sand },
  sectionLabel: {
    marginTop: 18,
    fontSize: 12,
    fontWeight: '800',
    color: colors.ochre,
    letterSpacing: 0.5,
  },
  codeBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.25)',
    color: colors.cream,
    fontSize: 11,
    lineHeight: 16,
  },
  row: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.ochre },
  btnPrimaryText: { fontSize: 14, fontWeight: '800', color: colors.darkBrown },
  btnGhost: { borderWidth: 1, borderColor: 'rgba(212, 165, 116, 0.5)' },
  btnGhostText: { fontSize: 14, fontWeight: '700', color: colors.sand },
  btnDisabled: { opacity: 0.45 },
  hint: { marginTop: 8, fontSize: 11, lineHeight: 16, color: 'rgba(214, 199, 176, 0.7)' },
  input: {
    marginTop: 8,
    minHeight: 76,
    padding: 10,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    borderWidth: 1,
    borderColor: 'rgba(212, 165, 116, 0.25)',
    color: colors.cream,
    fontSize: 12,
    textAlignVertical: 'top',
  },
  warn: {
    marginTop: 14,
    fontSize: 11,
    lineHeight: 16,
    color: 'rgba(214, 199, 176, 0.6)',
  },
  closeBtn: { marginTop: 16, paddingVertical: 10, alignItems: 'center' },
  closeText: { fontSize: 14, fontWeight: '700', color: colors.sand },
});
