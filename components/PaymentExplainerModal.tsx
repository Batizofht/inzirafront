import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  useColorScheme as useRNColorScheme,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

export type PaymentExplainerKind = 'verification' | 'listing_fee' | 'subscription';

export type PaymentExplainerModalProps = {
  visible: boolean;
  kind: PaymentExplainerKind;
  /** Optional human-readable amount label, e.g. "RWF 10,000". Shown in the intro line when provided. */
  amountLabel?: string;
  onAccept: () => void;
  onClose: () => void;
};

/**
 * A non-invasive "explainer" shown BEFORE the real PaymentModal.
 * It does not initiate or modify any payment — it only explains what the
 * upcoming charge is for. Tapping "Yes, I understand" calls onAccept(), which
 * the caller uses to open the existing PaymentModal unchanged.
 *
 * The FIRST bullet is tailored to the specific payment type so the user always
 * understands what they are paying for and whether they'll need to pay again.
 */
export function PaymentExplainerModal({
  visible,
  kind,
  amountLabel,
  onAccept,
  onClose,
}: PaymentExplainerModalProps) {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';

  const colors = {
    background: isDark ? '#1C1C1E' : '#FFFFFF',
    card: isDark ? '#2C2C2E' : '#F5F5F5',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#666666',
    border: isDark ? '#3A3A3C' : '#E5E5E5',
    primary: '#007AFF',
    accent: isDark ? '#FFD60A' : '#B45309',
    accentBg: isDark ? 'rgba(255, 214, 10, 0.12)' : 'rgba(180, 83, 9, 0.08)',
  };

  const { title, firstPoint } = getCopy(kind);

  // First bullet is type-specific; the rest are generic "how payment works".
  const points: string[] = [
    firstPoint,
    'On the next screen you will enter your Mobile Money number and confirm.',
    'You will receive a payment prompt on your phone — you are only charged after you approve it there.',
    'Nothing is charged if you cancel or close this screen.',
  ];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityLabel="Close">
              <IconSymbol name="xmark" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Icon */}
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: colors.card }]}>
              <IconSymbol name="exclamationmark.triangle.fill" size={30} color={colors.accent} />
            </View>
          </View>

          <Text style={[styles.intro, { color: colors.textSecondary }]}>
            {amountLabel
              ? `Before you pay ${amountLabel}, here's how this payment works:`
              : 'Before you continue, here’s how this payment works:'}
          </Text>

          {/* Points */}
          <ScrollView style={styles.pointsScroll} showsVerticalScrollIndicator={false}>
            {points.map((point, index) => (
              <View
                key={index}
                style={[
                  styles.pointRow,
                  index === 0 && { backgroundColor: colors.accentBg, borderRadius: 10, padding: 12 },
                ]}
              >
                <IconSymbol
                  name={index === 0 ? 'exclamationmark.circle.fill' : 'checkmark.circle.fill'}
                  size={18}
                  color={index === 0 ? colors.accent : colors.primary}
                  style={styles.pointIcon}
                />
                <Text
                  style={[
                    styles.pointText,
                    { color: index === 0 ? colors.text : colors.textSecondary },
                    index === 0 && styles.firstPointText,
                  ]}
                >
                  {point}
                </Text>
              </View>
            ))}
          </ScrollView>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.cancelButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: colors.primary }]}
              onPress={onAccept}
            >
              <Text style={styles.confirmButtonText}>Yes, I understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getCopy(kind: PaymentExplainerKind): { title: string; firstPoint: string } {
  switch (kind) {
    case 'verification':
      return {
        title: 'About this payment',
        firstPoint:
          'This is a one-time verification fee. You pay it once to start selling as an individual — it never expires.',
      };
    case 'listing_fee':
      return {
        title: 'About listing credits',
        firstPoint:
          'This pays for listing credits: 1 credit = 1 vehicle (Single), or buy a Bundle of 3. You’ll choose on the next screen. Each listing uses one credit — when your credits run out you’ll need to pay again to list more.',
      };
    case 'subscription':
      return {
        title: 'About your subscription',
        firstPoint:
          'This is a recurring dealership subscription — Monthly or Annual (you’ll choose on the next screen). It renews each period; while active you can keep listing vehicles. After it expires you’ll need to renew.',
      };
  }
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
      web: { boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)' },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intro: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 21,
  },
  pointsScroll: {
    maxHeight: 280,
    marginBottom: 20,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  pointIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  pointText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  firstPointText: {
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {},
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
