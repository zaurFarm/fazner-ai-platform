import { Router } from 'express';
import { logger } from '@/utils/logger';

const router = Router();

router.get('/:projectId/files', (req, res) => {
  logger.info('Get project files', { projectId: req.params.projectId });
  res.json({ message: 'Get files endpoint - TODO: implement' });
});

router.post('/:projectId/files', (req, res) => {
  logger.info('Upload file', { projectId: req.params.projectId });
  res.json({ message: 'Upload file endpoint - TODO: implement' });
});

export default router;