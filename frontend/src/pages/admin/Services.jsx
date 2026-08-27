import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { servicesAPI, resourcesAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';

/* ── constants ───────────────────────────────────────────────────────────── */

const EMPTY = {
  name: '', description: '', category: '', price: '', duration_minutes: 60,
  buffer_time: 0, sort_order: 0, is_active: true, online_booking_enabled: true,
  deposit_required: false, deposit_amount: '', max_group_size: 1,
  cancellation_policy: '', location: '', addons: [], resource_ids: [],
};

const CANCELLATION_PRESETS = [
  '24 hours notice required',
  '48 hours notice required',
  'No refunds within 24 hours',
  'Fully refundable up to 48 hours before',
  'Non-refundable deposit',
];

const SYM = '€';

/* ── helpers ─────────────────────────────────────────────────────────────── */

function groupByCategory(services) {
  const groups = {};
  for (const s of services) {
    const cat = s.category?.trim() || 'Uncategorised';
    (groups[cat] = groups[cat] || []).push(s);
  }
  return Object.entries(groups).sort(([a], [b]) =>
    a === 'Uncategorised' ? 1 : b === 'Uncategorised' ? -1 : a.localeCompare(b)
  );
}

/* ── ServiceForm ─────────────────────────────────────────────────────────── */

function ServiceForm({ initial, resources, onSave, onClose, isDark, border }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [addonInput, setAddonInput] = useState('');

  const set = (k) => (e) =>
    setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const addAddon = () => {
    const v = addonInput.trim();
    if (!v) return;
    setForm(p => ({ ...p, addons: [...(p.addons || []), v] }));
    setAddonInput('');
  };

  const removeAddon = (i) =>
    setForm(p => ({ ...p, addons: (p.addons || []).filter((_, idx) => idx !== i) }));

  const toggleResource = (id) =>
    setForm(p => {
      const ids = p.resource_ids || [];
      return { ...p, resource_ids: ids.includes(id) ? ids.filter(r => r !== id) : [...ids, id] };
    });

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (!form.duration_minutes || parseInt(form.duration_minutes) < 5) { toast.error('Duration must be at least 5 min'); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        price: parseFloat(form.price) || 0,
        duration_minutes: parseInt(form.duration_minutes),
        buffer_time: parseInt(form.buffer_time) || 0,
        deposit_amount: form.deposit_required ? (parseFloat(form.deposit_amount) || 0) : 0,
        max_group_size: parseInt(form.max_group_size) || 1,
        addons: form.addons || [],
        resource_ids: form.resource_ids || [],
      });
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 80px)' }}>
      {/* Name + Category */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="label">Service Name *</label>
          <input className="input" placeholder="e.g. Classic Haircut" required value={form.name} onChange={set('name')} />
        </div>
        <div>
          <label className="label">Category</label>
          <input className="input" placeholder="Hair, Nails, Skin…" value={form.category || ''} onChange={set('category')} />
        </div>
        <div>
          <label className="label">Location / Room</label>
          <input className="input" placeholder="Studio A, Mobile…" value={form.location || ''} onChange={set('location')} />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="label">Description</label>
        <textarea className="input resize-none" rows={2} placeholder="What does this service include?" value={form.description || ''} onChange={set('description')} />
      </div>

      {/* Price / Duration / Buffer */}
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="label">Price ({SYM}) *</label>
          <input className="input" type="number" min="0" step="0.01" placeholder="0.00" required value={form.price} onChange={set('price')} />
        </div>
        <div>
          <label className="label">Duration (min) *</label>
          <input className="input" type="number" min="5" step="5" required value={form.duration_minutes} onChange={set('duration_minutes')} />
        </div>
        <div>
          <label className="label">Buffer (min)</label>
          <input className="input" type="number" min="0" step="5" value={form.buffer_time || 0} onChange={set('buffer_time')} />
          <p className="text-[10px] mt-0.5" style={{ color: 'var(--bam-text-faint)' }}>Cleanup / prep time</p>
        </div>
      </div>

      {/* Toggles */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>Online booking</p>
            <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>Show this service on your public booking page</p>
          </div>
          <Toggle checked={!!form.online_booking_enabled} onChange={v => setForm(p => ({ ...p, online_booking_enabled: v }))} />
        </label>
        {form.id && (
          <label className="flex items-center justify-between cursor-pointer border-t pt-3" style={{ borderColor: border }}>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>Active</p>
              <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>Inactive services are hidden everywhere</p>
            </div>
            <Toggle checked={!!form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
          </label>
        )}
      </div>

      {/* Deposit */}
      <div className="rounded-2xl p-4 space-y-3" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>Require deposit</p>
            <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>No-show protection — shown on booking page</p>
          </div>
          <Toggle checked={!!form.deposit_required} onChange={v => setForm(p => ({ ...p, deposit_required: v }))} />
        </label>
        {form.deposit_required && (
          <div className="pt-2 border-t" style={{ borderColor: border }}>
            <label className="label">Deposit amount ({SYM})</label>
            <input className="input" type="number" min="0" step="0.01" placeholder="e.g. 10.00" value={form.deposit_amount || ''} onChange={set('deposit_amount')} />
          </div>
        )}
      </div>

      {/* Group size */}
      <div>
        <label className="label">Max group size</label>
        <input className="input" type="number" min="1" max="50" value={form.max_group_size || 1} onChange={set('max_group_size')} />
        <p className="text-xs mt-1" style={{ color: 'var(--bam-text-faint)' }}>1 = individual only. Higher = group/class booking.</p>
      </div>

      {/* Cancellation policy */}
      <div>
        <label className="label">Cancellation Policy</label>
        <textarea className="input resize-none" rows={2} placeholder="e.g. 24 hours notice required for full refund" value={form.cancellation_policy || ''} onChange={set('cancellation_policy')} />
        <div className="flex flex-wrap gap-1.5 mt-2">
          {CANCELLATION_PRESETS.map(p => (
            <button key={p} type="button" onClick={() => setForm(f => ({ ...f, cancellation_policy: p }))}
              className="text-[10px] px-2 py-1 rounded-lg font-semibold transition-colors"
              style={{ background: 'var(--bam-surface)', border: `1px solid ${border}`, color: 'var(--bam-text-muted)' }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Add-ons */}
      <div>
        <label className="label">Add-ons / Extras</label>
        <div className="flex gap-2">
          <input className="input flex-1 text-sm" placeholder="e.g. Deep conditioning treatment" value={addonInput} onChange={e => setAddonInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addAddon())} />
          <button type="button" onClick={addAddon} className="btn-secondary text-sm px-3 flex-shrink-0">Add</button>
        </div>
        {(form.addons || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(form.addons || []).map((a, i) => (
              <span key={i} className="flex items-center gap-1 text-xs px-2 py-1 rounded-full font-semibold"
                style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}`, color: 'var(--bam-text-muted)' }}>
                {a}
                <button type="button" onClick={() => removeAddon(i)} className="hover:text-red-500 transition-colors ml-0.5">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Resources */}
      {resources.length > 0 && (
        <div>
          <label className="label">Required Resources</label>
          <div className="grid grid-cols-2 gap-2">
            {resources.filter(r => r.is_active).map(r => {
              const sel = (form.resource_ids || []).includes(r.id);
              return (
                <label key={r.id} className={`flex items-center gap-2.5 p-3 rounded-xl cursor-pointer transition-all border ${sel ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20' : ''}`}
                  style={!sel ? { border: `1px solid ${border}`, background: 'var(--bam-surface-soft)' } : {}}>
                  <input type="checkbox" className="w-4 h-4 accent-primary-600" checked={sel} onChange={() => toggleResource(r.id)} />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate" style={{ color: 'var(--bam-text)' }}>{r.name}</p>
                    <p className="text-xs capitalize" style={{ color: 'var(--bam-text-faint)' }}>{r.type}{r.quantity > 1 ? ` · ×${r.quantity}` : ''}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t" style={{ borderColor: border }}>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? <Spinner /> : form.id ? 'Save Changes' : 'Create Service'}
        </button>
      </div>
    </form>
  );
}

/* ── ServiceCard ─────────────────────────────────────────────────────────── */

function ServiceCard({ svc, onEdit, onDuplicate, onToggleActive, onToggleOnline, onMoveUp, onMoveDown, isFirst, isLast, isDark, border }) {
  return (
    <div className={`rounded-2xl p-4 border transition-all ${!svc.is_active ? 'opacity-50' : ''}`}
      style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
      <div className="flex items-start gap-3">
        {/* Sort handles */}
        <div className="flex flex-col gap-0.5 mt-0.5 flex-shrink-0">
          <button onClick={onMoveUp} disabled={isFirst} className="p-1 rounded transition-colors disabled:opacity-20"
            style={{ color: 'var(--bam-text-faint)' }}>
            <ChevUpIcon className="w-3.5 h-3.5" />
          </button>
          <button onClick={onMoveDown} disabled={isLast} className="p-1 rounded transition-colors disabled:opacity-20"
            style={{ color: 'var(--bam-text-faint)' }}>
            <ChevDownIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>{svc.name}</h3>
            {!svc.is_active && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">Archived</span>
            )}
            {svc.is_active && !svc.online_booking_enabled && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">Staff only</span>
            )}
            {svc.is_active && svc.online_booking_enabled && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400">Online ✓</span>
            )}
          </div>
          {svc.description && <p className="text-xs mb-2 line-clamp-2" style={{ color: 'var(--bam-text-muted)' }}>{svc.description}</p>}

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-bold text-base text-primary-600 dark:text-primary-400">{SYM}{parseFloat(svc.price || 0).toFixed(2)}</span>
            <span className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>{svc.duration_minutes} min</span>
            {svc.buffer_time > 0 && <span className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>+{svc.buffer_time}m buffer</span>}
            {svc.deposit_required && svc.deposit_amount > 0 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400">
                🔒 {SYM}{parseFloat(svc.deposit_amount).toFixed(0)} deposit
              </span>
            )}
            {parseInt(svc.max_group_size) > 1 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400">
                Up to {svc.max_group_size} people
              </span>
            )}
          </div>

          {/* Resources */}
          {svc.resources?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {svc.resources.map(r => (
                <span key={r.id} className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}`, color: 'var(--bam-text-faint)' }}>
                  📦 {r.name}
                </span>
              ))}
            </div>
          )}

          {/* Add-ons */}
          {svc.addons?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {svc.addons.map((a, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--bam-surface-soft)', color: 'var(--bam-text-faint)' }}>
                  + {a}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onToggleOnline(svc)} title={svc.online_booking_enabled ? 'Disable online booking' : 'Enable online booking'}
            className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--bam-text-faint)' }}>
            {svc.online_booking_enabled ? <GlobeIcon className="w-4 h-4" /> : <GlobeOffIcon className="w-4 h-4" />}
          </button>
          <button onClick={() => onDuplicate(svc)} title="Duplicate" className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--bam-text-faint)' }}>
            <CopyIcon className="w-4 h-4" />
          </button>
          <button onClick={() => onEdit(svc)} className="p-1.5 rounded-lg transition-colors" style={{ color: 'var(--bam-text-faint)' }}>
            <EditIcon className="w-4 h-4" />
          </button>
          <button onClick={() => onToggleActive(svc)} title={svc.is_active ? 'Archive' : 'Restore'}
            className="p-1.5 rounded-lg transition-colors" style={{ color: svc.is_active ? 'var(--bam-text-faint)' : '#10b981' }}>
            {svc.is_active ? <ArchiveIcon className="w-4 h-4" /> : <RestoreIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function Services() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const [services, setServices]   = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // null | 'create' | service
  const [showArchived, setShowArchived] = useState(false);

  const load = useCallback(() => {
    Promise.all([
      servicesAPI.list(),
      resourcesAPI.list().catch(() => []),
    ]).then(([svcs, res]) => {
      setServices(svcs);
      setResources(res);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const active   = services.filter(s => s.is_active);
  const archived = services.filter(s => !s.is_active);
  const displayed = showArchived ? services : active;
  const groups = useMemo(() => groupByCategory(displayed), [displayed]);

  const openEdit   = (svc) => setModal({ ...svc, resource_ids: (svc.resources || []).map(r => r.id) });
  const openCreate = () => setModal('create');
  const closeModal = () => setModal(null);

  const handleSave = async (formData) => {
    if (modal === 'create') {
      const svc = await servicesAPI.create(formData);
      setServices(p => [...p, svc]);
      toast.success('Service created ✓');
    } else {
      const svc = await servicesAPI.update(modal.id, formData);
      setServices(p => p.map(s => s.id === svc.id ? svc : s));
      toast.success('Service updated ✓');
    }
    closeModal();
  };

  const handleDuplicate = async (svc) => {
    const { id, created_at, updated_at, resources: r, ...rest } = svc;
    try {
      const dup = await servicesAPI.create({ ...rest, name: `${svc.name} (copy)`, resource_ids: (r || []).map(x => x.id) });
      setServices(p => [...p, dup]);
      toast.success('Duplicated ✓');
    } catch { toast.error('Duplicate failed'); }
  };

  const handleToggleActive = async (svc) => {
    try {
      const updated = await servicesAPI.update(svc.id, { is_active: !svc.is_active });
      setServices(p => p.map(s => s.id === svc.id ? updated : s));
      toast.success(svc.is_active ? 'Archived' : 'Restored');
    } catch { toast.error('Update failed'); }
  };

  const handleToggleOnline = async (svc) => {
    try {
      const updated = await servicesAPI.update(svc.id, { online_booking_enabled: !svc.online_booking_enabled });
      setServices(p => p.map(s => s.id === svc.id ? updated : s));
    } catch { toast.error('Update failed'); }
  };

  const move = async (svc, dir) => {
    const catGroup = groups.find(([_, svcs]) => svcs.some(s => s.id === svc.id));
    if (!catGroup) return;
    const [, catSvcs] = catGroup;
    const idx = catSvcs.findIndex(s => s.id === svc.id);
    if ((dir === -1 && idx === 0) || (dir === 1 && idx === catSvcs.length - 1)) return;
    const newCat = [...catSvcs];
    [newCat[idx], newCat[idx + dir]] = [newCat[idx + dir], newCat[idx]];
    const allSorted = groups.flatMap(([, svcs]) => (svcs[0]?.id === catSvcs[0]?.id ? newCat : svcs));
    setServices(p => {
      const sorted = allSorted.map((s, i) => ({ ...s, sort_order: i }));
      return p.map(orig => sorted.find(s => s.id === orig.id) || orig);
    });
    await servicesAPI.reorder(allSorted.map(s => s.id)).catch(() => {});
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--bam-text)' }}>Services</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>
            {active.length} active{archived.length > 0 ? ` · ${archived.length} archived` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {archived.length > 0 && (
            <button onClick={() => setShowArchived(!showArchived)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors"
              style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}`, color: 'var(--bam-text-muted)' }}>
              {showArchived ? 'Hide archived' : `Show archived (${archived.length})`}
            </button>
          )}
          <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 text-sm">
            <PlusIcon className="w-4 h-4" /> Add Service
          </button>
        </div>
      </div>

      {/* Resource hint if none created */}
      {!loading && resources.length === 0 && (
        <div className="rounded-2xl p-4 flex items-center gap-3" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
          <span className="text-2xl">📦</span>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--bam-text)' }}>No resources created yet</p>
            <p className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>
              Add rooms, chairs, or equipment in the <a href="/admin/resources" className="text-primary-600 hover:underline">Resources</a> section to prevent double-booking.
            </p>
          </div>
        </div>
      )}

      {/* Services by category */}
      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bam-surface-soft)' }} />)}
        </div>
      ) : services.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">✂️</p>
          <p className="font-semibold" style={{ color: 'var(--bam-text)' }}>No services yet</p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--bam-text-muted)' }}>Add your first service to start accepting bookings</p>
          <button onClick={openCreate} className="btn-primary">Add Service</button>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(([category, svcs]) => (
            <div key={category}>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="font-bold text-sm uppercase tracking-widest" style={{ color: 'var(--bam-text-faint)' }}>{category}</h2>
                <div className="flex-1 h-px" style={{ background: border }} />
                <span className="text-xs font-semibold" style={{ color: 'var(--bam-text-faint)' }}>{svcs.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {svcs.map((svc, i) => (
                  <ServiceCard
                    key={svc.id} svc={svc} isDark={isDark} border={border}
                    onEdit={openEdit}
                    onDuplicate={handleDuplicate}
                    onToggleActive={handleToggleActive}
                    onToggleOnline={handleToggleOnline}
                    onMoveUp={() => move(svc, -1)}
                    onMoveDown={() => move(svc, 1)}
                    isFirst={i === 0}
                    isLast={i === svcs.length - 1}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit / Create sheet */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div
              key="svc-backdrop"
              className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal}
            />
            <motion.div
              key="svc-sheet"
              className="fixed inset-x-0 bottom-0 z-[81] rounded-t-3xl sm:inset-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[480px] sm:rounded-2xl flex flex-col overflow-hidden"
              style={{ background: isDark ? '#0c1528' : '#fff', border: `1px solid ${border}`, maxHeight: '95dvh' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340, mass: 0.8 }}
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bam-border-medium)' }} />
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: border }}>
                <h2 className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>
                  {modal === 'create' ? 'New Service' : `Edit: ${modal.name}`}
                </h2>
                <button onClick={closeModal} className="p-1.5 rounded-xl" style={{ color: 'var(--bam-text-muted)' }}>
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <ServiceForm
                initial={modal === 'create' ? EMPTY : modal}
                resources={resources}
                onSave={handleSave}
                onClose={closeModal}
                isDark={isDark}
                border={border}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Toggle ──────────────────────────────────────────────────────────────── */
function Toggle({ checked, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${checked ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5.5 left-0' : 'left-0.5'}`} style={{ transform: checked ? 'translateX(20px)' : 'translateX(0)' }} />
    </button>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────────── */
function Spinner() { return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />; }
function PlusIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function XIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function EditIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>; }
function CopyIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>; }
function ArchiveIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="21 8 21 21 3 21 3 8"/><rect x="1" y="3" width="22" height="5"/><line x1="10" y1="12" x2="14" y2="12"/></svg>; }
function RestoreIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M3 12a9 9 0 109-9 9.75 9.75 0 00-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>; }
function GlobeIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>; }
function GlobeOffIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="1" y1="1" x2="23" y2="23"/><path d="M10.5 5.05A10 10 0 1118.95 16.5"/><path d="M12 2a15.3 15.3 0 013.18 10.3M12 2c-.6 0-1.18.1-1.73.26M2 12h4"/></svg>; }
function ChevUpIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="18 15 12 9 6 15"/></svg>; }
function ChevDownIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="6 9 12 15 18 9"/></svg>; }
