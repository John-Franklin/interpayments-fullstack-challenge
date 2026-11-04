import { useEffect, useState } from 'react'
import { Alert, Card, Col, DatePicker, Row, Statistic, Table } from 'antd'
import dayjs from 'dayjs'
import { errorMessage } from '../api/client'
import { getSettlementReport, SettlementReport } from '../api/reports'
import { describeCard } from '../components/CardLabel'
import { formatMoney } from '../utils/money'

export const SettlementPage = () => {
  const [ date, setDate ] = useState(new Date().toISOString().slice(0, 10))
  const [ report, setReport ] = useState<SettlementReport>()
  const [ error, setError ] = useState<string>()

  useEffect(() => {
    getSettlementReport(date)
      .then(setReport)
      .catch(e => setError(errorMessage(e)))
  }, [date])

  const money = (value: number) => formatMoney(value, report?.currency ?? 'USD')

  return <>
    <header className='page-header'>
      <h1>Settlement</h1>
      <DatePicker
        aria-label='Settlement date'
        value={dayjs(date)}
        allowClear={false}
        onChange={value => setDate(value.toISOString().slice(0, 10))}
      />
    </header>

    {error && <Alert type='error' showIcon message="Couldn't load the report" description={error} style={{ marginBottom: 16 }} />}

    {report && <>
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={12} md={6}>
          <Card><Statistic title={`Gross (${report.paymentCount} payments)`} value={money(report.gross)} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title='Surcharge collected' value={money(report.surchargeCollected)} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title='Refunds' value={money(report.refunds)} /></Card>
        </Col>
        <Col xs={12} md={6}>
          <Card><Statistic title='Net' value={money(report.net)} /></Card>
        </Col>
      </Row>

      <Card title='By card network'>
        <Table
          rowKey='network'
          dataSource={report.byNetwork}
          pagination={false}
          columns={[
            { title: 'Network', dataIndex: 'network', render: (network: string) => describeCard(network, '') },
            { title: 'Payments', dataIndex: 'count', align: 'right' },
            { title: 'Total', dataIndex: 'total', align: 'right', render: (total: number) => money(total) },
          ]}
        />
      </Card>
    </>}
  </>
}
