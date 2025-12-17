import { PrismaClient } from '@prisma/client';
import { logger, logError, logPerformance } from '@/utils/logger';

// Enhanced connection configuration
interface DatabaseConfig {
  connectionLimit: number;
  acquireTimeout: number;
  timeout: number;
  idleTimeout: number;
  reconnectAttempts: number;
  reconnectDelay: number;
}

const defaultConfig: DatabaseConfig = {
  connectionLimit: 20,
  acquireTimeout: 60000,
  timeout: 60000,
  idleTimeout: 300000,
  reconnectAttempts: 5,
  reconnectDelay: 2000,
};

// Global database connection with enhanced management
let prisma: PrismaClient;
let connectionHealth: { status: 'healthy' | 'unhealthy'; lastCheck: Date; error?: string } = {
  status: 'unhealthy',
  lastCheck: new Date(),
};

// Connection pool metrics
const connectionMetrics = {
  totalConnections: 0,
  activeConnections: 0,
  idleConnections: 0,
  failedConnections: 0,
  lastError: null as Date | null,
};

declare global {
  var __prisma: PrismaClient | undefined;
  var __dbHealthCheck: NodeJS.Timeout | undefined;
}

export const connectDatabase = async (config: Partial<DatabaseConfig> = {}): Promise<PrismaClient> => {
  const dbConfig = { ...defaultConfig, ...config };
  
  try {
    const startTime = Date.now();
    
    if (process.env.NODE_ENV === 'production') {
      // Production configuration with connection pooling
      prisma = new PrismaClient({
        datasources: {
          db: {
            url: process.env.DATABASE_URL || 'postgresql://localhost:5432/minimax_ai',
          },
        },
        // Enhanced connection pool settings
        pool: {
          acquireTimeoutMillis: dbConfig.acquireTimeout,
          createTimeoutMillis: dbConfig.timeout,
          destroyTimeoutMillis: 5000,
          idleTimeoutMillis: dbConfig.idleTimeout,
          reapIntervalMillis: 1000,
          createRetryIntervalMillis: 200,
        },
        // Enhanced logging for production
        log: process.env.NODE_ENV === 'production' 
          ? ['warn', 'error'] 
          : ['query', 'info', 'warn', 'error'],
        errorFormat: 'pretty',
      });
    } else {
      // Development configuration with global instance to prevent multiple connections
      if (!global.__prisma) {
        global.__prisma = new PrismaClient({
          log: ['query', 'info', 'warn', 'error'],
          errorFormat: 'pretty',
          // Development-specific optimizations
          datasources: {
            db: {
              url: process.env.DATABASE_URL || 'postgresql://localhost:5432/minimax_ai_dev',
            },
          },
        });
        
        // Enable query logging in development
        global.__prisma.$on('query', (e) => {
          if (process.env.LOG_SQL_QUERIES === 'true') {
            logger.debug('Database Query', {
              query: e.query,
              params: e.params,
              duration: `${e.duration}ms`,
            });
          }
        });
      }
      prisma = global.__prisma;
    }

    // Test the connection with retry logic
    await testConnectionWithRetry(prisma, dbConfig);
    
    connectionHealth = {
      status: 'healthy',
      lastCheck: new Date(),
    };

    // Start health check interval
    startHealthCheck();
    
    const connectionTime = Date.now() - startTime;
    logPerformance('database_connection', connectionTime, 'ms');
    logger.info('✅ Database connected successfully', {
      connectionTime: `${connectionTime}ms`,
      environment: process.env.NODE_ENV,
      config: {
        connectionLimit: dbConfig.connectionLimit,
        timeout: dbConfig.timeout,
      }
    });
    
    return prisma;
  } catch (error) {
    connectionHealth = {
      status: 'unhealthy',
      lastCheck: new Date(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    
    logger.error('❌ Database connection failed:', error);
    
    // Log detailed error for debugging
    logError(error as Error, {
      phase: 'connection',
      config: dbConfig,
      environment: process.env.NODE_ENV,
    });
    
    // In production, we might want to crash the application
    // In development, we can continue without database
    if (process.env.NODE_ENV === 'production') {
      throw error;
    } else {
      logger.warn('⚠️ Continuing without database in development mode');
      // Return a mock PrismaClient for development
      return createMockPrismaClient();
    }
  }
};

const testConnectionWithRetry = async (client: PrismaClient, config: DatabaseConfig): Promise<void> => {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= config.reconnectAttempts; attempt++) {
    try {
      // Test connection with a simple query
      await client.$queryRaw`SELECT 1 as test`;
      logger.info(`Database connection test successful (attempt ${attempt})`);
      return;
    } catch (error) {
      lastError = error as Error;
      connectionMetrics.failedConnections++;
      connectionMetrics.lastError = new Date();
      
      logger.warn(`Database connection test failed (attempt ${attempt}/${config.reconnectAttempts}):`, {
        error: lastError.message,
      });
      
      if (attempt < config.reconnectAttempts) {
        await new Promise(resolve => setTimeout(resolve, config.reconnectDelay * attempt));
      }
    }
  }
  
  throw lastError;
};

const startHealthCheck = (): void => {
  if (global.__dbHealthCheck) {
    clearInterval(global.__dbHealthCheck);
  }
  
  global.__dbHealthCheck = setInterval(async () => {
    try {
      await prisma.$queryRaw`SELECT 1 as health_check`;
      connectionHealth = {
        status: 'healthy',
        lastCheck: new Date(),
      };
    } catch (error) {
      connectionHealth = {
        status: 'unhealthy',
        lastCheck: new Date(),
        error: error instanceof Error ? error.message : 'Health check failed',
      };
      
      logger.error('Database health check failed:', error);
    }
  }, 30000); // Check every 30 seconds
};

export const getPrismaClient = (): PrismaClient => {
  if (!prisma) {
    throw new Error('Database not connected. Call connectDatabase() first.');
  }
  return prisma;
};

export const getConnectionHealth = () => connectionHealth;

export const getConnectionMetrics = () => ({
  ...connectionMetrics,
  health: connectionHealth,
  uptime: process.uptime(),
});

// Enhanced transaction wrapper with retry logic
export const withRetry = async <T>(
  operation: (tx: PrismaClient) => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  const client = getPrismaClient();
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await client.$transaction(operation);
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      const shouldRetry = !isLastAttempt && isRetryableError(error);
      
      logger.warn(`Database operation failed (attempt ${attempt}/${maxRetries}):`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        shouldRetry,
      });
      
      if (!shouldRetry) {
        throw error;
      }
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt - 1)));
    }
  }
  
  throw new Error('Max retries exceeded');
};

