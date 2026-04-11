import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors } from '@/constants/theme';
import { usePhoneStageMetrics } from '@/hooks/usePhoneStageMetrics';

type Props = {
  visible: boolean;
  onResume: () => void;
  /** NPC 모드: 선택 화면 복귀 등 */
  onSecondaryExit?: () => void;
  secondaryLabel?: string;
  onMainMenu: () => void;
};

export function PauseMenuModal({
  visible,
  onResume,
  onSecondaryExit,
  secondaryLabel,
  onMainMenu,
}: Props) {
  const { stageWidth } = usePhoneStageMetrics();
  const cardWidth = Math.min(380, Math.max(260, stageWidth - 40));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onResume}
    >
      <View style={styles.backdrop}>
        <View style={[styles.card, { width: cardWidth, alignSelf: 'center' }]}>
          <Text style={styles.title}>일시정지</Text>
          <Pressable
            accessibilityLabel="계속하기"
            accessibilityRole="button"
            onPress={onResume}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnPrimaryText}>계속하기</Text>
          </Pressable>
          {onSecondaryExit != null && secondaryLabel != null ? (
            <Pressable
              accessibilityLabel={secondaryLabel}
              accessibilityRole="button"
              onPress={onSecondaryExit}
              style={styles.btn}
            >
              <Text style={styles.btnText}>{secondaryLabel}</Text>
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel="메인 메뉴"
            accessibilityHint="타이틀 화면이 있는 메뉴로 이동합니다"
            accessibilityRole="button"
            onPress={onMainMenu}
            style={styles.btn}
          >
            <Text style={styles.btnText}>메인 메뉴</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    borderRadius: 16,
    padding: 22,
    backgroundColor: '#3D2414',
    borderWidth: 2,
    borderColor: colors.sand,
    gap: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.ochre,
    marginBottom: 6,
    textAlign: 'center',
  },
  btnPrimary: {
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.ochre,
  },
  btnPrimaryText: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.darkBrown,
    fontSize: 16,
  },
  btn: {
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.sand,
  },
  btnText: {
    textAlign: 'center',
    fontWeight: '700',
    color: colors.cream,
    fontSize: 15,
  },
});
