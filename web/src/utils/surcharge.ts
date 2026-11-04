import type { SurchargeQuote } from '../api/payments'

// a quote isn't tied to the card it was for, so keep the bin alongside it
export type CardQuote = { bin: string, quote: SurchargeQuote }

export type SurchargeSummary =
  | { status: 'pending' }
  | { status: 'quoted', surchargeable: boolean, rate: number, surcharge: number, total: number }

// The surcharge service decides whether a card can be surcharged and by how much (docs/surcharging.md),
// so the terminal only ever shows its quote. Until there's a quote for this exact amount and card we show
// nothing rather than a guess, so the customer never sees a figure that differs from what they'll be charged.
export const summarizeSurcharge = (amount: number, bin: string | null, quoted: CardQuote | undefined): SurchargeSummary => {
  if (!quoted || !(amount > 0) || quoted.bin !== bin || quoted.quote.amount !== amount) {
    return { status: 'pending' }
  }
  const { quote } = quoted
  return {
    status: 'quoted',
    surchargeable: quote.surchargeable,
    rate: quote.surchargeable ? quote.rate : 0,
    surcharge: quote.surchargeable ? quote.surcharge : 0,
    total: quote.surchargeable ? quote.total : quote.amount,
  }
}
