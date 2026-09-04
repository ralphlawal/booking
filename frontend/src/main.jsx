import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { isNativeApp } from './config/platform';
import { hydratePersistentStore } from './services/persistentStore';
import { loadAnalytics } from './utils/analytics';

if (isNativeApp()) document.documentElement.classList.add('native-app');

// Rehydrate auth tokens from native storage before first render so the app
// doesn't flash the sign-in screen (or stay logged out) on iOS cold launch.
// Cap the wait so a stalled native bridge can never leave a white screen —
// hydration keeps running in the background and the in-memory mirror + resume
// re-sync cover anything that lands late.
let rendered = false;
const renderApp = () => {
  if (rendered) return;
  rendered = true;
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};
hydratePersistentStore().finally(renderApp);
setTimeout(renderApp, 2500);
loadAnalytics();

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
