import { Router } from 'express';
import { body, query } from 'express-validator';
import { aiController } from '../controllers/ai-controller.js';
import { protectedAI, antiDetectionMiddleware } from '../utils/api-protection.js';
import { logger } from '../utils/logger.js';

const router = Router();

// Базовые middleware для всех AI маршрутов
router.use(antiDetectionMiddleware);
router.use(protectedAI);

// 🎯 Основной AI чат endpoint с поддержкой множественных провайдеров
router.post('/chat',
  body('message').isString().isLength({ min: 1, max: 4000 }).withMessage('Message is required and must be 1-4000 characters'),
  body('provider').optional().isString().withMessage('Provider must be a string'),
  body('model').optional().isString().withMessage('Model must be a string'),
  body('preferences').optional().isObject().withMessage('Preferences must be an object'),
  body('systemPrompt').optional().isString().isLength({ max: 2000 }).withMessage('System prompt must be a string up to 2000 characters'),
  body('temperature').optional().isFloat({ min: 0, max: 2 }).withMessage('Temperature must be between 0 and 2'),
  body('maxTokens').optional().isInt({ min: 1, max: 4000 }).withMessage('Max tokens must be between 1 and 4000'),
  
  async (req, res) => {
    logger.info('AI chat request received', {
      provider: req.body.provider || 'auto',
      messageLength: req.body.message?.length || 0,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    await aiController.processAIRequest(req, res);
  }
);

// 📊 Получение информации о доступных AI провайдерах
router.get('/providers',
  query('includeStats').optional().isBoolean().withMessage('includeStats must be boolean'),
  query('includeHealth').optional().isBoolean().withMessage('includeHealth must be boolean'),
  
  async (req, res) => {
    logger.info('AI providers info requested', {
      query: req.query,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    await aiController.getProviders(req, res);
  }
);

// 🔍 Проверка здоровья AI провайдеров
router.get('/health',
  query('detailed').optional().isBoolean().withMessage('detailed must be boolean'),
  
  async (req, res) => {
    logger.info('AI health check requested', {
      detailed: req.query.detailed,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    await aiController.checkAllProvidersHealth(req, res);
  }
);

// 📈 Статистика использования AI провайдеров
router.get('/stats',
  query('period').optional().isIn(['day', 'week', 'month']).withMessage('Period must be day, week, or month'),
  query('provider').optional().isString().withMessage('Provider filter must be string'),
  
  async (req, res) => {
    logger.info('AI usage stats requested', {
      period: req.query.period || 'day',
      provider: req.query.provider,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    await aiController.getUsageStats(req, res);
  }
);

// 🔄 Переключение между AI провайдерами
router.post('/switch-provider',
  body('currentProvider').isString().withMessage('currentProvider is required'),
  body('reason').optional().isString().isLength({ max: 500 }).withMessage('Reason must be string up to 500 characters'),
  body('requestData').optional().isObject().withMessage('requestData must be object'),
  
  async (req, res) => {
    const { currentProvider, reason, requestData } = req.body;
    
    logger.info('Provider switch requested', {
      currentProvider,
      reason,
      requestData,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    try {
      // Создание нового запроса с автоматическим выбором провайдера
      const newRequest = {
        message: requestData?.message || 'Continue previous conversation',
        preferences: {
          optimizeFor: 'quality',
          features: ['chat']
        }
      };
      
      await aiController.processAIRequest(
        { ...req, body: newRequest } as any,
        res
      );
      
    } catch (error) {
      logger.error('Provider switch failed', { error: error.message, currentProvider, reason });
      res.status(500).json({
        success: false,
        error: 'Failed to switch provider',
        message: error.message
      });
    }
  }
);

// 💰 Расчет стоимости запроса
router.post('/cost-estimate',
  body('message').isString().isLength({ min: 1, max: 4000 }).withMessage('Message is required'),
  body('provider').optional().isString().withMessage('Provider must be string'),
  body('model').optional().isString().withMessage('Model must be string'),
  body('maxTokens').optional().isInt({ min: 1, max: 4000 }).withMessage('Max tokens must be between 1 and 4000'),
  
  (req, res) => {
    const { message, provider, model, maxTokens = 1000 } = req.body;
    
    logger.info('Cost estimate requested', {
      messageLength: message?.length,
      provider: provider || 'auto',
      model: model || 'auto',
      maxTokens,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    try {
      // Простая оценка токенов (примерно 1 токен = 4 символа)
      const estimatedInputTokens = Math.ceil(message.length / 4);
      const estimatedOutputTokens = Math.ceil(maxTokens * 0.8); // Предполагаем, что выход будет меньше лимита
      const totalTokens = estimatedInputTokens + estimatedOutputTokens;
      
      // Получение информации о провайдере для расчета стоимости
      const aiManager = require('../utils/ai-providers.js').aiManager;
      const selectedProvider = provider ? 
        aiManager.getAvailableProviders().find(p => p.id === provider) :
        aiManager.getBestProvider({ feature: 'chat' });
      
      if (!selectedProvider) {
        return res.status(404).json({
          success: false,
          error: 'No available providers found'
        });
      }
      
      const cost = (totalTokens / 1000) * selectedProvider.pricing.costPer1KTokens;
      
      res.json({
        success: true,
        estimate: {
          inputTokens: estimatedInputTokens,
          outputTokens: estimatedOutputTokens,
          totalTokens,
          cost: {
            amount: cost,
            currency: selectedProvider.pricing.currency,
            per1KTokens: selectedProvider.pricing.costPer1KTokens
          },
          provider: {
            id: selectedProvider.id,
            name: selectedProvider.name,
            model: model || selectedProvider.models[0]
          },
          disclaimer: 'This is an estimate. Actual costs may vary based on model responses and tokenization.'
        }
      });
      
    } catch (error) {
      logger.error('Cost estimation failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to estimate cost',
        message: error.message
      });
    }
  }
);

// 🎯 Специализированные endpoints для разных типов задач
router.post('/code',
  body('message').isString().isLength({ min: 1, max: 4000 }).withMessage('Message is required'),
  body('language').optional().isString().withMessage('Programming language must be string'),
  body('framework').optional().isString().withMessage('Framework must be string'),
  
  async (req, res) => {
    const { message, language, framework } = req.body;
    
    logger.info('Code generation request', {
      language,
      framework,
      messageLength: message?.length,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    const codeRequest = {
      ...req.body,
      systemPrompt: `You are an expert programmer. ${language ? `Focus on ${language} programming.` : ''} ${framework ? `Use ${framework} framework when appropriate.` : ''} Provide clean, well-documented, and production-ready code.`,
      preferences: {
        optimizeFor: 'quality',
        features: ['codeGeneration']
      }
    };
    
    // Перенаправляем на основной chat endpoint
    req.body = codeRequest;
    await aiController.processAIRequest(req, res);
  }
);

router.post('/creative',
  body('message').isString().isLength({ min: 1, max: 4000 }).withMessage('Message is required'),
  body('style').optional().isIn(['creative', 'professional', 'casual', 'technical']).withMessage('Style must be valid'),
  body('length').optional().isIn(['short', 'medium', 'long']).withMessage('Length must be short, medium, or long'),
  
  async (req, res) => {
    const { message, style = 'creative', length = 'medium' } = req.body;
    
    logger.info('Creative writing request', {
      style,
      length,
      messageLength: message?.length,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    const lengthInstructions = {
      short: 'Keep response brief and concise.',
      medium: 'Provide a moderately detailed response.',
      long: 'Provide a comprehensive and detailed response.'
    };
    
    const creativeRequest = {
      ...req.body,
      systemPrompt: `You are a creative writing assistant. Write in a ${style} style. ${lengthInstructions[length]}`,
      preferences: {
        optimizeFor: 'quality',
        features: ['chat']
      },
      temperature: style === 'creative' ? 0.9 : 0.7,
      maxTokens: length === 'short' ? 500 : length === 'medium' ? 1000 : 2000
    };
    
    req.body = creativeRequest;
    await aiController.processAIRequest(req, res);
  }
);

// 🔄 Batch обработка нескольких запросов
router.post('/batch',
  body('requests').isArray({ min: 1, max: 10 }).withMessage('Requests must be array of 1-10 items'),
  body('requests.*.message').isString().isLength({ min: 1, max: 4000 }).withMessage('Each request message is required'),
  body('requests.*.provider').optional().isString().withMessage('Provider must be string'),
  body('requests.*.model').optional().isString().withMessage('Model must be string'),
  
  async (req, res) => {
    const { requests } = req.body;
    
    logger.info('Batch AI request', {
      requestCount: requests?.length,
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    try {
      const responses = [];
      
      for (let i = 0; i < requests.length; i++) {
        const request = requests[i];
        
        // Создаем мок-ответ для демонстрации
        // В реальной реализации здесь был бы вызов aiController.processAIRequest
        responses.push({
          id: `batch_${Date.now()}_${i}`,
          provider: request.provider || 'openrouter',
          model: request.model || 'minimax/maximum-120k-01',
          content: `Response to: ${request.message.substring(0, 100)}${request.message.length > 100 ? '...' : ''}`,
          usage: {
            promptTokens: Math.ceil(request.message.length / 4),
            completionTokens: 150,
            totalTokens: Math.ceil(request.message.length / 4) + 150,
            cost: 0.001,
            currency: 'USD'
          },
          metadata: {
            finishReason: 'stop',
            model: request.model || 'minimax/maximum-120k-01',
            timestamp: new Date().toISOString(),
            responseTime: Math.floor(Math.random() * 2000) + 500
          }
        });
        
        // Задержка между запросами для избежания rate limiting
        if (i < requests.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      res.json({
        success: true,
        batchId: `batch_${Date.now()}`,
        totalRequests: requests.length,
        responses,
        totalCost: responses.reduce((sum, r) => sum + r.usage.cost, 0),
        totalTokens: responses.reduce((sum, r) => sum + r.usage.totalTokens, 0)
      });
      
    } catch (error) {
      logger.error('Batch processing failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Batch processing failed',
        message: error.message
      });
    }
  }
);

// 📋 Конфигурация AI провайдеров
router.get('/config',
  (req, res) => {
    logger.info('AI config requested', {
      userAgent: req.get('User-Agent'),
      ip: req.ip
    });
    
    try {
      const { getProviderConfig } = require('../utils/ai-providers.js');
      const config = getProviderConfig();
      
      res.json({
        success: true,
        config,
        environment: {
          nodeEnv: process.env.NODE_ENV,
          hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
          hasOpenAIKey: !!process.env.OPENAI_API_KEY,
          hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY
        }
      });
      
    } catch (error) {
      logger.error('Config retrieval failed', { error: error.message });
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve configuration',
        message: error.message
      });
    }
  }
);

export default router;