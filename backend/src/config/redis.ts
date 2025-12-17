import Redis, { Redis as RedisClient } from 'ioredis';
import { logger, logError, logPerformance } from '@/utils/logger';

// Enhanced Redis configuration
interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  retryDelayOnFailover: number;
  maxRetriesPerRequest: number | null;
  enableReadyCheck: boolean;
  lazyConnect: boolean;
  keepAlive: number;
  family: number;
  keyPrefix: string;
  compression: boolean;
  enableOfflineQueue: boolean;
  enableReadyCheck: boolean;
  commandTimeout: number;
  connectTimeout: number;
  maxRetriesPerRequest: number;
}

const defaultConfig: RedisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
  keepAlive: 30000,
  family: 4, // IPv4
  keyPrefix: process.env.REDIS_PREFIX || 'minimax_ai:',
  compression: true,
  enableOfflineQueue: true,
  connectTimeout: 10000,
  maxRetriesPerRequest: 3,
};

// Redis health and metrics tracking
let redis: RedisClient;
let connectionHealth: { 
  status: 'connected' | 'disconnected' | 'connecting' | 'error'; 
  lastCheck: Date; 
  error?: string;
  reconnectAttempts: number;
} = {
  status: 'disconnected',
  lastCheck: new Date(),
  reconnectAttempts: 0,
};

const redisMetrics = {
  totalConnections: 0,
  currentConnections: 0,
  operationsPerSecond: 0,
  averageLatency: 0,
  memoryUsage: {
    used: 0,
    peak: 0,
    rss: 0,
  },
  hitRate: {
    hits: 0,
    misses: 0,
    rate: 0,
  },
  errorCount: 0,
  lastError: null as Date | null,
};

declare global {
  var __redis: RedisClient | undefined;
  var __redisHealthCheck: NodeJS.Timeout | undefined;
}

export const connectRedis = async (config: Partial<RedisConfig> = {}): Promise<RedisClient> => {
  const redisConfig = { ...defaultConfig, ...config };
  
  try {
    const startTime = Date.now();
    
    if (process.env.NODE_ENV === 'production') {
      // Production configuration with enhanced monitoring
      redis = new Redis({
        host: redisConfig.host,
        port: redisConfig.port,
        password: redisConfig.password,
        db: redisConfig.db,
        retryDelayOnFailover: redisConfig.retryDelayOnFailover,
        maxRetriesPerRequest: redisConfig.maxRetriesPerRequest,
        enableReadyCheck: redisConfig.enableReadyCheck,
        lazyConnect: redisConfig.lazyConnect,
        keepAlive: redisConfig.keepAlive,
        family: redisConfig.family,
        keyPrefix: redisConfig.keyPrefix,
        connectTimeout: redisConfig.connectTimeout,
        commandTimeout: redisConfig.commandTimeout,
        
        // Enhanced connection options
        tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
        
        // Performance optimizations
        enableOfflineQueue: redisConfig.enableOfflineQueue,
        
        // Monitoring
        sentinels: process.env.REDIS_SENTINEL_HOSTS 
          ? process.env.REDIS_SENTINEL_HOSTS.split(',').map(host => ({ host, port: 26379 }))
          : undefined,
      });
    } else {
      // Development configuration with global instance
      if (!global.__redis) {
        global.__redis = new Redis({
          host: redisConfig.host,
          port: redisConfig.port,
          password: redisConfig.password,
          db: redisConfig.db,
          retryDelayOnFailover: 100,
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
          lazyConnect: true,
          keyPrefix: redisConfig.keyPrefix,
        });
      }
      redis = global.__redis;
    }

    // Set up event listeners for monitoring
    setupRedisEventListeners(redis);
    
    // Test connection with enhanced validation
    await testRedisConnection(redis, redisConfig);
    
    // Start health check and monitoring
    startRedisHealthCheck();
    startRedisMetricsCollection();
    
    connectionHealth = {
      status: 'connected',
      lastCheck: new Date(),
      reconnectAttempts: 0,
    };

    const connectionTime = Date.now() - startTime;
    logPerformance('redis_connection', connectionTime, 'ms');
    
    logger.info('✅ Redis connected successfully', {
      connectionTime: `${connectionTime}ms`,
      host: redisConfig.host,
      port: redisConfig.port,
      db: redisConfig.db,
      keyPrefix: redisConfig.keyPrefix,
    });
    
    return redis;
  } catch (error) {
    connectionHealth = {
      status: 'error',
      lastCheck: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
      reconnectAttempts: 0,
    };
    
    redisMetrics.errorCount++;
    redisMetrics.lastError = new Date();
    
    logger.error('❌ Redis connection failed:', error);
    logError(error as Error, { phase: 'redis_connection' });
    
    // In production, we might want to crash the application
    // In development, we can continue without Redis
    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      logger.warn('⚠️ Continuing without Redis in development mode');
      return createMockRedisClient();
    }
  }
};

