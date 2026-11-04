import { useEffect, useState } from 'react'
import { Alert, App, Button, Card, Col, Form, Input, InputNumber, Row } from 'antd'
import { useNavigate } from 'react-router-dom'
import { errorMessage } from '../api/client'
import { createPayment, quoteSurcharge } from '../api/payments'
import { describeCard } from '../components/CardLabel'
import { useMerchant } from '../merchants/MerchantContext'
import { binOf, digitsOnly, formatCardNumber, isValidCardNumber, parseExpiry } from '../utils/card'
import { formatMoney } from '../utils/money'
import { CardQuote, noSurchargeQuote, summarizeSurcharge } from '../utils/surcharge'

type PaymentForm_Shape = {
  amount: number
  cardNumber: string
  expiry: string
  cvv: string
  customerName?: string
}

export const NewPaymentPage = () => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const { merchant } = useMerchant()
  const [form] = Form.useForm<PaymentForm_Shape>()
  const [ submitting, setSubmitting ] = useState(false)
  const [ error, setError ] = useState<string>()
  const [ card, setCard ] = useState<CardQuote>()
  const [ quoteFailed, setQuoteFailed ] = useState(false)

  const amount = Form.useWatch('amount', form) ?? 0
  const bin = binOf(Form.useWatch('cardNumber', form) ?? '')

  // the quote drives both the card label and the surcharge shown to the customer. Debounced so we
  // don't quote on every keystroke of the amount
  useEffect(() => {
    setQuoteFailed(false)
    if (!bin || !(amount > 0)) {
      setCard(undefined)
      return
    }
    let active = true
    const timer = setTimeout(() => {
      quoteSurcharge(amount, bin)
        .then(quote => { if (active) setCard({ bin, quote }) })
        .catch(() => { if (active) { setCard({ bin, quote: noSurchargeQuote(amount) }); setQuoteFailed(true) } })
    }, 250)
    return () => { active = false; clearTimeout(timer) }
  }, [amount, bin])

  const summary = summarizeSurcharge(amount, bin, card)
  // only for the card currently entered, never a previous one
  const cardQuote = card?.bin === bin && !quoteFailed ? card.quote : undefined

  const onFinish = async (values: PaymentForm_Shape) => {
    // rule 4: the customer has to have seen the exact total before we charge
    if (summary.status !== 'quoted') return
    const expiry = parseExpiry(values.expiry)!
    setSubmitting(true)
    setError(undefined)

    try {
      const payment = await createPayment({
        amount: values.amount,
        cardNumber: digitsOnly(values.cardNumber),
        expiryMonth: expiry.month,
        expiryYear: expiry.year,
        cvv: values.cvv,
        customerName: values.customerName?.trim() || undefined,
      })

      if (payment.status === 'APPROVED') {
        message.success(`Approved: ${formatMoney(payment.total, payment.currency)}`)
      } else {
        message.warning('The card was declined.')
      }
      navigate(`/payments/${payment.id}`)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setSubmitting(false)
    }
  }

  return <>
    <header className='page-header'>
      <h1>New payment</h1>
    </header>

    <Row gutter={24}>
      <Col xs={24} md={14}>
        <Card>
          {error && <Alert type='error' showIcon message='Payment failed' description={error} style={{ marginBottom: 16 }} />}
          {quoteFailed && <Alert type='info' showIcon message="Surcharging is unavailable right now"
            description="This payment will be taken without a surcharge." style={{ marginBottom: 16 }} />}

          <Form form={form} layout='vertical' requiredMark='optional' onFinish={onFinish} disabled={submitting}>
            <Form.Item label={`Amount (${merchant.currency})`} name='amount' rules={[{ required: true, message: 'Enter an amount' }]}>
              <InputNumber min={0.01} precision={2} style={{ width: '100%' }} placeholder='0.00' />
            </Form.Item>

            <Form.Item
              label='Card number'
              name='cardNumber'
              normalize={formatCardNumber}
              extra={cardQuote && describeCard(cardQuote.network, cardQuote.cardType)}
              rules={[
                { required: true, message: 'Enter the card number' },
                {
                  validator: (_, value: string) => !value || isValidCardNumber(value)
                    ? Promise.resolve()
                    : Promise.reject(new Error("That card number isn't valid")),
                },
              ]}
            >
              <Input inputMode='numeric' autoComplete='cc-number' placeholder='4111 1111 1111 1111' />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label='Expiry'
                  name='expiry'
                  rules={[
                    { required: true, message: 'Enter the expiry date' },
                    {
                      validator: (_, value: string) => !value || parseExpiry(value)
                        ? Promise.resolve()
                        : Promise.reject(new Error('Use MM/YY')),
                    },
                  ]}
                >
                  <Input autoComplete='cc-exp' placeholder='MM/YY' maxLength={5} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label='CVV'
                  name='cvv'
                  rules={[
                    { required: true, message: 'Enter the CVV' },
                    { pattern: /^\d{3,4}$/, message: '3 or 4 digits' },
                  ]}
                >
                  <Input.Password inputMode='numeric' autoComplete='cc-csc' maxLength={4} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item label='Customer name' name='customerName'>
              <Input autoComplete='cc-name' maxLength={100} />
            </Form.Item>

            <Button type='primary' htmlType='submit' size='large' block loading={submitting} disabled={summary.status !== 'quoted'}>
              {summary.status === 'quoted' ? `Charge ${formatMoney(summary.total, merchant.currency)}` : 'Charge'}
            </Button>
          </Form>
        </Card>
      </Col>

      <Col xs={24} md={10}>
        <Card title='Summary'>
          <dl className='summary'>
            <dt>Amount</dt>
            <dd>{formatMoney(amount, merchant.currency)}</dd>
            <dt>Card surcharge{summary.status === 'quoted' && summary.surchargeable && ` (${summary.rate}%)`}</dt>
            <dd>{summary.status === 'quoted' ? formatMoney(summary.surcharge, merchant.currency) : '—'}</dd>
            <dt className='summary-total'>Total</dt>
            <dd className='summary-total'>{summary.status === 'quoted' ? formatMoney(summary.total, merchant.currency) : '—'}</dd>
          </dl>
        </Card>
      </Col>
    </Row>
  </>
}
