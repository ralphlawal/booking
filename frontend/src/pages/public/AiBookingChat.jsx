import React, { useState, useRef, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Send, ArrowLeft, Sparkles, Calendar, Clock, User, Phone, CheckCircle } from 'lucide-react';
import { aiAPI, bookingsAPI, businessAPI } from '../../services/api';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';

const STARTERS = [
  'I need a haircut this week',
  'Book me in for tomorrow morning',
  'What services do you offer?',
  'I\'d like to book for Saturday',
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center flex-shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

function BookingCard({ data, onConfirm, confirming }) {
  return (
    <div className="mt-3 bg-gradient-to-br from-primary-50 to-violet-50 dark:from-primary-900/20 dark:to-violet-900/20 border border-primary-200 dark:border-primary-800 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircle className="w-4 h-4 text-primary-600 dark:text-primary-400" />
        <p className="text-sm font-bold text-primary-700 dark:text-primary-300">Ready to book</p>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2.5">
          <p className="text-gray-400 mb-0.5">Service</p>
          <p className="font-semibold text-gray-900 dark:text-white">{data.service_name}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2.5">
          <p className="text-gray-400 mb-0.5">Date</p>
          <p className="font-semibold text-gray-900 dark:text-white">{data.booking_date}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2.5">
          <p className="text-gray-400 mb-0.5">Time</p>
          <p className="font-semibold text-gray-900 dark:text-white">{data.start_time}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2.5">
          <p className="text-gray-400 mb-0.5">Name</p>
          <p className="font-semibold text-gray-900 dark:text-white truncate">{data.customer_name}</p>
        </div>
      </div>
      <button
        onClick={onConfirm}
        disabled={confirming}
        className="btn-primary w-full py-3 text-sm"
      >
        {confirming ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Confirming…
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Calendar className="w-4 h-4" />
            Confirm this booking
          </span>
        )}
      </button>
    </div>
  );
}

function Message({ msg, slug, onBookingConfirmed }) {
  const [confirming, setConfirming] = useState(false);
  const isAI = msg.role === 'assistant';

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const result = await bookingsAPI.create(slug, {
        service_id:    msg.booking_data.service_id,
        booking_date:  msg.booking_data.booking_date,
        start_time:    msg.booking_data.start_time,
        customer_name: msg.booking_data.customer_name,
        customer_phone: msg.booking_data.customer_phone,
        customer_email: msg.booking_data.customer_email || '',
        notes: msg.booking_data.notes || '',
      });
      toast.success('Booking confirmed!');
      onBookingConfirmed(result);
    } catch (err) {
      toast.error(err.message || 'Could not create booking — try a different time');
    } finally {
      setConfirming(false);
    }
  };

  if (isAI) {
    return (
      <div className="flex items-end gap-2">
        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-primary-600 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="max-w-[80%]">
          <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
            {msg.content}
          </div>
          {msg.booking_data && (
            <BookingCard
              data={msg.booking_data}
              onConfirm={handleConfirm}
              confirming={confirming}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end">
      <div className="max-w-[80%] bg-primary-600 text-white rounded-2xl rounded-br-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
        {msg.content}
      </div>
    </div>
  );
}

export default function AiBookingChat() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [loadingBiz, setLoadingBiz] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [booked, setBooked] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    businessAPI.getPublic(slug)
      .then(b => {
        setBusiness(b);
        // Seed with opening message
        setMessages([{
          role: 'assistant',
          content: `Hi! I'm the AI booking assistant for ${b.name}.\n\nWhat would you like to book, and when works best for you?`,
          booking_data: null,
        }]);
      })
      .catch(() => toast.error('Business not found'))
      .finally(() => setLoadingBiz(false));
  }, [slug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const sendMessage = async (text) => {
    const content = (text || input).trim();
    if (!content || thinking) return;
    setInput('');

    const userMsg = { role: 'user', content };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setThinking(true);

    try {
      // Build OpenRouter-format messages (exclude booking_data from payload)
      const payload = newMessages.map(m => ({ role: m.role, content: m.content }));
      const { reply, booking_data } = await aiAPI.chat(slug, payload);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply,
        booking_data: booking_data || null,
      }]);
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: "I'm having trouble connecting right now. Please try again in a moment, or use the standard booking form.",
        booking_data: null,
      }]);
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleBookingConfirmed = (result) => {
    setBooked(result);
    navigate(`/booking-success/${result.reference_id}`);
  };

  if (loadingBiz) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <button
            onClick={() => navigate(`/profile/${slug}`)}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          {/* Business info */}
          <div className="flex items-center gap-2.5 flex-1 min-w-0">
            <div className="w-9 h-9 rounded-xl overflow-hidden bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              {business?.logo_url
                ? <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
                : <span className="text-base font-bold text-primary-600">{business?.name?.[0]}</span>
              }
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{business?.name}</p>
              <div className="flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-violet-500" />
                <p className="text-xs text-violet-600 dark:text-violet-400 font-medium">AI Booking Assistant</p>
              </div>
            </div>
          </div>

          <Link to={`/book/${slug}`} className="text-xs text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors flex-shrink-0">
            Standard form
          </Link>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">

          {/* Starter prompts — shown before user sends anything */}
          {messages.length === 1 && (
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {STARTERS.map(s => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="text-xs px-3 py-2 rounded-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400 hover:text-primary-600 dark:hover:text-primary-400 transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, i) => (
            <Message
              key={i}
              msg={msg}
              slug={slug}
              onBookingConfirmed={handleBookingConfirmed}
            />
          ))}

          {thinking && <TypingIndicator />}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              className="flex-1 resize-none bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all max-h-32 overflow-y-auto"
              placeholder="Type what you need…"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || thinking}
              className="w-11 h-11 rounded-2xl bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-all flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-300 dark:text-gray-600 mt-2">
            Powered by AI · Responses may not be perfect — always verify your confirmation email
          </p>
        </div>
      </div>
    </div>
  );
}
