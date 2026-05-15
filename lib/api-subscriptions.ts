import { apiRequest } from './api-client';

export type SubscriptionPlan = {
  id: string;
  name: string;
  price: number;
  period: string;
  durationDays?: number;
};

export type Subscription = {
  id: string;
  sellerId: string;
  planId: string;
  status: 'active' | 'expired' | 'cancelled';
  startedAt: string;
  expiresAt: string;
};

export type PlansResponse = {
  status: number;
  data: {
    plans: SubscriptionPlan[];
  };
};

export type SubscriptionResponse = {
  status: number;
  data: {
    subscription: Subscription | null;
  };
};

export async function fetchSubscriptionPlans(): Promise<PlansResponse> {
  return apiRequest('/subscriptions/plans');
}

export async function fetchMySubscription(): Promise<SubscriptionResponse> {
  return apiRequest('/subscriptions/me', { auth: true });
}

export async function subscribeToPlan(planId: string): Promise<{ status: number; message: string; data: { subscription: Subscription } }> {
  return apiRequest('/subscriptions/subscribe', {
    method: 'POST',
    body: { planId },
    auth: true,
  });
}

// One-time verification fee payment for individual sellers (RWF 10,000)
export async function payVerificationFee(): Promise<{ status: number; message: string; data: { hasPaidVerificationFee: boolean } }> {
  return apiRequest('/subscriptions/pay-verification-fee', {
    method: 'POST',
    auth: true,
  });
}

export function hasActiveSubscription(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'active') return false;
  const now = Date.now();
  const expires = new Date(subscription.expiresAt).getTime();
  return expires > now;
}

export function getSubscriptionRemainingDays(subscription: Subscription | null): number {
  if (!subscription) return 0;
  if (subscription.status !== 'active') return 0;
  const now = Date.now();
  const expires = new Date(subscription.expiresAt).getTime();
  if (expires <= now) return 0;
  return Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
}
