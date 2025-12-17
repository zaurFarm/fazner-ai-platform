import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import dotenv from 'dotenv';
import expressSlowDown from 'express-slow-down';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Simple logger
const logger = {
  info: (message: string, meta?: any) => console.log(`[INFO] ${message}`, meta || ''),
  error: (message: string, meta?: any) => console.error(`[ERROR] ${message}`, meta || ''),
  warn: (message: string, meta?: any) => console.warn(`[WARN] ${message}`, meta || ''),
  debug: (message: string, meta?: any) => console.debug(`[DEBUG] ${message}`, meta || ''),
};

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

const speedLimiter = expressSlowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 100,
  delayMs: 0
});
app.use(speedLimiter);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('combined'));
app.use(compression());
app.use(cookieParser());
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Routes
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

app.get('/api/ai/providers', (req, res) => {
  res.json({
    success: true,
    providers: ['openai', 'anthropic', 'openrouter', 'groq', 'cohere']
  });
});

app.get('/api/ai/status', (req, res) => {
  res.json({
    success: true,
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

app.post('/api/ai/chat', (req, res) => {
  const { message, provider = 'openai' } = req.body;
  logger.info('AI chat request', { provider, messageLength: message?.length });
  
  res.json({
    success: true,
    response: `Hello! This is a response from ${provider}. Your message: "${message}"`,
    provider,
    timestamp: new Date().toISOString()
  });
});

// Error handlers
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Server error', { error: err.message });
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`, { 
    environment: process.env.NODE_ENV || 'development'
  });
});

export default app;