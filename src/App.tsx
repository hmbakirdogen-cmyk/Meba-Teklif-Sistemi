import { useState } from 'react'
import AppRouter from './AppRouter'

function DevSignature() {
  const [hovered, setHovered] = useState(false)
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'fixed',
        bottom: 14,
        right: 20,
        zIndex: 9999,
        fontSize: 10.5,
        letterSpacing: 0.6,
        color: '#BEBEBE',
        opacity: hovered ? 0.80 : 0.45,
        fontFamily: '"Segoe UI", "Inter", "Arial", sans-serif',
        fontWeight: 400,
        userSelect: 'none',
        whiteSpace: 'nowrap',
        cursor: 'default',
        transition: 'opacity 0.4s ease',
        textShadow: '0 1px 3px rgba(0,0,0,0.50)',
      }}
    >
      This software was developed by Mehmet Bakırdöğen
    </div>
  )
}

export default function App() {
  return (
    <>
      <AppRouter />
      <DevSignature />
    </>
  )
}

