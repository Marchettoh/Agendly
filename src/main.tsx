import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import '@fontsource-variable/inter';
import './index.css';
import App from './App';

registerSW({ immediate: true });

// Chiede al browser di non cancellare sessione e dati offline quando lo spazio scarseggia.
navigator.storage?.persist?.().catch(() => undefined);

// iOS ignora user-scalable=no: blocca il pinch-zoom anche lì.
document.addEventListener('gesturestart', (e) => e.preventDefault());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
