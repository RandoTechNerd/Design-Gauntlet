import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Removed StrictMode to prevent double-initialization of WASM/Three.js kernel
createRoot(document.getElementById('root')!).render(
    <App />
)
