import { describe, expect, it } from 'vitest'
import type { SurchargeQuote } from '../api/payments'
import { CardQuote, summarizeSurcharge } from './surcharge'

const VISA_CREDIT = '41111111'
const VISA_DEBIT = '40000566'

const visaCredit: CardQuote = {
  bin: VISA_CREDIT,
  quote: { network: 'VISA', cardType: 'CREDIT', surchargeable: true, rate: 2.5, amount: 185, surcharge: 4.63, total: 189.63 },
}

const debitQuote: SurchargeQuote = {
  network: 'VISA', cardType: 'DEBIT', surchargeable: false, rate: 0, amount: 185, surcharge: 0, total: 185,
}
const visaDebit: CardQuote = { bin: VISA_DEBIT, quote: debitQuote }

describe('summarizeSurcharge', () => {
  // INC-4471: a Harbor Dental patient paying by debit was shown the merchant's 2.5% surcharge
  it('shows no surcharge for a debit card', () => {
    expect(summarizeSurcharge(185, VISA_DEBIT, visaDebit)).toEqual({
      status: 'quoted', surchargeable: false, rate: 0, surcharge: 0, total: 185,
    })
  })

  it('shows no surcharge whenever the quote says the card is not surchargeable', () => {
    const inconsistent = { bin: VISA_DEBIT, quote: { ...debitQuote, rate: 2.5, surcharge: 4.63, total: 189.63 } }
    expect(summarizeSurcharge(185, VISA_DEBIT, inconsistent)).toMatchObject({ surcharge: 0, total: 185 })
  })

  // INC-4471: the terminal showed $189.63 while the receipt said $189.62
  it("shows the service's surcharge and total for a credit card", () => {
    expect(summarizeSurcharge(185, VISA_CREDIT, visaCredit)).toEqual({
      status: 'quoted', surchargeable: true, rate: 2.5, surcharge: 4.63, total: 189.63,
    })
  })

  it('shows nothing until there is a quote', () => {
    expect(summarizeSurcharge(185, VISA_CREDIT, undefined)).toEqual({ status: 'pending' })
    expect(summarizeSurcharge(0, VISA_CREDIT, visaCredit)).toEqual({ status: 'pending' })
  })

  it('shows nothing while the quote is for a different amount', () => {
    expect(summarizeSurcharge(200, VISA_CREDIT, visaCredit)).toEqual({ status: 'pending' })
  })

  // swapping a credit card for a debit card must not leave the credit card's surcharge on screen
  it('shows nothing while the quote is for a different card', () => {
    expect(summarizeSurcharge(185, VISA_DEBIT, visaCredit)).toEqual({ status: 'pending' })
    expect(summarizeSurcharge(185, null, visaCredit)).toEqual({ status: 'pending' })
  })
})
