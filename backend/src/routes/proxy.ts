import { Router } from 'express';
import { body, query, validationResult } from 'express-validator';
import rateLimit from 'express-rate-limit';
import { protectedAI, antiDetectionMiddleware } from '@/utils/api-protection';
import { logger, logRequest, logError, logAIRequest, logSecurity } from '@/utils/logger';
import { cache } from '@/config/redis';

const router = Router();

// Enhanced rate limiting
const createRateLimit = (windowMs: number, max: number, message: string) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message,
        retryAfter: Math.ceil(windowMs / 1000)
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logSecurity('rate_limit_exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        userId: req.user?.id
      });
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter: Math.ceil(windowMs / 1000)
        }
      });
    }
  });
};

// Different rate limits for different endpoints
const aiGenerateLimiter = createRateLimit(15 * 60 * 1000, 100, 'AI generation rate limit exceeded'); // 100 requests per 15 minutes
const chatLimiter = createRateLimit(15 * 60 * 1000, 300, 'Chat rate limit exceeded'); // 300 requests per 15 minutes
const codeLimiter = createRateLimit(60 * 60 * 1000, 50, 'Code generation rate limit exceeded'); // 50 requests per hour
const archLimiter = createRateLimit(60 * 60 * 1000, 20, 'Architecture design rate limit exceeded'); // 20 requests per hour

// Validation middleware
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    logSecurity('validation_error', {
      ip: req.ip,
      endpoint: req.path,
      errors: errors.array(),
      userId: req.user?.id
    });
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: errors.array()
      }
    });
  }
  next();
};

// Request ID middleware for idempotency
const requestIdMiddleware = (req: any, res: any, next: any) => {
  req.requestId = req.headers['x-request-id'] || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.requestId);
  next();
};

// Idempotency check middleware
const idempotencyMiddleware = async (req: any, res: any, next: any) => {
  if (req.method !== 'POST') return next();
  
  const idempotencyKey = req.headers['x-idempotency-key'];
  if (!idempotencyKey) return next();
  
  const cacheKey = `idempotency:${idempotencyKey}`;
  const cachedResponse = await cache.getAITempData(cacheKey);
  
  if (cachedResponse) {
    logSecurity('idempotency_hit', {
      idempotencyKey,
      requestId: req.requestId,
      endpoint: req.path,
      userId: req.user?.id
    });
    
    return res.json({
      ...cachedResponse,
      meta: {
        ...cachedResponse.meta,
        idempotent: true,
        cachedAt: cachedResponse.meta?.timestamp
      }
    });
  }
  
  next();
};

// Input sanitization middleware
const sanitizeInput = (req: any, res: any, next: any) => {
  // Sanitize string inputs
  const sanitizeString = (str: string) => {
    return str
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
      .replace(/javascript:/gi, '') // Remove javascript: protocol
      .replace(/on\w+\s*=/gi, '') // Remove event handlers
      .trim();
  };

  // Recursively sanitize object
  const sanitizeObject = (obj: any): any => {
    if (typeof obj === 'string') {
      return sanitizeString(obj);
    } else if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    } else if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitizeObject(value);
      }
      return sanitized;
    }
    return obj;
  };

  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

