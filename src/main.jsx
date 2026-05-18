import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { inject } from '@vercel/analytics'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker } from './utils/registerServiceWorker.js'

// Inject Vercel Analytics only on Vercel deployments.
// In local preview, /_vercel/insights/script.js is not served → would 404.
const host = window.location.hostname
const isVercelDeploy = !host.includes('localhost') && !host.includes('127.0.0.1')
if (isVercelDeploy) inject()
registerServiceWorker()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
