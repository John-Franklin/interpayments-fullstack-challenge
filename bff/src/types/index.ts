import { Request } from 'express';

export interface AuthenticatedRequest extends Request {
  apiKey?: string; // set by requireApiKey
}

export interface Merchant {
  id: string;
  name: string;
  currency: string;
  surchargeRate: number; // percent, 3 = 3%
}

export interface SurchargeServiceQuote {
  merchantId: string;
  currency: string;
  network: string;
  cardType: string;
  surchargeable: boolean;
  rate: number;
  amount: number;
  surcharge: number;
  total: number;
}

// What the terminal gets back from /surcharge/quote
export type SurchargeQuote = Omit<SurchargeServiceQuote, 'merchantId' | 'currency'>;

export class UpstreamError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = 'UpstreamError';
  }
}
