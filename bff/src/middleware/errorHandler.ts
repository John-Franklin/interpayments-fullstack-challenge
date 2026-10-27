import { Request, Response, NextFunction } from 'express';
import { UpstreamError } from '../types';

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof UpstreamError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // body-parser errors (bad JSON etc) already carry a 4xx status
  const status = (err as { status?: number }).status;
  if (status && status >= 400 && status < 500) {
    res.status(status).json({ error: err.message });
    return;
  }

  console.error('Unhandled error:', err.message);
  res.status(500).json({ error: 'Internal server error' });
}
