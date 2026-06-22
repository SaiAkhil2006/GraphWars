import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.ts';
import {
  getProfile,
  updateProfile,
  getLeaderboard,
  getMatchHistory,
  getPublicRooms,
} from '../controllers/userController.ts';

const router = Router();

router.get('/profile', authMiddleware, getProfile);
router.put('/profile', authMiddleware, updateProfile);
router.get('/leaderboard', authMiddleware, getLeaderboard);
router.get('/matches', authMiddleware, getMatchHistory);
router.get('/rooms', authMiddleware, getPublicRooms);

export default router;
