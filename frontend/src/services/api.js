import axios from 'axios';

// ============================================================
// API Service 配置
// ============================================================

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api').replace(/\/$/, '');

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
});

const getHttpError = async (response) => {
  let details = '';
  try {
    details = await response.text();
  } catch {
    details = '';
  }
  return new Error(`HTTP ${response.status} ${response.statusText}${details ? `: ${details}` : ''}`);
};

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
  // 4. 发送聊天消息 (支持 SSE 流式传输与普通请求回退)
  async sendMessage({ userId, conversationId, sessionType, scenarioId, customOptions, content, onChunk }) {
    try {
      const payload = {
        user_id: userId,
        conversation_id: conversationId,
        session_type: sessionType,
        scenario_id: scenarioId,
        custom_options: customOptions,
        content
      };

      // 如果提供了 onChunk 回调，则启动流式处理
      if (onChunk) {
        const response = await fetch(`${API_BASE_URL}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw await getHttpError(response);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          
          // 保留最后一行未完整的行
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith('data: ')) {
              try {
                const jsonStr = trimmedLine.slice(6);
                const data = JSON.parse(jsonStr);
                onChunk(data);
              } catch (e) {
                console.error('Failed to parse SSE line:', trimmedLine, e);
              }
            }
          }
        }
        return;
      }

      // 如果没有提供 onChunk，则请求流式但聚合后返回，维持原同步调用签名行为不变
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw await getHttpError(response);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';
      let replyContent = '';
      let replyEmotion = null;
      let replyBiases = null;
      let finalConvId = conversationId;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (trimmedLine.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmedLine.slice(6));
              if (data.type === 'content') {
                replyContent += data.content;
              } else if (data.type === 'analysis') {
                replyEmotion = data.emotion_analysis;
                replyBiases = data.cognitive_biases;
              } else if (data.type === 'conv_id') {
                finalConvId = data.conversation_id;
              }
            } catch (e) {
              console.error('Failed to parse fallback SSE line:', trimmedLine, e);
            }
          }
        }
      }

      return {
        conversation_id: finalConvId,
        reply: {
          role: 'assistant',
          content: replyContent,
          emotion_analysis: replyEmotion,
          cognitive_biases: replyBiases
        }
      };

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
