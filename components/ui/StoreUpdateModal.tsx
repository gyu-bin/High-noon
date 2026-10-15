import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FONT_RYE } from '@/constants/fonts';
import { MINIMUM_STORE_VERSION } from '@/constants/release';
import { colors } from '@/constants/theme';
import {
  getInstalledStoreVersion,
  getStoreListingUrl,
} from '@/utils/storeUpdate';

type Props = {
  visible: boolean;
  onDismiss: () => void;
};

export function StoreUpdateModal({ visible, onDismiss }: Props) {
  const { t } = useTranslation();
  const installed = getInstalledStoreVersion();

  const openStore = () => {
    void Linking.openURL(getStoreListingUrl());
  };

  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onDismiss}
      supportedOrientations={['portrait', 'landscape']}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={[styles.title, { fontFamily: FONT_RYE }]}>
            {t('storeUpdate.title')}
          </Text>
          <Text style={styles.body}>
            {t('storeUpdate.body', {
              current: installed,
              required: MINIMUM_STORE_VERSION,
            })}
          </Text>
          <Pressable
            accessibilityLabel={t('storeUpdate.openStoreA11y')}
            accessibilityRole="button"
            onPress={openStore}
            style={styles.btnPrimary}
          >
            <Text style={styles.btnPrimaryText}>{t('storeUpdate.openStore')}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={t('storeUpdate.laterA11y')}
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.btnSecondary}
          >
            <Text style={styles.btnSecondaryText}>{t('storeUpdate.later')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 16,
    paddingHorizontal: 22,
    paddingVertical: 22,
    backgroundColor: '#3D2414',
    borderWidth: 2,
    borderColor: colors.sand,
    gap: 12,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    color: colors.ochre,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  body: {
    alignSelf: 'stretch',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
    color: colors.cream,
    textAlign: 'center',
  },
  btnPrimary: {
    alignSelf: 'stretch',
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: colors.ochre,
    marginTop: 4,
  },
  btnPrimaryText: {
    textAlign: 'center',
    fontWeight: '800',
    color: colors.darkBrown,
    fontSize: 16,
  },
  btnSecondary: {
    paddingVertical: 8,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.sand,
  },
});
