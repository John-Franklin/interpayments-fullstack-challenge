import { Typography } from 'antd'

const { Text } = Typography

const networks: Record<string, string> = {
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  AMEX: 'Amex',
  DISCOVER: 'Discover',
}

const types: Record<string, string> = {
  CREDIT: 'credit',
  DEBIT: 'debit',
  PREPAID: 'prepaid',
}

export const describeCard = (network: string, type: string) =>
  [networks[network] ?? 'Unknown card', types[type]].filter(Boolean).join(' ')

export type CardLabel_Props = {
  network: string
  type: string
  last4?: string
}

export const CardLabel = ({ network, type, last4 }: CardLabel_Props) => (
  <span>
    {describeCard(network, type)}
    {last4 && <Text type='secondary'> •••• {last4}</Text>}
  </span>
)