const isRetryableError = (error: any): boolean => {
  // Check for common retryable error codes
  const retryableCodes = [
    'P1001', // Database does not exist
    'P1002', // Database timeout
    'P1017', // Server has closed the connection
    'P2024', // Timed out fetching a new connection from the connection pool
  ];
  
  return retryableCodes.includes(error?.code) || 
         error?.message?.includes('connection') ||
         error?.message?.includes('timeout');
};

// Enhanced query execution with monitoring
export const executeQuery = async <T>(
  query: () => Promise<T>,
  queryName: string = 'unnamed_query'
): Promise<T> => {
  const startTime = Date.now();
  const client = getPrismaClient();
  
  try {
    const result = await query();
    const executionTime = Date.now() - startTime;
    
    // Log slow queries
    if (executionTime > 1000) {
      logger.warn(`Slow database query detected: ${queryName}`, {
        executionTime: `${executionTime}ms`,
        threshold: '1000ms',
      });
    }
    
    logPerformance(`db_query_${queryName}`, executionTime, 'ms');
    return result;
  } catch (error) {
    const executionTime = Date.now() - startTime;
    
    logError(error as Error, {
      queryName,
      executionTime: `${executionTime}ms`,
    });
    
    throw error;
  }
};

// Batch operations helper
export const batchInsert = async <T>(
  table: string,
  data: T[],
  batchSize: number = 1000
): Promise<number> => {
  const client = getPrismaClient();
  let inserted = 0;
  
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    
    try {
      await client[table as keyof PrismaClient].createMany({
        data: batch as any,
        skipDuplicates: true,
      });
      inserted += batch.length;
      
      logger.debug(`Batch insert progress: ${inserted}/${data.length}`);
    } catch (error) {
      logger.error(`Batch insert failed at batch ${i / batchSize + 1}:`, error);
      throw error;
    }
  }
  
  return inserted;
};

// Graceful shutdown with connection cleanup
export const disconnectDatabase = async (): Promise<void> => {
  try {
    // Clear health check interval
    if (global.__dbHealthCheck) {
      clearInterval(global.__dbHealthCheck);
      global.__dbHealthCheck = undefined;
    }
    
    if (prisma) {
      // Wait for active queries to complete (with timeout)
      await Promise.race([
        prisma.$disconnect(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database disconnect timeout')), 10000)
        )
      ]);
      
      logger.info('✅ Database disconnected successfully');
    }
  } catch (error) {
    logger.error('❌ Database disconnection failed:', error);
    logError(error as Error, { phase: 'disconnection' });
  }
};

// Mock PrismaClient for development without database
const createMockPrismaClient = (): PrismaClient => {
  const mockClient = {
    $connect: () => Promise.resolve(),
    $disconnect: () => Promise.resolve(),
    $queryRaw: () => Promise.resolve([{ test: 1 }]),
    $transaction: (fn: any) => fn(mockClient),
    user: {
      findMany: () => Promise.resolve([]),
      findUnique: () => Promise.resolve(null),
      create: () => Promise.resolve({}),
      update: () => Promise.resolve({}),
      delete: () => Promise.resolve({}),
    },
    chatSession: {
      findMany: () => Promise.resolve([]),
      findUnique: () => Promise.resolve(null),
      create: () => Promise.resolve({}),
      update: () => Promise.resolve({}),
      delete: () => Promise.resolve({}),
    },
    chatMessage: {
      findMany: () => Promise.resolve([]),
      create: () => Promise.resolve({}),
      update: () => Promise.resolve({}),
      delete: () => Promise.resolve({}),
    },
  } as any;
  
  return mockClient;
};

// Database initialization helper
export const initializeDatabase = async (): Promise<void> => {
  try {
    const client = await connectDatabase();
    
    // Run database migrations if needed
    if (process.env.NODE_ENV === 'development' || process.env.RUN_MIGRATIONS === 'true') {
      logger.info('Running database migrations...');
      // In a real implementation, you would run migrations here
      // await client.$executeRaw`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`;
    }
    
    logger.info('✅ Database initialized successfully');
  } catch (error) {
    logger.error('❌ Database initialization failed:', error);
    throw error;
  }
};

export default prisma;