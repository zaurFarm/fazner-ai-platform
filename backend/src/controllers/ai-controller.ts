import { Request, Response } from 'express';
import { aiManager, AIProvider } from '../utils/ai-providers.js';
import { logger } from '../utils/logger.js';

export interface AIRequest {
  message: string;
  provider?: string;
  model?: string;
  preferences?: {
    optimizeFor?: 'cost' | 'speed' | 'quality';
    features?: ('chat' | 'codeGeneration' | 'imageGeneration' | 'embeddings')[];
    maxCost?: number;
  };
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  id: string;
  provider: string;
  model: string;
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
    currency: string;
  };
  metadata: {
    finishReason: string;
    model: string;
    timestamp: string;
    responseTime: number;
  };
}

export class AIController {
  // Основной метод для обработки AI запросов
  async processAIRequest(req: Request, res: Response): Promise<void> {
    try {
      const aiRequest: AIRequest = req.body;
      
      // Валидация запроса
      if (!aiRequest.message || typeof aiRequest.message !== 'string') {
        res.status(400).json({
          error: 'Message is required and must be a string'
        });
        return;
      }

      // Выбор оптимального провайдера
      const selectedProvider = await this.selectOptimalProvider(aiRequest);
      
      if (!selectedProvider) {
        res.status(503).json({
          error: 'No available AI providers configured',
          availableProviders: aiManager.getAvailableProviders().map(p => p.name)
        });
        return;
      }

      // Выполнение запроса
      const aiResponse = await this.executeAIRequest(selectedProvider, aiRequest);
      
      // Логирование использования
      aiManager.recordUsage(selectedProvider.id);
      logger.info('AI request completed', {
        provider: selectedProvider.id,
        model: aiResponse.model,
        tokens: aiResponse.usage.totalTokens,
        cost: aiResponse.usage.cost
      });

      res.json(aiResponse);
      
    } catch (error) {
      logger.error('AI request failed', { error: error.message, stack: error.stack });
      
      // Попытка fallback на другой провайдер
      await this.handleFallback(req, res, error);
    }
  }

  // Выбор оптимального провайдера
  private async selectOptimalProvider(request: AIRequest): Promise<AIProvider | null> {
    // Если указан конкретный провайдер
    if (request.provider) {
      const provider = aiManager.getAvailableProviders().find(p => p.id === request.provider);
      if (provider && aiManager.canUseProvider(provider.id)) {
        return provider;
      }
    }

    // Оптимизация по предпочтениям
    if (request.preferences) {
      switch (request.preferences.optimizeFor) {
        case 'cost':
          return aiManager.getCostOptimalProvider('chat');
        case 'speed':
          return aiManager.getFastestProvider('chat');
        case 'quality':
          return aiManager.getBestProvider({ feature: 'chat', maxCost: request.preferences.maxCost });
        default:
          break;
      }
    }

    // Автоматический выбор лучшего провайдера
    return aiManager.getBestProvider({ feature: 'chat' });
  }

