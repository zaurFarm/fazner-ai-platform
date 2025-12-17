import { Router } from 'express';
import { logger } from '@/utils/logger';

const router = Router();

router.get('/', (req, res) => {
  logger.info('Get projects');
  res.json({ message: 'Projects endpoint - TODO: implement' });
});

router.post('/', (req, res) => {
  logger.info('Create project');
  res.json({ message: 'Create project endpoint - TODO: implement' });
});

router.get('/:id', (req, res) => {
  logger.info('Get project', { id: req.params.id });
  res.json({ message: 'Get project endpoint - TODO: implement' });
});

export default router;