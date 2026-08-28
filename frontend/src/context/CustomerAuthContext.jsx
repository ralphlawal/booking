import React, { createContext, useContext, useState, useEffect } from 'react';
import { consumerAPI } from '../services/api';
import { registerPushNotifications } from '../services/pushNotifications';

const CustomerAuthContext = createContext(null);

const TOKEN_KEY = 'customerToken';
const CACHE_KEY = 'customerProfile';

function saveCache(c) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify(c)); } catch {}
}
function loadCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}
function clearCache() {
  try { localStorage.removeItem(CACHE_KEY); } catch {}
}

export function CustomerAuthProvider({ children }) {
  const [consumer, setConsumer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }

    consumerAPI.me()
      .then(data => {
        if (data) {
          setConsumer(data);
          saveCache(data);
        }
      })
      .catch((err) => {
        // Do not let an expired token from startup clear a token written by a
        // successful sign-in that completed while this request was in flight.
        if (err.status === 401 && localStorage.getItem(TOKEN_KEY) === token) {
          // Token is invalid or expired — clear everything
          localStorage.removeItem(TOKEN_KEY);
          clearCache();
        } else {
          // Network error or server cold-start timeout — use cached profile so the
          // user is not logged out just because the server was briefly unavailable.
          const cached = loadCache();
          if (cached) setConsumer(cached);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const register = async (data) => {
    localStorage.removeItem(TOKEN_KEY);
    clearCache();
    const { consumer: c, token } = await consumerAPI.register(data);
    localStorage.setItem(TOKEN_KEY, token);
    setConsumer(c);
    saveCache(c);
    registerPushNotifications(
      (fcmToken) => consumerAPI.registerPushToken(fcmToken, 'consumer').catch(() => {}),
    ).catch(() => {});
    return c;
  };

  const login = async (email, password) => {
    localStorage.removeItem(TOKEN_KEY);
    clearCache();
    const { consumer: c, token } = await consumerAPI.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setConsumer(c);
    saveCache(c);
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
