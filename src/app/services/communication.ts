const runtimeEnv = (import.meta as any).env || {};
const API_BASE = `${runtimeEnv.VITE_API_URL || 'http://localhost:4000'}/api`;

const getAuthToken = () => localStorage.getItem('authToken');

const request = async <T>(path: string, options: RequestInit = {}): Promise<T> => {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');

  const token = getAuthToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let message = 'Request failed';
    try {
      const json = await response.json();
      message = json.message || message;
    } catch {
      // ignore parse errors
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
};

export type ConversationType = 'attendance_issue' | 'general' | 'lab_issue';
export type ConversationStatus = 'open' | 'in_review' | 'resolved' | 'rejected';
export type ConversationPriority = 'low' | 'medium' | 'high';
export type MessagingRole = 'teacher' | 'admin' | 'student';

export interface AttendanceIssuePayload {
  studentId?: string;
  courseName?: string;
  labName?: string;
  issueType?: 'absent_marked_wrong' | 'lab_missing' | 'attendance_not_updated';
  requestedChange?: string;
  evidence?: string[];
}

export interface Conversation {
  id: string;
  createdByUserId?: string | null;
  createdByTeacherId?: string | null;
  createdByName?: string | null;
  createdByEmail?: string | null;
  type: ConversationType;
  status: ConversationStatus;
  priority: ConversationPriority;
  subject?: string | null;
  relatedCourseId?: string | null;
  relatedCourseCode?: string | null;
  relatedCourseName?: string | null;
  relatedLab?: string | null;
  attendanceIssueType?: string | null;
  attendanceIssuePayload?: AttendanceIssuePayload | null;
  unreadCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName?: string | null;
  senderRole: MessagingRole;
  receiverRole: MessagingRole;
  messageText: string;
  attachments: string[];
  parentMessageId?: string | null;
  readStatus: boolean;
  readAt?: string | null;
  timestamp: string;
}

export interface AppNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  conversationId?: string | null;
  messageId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface ConversationCreatePayload {
  type: ConversationType;
  priority?: ConversationPriority;
  subject?: string;
  relatedCourseId?: string;
  relatedLab?: string;
  messageText: string;
  attachments?: string[];
  attendanceIssue?: AttendanceIssuePayload;
}

export interface ConversationFilters {
  status?: ConversationStatus;
  priority?: ConversationPriority;
  type?: ConversationType;
  courseId?: string;
  teacherId?: string;
}

const toQueryString = (filters?: ConversationFilters) => {
  if (!filters) return '';
  const params = new URLSearchParams();

  if (filters.status) params.set('status', filters.status);
  if (filters.priority) params.set('priority', filters.priority);
  if (filters.type) params.set('type', filters.type);
  if (filters.courseId) params.set('courseId', filters.courseId);
  if (filters.teacherId) params.set('teacherId', filters.teacherId);

  const serialized = params.toString();
  return serialized ? `?${serialized}` : '';
};

export const communicationService = {
  getConversations(filters?: ConversationFilters) {
    return request<Conversation[]>(`/communication/conversations${toQueryString(filters)}`);
  },

  getConversation(conversationId: string) {
    return request<Conversation>(`/communication/conversations/${conversationId}`);
  },

  createConversation(payload: ConversationCreatePayload) {
    return request<Conversation>('/communication/conversations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMessages(conversationId: string) {
    return request<ConversationMessage[]>(`/communication/conversations/${conversationId}/messages`);
  },

  sendMessage(conversationId: string, payload: { messageText: string; attachments?: string[]; parentMessageId?: string }) {
    return request<ConversationMessage>(`/communication/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  markMessagesRead(conversationId: string) {
    return request<{ updated: number }>(`/communication/conversations/${conversationId}/messages/read`, {
      method: 'PATCH',
    });
  },

  updateConversationStatus(conversationId: string, payload: { status: ConversationStatus; note?: string }) {
    return request<Conversation>(`/communication/conversations/${conversationId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },

  resolveAttendance(
    conversationId: string,
    payload: { studentId: string; status: 'present' | 'absent'; date?: string; note?: string },
  ) {
    return request<{ success: boolean; status: string }>(
      `/communication/conversations/${conversationId}/resolve-attendance`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    );
  },

  getNotifications(options?: { unreadOnly?: boolean; limit?: number }) {
    const params = new URLSearchParams();
    if (options?.unreadOnly) params.set('unreadOnly', 'true');
    if (options?.limit) params.set('limit', String(options.limit));
    const query = params.toString() ? `?${params.toString()}` : '';

    return request<AppNotification[]>(`/communication/notifications${query}`);
  },

  markNotificationRead(notificationId: string) {
    return request<{ success: boolean }>(`/communication/notifications/${notificationId}/read`, {
      method: 'PATCH',
    });
  },

  markAllNotificationsRead() {
    return request<{ updated: number }>('/communication/notifications/read-all', {
      method: 'PATCH',
    });
  },

  getAdminSummary() {
    return request<{ open: number; inReview: number; resolved: number; rejected: number; highPriority: number }>(
      '/admin/communication/summary',
    );
  },
};
