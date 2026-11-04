import { Request, Response, NextFunction, RequestHandler } from 'express';

// Express 4 doesn't catch a rejected promise from an async handler. Unhandled, it crashes the process and takes
// every terminal down with it (INC-4493), so every route goes through this and errors reach errorHandler instead
export const asyncHandler = <Req extends Request>(handler: (req: Req, res: Response, next: NextFunction) => Promise<void>): RequestHandler =>
  (req, res, next) => {
    handler(req as Req, res, next).catch(next);
  };
