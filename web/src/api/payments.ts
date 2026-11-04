import { request } from './client'

export type PaymentStatus = 'APPROVED' | 'DECLINED' | 'REFUNDED'

export type Payment = {
  id: string
  amount: number
  surcharge: number
  total: number
  currency: string
  status: PaymentStatus
  declineReason: string | null
  card: {
    network: string
    type: string
    last4: string
  }
  customerName: string | null
  gateway: {
    reference: string | null
    capturedAmountMinor: number
  }
  refundedAmount: number
  createdAt: string
}

export type Page<T> = {
  items: T[]
  page: number
  pageSize: number
  totalCount: number
}

export type NewPayment = {
  amount: number
  cardNumber: string
  expiryMonth: number
  expiryYear: number
  cvv: string
  customerName?: string
}

export type SurchargeQuote = {
  network: string
  cardType: string
  surchargeable: boolean
  rate: number
  amount: number
  surcharge: number
  total: number
}

export const listPayments = (page: number, pageSize: number) =>
  request<Page<Payment>>(`/payments?page=${page}&pageSize=${pageSize}`)

export const getPayment = (id: string) => request<Payment>(`/payments/${encodeURIComponent(id)}`)

export const createPayment = (payment: NewPayment) =>
  request<Payment>('/payments', { method: 'POST', body: payment })

export const refundPayment = (id: string) =>
  request<Payment>(`/payments/${encodeURIComponent(id)}/refund`, { method: 'POST' })

// a short timeout: if the service is slow the terminal falls back to no surcharge rather than blocking the clerk
export const quoteSurcharge = (amount: number, bin: string) =>
  request<SurchargeQuote>('/surcharge/quote', { method: 'POST', body: { amount, bin }, timeoutMs: 2000, retries: 1 })
