import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, useWindowDimensions } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { isWeb } from '@/lib/platform';
import { fetchMyVehicles } from '@/lib/api-vehicles';
import type { Vehicle } from '@/types/vehicle';
import { displayPrice } from '@/lib/currencyConverter';

type Transaction = {
  id: string;
  title: string;
  price: string;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  type: 'bought' | 'sold';
  image?: string;
};

export default function HistoryScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'History | Inzira';
    }
  }, []);

  const { t } = useTranslation();
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(false);
    setTransactions([]);
  }, []);

  const goToVehicle = (id: string) => {
    const href = `/vehicle/${id}` as any;
    router.push(href);
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{t('legal.history.title')}</ThemedText>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={isDesktopWeb} 
        contentContainerStyle={[styles.scrollContent, isDesktopWeb && styles.webScrollContent]}>
        {isLoading ? (
          <View style={styles.emptyState}>
            <ThemedText style={{ color: colors.icon }}>{t('legal.history.loading')}</ThemedText>
          </View>
        ) : transactions.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol name="car.fill" size={48} color={colors.icon} style={{ marginBottom: 16 }} />
            <ThemedText style={{ color: colors.icon, fontSize: 16 }}>{t('legal.history.noHistory')}</ThemedText>
          </View>
        ) : (
          transactions.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.historyCard, { backgroundColor: colors.background, borderColor: colors.border }]} onPress={() => goToVehicle(item.id)}>
              <Image source={{ uri: item.image }} style={styles.historyImage} contentFit="cover" />
              <View style={styles.historyInfo}>
                <View style={styles.historyHeader}>
                  <View style={[styles.statusBadge, { backgroundColor: item.type === 'sold' ? `${colors.primary}20` : '#10B98120' }]}>
                    <ThemedText style={[styles.statusText, { color: item.type === 'sold' ? colors.primary : '#10B981' }]}>
                      {item.status}
                    </ThemedText>
                  </View>
                  <ThemedText style={[styles.dateText, { color: colors.icon }]}>{item.date}</ThemedText>
                </View>
                
                <ThemedText style={styles.historyTitle} numberOfLines={2}>{item.title}</ThemedText>
                <ThemedText style={[styles.historyPrice, { color: colors.text }]}>{displayPrice(Number(item.price) || 0)}</ThemedText>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtn: {
    marginRight: 12,
    padding: 4,
    marginLeft: -4,
  },
  headerTitle: {
    fontSize: 20,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  historyCard: {
    flexDirection: 'row',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    height: 100,
  },
  historyImage: {
    width: 100,
    height: '100%',
  },
  historyInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'space-between',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  dateText: {
    fontSize: 12,
  },
  historyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 4,
  },
  historyPrice: {
    fontSize: 16,
    fontWeight: '700',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  webScrollContent: {
    paddingHorizontal: 400,
    paddingVertical: 24,
  },
});
