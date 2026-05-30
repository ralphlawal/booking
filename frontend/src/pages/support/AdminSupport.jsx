import React, { useEffect, useState } from 'react';
import { MessageSquare, Headphones, LogOut, Plus, X, ChevronLeft, AlertTriangle, CheckCircle, XCircle, RefreshCw, Bell, Trash2, BarChart2, Users, Building2, ShieldCheck, ShieldX, Ban, ToggleRight, TrendingUp, Edit2, Banknote, Copy, Check, Zap, CalendarCheck, History } from 'lucide-react';
import { adminChatAPI, adminDisputesAPI, broadcastAPI, adminPanelAPI } from '../../services/api';
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
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 animate-fade-in">
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

function DisputesPanel() {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(null);
  const [adminNotes, setAdminNotes] = useState({});

  const load = () => adminDisputesAPI.getDisputes().then(setDisputes).catch(err => toast.error(err.message || 'Failed to load disputes'));

  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const resolve = async (id, action) => {
    setResolving(id + action);
    try {
      const msg = await adminDisputesAPI.resolveDispute(id, { action, admin_notes: adminNotes[id] || '' });
      toast.success(msg.message || (action === 'refund' ? 'Refund issued' : 'Dispute rejected'));
      setDisputes(prev => prev.map(d => d.id === id ? { ...d, status: action === 'refund' ? 'resolved_refunded' : 'resolved_rejected' } : d));
    } catch (err) {
      toast.error(err.message || 'Failed to resolve dispute');
    } finally {
      setResolving(null);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-40"><div className="w-7 h-7 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" /></div>;

  const open = disputes.filter(d => d.status === 'open');
  const closed = disputes.filter(d => d.status !== 'open');

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="font-bold text-gray-900 dark:text-white">
          Disputes <span className="ml-1 text-sm font-normal text-gray-400">({open.length} open)</span>
        </h2>
        <button onClick={() => load()} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {disputes.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="font-medium">No disputes</p>
          <p className="text-sm mt-1">All clear — no customer disputes raised.</p>
        </div>
      )}

      {open.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Open disputes</p>
          {open.map(d => (
            <div key={d.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-800 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{d.customer_name || d.customer_email || 'Customer'}</p>
                  <p className="text-xs text-gray-500">{d.service_name} · {d.business_name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{d.reference_id}</p>
                </div>
                <span className="text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-1 rounded-full font-semibold">Open</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 mb-3">
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-400">Reason: {d.reason}</p>
                {d.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{d.description}</p>}
              </div>
              <div className="mb-3">
                <p className="text-xs text-gray-500 mb-1">Service: <strong>£{parseFloat(d.price || 0).toFixed(2)}</strong> · Payment: <span className={d.payment_status === 'paid' ? 'text-green-600' : 'text-gray-400'}>{d.payment_status || 'unpaid'}</span></p>
                <p className="text-xs text-gray-400">Raised {new Date(d.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
              <textarea
                className="input text-sm resize-none mb-3"
                rows={2}
                placeholder="Admin notes (optional)…"
                value={adminNotes[d.id] || ''}
                onChange={e => setAdminNotes(prev => ({ ...prev, [d.id]: e.target.value }))}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => resolve(d.id, 'reject')}
                  disabled={!!resolving}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" /> {resolving === d.id + 'reject' ? 'Rejecting…' : 'Reject'}
                </button>
                {d.stripe_payment_intent_id && (
                  <button
                    onClick={() => resolve(d.id, 'refund')}
                    disabled={!!resolving}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" /> {resolving === d.id + 'refund' ? 'Refunding…' : 'Issue refund'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {closed.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4">Resolved</p>
          {closed.map(d => (
            <div key={d.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 p-3 opacity-60">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{d.customer_name || d.customer_email}</p>
                  <p className="text-xs text-gray-400">{d.reason}</p>
                </div>
                <span className={`text-xs px-2 py-1 rounded-full font-semibold ${d.status === 'resolved_refunded' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                  {d.status === 'resolved_refunded' ? 'Refunded' : 'Rejected'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BroadcastsPanel() {
  const [broadcasts, setBroadcasts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', message: '', type: 'info', send_to_users: true });
  const [sending, setSending] = useState(false);

  const load = () => broadcastAPI.list().then(setBroadcasts).catch(err => toast.error(err.message || 'Failed to load broadcasts')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return toast.error('Title and message required');
    setSending(true);
    try {
      const result = await broadcastAPI.create(form);
      toast.success(form.send_to_users ? `Broadcast sent to ${result.recipients || 0} users` : 'Banner published');
      setForm({ title: '', message: '', type: 'info', send_to_users: true });
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  };

  const deactivate = async (id) => {
    await broadcastAPI.deactivate(id).catch(() => toast.error('Failed'));
    load();
  };

  const TYPE_OPTS = [
    { val: 'info', label: 'Info (blue)' },
    { val: 'warning', label: 'Warning (amber)' },
    { val: 'success', label: 'Success (green)' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl mx-auto w-full space-y-6">
      {/* Compose */}
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <p className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary-600" /> Send notification to all users
        </p>
        <form onSubmit={send} className="space-y-3">
          <input
            className="input"
            placeholder="Title — e.g. Scheduled maintenance on Sunday"
            value={form.title}
            onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
          />
          <textarea
            className="input resize-none"
            rows={3}
            placeholder="Message — e.g. BookAm will be briefly unavailable on Sunday 25 May between 2–3am GMT for scheduled maintenance."
            value={form.message}
            onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
          />
          <div className="flex gap-2 items-center">
            <select
              className="input flex-1"
              value={form.type}
              onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
            >
              {TYPE_OPTS.map(o => <option key={o.val} value={o.val}>{o.label}</option>)}
            </select>
            <button type="submit" disabled={sending} className="btn-primary px-6 disabled:opacity-50">
              {sending ? 'Sending…' : 'Broadcast'}
            </button>
          </div>
          <label className="flex items-start gap-2 text-xs text-gray-500 dark:text-gray-400">
            <input
              type="checkbox"
              className="mt-0.5 w-4 h-4 rounded accent-primary-600"
              checked={form.send_to_users}
              onChange={e => setForm(p => ({ ...p, send_to_users: e.target.checked }))}
            />
            Also add this to every customer notification inbox and trigger phone/browser alerts where users allowed notifications.
          </label>
        </form>
      </div>

      {/* History */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Broadcast history</p>
        {loading ? (
          <div className="text-center text-sm text-gray-400 py-8">Loading…</div>
        ) : broadcasts.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8">No broadcasts yet</div>
        ) : (
          <div className="space-y-2">
            {broadcasts.map(b => (
              <div key={b.id} className={`bg-white dark:bg-gray-900 rounded-xl border p-3 flex items-start gap-3 ${b.is_active ? 'border-gray-100 dark:border-gray-800' : 'border-gray-50 dark:border-gray-900 opacity-50'}`}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${b.type === 'warning' ? 'bg-amber-100 text-amber-700' : b.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-primary-100 text-primary-700'}`}>{b.type}</span>
                    {!b.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-gray-100 text-gray-500">Inactive</span>}
                  </div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">{b.title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{b.message}</p>
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                {b.is_active && (
                  <button onClick={() => deactivate(b.id)} className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatsPanel() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => adminPanelAPI.getStats().then(setStats).catch(err => toast.error(err.message || 'Failed to load stats'));
  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const cards = stats ? [
    { label: 'Businesses', value: stats.businesses, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300', icon: <Building2 className="w-5 h-5" /> },
    { label: 'Customers', value: stats.consumers, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300', icon: <Users className="w-5 h-5" /> },
    { label: 'Total Bookings', value: stats.bookings, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300', icon: <CheckCircle className="w-5 h-5" /> },
    { label: 'Bookings This Week', value: stats.bookings_this_week, color: 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300', icon: <BarChart2 className="w-5 h-5" /> },
    { label: 'Revenue (paid)', value: `£${stats.revenue}`, color: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300', icon: <CheckCircle className="w-5 h-5" /> },
    { label: 'Pending Verifications', value: stats.pending_verifications, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300', icon: <AlertTriangle className="w-5 h-5" /> },
  ] : [];

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-bold text-gray-900 dark:text-white text-lg">Platform Overview</h2>
        <button onClick={() => { setLoading(true); load().finally(() => setLoading(false)); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {cards.map(c => (
            <div key={c.label} className={`${c.color} rounded-2xl p-4 flex flex-col gap-2`}>
              {c.icon}
              <p className="text-2xl font-black">{c.value}</p>
              <p className="text-xs font-semibold opacity-70">{c.label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BusinessesPanel({ onStartChat }) {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [acting, setActing] = useState(null);
  const [editTarget, setEditTarget] = useState(null);

  const load = () => adminPanelAPI.getBusinesses().then(setBusinesses).catch(err => toast.error(err.message || 'Failed to load businesses'));
  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const verify = async (id, name) => {
    setActing(id + 'verify');
    try {
      await adminPanelAPI.verifyBusiness(id);
      toast.success(`${name} verified`);
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, is_verified: true, verification_status: 'verified' } : b));
    } catch (err) { toast.error(err.message || 'Failed'); }
    setActing(null);
  };

  const reject = async (id, name) => {
    setActing(id + 'reject');
    try {
      await adminPanelAPI.rejectVerification(id);
      toast.success(`Verification rejected for ${name}`);
      setBusinesses(prev => prev.map(b => b.id === id ? { ...b, verification_status: 'rejected' } : b));
    } catch (err) { toast.error(err.message || 'Failed'); }
    setActing(null);
  };

  const toggleSuspend = async (biz) => {
    const newActive = !biz.is_active;
    setActing(biz.id + 'suspend');
    try {
      await adminPanelAPI.suspendBusiness(biz.id, newActive);
      toast.success(`${biz.name} ${newActive ? 'reactivated' : 'suspended'}`);
      setBusinesses(prev => prev.map(b => b.id === biz.id ? { ...b, is_active: newActive } : b));
    } catch (err) { toast.error(err.message || 'Failed'); }
    setActing(null);
  };

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'pending', label: 'Pending' },
    { id: 'verified', label: 'Verified' },
    { id: 'unverified', label: 'Unverified' },
  ];

  const filtered = businesses.filter(b => {
    if (filter === 'pending') return b.verification_status === 'pending';
    if (filter === 'verified') return b.is_verified;
    if (filter === 'unverified') return !b.is_verified;
    return true;
  });

  const verifyBadge = (b) => {
    if (b.is_verified) return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Verified</span>;
    if (b.verification_status === 'pending') return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Pending</span>;
    if (b.verification_status === 'rejected') return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400">Rejected</span>;
    return <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-500">Unverified</span>;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-white">Businesses <span className="text-sm font-normal text-gray-400">({filtered.length})</span></h2>
        <button onClick={() => { setLoading(true); load().finally(() => setLoading(false)); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {filters.map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold whitespace-nowrap transition-colors flex-shrink-0 ${filter === f.id ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Building2 className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" /><p>No businesses</p></div>
      ) : (
        <div className="space-y-3">
          {filtered.map(b => (
            <div key={b.id} className={`bg-white dark:bg-gray-900 rounded-2xl border p-4 shadow-sm ${!b.is_active ? 'opacity-50 border-gray-100 dark:border-gray-800' : b.verification_status === 'pending' ? 'border-amber-200 dark:border-amber-800' : 'border-gray-100 dark:border-gray-800'}`}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{b.name}</p>
                    {verifyBadge(b)}
                    {!b.is_active && <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-red-100 text-red-600">Suspended</span>}
                  </div>
                  <p className="text-xs text-gray-500">@{b.slug} · {b.category || 'Uncategorised'}</p>
                  {b.location && <p className="text-xs text-gray-400 mt-0.5">{b.location}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{b.email} · {parseInt(b.total_bookings)} bookings</p>
                </div>
                <p className="text-[10px] text-gray-400 flex-shrink-0">{new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>

              {b.verification_status === 'pending' && b.verification_details && (
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-3 text-xs space-y-0.5">
                  <p className="font-semibold text-amber-800 dark:text-amber-300 mb-1">Verification request</p>
                  {b.verification_details.legal_name && <p className="text-amber-700 dark:text-amber-400"><span className="font-medium">Legal name:</span> {b.verification_details.legal_name}</p>}
                  {b.verification_details.company_reg_number && <p className="text-amber-700 dark:text-amber-400"><span className="font-medium">Reg no:</span> {b.verification_details.company_reg_number}</p>}
                  {b.verification_details.sole_trader && <p className="text-amber-700 dark:text-amber-400">Sole trader declaration</p>}
                  {b.verification_details.business_address && <p className="text-amber-700 dark:text-amber-400"><span className="font-medium">Address:</span> {b.verification_details.business_address}</p>}
                </div>
              )}

              <div className="flex gap-2 flex-wrap">
                {b.verification_status === 'pending' && (
                  <>
                    <button
                      onClick={() => verify(b.id, b.name)}
                      disabled={!!acting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> {acting === b.id + 'verify' ? 'Verifying…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => reject(b.id, b.name)}
                      disabled={!!acting}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                    >
                      <ShieldX className="w-3.5 h-3.5" /> {acting === b.id + 'reject' ? 'Rejecting…' : 'Reject'}
                    </button>
                  </>
                )}
                {!b.is_verified && b.verification_status !== 'pending' && (
                  <button
                    onClick={() => verify(b.id, b.name)}
                    disabled={!!acting}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-xs font-semibold hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors disabled:opacity-50"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Force verify
                  </button>
                )}
                <button
                  onClick={() => toggleSuspend(b)}
                  disabled={!!acting}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-colors disabled:opacity-50 ${b.is_active ? 'border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                >
                  {b.is_active ? <Ban className="w-3.5 h-3.5" /> : <ToggleRight className="w-3.5 h-3.5" />}
                  {acting === b.id + 'suspend' ? 'Updating…' : b.is_active ? 'Suspend' : 'Reactivate'}
                </button>
                <button
                  onClick={() => setEditTarget(b)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 text-xs font-semibold hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <button
                  onClick={() => onStartChat?.({ type: 'admin_business', business_id: b.id, subject: 'Business Support' })}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400 text-xs font-semibold hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> Message
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editTarget && (
        <EditBusinessModal
          business={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={(updated) => {
            setBusinesses(prev => prev.map(b => b.id === updated.id ? { ...b, ...updated } : b));
            setEditTarget(null);
          }}
        />
      )}
    </div>
  );
}

function FinancialPanel() {
  const [period, setPeriod] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = (p) => {
    setLoading(true);
    adminPanelAPI.getFinancialReport(p).then(setData).catch(() => toast.error('Failed to load report')).finally(() => setLoading(false));
  };
  useEffect(() => { load(period); }, []);

  const fmt = (v) => `£${parseFloat(v || 0).toFixed(2)}`;
  const summary = data?.payment_summary || {};

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-3xl mx-auto w-full space-y-5">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-600" /> Financial Report</h2>
        <div className="flex gap-1.5 flex-wrap items-center">
          <ReconcileButton />
          {[7, 30, 90].map(d => (
            <button key={d} onClick={() => { setPeriod(d); load(d); }}
              className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors ${period === d ? 'bg-primary-600 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : !data ? (
        <p className="text-center text-gray-400 py-12">No data available</p>
      ) : (
        <>
          {/* Summary totals */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-green-50 dark:bg-green-900/20 rounded-2xl p-4">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wide mb-1">Total Revenue</p>
              <p className="text-2xl font-black text-green-800 dark:text-green-300">{fmt(data.revenue_by_day?.reduce((s, r) => s + parseFloat(r.revenue || 0), 0))}</p>
              <p className="text-xs text-green-600 dark:text-green-500 mt-1">Last {period} days</p>
            </div>
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">Paid Bookings</p>
              <p className="text-2xl font-black text-blue-800 dark:text-blue-300">{data.revenue_by_day?.reduce((s, r) => s + parseInt(r.paid_bookings || 0), 0) || 0}</p>
              <p className="text-xs text-blue-600 dark:text-blue-500 mt-1">Last {period} days</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Booked Value</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{fmt(summary.booked_value)}</p>
              <p className="text-xs text-gray-400 mt-1">Paid + unpaid services</p>
            </div>
            <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Payment Status</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white">{parseInt(summary.paid || 0)} paid · {parseInt(summary.unpaid || 0)} unpaid</p>
              <p className="text-xs text-gray-400 mt-1">{parseInt(summary.refunded || 0)} refunded · {parseInt(summary.other || 0)} other</p>
            </div>
          </div>

          {/* Revenue by day */}
          {data.revenue_by_day?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Revenue by day</p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {[...data.revenue_by_day].reverse().map(r => (
                  <div key={r.day} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <span className="text-gray-500 text-xs">{new Date(r.day).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-gray-400">{r.paid_bookings} paid</span>
                      <span className="font-bold text-gray-900 dark:text-white">{fmt(r.revenue)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top businesses */}
          {data.top_businesses?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Top businesses by revenue</p>
              <div className="space-y-2">
                {data.top_businesses.map((b, i) => (
                  <div key={b.business_id} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-white truncate">{b.name}</p>
                    <span className="text-xs text-gray-400">{b.paid_bookings} bookings</span>
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">{fmt(b.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top services */}
          {data.top_services?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Top services</p>
              <div className="space-y-2">
                {data.top_services.map((s, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-white truncate">{s.service_name}</p>
                    <span className="text-xs text-gray-400">{s.bookings} bookings</span>
                    <span className="text-sm font-bold text-green-700 dark:text-green-400">{fmt(s.revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent transactions */}
          {data.recent_payments?.length > 0 && (
            <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Recent transactions</p>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {data.recent_payments.map(p => (
                  <div key={p.id} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{p.business_name}</p>
                      <p className="text-[10px] text-gray-400">{p.service_name} · {new Date(p.booking_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {p.payment_status || 'unpaid'}</p>
                    </div>
                    <span className={`font-bold ml-3 ${p.payment_status === 'paid' ? 'text-green-700 dark:text-green-400' : p.payment_status === 'refunded' ? 'text-amber-700 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>{fmt(p.price)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PlatformBookingsPanel() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: 'all', payment_status: 'all', q: '' });
  const [acting, setActing] = useState(null);

  const load = () => {
    setLoading(true);
    adminPanelAPI.getPlatformBookings({ ...filters, limit: 150 })
      .then(setBookings)
      .catch(err => toast.error(err.message || 'Failed to load bookings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const update = async (booking, patch) => {
    setActing(booking.id);
    try {
      const updated = await adminPanelAPI.updatePlatformBooking(booking.id, patch);
      setBookings(prev => prev.map(b => b.id === booking.id ? { ...b, ...updated } : b));
      toast.success('Booking updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update booking');
    } finally {
      setActing(null);
    }
  };

  const fmt = (v) => `£${parseFloat(v || 0).toFixed(2)}`;
  const statusTone = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
    confirmed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white">All Bookings <span className="text-sm font-normal text-gray-400">({bookings.length})</span></h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Search and correct booking/payment status across the whole platform.</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2">
        <input
          className="input"
          placeholder="Search ref, business, customer, email..."
          value={filters.q}
          onChange={e => setFilters(p => ({ ...p, q: e.target.value }))}
          onKeyDown={e => { if (e.key === 'Enter') load(); }}
        />
        <select className="input sm:w-36" value={filters.status} onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}>
          <option value="all">All status</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select className="input sm:w-36" value={filters.payment_status} onChange={e => setFilters(p => ({ ...p, payment_status: e.target.value }))}>
          <option value="all">All payments</option>
          <option value="unpaid">Unpaid</option>
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="refunded">Refunded</option>
        </select>
        <button onClick={load} className="btn-primary px-5">Filter</button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : bookings.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><CalendarCheck className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" /><p>No bookings found</p></div>
      ) : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold text-sm text-gray-900 dark:text-white">{b.business_name}</p>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${statusTone[b.status] || 'bg-gray-100 text-gray-500'}`}>{b.status}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-500">{b.payment_status || 'unpaid'}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{b.service_name} · {fmt(b.service_price)} · {b.customer_name || 'Customer'}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{b.booking_date} · {b.start_time} - {b.end_time} · {b.customer_email || 'no email'}</p>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">{b.reference_id}</p>
                </div>
                <p className="text-[10px] text-gray-400 flex-shrink-0">{new Date(b.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 mt-3">
                <select
                  className="input text-sm"
                  value={b.status || 'pending'}
                  disabled={acting === b.id}
                  onChange={e => update(b, { status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  className="input text-sm"
                  value={b.payment_status || 'unpaid'}
                  disabled={acting === b.id}
                  onChange={e => update(b, { payment_status: e.target.value })}
                >
                  <option value="unpaid">Unpaid</option>
                  <option value="pending">Payment pending</option>
                  <option value="paid">Paid</option>
                  <option value="refunded">Refunded</option>
                </select>
                <button
                  onClick={() => navigator.clipboard?.writeText(b.reference_id).then(() => toast.success('Reference copied'))}
                  className="btn-secondary text-xs flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" /> Copy ref
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AuditPanel() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminPanelAPI.getAuditLogs()
      .then(setLogs)
      .catch(err => toast.error(err.message || 'Failed to load audit logs'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-4xl mx-auto w-full space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><History className="w-5 h-5 text-primary-600" /> Audit Trail</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Sensitive admin changes are recorded here for launch safety.</p>
        </div>
        <button onClick={load} className="btn-secondary text-xs flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(8)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><History className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" /><p>No audit activity yet</p></div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{log.action}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{log.target_type || 'platform'}{log.target_id ? ` · ${log.target_id}` : ''}</p>
                  {log.details && Object.keys(log.details).length > 0 && (
                    <p className="text-[11px] text-gray-400 mt-1 truncate">{JSON.stringify(log.details)}</p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-[10px] text-gray-400">{new Date(log.created_at).toLocaleString('en-GB')}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{log.admin_role || 'admin'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LaunchReadinessPanel() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    adminPanelAPI.getLaunchReadiness()
      .then(setData)
      .catch(err => toast.error(err.message || 'Failed to load launch readiness'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const tone = {
    ready: 'border-green-100 dark:border-green-900/50 bg-green-50 dark:bg-green-900/15 text-green-700 dark:text-green-300',
    warning: 'border-amber-100 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-900/15 text-amber-700 dark:text-amber-300',
    blocked: 'border-red-100 dark:border-red-900/50 bg-red-50 dark:bg-red-900/15 text-red-700 dark:text-red-300',
  };
  const icon = {
    ready: <CheckCircle className="w-4 h-4" />,
    warning: <AlertTriangle className="w-4 h-4" />,
    blocked: <XCircle className="w-4 h-4" />,
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-3xl mx-auto w-full space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-primary-600" /> Launch Readiness
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Critical checks for payments, security, email, payouts, disputes, and marketplace data.</p>
        </div>
        <button onClick={load} className="btn-secondary text-xs flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" /> Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-20 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : !data ? (
        <p className="text-center text-gray-400 py-12">No readiness data available</p>
      ) : (
        <>
          <div className={`rounded-2xl border p-4 ${data.launch_ready ? tone.ready : tone.blocked}`}>
            <div className="flex items-center gap-3">
              {data.launch_ready ? <CheckCircle className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              <div>
                <p className="font-bold">{data.launch_ready ? 'No blocking config issues found' : 'Launch blockers need attention'}</p>
                <p className="text-xs opacity-80 mt-0.5">{data.blocked} blocked · {data.warnings} warning{data.warnings === 1 ? '' : 's'}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {data.checks?.map(check => (
              <div key={check.key} className={`rounded-2xl border p-4 ${tone[check.status] || tone.warning}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{icon[check.status] || icon.warning}</div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm">{check.label}</p>
                    <p className="text-xs opacity-80 mt-1 leading-relaxed">{check.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <p className="text-xs text-gray-400 text-center">
            Last checked {new Date(data.checked_at).toLocaleString('en-GB')}. Legal policies and live Stripe payout onboarding still need real-world review before public launch.
          </p>
        </>
      )}
    </div>
  );
}

function EditBusinessModal({ business, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: business.name || '',
    description: business.description || '',
    category: business.category || '',
    location: business.location || '',
    phone: business.phone || '',
    email: business.email || '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminPanelAPI.editBusiness(business.id, form);
      toast.success('Business updated');
      onSaved({ ...business, ...form });
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-6 animate-slide-up max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-gray-900 dark:text-white">Edit Business</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <form onSubmit={save} className="space-y-3">
          {[['name','Name *'], ['description','Description'], ['category','Category'], ['location','Location'], ['phone','Phone'], ['email','Email']].map(([k, label]) => (
            <div key={k}>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide block mb-1">{label}</label>
              {k === 'description'
                ? <textarea className="input resize-none text-sm" rows={2} value={form[k]} onChange={set(k)} />
                : <input className="input text-sm" required={k === 'name'} value={form[k]} onChange={set(k)} />}
            </div>
          ))}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersPanel({ onStartChat }) {
  const [consumers, setConsumers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [acting, setActing] = useState(null);
  const [notifyTarget, setNotifyTarget] = useState(null);

  const load = () => adminPanelAPI.getConsumers().then(setConsumers).catch(err => toast.error(err.message || 'Failed to load users'));
  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const updateConsumer = async (consumer, patch) => {
    setActing(consumer.id);
    try {
      const updated = await adminPanelAPI.updateConsumer(consumer.id, patch);
      setConsumers(prev => prev.map(c => c.id === consumer.id ? { ...c, ...updated } : c));
      toast.success('Customer updated');
    } catch (err) {
      toast.error(err.message || 'Failed to update customer');
    } finally {
      setActing(null);
    }
  };

  const filtered = consumers.filter(c => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.full_name?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-white">Customers <span className="text-sm font-normal text-gray-400">({filtered.length})</span></h2>
        <button onClick={() => { setLoading(true); load().finally(() => setLoading(false)); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <input
        className="input"
        placeholder="Search by name or email…"
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      {loading ? (
        <div className="space-y-3">{[...Array(6)].map((_, i) => <div key={i} className="h-16 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400"><Users className="w-10 h-10 mx-auto mb-3 text-gray-200 dark:text-gray-700" /><p>No customers found</p></div>
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 px-4 py-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 text-sm font-bold text-primary-600 dark:text-primary-400">
                {(c.full_name?.[0] || c.email[0]).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{c.full_name || '—'}</p>
                <p className="text-xs text-gray-400 truncate">{c.email}</p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">{parseInt(c.total_bookings)} bookings</p>
                <p className="text-[10px] text-gray-400">{new Date(c.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                <div className="flex items-center gap-1 justify-end mt-0.5">
                  {c.email_verified ? <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-green-100 text-green-700">Verified</span> : <span className="text-[9px] px-1 py-0.5 rounded font-bold bg-gray-100 text-gray-500">Unverified</span>}
                </div>
              </div>
              <button
                onClick={() => onStartChat?.({ type: 'admin_consumer', consumer_id: c.id, subject: 'Customer Support' })}
                className="p-2 rounded-xl border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors flex-shrink-0"
                title="Message customer"
              >
                <MessageSquare className="w-4 h-4" />
              </button>
              <button
                onClick={() => setNotifyTarget(c)}
                className="p-2 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors flex-shrink-0"
                title="Send notification"
              >
                <Bell className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateConsumer(c, { email_verified: !c.email_verified })}
                disabled={acting === c.id}
                className={`p-2 rounded-xl border transition-colors flex-shrink-0 ${c.email_verified ? 'border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800' : 'border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'}`}
                title={c.email_verified ? 'Mark email unverified' : 'Force verify email'}
              >
                <ShieldCheck className="w-4 h-4" />
              </button>
              <button
                onClick={() => updateConsumer(c, { onboarding_complete: !c.onboarding_complete })}
                disabled={acting === c.id}
                className={`p-2 rounded-xl border transition-colors flex-shrink-0 ${c.onboarding_complete ? 'border-gray-200 dark:border-gray-700 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800' : 'border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'}`}
                title={c.onboarding_complete ? 'Require onboarding again' : 'Mark onboarding complete'}
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
      {notifyTarget && (
        <NotifyConsumerModal
          consumer={notifyTarget}
          onClose={() => setNotifyTarget(null)}
        />
      )}
    </div>
  );
}

function NotifyConsumerModal({ consumer, onClose }) {
  const [form, setForm] = useState({
    title: 'Message from BookAm',
    body: '',
    link: '/customer/messages',
  });
  const [sending, setSending] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      await adminPanelAPI.notifyConsumer(consumer.id, form);
      toast.success('Notification sent');
      onClose();
    } catch (err) {
      toast.error(err.message || 'Failed to send notification');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 animate-fade-in">
      <div className="bg-white dark:bg-gray-900 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-md p-6 animate-slide-up">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-gray-900 dark:text-white">Notify Customer</h3>
            <p className="text-xs text-gray-400 mt-0.5">{consumer.full_name || consumer.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <input className="input" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Title" />
          <textarea className="input resize-none" rows={4} value={form.body} onChange={e => setForm(p => ({ ...p, body: e.target.value }))} placeholder="Write the notification message..." />
          <input className="input" value={form.link} onChange={e => setForm(p => ({ ...p, link: e.target.value }))} placeholder="/customer/messages" />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={sending || !form.title.trim() || !form.body.trim()} className="btn-primary flex-1 disabled:opacity-50">{sending ? 'Sending...' : 'Send'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ReconcileButton() {
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true);
    try {
      const result = await adminPanelAPI.reconcilePayments();
      toast.success(result.message || 'Reconciliation complete');
    } catch (err) {
      toast.error(err.message || 'Reconciliation failed');
    } finally {
      setRunning(false);
    }
  };
  return (
    <button
      onClick={run}
      disabled={running}
      title="Check Stripe for any payments that were missed by the webhook and sync their status"
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 font-semibold"
    >
      <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
      {running ? 'Syncing…' : 'Reconcile'}
    </button>
  );
}

function AutoReleaseButton() {
  const [running, setRunning] = useState(false);
  const run = async () => {
    setRunning(true);
    try {
      const result = await adminPanelAPI.triggerAutoRelease();
      toast.success(result.message || 'Auto-release complete');
    } catch (err) {
      toast.error(err.message || 'Auto-release failed');
    } finally {
      setRunning(false);
    }
  };
  return (
    <button
      onClick={run}
      disabled={running}
      title="Auto-release payments for bookings >72h old with no customer confirmation"
      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border border-primary-200 dark:border-primary-800 text-primary-700 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-50 font-semibold"
    >
      <Zap className="w-3.5 h-3.5" />
      {running ? 'Running…' : 'Auto-release'}
    </button>
  );
}

function CopyField({ label, value }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = () => {
    navigator.clipboard.writeText(value).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <div className="flex items-center justify-between gap-2 py-1 border-b border-gray-50 dark:border-gray-800 last:border-0">
      <span className="text-[11px] text-gray-400 w-28 flex-shrink-0">{label}</span>
      <span className="text-[12px] font-mono font-semibold text-gray-800 dark:text-gray-200 flex-1 truncate">{value}</span>
      <button onClick={copy} className="p-1 rounded text-gray-300 hover:text-primary-600 transition-colors flex-shrink-0">
        {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function PayoutsPanel() {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(null);
  const [expanded, setExpanded] = useState(null);

  const load = () => adminPanelAPI.getManualPayouts().then(setBusinesses).catch(err => toast.error(err.message || 'Failed to load payouts'));
  useEffect(() => { load().finally(() => setLoading(false)); }, []);

  const markPaid = async (b) => {
    setMarking(b.id);
    try {
      const { updated } = await adminPanelAPI.markManualPaid(b.id);
      toast.success(`Marked ${updated} booking${updated === 1 ? '' : 's'} as paid for ${b.name}`);
      setBusinesses(prev => prev.map(x => x.id === b.id ? { ...x, pending_payout: 0, pending_booking_count: 0, paid_count: parseInt(x.paid_count) + parseInt(x.pending_booking_count) } : x));
    } catch (err) {
      toast.error(err.message || 'Failed');
    } finally {
      setMarking(null);
    }
  };

  const hasPending = businesses.filter(b => parseFloat(b.pending_payout) > 0);
  const noPending  = businesses.filter(b => parseFloat(b.pending_payout) <= 0);

  const fmt = (v, currency) => {
    const sym = (currency || 'GBP').toUpperCase() === 'USD' ? '$' : (currency || 'GBP').toUpperCase() === 'EUR' ? '€' : '₦';
    const amount = parseFloat(v || 0).toFixed(2);
    try {
      return new Intl.NumberFormat('en-GB', { style: 'currency', currency: (currency || 'GBP').toUpperCase() }).format(amount);
    } catch { return `${sym}${amount}`; }
  };

  const BizCard = ({ b }) => {
    const open = expanded === b.id;
    const pending = parseFloat(b.pending_payout);
    return (
      <div className={`bg-white dark:bg-gray-900 rounded-2xl border shadow-sm overflow-hidden ${pending > 0 ? 'border-amber-200 dark:border-amber-800' : 'border-gray-100 dark:border-gray-800 opacity-70'}`}>
        <button className="w-full flex items-start gap-3 p-4 text-left" onClick={() => setExpanded(open ? null : b.id)}>
          <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 font-bold text-primary-600 dark:text-primary-400 text-sm">
            {(b.name?.[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-bold text-sm text-gray-900 dark:text-white">{b.name}</p>
                <p className="text-xs text-gray-400 truncate">{b.email}</p>
              </div>
              <div className="text-right flex-shrink-0">
                {pending > 0 ? (
                  <p className="text-base font-black text-amber-600 dark:text-amber-400">{fmt(pending, b.bank_currency)}</p>
                ) : (
                  <p className="text-xs font-semibold text-green-600 dark:text-green-400">All paid</p>
                )}
                <p className="text-[10px] text-gray-400">{b.pending_booking_count} booking{b.pending_booking_count === 1 ? '' : 's'} pending</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-500">{b.bank_country || '?'}</span>
              <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-gray-100 dark:bg-gray-800 text-gray-500">{(b.bank_currency || 'GBP').toUpperCase()}</span>
              {b.stripe_onboarding_complete ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">Stripe active</span>
              ) : b.stripe_account_id ? (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400">Stripe pending</span>
              ) : (
                <span className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400">Manual bank</span>
              )}
              <span className="text-[10px] text-gray-400 ml-auto">{open ? '▲' : '▼'}</span>
            </div>
          </div>
        </button>

        {open && (
          <div className="px-4 pb-4 border-t border-gray-50 dark:border-gray-800 pt-3 space-y-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Bank details — send payment manually</p>
            <CopyField label="Account holder" value={b.bank_holder_name} />
            <CopyField label="Bank name"      value={b.bank_name} />
            <CopyField label="Account no."    value={b.bank_account_number} />
            <CopyField label="Sort code"      value={b.bank_sort_code} />
            <CopyField label="IBAN"           value={b.bank_iban} />
            <CopyField label="BIC / SWIFT"    value={b.bank_bic} />
            <CopyField label="Routing no."    value={b.bank_routing_number} />
            <CopyField label="Country"        value={b.bank_country} />
            <CopyField label="Currency"       value={b.bank_currency} />
            {b.bank_updated_at && (
              <p className="text-[10px] text-gray-400 pt-1">Updated {new Date(b.bank_updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
            )}
            {pending > 0 && (
              <div className="pt-3">
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 mb-3 text-xs">
                  <p className="font-bold text-amber-800 dark:text-amber-300">Amount to transfer: {fmt(pending, b.bank_currency)}</p>
                  <p className="text-amber-700 dark:text-amber-400 mt-0.5">
                    {b.pending_booking_count} confirmed booking{b.pending_booking_count === 1 ? '' : 's'} awaiting payout.
                    Transfer this amount to the account above, then click "Mark as paid."
                  </p>
                </div>
                <button
                  onClick={() => markPaid(b)}
                  disabled={marking === b.id}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="w-4 h-4" />
                  {marking === b.id ? 'Marking…' : `Mark ${fmt(pending, b.bank_currency)} as paid`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 max-w-2xl mx-auto w-full space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Banknote className="w-5 h-5 text-primary-600" /> Manual Payouts
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Businesses that submitted bank details for manual transfer.</p>
        </div>
        <div className="flex items-center gap-2">
          <AutoReleaseButton />
          <button onClick={() => { setLoading(true); load().finally(() => setLoading(false)); }} className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-28 rounded-2xl bg-gray-100 dark:bg-gray-800 animate-pulse" />)}</div>
      ) : businesses.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Banknote className="w-12 h-12 mx-auto mb-3 text-gray-200 dark:text-gray-700" />
          <p className="font-medium">No manual bank details yet</p>
          <p className="text-sm mt-1">Businesses in unsupported Stripe countries will appear here.</p>
        </div>
      ) : (
        <>
          {hasPending.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                Pending payout — {hasPending.length} business{hasPending.length === 1 ? '' : 'es'}
              </p>
              {hasPending.map(b => <BizCard key={b.id} b={b} />)}
            </div>
          )}
          {noPending.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4">
                All settled — {noPending.length} business{noPending.length === 1 ? '' : 'es'}
              </p>
              {noPending.map(b => <BizCard key={b.id} b={b} />)}
            </div>
          )}
        </>
      )}
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
  const [mainTab, setMainTab] = useState('messages');

  const loadRooms = () => adminChatAPI.getRooms().then(setRooms).catch(() => {});

  const startAdminChat = async (payload) => {
    try {
      const room = await adminChatAPI.createRoom(payload);
      setRooms(prev => prev.find(r => r.id === room.id) ? prev : [room, ...prev]);
      setActiveRoom(room.id);
      setMainTab('messages');
      toast.success('Conversation ready');
    } catch (err) {
      toast.error(err.message || 'Failed to start conversation');
    }
  };

  useEffect(() => {
    if (!authed) return;
    loadRooms().finally(() => setLoading(false));
    const poll = setInterval(loadRooms, 8000);
    return () => clearInterval(poll);
  }, [authed]);

  // Auto-logout when any admin API call gets 401/403 (expired or invalid token)
  useEffect(() => {
    const handleExpired = () => {
      setAuthed(false);
      setActiveRoom(null);
      toast.error('Session expired — please log in again');
    };
    window.addEventListener('admin-auth-expired', handleExpired);
    return () => window.removeEventListener('admin-auth-expired', handleExpired);
  }, []);

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
      {/* Header — padding-top clears notch / Dynamic Island */}
      <header className="flex-shrink-0 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
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
            {/* Tab switcher */}
            <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto scrollbar-hide">
              {[
                { id: 'messages', icon: <MessageSquare className="w-3 h-3" />, label: 'Messages' },
                { id: 'disputes', icon: <AlertTriangle className="w-3 h-3" />, label: 'Disputes' },
                { id: 'bookings', icon: <CalendarCheck className="w-3 h-3" />, label: 'Bookings' },
                { id: 'broadcasts', icon: <Bell className="w-3 h-3" />, label: 'Alerts' },
                { id: 'businesses', icon: <Building2 className="w-3 h-3" />, label: 'Businesses' },
                { id: 'users', icon: <Users className="w-3 h-3" />, label: 'Users' },
                { id: 'stats', icon: <BarChart2 className="w-3 h-3" />, label: 'Stats' },
                { id: 'financial', icon: <TrendingUp className="w-3 h-3" />, label: 'Revenue' },
                { id: 'payouts',   icon: <Banknote className="w-3 h-3" />,   label: 'Payouts' },
                { id: 'audit', icon: <History className="w-3 h-3" />, label: 'Audit' },
                { id: 'readiness', icon: <ShieldCheck className="w-3 h-3" />, label: 'Launch' },
              ].map(t => (
                <button key={t.id} onClick={() => setMainTab(t.id)}
                  className={`text-xs px-2.5 py-1.5 rounded-lg font-semibold transition-colors flex items-center gap-1 whitespace-nowrap flex-shrink-0 ${mainTab === t.id ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}>
                  {t.icon} <span className="hidden sm:inline">{t.label}</span>
                </button>
              ))}
            </div>
            {!showingChat && mainTab === 'messages' && (
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

      {mainTab === 'disputes' && (
        <div className="flex-1 overflow-hidden">
          <DisputesPanel />
        </div>
      )}

      {mainTab === 'broadcasts' && (
        <div className="flex flex-1 overflow-hidden">
          <BroadcastsPanel />
        </div>
      )}

      {mainTab === 'bookings' && (
        <div className="flex flex-1 overflow-hidden">
          <PlatformBookingsPanel />
        </div>
      )}

      {mainTab === 'businesses' && (
        <div className="flex flex-1 overflow-hidden">
          <BusinessesPanel onStartChat={startAdminChat} />
        </div>
      )}

      {mainTab === 'users' && (
        <div className="flex flex-1 overflow-hidden">
          <UsersPanel onStartChat={startAdminChat} />
        </div>
      )}

      {mainTab === 'stats' && (
        <div className="flex flex-1 overflow-hidden">
          <StatsPanel />
        </div>
      )}

      {mainTab === 'financial' && (
        <div className="flex flex-1 overflow-hidden">
          <FinancialPanel />
        </div>
      )}

      {mainTab === 'payouts' && (
        <div className="flex flex-1 overflow-hidden">
          <PayoutsPanel />
        </div>
      )}

      {mainTab === 'audit' && (
        <div className="flex flex-1 overflow-hidden">
          <AuditPanel />
        </div>
      )}

      {mainTab === 'readiness' && (
        <div className="flex flex-1 overflow-hidden">
          <LaunchReadinessPanel />
        </div>
      )}

      {mainTab === 'messages' && <div className="flex flex-1 overflow-hidden min-h-0">
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
      </div>}

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
