import { useEffect, useState } from 'react'
import { Alert, Table, TableColumnsType } from 'antd'
import dayjs from 'dayjs'
import { Link } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { listPayments, Page, Payment, PaymentStatus } from '../api/payments'
import { CardLabel } from '../components/CardLabel'
import { StatusTag } from '../components/StatusTag'
import { formatMoney } from '../utils/money'

const PAGE_SIZE = 20

const columns: TableColumnsType<Payment> = [
  {
    title: 'Date',
    dataIndex: 'createdAt',
    render: (createdAt: string) => dayjs(createdAt).format('MMM D, YYYY h:mm A'),
  },
  {
    title: 'Payment',
    key: 'payment',
    render: (_, p) => <Link to={`/payments/${p.id}`}>{p.customerName ?? 'Walk-in customer'}</Link>,
  },
  {
    title: 'Card',
    key: 'card',
    render: (_, p) => <CardLabel network={p.card.network} type={p.card.type} last4={p.card.last4} />,
  },
  { title: 'Amount', align: 'right', render: (_, p) => formatMoney(p.amount, p.currency) },
  { title: 'Surcharge', align: 'right', render: (_, p) => formatMoney(p.surcharge, p.currency) },
  { title: 'Total', align: 'right', render: (_, p) => <strong>{formatMoney(p.total, p.currency)}</strong> },
  { title: 'Status', dataIndex: 'status', render: (status: PaymentStatus) => <StatusTag status={status} /> },
]

export const PaymentsPage = () => {
  const [ page, setPage ] = useState(1)
  const [ data, setData ] = useState<Page<Payment>>()
  const [ loading, setLoading ] = useState(true)
  const [ error, setError ] = useState<string>()

  useEffect(() => {
    let cancelled = false
    setLoading(true)

    listPayments(page, PAGE_SIZE)
      .then(result => {
        if (cancelled) return
        setData(result)
        setError(undefined)
      })
      .catch(e => { if (!cancelled) setError(errorMessage(e)) })
      .finally(() => { if (!cancelled) setLoading(false) })

    return () => { cancelled = true }
  }, [page])

  return (
    <>
      <header className='page-header'>
        <h1>Payments</h1>
      </header>

      {error && <Alert type='error' showIcon message="Couldn't load payments" description={error} style={{ marginBottom: 16 }} />}

      <Table
        rowKey='id'
        columns={columns}
        dataSource={data?.items}
        loading={loading}
        pagination={{ current: page, pageSize: PAGE_SIZE, total: data?.totalCount, showSizeChanger: false, onChange: setPage }}
      />
    </>
  )
}
