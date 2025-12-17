import dotenv from 'dotenv';

dotenv.config();

// Simple Redis configuration for Railway deployment
export const redisConfig = {
  url: process.env.REDIS_URL || 'redis://localhost:6379',
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  lazyConnect: true,
};

// Simple logger function (fallback)
export const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || ''),
};

export default redisConfig;