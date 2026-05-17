import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
  // Tracks whether login/register already synced to avoid double-calling firebase-sync
  const syncedUidRef = useRef(null);

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

  // Primary auth state listener — handles page refresh and initial load
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        setUser(null);
        setBusiness(null);
        syncedUidRef.current = null;
        setLoading(false);
        return;
      }

      // Already synced during login/register — skip the extra firebase-sync call
      if (syncedUidRef.current === fbUser.uid) {
        setLoading(false);
        return;
      }

      // Page refresh or new session — sync with our backend
      try {
        const token = await fbUser.getIdToken();
        localStorage.setItem('fbToken', token);
        const data = await authAPI.firebaseSync(token, fbUser.displayName);
        syncedUidRef.current = fbUser.uid;
        setUser(data.user);
        setBusiness(data.business || null);
      } catch (err) {
        console.error('Session restore failed:', err.message);
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
    syncedUidRef.current = cred.user.uid; // Prevent onAuthStateChanged from double-syncing
    setUser(data.user);
    setBusiness(data.business || null);
    return data;
  };

  const register = async (email, password, full_name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: full_name });
    const token = await cred.user.getIdToken(true); // force refresh after profile update
    localStorage.setItem('fbToken', token);
    const data = await authAPI.firebaseSync(token, full_name);
    syncedUidRef.current = cred.user.uid;
    setUser(data.user);
    setBusiness(data.business || null);
    return data;
  };

  const logout = async () => {
    syncedUidRef.current = null;
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
