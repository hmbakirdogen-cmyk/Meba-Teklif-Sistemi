import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'antd/dist/reset.css'
import './index.css'
import App from './App.tsx'
import { KullaniciProvider } from './context/KullaniciContext.tsx'
import { FirmaProvider } from './context/FirmaContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FirmaProvider>
      <KullaniciProvider>
        <App />
      </KullaniciProvider>
    </FirmaProvider>
  </StrictMode>,
)
