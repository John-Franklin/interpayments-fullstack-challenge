import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../types';
import { config } from '../config';
import { fetchFromPaymentsApi, proxyGet, proxyPost } from '../services/paymentsApiProxy';
import { ResponseCache } from '../services/responseCache';

// Every terminal loads the list first, and it's the slowest query the payments API has
const paymentListCache = new ResponseCache<unknown>(config.paymentListCacheTtlMs);

export async function fetchPayments(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const cached = paymentListCache.get(req.originalUrl);
  if (cached) {
    res.json(cached);
    return;
  }

  try {
    const query = new URLSearchParams(req.query as Record<string, string>).toString();
    const { status, body } = await fetchFromPaymentsApi(req, `/payments${query ? `?${query}` : ''}`);
    if (status === 200) {
      paymentListCache.set(req.originalUrl, body);
    }
    res.status(status).json(body);
  } catch (err) {
    next(err);
  }
}

export async function fetchPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  await proxyGet(req, res, `/payments/${encodeURIComponent(req.params.id)}`);
}

export async function createPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  await proxyPost(req, res, '/payments');
  paymentListCache.clear();
}

export async function refundPayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  await proxyPost(req, res, `/payments/${encodeURIComponent(req.params.id)}/refund`);
}
