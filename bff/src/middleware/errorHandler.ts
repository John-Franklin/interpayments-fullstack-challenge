import { Request, Response, NextFunction } from 'express';
import { UpstreamError } from '../types';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction): void {
  // too late to send an error response, so let Express close the connection
  if (res.headersSent) {
    next(err);
    return;
  }

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

  console.error(`Unhandled error: ${req.method} ${req.originalUrl}`, err);
  res.status(500).json({ error: 'Internal server error' });
}
