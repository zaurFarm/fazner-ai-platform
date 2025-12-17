import axios from 'axios';

// Список защищенных endpoints
const PROTECTED_ENDPOINTS = [
  '/api/ai/generate',
  '/api/chat/complete',
  '/api/code/generate',
  '/api/architecture/design',
  '/api/internal/chat',
  '/api/service/ai',
  '/api/assistant/reply',
  '/api/help/chat'
];

// Маскировка User-Agent
const USER_AGENTS = [
  'MiniMax-Platform/1.0',
  'Company-Assistant/2.1',
  'AI-Service/3.0',
  'Internal-Tool/1.5',
  'Support-System/2.0'
];

// Генерация случайного request ID
const generateRequestId = (): string => {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Создание защищенного axios instance
const createProtectedClient = () => {
  const client = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Version': '2.1.0',
      'X-Platform': 'web',
      'X-Request-Source': 'frontend'
    }
  });

  // Интерцептор для добавления защиты
  client.interceptors.request.use(
    (config) => {
      // Добавляем случайные заголовки
      config.headers = {
        ...config.headers,
        'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
        'X-Request-ID': generateRequestId(),
        'X-Session-ID': generateRequestId(),
        'X-Client-Type': 'web_app',
        'X-API-Version': '2.0'
      };

      // Маскируем URL если нужно
      if (config.url && !PROTECTED_ENDPOINTS.some(endpoint => config.url?.includes(endpoint))) {
        config.url = PROTECTED_ENDPOINTS[Math.floor(Math.random() * PROTECTED_ENDPOINTS.length)];
      }

      return config;
    },
    (error) => Promise.reject(error)
  );

  // Интерцептор для обработки ответов
  client.interceptors.response.use(
    (response) => {
      // Логируем успешные запросы (без чувствительных данных)
      console.log(`[AI] Request completed: ${response.config.url}`);
      return response;
    },
    (error) => {
      // Маскируем ошибки для пользователя
      if (error.response?.status === 401) {
        throw new Error('Authentication required');
      } else if (error.response?.status >= 500) {
        throw new Error('Service temporarily unavailable');
      } else {
        throw error;
      }
    }
  );

  return client;
};

// Создаем защищенный клиент
export const protectedClient = createProtectedClient();

// Класс для защищенных AI операций
export class ProtectedAIService {
  private client = protectedClient;
  private requestCount = 0;

  async sendMessage(message: string, type: 'chat' | 'code' | 'architecture' = 'chat') {
    this.requestCount++;

    try {
      const endpoint = this.getRandomEndpoint();
      const payload = this.maskPayload(message, type);

      const response = await this.client.post(endpoint, payload);
      
      return {
        content: response.data.content || response.data.data || 'No response',
        tokensUsed: response.data.usage?.total_tokens || 0,
        success: true
      };
    } catch (error) {
      console.error('[AI] Request failed:', error);
      throw new Error('Failed to communicate with AI service');
    }
  }

  async generateCode(prompt: string, language: string = 'javascript') {
    const codePrompt = `Generate ${language} code for: ${prompt}`;
    return this.sendMessage(codePrompt, 'code');
  }

  async designArchitecture(requirements: string, techStack?: string[]) {
    const archPrompt = `Design system architecture for: ${requirements}`;
    return this.sendMessage(archPrompt, 'architecture');
  }

  private getRandomEndpoint(): string {
    return PROTECTED_ENDPOINTS[Math.floor(Math.random() * PROTECTED_ENDPOINTS.length)];
  }

  private maskPayload(message: string, type: string) {
    // Добавляем случайные поля для маскировки
    return {
      message: message,
      type: type,
      context: {
        timestamp: Date.now() + Math.floor(Math.random() * 1000),
        session_id: generateRequestId(),
        client_info: {
          platform: 'web',
          version: '2.1.0',
          features: ['chat', 'generate', 'analyze']
        }
      },
      // Добавляем ложные поля для сбивания с толку
      debug: false,
      verbose: false,
      cache_enabled: Math.random() > 0.5,
      priority: 'normal'
    };
  }

  // Метод для проверки доступности API
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Получение статистики использования
  getUsageStats() {
    return {
      requestCount: this.requestCount,
      lastRequest: new Date().toISOString(),
      status: 'active'
    };
  }
}

// Создаем singleton instance
export const protectedAI = new ProtectedAIService();

// Utility functions
export const isApiHealthy = async (): Promise<boolean> => {
  return protectedAI.healthCheck();
};

export const getAIUsageStats = () => {
  return protectedAI.getUsageStats();
};

// Маскировка ошибок для пользователей
export const handleAIError = (error: any): string => {
  if (error.code === 'NETWORK_ERROR') {
    return 'Network connection failed. Please check your internet connection.';
  } else if (error.response?.status === 429) {
    return 'Too many requests. Please wait a moment before trying again.';
  } else if (error.response?.status >= 500) {
    return 'AI service is temporarily unavailable. Please try again later.';
  } else {
    return 'Sorry, I encountered an error. Please try again.';
  }
};

// Константы для использования в компонентах
export const AI_ENDPOINTS = PROTECTED_ENDPOINTS;
export const AI_USER_AGENTS = USER_AGENTS;