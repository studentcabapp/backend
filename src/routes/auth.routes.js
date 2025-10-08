// routes/auth.routes.js
import express from 'express';
import * as authCtrl from '../controllers/auth.controller.js';
import * as adminCtrl from '../controllers/admin.controller.js';
import * as domainCtrl from '../controllers/domain.controller.js';
import { verifyToken, requireRoles, ipRateLimiter } from '../middlewares/auth.middleware.js';

import { sendEmailCode, verifyEmailCode } from '../controllers/emailVerify.controller.js';
import { ipLimiter, sendCodeLimiter } from '../middlewares/rateLimiters.js';

const router = express.Router();

// ---------- Public routes ----------
router.get('/test', authCtrl.testApi);                                                              // done✅

router.post('/register', ipRateLimiter({ windowMs: 60_000, max: 10 }), authCtrl.register);          // done✅
router.post('/login', ipRateLimiter({ windowMs: 60_000, max: 20 }), authCtrl.login);                // done✅
router.post('/refresh', authCtrl.refresh);

router.get('/check-username/:username', authCtrl.checkUsernameExists);                              // done✅     
router.get('/check-email/:email', authCtrl.checkEmailExists);                                       // done✅                   
router.get('/check-availability', authCtrl.checkAvailability);                                      // done✅  

// Request domain approval (public; can also be protected if you want)
router.post('/request-domain', domainCtrl.requestDomainApproval);

// ---------- Authenticated user routes ----------
router.post('/logout', verifyToken, authCtrl.logout);                                               // done✅
router.get('/profile', verifyToken, authCtrl.getProfile);                                           // done✅              
router.put('/profile', verifyToken, authCtrl.updateProfile);                                        // done✅
router.post('/change-password', verifyToken, authCtrl.changePassword);                              // done✅      
router.delete('/account', verifyToken, authCtrl.deleteAccount);

// ---------- Admin routes ----------
router.get('/admin/all-users', verifyToken, requireRoles('admin'), adminCtrl.getAllUserData);       // done✅
router.post('/admin/upgrade-tier', verifyToken, requireRoles('admin'), adminCtrl.upgradeUserTier);  // done✅
router.post('/admin/promote', verifyToken, requireRoles('admin'), adminCtrl.promoteUserRole);       // done✅

router.get('/admin/domain-requests', verifyToken, requireRoles('admin'), adminCtrl.listDomainRequests);     // done✅
router.post('/admin/approve-domain', verifyToken, requireRoles('admin'), adminCtrl.approveDomain); 
router.post('/admin/reject-domain', verifyToken, requireRoles('admin'), adminCtrl.rejectDomain);

router.get('/admin/institutions', verifyToken, requireRoles('admin'), adminCtrl.listInstitutions);
router.post('/admin/institutions', verifyToken, requireRoles('admin'), adminCtrl.addInstitution);


// GET /auth/verify-email/send
router.get('/verify-email/send', verifyToken, ipLimiter, sendCodeLimiter, sendEmailCode);

// POST /auth/verify-email/confirm
router.post('/verify-email/confirm', verifyToken, ipLimiter, verifyEmailCode);

export default router;
