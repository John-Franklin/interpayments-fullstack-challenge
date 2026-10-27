import { Response } from 'express';
import { AuthenticatedRequest, SurchargeQuote } from '../types';
import { getMerchant } from '../services/merchantService';
import { fetchQuote } from '../services/surchargeServiceClient';

const BIN_PATTERN = /^\d{8}$/;

// Preview for the terminal. The payments API gets its own quote when it charges the card
export async function quoteSurcharge(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { amount, bin } = req.body ?? {};
  if (typeof amount !== 'number' || !(amount > 0) || typeof bin !== 'string' || !BIN_PATTERN.test(bin)) {
    res.status(400).json({ error: 'amount must be positive and bin must be 8 digits' });
    return;
  }

  const merchant = await getMerchant(req);
  const quote = await fetchQuote(merchant.id, amount, bin);

  const response: SurchargeQuote = {
    network: quote.network,
    cardType: quote.cardType,
    surchargeable: quote.surchargeable,
    rate: quote.rate,
    amount: quote.amount,
    surcharge: quote.surcharge,
    total: quote.total,
  };
  res.json(response);
}
