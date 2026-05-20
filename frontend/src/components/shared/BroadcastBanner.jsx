import React, { useEffect, useState } from 'react';
import { X, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { broadcastAPI } from '../../services/api';

const DISMISSED_KEY = 'bookam_dismissed_broadcasts';

const STYLES = {
  info:    { bg: 'bg-primary-600', text: 'text-white', icon: <Info className="w-4 h-4 flex-shrink-0" /> },
  warning: { bg: 'bg-amber-500',   text: 'text-white', icon: <AlertTriangle className="w-4 h-4 flex-shrink-0" /> },
  success: { bg: 'bg-emerald-600', text: 'text-white', icon: <CheckCircle className="w-4 h-4 flex-shrink-0" /> },
};

function getDismissed() {
  try { return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]'); } catch { return []; }
}

function addDismissed(id) {
  const current = getDismissed();
  localStorage.setItem(DISMISSED_KEY, JSON.stringify([...new Set([...current, id])]));
}

export default function BroadcastBanner() {
  const [banners, setBanners] = useState([]);

  useEffect(() => {
    const load = () => {
      broadcastAPI.getActive()
        .then(all => {
          const dismissed = getDismissed();
          setBanners(all.filter(b => !dismissed.includes(b.id)));
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 120000);
    return () => clearInterval(interval);
  }, []);

  const dismiss = (id) => {
    addDismissed(id);
    setBanners(prev => prev.filter(b => b.id !== id));
  };

  if (!banners.length) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] flex flex-col gap-0.5">
      {banners.map(b => {
        const style = STYLES[b.type] || STYLES.info;
        return (
          <div key={b.id} className={`${style.bg} ${style.text} px-4 py-3 flex items-start gap-3 text-sm`}>
            {style.icon}
            <div className="flex-1 min-w-0">
              <span className="font-semibold">{b.title}</span>
              {b.message && <span className="ml-2 opacity-90">{b.message}</span>}
            </div>
            <button
              onClick={() => dismiss(b.id)}
              className="flex-shrink-0 opacity-80 hover:opacity-100 transition-opacity p-0.5"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
