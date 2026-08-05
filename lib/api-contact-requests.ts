import { apiRequest } from './api-client';

export type ContactRequestPayload = {
  vehicleId: string;
  message?: string;
};

export type ContactRequestResponse = {
  id: string;
  vehicleId: string;
  buyerId: string;
  sellerId: string;
  status: 'pending' | 'approved' | 'rejected';
  message?: string;
  createdAt: string;
  vehicleTitle?: string;
  buyerName?: string;
  buyerPhone?: string;
  vehicle?: {
    id?: string;
    title?: string;
    images?: string[];
  };
};

export type GuestPurchasePayload = {
  vehicleId: string;
  fullName: string;
  email: string;
  phone: string;
  message?: string;
};

export type GuestSellerContact = {
  name: string;
  phone: string;
  email: string;
};

export type GuestPurchaseResult = {
  status: number;
  message: string;
  data: {
    request: ContactRequestResponse;
    /** True when the backend created an account for this email on the fly. */
    isNewAccount: boolean;
    /** Session token, only returned alongside a newly created account. */
    token?: string;
    /** Null when the request duplicates one this buyer already made. */
    sellerContact: GuestSellerContact | null;
    user?: {
      id: string;
      fullName: string;
      email: string;
      phone: string;
      role: string;
    };
  };
};

/**
 * Contact a seller without signing in first.
 *
 * Deliberately unauthenticated (`auth: false`) — this is the entry point for
 * buyers who have no account yet, and the backend route is mounted without
 * requireAuth for that reason. Sending an Authorization header here would make
 * apiRequest throw 'Missing auth token' before the request ever left.
 */
export async function createGuestPurchaseRequest(
  payload: GuestPurchasePayload
): Promise<GuestPurchaseResult> {
  return apiRequest('/contact-requests/guest-purchase', {
    method: 'POST',
    body: payload,
    auth: false,
  });
}

export async function createContactRequest(payload: ContactRequestPayload): Promise<{ status: number; message: string; data: { request: ContactRequestResponse } }> {
  return apiRequest('/contact-requests', {
    method: 'POST',
    body: payload,
    auth: true,
  });
}

export async function fetchMyContactRequests(options?: { scope?: 'buyer' | 'seller'; onlyActiveVehicle?: boolean }): Promise<{ status: number; data: { requests: ContactRequestResponse[] } }> {
  const params = new URLSearchParams();
  if (options?.scope) params.set('scope', options.scope);
  if (typeof options?.onlyActiveVehicle === 'boolean') params.set('onlyActiveVehicle', String(options.onlyActiveVehicle));
  const query = params.toString();

  return apiRequest(`/contact-requests${query ? `?${query}` : ''}`, {
    method: 'GET',
    auth: true,
  });
}

export async function approveContactRequest(requestId: string): Promise<{ status: number; message: string }> {
  return apiRequest(`/contact-requests/${requestId}/review`, {
    method: 'PATCH',
    body: { status: 'approved' },
    auth: true,
  });
}
 
export async function rejectContactRequest(requestId: string): Promise<{ status: number; message: string }> {
  return apiRequest(`/contact-requests/${requestId}/review`, {
    method: 'PATCH',
    body: { status: 'rejected' },
    auth: true,
  });
}