  // Выполнение запроса к AI
  private async executeAIRequest(provider: AIProvider, request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    
    // Подготовка запроса
    const aiRequestBody = {
      model: request.model || provider.models[0],
      messages: [
        ...(request.systemPrompt ? [{ role: 'system', content: request.systemPrompt }] : []),
        { role: 'user', content: request.message }
      ],
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 1000
    };

    // Выполнение запроса
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env[provider.apiKeyEnv]}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.FRONTEND_URL || 'http://localhost:3000',
        'X-Title': 'Fazner AI Platform'
      },
      body: JSON.stringify(aiRequestBody)
    });

    if (!response.ok) {
      throw new Error(`AI provider ${provider.id} failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const responseTime = Date.now() - startTime;

    // Расчет стоимости
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const totalTokens = promptTokens + completionTokens;
    const cost = (totalTokens / 1000) * provider.pricing.costPer1KTokens;

    return {
      id: data.id || `ai_${Date.now()}`,
      provider: provider.id,
      model: data.model,
      content: data.choices?.[0]?.message?.content || 'No response generated',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        cost,
        currency: provider.pricing.currency
      },
      metadata: {
        finishReason: data.choices?.[0]?.finish_reason || 'unknown',
        model: data.model,
        timestamp: new Date().toISOString(),
        responseTime
      }
    };
  }

  // Обработка fallback при ошибке
  private async handleFallback(req: Request, res: Response, originalError: Error): Promise<void> {
    const aiRequest: AIRequest = req.body;
    
    // Попытка использования fallback провайдеров
    const fallbackProviders = aiManager.createProviderChain('chat')
      .filter(p => p.id !== aiRequest.provider)
      .slice(0, 2); // Максимум 2 fallback попытки

    for (const fallbackProvider of fallbackProviders) {
      if (aiManager.canUseProvider(fallbackProvider.id)) {
        try {
          logger.info('Attempting fallback to provider', { 
            originalError: originalError.message,
            fallbackProvider: fallbackProvider.id 
          });
          
          const fallbackResponse = await this.executeAIRequest(fallbackProvider, {
            ...aiRequest,
            provider: fallbackProvider.id
          });
          
          res.json({
            ...fallbackResponse,
            note: `Fallback response from ${fallbackProvider.name} after ${originalError.message}`
          });
          return;
          
        } catch (fallbackError) {
          logger.warn('Fallback failed', { 
            fallbackProvider: fallbackProvider.id,
            error: fallbackError.message 
          });
          continue;
        }
      }
    }

    // Все провайдеры недоступны
    res.status(503).json({
      error: 'All AI providers are currently unavailable',
      originalError: originalError.message,
      availableProviders: aiManager.getAvailableProviders().map(p => p.name)
    });
  }

  // Получение списка доступных провайдеров
  async getProviders(req: Request, res: Response): Promise<void> {
    try {
      const providers = aiManager.getAvailableProviders();
      const providerStats = await Promise.all(
        providers.map(async (provider) => {
          const stats = aiManager.getProviderStats(provider.id);
          const health = await this.checkProviderHealth(provider);
          
          return {
            ...provider,
            stats,
            health,
            configured: true
          };
        })
      );

      res.json({
        providers: providerStats,
        total: providerStats.length,
        active: providerStats.filter(p => p.health && p.stats && p.stats.requests < p.stats.limit).length
      });
      
    } catch (error) {
      logger.error('Failed to get providers', { error: error.message });
      res.status(500).json({ error: 'Failed to retrieve provider information' });
    }
  }

  // Проверка здоровья провайдера
  private async checkProviderHealth(provider: AIProvider): Promise<boolean> {
    try {
      const response = await fetch(`${provider.baseUrl}/models`, {
        headers: {
          'Authorization': `Bearer ${process.env[provider.apiKeyEnv]}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000 // 5 секунд timeout
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Проверка здоровья всех провайдеров
  async checkAllProvidersHealth(req: Request, res: Response): Promise<void> {
    try {
      const health = await aiManager.checkProviderHealth();
      
      res.json({
        timestamp: new Date().toISOString(),
        providers: Object.fromEntries(health),
        summary: {
          healthy: Array.from(health.values()).filter(Boolean).length,
          total: health.size,
          healthyPercentage: (Array.from(health.values()).filter(Boolean).length / health.size) * 100
        }
      });
      
    } catch (error) {
      logger.error('Health check failed', { error: error.message });
      res.status(500).json({ error: 'Health check failed' });
    }
  }

  // Получение статистики использования
  async getUsageStats(req: Request, res: Response): Promise<void> {
    try {
      const providers = aiManager.getAvailableProviders();
      const stats = providers.map(provider => ({
        provider: provider.name,
        providerId: provider.id,
        ...aiManager.getProviderStats(provider.id),
        cost: provider.pricing.costPer1KTokens,
        currency: provider.pricing.currency
      }));

      const totalRequests = stats.reduce((sum, stat) => sum + (stat?.requests || 0), 0);
      const totalLimit = stats.reduce((sum, stat) => sum + (stat?.limit || 0), 0);

      res.json({
        timestamp: new Date().toISOString(),
        providers: stats,
        summary: {
          totalRequests,
          totalLimit,
          utilizationPercentage: totalLimit > 0 ? (totalRequests / totalLimit) * 100 : 0,
          activeProviders: stats.filter(s => s && s.requests < s.limit).length,
          totalProviders: stats.length
        }
      });
      
    } catch (error) {
      logger.error('Failed to get usage stats', { error: error.message });
      res.status(500).json({ error: 'Failed to retrieve usage statistics' });
    }
  }
}

export const aiController = new AIController();