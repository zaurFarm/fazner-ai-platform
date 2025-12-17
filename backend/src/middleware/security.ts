import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import cors from 'cors';
import { cache } from '@/config/redis';
import { logger, logSecurity, logPerformance } from '@/utils/logger';

// Enhanced rate limiting with Redis storage
const createRateLimit = (windowMs: number, max: number, message: string, keyGenerator?: (req: Request) => string) => {
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
    keyGenerator: keyGenerator || ((req: Request) => req.ip),
    handler: (req: Request, res: Response) => {
      logSecurity('rate_limit_exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.path,
        userId: req.user?.id,
        windowMs,
        max,
      }, req);
      
      res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message,
          retryAfter: Math.ceil(windowMs / 1000)
        }
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting for health checks and monitoring
      return req.path === '/health' || req.path === '/metrics';
    }
  });
};

// Request timeout middleware
export const requestTimeout = (timeoutMs: number = 30000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        logSecurity('request_timeout', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          method: req.method,
          timeout: timeoutMs,
        }, req);
        
        res.status(408).json({
          success: false,
          error: {
            code: 'REQUEST_TIMEOUT',
            message: 'Request timeout',
            timeout: timeoutMs
          }
        });
      }
    }, timeoutMs);

    res.on('finish', () => {
      clearTimeout(timer);
    });

    next();
  };
};

// Request size limiter
export const requestSizeLimit = (maxSize: string = '10mb') => {
  return (req: Request, res: Response, next: NextFunction) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const sizeInBytes = parseInt(contentLength);
      const maxSizeInBytes = parseSize(maxSize);
      
      if (sizeInBytes > maxSizeInBytes) {
        logSecurity('request_too_large', {
          ip: req.ip,
          contentLength: sizeInBytes,
          maxSize: maxSizeInBytes,
          endpoint: req.path,
        }, req);
        
        return res.status(413).json({
          success: false,
          error: {
            code: 'REQUEST_TOO_LARGE',
            message: 'Request payload too large',
            maxSize,
            receivedSize: contentLength
          }
        });
      }
    }
    
    next();
  };
};

// Helper function to parse size strings
const parseSize = (size: string): number => {
  const units: { [key: string]: number } = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };
  
  const match = size.toLowerCase().match(/^(\d+)([a-z]+)?$/);
  if (!match) return 0;
  
  const value = parseInt(match[1]);
  const unit = match[2] || 'b';
  
  return value * (units[unit] || 1);
};

// IP whitelist middleware
export const ipWhitelist = (allowedIPs: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientIP = req.ip || req.connection.remoteAddress || '';
    
    // Handle reverse proxy scenarios
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = forwardedFor.split(',').map(ip => ip.trim());
      if (ips.length > 0) {
        // Use the first IP in the chain
        const firstIP = ips[0].replace(/^::ffff:/, ''); // Handle IPv4-mapped IPv6
        if (allowedIPs.includes(firstIP)) {
          return next();
        }
      }
    }
    
    // Check direct IP
    const cleanIP = clientIP.replace(/^::ffff:/, ''); // Handle IPv4-mapped IPv6
    if (allowedIPs.includes(cleanIP)) {
      return next();
    }
    
    logSecurity('ip_not_whitelisted', {
      ip: cleanIP,
      forwardedFor: forwardedFor,
      endpoint: req.path,
      allowedIPs,
    }, req);
    
    res.status(403).json({
      success: false,
      error: {
        code: 'IP_NOT_ALLOWED',
        message: 'IP address not allowed'
      }
    });
  };
};

// Suspicious activity detector
export const suspiciousActivityDetector = () => {
  const suspiciousPatterns = [
    /(\<|%3C)script(\>|%3E)/gi, // Script tags
    /javascript:/gi, // JavaScript protocol
    /on\w+\s*=/gi, // Event handlers
    /union.*select/gi, // SQL injection
    /(\<|%3C)(\/|%2F)script/gi, // Script tags
  ];
  
  return (req: Request, res: Response, next: NextFunction) => {
    const checkString = JSON.stringify({
      body: req.body,
      query: req.query,
      params: req.params,
      headers: req.headers,
    }).toLowerCase();
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(checkString)) {
        logSecurity('suspicious_request_pattern', {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          endpoint: req.path,
          method: req.method,
          pattern: pattern.source,
          matchedText: checkString.match(pattern)?.[0],
        }, req);
        
        return res.status(400).json({
          success: false,
          error: {
            code: 'SUSPICIOUS_REQUEST',
            message: 'Request contains suspicious patterns'
          }
        });
      }
    }
    
    next();
  };
};

// Bot detection middleware
export const botDetector = () => {
  const botPatterns = [
    /bot/i,
    /crawler/i,
    /spider/i,
    /scraper/i,
    /curl/i,
    /wget/i,
  ];
  
  return (req: Request, res: Response, next: NextFunction) => {
    const userAgent = req.get('User-Agent') || '';
    const isBot = botPatterns.some(pattern => pattern.test(userAgent));
    
    if (isBot && req.path.startsWith('/api/')) {
      logSecurity('bot_detected', {
        ip: req.ip,
        userAgent,
        endpoint: req.path,
        method: req.method,
      }, req);
      
      return res.status(403).json({
        success: false,
        error: {
          code: 'BOT_ACCESS_DENIED',
          message: 'Bot access to API endpoints is not allowed'
        }
      });
    }
    
    next();
  };
};

