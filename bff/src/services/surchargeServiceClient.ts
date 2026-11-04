import { config } from '../config';
import { SurchargeServiceQuote, UpstreamError } from '../types';
import { upstreamFetch } from './upstream';

export async function fetchQuote(merchantId: string, amount: number, bin: string): Promise<SurchargeServiceQuote> {
  const { status, body } = await upstreamFetch('Surcharge service', new URL('/v1/quotes', config.surchargeServiceUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId, amount, bin }),
  }, config.surchargeServiceTimeoutMs);

  if (status !== 200) {
    // 4xx are about this request (unknown merchant, invalid amount) so pass them on, anything else is the service failing
    throw new UpstreamError(status >= 400 && status < 500 ? status : 502, body?.error ?? 'Surcharge quote failed');
  }
  return body;
}
