import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/fraunces/index.css';
import '@fontsource-variable/source-sans-3/index.css';
import '@fontsource/caveat/400.css';
import './styles/tokens.css';
import './styles/app.css';
import { App } from './App';
import { StoreProvider } from './lib/store';
import { ToastProvider } from './components/ui';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <StoreProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </StoreProvider>
  </StrictMode>,
);

// Offline app shell: only registered in production builds.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      /* offline support is optional */
    });
  });
}
