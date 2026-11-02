import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { apiRequest } from './api-client';

/**
 * User-generated-content safety: reporting objectionable content and blocking
 * abusive users (App Store guideline 1.2).
 *
 * Blocked user ids are mirrored locally so a block takes effect instantly in
 * every feed — listings and conversations are filtered on the client the
 * moment the user blocks someone, without waiting for a refetch.
 */

const BLOCKED_IDS_KEY = 'inzira_blocked_user_ids';

let blockedIds = new Set<string>();
let hydrated = false;
const listeners = new Set<(ids: Set<string>) => void>();

function emit() {
  const snapshot = new Set(blockedIds);
  listeners.forEach((listener) => listener(snapshot));
}

function persist() {
  AsyncStorage.setItem(BLOCKED_IDS_KEY, JSON.stringify(Array.from(blockedIds))).catch(() => {});
}

async function hydrate() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await AsyncStorage.getItem(BLOCKED_IDS_KEY);
    if (raw) {
      const ids = JSON.parse(raw);
      if (Array.isArray(ids)) {
        ids.forEach((id) => blockedIds.add(String(id)));
        emit();
      }
    }
  } catch {
    // Corrupt cache: the next sync from the server replaces it.
  }
}

hydrate();

export function isUserBlocked(userId?: string | null): boolean {
  return !!userId && blockedIds.has(userId);
}

/** Drops listings whose seller the current user has blocked. */
export function filterBlockedVehicles<T extends { sellerId?: string; seller?: { id?: string } }>(vehicles: T[]): T[] {
  if (!Array.isArray(vehicles) || blockedIds.size === 0) return vehicles;
  return vehicles.filter((v) => !blockedIds.has(v.sellerId || v.seller?.id || ''));
}

/** React hook: the current set of blocked user ids, updated live. */
export function useBlockedUserIds(): Set<string> {
  const [ids, setIds] = useState<Set<string>>(() => new Set(blockedIds));
  useEffect(() => {
    listeners.add(setIds);
    setIds(new Set(blockedIds));
    return () => {
      listeners.delete(setIds);
    };
  }, []);
  return ids;
}

export type BlockedUser = {
  id: string;
  blockedId: string;
  blockedName: string | null;
  blockedImage?: string | null;
  createdAt: string;
};

export async function fetchBlockedUsers(): Promise<BlockedUser[]> {
  const res = await apiRequest<{ status: number; data: { blocks: BlockedUser[] } }>('/blocks', { auth: true });
  const blocks = res.data?.blocks || [];
  blockedIds = new Set(blocks.map((b) => b.blockedId));
  persist();
  emit();
  return blocks;
}

/** Refreshes the local blocked list from the server; safe to call any time. */
export async function syncBlockedUsers(): Promise<void> {
  try {
    await fetchBlockedUsers();
  } catch {
    // Offline or logged out: keep whatever is cached.
  }
}

export async function blockUser(
  userId: string,
  context?: { reason?: string; vehicleId?: string; conversationId?: string },
): Promise<void> {
  // Optimistic: hide their content right away, roll back if the server refuses.
  blockedIds.add(userId);
  emit();
  try {
    await apiRequest('/blocks', { method: 'POST', auth: true, body: { userId, ...context } });
    persist();
  } catch (err) {
    blockedIds.delete(userId);
    emit();
    throw err;
  }
}

export async function unblockUser(userId: string): Promise<void> {
  await apiRequest(`/blocks/${encodeURIComponent(userId)}`, { method: 'DELETE', auth: true });
  blockedIds.delete(userId);
  persist();
  emit();
}

export function clearBlockedUsersCache(): void {
  blockedIds = new Set();
  AsyncStorage.removeItem(BLOCKED_IDS_KEY).catch(() => {});
  emit();
}

export type ReportTargetType = 'vehicle' | 'user' | 'message';

export async function submitContentReport(payload: {
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  description?: string;
}): Promise<void> {
  await apiRequest('/reports', { method: 'POST', auth: true, body: payload });
}
