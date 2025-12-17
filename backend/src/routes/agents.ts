import { Router } from 'express';
import { logger } from '@/utils/logger';

const router = Router();

router.get('/', (req, res) => {
  logger.info('Get agents');
  res.json({ message: 'Agents endpoint - TODO: implement' });
});

router.post('/execute', (req, res) => {
  logger.info('Execute agent task');
  res.json({ message: 'Execute agent endpoint - TODO: implement' });
});

export default router;