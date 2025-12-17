import winston from 'winston';
import { Request, Response } from 'express';
import { performance } from 'perf_hooks';

// Enhanced logger configuration with multiple transports
const { combine, timestamp, errors, json, printf, colorize, splat, label } = winston.format;

// Correlation ID generator
const generateCorrelationId = (): string => {
  return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Custom format for structured logging
const structuredFormat = printf(({ level, message, timestamp, service, environment, correlationId, ...meta }) => {
  const logEntry = {
    timestamp,
    level,
    message,
    service,
    environment,
    correlationId,
    ...meta,
  };
  
  return JSON.stringify(logEntry);
});

// Console format with colors for development
const consoleFormat = printf(({ level, message, timestamp, stack, correlationId }) => {
  const corrId = correlationId ? `[${correlationId}]` : '';
  const timestamp_str = timestamp.replace('T', ' ').replace('Z', '');
  return `${timestamp_str} [${level}] ${corrId} ${stack || message}`;
});

// Custom formatters
const addCorrelationId = winston.format((info) => {
  info.correlationId = info.correlationId || generateCorrelationId();
  return info;
});

const addRequestContext = winston.format((info, opts) => {
  if (opts.req) {
    info.requestId = opts.req.headers['x-request-id'];
    info.userId = opts.req.user?.id;
    info.ip = opts.req.ip;
    info.userAgent = opts.req.headers['user-agent'];
    info.method = opts.req.method;
    info.url = opts.req.url;
  }
  return info;
});

const addResponseContext = winston.format((info, opts) => {
  if (opts.res) {
    info.statusCode = opts.res.statusCode;
    info.responseTime = opts.res.locals?.responseTime;
  }
  return info;
});

// Performance monitoring utilities
class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, { count: number; totalTime: number; avgTime: number; minTime: number; maxTime: number }> = new Map();

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(label: string): () => void {
    const start = performance.now();
    return () => {
      const duration = performance.now() - start;
      this.recordMetric(label, duration);
    };
  }

  recordMetric(label: string, duration: number): void {
    const existing = this.metrics.get(label) || {
      count: 0,
      totalTime: 0,
      avgTime: 0,
      minTime: Infinity,
      maxTime: 0,
    };

    existing.count++;
    existing.totalTime += duration;
    existing.avgTime = existing.totalTime / existing.count;
    existing.minTime = Math.min(existing.minTime, duration);
    existing.maxTime = Math.max(existing.maxTime, duration);

    this.metrics.set(label, existing);
  }

  getMetrics(): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [label, metrics] of this.metrics) {
      result[label] = metrics;
    }
    return result;
  }

  reset(): void {
    this.metrics.clear();
  }
}

const performanceMonitor = PerformanceMonitor.getInstance();

// Create enhanced logger instance
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp(),
    errors({ stack: true }),
    addCorrelationId(),
    label({
      label: 'fazner-ai-platform'
    }),
    json()
  ),
  defaultMeta: {
    service: 'fazner-ai-platform',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    hostname: process.env.HOSTNAME || 'unknown',
  },
  transports: [
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 52428800, // 50MB
      maxFiles: 10,
      tailable: true,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 52428800, // 50MB
      maxFiles: 10,
      tailable: true,
    }),

    // Separate file for audit logs
    new winston.transports.File({
      filename: 'logs/audit.log',
      level: 'info',
      maxsize: 104857600, // 100MB
      maxFiles: 5,
      tailable: true,
    }),

    // Performance metrics file
    new winston.transports.File({
      filename: 'logs/performance.log',
      level: 'info',
      maxsize: 52428800, // 50MB
      maxFiles: 5,
      tailable: true,
      format: combine(
        timestamp(),
        json()
      )
    }),
  ],
});

// Add console transport for development
if (process.env.NODE_ENV !== 'development') {
  logger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      consoleFormat
    )
  }));
}

// Add structured console for production
if (process.env.NODE_ENV === 'production') {
  logger.add(new winston.transports.Console({
    format: combine(
      timestamp(),
      json()
    )
  }));
}

