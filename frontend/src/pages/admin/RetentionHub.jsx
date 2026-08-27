import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { loyaltyAPI, membershipAPI, packagesAPI, giftCardsAPI, servicesAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { format, parseISO } from 'date-fns';
import toast from 'react-hot-toast';

/* ── Shared primitives ───────────────────────────────────────────────────── */

function Toggle({ checked, onChange, disabled }) {
  return (
    <button type="button" onClick={() => !disabled && onChange(!checked)} disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 disabled:opacity-40 ${checked ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)', left: 0 }} />
    </button>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin inline-block" />;
}

function EmptyState({ icon, title, body, action }) {
  return (
    <div className="rounded-2xl p-12 text-center" style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}>
      <p className="text-5xl mb-3">{icon}</p>
      <p className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>{title}</p>
      {body && <p className="text-sm mt-1.5 mb-5" style={{ color: 'var(--bam-text-muted)' }}>{body}</p>}
      {action}
    </div>
  );
}

function Sheet({ open, onClose, title, children, border, isDark }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="sheet-bd" className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose} />
          <motion.div key="sheet-panel"
            className="fixed inset-x-0 bottom-0 z-[81] rounded-t-3xl sm:inset-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[500px] sm:rounded-2xl overflow-hidden flex flex-col"
            style={{ background: isDark ? '#0c1528' : '#fff', border: `1px solid ${border}` }}
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 340, mass: 0.8 }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: border }}>
              <h2 className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>{title}</h2>
              <button onClick={onClose} style={{ color: 'var(--bam-text-muted)' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

const TABS = [
  { id: 'loyalty',      label: 'Loyalty',      icon: '💎' },
  { id: 'memberships',  label: 'Memberships',  icon: '🔁' },
  { id: 'packages',     label: 'Packages',     icon: '📦' },
  { id: 'gift-cards',   label: 'Gift Cards',   icon: '🎁' },
];

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Tab: LOYALTY                                                               */
/* ─────────────────────────────────────────────────────────────────────────── */

function LoyaltyTab({ border, isDark }) {
  const [program, setProgram] = useState(null);
  const [rewards, setRewards]  = useState([]);
  const [loading, setLoading]  = useState(true);
  const [savingProg, setSavingProg] = useState(false);
  const [showRewardForm, setShowRewardForm] = useState(false);
  const [editingReward, setEditingReward] = useState(null);
  const [form, setForm] = useState({ name: 'Loyalty Rewards', type: 'spend', points_per_pound: 1, points_per_visit: 10, points_expiry_days: 365, is_active: true });
  const [rForm, setRForm] = useState({ name: '', description: '', type: 'discount', points_cost: '', discount_value: '', max_redemptions: '' });

  useEffect(() => {
    Promise.all([loyaltyAPI.getProgram(), loyaltyAPI.listRewards()])
      .then(([prog, rwds]) => {
        if (prog) { setProgram(prog); setForm(prog); }
        setRewards(rwds);
      }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const saveProg = async () => {
    setSavingProg(true);
    try {
      const updated = await loyaltyAPI.upsertProgram(form);
      setProgram(updated);
      toast.success('Program saved ✓');
    } catch { toast.error('Failed to save'); }
    finally { setSavingProg(false); }
  };

  const saveReward = async (e) => {
    e.preventDefault();
    try {
      if (editingReward) {
        const updated = await loyaltyAPI.updateReward(editingReward.id, rForm);
        setRewards(p => p.map(r => r.id === editingReward.id ? updated : r));
        toast.success('Reward updated');
      } else {
        const created = await loyaltyAPI.createReward(rForm);
        setRewards(p => [created, ...p]);
        toast.success('Reward created ✓');
      }
      setShowRewardForm(false); setEditingReward(null);
      setRForm({ name: '', description: '', type: 'discount', points_cost: '', discount_value: '', max_redemptions: '' });
    } catch (err) { toast.error(err.message || 'Failed to save reward'); }
  };

  const deleteReward = async (r) => {
    try { await loyaltyAPI.deleteReward(r.id); setRewards(p => p.filter(x => x.id !== r.id)); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const set = (obj, setObj) => k => e => setObj(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  return (
    <div className="space-y-6">
      {/* Program config */}
      <div className="rounded-2xl p-5 space-y-4" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>Program settings</h3>
          <Toggle checked={!!form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="label">Program name</label>
            <input className="input" value={form.name} onChange={set(form, setForm)('name')} />
          </div>
          <div>
            <label className="label">Type</label>
            <select className="input" value={form.type} onChange={set(form, setForm)('type')}>
              <option value="spend">By spend (£ → points)</option>
              <option value="visits">By visit (visit → points)</option>
              <option value="hybrid">Hybrid (both)</option>
            </select>
          </div>
          <div>
            <label className="label">Points expiry (days)</label>
            <input className="input" type="number" min="0" placeholder="0 = never" value={form.points_expiry_days} onChange={set(form, setForm)('points_expiry_days')} />
          </div>
          {(form.type === 'spend' || form.type === 'hybrid') && (
            <div>
              <label className="label">Points per £1 spent</label>
              <input className="input" type="number" min="0" step="0.1" value={form.points_per_pound} onChange={set(form, setForm)('points_per_pound')} />
            </div>
          )}
          {(form.type === 'visits' || form.type === 'hybrid') && (
            <div>
              <label className="label">Points per visit</label>
              <input className="input" type="number" min="1" value={form.points_per_visit} onChange={set(form, setForm)('points_per_visit')} />
            </div>
          )}
        </div>
        <button onClick={saveProg} disabled={savingProg} className="btn-primary text-sm">
          {savingProg ? <Spinner /> : 'Save program'}
        </button>
      </div>

      {/* Rewards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>Reward catalog</h3>
          <button onClick={() => { setEditingReward(null); setShowRewardForm(true); }} className="btn-primary text-xs flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add reward
          </button>
        </div>
        {rewards.length === 0 ? (
          <EmptyState icon="🎁" title="No rewards yet" body="Create rewards customers can redeem their points for" />
        ) : (
          <div className="space-y-2">
            {rewards.map(r => (
              <div key={r.id} className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--bam-text)' }}>{r.name}</p>
                  <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>
                    {r.points_cost} pts
                    {r.type === 'discount' && r.discount_value ? ` → £${parseFloat(r.discount_value).toFixed(2)} off` : ''}
                    {r.type === 'service' ? ' → free service' : ''}
                    {r.max_redemptions ? ` · ${r.redeemed_count}/${r.max_redemptions} used` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => { setEditingReward(r); setRForm(r); setShowRewardForm(true); }}
                    className="p-1.5 rounded-xl text-xs" style={{ color: 'var(--bam-text-muted)', background: 'var(--bam-surface-soft)' }}>Edit</button>
                  <button onClick={() => deleteReward(r)} className="p-1.5 rounded-xl" style={{ color: '#ef4444' }}>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reward form sheet */}
      <Sheet open={showRewardForm} onClose={() => setShowRewardForm(false)} title={editingReward ? 'Edit reward' : 'Add reward'} border={border} isDark={isDark}>
        <form onSubmit={saveReward} className="space-y-4">
          <div>
            <label className="label">Reward name *</label>
            <input className="input" required placeholder="e.g. £10 discount" value={rForm.name} onChange={e => setRForm(p => ({ ...p, name: e.target.value }))} />
          </div>
          <div>
            <label className="label">Type</label>
            <div className="flex gap-2">
              {['discount','service','addon'].map(t => (
                <button key={t} type="button" onClick={() => setRForm(p => ({ ...p, type: t }))}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold capitalize border ${rForm.type === t ? 'text-white border-transparent' : ''}`}
                  style={rForm.type === t ? { background: '#6366f1' } : { borderColor: border, color: 'var(--bam-text-muted)', background: 'var(--bam-surface)' }}>
                  {t === 'discount' ? '💰 Discount' : t === 'service' ? '✂️ Service' : '➕ Add-on'}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Points cost *</label>
              <input className="input" type="number" min="1" required value={rForm.points_cost} onChange={e => setRForm(p => ({ ...p, points_cost: e.target.value }))} />
            </div>
            {rForm.type === 'discount' && (
              <div>
                <label className="label">Discount value (£)</label>
                <input className="input" type="number" min="0" step="0.01" value={rForm.discount_value} onChange={e => setRForm(p => ({ ...p, discount_value: e.target.value }))} />
              </div>
            )}
            <div>
              <label className="label">Max redemptions</label>
              <input className="input" type="number" min="1" placeholder="Unlimited" value={rForm.max_redemptions} onChange={e => setRForm(p => ({ ...p, max_redemptions: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Description</label>
            <input className="input" placeholder="e.g. Enjoy £10 off any service" value={rForm.description} onChange={e => setRForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setShowRewardForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editingReward ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Tab: MEMBERSHIPS                                                           */
/* ─────────────────────────────────────────────────────────────────────────── */

function MembershipsTab({ border, isDark }) {
  const [plans, setPlans] = useState([]);
  const [subs, setSubs] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('plans'); // plans | subscribers
  const [form, setForm] = useState({ name: '', description: '', price: '', currency: 'gbp', interval: 'month', interval_count: 1, priority_booking: false, services: [] });

  useEffect(() => {
    Promise.all([membershipAPI.listPlans(), membershipAPI.listSubscribers(), servicesAPI.list()])
      .then(([p, s, svcs]) => { setPlans(p); setSubs(s); setServices(svcs.filter(x => x.is_active)); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', price: '', currency: 'gbp', interval: 'month', interval_count: 1, priority_booking: false, services: [] }); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p, services: p.services || [] }); setShowForm(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        const updated = await membershipAPI.updatePlan(editing.id, form);
        setPlans(p => p.map(x => x.id === editing.id ? { ...x, ...updated } : x));
        toast.success('Plan updated');
      } else {
        const created = await membershipAPI.createPlan(form);
        setPlans(p => [created, ...p]);
        toast.success('Plan created ✓');
      }
      setShowForm(false);
    } catch (err) { toast.error(err.message || 'Failed to save'); }
  };

  const deletePlan = async (p) => {
    try { await membershipAPI.deletePlan(p.id); setPlans(prev => prev.filter(x => x.id !== p.id)); toast.success('Deleted'); }
    catch (err) { toast.error(err.message || 'Failed to delete'); }
  };

  const cancelSub = async (s) => {
    try { await membershipAPI.cancelSub(s.id); setSubs(prev => prev.map(x => x.id === s.id ? { ...x, cancel_at_period_end: true } : x)); toast.success('Will cancel at period end'); }
    catch { toast.error('Failed to cancel'); }
  };

  const toggleService = (serviceId) => {
    setForm(p => {
      const svcs = p.services || [];
      const exists = svcs.find(s => s.service_id === serviceId);
      return {
        ...p,
        services: exists ? svcs.filter(s => s.service_id !== serviceId) : [...svcs, { service_id: serviceId, quantity: 1 }],
      };
    });
  };

  const updateQty = (serviceId, qty) => {
    setForm(p => ({ ...p, services: (p.services || []).map(s => s.service_id === serviceId ? { ...s, quantity: parseInt(qty) || 1 } : s) }));
  };

  const STATUS_COLOR = { active: 'text-emerald-500', cancelled: 'text-red-400', pending: 'text-amber-500', payment_failed: 'text-red-500', expired: 'text-gray-400', paused: 'text-amber-400' };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {['plans','subscribers'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize border transition-all ${view === v ? 'text-white border-transparent' : ''}`}
            style={view === v ? { background: '#6366f1' } : { borderColor: border, color: 'var(--bam-text-muted)', background: 'var(--bam-surface)' }}>
            {v}
          </button>
        ))}
        {view === 'plans' && (
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1 ml-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New plan
          </button>
        )}
      </div>

      {view === 'plans' && (
        plans.length === 0 ? (
          <EmptyState icon="🔁" title="No membership plans" body="Create your first plan — e.g. Hair Club at £49/month" action={<button onClick={openCreate} className="btn-primary text-sm">Create plan</button>} />
        ) : (
          <div className="space-y-3">
            {plans.map(p => (
              <div key={p.id} className="rounded-2xl p-5" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold" style={{ color: 'var(--bam-text)' }}>{p.name}</p>
                      {!p.is_active && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">Inactive</span>}
                      {p.priority_booking && <span className="text-[10px] px-2 py-0.5 rounded-full text-amber-600" style={{ background: 'rgba(245,158,11,.08)' }}>Priority booking</span>}
                    </div>
                    <p className="text-xl font-extrabold" style={{ color: '#6366f1' }}>
                      {p.currency?.toUpperCase()} {parseFloat(p.price).toFixed(2)}<span className="text-sm font-normal text-gray-400">/{p.interval}</span>
                    </p>
                    {p.description && <p className="text-xs mt-1" style={{ color: 'var(--bam-text-muted)' }}>{p.description}</p>}
                    {p.services?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {p.services.map(s => (
                          <span key={s.service_id} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(99,102,241,.08)', color: '#6366f1' }}>
                            {s.service_name} ×{s.quantity}
                          </span>
                        ))}
                      </div>
                    )}
                    {p.stripe_price_id && <p className="text-[10px] mt-2 text-emerald-500">● Stripe connected</p>}
                    {!p.stripe_price_id && <p className="text-[10px] mt-2 text-amber-500">○ Stripe not configured — add STRIPE_SECRET_KEY</p>}
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--bam-surface-soft)', color: 'var(--bam-text-muted)' }}>Edit</button>
                    <button onClick={() => deletePlan(p)} className="p-1.5 rounded-xl" style={{ color: '#ef4444' }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {view === 'subscribers' && (
        subs.length === 0 ? (
          <EmptyState icon="👤" title="No subscribers yet" body="Active memberships will appear here" />
        ) : (
          <div className="space-y-3">
            {subs.map(s => (
              <div key={s.id} className="rounded-2xl p-4" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>{s.customer_name || 'Customer'}</p>
                    <p className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>{s.plan_name} · {s.currency?.toUpperCase()} {parseFloat(s.price).toFixed(2)}/{s.interval}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-xs font-semibold capitalize ${STATUS_COLOR[s.status] || 'text-gray-400'}`}>{s.status}</span>
                      {s.cancel_at_period_end && <span className="text-[10px] text-amber-500">Cancels at period end</span>}
                      {s.current_period_end && (
                        <span className="text-[10px]" style={{ color: 'var(--bam-text-faint)' }}>
                          Renews {format(parseISO(s.current_period_end), 'MMM d, yyyy')}
                        </span>
                      )}
                      {parseInt(s.usage_this_period) > 0 && (
                        <span className="text-[10px]" style={{ color: 'var(--bam-text-faint)' }}>
                          {s.usage_this_period} session{s.usage_this_period !== 1 ? 's' : ''} used
                        </span>
                      )}
                    </div>
                  </div>
                  {s.status === 'active' && !s.cancel_at_period_end && (
                    <button onClick={() => cancelSub(s)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ color: '#ef4444', background: 'rgba(239,68,68,.08)' }}>Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Plan form sheet */}
      <Sheet open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit plan' : 'New membership plan'} border={border} isDark={isDark}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Plan name *</label><input className="input" required placeholder="e.g. Hair Club" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div><label className="label">Description</label><textarea className="input resize-none" rows={2} placeholder="What's included?" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Price *</label><input className="input" type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                <option value="gbp">GBP (£)</option>
                <option value="eur">EUR (€)</option>
                <option value="usd">USD ($)</option>
              </select>
            </div>
            <div>
              <label className="label">Billing interval</label>
              <select className="input" value={form.interval} onChange={e => setForm(p => ({ ...p, interval: e.target.value }))}>
                <option value="week">Weekly</option>
                <option value="month">Monthly</option>
                <option value="year">Yearly</option>
              </select>
            </div>
            <div><label className="label">Every N intervals</label><input className="input" type="number" min="1" value={form.interval_count} onChange={e => setForm(p => ({ ...p, interval_count: parseInt(e.target.value) || 1 }))} /></div>
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <Toggle checked={!!form.priority_booking} onChange={v => setForm(p => ({ ...p, priority_booking: v }))} />
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>Priority booking</p>
              <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>Members get first access to new slots</p>
            </div>
          </label>
          {/* Included services */}
          <div>
            <label className="label">Included services per billing period</label>
            <p className="text-xs mb-2" style={{ color: 'var(--bam-text-faint)' }}>Toggle services to include. Set quantity (0 = unlimited).</p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {services.map(svc => {
                const included = form.services?.find(s => s.service_id === svc.id);
                return (
                  <div key={svc.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bam-surface-soft)' }}>
                    <Toggle checked={!!included} onChange={() => toggleService(svc.id)} />
                    <span className="flex-1 text-sm" style={{ color: 'var(--bam-text)' }}>{svc.name}</span>
                    {included && (
                      <div className="flex items-center gap-1">
                        <input type="number" min="0" className="w-14 input py-1 text-center text-xs" value={included.quantity}
                          onChange={e => updateQty(svc.id, e.target.value)} />
                        <span className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>×</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create plan'}</button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Tab: PACKAGES                                                              */
/* ─────────────────────────────────────────────────────────────────────────── */

function PackagesTab({ border, isDark }) {
  const [packages, setPackages] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useState('packages');
  const [form, setForm] = useState({ name: '', description: '', session_count: '', price: '', currency: 'gbp', valid_days: 365, services: [] });

  useEffect(() => {
    Promise.all([packagesAPI.list(), packagesAPI.listCustomers(), servicesAPI.list()])
      .then(([pkgs, custs, svcs]) => { setPackages(pkgs); setCustomers(custs); setServices(svcs.filter(x => x.is_active)); })
      .catch(() => {}).finally(() => setLoading(false));
  }, []);

  const openCreate = () => { setEditing(null); setForm({ name: '', description: '', session_count: '', price: '', currency: 'gbp', valid_days: 365, services: [] }); setShowForm(true); };
  const openEdit = (p) => { setEditing(p); setForm({ ...p, services: (p.services || []).map(s => s.service_id).filter(Boolean) }); setShowForm(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, services: Array.isArray(form.services) ? form.services : [] };
      if (editing) {
        const updated = await packagesAPI.update(editing.id, payload);
        setPackages(p => p.map(x => x.id === editing.id ? updated : x));
        toast.success('Package updated');
      } else {
        const created = await packagesAPI.create(payload);
        setPackages(p => [created, ...p]);
        toast.success('Package created ✓');
      }
      setShowForm(false);
    } catch (err) { toast.error(err.message || 'Failed to save'); }
  };

  const removePackage = async (p) => {
    try { await packagesAPI.remove(p.id); setPackages(prev => prev.filter(x => x.id !== p.id)); toast.success('Deleted'); }
    catch (err) { toast.error(err.message || 'Failed'); }
  };

  const toggleSvc = (id) => setForm(p => ({ ...p, services: (p.services || []).includes(id) ? p.services.filter(s => s !== id) : [...(p.services || []), id] }));

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        {['packages','customers'].map(v => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold capitalize border transition-all ${view === v ? 'text-white border-transparent' : ''}`}
            style={view === v ? { background: '#6366f1' } : { borderColor: border, color: 'var(--bam-text-muted)', background: 'var(--bam-surface)' }}>
            {v}
          </button>
        ))}
        {view === 'packages' && (
          <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1 ml-auto">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New package
          </button>
        )}
      </div>

      {view === 'packages' && (
        packages.length === 0 ? (
          <EmptyState icon="📦" title="No packages yet" body="Create bundles of sessions customers can buy in advance — e.g. 6 massages for €240"
            action={<button onClick={openCreate} className="btn-primary text-sm">Create package</button>} />
        ) : (
          <div className="space-y-3">
            {packages.map(p => (
              <div key={p.id} className="rounded-2xl p-5" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold" style={{ color: 'var(--bam-text)' }}>{p.name}</p>
                    <p className="text-lg font-extrabold" style={{ color: '#6366f1' }}>
                      {p.currency?.toUpperCase()} {parseFloat(p.price).toFixed(2)}
                      <span className="text-sm font-normal text-gray-400"> · {p.session_count} sessions</span>
                    </p>
                    {p.description && <p className="text-xs mt-1" style={{ color: 'var(--bam-text-muted)' }}>{p.description}</p>}
                    {p.services?.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {p.services.filter(s => s.service_id).map(s => (
                          <span key={s.service_id} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(99,102,241,.08)', color: '#6366f1' }}>{s.service_name}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-[10px] mt-1.5" style={{ color: 'var(--bam-text-faint)' }}>
                      {p.valid_days ? `Valid for ${p.valid_days} days from purchase` : 'No expiry'}
                    </p>
                  </div>
                  <div className="flex gap-1.5 flex-shrink-0">
                    <button onClick={() => openEdit(p)} className="px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: 'var(--bam-surface-soft)', color: 'var(--bam-text-muted)' }}>Edit</button>
                    <button onClick={() => removePackage(p)} className="p-1.5 rounded-xl" style={{ color: '#ef4444' }}>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {view === 'customers' && (
        customers.length === 0 ? (
          <EmptyState icon="👤" title="No purchases yet" body="Customer package purchases will appear here" />
        ) : (
          <div className="space-y-2">
            {customers.map(c => (
              <div key={c.id} className="flex items-center gap-3 p-4 rounded-2xl" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm" style={{ color: 'var(--bam-text)' }}>{c.customer_name || 'Customer'}</p>
                  <p className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>{c.package_name}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold" style={{ color: 'var(--bam-text)' }}>{c.sessions_remaining}/{c.sessions_total} left</p>
                  <p className="text-[10px]" style={{ color: c.status === 'active' ? '#10b981' : 'var(--bam-text-faint)' }}>{c.status}</p>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      <Sheet open={showForm} onClose={() => setShowForm(false)} title={editing ? 'Edit package' : 'New package'} border={border} isDark={isDark}>
        <form onSubmit={save} className="space-y-4">
          <div><label className="label">Package name *</label><input className="input" required placeholder="e.g. 6 Massages Bundle" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} /></div>
          <div><label className="label">Description</label><input className="input" placeholder="e.g. Save 20% compared to single session price" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Sessions *</label><input className="input" type="number" min="1" required value={form.session_count} onChange={e => setForm(p => ({ ...p, session_count: e.target.value }))} /></div>
            <div><label className="label">Price *</label><input className="input" type="number" min="0" step="0.01" required value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} /></div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                <option value="gbp">GBP</option><option value="eur">EUR</option><option value="usd">USD</option>
              </select>
            </div>
            <div><label className="label">Valid (days)</label><input className="input" type="number" min="0" placeholder="0 = no expiry" value={form.valid_days} onChange={e => setForm(p => ({ ...p, valid_days: e.target.value }))} /></div>
          </div>
          <div>
            <label className="label">Applicable services</label>
            <p className="text-xs mb-2" style={{ color: 'var(--bam-text-faint)' }}>Leave none selected to allow any service</p>
            <div className="flex flex-wrap gap-2">
              {services.map(s => {
                const sel = (form.services || []).includes(s.id);
                return (
                  <button key={s.id} type="button" onClick={() => toggleSvc(s.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${sel ? 'text-white border-transparent' : ''}`}
                    style={sel ? { background: '#6366f1' } : { borderColor: border, color: 'var(--bam-text-muted)', background: 'var(--bam-surface)' }}>
                    {s.name}
                  </button>
                );
              })}
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" className="btn-primary flex-1">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Tab: GIFT CARDS                                                            */
/* ─────────────────────────────────────────────────────────────────────────── */

function GiftCardsTab({ border, isDark }) {
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ initial_value: '', currency: 'gbp', recipient_name: '', recipient_email: '', sender_name: '', message: '', expires_days: '' });

  useEffect(() => {
    giftCardsAPI.list().then(setCards).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const card = await giftCardsAPI.create(form);
      setCards(p => [card, ...p]);
      setShowForm(false);
      setForm({ initial_value: '', currency: 'gbp', recipient_name: '', recipient_email: '', sender_name: '', message: '', expires_days: '' });
      toast.success(`Gift card ${card.code} created ✓`);
    } catch (err) { toast.error(err.message || 'Failed to create'); }
    finally { setSaving(false); }
  };

  const deactivate = async (c) => {
    try {
      const updated = await giftCardsAPI.deactivate(c.id);
      setCards(p => p.map(x => x.id === c.id ? updated : x));
      toast.success('Deactivated');
    } catch { toast.error('Failed'); }
  };

  const filtered = cards.filter(c => filter === 'all' || c.status === filter);
  const STATUS_BADGE = {
    active:   'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
    redeemed: 'bg-gray-100 dark:bg-gray-800 text-gray-500',
    expired:  'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
    cancelled:'bg-red-50 dark:bg-red-900/20 text-red-500',
  };

  const totalActive = cards.filter(c => c.status === 'active').length;
  const totalOutstanding = cards.filter(c => c.status === 'active').reduce((sum, c) => sum + parseFloat(c.remaining_balance), 0);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
          <p className="text-2xl font-extrabold" style={{ color: 'var(--bam-text)' }}>{cards.length}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-faint)' }}>Total issued</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
          <p className="text-2xl font-extrabold text-emerald-500">{totalActive}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-faint)' }}>Active</p>
        </div>
        <div className="rounded-2xl p-4 text-center" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
          <p className="text-2xl font-extrabold" style={{ color: '#6366f1' }}>£{totalOutstanding.toFixed(0)}</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-faint)' }}>Outstanding</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {['all','active','redeemed','expired','cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize border ${filter === f ? 'text-white border-transparent' : ''}`}
            style={filter === f ? { background: '#6366f1' } : { borderColor: border, color: 'var(--bam-text-muted)', background: 'var(--bam-surface)' }}>
            {f}
          </button>
        ))}
        <button onClick={() => setShowForm(true)} className="btn-primary text-xs flex items-center gap-1 ml-auto">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Issue gift card
        </button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: 'var(--bam-surface-soft)' }} />)}</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon="🎁" title={filter === 'all' ? 'No gift cards yet' : `No ${filter} cards`}
          body={filter === 'all' ? 'Issue gift cards to customers or let customers purchase them from your booking page' : undefined}
          action={filter === 'all' ? <button onClick={() => setShowForm(true)} className="btn-primary text-sm">Issue gift card</button> : undefined} />
      ) : (
        <div className="space-y-2">
          {filtered.map(c => (
            <div key={c.id} className="rounded-2xl p-4" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="font-bold font-mono tracking-wide text-sm" style={{ color: 'var(--bam-text)' }}>{c.code}</p>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_BADGE[c.status] || ''}`}>{c.status}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <p className="text-xl font-extrabold" style={{ color: '#6366f1' }}>
                      {c.currency?.toUpperCase()} {parseFloat(c.remaining_balance).toFixed(2)}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>of {parseFloat(c.initial_value).toFixed(2)}</p>
                  </div>
                  {(c.recipient_name || c.recipient_email) && (
                    <p className="text-xs mt-1" style={{ color: 'var(--bam-text-muted)' }}>
                      To: {c.recipient_name || c.recipient_email}
                    </p>
                  )}
                  {c.expires_at && (
                    <p className="text-[10px] mt-0.5" style={{ color: 'var(--bam-text-faint)' }}>
                      Expires {format(parseISO(c.expires_at), 'MMM d, yyyy')}
                    </p>
                  )}
                </div>
                {c.status === 'active' && (
                  <button onClick={() => deactivate(c)} className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold"
                    style={{ color: '#ef4444', background: 'rgba(239,68,68,.08)' }}>Deactivate</button>
                )}
              </div>
              {/* Balance bar */}
              <div className="mt-3 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bam-surface-soft)' }}>
                <div className="h-full rounded-full transition-all" style={{
                  width: `${(parseFloat(c.remaining_balance) / parseFloat(c.initial_value)) * 100}%`,
                  background: '#6366f1',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create form */}
      <Sheet open={showForm} onClose={() => setShowForm(false)} title="Issue gift card" border={border} isDark={isDark}>
        <form onSubmit={create} className="space-y-4">
          <div className="rounded-2xl p-3 text-sm" style={{ background: 'rgba(99,102,241,.07)', border: '1px solid rgba(99,102,241,.2)', color: 'var(--bam-text-muted)' }}>
            💡 This creates a complimentary gift card (no customer payment). To let customers buy gift cards online, they can do so from your public booking page once Stripe is connected.
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Value *</label><input className="input" type="number" min="1" step="0.01" required value={form.initial_value} onChange={e => setForm(p => ({ ...p, initial_value: e.target.value }))} /></div>
            <div>
              <label className="label">Currency</label>
              <select className="input" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                <option value="gbp">GBP</option><option value="eur">EUR</option><option value="usd">USD</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Recipient name</label><input className="input" placeholder="e.g. Sarah" value={form.recipient_name} onChange={e => setForm(p => ({ ...p, recipient_name: e.target.value }))} /></div>
            <div><label className="label">Recipient email</label><input className="input" type="email" placeholder="sarah@example.com" value={form.recipient_email} onChange={e => setForm(p => ({ ...p, recipient_email: e.target.value }))} /></div>
          </div>
          <div><label className="label">Sender name</label><input className="input" placeholder="Who is it from?" value={form.sender_name} onChange={e => setForm(p => ({ ...p, sender_name: e.target.value }))} /></div>
          <div><label className="label">Personal message</label><textarea className="input resize-none" rows={2} placeholder="Happy birthday!" value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} /></div>
          <div><label className="label">Expiry (days)</label><input className="input" type="number" min="0" placeholder="Leave blank for no expiry" value={form.expires_days} onChange={e => setForm(p => ({ ...p, expires_days: e.target.value }))} /></div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary flex-1">{saving ? <Spinner /> : 'Issue gift card'}</button>
          </div>
        </form>
      </Sheet>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────── */
/*  Main page                                                                  */
/* ─────────────────────────────────────────────────────────────────────────── */

export default function RetentionHub() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';
  const [activeTab, setActiveTab] = useState('loyalty');

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--bam-text)' }}>Retention</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>Loyalty, memberships, packages, and gift cards</p>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1 border-b" style={{ borderColor: border }}>
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all flex-shrink-0 ${activeTab === tab.id ? 'border-indigo-500 text-indigo-600' : 'border-transparent'}`}
            style={{ color: activeTab === tab.id ? undefined : 'var(--bam-text-muted)' }}>
            <span>{tab.icon}</span>{tab.label}
          </button>
        ))}
      </div>

      <div className="pb-8">
        {activeTab === 'loyalty'     && <LoyaltyTab border={border} isDark={isDark} />}
        {activeTab === 'memberships' && <MembershipsTab border={border} isDark={isDark} />}
        {activeTab === 'packages'    && <PackagesTab border={border} isDark={isDark} />}
        {activeTab === 'gift-cards'  && <GiftCardsTab border={border} isDark={isDark} />}
      </div>
    </div>
  );
}
