import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { growthAPI, promoAPI, reviewReplyAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';
import { BarChart3, Bell, Gem, Mail, Megaphone, MessageCircle, Smartphone, Sparkles, Star, Tag, TriangleAlert, Zap } from 'lucide-react';

/* ── helpers ─────────────────────────────────────────────────────────────── */

const TABS = [
  { id: 'overview',     label: 'Overview',     icon: BarChart3 },
  { id: 'campaigns',    label: 'Campaigns',    icon: Megaphone },
  { id: 'automations',  label: 'Automations',  icon: Zap },
  { id: 'promotions',   label: 'Promotions',   icon: Tag },
  { id: 'reviews',      label: 'Reviews',      icon: Star },
  { id: 'loyalty',      label: 'Loyalty',      icon: Gem },
];

const AUDIENCES = [
  { value: 'all',         label: 'All customers',     desc: 'Everyone who has ever booked' },
  { value: 'new',         label: 'New customers',     desc: 'Customers with 1 booking' },
  { value: 'returning',   label: 'Returning',         desc: 'Booked more than once' },
  { value: 'vip',         label: 'VIP',               desc: 'Top spenders (above average)' },
  { value: 'inactive_30', label: 'Inactive 30d+',     desc: 'No booking in last 30 days' },
  { value: 'inactive_60', label: 'Inactive 60d+',     desc: 'No booking in last 60 days' },
  { value: 'at_risk',     label: 'At risk',           desc: 'Regulars who stopped returning' },
];

const CHANNELS = [
  { value: 'email',    label: 'Email',          icon: Mail },
  { value: 'sms',      label: 'SMS',            icon: MessageCircle },
  { value: 'push',     label: 'Push',           icon: Bell },
  { value: 'in_app',   label: 'In-app',         icon: Smartphone },
  { value: 'whatsapp', label: 'WhatsApp',       icon: MessageCircle, soon: true },
];

const PRIORITY_COLOR = { high: '#ef4444', medium: '#f59e0b', low: '#10b981' };

const insightIcons = { '📊': BarChart3, '📣': Megaphone, '⚡': Zap, '🏷': Tag, '⭐': Star, '💎': Gem, '💡': Sparkles, '⚠️': TriangleAlert };

function StatCard({ label, value, sub, trend, color }) {
  const up = trend > 0;
  return (
    <div className="rounded-2xl p-5" style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}>
      <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--bam-text-faint)' }}>{label}</p>
      <p className="text-3xl font-extrabold" style={{ color: color || 'var(--bam-text)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--bam-text-muted)' }}>{sub}</p>}
      {trend !== undefined && (
        <p className={`text-xs font-semibold mt-1 ${up ? 'text-emerald-500' : trend < 0 ? 'text-red-400' : ''}`} style={!up && trend >= 0 ? { color: 'var(--bam-text-faint)' } : {}}>
          {up ? '▲' : trend < 0 ? '▼' : '—'} {Math.abs(trend).toFixed(0)}% vs last month
        </p>
      )}
    </div>
  );
}

function InsightCard({ insight, integrations, onAction, border }) {
  const InsightIcon = insightIcons[insight.icon] || Sparkles;
  return (
    <div className="rounded-2xl p-4 border-l-4" style={{
      background: 'var(--bam-surface)',
      border: `1px solid var(--bam-border)`,
      borderLeftColor: PRIORITY_COLOR[insight.priority] || 'var(--bam-border)',
    }}>
      <div className="flex items-start gap-3">
        <InsightIcon className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary-600 dark:text-primary-400" strokeWidth={1.8} aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>{insight.title}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>{insight.description}</p>
        </div>
        <button onClick={() => onAction(insight)}
          className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold text-white whitespace-nowrap"
          style={{ background: '#6366f1' }}>
          {insight.action}
        </button>
      </div>
    </div>
  );
}

/* ── Campaign Form ───────────────────────────────────────────────────────── */

