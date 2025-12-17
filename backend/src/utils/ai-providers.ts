// AI Providers Configuration for Fazner AI Platform
// Поддержка множественных AI провайдеров для повышения надежности

export interface AIProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKeyEnv: string;
  models: string[];
  priority: number; // 1 = highest priority
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  features: {
    chat: boolean;
    codeGeneration: boolean;
    imageGeneration: boolean;
    embeddings: boolean;
  };
  pricing: {
    costPer1KTokens: number;
    currency: string;
  };
}

// Конфигурация AI провайдеров
export const AI_PROVIDERS: AIProvider[] = [
  // 1. OpenRouter (MiniMax M2) - Высший приоритет
  {
    id: 'openrouter',
    name: 'OpenRouter (MiniMax M2)',
    baseUrl: 'https://openrouter.ai/api/v1',
    apiKeyEnv: 'OPENROUTER_API_KEY',
    models: [
      'minimax/maximum-120k-01',
      'minimax/abab6.5s-chat',
      'anthropic/claude-3.5-sonnet',
      'openai/gpt-4',
      'meta-llama/llama-3.1-70b-instruct'
    ],
    priority: 1,
    rateLimit: {
      requestsPerMinute: 100,
      requestsPerDay: 10000
    },
    features: {
      chat: true,
      codeGeneration: true,
      imageGeneration: false,
      embeddings: true
    },
    pricing: {
      costPer1KTokens: 0.001,
      currency: 'USD'
    }
  },

  // 2. OpenAI GPT-4 - Средний приоритет
  {
    id: 'openai',
    name: 'OpenAI GPT-4',
    baseUrl: 'https://api.openai.com/v1',
    apiKeyEnv: 'OPENAI_API_KEY',
    models: [
      'gpt-4',
      'gpt-4-turbo',
      'gpt-3.5-turbo'
    ],
    priority: 2,
    rateLimit: {
      requestsPerMinute: 50,
      requestsPerDay: 5000
    },
    features: {
      chat: true,
      codeGeneration: true,
      imageGeneration: true,
      embeddings: true
    },
    pricing: {
      costPer1KTokens: 0.03,
      currency: 'USD'
    }
  },

  // 3. Anthropic Claude - Средний приоритет
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKeyEnv: 'ANTHROPIC_API_KEY',
    models: [
      'claude-3-5-sonnet-20241022',
      'claude-3-5-haiku-20241022',
      'claude-3-opus-20240229'
    ],
    priority: 3,
    rateLimit: {
      requestsPerMinute: 30,
      requestsPerDay: 3000
    },
    features: {
      chat: true,
      codeGeneration: true,
      imageGeneration: false,
      embeddings: false
    },
    pricing: {
      costPer1KTokens: 0.015,
      currency: 'USD'
    }
  },

  // 4. Cohere - Для задач обработки текста
  {
    id: 'cohere',
    name: 'Cohere Command',
    baseUrl: 'https://api.cohere.ai/v1',
    apiKeyEnv: 'COHERE_API_KEY',
    models: [
      'command',
      'command-nightly',
      'command-r'
    ],
    priority: 4,
    rateLimit: {
      requestsPerMinute: 20,
      requestsPerDay: 2000
    },
    features: {
      chat: true,
      codeGeneration: true,
      imageGeneration: false,
      embeddings: true
    },
    pricing: {
      costPer1KTokens: 0.0015,
      currency: 'USD'
    }
  },

  // 5. Groq - Быстрый инференс
  {
    id: 'groq',
    name: 'Groq Llama',
    baseUrl: 'https://api.groq.com/openai/v1',
    apiKeyEnv: 'GROQ_API_KEY',
    models: [
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768'
    ],
    priority: 5,
    rateLimit: {
      requestsPerMinute: 25,
      requestsPerDay: 2500
    },
    features: {
      chat: true,
      codeGeneration: true,
      imageGeneration: false,
      embeddings: false
    },
    pricing: {
      costPer1KTokens: 0.0001,
      currency: 'USD'
    }
  },

  // 6. Together AI - Альтернативный провайдер
  {
    id: 'together',
    name: 'Together AI',
    baseUrl: 'https://api.together.xyz/v1',
    apiKeyEnv: 'TOGETHER_API_KEY',
    models: [
      'meta-llama/Llama-3.1-70B-Instruct-Turbo',
      'mistralai/Mixtral-8x7B-Instruct-v0.1',
      'deepseek-chat/deepseek-chat'
    ],
    priority: 6,
    rateLimit: {
      requestsPerMinute: 40,
      requestsPerDay: 4000
    },
    features: {
      chat: true,
      codeGeneration: true,
      imageGeneration: false,
      embeddings: true
    },
    pricing: {
      costPer1KTokens: 0.0008,
      currency: 'USD'
    }
  }
];

