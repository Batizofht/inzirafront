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
  status: 'active' | 'expired' | 'cancelled' | 'trial';
  startedAt: string;
  expiresAt: string;
};

export type PlansResponse = {
  status: number;
  data: {
    dealership: {
      monthly: { price: number; name: string; durationMonths: number };
      annual: { price: number; name: string; durationMonths: number };
      trialMonths: number;
    };
    listingFee: {
      single: { price: number; durationDays: number };
      bundle3: { price: number; listings: number; durationDays: number };
    };
    verificationFee: { price: number };
  };
};

export type SubscriptionResponse = {
  status: number;
  data: {
    subscription: Subscription | null;
    hasPaidVerificationFee: boolean;
    hasListingCredit: boolean;
    listingCredits: number;
  };
};

export type CanListResponse = {
  status: number;
  data: {
    canList: boolean;
    needsVerificationFee?: boolean;
    needsListingFee?: boolean;
    reason?: string;
  };
};

export type PaymentInitResponse = {
  status: number;
  message: string;
  data: {
    referenceId: string;
    paymentStatus: 'pending';
    amount: number;
    kind: 'CASHIN' | 'CASHOUT';
  };
};

export type PaymentStatusResponse = {
  status: number;
  data: {
    paymentStatus: 'pending' | 'successful' | 'failed';
    paypackStatus?: string;
    failureReason?: string;
  };
};

export type ConfigPricesResponse = {
  status: number;
  data: {
    prices: Record<string, string>;
  };
};

// ─── API Calls ────────────────────────────────────────────────────────────────

export async function fetchSubscriptionPlans(): Promise<PlansResponse> {
  return apiRequest('/subscriptions/plans');
}

export async function fetchMySubscription(): Promise<SubscriptionResponse> {
  return apiRequest('/subscriptions/me', { auth: true });
}

export async function checkCanListVehicle(): Promise<CanListResponse> {
  return apiRequest('/subscriptions/can-list', { auth: true });
}

/**
 * Initiate dealership subscription payment via Paypack (company sellers only).
 * Returns a referenceId to poll for payment status.
 */
export async function dealershipSubscribe(
  planId: string,
  phoneNumber?: string
): Promise<PaymentInitResponse> {
  return apiRequest('/subscriptions/dealership-subscribe', {
    method: 'POST',
    body: { planId, phoneNumber },
    auth: true,
  });
}

/**
 * Pay the listing fee (individual sellers). bundleSize 3 buys the 3-listing bundle.
 */
export async function payListingFee(
  phoneNumber?: string,
  bundleSize?: number
): Promise<PaymentInitResponse> {
  return apiRequest('/subscriptions/pay-listing-fee', {
    method: 'POST',
    body: { phoneNumber, bundleSize },
    auth: true,
  });
}

/**
 * Pay the one-time seller verification fee.
 */
export async function payVerificationFee(
  phoneNumber?: string
): Promise<PaymentInitResponse | { status: number; message: string; data: { hasPaidVerificationFee: boolean } }> {
  return apiRequest('/subscriptions/pay-verification-fee', {
    method: 'POST',
    body: { phoneNumber },
    auth: true,
  });
}

/**
 * Activate the free dealership trial (company sellers only). Normally this
 * happens automatically on registration / role switch on the backend — this
 * is kept as a manual fallback endpoint only.
 */
export async function activateDealershipTrial(): Promise<{ status: number; message: string; data: { subscription: Subscription } }> {
  return apiRequest('/subscriptions/activate-trial', {
    method: 'POST',
    auth: true,
  });
}

/**
 * Poll payment status by referenceId.
 * Frontend should call this every 3-5 seconds after initiating payment.
 */
export async function checkPaymentStatus(referenceId: string): Promise<PaymentStatusResponse> {
  return apiRequest(`/subscriptions/payment-status/${referenceId}`, { auth: true });
}

/**
 * Cancel a pending payment (user dismissed the payment modal).
 */
export async function cancelPayment(referenceId: string): Promise<{ status: number; message: string; data?: { paymentStatus: string; failureReason?: string } }> {
  return apiRequest(`/subscriptions/cancel-payment/${referenceId}`, {
    method: 'POST',
    auth: true,
  });
}

/**
 * Poll payment until resolved (successful or failed), or until cancelled via cancelSignal.
 * Returns the final status.
 */
export async function pollPaymentUntilResolved(
  referenceId: string,
  options?: {
    maxAttempts?: number;
    intervalMs?: number;
    onPending?: () => void;
    cancelSignal?: { cancelled: boolean };
  }
): Promise<PaymentStatusResponse> {
  const maxAttempts = options?.maxAttempts ?? 60;
  const intervalMs = options?.intervalMs ?? 5000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (options?.cancelSignal?.cancelled) {
      return { status: 1, data: { paymentStatus: 'failed', paypackStatus: 'CANCELLED', failureReason: 'Cancelled by user' } };
    }

    const result = await checkPaymentStatus(referenceId);

    if (result.data.paymentStatus === 'successful' || result.data.paymentStatus === 'failed') {
      return result;
    }

    options?.onPending?.();
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { status: 1, data: { paymentStatus: 'pending', paypackStatus: 'TIMEOUT' } };
}

export async function fetchConfigPrices(): Promise<ConfigPricesResponse> {
  return apiRequest('/subscriptions/config');
}

/**
 * Consume one listing credit (individual sellers, called right after a listing is created).
 */
export async function consumeListingCredit(): Promise<{ status: number; message: string }> {
  return apiRequest('/subscriptions/consume-listing-credit', {
    method: 'POST',
    auth: true,
  });
}

// ─── Utility Functions ────────────────────────────────────────────────────────

export function hasActiveSubscription(subscription: Subscription | null): boolean {
  if (!subscription) return false;
  if (subscription.status !== 'active' && subscription.status !== 'trial') return false;
  const now = Date.now();
  const expires = new Date(subscription.expiresAt).getTime();
  return expires > now;
}

export function getSubscriptionRemainingDays(subscription: Subscription | null): number {
  if (!subscription) return 0;
  if (subscription.status !== 'active' && subscription.status !== 'trial') return 0;
  const now = Date.now();
  const expires = new Date(subscription.expiresAt).getTime();
  if (expires <= now) return 0;
  return Math.ceil((expires - now) / (1000 * 60 * 60 * 24));
}
