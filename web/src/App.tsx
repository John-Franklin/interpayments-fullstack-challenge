import { Button, Select } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { Link, Route, Routes, useNavigate } from 'react-router-dom'
import { devMerchants } from './merchants/devMerchants'
import { useMerchant } from './merchants/MerchantContext'
import { NewPaymentPage } from './pages/NewPaymentPage'
import { PaymentDetailPage } from './pages/PaymentDetailPage'
import { PaymentsPage } from './pages/PaymentsPage'
import { SettlementPage } from './pages/SettlementPage'

const App = () => {
  const navigate = useNavigate()
  const { merchant, devMerchant, switchMerchant } = useMerchant()

  const onMerchantChange = (id: string) => {
    switchMerchant(id)
    navigate('/')
  }

  return (
    <div className='app'>
      <nav className='app-nav'>
        <Link to='/' className='brand'>Virtual Terminal</Link>
        <div className='app-nav-actions'>
          <Button onClick={() => navigate('/reports/settlement')}>Settlement</Button>
          <Select
            aria-label='Merchant'
            value={devMerchant.id}
            options={devMerchants.map(m => ({ value: m.id, label: m.name }))}
            onChange={onMerchantChange}
            style={{ width: 240 }}
          />
          <Button type='primary' icon={<PlusOutlined />} onClick={() => navigate('/payments/new')}>
            New payment
          </Button>
        </div>
      </nav>

      <Routes key={merchant.id}>
        <Route path='/' element={<PaymentsPage />} />
        <Route path='/payments/new' element={<NewPaymentPage />} />
        <Route path='/payments/:id' element={<PaymentDetailPage />} />
        <Route path='/reports/settlement' element={<SettlementPage />} />
      </Routes>
    </div>
  )
}

export default App
