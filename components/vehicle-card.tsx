import React from 'react';
import { View, TouchableOpacity, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Image } from 'expo-image';

import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors, Radius, Elevation } from '@/constants/theme';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { resolveImageUrl } from '@/lib/image-url';
import { displayPrice } from '@/lib/currencyConverter';
import { getUsageStatusColor } from '@/lib/usage-status';
import type { Vehicle } from '@/types/vehicle';

type Variant = 'grid' | 'compact';

interface VehicleCardProps {
  vehicle: Vehicle;
  isFavorited?: boolean;
  onPress: () => void;
  onToggleFavorite?: () => void;
  variant?: Variant;
  style?: StyleProp<ViewStyle> | any;
  hideFavorite?: boolean;
}

const isVerified = (v: Vehicle) =>
  v.verificationStatus === 'approved' ||
  v.sellerTier === 'trusted' ||
  v.sellerTier === 'dealer_pro';

const formatMileage = (mileage?: string) => {
  if (!mileage) return null;
  const n = Number(mileage);
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString()} km` : null;
};

export function VehicleCard({
  vehicle,
  isFavorited,
  onPress,
  onToggleFavorite,
  variant = 'grid',
  style,
  hideFavorite,
}: VehicleCardProps) {
  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const isDark = theme === 'dark';

  const verified = isVerified(vehicle);
  const isCompany = vehicle.sellerType === 'company';
  const isDealer = isCompany || !!vehicle.isBrokered;
  const usage = vehicle.usageStatus;
  const mileage = formatMileage(vehicle.mileage);
  const isSold = vehicle.status === 'sold';
  const sellerName = vehicle.sellerName || vehicle.seller?.fullName || null;
  const specLine = [vehicle.year, mileage, vehicle.fuelType].filter(Boolean).join(' · ');

  const cardBg = isDark ? colors.card : '#FFFFFF';
  const cardBorder = isDark ? colors.border : '#E8EAF0';
  const usageColor = usage ? getUsageStatusColor(usage) : null;

  // ── Compact ─────────────────────────────────────────────────────────────────
  if (variant === 'compact') {
    return (
      <TouchableOpacity
        style={[styles.compactCard, { backgroundColor: cardBg, borderColor: cardBorder }, style]}
        onPress={onPress}
        activeOpacity={0.88}
      >
        {/* Thumbnail */}
        <View style={styles.compactThumb}>
          <Image
            source={{ uri: resolveImageUrl(vehicle.images?.[0]) }}
            style={styles.compactImage}
            contentFit="cover"
          />
          {isSold && (
            <View style={styles.soldOverlay}>
              <ThemedText style={styles.soldLabel}>SOLD</ThemedText>
            </View>
          )}
          {usage && usageColor && (
            <View style={[styles.usagePill, { backgroundColor: `${usageColor}E6` }]}>
              <View style={[styles.usageDot, { backgroundColor: '#fff' }]} />
              <ThemedText style={styles.usagePillText} numberOfLines={1}>{usage}</ThemedText>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.compactInfo}>
          <View style={styles.titleRow}>
            <ThemedText style={[styles.title, { color: colors.text }]} numberOfLines={2}>
              {vehicle.title}
            </ThemedText>
            {verified && (
              <View style={styles.verifiedBadge}>
                <IconSymbol name="checkmark" size={7} color="#fff" />
              </View>
            )}
          </View>

          <ThemedText style={[styles.price, { color: colors.primary }]} numberOfLines={1}>
            {displayPrice(Number(vehicle.price) || 0)}
          </ThemedText>

          {!!specLine && (
            <ThemedText style={[styles.spec, { color: colors.icon }]} numberOfLines={1}>
              {specLine}
            </ThemedText>
          )}

          {/* Seller footer */}
          {(sellerName || isDealer) && (
            <View style={styles.sellerRow}>
              <View style={[styles.sellerAvatar, { backgroundColor: `${colors.icon}18` }]}>
                <IconSymbol name="person.fill" size={9} color={colors.icon} />
              </View>
              <ThemedText style={[styles.sellerName, { color: colors.icon }]} numberOfLines={1}>
                {isDealer ? `${sellerName ?? 'Dealer'} · Dealer` : sellerName}
              </ThemedText>
            </View>
          )}
        </View>

        {/* Heart */}
        {!hideFavorite && onToggleFavorite && (
          <TouchableOpacity
            style={[styles.heartBtn, {
              backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
            }]}
            onPress={(e) => { e.stopPropagation?.(); onToggleFavorite(); }}
            hitSlop={12}
          >
            <IconSymbol name="heart.fill" size={14} color={isFavorited ? '#EF4444' : colors.icon} />
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  }

  // ── Grid ────────────────────────────────────────────────────────────────────
  return (
    <TouchableOpacity
      style={[styles.gridCard, { backgroundColor: cardBg, borderColor: cardBorder }, style]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.imageWrap}>
        <Image
          source={{ uri: resolveImageUrl(vehicle.images?.[0]) }}
          style={styles.image}
          contentFit="cover"
        />

        {isSold && (
          <View style={[styles.soldOverlay, { zIndex: 3 }]}>
            <ThemedText style={styles.soldLabel}>SOLD</ThemedText>
          </View>
        )}

        {/* TOP-LEFT: Dealer pill */}
        {isDealer && (
          <View style={styles.dealerPill}>
            <ThemedText style={styles.dealerPillText}>Dealer</ThemedText>
          </View>
        )}

        {/* TOP-RIGHT: Favorite */}
        {!hideFavorite && onToggleFavorite && (
          <TouchableOpacity
            style={[styles.favoriteBtn, {
              backgroundColor: isDark ? 'rgba(0,0,0,0.50)' : 'rgba(255,255,255,0.90)',
              borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            }]}
            onPress={(e) => { e.stopPropagation?.(); onToggleFavorite(); }}
            hitSlop={8}
          >
            <IconSymbol name="heart.fill" size={12} color={isFavorited ? '#EF4444' : (isDark ? 'rgba(255,255,255,0.7)' : colors.icon)} />
          </TouchableOpacity>
        )}

        {/* BOTTOM-LEFT: Usage */}
        {usage && usageColor && (
          <View style={[styles.usagePill, { backgroundColor: `${usageColor}EC` }]}>
            <View style={[styles.usageDot, { backgroundColor: 'rgba(255,255,255,0.9)' }]} />
            <ThemedText style={styles.usagePillText} numberOfLines={1}>{usage}</ThemedText>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <ThemedText style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {vehicle.title}
          </ThemedText>
          {verified && (
            <View style={styles.verifiedBadge}>
              <IconSymbol name="checkmark" size={7} color="#fff" />
            </View>
          )}
        </View>

        <ThemedText style={[styles.price, { color: colors.primary }]} numberOfLines={1}>
          {displayPrice(Number(vehicle.price) || 0)}
        </ThemedText>

        {!!specLine && (
          <ThemedText style={[styles.spec, { color: colors.icon }]} numberOfLines={1}>
            {specLine}
          </ThemedText>
        )}

        {/* Seller footer */}
        {(sellerName || isDealer) && (
          <>
            <View style={[styles.divider, { backgroundColor: cardBorder }]} />
            <View style={styles.sellerRow}>
              <View style={[styles.sellerAvatar, { backgroundColor: `${colors.icon}18` }]}>
                <IconSymbol name="person.fill" size={9} color={colors.icon} />
              </View>
              <ThemedText style={[styles.sellerName, { color: colors.icon }]} numberOfLines={1}>
                {isDealer ? `${sellerName ?? 'Dealer'} · Dealer` : sellerName}
              </ThemedText>
            </View>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // ── Grid ────────────────────────────────────────────────────────────────────
  gridCard: {
    borderRadius: Radius.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: 'hidden',
    ...Elevation.card,
  },
  imageWrap: {
    width: '100%',
    aspectRatio: 16 / 10,
    position: 'relative',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  image: { width: '100%', height: '100%' },

  body: { padding: 11, gap: 3 },

  // ── Shared across both variants ─────────────────────────────────────────────
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  title: { flex: 1, fontSize: 13, fontWeight: '700', letterSpacing: -0.2, lineHeight: 18 },
  price: { fontSize: 15, fontWeight: '800', letterSpacing: -0.4, marginTop: 1 },
  spec: { fontSize: 11, fontWeight: '500', opacity: 0.8 },

  // Seller footer — identical on every card
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 8 },
  sellerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2, overflow: 'hidden' },
  sellerDot: { width: 5, height: 5, borderRadius: 3, flexShrink: 0 },
  sellerAvatar: {
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  dealerAvatarText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.2 },
  sellerName: { fontSize: 11, fontWeight: '600', flex: 1 },

  verifiedBadge: {
    width: 15, height: 15, borderRadius: 8, backgroundColor: '#2563EB',
    alignItems: 'center', justifyContent: 'center', marginTop: 2, flexShrink: 0,
  },

  // Image overlay badges — paddingVertical: 0
  usagePill: {
    position: 'absolute', bottom: 8, left: 8, zIndex: 2,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 7, paddingVertical: 0,
    borderRadius: Radius.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  usagePillText: { color: '#fff', fontSize: 9, fontWeight: '800', letterSpacing: 0.4, lineHeight: 18 },
  usageDot: { width: 5, height: 5, borderRadius: 3 },

  dealerPill: {
    position: 'absolute', top: 8, left: 8, zIndex: 2,
    paddingHorizontal: 6, paddingVertical: 0,
    borderRadius: Radius.pill,
    backgroundColor: 'rgba(10,37,64,0.68)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  dealerPillText: { color: 'rgba(255,255,255,0.95)', fontSize: 9, fontWeight: '700', letterSpacing: 0.3, lineHeight: 18 },

  favoriteBtn: {
    position: 'absolute', top: 8, right: 8, zIndex: 2,
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  soldOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.42)',
    alignItems: 'center', justifyContent: 'center',
  },
  soldLabel: { color: '#fff', fontSize: 15, fontWeight: '900', letterSpacing: 2.5 },

  // ── Compact ──────────────────────────────────────────────────────────────────
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: Radius.lg,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    ...Elevation.flat,
  },
  compactThumb: {
    width: 104,
    height: 100,
    borderRadius: Radius.md,
    overflow: 'hidden',
    position: 'relative',
    flexShrink: 0,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  compactImage: { width: '100%', height: '100%' },
  compactInfo: { flex: 1, gap: 2, justifyContent: 'center', overflow: 'hidden' },

  heartBtn: {
    width: 30, height: 30, borderRadius: 15,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
});