// Enhanced AI generation endpoint
router.post(
  '/ai/generate',
  requestIdMiddleware,
  idempotencyMiddleware,
  aiGenerateLimiter,
  antiDetectionMiddleware,
  sanitizeInput,
  [
    body('prompt')
      .isLength({ min: 1, max: 10000 })
      .withMessage('Prompt must be between 1 and 10000 characters')
      .trim()
      .escape(),
    body('context')
      .optional()
      .isLength({ max: 5000 })
      .withMessage('Context must be less than 5000 characters')
      .trim()
      .escape(),
    body('model')
      .optional()
      .isIn(['mini-max/text-01'])
      .withMessage('Invalid model specified')
  ],
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();
    const { prompt, context, model = 'mini-max/text-01' } = req.body;
    
    try {
      // Check cache first
      const cacheKey = `ai_generate:${Buffer.from(prompt + context + model).toString('base64')}`;
      const cached = await cache.getAITempData(cacheKey);
      
      if (cached) {
        logAIRequest(req.user?.id || 'anonymous', model, prompt, cached.usage?.totalTokens, cached.usage?.cost);
        logRequest(req, res, Date.now() - startTime);
        
        return res.json({
          success: true,
          data: cached,
          meta: {
            timestamp: Date.now(),
            request_id: req.requestId,
            cached: true,
            cacheAge: Date.now() - cached.meta?.timestamp
          }
        });
      }

      const response = await protectedAI.generateResponse(prompt, {
        model,
        context,
        user_id: req.user?.id,
        request_id: req.requestId
      });

      // Cache the response for 1 hour
      await cache.setAITempData(cacheKey, response, 60);

      // Log AI request
      logAIRequest(
        req.user?.id || 'anonymous',
        model,
        prompt,
        response.usage?.totalTokens,
        response.usage?.cost
      );

      // Store idempotency result
      const idempotencyKey = req.headers['x-idempotency-key'];
      if (idempotencyKey) {
        await cache.setAITempData(
          `idempotency:${idempotencyKey}`,
          {
            success: true,
            data: response,
            meta: {
              timestamp: Date.now(),
              request_id: req.requestId
            }
          },
          24 // 24 hours
        );
      }

      logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        data: response,
        meta: {
          timestamp: Date.now(),
          request_id: req.requestId,
          processingTime: Date.now() - startTime
        }
      });

    } catch (error: any) {
      logger.error('AI generation error:', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id,
        requestId: req.requestId,
        prompt: prompt?.substring(0, 100) // Log first 100 chars only
      });

      logError(error, {
        endpoint: '/ai/generate',
        userId: req.user?.id,
        requestId: req.requestId
      });

      res.status(500).json({
        success: false,
        error: {
          code: 'AI_GENERATION_ERROR',
          message: 'Failed to generate AI response',
          requestId: req.requestId
        }
      });
    }
  }
);

// Enhanced chat completion endpoint
router.post(
  '/chat/complete',
  requestIdMiddleware,
  idempotencyMiddleware,
  chatLimiter,
  antiDetectionMiddleware,
  sanitizeInput,
  [
    body('messages')
      .isArray({ min: 1, max: 50 })
      .withMessage('Messages must be an array with 1-50 items'),
    body('messages.*.role')
      .isIn(['system', 'user', 'assistant'])
      .withMessage('Invalid message role'),
    body('messages.*.content')
      .isLength({ min: 1, max: 8000 })
      .withMessage('Message content must be between 1 and 8000 characters')
      .trim(),
    body('temperature')
      .optional()
      .isFloat({ min: 0, max: 2 })
      .withMessage('Temperature must be between 0 and 2'),
    body('max_tokens')
      .optional()
      .isInt({ min: 1, max: 4000 })
      .withMessage('Max tokens must be between 1 and 4000')
  ],
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();
    const { messages, temperature = 0.7, max_tokens = 2000 } = req.body;
    
    try {
      // Validate message sequence
      const prompt = messages.map((m: any) => `${m.role}: ${m.content}`).join('\n');
      
      // Check cache for similar conversations
      const cacheKey = `chat:${Buffer.from(prompt + temperature + max_tokens).toString('base64')}`;
      const cached = await cache.getAITempData(cacheKey);
      
      if (cached) {
        logAIRequest(req.user?.id || 'anonymous', 'mini-max/text-01', prompt, cached.usage?.totalTokens, cached.usage?.cost);
        logRequest(req, res, Date.now() - startTime);
        
        return res.json({
          ...cached,
          meta: {
            ...cached.meta,
            cached: true,
            cacheAge: Date.now() - cached.meta?.timestamp
          }
        });
      }

      const response = await protectedAI.generateResponse(prompt, {
        temperature,
        max_tokens,
        type: 'chat',
        user_id: req.user?.id,
        request_id: req.requestId
      });

      // Cache for 30 minutes
      await cache.setAITempData(cacheKey, {
        choices: [{
          message: {
            role: 'assistant',
            content: response.content
          }
        }],
        usage: {
          total_tokens: response.tokens || 0
        }
      }, 30);

      logAIRequest(req.user?.id || 'anonymous', 'mini-max/text-01', prompt, response.tokens, response.cost);
      logRequest(req, res, Date.now() - startTime);

      res.json({
        choices: [{
          message: {
            role: 'assistant',
            content: response.content
          }
        }],
        usage: {
          total_tokens: response.tokens || 0
        },
        meta: {
          request_id: req.requestId,
          processingTime: Date.now() - startTime
        }
      });

    } catch (error: any) {
      logger.error('Chat completion error:', {
        error: error.message,
        userId: req.user?.id,
        requestId: req.requestId
      });

      res.status(500).json({
        error: 'Chat completion failed',
        requestId: req.requestId
      });
    }
  }
);