// Утилиты для работы с провайдерами
export class AIManager {
  private availableProviders: Map<string, AIProvider> = new Map();
  private usageStats: Map<string, { requests: number; lastReset: Date }> = new Map();

  constructor() {
    // Инициализация доступных провайдеров
    AI_PROVIDERS.forEach(provider => {
      if (this.hasApiKey(provider)) {
        this.availableProviders.set(provider.id, provider);
        this.usageStats.set(provider.id, { requests: 0, lastReset: new Date() });
      }
    });
  }

  // Проверка наличия API ключа
  private hasApiKey(provider: AIProvider): boolean {
    const apiKey = process.env[provider.apiKeyEnv];
    return apiKey && apiKey.trim() !== '';
  }

  // Получение лучшего доступного провайдера
  getBestProvider(preferences?: {
    feature?: keyof AIProvider['features'];
    maxCostPer1KTokens?: number;
  }): AIProvider | null {
    const candidates = this.getAvailableProviders();

    let filteredCandidates = candidates;

    // Фильтрация по функциям
    if (preferences?.feature) {
      filteredCandidates = filteredCandidates.filter(p => p.features[preferences.feature!]);
    }

    // Фильтрация по стоимости
    if (preferences?.maxCostPer1KTokens) {
      filteredCandidates = filteredCandidates.filter(p => 
        p.pricing.costPer1KTokens <= preferences.maxCostPer1KTokens!
      );
    }

    // Сортировка по приоритету (меньше = выше приоритет)
    filteredCandidates.sort((a, b) => a.priority - b.priority);

    return filteredCandidates[0] || null;
  }

  // Получение всех доступных провайдеров
  getAvailableProviders(): AIProvider[] {
    return AI_PROVIDERS
      .filter(provider => this.hasApiKey(provider))
      .sort((a, b) => a.priority - b.priority);
  }

  // Проверка лимитов провайдера
  canUseProvider(providerId: string): boolean {
    const provider = this.availableProviders.get(providerId);
    if (!provider) return false;

    const stats = this.usageStats.get(providerId);
    if (!stats) return true;

    // Проверка дневного лимита
    const now = new Date();
    if (now.getDate() !== stats.lastReset.getDate()) {
      stats.requests = 0;
      stats.lastReset = now;
    }

    return stats.requests < provider.rateLimit.requestsPerDay;
  }

  // Регистрация использования провайдера
  recordUsage(providerId: string): void {
    const stats = this.usageStats.get(providerId);
    if (stats) {
      stats.requests++;
    }
  }

  // Получение статистики
  getProviderStats(providerId: string): { requests: number; limit: number } | null {
    const provider = this.availableProviders.get(providerId);
    const stats = this.usageStats.get(providerId);
    
    if (!provider || !stats) return null;

    return {
      requests: stats.requests,
      limit: provider.rateLimit.requestsPerDay
    };
  }

  // Создание fallback цепочки провайдеров
  createProviderChain(taskType: keyof AIProvider['features']): AIProvider[] {
    const providers = this.getAvailableProviders()
      .filter(p => p.features[taskType])
      .sort((a, b) => a.priority - b.priority);

    return providers;
  }

  // Проверка здоровья провайдеров
  async checkProviderHealth(): Promise<Map<string, boolean>> {
    const health = new Map<string, boolean>();

    for (const provider of this.getAvailableProviders()) {
      try {
        const response = await fetch(`${provider.baseUrl}/models`, {
          headers: {
            'Authorization': `Bearer ${process.env[provider.apiKeyEnv]}`,
            'Content-Type': 'application/json'
          }
        });
        health.set(provider.id, response.ok);
      } catch (error) {
        health.set(provider.id, false);
      }
    }

    return health;
  }

  // Оптимизация выбора провайдера по стоимости
  getCostOptimalProvider(taskType: keyof AIProvider['features']): AIProvider | null {
    const providers = this.createProviderChain(taskType);
    
    return providers.reduce((best, current) => {
      if (!best || current.pricing.costPer1KTokens < best.pricing.costPer1KTokens) {
        return current;
      }
      return best;
    }, null as AIProvider | null);
  }

  // Оптимизация выбора провайдера по скорости
  getFastestProvider(taskType: keyof AIProvider['features']): AIProvider | null {
    const providers = this.createProviderChain(taskType);
    
    // Groq обычно самый быстрый
    return providers.find(p => p.id === 'groq') || providers[0] || null;
  }
}

// Экспорт singleton экземпляра
export const aiManager = new AIManager();

// Утилиты для конфигурации
export function getProviderConfig(): Record<string, Partial<AIProvider>> {
  const config: Record<string, Partial<AIProvider>> = {};
  
  AI_PROVIDERS.forEach(provider => {
    config[provider.id] = {
      name: provider.name,
      priority: provider.priority,
      models: provider.models,
      features: provider.features,
      pricing: provider.pricing
    };
  });
  
  return config;
}