import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { resourcesAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import toast from 'react-hot-toast';
import { Armchair, BedDouble, DoorOpen, Lightbulb, Package, Wrench } from 'lucide-react';

/* ── constants ───────────────────────────────────────────────────────────── */

const RESOURCE_TYPES = [
  { value: 'room',      label: 'Room',      icon: DoorOpen },
  { value: 'chair',     label: 'Chair',     icon: Armchair },
  { value: 'bed',       label: 'Bed',       icon: BedDouble },
  { value: 'equipment', label: 'Equipment', icon: Wrench },
  { value: 'other',     label: 'Other',     icon: Package },
];

const EMPTY = {
  name: '', type: 'room', description: '', quantity: 1, is_active: true,
};

function ResourceIcon({ type, className }) {
  const Icon = RESOURCE_TYPES.find(r => r.value === type)?.icon ?? Package;
  return <Icon className={className} strokeWidth={1.8} aria-hidden="true" />;
}

/* ── ResourceForm ────────────────────────────────────────────────────────── */

function ResourceForm({ initial, onSave, onClose, isDark, border }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);

  const set = (k) => (e) =>
    setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    if (parseInt(form.quantity) < 1) { toast.error('Quantity must be at least 1'); return; }
    setSaving(true);
    try {
      await onSave({ ...form, quantity: parseInt(form.quantity) || 1 });
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={submit} className="p-5 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100dvh - 160px)' }}>
      <div>
        <label className="label">Resource Name *</label>
        <input className="input" placeholder="e.g. Massage Room 1" required value={form.name} onChange={set('name')} />
      </div>

      <div>
        <label className="label">Type</label>
        <div className="grid grid-cols-3 gap-2">
          {RESOURCE_TYPES.map(t => (
            <label key={t.value} className="flex flex-col items-center gap-1 p-3 rounded-xl cursor-pointer transition-all text-center"
              style={{ background: form.type === t.value ? 'rgba(99,102,241,0.1)' : 'var(--bam-surface-soft)', border: `1px solid ${form.type === t.value ? 'rgba(99,102,241,0.4)' : border}` }}>
              <input type="radio" name="res-type" value={t.value} checked={form.type === t.value} onChange={set('type')} className="sr-only" />
              <t.icon className="w-5 h-5" strokeWidth={1.8} aria-hidden="true" />
              <span className="text-xs font-semibold" style={{ color: form.type === t.value ? '#6366f1' : 'var(--bam-text-muted)' }}>{t.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="label">Quantity</label>
        <input className="input" type="number" min="1" max="100" value={form.quantity} onChange={set('quantity')} />
        <p className="text-xs mt-1" style={{ color: 'var(--bam-text-faint)' }}>How many of this resource exist. Bookings are blocked when all are occupied.</p>
      </div>

      <div>
        <label className="label">Description (optional)</label>
        <textarea className="input resize-none" rows={2} placeholder="Notes about this resource" value={form.description || ''} onChange={set('description')} />
      </div>

      {form.id && (
        <label className="flex items-center justify-between cursor-pointer rounded-2xl p-4" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>Active</p>
            <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>Inactive resources are excluded from conflict checks</p>
          </div>
          <Toggle checked={!!form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
        </label>
      )}

      <div className="flex gap-3 pt-2 border-t" style={{ borderColor: border }}>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? <Spinner /> : form.id ? 'Save Changes' : 'Add Resource'}
        </button>
      </div>
    </form>
  );
}

/* ── ResourceCard ────────────────────────────────────────────────────────── */

function ResourceCard({ resource, onEdit, onDelete, border, isDark }) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleDelete = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try {
      await onDelete(resource.id);
      toast.success('Resource removed');
    } catch { toast.error('Could not delete — it may be linked to services'); setConfirmDelete(false); }
  };

  return (
    <div className={`rounded-2xl p-4 border transition-all ${!resource.is_active ? 'opacity-50' : ''}`}
      style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: 'var(--bam-surface-soft)' }}>
          <ResourceIcon type={resource.type} className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>{resource.name}</h3>
            {!resource.is_active && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">Inactive</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs capitalize" style={{ color: 'var(--bam-text-muted)' }}>{resource.type}</span>
            {resource.quantity > 1 && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400">
                ×{resource.quantity} units
              </span>
            )}
          </div>
          {resource.description && (
            <p className="text-xs mt-1 line-clamp-2" style={{ color: 'var(--bam-text-faint)' }}>{resource.description}</p>
          )}
          {resource.services?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="text-[10px] font-semibold" style={{ color: 'var(--bam-text-faint)' }}>Required by:</span>
              {resource.services.map(s => (
                <span key={s.id} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--bam-surface-soft)', color: 'var(--bam-text-faint)', border: `1px solid ${border}` }}>
                  {s.name}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={() => onEdit(resource)} className="p-1.5 rounded-lg" style={{ color: 'var(--bam-text-faint)' }}>
            <EditIcon className="w-4 h-4" />
          </button>
          <button onClick={handleDelete}
            className={`p-1.5 rounded-lg text-xs font-bold transition-all ${confirmDelete ? 'bg-red-100 dark:bg-red-900/30 text-red-600 px-2.5' : ''}`}
            style={!confirmDelete ? { color: 'var(--bam-text-faint)' } : {}}
            onBlur={() => setTimeout(() => setConfirmDelete(false), 300)}>
            {confirmDelete ? 'Confirm?' : <TrashIcon className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function Resources() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const [resources, setResources] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modal, setModal]         = useState(null); // null | 'create' | resource

  const load = useCallback(() => {
    resourcesAPI.list()
      .then(setResources)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit   = (r) => setModal({ ...r });
  const openCreate = () => setModal('create');
  const closeModal = () => setModal(null);

  const handleSave = async (formData) => {
    if (modal === 'create') {
      const r = await resourcesAPI.create(formData);
      setResources(p => [...p, r]);
      toast.success('Resource added ✓');
    } else {
      const r = await resourcesAPI.update(modal.id, formData);
      setResources(p => p.map(x => x.id === r.id ? r : x));
      toast.success('Resource updated ✓');
    }
    closeModal();
  };

  const handleDelete = async (id) => {
    await resourcesAPI.remove(id);
    setResources(p => p.filter(r => r.id !== id));
  };

  const active   = resources.filter(r => r.is_active);
  const inactive = resources.filter(r => !r.is_active);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--bam-text)' }}>Resources</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>
            Rooms, chairs, beds and equipment — prevents double-booking
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 text-sm">
          <PlusIcon className="w-4 h-4" /> Add Resource
        </button>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl p-4 flex items-start gap-3" style={{ background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.2)' }}>
        <Lightbulb className="w-5 h-5 mt-0.5 flex-shrink-0 text-primary-600 dark:text-primary-400" strokeWidth={1.8} aria-hidden="true" />
        <div>
          <p className="font-semibold text-sm" style={{ color: 'var(--bam-text)' }}>How resources work</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>
            Assign a resource to a service (in the Services page). When a booking is made, that resource is reserved for the duration. If all units are occupied, that time slot is removed from the booking page automatically.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bam-surface-soft)' }} />)}
        </div>
      ) : resources.length === 0 ? (
        <div className="card p-12 text-center">
          <Package className="w-9 h-9 mx-auto mb-3 text-primary-600 dark:text-primary-400" strokeWidth={1.7} aria-hidden="true" />
          <p className="font-semibold" style={{ color: 'var(--bam-text)' }}>No resources yet</p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--bam-text-muted)' }}>
            Add your rooms, chairs, and equipment to start preventing double-booking
          </p>
          <button onClick={openCreate} className="btn-primary">Add Resource</button>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Active */}
          <div className="grid sm:grid-cols-2 gap-3">
            {active.map(r => (
              <ResourceCard key={r.id} resource={r} onEdit={openEdit} onDelete={handleDelete} border={border} isDark={isDark} />
            ))}
          </div>

          {/* Inactive */}
          {inactive.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--bam-text-faint)' }}>Inactive</h3>
                <div className="flex-1 h-px" style={{ background: border }} />
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {inactive.map(r => (
                  <ResourceCard key={r.id} resource={r} onEdit={openEdit} onDelete={handleDelete} border={border} isDark={isDark} />
                ))}
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="rounded-2xl p-4" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--bam-text-faint)' }}>Summary</p>
            <div className="flex flex-wrap gap-3">
              {RESOURCE_TYPES.map(t => {
                const count = active.filter(r => r.type === t.value).length;
                if (count === 0) return null;
                return (
                  <div key={t.value} className="flex items-center gap-2">
                    <span>{t.icon}</span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>{count} {t.label}{count !== 1 ? 's' : ''}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit sheet */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div key="res-backdrop" className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal} />
            <motion.div key="res-sheet"
              className="fixed inset-x-0 bottom-0 z-[81] rounded-t-3xl sm:inset-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[420px] sm:rounded-2xl flex flex-col overflow-hidden"
              style={{ background: isDark ? '#0c1528' : '#fff', border: `1px solid ${border}`, maxHeight: '95dvh' }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340, mass: 0.8 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bam-border-medium)' }} />
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: border }}>
                <h2 className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>
                  {modal === 'create' ? 'New Resource' : `Edit: ${modal.name}`}
                </h2>
                <button onClick={closeModal} className="p-1.5 rounded-xl" style={{ color: 'var(--bam-text-muted)' }}>
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <ResourceForm
                initial={modal === 'create' ? EMPTY : modal}
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
      <div className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform"
        style={{ transform: checked ? 'translateX(20px)' : 'translateX(2px)', left: 0 }} />
    </button>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────────── */
function Spinner() { return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />; }
function PlusIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function XIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function EditIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4z"/></svg>; }
function TrashIcon({ className }) { return <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>; }
