import React, { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';

function fmtTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

const BUBBLE = {
  admin:    'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
  business: 'bg-primary-600 text-white',
  consumer: 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white',
};

export default function ChatWindow({ roomId, currentSenderType, fetchMessages, sendMessage, title, subtitle }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const lastTsRef = useRef(null);
  const pollRef = useRef(null);

  const loadInitial = async () => {
    try {
      const msgs = await fetchMessages(roomId, null);
      setMessages(msgs);
      if (msgs.length) lastTsRef.current = msgs[msgs.length - 1].created_at;
    } catch {}
    setLoading(false);
  };

  const pollNew = async () => {
    try {
      const newMsgs = await fetchMessages(roomId, lastTsRef.current);
      if (newMsgs.length) {
        setMessages(prev => [...prev, ...newMsgs]);
        lastTsRef.current = newMsgs[newMsgs.length - 1].created_at;
      }
    } catch {}
  };

  useEffect(() => {
    if (!roomId) return;
    setMessages([]);
    setLoading(true);
    lastTsRef.current = null;
    loadInitial();
    pollRef.current = setInterval(pollNew, 3000);
    return () => clearInterval(pollRef.current);
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setInput('');
    try {
      const msg = await sendMessage(roomId, text);
      setMessages(prev => [...prev, msg]);
      lastTsRef.current = msg.created_at;
    } catch { setInput(text); }
    setSending(false);
  };

  const grouped = messages.reduce((acc, msg) => {
    const label = fmtDate(msg.created_at);
    if (!acc.length || acc[acc.length - 1].label !== label) acc.push({ label, msgs: [] });
    acc[acc.length - 1].msgs.push(msg);
    return acc;
  }, []);

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800">
      {/* Header */}
      {(title || subtitle) && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          {title && <p className="font-bold text-sm text-gray-900 dark:text-white">{title}</p>}
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-center text-gray-400 text-sm">
            No messages yet. Say hello!
          </div>
        ) : (
          grouped.map(group => (
            <div key={group.label}>
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
                <span className="text-xs text-gray-400">{group.label}</span>
                <div className="flex-1 h-px bg-gray-100 dark:bg-gray-800" />
              </div>
              {group.msgs.map((msg) => {
                const mine = msg.sender_type === currentSenderType;
                return (
                  <div key={msg.id} className={`flex ${mine ? 'justify-end' : 'justify-start'} mb-1`}>
                    <div className="max-w-[75%]">
                      {!mine && (
                        <p className="text-[10px] text-gray-400 ml-1 mb-0.5">{msg.sender_name || msg.sender_type}</p>
                      )}
                      <div className={`px-3 py-2 rounded-2xl text-sm leading-relaxed ${BUBBLE[msg.sender_type]}`}>
                        {msg.content}
                      </div>
                      <p className={`text-[10px] text-gray-400 mt-0.5 ${mine ? 'text-right mr-1' : 'ml-1'}`}>
                        {fmtTime(msg.created_at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="flex gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
        <input
          className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 outline-none focus:ring-2 focus:ring-primary-500"
          placeholder="Type a message…"
          value={input}
          onChange={e => setInput(e.target.value)}
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!input.trim() || sending}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-primary-600 text-white disabled:opacity-40 transition-opacity flex-shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
