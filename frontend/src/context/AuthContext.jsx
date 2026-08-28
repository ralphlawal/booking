import React, { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { registerPushNotifications } from '../services/pushNotifications';

const AuthContext = createContext(null);

const TOKEN_KEY = 'bam_token';
const CACHE_KEY = 'bookam_biz_auth';

function saveAuthCache(user, business) {
  try { localStorage.setItem(CACHE_KEY, JSON.stringify({ user, business })); } catch {}
}
function loadAuthCache() {
  try { return JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch { return null; }
}
function clearAuthCache() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(CACHE_KEY);
    localStorage.removeItem('fbToken'); // clear any old Firebase token on logout
  } catch {}
}

function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) { setLoading(false); return; }

    // Show cached state immediately for fast UI
    const cached = loadAuthCache();
    if (cached?.user) {
      setUser(cached.user);
      setBusiness(cached.business || null);
      setLoading(false);
    }

    // Verify with server in background
    authAPI.me().then(data => {
      setUser(data.user);
      setBusiness(data.business || null);
      saveAuthCache(data.user, data.business || null);
    }).catch((err) => {
      const isNetwork = !err.status || err.status === 504;
      // A user may have signed in again while this startup session check was
      // still in flight. Only clear storage if this is still the same token;
      // otherwise an expired old session can erase a newly created one.
      if (!isNetwork && getStoredToken() === token) {
        // Token invalid — clear session
        clearAuthCache();
        setUser(null);
        setBusiness(null);
      }
    }).finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await authAPI.login(email, password);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setBusiness(data.business || null);
    saveAuthCache(data.user, data.business || null);
    registerPushNotifications(
      (fcmToken) => authAPI.registerPushToken(fcmToken, 'business').catch(() => {}),
    ).catch(() => {});
    return data;
  };

  const register = async (email, password, full_name) => {
    const data = await authAPI.register(email, password, full_name);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    saveAuthCache(data.user, null);
    registerPushNotifications(
      (fcmToken) => authAPI.registerPushToken(fcmToken, 'business').catch(() => {}),
    ).catch(() => {});
    return data;
  };

  const sendLoginOtp = (email) => authAPI.sendLoginOtp(email);

  const verifyEmailOtp = async (email, otp) => {
    const data = await authAPI.verifyEmailOtp(email, otp);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setBusiness(data.business || null);
    saveAuthCache(data.user, data.business || null);
    return data;
  };

  const sendPhoneOtp = (phone) => authAPI.sendPhoneOtp(phone);

  const verifyPhoneOtp = async (phone, otp, full_name) => {
    const data = await authAPI.verifyPhoneOtp(phone, otp, full_name);
    localStorage.setItem(TOKEN_KEY, data.token);
    setUser(data.user);
    setBusiness(data.business || null);
    saveAuthCache(data.user, data.business || null);
    return data;
  };

  const logout = () => {
    clearAuthCache();
    setUser(null);
    setBusiness(null);
  };

  const forgotPassword = (email) => authAPI.forgotPassword(email);

  const changePassword = async (currentPassword, newPassword) => {
    await authAPI.changePassword(currentPassword, newPassword);
  };

  const resendVerificationEmail = () => authAPI.resendVerification();

  const deleteAccount = async () => {
    await authAPI.deleteAccount();
    clearAuthCache();
    setUser(null);
    setBusiness(null);
  };

  const updateBusiness = (biz) => {
    setBusiness(biz);
    const cached = loadAuthCache();
    if (cached) saveAuthCache(cached.user, biz);
  };

  return (
    <AuthContext.Provider value={{
      user, business, loading,
      login, register, logout,
      sendLoginOtp, verifyEmailOtp,
      sendPhoneOtp, verifyPhoneOtp,
      forgotPassword, changePassword,
      resendVerificationEmail, deleteAccount,
      updateBusiness,
      isAuthenticated: !!user,
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
