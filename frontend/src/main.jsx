import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { isNativeApp } from './config/platform';

if (isNativeApp()) document.documentElement.classList.add('native-app');

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
