import { apiRequest } from './api-client';
import { isWeb } from './platform';

export type SellerVerificationPayload = {
  phoneNumber: string;
  phoneVerified: boolean;
  idType: 'national_id' | 'passport' | 'driving_license';
  idFrontImage: string;
  idBackImage?: string;
  selfieImage: string;
};

export type SellerVerificationRecord = {
  id: string;
  sellerId: string;
  phoneNumber: string;
  phoneVerified: boolean;
  idType: 'national_id' | 'passport' | 'driving_license';
  idFrontImage: string;
  idBackImage?: string | null;
  selfieImage: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewNote?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export async function submitSellerVerification(payload: SellerVerificationPayload): Promise<SellerVerificationRecord> {
  const formData = new FormData();

  formData.append('phoneNumber', payload.phoneNumber);
  formData.append('phoneVerified', payload.phoneVerified ? 'true' : 'false');
  formData.append('idType', payload.idType);

  const appendImageField = async (field: 'idFrontImage' | 'idBackImage' | 'selfieImage', uri?: string) => {
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
        // Fallback: append as-is, though server may ignore it
      }
    }

    const fileAny: any = { uri, name: filename, type: 'image/jpeg' };
    (formData as any).append(field, fileAny);
  };

  await appendImageField('idFrontImage', payload.idFrontImage);
  await appendImageField('idBackImage', payload.idBackImage);
  await appendImageField('selfieImage', payload.selfieImage);

  const response = await apiRequest<{ status: number; data: { verification: SellerVerificationRecord } }>('/verification', {
    method: 'POST',
    auth: true,
    body: formData,
    isFormData: true,
  });

  return response.data.verification;
}

export async function fetchMyVerificationStatus(): Promise<SellerVerificationRecord | null> {
  const response = await apiRequest<{ status: number; data: { verification: SellerVerificationRecord | null } }>('/verification/me', {
    method: 'GET',
    auth: true,
  });

  return response.data.verification;
}

export async function sendPhoneOtpViaEmail(phone: string): Promise<{ status: number; message: string }> {
  return apiRequest('/verification/phone/send-otp', {
    method: 'POST',
    auth: true,
    body: { phone },
  });
}

export async function verifyPhoneOtp(phone: string, otp: string): Promise<{ status: number; message: string }> {
  return apiRequest('/verification/phone/verify-otp', {
    method: 'POST',
    auth: true,
    body: { phone, otp },
  });
}
