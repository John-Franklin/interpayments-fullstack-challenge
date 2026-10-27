import { createContext, ReactNode, useCallback, useContext, useEffect, useState } from 'react'
import { Alert, Spin } from 'antd'
import { errorMessage } from '../api/client'
import { getCurrentMerchant, Merchant } from '../api/merchants'
import { setApiKey } from '../api/session'
import { DevMerchant, devMerchants } from './devMerchants'

const STORAGE_KEY = 'terminal.merchantId'

type MerchantContext_Shape = {
  merchant: Merchant
  devMerchant: DevMerchant
  switchMerchant: (id: string) => void
}

const MerchantContext = createContext<MerchantContext_Shape | undefined>(undefined)

const storedMerchant = () => {
  let id: string | null = null
  try {
    id = localStorage.getItem(STORAGE_KEY)
  } catch { /* blocked in some private windows */ }
  return devMerchants.find(m => m.id === id) ?? devMerchants[0]
}

export const MerchantProvider = ({ children }: { children: ReactNode }) => {
  const [ devMerchant, setDevMerchant ] = useState(storedMerchant)
  const [ merchant, setMerchant ] = useState<Merchant>()
  const [ error, setError ] = useState<string>()

  useEffect(() => {
    let cancelled = false
    setApiKey(devMerchant.apiKey)
    setMerchant(undefined)
    setError(undefined)

    getCurrentMerchant()
      .then(m => { if (!cancelled) setMerchant(m) })
      .catch(e => { if (!cancelled) setError(errorMessage(e)) })

    return () => { cancelled = true }
  }, [devMerchant])

  const switchMerchant = useCallback((id: string) => {
    const next = devMerchants.find(m => m.id === id)
    if (!next) return
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch { /* still switches, just won't stick after a reload */ }
    setDevMerchant(next)
  }, [])

  if (error) return <Alert type='error' showIcon message="Couldn't load the merchant" description={error} />

  if (!merchant) {
    return (
      <div className='app-loading'>
        <Spin size='large' />
      </div>
    )
  }

  return (
    <MerchantContext.Provider value={{ merchant, devMerchant, switchMerchant }}>
      {children}
    </MerchantContext.Provider>
  )
}

export const useMerchant = () => {
  const context = useContext(MerchantContext)
  if (!context) throw new Error('useMerchant must be used inside a MerchantProvider')
  return context
}
