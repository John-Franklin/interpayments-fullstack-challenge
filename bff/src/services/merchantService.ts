import { AuthenticatedRequest, Merchant, UpstreamError } from '../types';
import { fetchFromPaymentsApi } from './paymentsApiProxy';

// Merchant profiles hardly ever change, so each API key only gets looked up once
const merchantCache = new Map<string, Merchant>();

export async function getMerchant(req: AuthenticatedRequest): Promise<Merchant> {
  const apiKey = req.apiKey ?? '';
  const cached = merchantCache.get(apiKey);
  if (cached) return cached;

  const { status, body } = await fetchFromPaymentsApi(req, '/merchants/me');
  if (status !== 200) {
    throw new UpstreamError(status, body?.error ?? 'Merchant lookup failed');
  }

  merchantCache.set(apiKey, body);
  return body;
}
