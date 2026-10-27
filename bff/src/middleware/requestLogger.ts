import { Request, Response, NextFunction } from 'express';

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startTime = Date.now();

  res.on('finish', () => {
    if (req.path === '/health') return;

    const processingTimeMs = Date.now() - startTime;

    // Same JSON line format as the other services
    const logEntry = {
      '@timestamp': new Date().toISOString(),
      level: res.statusCode >= 500 ? 'ERROR' : 'INFO',
      logger_name: 'middleware.requestLogger',
      message: `${req.method} u:${req.originalUrl} r:${res.statusCode} t:${processingTimeMs}ms`,
    };
    console.log(JSON.stringify(logEntry));
  });

  next();
}
