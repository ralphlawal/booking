import React, { createContext, useContext, useState, useEffect } from 'react';
import { signInWithPopup, GoogleAuthProvider, getIdToken, signOut } from 'firebase/auth';
import { auth } from '../config/firebase';
import { consumerAPI } from '../services/api';

const CustomerAuthContext = createContext(null);

const TOKEN_KEY = 'customerToken';

export function CustomerAuthProvider({ children }) {
  const [consumer, setConsumer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) { setLoading(false); return; }
    consumerAPI.me()
      .then(setConsumer)
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  const register = async (data) => {
    const { consumer, token } = await consumerAPI.register(data);
    localStorage.setItem(TOKEN_KEY, token);
    setConsumer(consumer);
    return consumer;
  };

  const login = async (email, password) => {
    const { consumer, token } = await consumerAPI.login(email, password);
    localStorage.setItem(TOKEN_KEY, token);
    setConsumer(consumer);
    return consumer;
  };

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const idToken = await getIdToken(result.user);
    const { consumer, token } = await consumerAPI.googleAuth(idToken);
    localStorage.setItem(TOKEN_KEY, token);
    setConsumer(consumer);
    return consumer;
  };

  const logout = async () => {
    localStorage.removeItem(TOKEN_KEY);
    setConsumer(null);
    // Also sign out from Firebase so a Google-authed consumer doesn't
    // stay signed in to Firebase and accidentally enter the business dashboard
    try { await signOut(auth); } catch { /* ignore */ }
  };

  const update = async (data) => {
    const updated = await consumerAPI.updateMe(data);
    setConsumer(updated);
    return updated;
  };

  return (
    <CustomerAuthContext.Provider value={{ consumer, loading, register, login, googleLogin, logout, update }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export const useCustomerAuth = () => useContext(CustomerAuthContext);
