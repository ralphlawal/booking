import { useEffect, useState } from 'react';

export default function OfflineNotice() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [restored, setRestored] = useState(false);
  useEffect(() => {
    const offline = () => { setOnline(false); setRestored(false); };
    const back = () => { setOnline(true); setRestored(true); window.setTimeout(() => setRestored(false), 2600); };
    window.addEventListener('offline', offline); window.addEventListener('online', back);
    return () => { window.removeEventListener('offline', offline); window.removeEventListener('online', back); };
  }, []);
  if (online && !restored) return null;
  return <div role="status" className={`fixed top-0 inset-x-0 z-[100] px-4 py-2 text-center text-sm font-semibold text-white animate-fade-in ${online ? 'bg-emerald-600' : 'bg-amber-600'}`} style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top, 0px))' }}>{online ? 'You’re back online.' : 'You’re offline. Changes may not be saved until you reconnect.'}</div>;
}
