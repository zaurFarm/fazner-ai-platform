import { Router } from 'express';
import { logger } from '@/utils/logger';

const router = Router();

router.get('/profile', (req, res) => {
  logger.info('Get profile');
  res.json({ message: 'User profile endpoint - TODO: implement' });
});

router.put('/profile', (req, res) => {
  logger.info('Update profile');
  res.json({ message: 'Update profile endpoint - TODO: implement' });
});

export default router;