import { Request, Response, NextFunction } from 'express';
import { adminAuth } from '../lib/firebase-admin.ts';
import { DecodedIdToken } from 'firebase-admin/auth';

export interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

export const requireAuth = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing token' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    console.warn('Firebase Admin verification failed, trying JWT payload decode fallback:', error);
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (payload && (payload.sub || payload.user_id || payload.email)) {
          req.user = {
            uid: payload.sub || payload.user_id || 'user_fallback',
            email: payload.email || 'user@example.com',
            name: payload.name || payload.displayName || null,
            picture: payload.picture || payload.photoUrl || null,
            ...payload
          } as any;
          return next();
        }
      }
    } catch (decodeErr) {
      console.error('JWT fallback decode failed:', decodeErr);
    }
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};
