import React, { useEffect, useState } from 'react';
import { MessageSquare, Headphones, LogOut, Plus, X, ChevronLeft, AlertTriangle, CheckCircle, XCircle, RefreshCw, Bell, Trash2, BarChart2, Users, Building2, ShieldCheck, ShieldX, Ban, ToggleRight, TrendingUp, Edit2 } from 'lucide-react';
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
  const [form, setForm] = useState({ title: '', message: '', type: 'info' });
  const [sending, setSending] = useState(false);

  const load = () => broadcastAPI.list().then(setBroadcasts).catch(err => toast.error(err.message || 'Failed to load broadcasts')).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const send = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.message.trim()) return toast.error('Title and message required');
    setSending(true);
    try {
      await broadcastAPI.create(form);
      toast.success('Broadcast sent to all users');
      setForm({ title: '', message: '', type: 'info' });
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
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2"><TrendingUp className="w-5 h-5 text-primary-600" /> Financial Report</h2>
        <div className="flex gap-1.5">
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 animate-fade-in">
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

  const load = () => adminPanelAPI.getConsumers().then(setConsumers).catch(err => toast.error(err.message || 'Failed to load users'));
  useEffect(() => { load().finally(() => setLoading(false)); }, []);

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
            </div>
          ))}
        </div>
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
            {/* Tab switcher */}
            <div className="flex gap-0.5 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 overflow-x-auto scrollbar-hide">
              {[
                { id: 'messages', icon: <MessageSquare className="w-3 h-3" />, label: 'Messages' },
                { id: 'disputes', icon: <AlertTriangle className="w-3 h-3" />, label: 'Disputes' },
                { id: 'broadcasts', icon: <Bell className="w-3 h-3" />, label: 'Alerts' },
                { id: 'businesses', icon: <Building2 className="w-3 h-3" />, label: 'Businesses' },
                { id: 'users', icon: <Users className="w-3 h-3" />, label: 'Users' },
                { id: 'stats', icon: <BarChart2 className="w-3 h-3" />, label: 'Stats' },
                { id: 'financial', icon: <TrendingUp className="w-3 h-3" />, label: 'Revenue' },
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
