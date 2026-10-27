// has to load before anything imports antd
import '@ant-design/v5-patch-for-react-19'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { App as AntApp } from 'antd'
import { BrowserRouter } from 'react-router-dom'
import 'antd/dist/reset.css'
import App from './App'
import { MerchantProvider } from './merchants/MerchantContext'
import './App.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AntApp>
        <MerchantProvider>
          <App />
        </MerchantProvider>
      </AntApp>
    </BrowserRouter>
  </React.StrictMode>
)
