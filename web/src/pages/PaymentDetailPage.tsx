import { useEffect, useState } from 'react'
import { Alert, App, Button, Card, Descriptions, Popconfirm, Result, Spin } from 'antd'
import dayjs from 'dayjs'
import { Link, useParams } from 'react-router-dom'
import { ApiError, errorMessage } from '../api/client'
import { getPayment, Payment, refundPayment } from '../api/payments'
import { CardLabel } from '../components/CardLabel'
import { StatusTag } from '../components/StatusTag'
import { formatMinorUnits, formatMoney } from '../utils/money'

export const PaymentDetailPage = () => {
  const { id = '' } = useParams()
  const { message } = App.useApp()
  const [ payment, setPayment ] = useState<Payment>()
  const [ loading, setLoading ] = useState(true)
  const [ error, setError ] = useState<unknown>()
  const [ refunding, setRefunding ] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(undefined)

    getPayment(id)
      .then(p => { if (active) setPayment(p) })
      .catch(e => { if (active) setError(e) })
      .finally(() => { if (active) setLoading(false) })

    return () => { active = false }
  }, [id])

  const refund = async () => {
    setRefunding(true)
    try {
      setPayment(await refundPayment(id))
      message.success('Payment refunded')
    } catch (e) {
      message.error(errorMessage(e))
    } finally {
      setRefunding(false)
    }
  }

  if (loading) {
    return (
      <div className='app-loading'>
        <Spin size='large' />
      </div>
    )
  }

  if (error instanceof ApiError && error.status === 404) {
    return <Result status='404' title='Payment not found' extra={<Link to='/'><Button>Back to payments</Button></Link>} />
  }

  if (error || !payment) {
    return <Alert type='error' showIcon message="Couldn't load this payment" description={errorMessage(error)} />
  }

  const money = (value: number) => formatMoney(value, payment.currency)

  return (
    <>
      <header className='page-header'>
        <div>
          <Link to='/' className='back-link'>← Payments</Link>
          <h1>{money(payment.total)} <StatusTag status={payment.status} /></h1>
        </div>
        {payment.status === 'APPROVED' &&
          <Popconfirm
            title='Refund this payment?'
            description={`${money(payment.total)} will be returned to the customer's card.`}
            okText='Refund'
            onConfirm={refund}
          >
            <Button danger loading={refunding}>Refund</Button>
          </Popconfirm>
        }
      </header>

      <Card style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} bordered size='middle'>
          <Descriptions.Item label='Customer'>{payment.customerName ?? 'Walk-in customer'}</Descriptions.Item>
          <Descriptions.Item label='Date'>{dayjs(payment.createdAt).format('MMM D, YYYY h:mm:ss A')}</Descriptions.Item>
          <Descriptions.Item label='Card'>
            <CardLabel network={payment.card.network} type={payment.card.type} last4={payment.card.last4} />
          </Descriptions.Item>
          <Descriptions.Item label='Payment ID'><code>{payment.id}</code></Descriptions.Item>
          <Descriptions.Item label='Amount'>{money(payment.amount)}</Descriptions.Item>
          <Descriptions.Item label='Surcharge'>{money(payment.surcharge)}</Descriptions.Item>
          <Descriptions.Item label='Total'><strong>{money(payment.total)}</strong></Descriptions.Item>
          <Descriptions.Item label='Refunded'>{money(payment.refundedAmount)}</Descriptions.Item>
          {payment.declineReason &&
            <Descriptions.Item label='Decline reason' span={2}>{payment.declineReason.replace(/_/g, ' ')}</Descriptions.Item>
          }
        </Descriptions>
      </Card>

      <Card title='Gateway' style={{ marginBottom: 16 }}>
        <Descriptions column={{ xs: 1, sm: 2 }} size='small'>
          <Descriptions.Item label='Reference'><code>{payment.gateway.reference ?? '—'}</code></Descriptions.Item>
          <Descriptions.Item label='Captured'>
            {formatMinorUnits(payment.gateway.capturedAmountMinor, payment.currency)}
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </>
  )
}
