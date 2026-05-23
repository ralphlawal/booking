import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, ArrowLeft, Headphones, ChevronLeft } from 'lucide-react';
import { consumerChatAPI } from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useNotifications } from '../../context/NotificationContext';
import ChatWindow from '../../components/chat/ChatWindow';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function RoomRow({ room, active, onClick }) {
  const isSupport = room.type === 'admin_consumer';
  const label = isSupport ? 'BookAm Support' : (room.business_name || 'Business');
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b border-gray-50 dark:border-gray-800 last:border-0 transition-colors ${
        active ? 'bg-primary-50 dark:bg-primary-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
        isSupport
          ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600'
          : 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400'
      }`}>
        {isSupport ? <Headphones className="w-5 h-5" /> : (label[0] || '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{label}</p>
          <span className="text-[10px] text-gray-400 flex-shrink-0">{fmtTime(room.last_message_at)}</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{room.last_message || 'No messages yet'}</p>
      </div>
    </button>
  );
}

export default function ConsumerMessages() {
  const { consumer, loading: authLoading } = useCustomerAuth();
  const { markAllRead } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(searchParams.get('room') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    markAllRead();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!consumer) { navigate('/customer/login'); return; }
    consumerChatAPI.getRooms()
      .then(setRooms)
      .catch(() => toast.error('Failed to load messages'))
      .finally(() => setLoading(false));

    const poll = setInterval(() => {
      consumerChatAPI.getRooms().then(setRooms).catch(() => {});
    }, 8000);
    return () => clearInterval(poll);
  }, [consumer, authLoading]);

  const openSupport = async () => {
    try {
      const room = await consumerChatAPI.createRoom({ type: 'admin_consumer', subject: 'Customer Support' });
      setRooms(prev => prev.find(r => r.id === room.id) ? prev : [room, ...prev]);
      setActiveRoom(room.id);
    } catch { toast.error('Failed to open support chat'); }
  };

  const activeRoomData = rooms.find(r => r.id === activeRoom);
  const chatTitle = activeRoomData?.type === 'admin_consumer' ? 'BookAm Support' : (activeRoomData?.business_name || 'Business');

  if (authLoading || !consumer) return null;

  // On mobile: show either list or chat. On desktop: side-by-side.
  const showingChat = !!activeRoom;

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-950" style={{ height: '100dvh' }}>
      {/* Nav */}
      <nav className="flex-shrink-0 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          {/* Mobile: show back to list when in a chat */}
          {showingChat ? (
            <button
              onClick={() => setActiveRoom(null)}
              className="md:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <Link to="/customer/dashboard" className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500">
              <ArrowLeft className="w-4 h-4" />
            </Link>
          )}
          <img src={LOGO_BLUE_H} alt="BookAm" className="h-7 w-auto object-contain dark:brightness-0 dark:invert" />
          <span className="font-bold text-gray-900 dark:text-white">
            {showingChat ? chatTitle : 'Messages'}
          </span>
        </div>
      </nav>

      {/* Body — flex-1 fills remaining space between nav and bottom nav */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Room list — always visible on md+, hidden on mobile when chat open */}
        <div className={`${showingChat ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-shrink-0 flex-col bg-white dark:bg-gray-900 border-r border-gray-100 dark:border-gray-800`}>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No conversations yet</p>
                <p className="text-xs mt-1">Contact support to get started</p>
                <button
                  onClick={openSupport}
                  className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl px-4 py-2.5 transition-colors"
                >
                  <Headphones className="w-4 h-4" /> Contact Support
                </button>
              </div>
            ) : (
              rooms.map(room => (
                <RoomRow key={room.id} room={room} active={room.id === activeRoom} onClick={() => setActiveRoom(room.id)} />
              ))
            )}
          </div>
          <div className="p-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
            <button
              onClick={openSupport}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 rounded-xl py-2.5 transition-colors"
            >
              <Headphones className="w-4 h-4" /> Contact Support
            </button>
          </div>
        </div>

        {/* Chat — always visible on md+, visible on mobile only when chat open */}
        <div className={`${showingChat ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col`}>
          {activeRoom ? (
            <ChatWindow
              roomId={activeRoom}
              currentSenderType="consumer"
              fetchMessages={consumerChatAPI.getMessages}
              sendMessage={consumerChatAPI.sendMessage}
              title={chatTitle}
              subtitle={activeRoomData?.type === 'admin_consumer' ? 'BookAm platform support' : undefined}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-gray-400 bg-gray-50 dark:bg-gray-950">
              <MessageSquare className="w-12 h-12 mb-3 text-gray-300" />
              <p className="font-semibold text-gray-600 dark:text-gray-300">Select a conversation</p>
              <p className="text-sm mt-1">Message businesses or contact our support team</p>
            </div>
          )}
        </div>
      </div>

      <ConsumerBottomNav />
    </div>
  );
}
