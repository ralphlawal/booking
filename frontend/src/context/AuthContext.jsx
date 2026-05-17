import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  // Keep stored token fresh — Firebase rotates ID tokens every hour
  useEffect(() => {
    const unsub = onIdTokenChanged(auth, async (fbUser) => {
      if (fbUser) {
        const token = await fbUser.getIdToken();
        localStorage.setItem('fbToken', token);
      } else {
        localStorage.removeItem('fbToken');
      }
    });
    return unsub;
  }, []);

  // Restore session on mount
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setBusiness(null);
        setLoading(false);
        return;
      }
      try {
        const token = await fbUser.getIdToken();
        localStorage.setItem('fbToken', token);
        const data = await authAPI.firebaseSync(token, fbUser.displayName);
        setUser(data.user);
        setBusiness(data.business || null);
      } catch {
        setUser(null);
        setBusiness(null);
      } finally {
        setLoading(false);
      }
    });
    return unsub;
  }, []);

  const login = async (email, password) => {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdToken();
    localStorage.setItem('fbToken', token);
    const data = await authAPI.firebaseSync(token, cred.user.displayName);
    setUser(data.user);
    setBusiness(data.business || null);
    return data;
  };

  const register = async (email, password, full_name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: full_name });
    const token = await cred.user.getIdToken();
    localStorage.setItem('fbToken', token);
    const data = await authAPI.firebaseSync(token, full_name);
    setUser(data.user);
    setBusiness(data.business || null);
    return data;
  };

  const logout = async () => {
    await signOut(auth);
    localStorage.removeItem('fbToken');
    setUser(null);
    setBusiness(null);
  };

  const forgotPassword = (email) => sendPasswordResetEmail(auth, email);

  const updateBusiness = (biz) => setBusiness(biz);

  return (
    <AuthContext.Provider value={{ user, business, loading, login, register, logout, forgotPassword, updateBusiness }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
