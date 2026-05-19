import axios from 'axios';

// ============================================================
// API Service 配置
// ============================================================

const API_BASE_URL = 'http://localhost:8000/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const apiService = {
  // 1. 获取测试用户
  async getOrCreateUser(nickname = '测试用户') {
    try {
      const response = await apiClient.post('/users', { nickname });
      return response.data;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  // 2. 获取对话历史
  async getConversations(userId) {
    try {
      const response = await apiClient.get(`/users/${userId}/conversations`);
      return response.data;
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
  },
  
  // 3. 获取单次对话详情
  async getConversationDetail(conversationId) {
    try {
      const response = await apiClient.get(`/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching conversation detail:', error);
      throw error;
    }
  },

  // 4. 发送聊天消息
  async sendMessage({ userId, conversationId, sessionType, scenarioId, customOptions, content }) {
    try {
      const response = await apiClient.post('/chat', {
        user_id: userId,
        conversation_id: conversationId,
        session_type: sessionType,
        scenario_id: scenarioId,
        custom_options: customOptions,
        content
      });
      return response.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  },

  // 5. 结束对话并获取总结报告
  async endConversation(conversationId) {
    try {
      const response = await apiClient.post(`/conversations/${conversationId}/end`);
      return response.data;
    } catch (error) {
      console.error('Error ending conversation:', error);
      throw error;
    }
  },

  // 6. 删除对话历史
  async deleteConversation(conversationId) {
    try {
      const response = await apiClient.delete(`/conversations/${conversationId}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  },

  // 7. 获取所有社交模拟场景
  async getScenarios() {
    try {
      const response = await apiClient.get('/scenarios');
      return response.data;
    } catch (error) {
      console.error('Error fetching scenarios:', error);
      throw error;
    }
  },

  // 6. 获取成长图谱数据
  async getGrowthData(userId) {
    try {
      const response = await apiClient.get(`/users/${userId}/growth`);
      return response.data;
    } catch (error) {
      console.error('Error fetching growth data:', error);
      throw error;
    }
  },

  // 7. 获取模拟场景求助建议
  async getSimulationHint(conversationId, reason) {
    try {
      const response = await apiClient.post(`/conversations/${conversationId}/hint`, { reason });
      return response.data;
    } catch (error) {
      console.error('Error fetching hint:', error);
      throw error;
    }
  }
};
