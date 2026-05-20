import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { MessageSquare, X, Send, Headphones, ChevronRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { businessChatAPI, consumerChatAPI } from '../../services/api';

// Hide on pages that already have full chat UI or a bottom nav covering this area
const HIDE_ON = [
  '/customer/messages',
  '/customer/dashboard',
  '/customer/profile',
  '/admin/messages',
  '/admin/dashboard',
  '/admin/bookings',
  '/admin/calendar',
  '/admin/services',
  '/admin/customers',
  '/admin/settings',
  '/admin/onboarding',
  '/admin-support',
];

function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function FloatingChatWidget() {
  const { pathname } = useLocation();
  const { user: bizUser } = useAuth();
  const { consumer } = useCustomerAuth();

  const [open, setOpen] = useState(false);
  const [room, setRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const lastTsRef = useRef(null);
  const pollRef = useRef(null);
  const bottomRef = useRef(null);

  const hide = HIDE_ON.some(p => pathname === p || pathname.startsWith(p));

  // Determine who is logged in and which API to use
  const isConsumer = !!consumer && !bizUser;
  const isBusiness = !!bizUser;
  const loggedIn = isConsumer || isBusiness;

  const chatAPI = isBusiness ? businessChatAPI : consumerChatAPI;
  const roomType = isBusiness ? 'admin_business' : 'admin_consumer';
  const senderType = isBusiness ? 'business' : 'consumer';

  const loadMessages = async (roomId) => {
    try {
      const msgs = await chatAPI.getMessages(roomId, null);
      setMessages(msgs);
      if (msgs.length) lastTsRef.current = msgs[msgs.length - 1].created_at;
    } catch { /* silent */ }
  };

  const pollMessages = async (roomId) => {
    if (!roomId) return;
    try {
      const newMsgs = await chatAPI.getMessages(roomId, lastTsRef.current);
      if (newMsgs.length) {
        setMessages(prev => [...prev, ...newMsgs]);
        lastTsRef.current = newMsgs[newMsgs.length - 1].created_at;
        if (!open) setUnread(n => n + newMsgs.length);
      }
    } catch { /* silent */ }
  };

  const openChat = async () => {
    setOpen(true);
    setUnread(0);
    if (!loggedIn || room) return;
    setLoading(true);
    try {
      const r = await chatAPI.createRoom({ type: roomType, subject: 'Support Chat' });
      setRoom(r);
      await loadMessages(r.id);
    } catch { /* silent */ }
    setLoading(false);
  };

  // Start polling once room is set
  useEffect(() => {
    if (!room) return;
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => pollMessages(room.id), 4000);
    return () => clearInterval(pollRef.current);
  }, [room?.id, open]);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !room || sending) return;
    setSending(true);
    setInput('');
    try {
      const msg = await chatAPI.sendMessage(room.id, text);
      setMessages(prev => [...prev, msg]);
      lastTsRef.current = msg.created_at;
    } catch { setInput(text); }
    setSending(false);
  };

  if (hide) return null;

  return (
    <>
      {/* Panel */}
      {open && (
        <div className="fixed bottom-20 right-4 sm:right-5 z-50 w-[calc(100vw-2rem)] sm:w-80 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col overflow-hidden animate-slide-up"
          style={{ height: '420px', maxHeight: 'calc(100dvh - 120px)' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-primary-600 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
              <Headphones className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-bold text-sm">BookAm Support</p>
              <p className="text-primary-200 text-xs">We reply within a few hours</p>
            </div>
            <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>

          {!loggedIn ? (
            /* Not logged in — prompt to sign in */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                <MessageSquare className="w-7 h-7 text-primary-600" />
              </div>
              <div>
                <p className="font-bold text-gray-900 dark:text-white">Chat with us</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Sign in to start a support conversation</p>
              </div>
              <div className="w-full space-y-2">
                <a href="/customer/login" className="flex items-center justify-between w-full px-4 py-2.5 bg-primary-50 dark:bg-primary-900/20 rounded-xl text-sm font-semibold text-primary-700 dark:text-primary-300 hover:bg-primary-100 transition-colors">
                  <span>Customer sign in</span><ChevronRight className="w-4 h-4" />
                </a>
                <a href="/admin/login" className="flex items-center justify-between w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 rounded-xl text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 transition-colors">
                  <span>Business sign in</span><ChevronRight className="w-4 h-4" />
                </a>
                <a href="mailto:hello@bookam.business" className="block text-center text-xs text-gray-400 hover:text-gray-600 mt-2">
                  Or email hello@bookam.business
                </a>
              </div>
            </div>
          ) : loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center gap-2 py-6">
                    <div className="w-10 h-10 rounded-full bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                      <Headphones className="w-5 h-5 text-primary-500" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">How can we help?</p>
                    <p className="text-xs text-gray-400">Send a message and we'll get back to you</p>
                  </div>
                ) : (
                  messages.map(msg => {
                    const mine = msg.sender_type === senderType;
                    return (
                      <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[80%]">
                          <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${
                            mine
                              ? 'bg-primary-600 text-white rounded-tr-sm'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-tl-sm'
                          }`}>
                            {msg.content}
                          </div>
                          <p className={`text-[10px] text-gray-400 mt-0.5 ${mine ? 'text-right' : ''}`}>
                            {fmtTime(msg.created_at)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <form onSubmit={send} className="flex gap-2 px-3 py-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
                <input
                  className="flex-1 px-3 py-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Type your message…"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  disabled={sending}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="w-9 h-9 flex items-center justify-center rounded-xl bg-primary-600 text-white disabled:opacity-40 flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          )}
        </div>
      )}

      {/* Trigger button */}
      <button
        onClick={openChat}
        title="Chat with BookAm Support"
        className="fixed bottom-5 right-4 sm:right-5 z-50 flex items-center gap-2.5 bg-primary-600 hover:bg-primary-700 active:bg-primary-800 text-white rounded-2xl shadow-xl shadow-primary-600/30 px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 text-sm font-semibold"
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          {unread > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-0.5">
              {unread}
            </span>
          )}
        </div>
        <span className="hidden sm:inline">{open ? 'Support' : 'Need help?'}</span>
      </button>
    </>
  );
}
