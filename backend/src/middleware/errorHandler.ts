import { Request, Response, NextFunction } from 'express';
import { logger } from '@/utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  logger.error('Express error', { error: err?.message, stack: err?.stack });
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      status: err.status || 500
    }
  });
};