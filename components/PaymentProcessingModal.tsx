import React, { useEffect, useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  Platform,
  useColorScheme as useRNColorScheme,
  TouchableOpacity,
} from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';

export type PaymentProcessingModalProps = {
  visible: boolean;
  status: 'processing' | 'success' | 'failed';
  message?: string;
  onDismiss?: () => void;
};

const DISMISS_AFTER_MS = 60_000;
const AUTO_CANCEL_AFTER_MS = 150_000;

export function PaymentProcessingModal({
  visible,
  status,
  message,
  onDismiss,
}: PaymentProcessingModalProps) {
  const colorScheme = useRNColorScheme();
  const isDark = colorScheme === 'dark';
  const startTimeRef = useRef<number | null>(null);
  const dismissShownRef = useRef(false);
  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;
  const [elapsedSec, setElapsedSec] = useState(0);
  const [dismissShown, setDismissShown] = useState(false);
  const [autoCancelled, setAutoCancelled] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoCancelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible && status === 'processing') {
      startTimeRef.current = Date.now();
      dismissShownRef.current = false;
      setElapsedSec(0);
      setDismissShown(false);
      setAutoCancelled(false);

      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - (startTimeRef.current || Date.now());
        const sec = Math.floor(elapsed / 1000);
        setElapsedSec(sec);
        if (sec >= 60 && !dismissShownRef.current) {
          dismissShownRef.current = true;
          setDismissShown(true);
        }
      }, 1000);

      autoCancelTimerRef.current = setTimeout(() => {
        setAutoCancelled(true);
        onDismissRef.current?.();
      }, AUTO_CANCEL_AFTER_MS);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (autoCancelTimerRef.current) {
        clearTimeout(autoCancelTimerRef.current);
        autoCancelTimerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (autoCancelTimerRef.current) {
        clearTimeout(autoCancelTimerRef.current);
        autoCancelTimerRef.current = null;
      }
    };
  }, [visible, status]);

  const colors = {
    background: isDark ? '#1C1C1E' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#000000',
    textSecondary: isDark ? '#8E8E93' : '#666666',
    success: '#34C759',
    error: '#FF3B30',
    warning: '#FF9500',
  };

  const getStatusConfig = () => {
    switch (status) {
      case 'processing':
        return {
          icon: null,
          color: colors.warning,
          title: 'Processing Payment',
          description: message || 'Please approve the payment on your phone...',
        };
      case 'success':
        return {
          icon: 'checkmark.circle.fill' as const,
          color: colors.success,
          title: 'Payment Successful',
          description: message || 'Your subscription has been activated!',
        };
      case 'failed':
        return {
          icon: 'xmark.circle.fill' as const,
          color: colors.error,
          title: 'Payment Failed',
          description: message || 'Payment was not completed. Please try again.',
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={styles.iconContainer}>
            {status === 'processing' ? (
              <ActivityIndicator size="large" color={config.color} />
            ) : (
              <IconSymbol name={config.icon!} size={64} color={config.color} />
            )}
          </View>

          <Text style={[styles.title, { color: colors.text }]}>
            {config.title}
          </Text>

          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {config.description}
          </Text>

          {status === 'processing' && (
            <>
              <Text style={[styles.timer, { color: colors.textSecondary }]}>
                {elapsedSec < 60
                  ? 'Waiting for approval...'
                  : autoCancelled
                    ? 'Cancelling...'
                    : `Waiting for ${Math.max(0, 150 - elapsedSec)}s...`}
              </Text>
              {dismissShown && !autoCancelled && onDismiss && (
                <TouchableOpacity
                  style={[styles.dismissBtn, { borderColor: colors.error }]}
                  onPress={() => {
                    if (autoCancelTimerRef.current) {
                      clearTimeout(autoCancelTimerRef.current);
                      autoCancelTimerRef.current = null;
                    }
                    onDismiss();
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dismissText, { color: colors.error }]}>
                    Cancel Payment
                  </Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {status !== 'processing' && (
            <TouchableOpacity
              style={[styles.dismissBtn, { borderColor: colors.textSecondary }]}
              onPress={onDismiss}
              activeOpacity={0.7}
            >
              <Text style={[styles.dismissText, { color: colors.textSecondary }]}>
                {status === 'success' ? 'Continue' : 'Close'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      },
    }),
  },
  iconContainer: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  timer: {
    fontSize: 13,
    marginTop: 16,
    textAlign: 'center',
  },
  dismissBtn: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderRadius: 8,
    minWidth: 140,
    alignItems: 'center',
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
