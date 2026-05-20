import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, getIdToken, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { consumerAPI } from '../services/api';

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
        if (err.status === 401) {
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
    const { consumer: c, token } = await consumerAPI.register(data);
    localStorage.setItem(TOKEN_KEY, token);
    setConsumer(c);
    saveCache(c);
    return c;
  };

  const login = async (email, password) => {
    const { consumer: c, token } = await consumerAPI.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setConsumer(c);
    saveCache(c);
    return c;
  };

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const idToken = await getIdToken(result.user);
    const { consumer: c, token } = await consumerAPI.googleAuth(idToken);
    localStorage.setItem(TOKEN_KEY, token);
    setConsumer(c);
    saveCache(c);
    return c;
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY);
    clearCache();
    setConsumer(null);
    try { await signOut(auth); } catch { /* ignore */ }
  };

  const update = async (data) => {
    const updated = await consumerAPI.updateMe(data);
    if (updated) {
      setConsumer(updated);
      saveCache(updated);
    }
    return updated;
  };

  return (
    <CustomerAuthContext.Provider value={{ consumer, loading, register, login, googleLogin, logout, update }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export const useCustomerAuth = () => useContext(CustomerAuthContext);
