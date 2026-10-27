import { config } from '../config';
import { SurchargeServiceQuote, UpstreamError } from '../types';

export async function fetchQuote(merchantId: string, amount: number, bin: string): Promise<SurchargeServiceQuote> {
  const response = await fetch(new URL('/v1/quotes', config.surchargeServiceUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ merchantId, amount, bin }),
  });

  const body: any = await response.json();
  if (!response.ok) {
    throw new UpstreamError(response.status, body.error ?? 'Surcharge quote failed');
  }
  return body;
}