// Enhanced request logging with performance tracking
export const logRequest = (req: Request, res: Response, responseTime: number, extra: any = {}) => {
  const correlationId = req.headers['x-request-id'] as string || generateCorrelationId();
  
  const requestData = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
    contentLength: res.get('content-length'),
    userId: req.user?.id,
    correlationId,
    ...extra,
  };

  // Log to combined log
  logger.info('HTTP Request', requestData);

  // Log to audit log for security-sensitive operations
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    logger.info('API Request', {
      ...requestData,
      timestamp: new Date().toISOString(),
      auditType: 'api_access',
    }, { req, res });
  }

  // Log slow requests
  if (responseTime > 1000) {
    logger.warn('Slow Request Detected', {
      ...requestData,
      threshold: '1000ms',
    });
  }

  // Record performance metric
  performanceMonitor.recordMetric(`http_${req.method.toLowerCase()}`, responseTime);
};

// Enhanced error logging with context
export const logError = (error: Error, context: any = {}, req?: Request) => {
  const correlationId = req?.headers['x-request-id'] as string || generateCorrelationId();
  
  const errorData = {
    message: error.message,
    stack: error.stack,
    name: error.name,
    context,
    correlationId,
    timestamp: new Date().toISOString(),
    service: 'fazner-ai-platform',
    environment: process.env.NODE_ENV,
  };

  if (req) {
    errorData['requestId'] = req.headers['x-request-id'];
    errorData['userId'] = req.user?.id;
    errorData['ip'] = req.ip;
    errorData['method'] = req.method;
    errorData['url'] = req.url;
  }

  logger.error('Application Error', errorData);

  // Log critical errors to separate file
  if (error.message.includes('critical') || error.message.includes('security')) {
    logger.error('Critical Error', errorData);
  }
};

// AI request logging with cost tracking
export const logAIRequest = (
  userId: string, 
  model: string, 
  prompt: string, 
  tokensUsed?: number, 
  cost?: number,
  req?: Request
) => {
  const correlationId = req?.headers['x-request-id'] as string || generateCorrelationId();
  
  const aiData = {
    userId,
    model,
    promptLength: prompt.length,
    tokensUsed,
    cost,
    correlationId,
    timestamp: new Date().toISOString(),
    auditType: 'ai_request',
  };

  logger.info('AI Request', aiData, { req });

  // Record performance metric
  if (tokensUsed) {
    performanceMonitor.recordMetric(`ai_tokens_${model.replace('/', '_')}`, tokensUsed);
  }
};

// Enhanced user action logging
export const logUserAction = (userId: string, action: string, details: any = {}, req?: Request) => {
  const correlationId = req?.headers['x-request-id'] as string || generateCorrelationId();
  
  const actionData = {
    userId,
    action,
    details,
    correlationId,
    timestamp: new Date().toISOString(),
    auditType: 'user_action',
  };

  logger.info('User Action', actionData, { req });
};

// Agent task logging
export const logAgentTask = (
  agentId: string, 
  taskId: string, 
  taskType: string, 
  status: string, 
  duration?: number,
  req?: Request
) => {
  const correlationId = req?.headers['x-request-id'] as string || generateCorrelationId();
  
  const taskData = {
    agentId,
    taskId,
    taskType,
    status,
    duration,
    correlationId,
    timestamp: new Date().toISOString(),
    auditType: 'agent_task',
  };

  logger.info('Agent Task', taskData, { req });

  // Record performance metric
  if (duration) {
    performanceMonitor.recordMetric(`agent_task_${taskType}`, duration);
  }
};

// Security event logging
export const logSecurity = (event: string, details: any, req?: Request) => {
  const correlationId = req?.headers['x-request-id'] as string || generateCorrelationId();
  
  const securityData = {
    event,
    details,
    correlationId,
    timestamp: new Date().toISOString(),
    auditType: 'security',
    severity: details.severity || 'medium',
  };

  // Security events are always logged as warnings or errors
  const level = details.severity === 'high' ? 'error' : 'warn';
  logger[level]('Security Event', securityData, { req });
};

// Performance metric logging
export const logPerformance = (metric: string, value: number, unit: string = 'ms', req?: Request) => {
  const correlationId = req?.headers['x-request-id'] as string || generateCorrelationId();
  
  const perfData = {
    metric,
    value,
    unit,
    correlationId,
    timestamp: new Date().toISOString(),
  };

  logger.info('Performance Metric', perfData, { req });

  // Record in performance monitor
  performanceMonitor.recordMetric(metric, value);
};

