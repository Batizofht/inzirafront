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
