import api from './api';

export const chatAPI = {
  getConversations: () => api.get('/chat/conversations'),
  createConversation: (data) => api.post('/chat/conversations', data),
  getConversation: (id) => api.get(`/chat/conversations/${id}`),
  joinGroup: (id) => api.post(`/chat/conversations/${id}/join`),
  leaveGroup: (id) => api.post(`/chat/conversations/${id}/leave`),
  deleteConversation: (id) => api.delete(`/chat/conversations/${id}`),

  getMessages: (convId, params) => api.get(`/chat/messages/${convId}`, { params }),
  sendMessage: (convId, data) => api.post(`/chat/messages/${convId}`, data),
  markRead: (convId) => api.post(`/chat/messages/${convId}/read`),
  deleteMessage: (msgId) => api.delete(`/chat/messages/delete/${msgId}`),

  discoverGroups: (destination) => api.get('/chat/trip-groups', { params: { destination } }),
  createTripGroup: (data) => api.post('/chat/trip-groups', data),

  getUnreadCount: () => api.get('/chat/unread'),
};