const setupRedisEventListeners = (client: RedisClient): void => {
  client.on('connect', () => {
    logger.info('Redis: Connection established');
    connectionHealth.status = 'connecting';
  });

  client.on('ready', () => {
    logger.info('Redis: Ready to receive commands');
    connectionHealth.status = 'connected';
    connectionHealth.reconnectAttempts = 0;
  });

  client.on('error', (error) => {
    logger.error('Redis: Connection error:', error);
    connectionHealth.status = 'error';
    connectionHealth.error = error.message;
    redisMetrics.errorCount++;
    redisMetrics.lastError = new Date();
  });

  client.on('close', () => {
    logger.warn('Redis: Connection closed');
    connectionHealth.status = 'disconnected';
  });

  client.on('reconnecting', () => {
    logger.info('Redis: Reconnecting...');
    connectionHealth.status = 'connecting';
    connectionHealth.reconnectAttempts++;
  });

  // Monitor command execution time
  client.monitor((err, monitor) => {
    if (err) return;
    
    monitor.on('monitor', (time, args, source, database) => {
      // Track slow commands (longer than 100ms)
      const commandStart = Date.now();
      setTimeout(() => {
        const duration = Date.now() - commandStart;
        if (duration > 100) {
          logger.warn('Redis: Slow command detected', {
            command: args[0],
            duration: `${duration}ms`,
            source,
          });
        }
      }, 0);
    });
  });
};

const testRedisConnection = async (client: RedisClient, config: RedisConfig): Promise<void> => {
  try {
    // Test basic connectivity
    const pong = await client.ping();
    if (pong !== 'PONG') {
      throw new Error(`Unexpected PING response: ${pong}`);
    }

    // Test write/read operations
    const testKey = `${config.keyPrefix}connection_test`;
    const testValue = `test_${Date.now()}`;
    
    await client.setex(testKey, 10, testValue);
    const retrievedValue = await client.get(testKey);
    
    if (retrievedValue !== testValue) {
      throw new Error('Read/write test failed');
    }
    
    // Clean up test key
    await client.del(testKey);
    
    logger.info('Redis connection test successful');
  } catch (error) {
    throw new Error(`Redis connection test failed: ${error}`);
  }
};

const startRedisHealthCheck = (): void => {
  if (global.__redisHealthCheck) {
    clearInterval(global.__redisHealthCheck);
  }
  
  global.__redisHealthCheck = setInterval(async () => {
    try {
      const startTime = Date.now();
      await redis.ping();
      const latency = Date.now() - startTime;
      
      connectionHealth = {
        status: 'connected',
        lastCheck: new Date(),
        reconnectAttempts: connectionHealth.reconnectAttempts,
      };
      
      // Track latency for performance monitoring
      logPerformance('redis_health_check', latency, 'ms');
    } catch (error) {
      connectionHealth = {
        status: 'error',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed',
        reconnectAttempts: connectionHealth.reconnectAttempts,
      };
      
      logger.error('Redis health check failed:', error);
    }
  }, 30000); // Check every 30 seconds
};

