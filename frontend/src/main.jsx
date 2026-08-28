import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { isNativeApp } from './config/platform';
import { hydratePersistentStore } from './services/persistentStore';

if (isNativeApp()) document.documentElement.classList.add('native-app');

// Rehydrate auth tokens from native storage before first render so the app
// doesn't flash the sign-in screen (or stay logged out) on iOS cold launch.
hydratePersistentStore().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
