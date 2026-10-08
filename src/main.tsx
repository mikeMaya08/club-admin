import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { initClub } from 'club-store'
import App from './App'
import { ToastProvider } from './components/Toast'
import './index.css'

// Apply ?reset / ?as / ?now / ?bug ... before anything renders.
initClub('admin')

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename="/admin">
      <ToastProvider>
        <App />
      </ToastProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
