import React, { createContext, useContext, useState, useEffect } from 'react';
import { consumerAPI, registerConsumerSessionRefresher } from '../services/api';
import { registerPushNotifications } from '../services/pushNotifications';
import { persistCriticalValues } from '../services/persistentStore';

const CustomerAuthContext = createContext(null);

const TOKEN_KEY = 'customerToken';
const REFRESH_TOKEN_KEY = 'customerRefreshToken';
const CACHE_KEY = 'customerProfile';

function saveCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}
function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}
function clearCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  } catch {}
}

async function saveConsumerSession(consumer, token, refreshToken) {
  const cache = JSON.stringify(consumer);
  const durableRefreshToken = refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);
  localStorage.setItem(TOKEN_KEY, token);
  if (durableRefreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, durableRefreshToken);
  localStorage.setItem(CACHE_KEY, cache);
  // Wait for the native UserDefaults write before routing away from sign-in.
  await persistCriticalValues({
    [TOKEN_KEY]: token,
    [REFRESH_TOKEN_KEY]: durableRefreshToken,
    [CACHE_KEY]: cache,
  });
}

export function CustomerAuthProvider({ children }) {
  const [consumer, setConsumer] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshConsumerSession = async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!refreshToken) throw new Error('No refresh session');
    const data = await consumerAPI.refresh(refreshToken);
    await saveConsumerSession(data.consumer, data.token, data.refreshToken);
    setConsumer(data.consumer);
    return data;
  };

  useEffect(() => {
    registerConsumerSessionRefresher(refreshConsumerSession);
    return () => registerConsumerSessionRefresher(null);
  });

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    // Mirror the business experience: render the last known profile right
    // away, then refresh it in the background. This avoids a launch spinner
    // while a mobile connection wakes up.
    const cached = loadCache();
    if (cached) {
      setConsumer(cached);
      setLoading(false);
    }

    consumerAPI.me()
      .then(data => {
        if (data) {
          setConsumer(data);
          saveCache(data);
        }
      })
      .catch(async (err) => {
        // Access token may have expired — try to restore it silently.
        if (err.status === 401 && localStorage.getItem(TOKEN_KEY) === token) {
          const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
          if (refreshToken) {
            try {
              await refreshConsumerSession();
              return;
            } catch { /* fall through — keep the cached session */ }
          }
        }
        // Never sign the user out during a cold start. A dead session will be
        // rejected on the next user-initiated request; a flaky network or a
        // transient token issue must not wipe a stored login.
        const cached = loadCache();
        if (cached) setConsumer(cached);
      })
      .finally(() => setLoading(false));
  }, []);

  const register = async (data) => {
    localStorage.removeItem(TOKEN_KEY);
    clearCache();
    const { consumer: c, token, refreshToken } = await consumerAPI.register(data);
    await saveConsumerSession(c, token, refreshToken);
    setConsumer(c);
    registerPushNotifications(
      (fcmToken) => consumerAPI.registerPushToken(fcmToken, 'consumer').catch(() => {}),
    ).catch(() => {});
    return c;
  };

  const login = async (email, password) => {
    localStorage.removeItem(TOKEN_KEY);
    clearCache();
    const { consumer: c, token, refreshToken } = await consumerAPI.login(email, password);
    await saveConsumerSession(c, token, refreshToken);
    setConsumer(c);
    registerPushNotifications(
      (fcmToken) => consumerAPI.registerPushToken(fcmToken, 'consumer').catch(() => {}),
    ).catch(() => {});
    return c;
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY);
    clearCache();
    setConsumer(null);
  };

  const update = async (data) => {
    const updated = await consumerAPI.updateMe(data);
    if (updated) {
      const merged = { ...(consumer || {}), ...updated };
      setConsumer(merged);
      saveCache(merged);
    }
    return updated;
  };

  return (
    <CustomerAuthContext.Provider value={{ consumer, loading, register, login, logout, update }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export const useCustomerAuth = () => useContext(CustomerAuthContext);
