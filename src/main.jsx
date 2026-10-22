import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { checkSupabaseConnection } from '@/lib/supabase'

if (import.meta.env.DEV) {
  checkSupabaseConnection()
    .then(({ url }) => console.info(`[supabase] Connected to ${url}`))
    .catch((error) => console.error('[supabase] Connection failed:', error))
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
