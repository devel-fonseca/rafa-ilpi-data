import ReactDOM from 'react-dom/client'
import { Buffer } from 'buffer'
import App from './App.tsx'
import './index.css'
import './styles/print.css'

// Polyfill global do Buffer para @react-pdf/renderer
globalThis.Buffer = Buffer

ReactDOM.createRoot(document.getElementById('root')!).render(
  <App />
)
