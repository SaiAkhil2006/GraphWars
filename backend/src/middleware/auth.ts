import { Request, Response, NextFunction } from 'express';
import { verifyIdToken } from '../config/firebase.js';

export interface AuthRequest extends Request {
  user?: { uid: string; email?: string };
}

export async function authMiddleware(
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }

  const token = header.slice(7);
  const decoded = await verifyIdToken(token);

  if (!decoded) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  req.user = { uid: decoded.uid, email: decoded.email };
  next();
}
