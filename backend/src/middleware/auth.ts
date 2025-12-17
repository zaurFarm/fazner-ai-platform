import { Request, Response, NextFunction } from 'express';

export const auth = (req: Request, res: Response, next: NextFunction) => {
  // TODO: Implement authentication logic
  // For now, just pass through
  next();
};