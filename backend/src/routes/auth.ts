import { Router } from 'express';
import { logger } from '@/utils/logger';

const router = Router();

router.post('/login', (req, res) => {
  logger.info('Login attempt', { email: req.body?.email });
  res.json({ message: 'Login endpoint - TODO: implement' });
});

router.post('/register', (req, res) => {
  logger.info('Register attempt', { email: req.body?.email });
  res.json({ message: 'Register endpoint - TODO: implement' });
});

router.post('/logout', (req, res) => {
  logger.info('Logout');
  res.json({ message: 'Logout endpoint - TODO: implement' });
});

export default router;