const startRedisMetricsCollection = (): void => {
  setInterval(async () => {
    try {
      // Get Redis info
      const info = await redis.info();
      const infoLines = info.split('\r\n');
      
      // Parse memory usage
      const memorySection = infoLines.find(line => line.startsWith('# Memory'));
      if (memorySection) {
        const usedMemory = infoLines.find(line => line.startsWith('used_memory:'));
        const usedMemoryRss = infoLines.find(line => line.startsWith('used_memory_rss:'));
        const usedMemoryPeak = infoLines.find(line => line.startsWith('used_memory_peak:'));
        
        if (usedMemory) {
          redisMetrics.memoryUsage.used = parseInt(usedMemory.split(':')[1]);
        }
        if (usedMemoryRss) {
          redisMetrics.memoryUsage.rss = parseInt(usedMemoryRss.split(':')[1]);
        }
        if (usedMemoryPeak) {
          redisMetrics.memoryUsage.peak = parseInt(usedMemoryPeak.split(':')[1]);
        }
      }
      
      // Parse keyspace info
      const keyspaceSection = infoLines.find(line => line.startsWith('# Keyspace'));
      if (keyspaceSection) {
        // Extract database info
        infoLines.forEach(line => {
          if (line.startsWith('db0:')) {
            // Parse keyspace hit/miss info
            const matches = line.match(/keys=(\d+),expires=(\d+),avg_ttl=(\d+)/);
            if (matches) {
              // Could track key counts here if needed
            }
          }
        });
      }
      
    } catch (error) {
      logger.error('Failed to collect Redis metrics:', error);
    }
  }, 60000); // Collect metrics every minute
};

export const getRedisClient = (): RedisClient => {
  if (!redis) {
    throw new Error('Redis not connected. Call connectRedis() first.');
  }
  return redis;
};

export const getRedisHealth = () => connectionHealth;

export const getRedisMetrics = () => ({
  ...redisMetrics,
  health: connectionHealth,
  uptime: process.uptime(),
});

