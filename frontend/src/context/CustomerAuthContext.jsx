import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setConsumer(null);
  };

  const update = async (data) => {
    const updated = await consumerAPI.updateMe(data);
    setConsumer(updated);
    return updated;
  };

  return (
    <CustomerAuthContext.Provider value={{ consumer, loading, register, login, logout, update }}>
      {children}
    </CustomerAuthContext.Provider>
  );
}

export const useCustomerAuth = () => useContext(CustomerAuthContext);
