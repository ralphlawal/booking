import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  onIdTokenChanged,
  signInWithPopup,
  GoogleAuthProvider,
  updateProfile,
  sendPasswordResetEmail,
  confirmPasswordReset,
  sendEmailVerification,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  deleteUser,
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

const AUTH_CACHE_KEY = 'bookam_biz_auth';
function saveAuthCache(user, business) {
  try { localStorage.setItem(AUTH_CACHE_KEY, JSON.stringify({ user, business })); } catch {}
}
function loadAuthCache() {
  try { return JSON.parse(localStorage.getItem(AUTH_CACHE_KEY) || 'null'); } catch { return null; }
}
function clearAuthCache() {
  try { localStorage.removeItem(AUTH_CACHE_KEY); } catch {}
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);
  const syncedUidRef = useRef(null);

  // Keep stored token fresh
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

  // Primary auth state listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      if (!fbUser) {
        clearAuthCache();
        setUser(null);
        setBusiness(null);
        syncedUidRef.current = null;
        setLoading(false);
        return;
      }
      if (syncedUidRef.current === fbUser.uid) {
        setLoading(false);
        return;
      }
      // Show cached state immediately so the UI is not blocked during cold start
      const cached = loadAuthCache();
      if (cached) {
        setUser(cached.user);
        setBusiness(cached.business);
        setLoading(false);
      }
      try {
        const token = await fbUser.getIdToken();
        localStorage.setItem('fbToken', token);
        const data = await authAPI.firebaseSync(token, fbUser.displayName);
        syncedUidRef.current = fbUser.uid;
        setUser(data.user);
        setBusiness(data.business || null);
        saveAuthCache(data.user, data.business || null);
      } catch (err) {
        const isNetworkError = !err.status || err.status === 504 || err.code === 'ECONNABORTED';
        if (isNetworkError && cached) {
          // Server is cold — keep cached session rather than logging the user out
          console.warn('[Auth] Backend unavailable on load, using cached session');
          syncedUidRef.current = fbUser.uid;
        } else {
          console.error('Session restore failed:', err.message);
          clearAuthCache();
          setUser(null);
          setBusiness(null);
        }
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
    syncedUidRef.current = cred.user.uid;
    setUser(data.user);
    setBusiness(data.business || null);
    saveAuthCache(data.user, data.business || null);
    return data;
  };

  const register = async (email, password, full_name) => {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(cred.user, { displayName: full_name });
    sendEmailVerification(cred.user).catch(() => {});
    const token = await cred.user.getIdToken(true);
    localStorage.setItem('fbToken', token);
    const data = await authAPI.firebaseSync(token, full_name);
    syncedUidRef.current = cred.user.uid;
    setUser(data.user);
    setBusiness(data.business || null);
    saveAuthCache(data.user, data.business || null);
    return data;
  };

  const googleLogin = async () => {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const token = await cred.user.getIdToken(true);
    localStorage.setItem('fbToken', token);
    const data = await authAPI.firebaseSync(token, cred.user.displayName);
    syncedUidRef.current = cred.user.uid;
    setUser(data.user);
    setBusiness(data.business || null);
    saveAuthCache(data.user, data.business || null);
    return data;
  };

  const changePassword = async (currentPassword, newPassword) => {
    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error('Not signed in');
    const credential = EmailAuthProvider.credential(fbUser.email, currentPassword);
    await reauthenticateWithCredential(fbUser, credential);
    await updatePassword(fbUser, newPassword);
  };

  const resendVerificationEmail = async () => {
    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error('Not signed in');
    await sendEmailVerification(fbUser);
  };

  const deleteAccount = async (password) => {
    const fbUser = auth.currentUser;
    if (!fbUser) throw new Error('Not signed in');
    // Reauthenticate before destructive action
    const credential = EmailAuthProvider.credential(fbUser.email, password);
    await reauthenticateWithCredential(fbUser, credential);
    // Delete from our backend first
    await authAPI.deleteAccount();
    // Delete from Firebase
    await deleteUser(fbUser);
    // Clear local state
    clearAuthCache();
    syncedUidRef.current = null;
    localStorage.removeItem('fbToken');
    setUser(null);
    setBusiness(null);
  };

  const logout = async () => {
    clearAuthCache();
    syncedUidRef.current = null;
    await signOut(auth);
    // Clear all tokens so no stale state remains
    localStorage.removeItem('fbToken');
    localStorage.removeItem('customerToken');
    setUser(null);
    setBusiness(null);
  };

  const forgotPassword = (email) => sendPasswordResetEmail(auth, email, {
    url: `${window.location.origin}/admin/login`,
  });
  const resetPasswordWithCode = (oobCode, newPassword) => confirmPasswordReset(auth, oobCode, newPassword);
  const updateBusiness = (biz) => {
    setBusiness(biz);
    const cached = loadAuthCache();
    if (cached) saveAuthCache(cached.user, biz);
  };

  return (
    <AuthContext.Provider value={{
      user, business, loading,
      login, register, googleLogin, logout, forgotPassword, resetPasswordWithCode,
      updateBusiness, changePassword, resendVerificationEmail, deleteAccount,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
};
