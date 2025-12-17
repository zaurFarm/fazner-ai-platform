# Fazner AI Platform - Minimal Backend

## 🚀 Railway Deployment Ready

This is a **minimal, Railway-optimized backend** for the Fazner AI Platform.

## ✅ What's Included

- **Single file server**: `src/server.ts` (116 lines)
- **No external imports**: Everything embedded
- **No complex dependencies**: Only essential packages
- **TypeScript ready**: Compiles without errors
- **AI endpoints**: `/api/ai/chat`, `/api/ai/providers`, `/api/ai/status`
- **Health check**: `/health`

## 🎯 Features

- Express server with security middleware
- CORS enabled for frontend
- Rate limiting and slow down protection
- Session management
- Error handling
- JSON logging

## 🛠️ Railway Deployment

1. **Connect GitHub repo**: `zaurFarm/fazner-ai-platform`
2. **Set build command**: `npm run build`
3. **Set start command**: `npm start`
4. **Environment variables**:
   - `PORT=5000`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://your-frontend.vercel.app`
   - `SESSION_SECRET=your-secret`

## 📦 Dependencies

Only essential packages for Railway:
- express
- cors
- helmet
- morgan
- dotenv
- compression
- express-rate-limit
- cookie-parser
- express-session
- express-slow-down

## ✅ No More TypeScript Errors!

- ✅ No logger.ts with 438 lines
- ✅ No complex redis/database configs
- ✅ No missing route files
- ✅ No middleware import errors
- ✅ Clean, minimal, Railway-ready code

**Railway should now build successfully!**