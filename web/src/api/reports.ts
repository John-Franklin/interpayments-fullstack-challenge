import { request } from './client'

export type NetworkTotal = {
  network: string
  count: number
  total: number
}

export type SettlementReport = {
  date: string
  currency: string
  paymentCount: number
  gross: number
  surchargeCollected: number
  refunds: number
  net: number
  byNetwork: NetworkTotal[]
}

export const getSettlementReport = (date: string) => request<SettlementReport>(`/reports/settlement?date=${date}`)
