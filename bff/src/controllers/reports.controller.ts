import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { fetchFromPaymentsApi } from '../services/paymentsApiProxy';
import { ResponseCache } from '../services/responseCache';

const SETTLEMENT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// A day's settlement doesn't change once the day is over, and the report is expensive to build
const settlementCache = new ResponseCache<unknown>(SETTLEMENT_CACHE_TTL_MS);

export async function fetchSettlementReport(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const cached = settlementCache.get(req.originalUrl);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const date = encodeURIComponent(String(req.query.date ?? ''));
    const { status, body } = await fetchFromPaymentsApi(req, `/reports/settlement?date=${date}`);
    if (status === 200) {
      settlementCache.set(req.originalUrl, body);
    }
    res.status(status).json(body);
  } catch (err) {
    next(err);
  }
}
