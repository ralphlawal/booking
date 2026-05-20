import React, { useEffect, useState } from 'react';
import { MessageSquare, Headphones, LogOut, Plus, X, ChevronLeft, Filter } from 'lucide-react';
import { adminChatAPI } from '../../services/api';
import ChatWindow from '../../components/chat/ChatWindow';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';

const TOKEN_KEY = 'adminSupportToken';

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const TYPE_LABELS = {
  business_customer: { label: 'Business ↔ Customer', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  admin_business:    { label: 'You ↔ Business',       color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  admin_consumer:    { label: 'You ↔ Customer',        color: 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' },
};

function RoomRow({ room, active, onClick }) {
  const names = [room.business_name, room.consumer_name].filter(Boolean).join(' · ');
  const meta = TYPE_LABELS[room.type];
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors ${
        active ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0 text-sm font-bold text-gray-600 dark:text-gray-300">
        {(names[0] || '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{names || 'Conversation'}</p>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtTime(room.last_message_at)}</span>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide ${meta?.color}`}>
            {meta?.label}
          </span>
          {room.last_message && <p className="text-xs text-gray-400 truncate">{room.last_message}</p>}
        </div>
      </div>
    </button>
  );
}

function NewChatModal({ onClose, onCreated }) {
  const [type, setType] = useState('admin_business');
  const [users, setUsers] = useState({ businesses: [], consumers: [] });
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    adminChatAPI.getUsers().then(setUsers).finally(() => setLoading(false));
  }, []);

  const list = type === 'admin_business' ? users.businesses : users.consumers;

  const create = async () => {
    if (!selectedId) return toast.error('Select a recipient');
    setCreating(true);
    try {
      const payload = { type, subject: type === 'admin_business' ? 'Business Support' : 'Customer Support' };
      if (type === 'admin_business') payload.business_id = selectedId;
      else payload.consumer_id = selectedId;
      const room = await adminChatAPI.createRoom(payload);
      onCreated(room);
      onClose();
    } catch { toast.error('Failed to create conversation'); }
    setCreating(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white">New Conversation</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <div className="mb-4">
          <label className="label">Chat with</label>
          <select className="input" value={type} onChange={e => { setType(e.target.value); setSelectedId(''); }}>
            <option value="admin_business">A Business</option>
            <option value="admin_consumer">A Customer</option>
          </select>
        </div>
        <div className="mb-5">
          <label className="label">{type === 'admin_business' ? 'Select business' : 'Select customer'}</label>
          {loading ? <div className="input animate-pulse h-10 bg-gray-100 dark:bg-gray-800" /> : (
            <select className="input" value={selectedId} onChange={e => setSelectedId(e.target.value)}>
              <option value="">Choose…</option>
              {list.map(u => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
            </select>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary flex-1">Cancel</button>
          <button onClick={create} disabled={creating || !selectedId} className="btn-primary flex-1 disabled:opacity-50">
            {creating ? 'Creating…' : 'Start chat'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { token } = await adminChatAPI.login(password);
      localStorage.setItem(TOKEN_KEY, token);
      onLogin();
    } catch {
      toast.error('Incorrect password');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-xs animate-fade-in">
        <div className="text-center mb-8">
          <img src={LOGO_BLUE_H} alt="BookAm" className="h-9 mx-auto mb-5 brightness-0 invert" />
          <h1 className="text-2xl font-bold text-white">Support Panel</h1>
          <p className="text-primary-200 text-sm mt-1">Admin access only</p>
        </div>
        <div className="card p-6">
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="label">Admin password</label>
              <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} autoFocus required />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function AdminSupport() {
  const [authed, setAuthed] = useState(!!localStorage.getItem(TOKEN_KEY));
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadRooms = () => adminChatAPI.getRooms().then(setRooms).catch(() => {});

  useEffect(() => {
    if (!authed) return;
    loadRooms().finally(() => setLoading(false));
    const poll = setInterval(loadRooms, 8000);
    return () => clearInterval(poll);
  }, [authed]);

  if (!authed) return <LoginScreen onLogin={() => setAuthed(true)} />;

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'admin_business', label: 'Businesses' },
    { id: 'admin_consumer', label: 'Customers' },
    { id: 'business_customer', label: 'B ↔ C' },
  ];

  const filtered = filter === 'all' ? rooms : rooms.filter(r => r.type === filter);
  const activeRoomData = rooms.find(r => r.id === activeRoom);
  const chatTitle = activeRoomData
    ? [activeRoomData.business_name, activeRoomData.consumer_name].filter(Boolean).join(' · ')
    : '';

  const showingChat = !!activeRoom;

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-950" style={{ height: '100dvh' }}>
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800">
        <div className="px-4 h-14 flex items-center gap-3">
          {/* Mobile back button when in chat */}
          {showingChat ? (
            <button
              onClick={() => setActiveRoom(null)}
              className="md:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <Headphones className="w-5 h-5 text-primary-600 dark:text-primary-400" />
          )}

          <img src={LOGO_BLUE_H} alt="BookAm" className="h-7 w-auto object-contain dark:brightness-0 dark:invert" />

          {showingChat ? (
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-gray-900 dark:text-white truncate">{chatTitle}</p>
              <p className="text-xs text-gray-400">{TYPE_LABELS[activeRoomData?.type]?.label}</p>
            </div>
          ) : (
            <span className="font-bold text-gray-900 dark:text-white">Support Panel</span>
          )}

          <div className="ml-auto flex items-center gap-2">
            {!showingChat && (
              <button
                onClick={() => setShowNew(true)}
                className="flex items-center gap-1.5 btn-primary text-xs py-2 px-3"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Chat</span>
              </button>
            )}
            <button
              onClick={() => { localStorage.removeItem(TOKEN_KEY); setAuthed(false); setActiveRoom(null); }}
              className="p-2 text-gray-400 hover:text-red-500 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Room list — full width mobile (hidden when chat open), fixed sidebar desktop */}
        <div className={`${showingChat ? 'hidden md:flex' : 'flex'} md:flex-col w-full md:w-80 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800 flex-col`}>
          {/* Filter bar */}
          <div className="flex gap-1.5 p-3 border-b border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-hide">
            {filters.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`text-xs px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors ${
                  filter === f.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Room count */}
          <div className="px-4 py-2 border-b border-gray-50 dark:border-gray-800">
            <p className="text-xs text-gray-400">{filtered.length} conversation{filtered.length !== 1 ? 's' : ''}</p>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3.5 bg-gray-100 dark:bg-gray-800 rounded w-2/3" />
                      <div className="h-2.5 bg-gray-50 dark:bg-gray-700 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
                <p className="text-sm font-medium">No conversations yet</p>
                <button onClick={() => setShowNew(true)} className="mt-3 text-xs text-primary-600 dark:text-primary-400 font-semibold">
                  Start one →
                </button>
              </div>
            ) : (
              filtered.map(room => (
                <RoomRow
                  key={room.id}
                  room={room}
                  active={room.id === activeRoom}
                  onClick={() => setActiveRoom(room.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Chat panel — hidden on mobile when showing list */}
        <div className={`${showingChat ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col p-3 md:p-4`}>
          {activeRoom ? (
            <ChatWindow
              roomId={activeRoom}
              currentSenderType="admin"
              fetchMessages={adminChatAPI.getMessages}
              sendMessage={adminChatAPI.sendMessage}
              title={null}
              subtitle={null}
            />
          ) : (
            <div className="flex-1 rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 flex flex-col items-center justify-center text-center p-8 text-gray-400">
              <Headphones className="w-16 h-16 mb-4 text-gray-200 dark:text-gray-700" />
              <p className="font-bold text-gray-700 dark:text-gray-200 text-lg">Support Panel</p>
              <p className="text-sm mt-1 text-gray-400">Select a conversation from the list, or start a new one.</p>
              <button onClick={() => setShowNew(true)} className="mt-5 btn-primary text-sm">
                <Plus className="w-4 h-4" /> New Conversation
              </button>
            </div>
          )}
        </div>
      </div>

      {showNew && (
        <NewChatModal
          onClose={() => setShowNew(false)}
          onCreated={room => {
            setRooms(prev => prev.find(r => r.id === room.id) ? prev : [room, ...prev]);
            setActiveRoom(room.id);
          }}
        />
      )}
    </div>
  );
}
