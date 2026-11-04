import type { SurchargeQuote } from '../api/payments'

// a quote isn't tied to the card it was for, so keep the bin alongside it
export type CardQuote = { bin: string, quote: SurchargeQuote }

// What to show when the surcharge service can't be reached. If we can't tell the card type we don't
// surcharge (docs/surcharging.md rule 2), and the payments API charges without a surcharge in that case
// too, so this is what the customer will actually pay and the terminal keeps taking payments.
export const noSurchargeQuote = (amount: number): SurchargeQuote => ({
  network: 'UNKNOWN', cardType: 'UNKNOWN', surchargeable: false, rate: 0, amount, surcharge: 0, total: amount,
})

export type SurchargeSummary =
  | { status: 'pending' }
  | { status: 'quoted', surchargeable: boolean, rate: number, surcharge: number, total: number }

// The surcharge service decides whether a card can be surcharged and by how much (docs/surcharging.md),
// so the terminal shows its quote, or noSurchargeQuote when the service is down. Until there's a quote for this exact amount and card we show
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
