import { Router } from 'express';
import { logger } from '@/utils/logger';

const router = Router();

router.get('/usage', (req, res) => {
  logger.info('Get analytics usage');
  res.json({ message: 'Analytics usage endpoint - TODO: implement' });
});

router.get('/metrics', (req, res) => {
  logger.info('Get metrics');
  res.json({ message: 'Analytics metrics endpoint - TODO: implement' });
});

export default router;