function CampaignForm({ onSave, onClose, integrations, defaultAudience, defaultMessage, border, isDark }) {
  const [form, setForm] = useState({
    name: '', channel: 'email', audience: defaultAudience || 'all',
    subject: '', message: defaultMessage || '',
    offer_type: 'none', offer_value: '', booking_link: '',
    send_now: true,
  });
  const [audienceCount, setAudienceCount] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    growthAPI.audienceCount(form.audience).then(r => { if (!cancelled) setAudienceCount(r.count); }).catch(() => {});
    return () => { cancelled = true; };
  }, [form.audience]);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) { toast.error('Name and message required'); return; }
    setSaving(true);
    try {
      await onSave(form);
    } catch (err) {
      toast.error(err.message || 'Failed to create campaign');
    } finally { setSaving(false); }
  };

  const selectedChannel = CHANNELS.find(c => c.value === form.channel);
  const channelOk = !selectedChannel?.soon && (integrations ? integrations[form.channel] : true);

  return (
    <form onSubmit={submit} className="flex flex-col" style={{ maxHeight: '90dvh' }}>
      <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: border }}>
        <h2 className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>New Campaign</h2>
        <button type="button" onClick={onClose} style={{ color: 'var(--bam-text-muted)' }}>
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        <div>
          <label className="label">Campaign Name *</label>
          <input className="input" placeholder="e.g. Summer Win-Back" required value={form.name} onChange={set('name')} />
        </div>

        {/* Channel */}
        <div>
          <label className="label">Channel</label>
          <div className="grid grid-cols-3 gap-2">
            {CHANNELS.map(ch => {
              const ChannelIcon = ch.icon;
              const configured = !ch.soon && (integrations ? integrations[ch.value] : true);
              const sel = form.channel === ch.value;
              return (
                <label key={ch.value} className={`relative flex flex-col items-center gap-1 p-3 rounded-xl cursor-pointer transition-all border text-center ${ch.soon || !configured ? 'opacity-50 cursor-not-allowed' : ''}`}
                  style={{ background: sel ? 'rgba(99,102,241,.1)' : 'var(--bam-surface-soft)', borderColor: sel ? 'rgba(99,102,241,.4)' : border }}>
                  <input type="radio" name="channel" value={ch.value} className="sr-only" checked={sel}
                    onChange={set('channel')} disabled={ch.soon || !configured} />
                  <ChannelIcon className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
                  <span className="text-xs font-bold" style={{ color: sel ? '#6366f1' : 'var(--bam-text-muted)' }}>{ch.label}</span>
                  {ch.soon && <span className="text-[9px] bg-gray-200 dark:bg-gray-700 px-1.5 rounded-full text-gray-500">Soon</span>}
                  {!ch.soon && !configured && <span className="text-[9px] bg-amber-100 dark:bg-amber-900/30 px-1.5 rounded-full text-amber-600">Not set up</span>}
                </label>
              );
            })}
          </div>
          {!channelOk && !selectedChannel?.soon && (
            <div className="mt-2 rounded-xl p-3 text-xs" style={{ background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.25)', color: '#92400e' }}>
              <span className="flex items-center gap-2"><TriangleAlert className="w-4 h-4 flex-shrink-0" aria-hidden="true" />This channel isn't configured yet. Add the required credentials to your backend environment variables to enable sending.</span>
            </div>
          )}
        </div>

        {/* Audience */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label !mb-0">Audience</label>
            {audienceCount !== null && (
              <span className="text-xs font-semibold" style={{ color: 'var(--bam-text-faint)' }}>{audienceCount} recipient{audienceCount !== 1 ? 's' : ''}</span>
            )}
          </div>
          <select className="input" value={form.audience} onChange={set('audience')}>
            {AUDIENCES.map(a => <option key={a.value} value={a.value}>{a.label} — {a.desc}</option>)}
          </select>
        </div>

        {/* Subject (email only) */}
        {form.channel === 'email' && (
          <div>
            <label className="label">Subject line *</label>
            <input className="input" placeholder="e.g. We miss you! Come back for 20% off" required value={form.subject} onChange={set('subject')} />
          </div>
        )}

        {/* Message */}
        <div>
          <label className="label">Message *</label>
          <textarea className="input resize-none" rows={5} required
            placeholder={'Hi {name},\n\nPersonalise your message here. Use {name}, {business}, and {link} as placeholders.'}
            value={form.message} onChange={set('message')} />
          <p className="text-[10px] mt-1" style={{ color: 'var(--bam-text-faint)' }}>
            Available: <code>{'{name}'}</code> · <code>{'{business}'}</code> · <code>{'{link}'}</code>
          </p>
        </div>

        {/* Offer */}
        <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
          <label className="label !mb-0">Attached offer</label>
          <div className="flex gap-2">
            {['none','promo_code','free_service'].map(t => (
              <button key={t} type="button" onClick={() => setForm(p => ({ ...p, offer_type: t }))}
                className={`flex-1 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${form.offer_type === t ? 'text-white border-transparent' : ''}`}
                style={form.offer_type === t ? { background: '#6366f1' } : { borderColor: border, color: 'var(--bam-text-muted)', background: 'var(--bam-surface)' }}>
                {t === 'promo_code' ? 'Promo code' : t === 'free_service' ? 'Free service' : 'None'}
              </button>
            ))}
          </div>
          {form.offer_type !== 'none' && (
            <div>
              <label className="label">{form.offer_type === 'promo_code' ? 'Promo code' : 'Offer description'}</label>
              <input className="input" placeholder={form.offer_type === 'promo_code' ? 'e.g. WELCOME20' : 'e.g. Free conditioning treatment'}
                value={form.offer_value} onChange={set('offer_value')} />
            </div>
          )}
        </div>

        {/* Booking link */}
        <div>
          <label className="label">Booking link</label>
          <input className="input" type="url" placeholder="Auto-filled from your booking page" value={form.booking_link} onChange={set('booking_link')} />
          <p className="text-[10px] mt-1" style={{ color: 'var(--bam-text-faint)' }}>Leave blank to use your default booking URL</p>
        </div>

        {/* Send now vs draft */}
        <label className="flex items-center justify-between p-4 rounded-2xl cursor-pointer" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--bam-text)' }}>Send immediately</p>
            <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>Disable to save as draft</p>
          </div>
          <Toggle checked={form.send_now} onChange={v => setForm(p => ({ ...p, send_now: v }))} />
        </label>
      </div>

      <div className="p-5 border-t flex gap-3 flex-shrink-0" style={{ borderColor: border }}>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={saving || (!channelOk && !selectedChannel?.soon)} className="btn-primary flex-1 disabled:opacity-40">
          {saving ? <Spinner /> : form.send_now ? `Send to ${audienceCount ?? '…'} people` : 'Save Draft'}
        </button>
      </div>
    </form>
  );
}

