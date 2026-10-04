import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { GameScreen } from './ui/GameScreen'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <GameScreen />
  </StrictMode>,
)
