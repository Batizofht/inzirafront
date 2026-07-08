import { apiRequest } from './api-client';
import { isWeb } from './platform';

// Individual seller verification payload
export type IndividualVerificationPayload = {
  phoneNumber: string;
  phoneVerified: boolean;
  idType: 'national_id' | 'passport' | 'driving_license';
  idFrontImage: string;
  selfieImage: string;
};

// Business seller verification payload
export type BusinessVerificationPayload = {
  phoneNumber: string;
  phoneVerified: boolean;
  rdbCertificate: string;
};

export type SellerVerificationPayload = IndividualVerificationPayload | BusinessVerificationPayload;

export type SellerVerificationRecord = {
  id: string;
  sellerId: string;
  phoneNumber: string;
  phoneVerified: boolean;
  // Individual fields
  idType?: 'national_id' | 'passport' | 'driving_license' | null;
  idFrontImage?: string | null;
  selfieImage?: string | null;
  // Business fields
  rdbCertificate?: string | null;
  // Common
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

const appendImageField = async (
  formData: FormData,
  field: string,
  uri?: string,
) => {
  if (!uri) return;
  const filename = uri.split('/').pop() || `${field}.jpg`;
  if (isWeb) {
    try {
      const res = await fetch(uri);
      const blob = await res.blob();
      const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
      (formData as any).append(field, file);
      return;
    } catch {
      // fallback below
    }
  }
  const fileAny: any = { uri, name: filename, type: 'image/jpeg' };
  (formData as any).append(field, fileAny);
};

export async function submitSellerVerification(
  payload: SellerVerificationPayload,
): Promise<SellerVerificationRecord> {
  const formData = new FormData();

  formData.append('phoneNumber', payload.phoneNumber);
  formData.append('phoneVerified', payload.phoneVerified ? 'true' : 'false');

  if ('rdbCertificate' in payload) {
    // Business seller — no sellerType sent, backend reads from user record
    await appendImageField(formData, 'rdbCertificate', payload.rdbCertificate);
  } else {
    // Individual seller
    formData.append('idType', payload.idType);
    await appendImageField(formData, 'idFrontImage', payload.idFrontImage);
    await appendImageField(formData, 'selfieImage', payload.selfieImage);
  }

  const response = await apiRequest<{
    status: number;
    data: { verification: SellerVerificationRecord };
  }>('/verification', {
    method: 'POST',
    auth: true,
    body: formData,
    isFormData: true,
  });

  return response.data.verification;
}

export async function fetchMyVerificationStatus(): Promise<SellerVerificationRecord | null> {
  const response = await apiRequest<{
    status: number;
    data: { verification: SellerVerificationRecord | null };
  }>('/verification/me', {
    method: 'GET',
    auth: true,
  });

  return response.data.verification;
}

export async function sendPhoneOtpViaEmail(
  phone: string,
): Promise<{ status: number; message: string }> {
  return apiRequest('/verification/phone/send-otp', {
    method: 'POST',
    auth: true,
    body: { phone },
  });
}

export async function verifyPhoneOtp(
  phone: string,
  otp: string,
): Promise<{ status: number; message: string }> {
  return apiRequest('/verification/phone/verify-otp', {
    method: 'POST',
    auth: true,
    body: { phone, otp },
  });
}
