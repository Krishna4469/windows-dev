import type { Request, Response, NextFunction } from 'express';
import { validateSession } from '../services/auth.js';

declare global {
  namespace Express {
    interface Request {
      memberId?: string;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = auth.slice(7);
  const memberId = await validateSession(token);

  if (!memberId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  req.memberId = memberId;
  next();
}