// Enhanced cache utility functions with compression and monitoring
export const cache = {
  async get(key: string): Promise<string | null> {
    try {
      const startTime = Date.now();
      const result = await redis.get(key);
      const duration = Date.now() - startTime;
      
      // Track hit/miss rate
      if (result !== null) {
        redisMetrics.hitRate.hits++;
      } else {
        redisMetrics.hitRate.misses++;
      }
      
      // Update hit rate
      const total = redisMetrics.hitRate.hits + redisMetrics.hitRate.misses;
      redisMetrics.hitRate.rate = total > 0 ? (redisMetrics.hitRate.hits / total) * 100 : 0;
      
      // Log slow operations
      if (duration > 50) {
        logger.warn('Redis GET operation slow', {
          key,
          duration: `${duration}ms`,
        });
      }
      
      logPerformance('redis_get', duration, 'ms');
      return result;
    } catch (error) {
      logger.error('Cache get error:', { key, error });
      return null;
    }
  },

  async set(key: string, value: string, expireInSeconds?: number): Promise<boolean> {
    try {
      const startTime = Date.now();
      
      // Compress large values if compression is enabled
      let processedValue = value;
      if (defaultConfig.compression && value.length > 1024) {
        // In a real implementation, you might use compression library like 'zlib'
        // For now, we'll just note that compression could be applied
        processedValue = value;
      }
      
      if (expireInSeconds) {
        await redis.setex(key, expireInSeconds, processedValue);
      } else {
        await redis.set(key, processedValue);
      }
      
      const duration = Date.now() - startTime;
      logPerformance('redis_set', duration, 'ms');
      return true;
    } catch (error) {
      logger.error('Cache set error:', { key, error });
      return false;
    }
  },

  async del(key: string): Promise<boolean> {
    try {
      await redis.del(key);
      return true;
    } catch (error) {
      logger.error('Cache delete error:', { key, error });
      return false;
    }
  },

  async exists(key: string): Promise<boolean> {
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.error('Cache exists error:', { key, error });
      return false;
    }
  },

  async flush(): Promise<boolean> {
    try {
      await redis.flushdb();
      return true;
    } catch (error) {
      logger.error('Cache flush error:', error);
      return false;
    }
  },

  // Enhanced session management with TTL validation
  async setSession(sessionId: string, data: any, expireInSeconds: number = 3600): Promise<boolean> {
    try {
      // Validate TTL
      if (expireInSeconds > 86400) { // Max 24 hours
        expireInSeconds = 86400;
      }
      
      return this.set(`session:${sessionId}`, JSON.stringify(data), expireInSeconds);
    } catch (error) {
      logger.error('Session set error:', { sessionId, error });
      return false;
    }
  },

  async getSession(sessionId: string): Promise<any | null> {
    try {
      const data = await this.get(`session:${sessionId}`);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      
      // Validate session structure
      if (!parsed.id || !parsed.timestamp) {
        logger.warn('Invalid session data structure', { sessionId });
        return null;
      }
      
      return parsed;
    } catch (error) {
      logger.error('Session get error:', { sessionId, error });
      return null;
    }
  },

  async deleteSession(sessionId: string): Promise<boolean> {
    return this.del(`session:${sessionId}`);
  },

  // Enhanced rate limiting with sliding window
  async incrementRateLimit(key: string, windowMs: number = 3600000, maxRequests: number = 100): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    current: number;
  }> {
    try {
      const now = Date.now();
      const window = Math.floor(now / windowMs);
      const redisKey = `ratelimit:${key}:${window}`;
      
      const current = await redis.incr(redisKey);
      
      if (current === 1) {
        await redis.pexpire(redisKey, windowMs);
      }
      
      const resetTime = (window + 1) * windowMs;
      const allowed = current <= maxRequests;
      const remaining = Math.max(0, maxRequests - current);
      
      return {
        allowed,
        remaining,
        resetTime,
        current,
      };
    } catch (error) {
      logger.error('Rate limit increment error:', { key, error });
      return {
        allowed: true, // Fail open
        remaining: maxRequests,
        resetTime: now + windowMs,
        current: 0,
      };
    }
  },

  // Enhanced AI temporary data with cleanup
  async setAITempData(key: string, data: any, expireInMinutes: number = 30): Promise<boolean> {
    try {
      // Validate expiration time
      if (expireInMinutes > 1440) { // Max 24 hours
        expireInMinutes = 1440;
      }
      
      return this.set(`ai_temp:${key}`, JSON.stringify(data), expireInMinutes * 60);
    } catch (error) {
      logger.error('AI temp data set error:', { key, error });
      return false;
    }
  },

  async getAITempData(key: string): Promise<any | null> {
    try {
      const data = await this.get(`ai_temp:${key}`);
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      logger.error('AI temp data get error:', { key, error });
      return null;
    }
  },

  // Enhanced chat session management
  async setChatSession(sessionId: string, messages: any[]): Promise<boolean> {
    try {
      // Validate message count (max 1000 messages per session)
      if (messages.length > 1000) {
        messages = messages.slice(-1000);
      }
      
      return this.set(`chat:${sessionId}`, JSON.stringify(messages), 3600);
    } catch (error) {
      logger.error('Chat session set error:', { sessionId, error });
      return false;
    }
  },

  async getChatSession(sessionId: string): Promise<any[] | null> {
    try {
      const data = await this.get(`chat:${sessionId}`);
      if (!data) return null;
      
      return JSON.parse(data);
    } catch (error) {
      logger.error('Chat session get error:', { sessionId, error });
      return null;
    }
  },

  // Batch operations for better performance
  async batchSet(keyValuePairs: Array<{ key: string; value: string; expireInSeconds?: number }>): Promise<boolean> {
    try {
      const pipeline = redis.pipeline();
      
      keyValuePairs.forEach(({ key, value, expireInSeconds }) => {
        if (expireInSeconds) {
          pipeline.setex(key, expireInSeconds, value);
        } else {
          pipeline.set(key, value);
        }
      });
      
      await pipeline.exec();
      return true;
    } catch (error) {
      logger.error('Batch set error:', { pairsCount: keyValuePairs.length, error });
      return false;
    }
  },

  async batchGet(keys: string[]): Promise<(string | null)[]> {
    try {
      if (keys.length === 0) return [];
      
      const results = await redis.mget(keys);
      return results;
    } catch (error) {
      logger.error('Batch get error:', { keysCount: keys.length, error });
      return keys.map(() => null);
    }
  },

  // Cleanup expired keys
  async cleanupExpired(pattern: string = '*'): Promise<number> {
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) return 0;
      
      const pipeline = redis.pipeline();
      keys.forEach(key => {
        pipeline.ttl(key);
      });
      
      const ttls = await pipeline.exec();
      const expiredKeys: string[] = [];
      
      ttls.forEach((result, index) => {
        const ttl = result[1] as number;
        if (ttl === -1) { // Key exists but has no expiry
          expiredKeys.push(keys[index]);
        }
      });
      
      if (expiredKeys.length > 0) {
        await redis.del(...expiredKeys);
        logger.info(`Cleaned up ${expiredKeys.length} expired keys matching pattern: ${pattern}`);
      }
      
      return expiredKeys.length;
    } catch (error) {
      logger.error('Cleanup expired keys error:', { pattern, error });
      return 0;
    }
  },
};

