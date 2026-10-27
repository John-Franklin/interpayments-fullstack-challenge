import { request } from './client'

export type Merchant = {
  id: string
  name: string
  currency: string
  surchargeRate: number // percent, 3 = 3%
}

export const getCurrentMerchant = () => request<Merchant>('/merchants/me')