// Request validation middleware
export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Basic validation - in production, use a proper validation library like Joi or Yup
    const { body, query, params } = req;
    
    // Check for required fields based on method
    if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH') {
      if (!body || Object.keys(body).length === 0) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Request body is required'
          }
        });
      }
    }
    
    // Validate parameter lengths
    const maxLength = 1000;
    const checkObjectLength = (obj: any, path: string = ''): boolean => {
      if (typeof obj === 'string' && obj.length > maxLength) {
        logSecurity('parameter_too_long', {
          ip: req.ip,
          endpoint: req.path,
          parameter: path,
          length: obj.length,
          maxLength,
        }, req);
        
        return false;
      }
      
      if (typeof obj === 'object' && obj !== null) {
        for (const [key, value] of Object.entries(obj)) {
          if (!checkObjectLength(value, path ? `${path}.${key}` : key)) {
            return false;
          }
        }
      }
      
      return true;
    };
    
    if (!checkObjectLength(body) || !checkObjectLength(query) || !checkObjectLength(params)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'PARAMETER_TOO_LONG',
          message: `Parameters exceed maximum length of ${maxLength} characters`
        }
      });
    }
    
    next();
  };
};

// Caching middleware for GET requests
export const cacheResponse = (ttl: number = 300) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') {
      return next();
    }
    
    const cacheKey = `response_cache:${Buffer.from(req.url).toString('base64')}`;
    
    try {
      const cachedResponse = await cache.get(cacheKey);
      if (cachedResponse) {
        const responseData = JSON.parse(cachedResponse);
        res.set('X-Cache', 'HIT');
        res.set('X-Cache-Age', responseData.age ? `${responseData.age}s` : '0s');
        res.set('Cache-Control', `public, max-age=${ttl}`);
        return res.status(200).json(responseData.data);
      }
      
      // Override res.json to cache the response
      const originalJson = res.json;
      res.json = function(body: any) {
        const responseData = {
          data: body,
          age: 0,
          timestamp: Date.now(),
        };
        
        cache.set(cacheKey, JSON.stringify(responseData), ttl).catch(err => {
          logger.warn('Failed to cache response:', err);
        });
        
        res.set('X-Cache', 'MISS');
        res.set('Cache-Control', `public, max-age=${ttl}`);
        
        return originalJson.call(this, body);
      };
      
      next();
    } catch (error) {
      next(); // Continue without caching if Redis is unavailable
    }
  };
};

// Performance monitoring middleware
export const performanceMonitor = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    
    // Add request ID if not present
    if (!req.headers['x-request-id']) {
      req.headers['x-request-id'] = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    res.locals.requestId = req.headers['x-request-id'];
    
    // Monitor response time
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      logPerformance('http_request', duration, 'ms', req);
      
      // Log slow requests
      if (duration > 2000) {
        logSecurity('slow_request', {
          ip: req.ip,
          method: req.method,
          url: req.url,
          duration,
          userAgent: req.get('User-Agent'),
        }, req);
      }
    });
    
    next();
  };
};

// Security headers middleware
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embeddings for AI features
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// CORS configuration
export const corsConfig = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'https://yourdomain.com',
    ];
    
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    logSecurity('cors_origin_rejected', {
      origin,
      ip: origin,
      allowedOrigins,
    });
    
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Idempotency-Key'],
  exposedHeaders: ['X-Request-ID', 'X-Rate-Limit-Remaining', 'X-Rate-Limit-Reset'],
  maxAge: 86400, // 24 hours
});

// Rate limiting configurations for different endpoints
export const rateLimits = {
  // General API rate limiting
  general: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    1000, // 1000 requests per window
    'Too many requests from this IP'
  ),
  
  // Strict rate limiting for AI endpoints
  ai: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    100, // 100 requests per window
    'AI service rate limit exceeded',
    (req) => req.user?.id || req.ip
  ),
  
  // Authentication endpoints
  auth: createRateLimit(
    15 * 60 * 1000, // 15 minutes
    10, // 10 requests per window
    'Authentication rate limit exceeded'
  ),
  
  // File upload endpoints
  upload: createRateLimit(
    60 * 60 * 1000, // 1 hour
    20, // 20 uploads per hour
    'File upload rate limit exceeded'
  ),
  
  // Search endpoints
  search: createRateLimit(
    60 * 60 * 1000, // 1 hour
    100, // 100 searches per hour
    'Search rate limit exceeded'
  ),
};

// Export all middleware
export default {
  requestTimeout,
  requestSizeLimit,
  ipWhitelist,
  suspiciousActivityDetector,
  botDetector,
  validateRequest,
  cacheResponse,
  performanceMonitor,
  securityHeaders,
  corsConfig,
  rateLimits,
};