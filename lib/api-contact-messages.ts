import { apiRequest } from './api-client';

export type CreateContactMessagePayload = {
  fullName: string;
  email: string;
  subject: string;
  message: string;
};

export type ContactMessageResponse = {
  id: string;
  fullName: string;
  email: string;
  subject: string;
  message: string;
  status: 'pending' | 'replied';
  adminReply?: string | null;
  repliedAt?: string | null;
  createdAt: string;
};

export async function createContactMessage(payload: CreateContactMessagePayload): Promise<{
  status: number;
  message: string;
  data: { message: ContactMessageResponse };
}> {
  return apiRequest('/contact-messages', {
    method: 'POST',
    body: payload,
  });
}
