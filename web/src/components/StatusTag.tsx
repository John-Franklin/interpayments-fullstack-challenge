import { Tag } from 'antd'
import { PaymentStatus } from '../api/payments'

const colors: Record<PaymentStatus, string> = {
  APPROVED: 'green',
  DECLINED: 'red',
  REFUNDED: 'default',
}

export const StatusTag = ({ status }: { status: PaymentStatus }) =>
  <Tag color={colors[status]}>{status.charAt(0) + status.slice(1).toLowerCase()}</Tag>
