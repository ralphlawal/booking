import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, X, Send, CheckCircle, Loader2 } from 'lucide-react';
import { aiAPI, bookingsAPI } from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import toast from 'react-hot-toast';

const WELCOME = (bizName) =>
  `Hi! I'm the AI booking assistant for ${bizName}. Just tell me what you're looking for — for example: "I'd like a haircut on Saturday afternoon." I'll find the right time for you.`;

export default function AIChatBooking({ slug, businessName }) {
  const navigate = useNavigate();
  const { consumer } = useCustomerAuth();

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);       // [{role:'user'|'assistant', content}]
  const [bookingState, setBookingState] = useState({}); // extracted fields
  const [readyToBook, setReadyToBook] = useState(false);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const openChat = () => {
    setOpen(true);
    if (messages.length === 0) {
      setMessages([{ role: 'assistant', content: WELCOME(businessName) }]);
    }
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const send = async (text) => {
    const userText = (text || input).trim();
    if (!userText || thinking) return;
    setInput('');

    const newMessages = [...messages, { role: 'user', content: userText }];
    setMessages(newMessages);
    setThinking(true);

    // Only send actual conversation turns (not the welcome) to the AI
    const aiMessages = newMessages.filter(m => !(m.role === 'assistant' && m.content === WELCOME(businessName)));

    try {
      const result = await aiAPI.chatBooking(slug, aiMessages, bookingState);
      setMessages(prev => [...prev, { role: 'assistant', content: result.reply }]);
      setBookingState(result.bookingState || {});
      setReadyToBook(result.readyToBook || false);
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, I ran into an issue. Please try again or use the booking form." }]);
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const confirmBooking = async () => {
    setConfirming(true);
    try {
      const result = await bookingsAPI.create(slug, {
        service_id: bookingState.service_id,
        booking_date: bookingState.date,
        start_time: bookingState.time,
        customer_name: bookingState.customer_name || consumer?.full_name,
        customer_phone: bookingState.customer_phone || consumer?.phone,
        customer_email: bookingState.customer_email || consumer?.email || '',
        notes: 'Booked via AI chat assistant',
        consumer_id: consumer?.id || undefined,
      });
      navigate(`/booking-success/${result.reference_id}`);
    } catch (err) {
      toast.error(err.message || 'Booking failed — please try the regular booking form');
      setConfirming(false);
    }
  };

  const reset = () => {
    setMessages([{ role: 'assistant', content: WELCOME(businessName) }]);
    setBookingState({});
    setReadyToBook(false);
    setInput('');
  };

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={openChat}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-all shadow-lg shadow-violet-200 dark:shadow-violet-900/40"
      >
        <Sparkles className="w-4 h-4" />
        Book with AI
      </button>

      {/* Overlay */}
      {open && (
        <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full sm:max-w-md h-[85vh] sm:h-[600px] flex flex-col bg-white dark:bg-gray-900 sm:rounded-2xl shadow-2xl overflow-hidden animate-slide-up">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 bg-violet-600">
              <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-white font-semibold text-sm leading-none">AI Booking Assistant</p>
                <p className="text-violet-200 text-xs mt-0.5">{businessName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0 mt-0.5 mr-2">
                      <Sparkles className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                    </div>
                  )}
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    m.role === 'user'
                      ? 'bg-violet-600 text-white rounded-br-sm'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white rounded-bl-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {thinking && (
                <div className="flex justify-start items-end gap-2">
                  <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-3 h-3 text-violet-600 dark:text-violet-400" />
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}

              {/* Booking confirmation card */}
              {readyToBook && !thinking && (
                <div className="mx-2 mt-2 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                    <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Ready to book</p>
                  </div>
                  <div className="space-y-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                    {bookingState.service_name && <p><span className="font-semibold">Service:</span> {bookingState.service_name}</p>}
                    {bookingState.date && <p><span className="font-semibold">Date:</span> {new Date(bookingState.date + 'T12:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}</p>}
                    {bookingState.time && <p><span className="font-semibold">Time:</span> {bookingState.time.slice(0, 5)}</p>}
                    {bookingState.customer_name && <p><span className="font-semibold">Name:</span> {bookingState.customer_name}</p>}
                    {bookingState.customer_phone && <p><span className="font-semibold">Phone:</span> {bookingState.customer_phone}</p>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={reset} className="flex-1 py-2 text-xs font-semibold text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      Start over
                    </button>
                    <button onClick={confirmBooking} disabled={confirming} className="flex-2 flex-grow py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5">
                      {confirming ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Booking…</> : <><CheckCircle className="w-3.5 h-3.5" /> Confirm Booking</>}
                    </button>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="px-3 pb-3 pt-2 border-t border-gray-100 dark:border-gray-800">
              <div className="flex gap-2 items-end">
                <textarea
                  ref={inputRef}
                  rows={1}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Tell me what you need…"
                  className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3.5 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 dark:focus:ring-violet-900 transition-colors"
                  style={{ maxHeight: 96 }}
                  disabled={thinking || confirming}
                />
                <button
                  onClick={() => send()}
                  disabled={!input.trim() || thinking || confirming}
                  className="w-10 h-10 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white flex items-center justify-center flex-shrink-0 transition-all"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-2">Powered by Claude AI · Bookings are confirmed when you tap "Confirm"</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
