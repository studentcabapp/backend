import express from 'express';
import { getMessages, sendMessage, getChats } from '../controllers/chat.controller.js';
import { verifyToken } from '../middlewares/auth.middleware.js';

const router = express.Router();

router.get('/messages', verifyToken, getMessages);

router.post('/messages', verifyToken, sendMessage);

router.get('/myChats', verifyToken, getChats);

export default router;
