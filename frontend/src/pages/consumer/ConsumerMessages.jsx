import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MessageSquare, Headphones, ChevronLeft, Sparkles, Send, Loader2 } from 'lucide-react';
import { consumerChatAPI, consumerAiAPI } from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useNotifications } from '../../context/NotificationContext';
import ChatWindow from '../../components/chat/ChatWindow';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import BackButton from '../../components/shared/BackButton';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const AI_ROOM_ID = '__ai_assistant__';

function RoomRow({ room, active, onClick }) {
  const isAI = room.id === AI_ROOM_ID;
  const isSupport = room.type === 'admin_consumer';
  const label = isAI ? 'AI Assistant' : isSupport ? 'BookAm Support' : (room.business_name || 'Business');
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left border-b last:border-0 transition-colors ${
        active ? 'bg-primary-50' : 'hover:bg-gray-50'
      }`}
      style={{ borderColor: 'var(--bam-border)' }}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
        isAI
          ? 'bg-gradient-to-br from-violet-500 to-primary-600 text-white'
          : isSupport
          ? 'bg-indigo-100 text-indigo-600'
          : 'bg-primary-100 text-primary-600'
      }`}>
        {isAI ? <Sparkles className="w-5 h-5" /> : isSupport ? <Headphones className="w-5 h-5" /> : (label[0] || '?').toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-sm truncate" style={{ color: 'var(--bam-text)' }}>{label}</p>
          {!isAI && <span className="text-[10px] flex-shrink-0" style={{ color: 'var(--bam-text-muted)' }}>{fmtTime(room.last_message_at)}</span>}
        </div>
        <p className="text-xs truncate" style={{ color: 'var(--bam-text-muted)' }}>
          {isAI ? 'Ask me anything about bookings' : (room.last_message || 'No messages yet')}
        </p>
      </div>
    </button>
  );
}