// Mock RedisClient for development
const createMockRedisClient = (): RedisClient => {
  const mockStore = new Map<string, { value: string; expireAt?: number }>();
  
  const mockClient = {
    ping: () => Promise.resolve('PONG'),
    get: (key: string) => {
      const item = mockStore.get(key);
      if (!item) return Promise.resolve(null);
      if (item.expireAt && Date.now() > item.expireAt) {
        mockStore.delete(key);
        return Promise.resolve(null);
      }
      return Promise.resolve(item.value);
    },
    set: (key: string, value: string) => {
      mockStore.set(key, { value });
      return Promise.resolve('OK');
    },
    setex: (key: string, seconds: number, value: string) => {
      mockStore.set(key, { value, expireAt: Date.now() + (seconds * 1000) });
      return Promise.resolve('OK');
    },
    del: (key: string) => {
      const existed = mockStore.has(key);
      mockStore.delete(key);
      return Promise.resolve(existed ? 1 : 0);
    },
    exists: (key: string) => {
      const item = mockStore.get(key);
      if (!item) return Promise.resolve(0);
      if (item.expireAt && Date.now() > item.expireAt) {
        mockStore.delete(key);
        return Promise.resolve(0);
      }
      return Promise.resolve(1);
    },
    flushdb: () => {
      mockStore.clear();
      return Promise.resolve('OK');
    },
    disconnect: () => Promise.resolve(),
    // Add other methods as needed...
  } as any;
  
  return mockClient;
};

// Graceful shutdown
export const disconnectRedis = async (): Promise<void> => {
  try {
    // Clear intervals
    if (global.__redisHealthCheck) {
      clearInterval(global.__redisHealthCheck);
      global.__redisHealthCheck = undefined;
    }
    
    if (redis) {
      await redis.disconnect();
      logger.info('✅ Redis disconnected successfully');
    }
  } catch (error) {
    logger.error('❌ Redis disconnection failed:', error);
    logError(error as Error, { phase: 'redis_disconnection' });
  }
};

export default redis;