// Database operation logging
export const logDatabaseOperation = (
  operation: string,
  table: string,
  duration: number,
  success: boolean,
  recordCount?: number,
  req?: Request
) => {
  const correlationId = req?.headers['x-request-id'] as string || generateCorrelationId();
  
  const dbData = {
    operation,
    table,
    duration: `${duration}ms`,
    success,
    recordCount,
    correlationId,
    timestamp: new Date().toISOString(),
    auditType: 'database_operation',
  };

  const level = success ? 'info' : 'error';
  logger[level]('Database Operation', dbData, { req });

  // Record performance metric
  performanceMonitor.recordMetric(`db_${operation.toLowerCase()}`, duration);
};

// Cache operation logging
export const logCacheOperation = (
  operation: string,
  key: string,
  hit: boolean,
  duration: number,
  req?: Request
) => {
  const correlationId = req?.headers['x-request-id'] as string || generateCorrelationId();
  
  const cacheData = {
    operation,
    key,
    hit,
    duration: `${duration}ms`,
    correlationId,
    timestamp: new Date().toISOString(),
    auditType: 'cache_operation',
  };

  logger.debug('Cache Operation', cacheData, { req });

  // Record performance metric
  performanceMonitor.recordMetric(`cache_${operation.toLowerCase()}`, duration);
};

// Authentication logging
export const logAuth = (
  event: string,
  userId?: string,
  success: boolean,
  details: any = {},
  req?: Request
) => {
  const correlationId = req?.headers['x-request-id'] as string || generateCorrelationId();
  
  const authData = {
    event,
    userId,
    success,
    details,
    correlationId,
    timestamp: new Date().toISOString(),
    auditType: 'authentication',
    severity: success ? 'info' : 'warning',
  };

  const level = success ? 'info' : 'warn';
  logger[level]('Authentication Event', authData, { req });
};

// System health logging
export const logHealthCheck = (
  component: string,
  status: 'healthy' | 'unhealthy',
  responseTime: number,
  details: any = {},
  req?: Request
) => {
  const correlationId = req?.headers['x-request-id'] as string || generateCorrelationId();
  
  const healthData = {
    component,
    status,
    responseTime: `${responseTime}ms`,
    details,
    correlationId,
    timestamp: new Date().toISOString(),
    auditType: 'health_check',
  };

  const level = status === 'healthy' ? 'info' : 'warn';
  logger[level]('Health Check', healthData, { req });

  // Record performance metric
  performanceMonitor.recordMetric(`health_${component.toLowerCase()}`, responseTime);
};

// Business logic logging
export const logBusinessEvent = (
  event: string,
  userId?: string,
  data: any = {},
  req?: Request
) => {
  const correlationId = req?.headers['x-request-id'] as string || generateCorrelationId();
  
  const businessData = {
    event,
    userId,
    data,
    correlationId,
    timestamp: new Date().toISOString(),
    auditType: 'business_event',
  };

  logger.info('Business Event', businessData, { req });
};

// Export performance monitoring utilities
export { performanceMonitor };

// Enhanced logger instance with additional methods
export const loggerInstance = {
  ...logger,
  
  // Performance monitoring
  startTimer: (label: string) => performanceMonitor.startTimer(label),
  getMetrics: () => performanceMonitor.getMetrics(),
  
  // Structured logging helpers
  child: (meta: any) => {
    return logger.child(meta);
  },
  
  // Contextual logging
  withContext: (context: any) => {
    return logger.child({ context });
  },
  
  // Rate limiting log
  rateLimited: (endpoint: string, userId: string, req: Request) => {
    logSecurity('rate_limit_exceeded', {
      endpoint,
      userId,
      limit: 'exceeded',
    }, req);
  },
  
  // Suspicious activity log
  suspiciousActivity: (activity: string, details: any, req: Request) => {
    logSecurity('suspicious_activity', {
      activity,
      details,
      severity: 'high',
    }, req);
  },
  
  // Compliance log
  compliance: (event: string, data: any, req: Request) => {
    logger.info('Compliance Event', {
      event,
      data,
      timestamp: new Date().toISOString(),
      auditType: 'compliance',
      correlationId: req.headers['x-request-id'],
    }, { req });
  },
};

// Cleanup function for graceful shutdown
export const cleanupLogger = () => {
  // Log final performance metrics
  const metrics = performanceMonitor.getMetrics();
  if (Object.keys(metrics).length > 0) {
    logger.info('Final Performance Metrics', {
      metrics,
      timestamp: new Date().toISOString(),
    });
  }
};

// Graceful shutdown handler
process.on('SIGTERM', cleanupLogger);
process.on('SIGINT', cleanupLogger);

export { loggerInstance as logger };
export default loggerInstance;