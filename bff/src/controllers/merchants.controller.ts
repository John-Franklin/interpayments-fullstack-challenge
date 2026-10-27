import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { getMerchant } from '../services/merchantService';

export async function fetchMerchant(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const merchant = await getMerchant(req);
    res.json(merchant);
  } catch (err) {
    next(err);
  }
}
