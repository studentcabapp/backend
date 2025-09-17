import express from 'express';
import { verifyToken, requireRoles } from '../middlewares/auth.middleware.js';
import { getAllLogs, getLogById } from '../controllers/auditlog.controller.js';

const router = express.Router();

// Admin & Hacker only
router.get('', verifyToken, requireRoles('admin', 'hacker'), getAllLogs);
router.get('/:id', verifyToken, requireRoles('admin', 'hacker'), getLogById);

export default router;
