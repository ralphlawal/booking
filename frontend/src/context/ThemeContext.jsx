import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext({ theme: 'light', toggleTheme: () => {} });

export const ThemeProvider = ({ children }) => {
  useEffect(() => {
    // Force light mode — remove any stored dark preference
    document.documentElement.classList.remove('dark');
    try { localStorage.removeItem('bookam_theme'); } catch {}
  }, []);

  return (
    <ThemeContext.Provider value={{ theme: 'light', toggleTheme: () => {} }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
