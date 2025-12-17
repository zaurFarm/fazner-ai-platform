import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';

// Import routes
import authRoutes from '@/routes/auth';
import userRoutes from '@/routes/user';
import projectRoutes from '@/routes/projects';
import agentRoutes from '@/routes/agents';
import chatRoutes from '@/routes/chat';
import fileRoutes from '@/routes/files';
import analyticsRoutes from '@/routes/analytics';
import systemRoutes from '@/routes/system';
import aiMultiRoutes from '@/routes/ai-multi';

// Import middleware
import { errorHandler } from '@/middleware/errorHandler';
import { notFound } from '@/middleware/notFound';
import { authMiddleware } from '@/middleware/auth';
import { logger } from '@/utils/logger';
import { connectDatabase } from '@/config/database';
import { connectRedis } from '@/config/redis';

// Load environment variables
dotenv.config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Trust proxy for rate limiting behind reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "https://openrouter.ai", "wss:"],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: NODE_ENV === 'production' ? 100 : 1000, // limit each IP
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: '15 minutes',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Speed limiting (more restrictive)
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per windowMs without delay
  delayMs: 500, // add 500ms delay per request after delayAfter
});

// Apply rate limiting and speed limiting
app.use(limiter);
app.use(speedLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'fazner-ai-platform-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
  },
}));

// Compression
app.use(compression());

// Logging
if (NODE_ENV !== 'test') {
  app.use(morgan('combined', {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  }));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/user', authMiddleware, userRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/agents', authMiddleware, agentRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/files', authMiddleware, fileRoutes);
app.use('/api/analytics', authMiddleware, analyticsRoutes);
app.use('/api/system', authMiddleware, systemRoutes);

// AI Multi-Provider routes (with fallback and optimization)
app.use('/api/ai', aiMultiRoutes);

// WebSocket events
io.use((socket, next) => {
  // Authentication for WebSocket connections
  const token = socket.handshake.auth.token;
  if (token) {
    // Verify token here
    next();
  } else {
    next(new Error('Authentication error'));
  }
});

io.on('connection', (socket) => {
  logger.info(`User connected: ${socket.id}`);

  // Join user to personal room
  socket.on('join', (userId: string) => {
    socket.join(`user:${userId}`);
    logger.info(`User ${userId} joined room`);
  });

  // Join project room
  socket.on('join-project', (projectId: string) => {
    socket.join(`project:${projectId}`);
    logger.info(`User joined project room: ${projectId}`);
  });

  // Join chat session
  socket.on('join-chat', (sessionId: string) => {
    socket.join(`chat:${sessionId}`);
    logger.info(`User joined chat room: ${sessionId}`);
  });

  // Handle chat messages
  socket.on('chat-message', (data) => {
    // Broadcast to all users in the chat room
    socket.to(`chat:${data.sessionId}`).emit('new-message', data);
  });

  // Handle AI task updates
  socket.on('task-update', (data) => {
    // Broadcast task updates to relevant users
    if (data.projectId) {
      socket.to(`project:${data.projectId}`).emit('task-updated', data);
    }
  });

  // Handle agent status updates
  socket.on('agent-status', (data) => {
    // Broadcast agent status changes
    socket.broadcast.emit('agent-status-changed', data);
  });

  socket.on('disconnect', () => {
    logger.info(`User disconnected: ${socket.id}`);
  });
});

// Make io accessible to routes
app.set('io', io);

// Error handling middleware (must be last)
app.use(notFound);
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDatabase();
    logger.info('Database connected successfully');

    // Connect to Redis
    await connectRedis();
    logger.info('Redis connected successfully');

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`🚀 Server running on port ${PORT} in ${NODE_ENV} mode`);
      logger.info(`📡 WebSocket server running`);
      logger.info(`🌐 Health check available at http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Process terminated');
    process.exit(0);
  });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  logger.error('Unhandled Promise Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1);
});

// Start the server
startServer();

export default app;