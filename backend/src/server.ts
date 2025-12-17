import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Basic middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple AI routes
app.post('/api/ai/chat', (req, res) => {
  const { message, provider = 'openai' } = req.body;
  console.log('AI chat request', { provider, messageLength: message?.length });
  
  res.json({
    success: true,
    response: `Hello! This is a simple response from ${provider}. Your message: "${message}"`,
    provider,
    timestamp: new Date().toISOString()
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

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Server error', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`, { 
    environment: process.env.NODE_ENV || 'development'
  });
});

export default app;