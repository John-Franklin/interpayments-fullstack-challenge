// Dev only. In production merchants sign in to the terminal through the portal's SSO and
// none of these keys exist. Each one matches a merchant in the payments-api seed data.

export type DevMerchant = {
  id: string
  name: string
  apiKey: string
}

export const devMerchants: DevMerchant[] = [
  { id: 'mer_001', name: 'Blue Ridge Outfitters', apiKey: 'sk_test_blueridge_4f9c2a71e0' },
  { id: 'mer_002', name: 'Harbor Dental Group', apiKey: 'sk_test_harbor_8d1e6b03c7' },
  { id: 'mer_003', name: 'Sakura Imports', apiKey: 'sk_test_sakura_2b7f9e4415' },
  { id: 'mer_004', name: 'Lakeside Community Theatre', apiKey: 'sk_test_lakeside_c05a1d98b2' },
]