function AIChat({ onBack }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Hi! I'm Amara, your BookAm assistant. I can help with bookings, answer questions, or assist with anything on the platform. What do you need?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || loading) return;
    const userMsg = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const { reply } = await consumerAiAPI.chat(history);
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I couldn't reach the server. Please try again or contact support." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* AI header */}
      <div className="flex-shrink-0 px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--bam-border)', background: 'var(--bam-surface)' }}>
        <button onClick={onBack} className="md:hidden p-1.5 -ml-1 rounded-xl hover:bg-gray-100 transition-colors" style={{ color: 'var(--bam-text-muted)' }}>
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>Amara — AI Assistant</p>
          <p className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>Powered by BookAm AI</p>
        </div>
      </div>

      {/* Message list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3" style={{ background: 'var(--bam-bg)' }}>
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {m.role === 'assistant' && (
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            )}
            <div
              className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'rounded-tr-sm text-white'
                  : 'rounded-tl-sm'
              }`}
              style={m.role === 'user'
                ? { background: 'var(--bam-primary)', color: '#fff' }
                : { background: 'var(--bam-surface)', color: 'var(--bam-text)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center flex-shrink-0 mr-2 mt-0.5">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div className="rounded-2xl rounded-tl-sm px-4 py-3" style={{ background: 'var(--bam-surface)' }}>
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: 'var(--bam-primary)' }} />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={send}
        className="flex-shrink-0 flex gap-2 p-3 border-t"
        style={{ borderColor: 'var(--bam-border)', background: 'var(--bam-surface)' }}
      >
        <input
          className="flex-1 rounded-xl px-4 py-2.5 text-sm outline-none border"
          style={{
            background: 'var(--bam-bg)',
            border: '1px solid var(--bam-border)',
            color: 'var(--bam-text)',
          }}
          placeholder="Ask Amara anything…"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-colors disabled:opacity-40"
          style={{ background: 'var(--bam-primary)' }}
        >
          <Send className="w-4 h-4 text-white" />
        </button>
      </form>
    </div>
  );
}

export default function ConsumerMessages() {
  const { consumer, loading: authLoading } = useCustomerAuth();
  const { markAllRead, markChatRead } = useNotifications();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(searchParams.get('room') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    markAllRead();
    markChatRead();
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

  const showingChat = !!activeRoom;
  const isAI = activeRoom === AI_ROOM_ID;

  // Pinned AI room always at top
  const allRooms = [{ id: AI_ROOM_ID }, ...rooms];

  return (
    <div className="flex flex-col h-consumer-viewport" style={{ background: 'var(--bam-bg)' }}>
      {/* Nav */}
      <nav
        className="flex-shrink-0 backdrop-blur border-b"
        style={{
          background: 'rgba(255,255,255,0.92)',
          borderColor: 'var(--bam-border)',
          paddingTop: 'env(safe-area-inset-top, 0px)',
        }}
      >
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          {showingChat ? (
            <button
              onClick={() => setActiveRoom(null)}
              className="md:hidden p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--bam-text-muted)' }}
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <BackButton
              fallback="/customer/dashboard"
              className="p-2 -ml-2 rounded-xl hover:bg-gray-100 transition-colors"
              style={{ color: 'var(--bam-text-muted)' }}
              iconClassName="w-4 h-4"
            >
              {null}
            </BackButton>
          )}
          <img src={LOGO_BLUE_H} alt="BookAm" className="h-7 w-auto object-contain" />
          <span className="font-bold" style={{ color: 'var(--bam-text)' }}>
            {showingChat ? (isAI ? 'AI Assistant' : chatTitle) : 'Messages'}
          </span>
        </div>
      </nav>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Room list */}
        <div
          className={`${showingChat ? 'hidden md:flex' : 'flex'} w-full md:w-72 flex-shrink-0 flex-col border-r`}
          style={{ background: 'var(--bam-surface)', borderColor: 'var(--bam-border)' }}
        >
          <div className="flex-1 overflow-y-auto">
            {/* AI Assistant always at top */}
            <RoomRow room={{ id: AI_ROOM_ID }} active={activeRoom === AI_ROOM_ID} onClick={() => setActiveRoom(AI_ROOM_ID)} />

            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'var(--bam-bg)' }} />
                ))}
              </div>
            ) : rooms.length === 0 ? (
              <div className="p-8 text-center" style={{ color: 'var(--bam-text-muted)' }}>
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium" style={{ color: 'var(--bam-text)' }}>No conversations yet</p>
                <p className="text-xs mt-1">Contact support or chat with AI</p>
                <button
                  onClick={openSupport}
                  className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold rounded-lg px-4 py-2.5 transition-colors"
                  style={{ color: 'var(--bam-primary)', background: '#ede9fe' }}
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
          <div className="p-3 border-t flex-shrink-0" style={{ borderColor: 'var(--bam-border)' }}>
            <button
              onClick={openSupport}
              className="w-full flex items-center justify-center gap-2 text-sm font-semibold rounded-lg py-2.5 transition-colors"
              style={{ color: 'var(--bam-primary)', background: '#ede9fe' }}
            >
              <Headphones className="w-4 h-4" /> Contact Support
            </button>
          </div>
        </div>

        {/* Chat area */}
        <div className={`${showingChat ? 'flex' : 'hidden md:flex'} flex-1 min-w-0 flex-col`}>
          {isAI ? (
            <AIChat onBack={() => setActiveRoom(null)} />
          ) : activeRoom ? (
            <ChatWindow
              roomId={activeRoom}
              currentSenderType="consumer"
              fetchMessages={consumerChatAPI.getMessages}
              sendMessage={consumerChatAPI.sendMessage}
              title={chatTitle}
              subtitle={activeRoomData?.type === 'admin_consumer' ? 'BookAm platform support' : undefined}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8" style={{ background: 'var(--bam-bg)', color: 'var(--bam-text-muted)' }}>
              <MessageSquare className="w-12 h-12 mb-3 opacity-20" />
              <p className="font-semibold" style={{ color: 'var(--bam-text)' }}>Select a conversation</p>
              <p className="text-sm mt-1">Chat with AI, businesses, or our support team</p>
            </div>
          )}
        </div>
      </div>

      <ConsumerBottomNav />
    </div>
  );
}
