import dotenv from 'dotenv';

dotenv.config();

// Clean simple database config for Railway
export const databaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://localhost:5432/fazner_ai_platform',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};

// Clean simple logger for Railway  
export const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || ''),
};

export default databaseConfig;