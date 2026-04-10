import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import { KullaniciProvider } from './context/KullaniciContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <KullaniciProvider>
      <App />
    </KullaniciProvider>
  </StrictMode>,
)
