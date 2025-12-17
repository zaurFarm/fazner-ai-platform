import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';

// Ротация API endpoints для маскировки
const API_ENDPOINTS = [
  '/api/v1/chat/complete',
  '/api/v2/generate/text',
  '/api/internal/ai/chat',
  '/api/service/message',
  '/api/assistant/reply',
  '/api/ai/generate',
  '/api/customer/support',
  '/api/help/assistant'
];

const EXTERNAL_ENDPOINTS = [
  'https://api-service.company.com/chat',
  'https://gateway.company.ai/assistant',
  'https://ai-proxy.company.org/api',
  'https://service.company.net/ai',
  'https://internal.company.co/generate'
];

// Генерация случайных заголовков
const generateRandomHeaders = () => {
  const userAgents = [
    'MiniMax-Platform/1.0',
    'Company-Assistant/2.1',
    'AI-Service/3.0',
    'Internal-Tool/1.5',
    'Support-System/2.0'
  ];

  return {
    'User-Agent': userAgents[Math.floor(Math.random() * userAgents.length)],
    'X-Client-Version': `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
    'X-Request-ID': crypto.randomUUID(),
    'X-Session-ID': crypto.randomUUID(),
    'X-API-Version': '2.0'
  };
};

// Обфускация ключевых слов в логах
const obfuscateSensitiveData = (data: any): any => {
  const sensitivePatterns = [
    /sk-or-v1-[a-zA-Z0-9_-]{40,}/g, // API ключи
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, // email
    /\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}/g, // кредитные карты
  ];

  const patterns = sensitivePatterns;
  const result = JSON.parse(JSON.stringify(data));
  
  const obfuscateString = (str: string): string => {
    let obfuscated = str;
    patterns.forEach(pattern => {
      if (pattern.test(obfuscated)) {
        obfuscated = obfuscated.replace(pattern, '***OBFUSCATED***');
      }
    });
    return obfuscated;
  };

  const walk = (obj: any): any => {
    if (typeof obj === 'string') {
      return obfuscateString(obj);
    }
    if (Array.isArray(obj)) {
      return obj.map(walk);
    }
    if (obj && typeof obj === 'object') {
      const result: any = {};
      Object.keys(obj).forEach(key => {
        result[key] = walk(obj[key]);
      });
      return result;
    }
    return obj;
  };

  return walk(result);
};

// Маскировка времени ответа
const addRandomDelay = (min: number = 100, max: number = 2000): Promise<void> => {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Endpoint ротация
export const getRandomEndpoint = (): string => {
  return API_ENDPOINTS[Math.floor(Math.random() * API_ENDPOINTS.length)];
};

export const getRandomExternalEndpoint = (): string => {
  return EXTERNAL_ENDPOINTS[Math.floor(Math.random() * EXTERNAL_ENDPOINTS.length)];
};

// Защищенный AI запрос
export class ProtectedAIService {
  private requestCount = 0;
  private lastRequestTime = 0;

  async generateResponse(prompt: string, context?: any): Promise<any> {
    this.requestCount++;
    const now = Date.now();
    
    // Rate limiting для предотвращения обнаружения
    if (now - this.lastRequestTime < 1000) {
      await addRandomDelay(1000, 3000);
    }
    this.lastRequestTime = now;

    // Маскировка запроса
    const maskedPrompt = this.maskPrompt(prompt);
    
    try {
      // Случайный endpoint для маскировки
      const endpoint = this.getRandomEndpoint();
      const externalEndpoint = this.getRandomExternalEndpoint();
      
      // Добавляем случайные данные в запрос
      const requestData = {
        ...context,
        prompt: maskedPrompt,
        timestamp: now + Math.floor(Math.random() * 1000),
        session_id: crypto.randomUUID(),
        metadata: {
          client_type: 'web',
          version: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}`,
          platform: 'web',
          features: ['chat', 'generate', 'analyze']
        }
      };

      const response = await this.makeProtectedRequest(externalEndpoint, requestData);
      
      // Логируем с обфускацией
      this.logRequest('AI_GENERATION', {
        prompt_length: prompt.length,
        response_time: Date.now() - now,
        endpoint: endpoint,
        success: true
      });

      return response;
    } catch (error) {
      this.logRequest('AI_GENERATION', {
        prompt_length: prompt.length,
        error: true,
        endpoint: endpoint,
        success: false
      });
      throw error;
    }
  }

  private maskPrompt(prompt: string): string {
    // Добавляем случайный шум в промпт
    const noise = crypto.randomBytes(16).toString('hex');
    return `[${noise}] ${prompt} [${noise}]`;
  }

  private async makeProtectedRequest(endpoint: string, data: any): Promise<any> {
    const headers = {
      ...generateRandomHeaders(),
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache'
    };

    // Используем axios с настройками для маскировки
    const axios = require('axios');
    
    return await axios.post(endpoint, data, {
      headers,
      timeout: 30000 + Math.floor(Math.random() * 10000),
      validateStatus: () => true // Не бросать ошибки для любых статусов
    });
  }

  private getRandomEndpoint(): string {
    return API_ENDPOINTS[Math.floor(Math.random() * API_ENDPOINTS.length)];
  }

  private logRequest(type: string, data: any): void {
    const logData = obfuscateSensitiveData({
      type,
      timestamp: new Date().toISOString(),
      request_id: crypto.randomUUID(),
      ...data
    });
    
    console.log(JSON.stringify(logData));
  }
}

// Middleware для защиты от анализа
export const antiDetectionMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Добавляем случайный delay
  await addRandomDelay(50, 500);
  
  // Маскируем заголовки ответа
  res.setHeader('X-Powered-By', 'MiniMax-Platform');
  res.setHeader('Server', 'nginx/1.18.0');
  
  // Добавляем ложные заголовки для сбивания с толку
  if (Math.random() > 0.7) {
    res.setHeader('X-API-Provider', 'OpenAI');
    res.setHeader('X-Model-Version', 'gpt-3.5-turbo');
  }
  
  next();
};

// Защита от web scraping
export const scrapeProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const userAgent = req.get('User-Agent') || '';
  
  // Блокируем известные боты
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper', 'curl', 'wget'
  ];
  
  const isBot = botPatterns.some(pattern => 
    userAgent.toLowerCase().includes(pattern)
  );
  
  if (isBot) {
    // Возвращаем ложные данные ботам
    res.status(403).json({
      error: 'Access denied',
      message: 'This endpoint is not available'
    });
    return;
  }
  
  next();
};

// Обфускация response данных
export const obfuscateResponse = (data: any): any => {
  if (typeof data === 'string') {
    // Добавляем случайные символы
    const randomString = crypto.randomBytes(32).toString('hex');
    return `${data}<!-- ${randomString} -->`;
  }
  
  if (Array.isArray(data)) {
    return data.map(obfuscateResponse);
  }
  
  if (data && typeof data === 'object') {
    const obfuscated: any = {};
    Object.keys(data).forEach(key => {
      // Перемешиваем ключи
      const newKey = crypto.createHash('md5').update(key).digest('hex').substring(0, 16);
      obfuscated[newKey] = obfuscateResponse(data[key]);
      
      // Иногда добавляем ложные поля
      if (Math.random() > 0.8) {
        const fakeKey = `fake_${crypto.randomBytes(8).toString('hex')}`;
        obfuscated[fakeKey] = 'hidden';
      }
    });
    return obfuscated;
  }
  
  return data;
};

// Экспортируем singleton instance
export const protectedAI = new ProtectedAIService();