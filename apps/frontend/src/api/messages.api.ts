import { api } from '../services/api';

// Types
export enum MessageType {
  DIRECT = 'DIRECT',
  BROADCAST = 'BROADCAST',
}

export enum MessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
}

export interface Message {
  id: string;
  tenantId: string;
  senderId: string;
  type: MessageType;
  subject: string;
  body: string;
  threadId?: string;
  isReply: boolean;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  sender: {
    id: string;
    name: string;
    email: string;
    profile?: {
      profilePhoto?: string;
    };
  };
  recipients?: MessageRecipient[];
  recipientStatus?: MessageStatus;
  recipientReadAt?: string;
}

export interface MessageRecipient {
  id: string;
  messageId: string;
  userId: string;
  status: MessageStatus;
  readAt?: string;
  user: {
    id: string;
    name: string;
    email: string;
    profile?: {
      profilePhoto?: string;
    };
  };
}

export interface MessagesResponse {
  data: Message[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface MessageQuery {
  page?: number;
  limit?: number;
  type?: MessageType;
  status?: MessageStatus;
  search?: string;
  unreadOnly?: boolean;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateMessageDto {
  type: MessageType;
  subject: string;
  body: string;
  recipientIds?: string[];
  threadId?: string;
}

export interface MessageThread {
  original: Message;
  replies: Message[];
}

export interface MessageStats {
  unread: number;
  received: number;
  sent: number;
}

// API Class
class MessagesAPI {
  async getInbox(query?: MessageQuery): Promise<MessagesResponse> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          // Converter booleanos explicitamente para string
          const stringValue = typeof value === 'boolean' ? value.toString() : String(value);
          if (stringValue !== '') {
            params.append(key, stringValue);
          }
        }
      });
    }
    // Cache busting removido - ValidationPipe com forbidNonWhitelisted=true rejeita parâmetros extras
    const queryString = params.toString();
    const response = await api.get(`/messages/inbox${queryString ? '?' + queryString : ''}`);
    return response.data;
  }

  async getSent(query?: MessageQuery): Promise<MessagesResponse> {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
    }
    // Cache busting removido - ValidationPipe com forbidNonWhitelisted=true rejeita parâmetros extras
    const queryString = params.toString();
    const response = await api.get(`/messages/sent${queryString ? '?' + queryString : ''}`);
    return response.data;
  }

  async getById(id: string): Promise<Message> {
    const response = await api.get(`/messages/${id}`);
    return response.data;
  }

  async getThread(threadId: string): Promise<MessageThread> {
    const response = await api.get(`/messages/thread/${threadId}`);
    return response.data;
  }

  async getUnreadCount(): Promise<{ count: number }> {
    // Cache busting removido - já gerenciado pelo interceptor com headers Cache-Control
    const response = await api.get('/messages/unread/count');
    return response.data;
  }

  async getStats(): Promise<MessageStats> {
    const response = await api.get('/messages/stats');
    return response.data;
  }

  async create(data: CreateMessageDto): Promise<Message> {
    const response = await api.post('/messages', data);
    return response.data;
  }

  async markAsRead(messageIds?: string[]): Promise<{ updated: number }> {
    const response = await api.post('/messages/read', { messageIds });
    return response.data;
  }

  async delete(
    id: string,
    deleteReason: string,
  ): Promise<{ message: string }> {
    const response = await api.delete(`/messages/${id}`, {
      data: { deleteReason },
    });
    return response.data;
  }
}

export const messagesAPI = new MessagesAPI();