/* ── Tab: Overview ───────────────────────────────────────────────────────── */

function OverviewTab({ integrations, onCreateCampaign, border }) {
  const [intel, setIntel] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    growthAPI.intelligence().then(setIntel).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const snap = intel?.snapshot;
  const revTrend = snap?.revenue_last_month > 0
    ? ((snap.revenue_this_month - snap.revenue_last_month) / snap.revenue_last_month) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Snapshot stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard label="Revenue this month" value={snap ? `€${parseFloat(snap.revenue_this_month || 0).toFixed(0)}` : '…'} trend={revTrend} />
        <StatCard label="Last month" value={snap ? `€${parseFloat(snap.revenue_last_month || 0).toFixed(0)}` : '…'} />
        <StatCard label="Bookings (7 days)" value={snap?.bookings_7d ?? '…'} color="#6366f1" />
      </div>

      {/* Intelligence insights */}
      <div>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>Growth Opportunities</h2>
          {loading && <Spinner size="sm" />}
        </div>
        {!loading && (!intel?.insights || intel.insights.length === 0) ? (
          <div className="rounded-2xl p-8 text-center" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
            <p className="text-3xl mb-2">🌱</p>
            <p className="font-semibold" style={{ color: 'var(--bam-text)' }}>No opportunities detected yet</p>
            <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>Add more bookings to unlock retention insights</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(intel?.insights || []).map(insight => (
              <InsightCard key={insight.type} insight={insight} integrations={integrations} border={border}
                onAction={ins => onCreateCampaign({ audience: ins.audience, message: ins.suggestedMessage })} />
            ))}
          </div>
        )}
      </div>

      {/* Integration status */}
      <div>
        <h2 className="font-bold text-base mb-3" style={{ color: 'var(--bam-text)' }}>Channel Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CHANNELS.map(ch => {
            const ChannelIcon = ch.icon;
            const ok = !ch.soon && integrations?.[ch.value];
            return (
              <div key={ch.value} className="rounded-2xl p-4" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
                <div className="flex items-center gap-2 mb-1">
                  <ChannelIcon className="w-4 h-4" strokeWidth={1.8} aria-hidden="true" />
                  <p className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>{ch.label}</p>
                </div>
                {ch.soon
                  ? <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-gray-100 dark:bg-gray-800 text-gray-500">Coming soon</span>
                  : ok
                    ? <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600">● Connected</span>
                    : <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-amber-50 dark:bg-amber-900/20 text-amber-600">○ Not configured</span>
                }
                {!ch.soon && !ok && (
                  <p className="text-[10px] mt-1.5" style={{ color: 'var(--bam-text-faint)' }}>
                    {ch.value === 'sms' ? 'Requires Twilio credentials' : ch.value === 'push' ? 'Requires Firebase setup' : 'Contact support'}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ── Tab: Campaigns ──────────────────────────────────────────────────────── */

function CampaignsTab({ integrations, prefill, border, isDark }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(!!prefill);
  const [preData, setPreData] = useState(prefill || null);

  useEffect(() => {
    growthAPI.campaigns().then(setCampaigns).catch(() => {}).finally(() => setLoading(false));
  }, []);

  // Open form when parent changes prefill
  useEffect(() => { if (prefill) { setPreData(prefill); setShowForm(true); } }, [prefill]);

  const handleSave = async (formData) => {
    const campaign = await growthAPI.createCampaign(formData);
    setCampaigns(p => [campaign, ...p]);
    setShowForm(false);
    toast.success(formData.send_now ? 'Campaign sending…' : 'Draft saved');
  };

  const sendNow = async (c) => {
    try {
      await growthAPI.sendCampaign(c.id);
      setCampaigns(p => p.map(x => x.id === c.id ? { ...x, status: 'sending' } : x));
      toast.success('Campaign sending…');
    } catch (err) { toast.error(err.message || 'Failed to send'); }
  };

  const remove = async (c) => {
    try {
      await growthAPI.deleteCampaign(c.id);
      setCampaigns(p => p.filter(x => x.id !== c.id));
      toast.success('Draft deleted');
    } catch { toast.error('Cannot delete sent campaigns'); }
  };

  const STATUS_BADGE = {
    draft:     { label: 'Draft',     cls: 'bg-gray-100 dark:bg-gray-800 text-gray-500' },
    sending:   { label: 'Sending…',  cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 animate-pulse' },
    sent:      { label: 'Sent',      cls: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' },
    failed:    { label: 'Failed',    cls: 'bg-red-50 dark:bg-red-900/20 text-red-600' },
    scheduled: { label: 'Scheduled', cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>Campaigns</h2>
        <button onClick={() => { setPreData(null); setShowForm(true); }} className="btn-primary text-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Campaign
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--bam-surface-soft)' }} />)}</div>
      ) : campaigns.length === 0 ? (
        <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
          <p className="text-4xl mb-3">📣</p>
          <p className="font-semibold" style={{ color: 'var(--bam-text)' }}>No campaigns yet</p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--bam-text-muted)' }}>Send targeted messages to your customers to drive more bookings</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">Create campaign</button>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => {
            const badge = STATUS_BADGE[c.status] || STATUS_BADGE.draft;
            const ch = CHANNELS.find(x => x.value === c.channel);
            return (
              <div key={c.id} className="rounded-2xl p-4" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{ch?.icon || '📨'}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>{c.name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
                    </div>
                    <p className="text-xs line-clamp-1 mb-2" style={{ color: 'var(--bam-text-muted)' }}>{c.message}</p>
                    {/* Metrics */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      {[
                        ['Sent', c.recipient_count],
                        ['Delivered', c.delivered_count],
                        ['Booked', c.booked_count],
                        c.revenue_generated > 0 ? ['Revenue', `€${parseFloat(c.revenue_generated).toFixed(0)}`] : null,
                      ].filter(Boolean).map(([k, v]) => (
                        <div key={k} className="text-center">
                          <p className="text-xs font-bold" style={{ color: 'var(--bam-text)' }}>{v}</p>
                          <p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--bam-text-faint)' }}>{k}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {c.status === 'draft' && (
                      <>
                        <button onClick={() => sendNow(c)} className="px-2.5 py-1.5 rounded-xl text-xs font-bold text-white" style={{ background: '#6366f1' }}>Send</button>
                        <button onClick={() => remove(c)} className="p-1.5 rounded-xl" style={{ color: 'var(--bam-text-faint)' }}>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                        </button>
                      </>
                    )}
                    {c.sent_at && <p className="text-[10px]" style={{ color: 'var(--bam-text-faint)' }}>{format(parseISO(c.sent_at), 'MMM d')}</p>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create campaign sheet */}
      <AnimatePresence>
        {showForm && (
          <>
            <motion.div key="cf-backdrop" className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowForm(false)} />
            <motion.div key="cf-sheet"
              className="fixed inset-x-0 bottom-0 z-[81] rounded-t-3xl sm:inset-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[500px] sm:rounded-2xl overflow-hidden"
              style={{ background: isDark ? '#0c1528' : '#fff', border: `1px solid ${border}`, display: 'flex', flexDirection: 'column' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340, mass: 0.8 }}
              onClick={e => e.stopPropagation()}>
              <CampaignForm
                onSave={handleSave}
                onClose={() => setShowForm(false)}
                integrations={integrations}
                defaultAudience={preData?.audience}
                defaultMessage={preData?.message}
                border={border}
                isDark={isDark}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Tab: Automations ────────────────────────────────────────────────────── */

function AutomationsTab({ integrations, border, isDark }) {
  const [automations, setAutomations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  useEffect(() => {
    growthAPI.automations().then(setAutomations).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const toggle = async (auto) => {
    setToggling(auto.trigger_type);
    try {
      const updated = await growthAPI.toggleAutomation(auto.trigger_type, { is_active: !auto.is_active });
      setAutomations(p => p.map(a => a.trigger_type === auto.trigger_type ? { ...a, is_active: !a.is_active } : a));
      toast.success(auto.is_active ? 'Automation paused' : 'Automation activated ✓');
    } catch (err) { toast.error(err.message || 'Failed to update'); }
    finally { setToggling(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-2xl p-4" style={{ background: 'rgba(99,102,241,.07)', border: '1px solid rgba(99,102,241,.2)' }}>
        <span className="text-xl mt-0.5">⚡</span>
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--bam-text)' }}>Set it and forget it</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>
            Automations run automatically based on customer behaviour. Toggle them on and they'll work silently in the background.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bam-surface-soft)' }} />)}</div>
      ) : (
        <div className="space-y-3">
          {automations.map(auto => {
            const ch = CHANNELS.find(x => x.value === auto.channel);
            const channelOk = integrations?.[auto.channel];
            return (
              <div key={auto.trigger_type} className="rounded-2xl p-4" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl flex-shrink-0">{auto.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>{auto.name}</p>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: 'var(--bam-surface-soft)', color: 'var(--bam-text-faint)' }}>
                        {ch?.icon} {ch?.label}
                      </span>
                    </div>
                    <p className="text-xs mt-0.5 mb-2" style={{ color: 'var(--bam-text-muted)' }}>{auto.description}</p>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <p className="text-sm font-bold" style={{ color: 'var(--bam-text)' }}>{auto.sent_count || 0}</p>
                        <p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--bam-text-faint)' }}>Sent</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-bold" style={{ color: 'var(--bam-text)' }}>{auto.booked_count || 0}</p>
                        <p className="text-[9px] uppercase tracking-wide" style={{ color: 'var(--bam-text-faint)' }}>Booked</p>
                      </div>
                      {!channelOk && (
                        <span className="text-[10px] font-semibold text-amber-600">⚠️ Channel not configured</span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 flex-shrink-0">
                    <Toggle
                      checked={!!auto.is_active}
                      onChange={() => toggle(auto)}
                      disabled={!!toggling || !channelOk}
                    />
                    {auto.is_active && <span className="text-[10px] font-bold text-emerald-500">Active</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Tab: Promotions ─────────────────────────────────────────────────────── */

function PromotionsTab({ border, isDark }) {
  const [promos, setPromos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: '', type: 'percent', value: '', max_uses: '', valid_until: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    promoAPI.list().then(setPromos).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const set = k => e => setForm(p => ({ ...p, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const p = await promoAPI.create({
        ...form,
        code: form.code.trim().toUpperCase(),
        value: parseFloat(form.value),
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until || null,
      });
      setPromos(prev => [p, ...prev]);
      setShowForm(false);
      setForm({ code: '', type: 'percent', value: '', max_uses: '', valid_until: '' });
      toast.success('Promo code created ✓');
    } catch (err) { toast.error(err.message || 'Failed to create promo'); }
    finally { setSaving(false); }
  };

  const togglePromo = async (p) => {
    try {
      const updated = await promoAPI.update(p.id, { is_active: !p.is_active });
      setPromos(prev => prev.map(x => x.id === p.id ? updated : x));
    } catch { toast.error('Failed to update'); }
  };

  const removePromo = async (p) => {
    try {
      await promoAPI.remove(p.id);
      setPromos(prev => prev.filter(x => x.id !== p.id));
      toast.success('Deleted');
    } catch { toast.error('Failed to delete'); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>Promo Codes</h2>
        <button onClick={() => setShowForm(s => !s)} className="btn-primary text-sm flex items-center gap-1.5">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          New Code
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div key="promo-form" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="rounded-2xl p-5" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
            <form onSubmit={submit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Code *</label>
                  <input className="input uppercase" placeholder="SUMMER20" required value={form.code} onChange={set('code')} />
                </div>
                <div>
                  <label className="label">Type</label>
                  <div className="flex rounded-xl overflow-hidden border" style={{ borderColor: border }}>
                    {['percent', 'fixed'].map(t => (
                      <button key={t} type="button" onClick={() => setForm(p => ({ ...p, type: t }))}
                        className={`flex-1 py-2.5 text-xs font-bold capitalize transition-all ${form.type === t ? 'text-white' : ''}`}
                        style={form.type === t ? { background: '#6366f1' } : { color: 'var(--bam-text-muted)', background: 'var(--bam-surface-soft)' }}>
                        {t === 'percent' ? '% Off' : '€ Off'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="label">Value *</label>
                  <input className="input" type="number" min="1" max={form.type === 'percent' ? 100 : undefined} required value={form.value} onChange={set('value')} placeholder={form.type === 'percent' ? '20' : '10.00'} />
                </div>
                <div>
                  <label className="label">Max uses</label>
                  <input className="input" type="number" min="1" value={form.max_uses} onChange={set('max_uses')} placeholder="Unlimited" />
                </div>
                <div>
                  <label className="label">Expires</label>
                  <input className="input" type="date" value={form.valid_until} onChange={set('valid_until')} />
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Spinner /> : 'Create'}</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--bam-surface-soft)' }} />)}</div>
      ) : promos.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
          <p className="text-4xl mb-2">🏷</p>
          <p className="font-semibold" style={{ color: 'var(--bam-text)' }}>No promo codes yet</p>
          <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>Create discount codes to share with customers</p>
        </div>
      ) : (
        <div className="space-y-2">
          {promos.map(p => (
            <div key={p.id} className={`rounded-2xl p-4 border transition-all ${!p.is_active ? 'opacity-50' : ''}`}
              style={{ background: 'var(--bam-surface)', borderColor: border }}>
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-bold font-mono tracking-wider text-sm" style={{ color: 'var(--bam-text)' }}>{p.code}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: 'rgba(99,102,241,.1)', color: '#6366f1' }}>
                      {p.type === 'percent' ? `${p.value}% off` : `€${parseFloat(p.value).toFixed(2)} off`}
                    </span>
                    {!p.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">Inactive</span>}
                  </div>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>
                      {p.uses_count || 0}{p.max_uses ? `/${p.max_uses}` : ''} uses
                    </p>
                    {p.valid_until && <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>Expires {format(parseISO(p.valid_until), 'MMM d, yyyy')}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Toggle checked={!!p.is_active} onChange={() => togglePromo(p)} />
                  <button onClick={() => removePromo(p)} className="p-1.5 rounded-xl" style={{ color: 'var(--bam-text-faint)' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Tab: Reviews ────────────────────────────────────────────────────────── */

function ReviewsTab({ border }) {
  const [data, setData] = useState({ stats: null, reviews: [] });
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [filter, setFilter] = useState('all'); // all | needs_reply | 5 | 4 | 3 | 2 | 1

  useEffect(() => {
    growthAPI.reviews().then(setData).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const submitReply = async (reviewId) => {
    if (!replyText.trim()) return;
    setSendingReply(true);
    try {
      await reviewReplyAPI.reply(reviewId, replyText.trim());
      setData(p => ({
        ...p,
        reviews: p.reviews.map(r => r.id === reviewId ? { ...r, reply_text: replyText.trim() } : r),
      }));
      setReplyingTo(null);
      setReplyText('');
      toast.success('Reply posted');
    } catch (err) { toast.error(err.message || 'Failed to reply'); }
    finally { setSendingReply(false); }
  };

  const filtered = data.reviews.filter(r => {
    if (filter === 'needs_reply') return !r.reply_text;
    if (['1','2','3','4','5'].includes(filter)) return String(r.rating) === filter;
    return true;
  });

  const avg = parseFloat(data.stats?.avg_rating || 0);
  const total = parseInt(data.stats?.total || 0);

  return (
    <div className="space-y-4">
      {/* Summary */}
      {!loading && total > 0 && (
        <div className="rounded-2xl p-5" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
          <div className="flex items-center gap-6">
            <div className="text-center flex-shrink-0">
              <p className="text-5xl font-extrabold leading-none" style={{ color: 'var(--bam-text)' }}>{avg.toFixed(1)}</p>
              <div className="flex justify-center mt-1">{[1,2,3,4,5].map(i => <span key={i} className={`text-lg ${i <= Math.round(avg) ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>)}</div>
              <p className="text-xs mt-1" style={{ color: 'var(--bam-text-faint)' }}>{total} review{total !== 1 ? 's' : ''}</p>
            </div>
            <div className="flex-1 space-y-1.5">
              {[5,4,3,2,1].map(n => {
                const key = ['','one','two','three','four','five'][n] + '_star';
                const count = parseInt(data.stats?.[key] || 0);
                return (
                  <div key={n} className="flex items-center gap-2">
                    <span className="text-xs w-3 text-right" style={{ color: 'var(--bam-text-faint)' }}>{n}</span>
                    <span className="text-amber-400 text-xs">★</span>
                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bam-surface-soft)' }}>
                      <div className="h-full rounded-full bg-amber-400 transition-all" style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }} />
                    </div>
                    <span className="text-xs w-4" style={{ color: 'var(--bam-text-faint)' }}>{count}</span>
                  </div>
                );
              })}
            </div>
            {parseInt(data.stats?.needs_reply || 0) > 0 && (
              <div className="flex-shrink-0 text-center">
                <p className="text-2xl font-bold text-amber-500">{data.stats.needs_reply}</p>
                <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>Need reply</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filter pills */}
      {total > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[['all','All'],['needs_reply','Needs reply'],['5','5★'],['4','4★'],['3','3★'],['2','2★'],['1','1★']].map(([v,l]) => (
            <button key={v} onClick={() => setFilter(v)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap flex-shrink-0 transition-all border`}
              style={filter === v ? { background: '#6366f1', color: '#fff', borderColor: '#6366f1' } : { borderColor: border, color: 'var(--bam-text-muted)', background: 'var(--bam-surface)' }}>
              {l}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: 'var(--bam-surface-soft)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl p-10 text-center" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
          <p className="text-4xl mb-2">⭐</p>
          <p className="font-semibold" style={{ color: 'var(--bam-text)' }}>{total === 0 ? 'No reviews yet' : 'No reviews match this filter'}</p>
          {total === 0 && <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>Reviews from customers appear here after completed bookings</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(r => {
            const initials = (r.reviewer_name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
            const hue = (r.reviewer_name?.charCodeAt(0) || 0) * 37 % 360;
            const d = new Date(r.created_at);
            const isReplying = replyingTo === r.id;
            return (
              <div key={r.id} className="rounded-2xl p-4" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ background: `hsl(${hue},60%,45%)` }}>{initials}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-0.5">
                      <p className="font-semibold text-sm" style={{ color: 'var(--bam-text)' }}>{r.reviewer_name || 'Anonymous'}</p>
                      <p className="text-xs flex-shrink-0" style={{ color: 'var(--bam-text-faint)' }}>{format(d, 'MMM d, yyyy')}</p>
                    </div>
                    <div className="flex gap-0.5 mb-2">
                      {[1,2,3,4,5].map(i => <span key={i} className={`text-sm ${i <= r.rating ? 'text-amber-400' : 'text-gray-300 dark:text-gray-600'}`}>★</span>)}
                    </div>
                    {r.comment && <p className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>{r.comment}</p>}
                    {r.reply_text ? (
                      <div className="mt-3 pl-3 border-l-2 border-indigo-400">
                        <p className="text-xs font-bold text-indigo-500 mb-0.5">Your reply</p>
                        <p className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>{r.reply_text}</p>
                      </div>
                    ) : (
                      <button onClick={() => { setReplyingTo(isReplying ? null : r.id); setReplyText(''); }}
                        className="mt-2 text-xs font-semibold" style={{ color: '#6366f1' }}>
                        {isReplying ? 'Cancel' : 'Reply'}
                      </button>
                    )}
                    {isReplying && (
                      <div className="mt-2 space-y-2">
                        <textarea className="input resize-none text-sm" rows={2} placeholder="Write a professional reply…"
                          value={replyText} onChange={e => setReplyText(e.target.value)} autoFocus />
                        <button onClick={() => submitReply(r.id)} disabled={sendingReply || !replyText.trim()}
                          className="px-4 py-2 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                          style={{ background: '#6366f1' }}>
                          {sendingReply ? 'Posting…' : 'Post reply'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Tab: Loyalty ────────────────────────────────────────────────────────── */

function LoyaltyTab({ border }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    growthAPI.loyalty().then(setStats).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl p-5" style={{ background: 'rgba(99,102,241,.07)', border: '1px solid rgba(99,102,241,.2)' }}>
        <div className="flex items-start gap-3">
          <span className="text-2xl mt-0.5">💎</span>
          <div>
            <p className="font-bold" style={{ color: 'var(--bam-text)' }}>Loyalty Programme</p>
            <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>
              A full points-based loyalty system is on the roadmap. Right now, you can reward loyal customers manually using promo codes or by creating a targeted campaign for your top spenders.
            </p>
            <div className="flex flex-wrap gap-3 mt-3">
              <a href="#promotions" className="px-4 py-2 rounded-xl text-xs font-bold text-white" style={{ background: '#6366f1' }}>
                Create promo for VIPs
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Loyalty snapshot */}
      {!loading && stats && (
        <div className="grid grid-cols-2 gap-3">
          <StatCard label="Returning customers" value={parseInt(stats.total_members || 0).toLocaleString()} sub="2+ bookings" />
          <StatCard label="Avg visits" value={parseFloat(stats.avg_visits || 0).toFixed(1)} sub="per loyal customer" />
          <StatCard label="Total spend" value={`€${parseFloat(stats.total_spend || 0).toFixed(0)}`} sub="from returning customers" />
        </div>
      )}

      {/* Top customers */}
      {!loading && stats?.top_customers?.length > 0 && (
        <div>
          <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--bam-text)' }}>Top Customers by Spend</h3>
          <div className="space-y-2">
            {stats.top_customers.map((c, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-2xl" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
                <span className="font-bold text-sm w-6 flex-shrink-0" style={{ color: i < 3 ? '#f59e0b' : 'var(--bam-text-faint)' }}>#{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--bam-text)' }}>{c.name}</p>
                  <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>{c.total_visits} visits</p>
                </div>
                <span className="font-bold" style={{ color: 'var(--bam-text)' }}>€{parseFloat(c.lifetime_spend || 0).toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Main Growth page ────────────────────────────────────────────────────── */

export default function Growth() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const [activeTab, setActiveTab] = useState('overview');
  const [integrations, setIntegrations] = useState(null);
  const [campaignPrefill, setCampaignPrefill] = useState(null);

  useEffect(() => {
    growthAPI.integrations().then(setIntegrations).catch(() => {});
  }, []);

  const handleInsightAction = (insight) => {
    setCampaignPrefill({ audience: insight.audience, message: insight.suggestedMessage });
    setActiveTab('campaigns');
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--bam-text)' }}>Growth</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>Marketing, retention, and revenue — all in one place</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto pb-1 border-b" style={{ borderColor: border }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => { setActiveTab(tab.id); if (tab.id !== 'campaigns') setCampaignPrefill(null); }}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${activeTab === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent'}`}
            style={{ color: activeTab === tab.id ? undefined : 'var(--bam-text-muted)' }}>
            <tab.icon className="w-4 h-4" strokeWidth={1.9} aria-hidden="true" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pb-8">
        {activeTab === 'overview'    && <OverviewTab integrations={integrations} onCreateCampaign={handleInsightAction} border={border} />}
        {activeTab === 'campaigns'   && <CampaignsTab integrations={integrations} prefill={campaignPrefill} border={border} isDark={isDark} />}
        {activeTab === 'automations' && <AutomationsTab integrations={integrations} border={border} isDark={isDark} />}
        {activeTab === 'promotions'  && <PromotionsTab border={border} isDark={isDark} />}
        {activeTab === 'reviews'     && <ReviewsTab border={border} />}
        {activeTab === 'loyalty'     && <LoyaltyTab border={border} />}
      </div>
    </div>
  );
}

/* ── Shared components ───────────────────────────────────────────────────── */

function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'} disabled:opacity-40`}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)', left: 0 }} />
    </button>
  );
}

function Spinner({ size = 'md' }) {
  const cls = size === 'sm' ? 'w-3.5 h-3.5 border-[1.5px]' : 'w-4 h-4 border-2';
  return <div className={`${cls} border-current border-t-transparent rounded-full animate-spin inline-block`} />;
}
