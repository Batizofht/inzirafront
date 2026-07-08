import React, { useCallback, useEffect, useRef, useState } from 'react';
import { router } from 'expo-router';
import { Toast } from '@/components/Toast';
import { useAuth } from '@/context/AuthContext';
import { fetchNotifications, type Notification } from '@/lib/api-notifications';

const POLL_INTERVAL_MS = 12000;

/**
 * Global, invisible host that watches for newly-arrived in-app notifications
 * (e.g. a listing being approved/rejected while the app is open) and pops a
 * toast for them. Mounted once in the root layout.
 *
 * On first load it records the newest notification id WITHOUT toasting, so the
 * user is only alerted about notifications that arrive after this session.
 */
export function NotificationToastHost(): React.ReactElement | null {
  const { user } = useAuth();
  const lastSeenIdRef = useRef<string | null>(null);
  const initializedRef = useRef(false);
  const [toast, setToast] = useState<{ title: string; body: string } | null>(null);

  const newest = useCallback((list: Notification[]): Notification | undefined => {
    return [...list].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    )[0];
  }, []);

  useEffect(() => {
    // Reset when the logged-in user changes (login/logout).
    initializedRef.current = false;
    lastSeenIdRef.current = null;
    setToast(null);

    if (!user?.id) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetchNotifications();
        if (cancelled) return;
        const list = res.data?.notifications ?? [];
        const top = newest(list);
        if (!top) return;

        if (!initializedRef.current) {
          // Prime the baseline silently on first successful fetch.
          initializedRef.current = true;
          lastSeenIdRef.current = top.id;
          return;
        }

        if (top.id !== lastSeenIdRef.current && !top.isRead) {
          lastSeenIdRef.current = top.id;
          setToast({ title: top.title, body: top.body });
        } else {
          lastSeenIdRef.current = top.id;
        }
      } catch {
        // ignore transient errors
      }
    };

    poll();
    const intervalId = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [user?.id, newest]);

  if (!toast) return null;

  return (
    <Toast
      visible={!!toast}
      title={toast.title}
      body={toast.body}
      onHide={() => setToast(null)}
      onPress={() => {
        setToast(null);
        router.push('/notifications');
      }}
    />
  );
}
