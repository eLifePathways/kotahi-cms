import { createRoot } from 'react-dom/client'
import { Router } from 'wouter'
import App from './App'
import './index.css'
import { initErrorTracking } from './utils/error-tracking'

initErrorTracking()

createRoot(document.getElementById('root')!).render(
  <Router>
    <App />
  </Router>,
)
