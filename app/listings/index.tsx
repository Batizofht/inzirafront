import { StyleSheet, ScrollView, View, TouchableOpacity, Platform, StatusBar, Modal, TextInput, useWindowDimensions } from 'react-native';
import { useResolvedTheme } from '@/hooks/use-resolved-theme';
import { Colors } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { fetchMyVehicles, deleteVehicle } from '@/lib/api-vehicles';
import type { Vehicle } from '@/types/vehicle';
import { isWeb } from '@/lib/platform';
import { resolveImageUrl } from '@/lib/image-url';

export default function ListingsScreen() {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'My Listings | Inzira';
    }
  }, []);

  const theme = useResolvedTheme();
  const colors = Colors[theme];
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const isDesktopWeb = isWeb && width >= 768;
  const isWebMd = isWeb && width >= 768 && width < 1024;
  const isWebLg = isWeb && width >= 1024 && width < 1440;
  const isWebXl = isWeb && width >= 1440;
  const listingsContainerMaxWidth = isWebXl ? 1024 : isWebLg ? 940 : isWebMd ? 860 : undefined;
  const listingsContainerPadding = isWebXl ? 28 : isWebLg ? 24 : 20;
  // Card width for 2-column grid
  const cardWidth = 'calc(50% - 12px)';
  const modalMaxWidth = isDesktopWeb ? 420 : undefined;
  
  const [listings, setListings] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [confirmText, setConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Refresh listings when screen comes into focus (e.g., after resubmit)
  useFocusEffect(
    useCallback(() => {
      const loadListings = async () => {
        try {
          setIsLoading(true);
          const res = await fetchMyVehicles();
          setListings(res.data.vehicles);
        } catch (err) {
          console.error('Failed to load listings:', err);
        } finally {
          setIsLoading(false);
        }
      };
      loadListings();
    }, [])
  );

  const goToVehicle = (id: string) => {
    const href = `/vehicle/${id}` as any;
    router.push(href);
  };

  const handleOpenDeleteModal = (vehicle: Vehicle) => {
    setVehicleToDelete(vehicle);
    setConfirmText('');
    setDeleteModalVisible(true);
  };

  const handleCloseDeleteModal = () => {
    setDeleteModalVisible(false);
    setVehicleToDelete(null);
    setConfirmText('');
    setIsDeleting(false);
  };

  const handleConfirmDelete = async () => {
    if (!vehicleToDelete || confirmText !== vehicleToDelete.title) return;
    
    try {
      setIsDeleting(true);
      await deleteVehicle(vehicleToDelete.id);
      setListings(prev => prev.filter(v => v.id !== vehicleToDelete.id));
      handleCloseDeleteModal();
    } catch (err) {
      console.error('Failed to delete vehicle:', err);
      alert('Failed to delete vehicle. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <View style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { backgroundColor: colors.background, borderBottomColor: colors.border },
          isDesktopWeb && styles.webHeader,
          isDesktopWeb && {
            maxWidth: listingsContainerMaxWidth,
            paddingHorizontal: listingsContainerPadding,
          },
        ]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <IconSymbol name="chevron.left" size={24} color={colors.text} />
          </TouchableOpacity>
          <ThemedText type="defaultSemiBold" style={styles.headerTitle}>{t('profile.myListings')}</ThemedText>
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => router.push('/sell')}>
          <IconSymbol name="plus.circle" size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={isDesktopWeb} contentContainerStyle={styles.scrollContent}>
        <View
          style={[
            isDesktopWeb && styles.webScrollContent,
            isDesktopWeb && {
              maxWidth: listingsContainerMaxWidth,
              paddingHorizontal: listingsContainerPadding,
            },
          ]}>
          {isLoading ? (
            <View style={styles.emptyState}>
              <ThemedText style={{ color: colors.icon }}>Loading...</ThemedText>
            </View>
          ) : listings.length === 0 ? (
            <View style={styles.emptyState}>
              <IconSymbol name="car.fill" size={48} color={colors.icon} style={{ marginBottom: 16 }} />
              <ThemedText style={{ color: colors.icon, fontSize: 16 }}>You have no active listings.</ThemedText>
              <TouchableOpacity style={[styles.createButton, { backgroundColor: colors.primary }]} onPress={() => router.push('/sell')}>
                <ThemedText style={{ color: '#fff', fontWeight: '600' }}>Create Listing</ThemedText>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[isWeb && styles.webGrid]}>
            {listings.map((listing) => (
              <TouchableOpacity key={listing.id} style={[styles.listingCard, isWeb && [styles.webListingCard, { width: cardWidth as any }], { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => goToVehicle(listing.id)}>
                <Image source={{ uri: resolveImageUrl(listing.images?.[0]) }} style={styles.listingImage} contentFit="cover" />
                <View style={styles.listingInfo}>
                  <View style={styles.listingHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, marginRight: 12 }}>
                      <ThemedText style={[styles.listingTitle, { marginRight: 0 }]} numberOfLines={2}>{listing.title}</ThemedText>
                      {listing.isBrokered && (
                        <View style={{ backgroundColor: '#8B5CF6', borderRadius: 8, width: 16, height: 16, justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
                          <ThemedText style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>B</ThemedText>
                        </View>
                      )}
                    </View>
                    <View style={styles.headerActions}>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.card }]}
                        onPress={() => router.push(`/vehicle/edit?id=${listing.id}` as any)}
                      >
                        <IconSymbol name="pencil" size={16} color={colors.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={[styles.actionBtn, { backgroundColor: colors.card }]}
                        onPress={() => handleOpenDeleteModal(listing)}
                      >
                        <IconSymbol name="trash" size={16} color="#DC2626" />
                      </TouchableOpacity>
                      <View style={[styles.statusBadge, { 
                        backgroundColor: listing.status === 'active' ? '#10B98120' : 
                                        listing.status === 'rejected' ? '#DC262620' : 
                                        listing.status === 'pending' ? '#F59E0B20' : `${colors.primary}20`,
                        borderWidth: listing.status === 'rejected' ? 1 : 0,
                        borderColor: listing.status === 'rejected' ? '#DC2626' : undefined,
                      }]}>
                        <ThemedText style={[styles.statusText, { 
                          color: listing.status === 'active' ? '#10B981' : 
                                 listing.status === 'rejected' ? '#DC2626' : 
                                 listing.status === 'pending' ? '#F59E0B' : colors.primary,
                          textTransform: 'uppercase',
                        }]}>
                          {listing.status}
                        </ThemedText>
                      </View>
                    </View>
                  </View>
                  
                  {listing.status === 'rejected' && (
                    <View style={styles.rejectedNote}>
                      <IconSymbol name="exclamationmark.triangle.fill" size={14} color="#DC2626" />
                      <ThemedText style={styles.rejectedText}>
                        {listing.rejectionReason ? `Rejected: ${listing.rejectionReason}` : 'This listing was rejected. Tap to review and resubmit.'}
                      </ThemedText>
                    </View>
                  )}
                  
                  {listing.status === 'pending' && (
                    <View style={styles.pendingNote}>
                      <IconSymbol name="clock.fill" size={14} color="#F59E0B" />
                      <ThemedText style={styles.pendingText}>Awaiting admin approval</ThemedText>
                    </View>
                  )}
                  
                  <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                      <IconSymbol name="person.fill" size={14} color={colors.icon} style={styles.statIcon} />
                      <ThemedText style={[styles.statText, { color: colors.icon }]}>{listing.views || 0} Views</ThemedText>
                    </View>
                    <View style={styles.statItem}>
                      <IconSymbol name="message.fill" size={14} color={colors.icon} style={styles.statIcon} />
                      <ThemedText style={[styles.statText, { color: colors.icon }]}>{listing.inquiries || 0} Inquiries</ThemedText>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        transparent
        animationType="fade"
        visible={deleteModalVisible}
        onRequestClose={handleCloseDeleteModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background, maxWidth: modalMaxWidth }]}>
            <View style={styles.modalHeader}>
              <IconSymbol name="exclamationmark.triangle.fill" size={48} color="#DC2626" />
              <ThemedText type="defaultSemiBold" style={styles.modalTitle}>Delete Listing</ThemedText>
              <ThemedText style={[styles.modalSubtitle, { color: colors.icon }]}>
                This action cannot be undone. To confirm, please type the car name below.
              </ThemedText>
            </View>

            <View style={styles.modalContent}>
              <ThemedText style={[styles.carNameLabel, { color: colors.text }]}>
                Car name to delete:
              </ThemedText>
              <ThemedText type="defaultSemiBold" style={[styles.carNameToConfirm, { color: colors.primary }]}>
                {vehicleToDelete?.title}
              </ThemedText>

              <TextInput
                style={[styles.confirmInput, { 
                  backgroundColor: colors.card, 
                  borderColor: confirmText && confirmText !== vehicleToDelete?.title ? '#DC2626' : colors.border,
                  color: colors.text 
                }]}
                placeholder="Type car name here"
                placeholderTextColor={colors.icon}
                value={confirmText}
                onChangeText={setConfirmText}
                autoCapitalize="none"
                autoCorrect={false}
              />
              
              {confirmText && confirmText !== vehicleToDelete?.title && (
                <ThemedText style={styles.errorText}>Car name doesn't match</ThemedText>
              )}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={[styles.cancelBtn, { borderColor: colors.border }]}
                onPress={handleCloseDeleteModal}
                disabled={isDeleting}
              >
                <ThemedText style={{ fontWeight: '600' }}>Cancel</ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.deleteBtn, { 
                  backgroundColor: confirmText === vehicleToDelete?.title ? '#DC2626' : '#9CA3AF',
                  opacity: isDeleting ? 0.7 : 1 
                }]}
                onPress={handleConfirmDelete}
                disabled={confirmText !== vehicleToDelete?.title || isDeleting}
              >
                <ThemedText style={{ color: '#fff', fontWeight: '600' }}>
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  webHeader: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 24,
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
  addButton: {
    padding: 4,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  webScrollContent: {
    width: '100%',
    maxWidth: 1120,
    alignSelf: 'center',
    paddingHorizontal: 24,
  },
  webGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
    width: '100%',
  },
  webListingCard: {
    marginBottom: 0,
  },
  listingCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  listingImage: {
    width: '100%',
    height: 160,
  },
  listingInfo: {
    padding: 16,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  listingTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    marginRight: 12,
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
  listingPrice: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E7EB',
  },
  rejectedNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC262610',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#DC262630',
  },
  rejectedText: {
    fontSize: 12,
    color: '#DC2626',
    marginLeft: 8,
    flex: 1,
  },
  pendingNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F59E0B10',
    borderRadius: 8,
    padding: 10,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#F59E0B30',
  },
  pendingText: {
    fontSize: 12,
    color: '#F59E0B',
    marginLeft: 8,
    flex: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statIcon: {
    marginRight: 4,
  },
  statText: {
    fontSize: 13,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  createButton: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 16,
    padding: 24,
  },
  modalHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    marginTop: 16,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalContent: {
    marginBottom: 24,
  },
  carNameLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  carNameToConfirm: {
    fontSize: 16,
    marginBottom: 16,
  },
  confirmInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteBtn: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
  },
});