// Enhanced code generation endpoint
router.post(
  '/code/generate',
  requestIdMiddleware,
  idempotencyMiddleware,
  codeLimiter,
  antiDetectionMiddleware,
  sanitizeInput,
  [
    body('language')
      .isLength({ min: 1, max: 50 })
      .withMessage('Language must be specified and less than 50 characters')
      .trim()
      .escape(),
    body('prompt')
      .isLength({ min: 1, max: 8000 })
      .withMessage('Prompt must be between 1 and 8000 characters')
      .trim(),
    body('context')
      .optional()
      .isLength({ max: 4000 })
      .withMessage('Context must be less than 4000 characters')
      .trim()
  ],
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();
    const { language, prompt, context } = req.body;
    
    try {
      const fullPrompt = `Generate ${language} code for: ${prompt}`;
      
      const response = await protectedAI.generateResponse(fullPrompt, {
        language,
        context,
        type: 'code_generation',
        user_id: req.user?.id,
        request_id: req.requestId
      });

      logAIRequest(req.user?.id || 'anonymous', 'mini-max/text-01', fullPrompt, response.tokens, response.cost);
      logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        code: response.content,
        language,
        explanation: response.explanation || '',
        alternatives: response.alternatives || [],
        meta: {
          request_id: req.requestId,
          processingTime: Date.now() - startTime
        }
      });

    } catch (error: any) {
      logger.error('Code generation error:', {
        error: error.message,
        language,
        userId: req.user?.id,
        requestId: req.requestId
      });

      res.status(500).json({
        error: 'Code generation failed',
        requestId: req.requestId
      });
    }
  }
);

// Enhanced architecture design endpoint
router.post(
  '/architecture/design',
  requestIdMiddleware,
  idempotencyMiddleware,
  archLimiter,
  antiDetectionMiddleware,
  sanitizeInput,
  [
    body('requirements')
      .isLength({ min: 10, max: 8000 })
      .withMessage('Requirements must be between 10 and 8000 characters')
      .trim(),
    body('tech_stack')
      .optional()
      .isArray({ max: 20 })
      .withMessage('Tech stack must be an array with max 20 items'),
    body('tech_stack.*')
      .optional()
      .isLength({ min: 1, max: 100 })
      .withMessage('Each tech stack item must be less than 100 characters')
      .trim()
      .escape()
  ],
  handleValidationErrors,
  async (req, res) => {
    const startTime = Date.now();
    const { requirements, tech_stack } = req.body;
    
    try {
      const prompt = `Design system architecture for: ${requirements}`;
      
      const response = await protectedAI.generateResponse(prompt, {
        requirements,
        tech_stack,
        type: 'architecture_design',
        user_id: req.user?.id,
        request_id: req.requestId
      });

      logAIRequest(req.user?.id || 'anonymous', 'mini-max/text-01', prompt, response.tokens, response.cost);
      logRequest(req, res, Date.now() - startTime);

      res.json({
        success: true,
        architecture: response.content,
        components: response.components || [],
        recommendations: response.recommendations || [],
        tech_stack: tech_stack || [],
        meta: {
          request_id: req.requestId,
          processingTime: Date.now() - startTime
        }
      });

    } catch (error: any) {
      logger.error('Architecture design error:', {
        error: error.message,
        userId: req.user?.id,
        requestId: req.requestId
      });

      res.status(500).json({
        error: 'Architecture design failed',
        requestId: req.requestId
      });
    }
  }
);

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// Metrics endpoint (admin only)
router.get('/metrics', (req, res) => {
  // In production, this would return actual metrics
  res.json({
    requests_total: 0,
    ai_requests_total: 0,
    cache_hit_rate: 0,
    average_response_time: 0
  });
});

export default router;