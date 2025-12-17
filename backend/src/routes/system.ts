import { Router } from 'express';
import { logger } from '@/utils/logger';

const router = Router();

router.get('/health', (req, res) => {
  logger.info('Health check');
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.get('/status', (req, res) => {
  logger.info('System status');
  res.json({ message: 'System status endpoint - TODO: implement' });
});

export default router;