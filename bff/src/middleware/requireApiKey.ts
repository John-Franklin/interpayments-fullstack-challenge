import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';

// The payments API checks the key itself, we just pass it along
export function requireApiKey(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const apiKey = req.header('x-api-key');
  if (!apiKey) {
    res.status(401).json({ error: 'Missing API key' });
    return;
  }

  req.apiKey = apiKey;
  next();
}
