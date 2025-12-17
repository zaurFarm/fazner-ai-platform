import { Router } from 'express';
import { logger } from '@/utils/logger';

const router = Router();

router.get('/sessions', (req, res) => {
  logger.info('Get chat sessions');
  res.json({ message: 'Chat sessions endpoint - TODO: implement' });
});

router.post('/sessions', (req, res) => {
  logger.info('Create chat session');
  res.json({ message: 'Create chat session endpoint - TODO: implement' });
});

router.post('/sessions/:id/messages', (req, res) => {
  logger.info('Send message', { sessionId: req.params.id });
  res.json({ message: 'Send message endpoint - TODO: implement' });
});

export default router;