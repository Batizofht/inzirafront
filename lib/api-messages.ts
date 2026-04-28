import { apiRequest } from './api-client';

export type Conversation = {
  id: string;
  vehicleId: string;
  vehicleTitle?: string;
  buyerId: string;
  buyerName?: string;
  sellerId: string;
  sellerName?: string;
  lastMessage?: string;
  lastMessageAt?: string;
  unreadCount: number;
  unreadForBuyer?: number;
  unreadForSeller?: number;
};

export type Message = {
  id: string;
  conversationId: string;
  senderId: string;
  senderRole: 'buyer' | 'seller';
  content: string;
  createdAt: string;
  isRead: boolean;
  seen?: boolean;
};

export type ConversationsResponse = {
  status: number;
  data: {
    conversations: Conversation[];
  };
};

export type ConversationDetailResponse = {
  status: number;
  data: {
    conversation: Conversation;
    messages: Message[];
  };
};

export async function fetchConversations(): Promise<ConversationsResponse> {
  return apiRequest('/messages/conversations', { auth: true });
}

export async function fetchUnreadMessagesCount(): Promise<{ status: number; data: { unreadCount: number } }> {
  return apiRequest('/messages/unread-count', { auth: true });
}

export async function fetchConversation(id: string): Promise<ConversationDetailResponse> {
  return apiRequest(`/messages/conversations/${id}`, { auth: true });
}

export async function startConversation(
  vehicleId: string,
  initialMessage: string
): Promise<ConversationDetailResponse> {
  return apiRequest('/messages/conversations', {
    method: 'POST',
    body: { vehicleId, initialMessage },
    auth: true,
  });
}

export async function sendMessage(
  conversationId: string,
  content: string
): Promise<{ status: number; message: string; data: { conversation: Conversation; message: Message } }> {
  return apiRequest(`/messages/conversations/${conversationId}/messages`, {
    method: 'POST',
    body: { content },
    auth: true,
  });
}
