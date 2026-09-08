import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { staffAPI, servicesAPI } from '../../services/api';
import { useTheme } from '../../context/ThemeContext';
import { businessCurrencySymbol } from '../../utils/currency';
import toast from 'react-hot-toast';

const SYM = businessCurrencySymbol();

/* ── constants ───────────────────────────────────────────────────────────── */

const PERMISSIONS = [
  { value: 'owner',     label: 'Owner',     desc: 'Full access to everything' },
  { value: 'manager',   label: 'Manager',   desc: 'All ops, except billing & account deletion' },
  { value: 'staff',     label: 'Staff',     desc: 'See own schedule & assigned services' },
  { value: 'reception', label: 'Reception', desc: 'Book & manage appointments, view customers' },
];

const COMMISSION_TYPES = ['none', 'percentage', 'flat'];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const DAY_FULL = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

const EMPTY = {
  name: '', email: '', phone: '', bio: '',
  role: '', permissions: 'staff',
  working_days: ['Mon','Tue','Wed','Thu','Fri'],
  working_hours_start: '09:00', working_hours_end: '18:00',
  commission_type: 'none', commission_value: '',
  service_ids: [], breaks: [], time_off: [],
  is_active: true,
};

/* ── StaffForm ───────────────────────────────────────────────────────────── */

function StaffForm({ initial, services, onSave, onClose, isDark, border }) {
  const [form, setForm] = useState({ ...EMPTY, ...initial });
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  const set = (k) => (e) =>
    setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const toggleDay = (d) =>
    setForm(p => {
      const days = p.working_days || [];
      return { ...p, working_days: days.includes(d) ? days.filter(x => x !== d) : [...days, d] };
    });

  const toggleService = (id) =>
    setForm(p => {
      const ids = p.service_ids || [];
      return { ...p, service_ids: ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id] };
    });

  const addBreak = () =>
    setForm(p => ({ ...p, breaks: [...(p.breaks || []), { day: 'Mon', start: '12:00', end: '13:00' }] }));

  const updateBreak = (i, field, val) =>
    setForm(p => { const br = [...(p.breaks || [])]; br[i] = { ...br[i], [field]: val }; return { ...p, breaks: br }; });

  const removeBreak = (i) =>
    setForm(p => ({ ...p, breaks: (p.breaks || []).filter((_, idx) => idx !== i) }));

  const addTimeOff = () =>
    setForm(p => ({ ...p, time_off: [...(p.time_off || []), { date: '', reason: '' }] }));

  const updateTimeOff = (i, field, val) =>
    setForm(p => { const t = [...(p.time_off || [])]; t[i] = { ...t[i], [field]: val }; return { ...p, time_off: t }; });

  const removeTimeOff = (i) =>
    setForm(p => ({ ...p, time_off: (p.time_off || []).filter((_, idx) => idx !== i) }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        commission_value: form.commission_type !== 'none' ? (parseFloat(form.commission_value) || 0) : 0,
        service_ids: form.service_ids || [],
        breaks: form.breaks || [],
        time_off: form.time_off || [],
        working_days: form.working_days || [],
      });
    } catch (err) { toast.error(err.message || 'Failed to save'); }
    finally { setSaving(false); }
  };

  const tabs = ['basic', 'schedule', 'services', 'pay'];
  const tabLabel = { basic: 'Details', schedule: 'Schedule', services: 'Services', pay: 'Pay & Role' };

  return (
    <form onSubmit={submit} className="flex flex-col" style={{ maxHeight: 'calc(100dvh - 80px)' }}>
      {/* Tabs */}
      <div className="flex border-b flex-shrink-0 overflow-x-auto" style={{ borderColor: border }}>
        {tabs.map(t => (
          <button key={t} type="button" onClick={() => setActiveTab(t)}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border-b-2 ${activeTab === t ? 'border-primary-500 text-primary-600' : 'border-transparent'}`}
            style={{ color: activeTab === t ? undefined : 'var(--bam-text-muted)' }}>
            {tabLabel[t]}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {/* Basic */}
        {activeTab === 'basic' && (
          <>
            <div>
              <label className="label">Full Name *</label>
              <input className="input" placeholder="e.g. Emma Walsh" required value={form.name} onChange={set('name')} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Role / Title</label>
                <input className="input" placeholder="e.g. Senior Stylist" value={form.role || ''} onChange={set('role')} />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" type="tel" placeholder="+353…" value={form.phone || ''} onChange={set('phone')} />
              </div>
            </div>
            <div>
              <label className="label">Email</label>
              <input className="input" type="email" placeholder="emma@salon.com" value={form.email || ''} onChange={set('email')} />
            </div>
            <div>
              <label className="label">Bio</label>
              <textarea className="input resize-none" rows={3} placeholder="Short bio shown on public booking page" value={form.bio || ''} onChange={set('bio')} />
            </div>
            {form.id && (
              <label className="flex items-center justify-between cursor-pointer rounded-2xl p-4" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>Active</p>
                  <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>Inactive staff won't appear for booking</p>
                </div>
                <Toggle checked={!!form.is_active} onChange={v => setForm(p => ({ ...p, is_active: v }))} />
              </label>
            )}
          </>
        )}

        {/* Schedule */}
        {activeTab === 'schedule' && (
          <>
            <div>
              <label className="label">Working Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(d => (
                  <button key={d} type="button" onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${(form.working_days || []).includes(d) ? 'bg-primary-600 text-white border-primary-600' : ''}`}
                    style={!(form.working_days || []).includes(d) ? { border: `1px solid ${border}`, color: 'var(--bam-text-muted)', background: 'var(--bam-surface-soft)' } : {}}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Start time</label>
                <input className="input" type="time" value={form.working_hours_start || '09:00'} onChange={set('working_hours_start')} />
              </div>
              <div>
                <label className="label">End time</label>
                <input className="input" type="time" value={form.working_hours_end || '18:00'} onChange={set('working_hours_end')} />
              </div>
            </div>

            {/* Breaks */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label !mb-0">Breaks</label>
                <button type="button" onClick={addBreak} className="text-xs font-semibold text-primary-600">+ Add break</button>
              </div>
              {(form.breaks || []).length === 0 && (
                <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>No breaks configured</p>
              )}
              <div className="space-y-2">
                {(form.breaks || []).map((br, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
                    <select className="input flex-none w-20 text-xs" value={br.day} onChange={e => updateBreak(i, 'day', e.target.value)}>
                      {DAYS.map(d => <option key={d}>{d}</option>)}
                    </select>
                    <input className="input w-24 text-xs" type="time" value={br.start} onChange={e => updateBreak(i, 'start', e.target.value)} />
                    <span className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>–</span>
                    <input className="input w-24 text-xs" type="time" value={br.end} onChange={e => updateBreak(i, 'end', e.target.value)} />
                    <button type="button" onClick={() => removeBreak(i)} className="text-red-500 ml-auto">✕</button>
                  </div>
                ))}
              </div>
            </div>

            {/* Time off */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label !mb-0">Time Off / Holiday</label>
                <button type="button" onClick={addTimeOff} className="text-xs font-semibold text-primary-600">+ Add date</button>
              </div>
              {(form.time_off || []).length === 0 && (
                <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>No time off scheduled</p>
              )}
              <div className="space-y-2">
                {(form.time_off || []).map((t, i) => (
                  <div key={i} className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
                    <input className="input flex-1 text-xs" type="date" value={t.date} onChange={e => updateTimeOff(i, 'date', e.target.value)} />
                    <input className="input flex-1 text-xs" placeholder="Reason (optional)" value={t.reason} onChange={e => updateTimeOff(i, 'reason', e.target.value)} />
                    <button type="button" onClick={() => removeTimeOff(i)} className="text-red-500">✕</button>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Services */}
        {activeTab === 'services' && (
          <div>
            <p className="text-sm mb-3" style={{ color: 'var(--bam-text-muted)' }}>
              Which services can this staff member perform? Customers can filter by staff on the booking page.
            </p>
            {services.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--bam-text-faint)' }}>No services created yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {services.map(svc => {
                  const sel = (form.service_ids || []).includes(svc.id);
                  return (
                    <label key={svc.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all"
                      style={{ background: sel ? 'var(--bam-primary-soft, rgba(99,102,241,0.08))' : 'var(--bam-surface-soft)', border: `1px solid ${sel ? 'rgba(99,102,241,0.3)' : border}` }}>
                      <input type="checkbox" className="w-4 h-4 accent-primary-600 flex-shrink-0" checked={sel} onChange={() => toggleService(svc.id)} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--bam-text)' }}>{svc.name}</p>
                        <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>{svc.duration_minutes}min · {SYM}{parseFloat(svc.price || 0).toFixed(0)}{svc.category ? ` · ${svc.category}` : ''}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Pay & Role */}
        {activeTab === 'pay' && (
          <>
            <div>
              <label className="label">Permissions Role</label>
              <div className="space-y-2">
                {PERMISSIONS.map(p => (
                  <label key={p.value} className="flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all"
                    style={{ background: form.permissions === p.value ? 'var(--bam-primary-soft, rgba(99,102,241,0.08))' : 'var(--bam-surface-soft)', border: `1px solid ${form.permissions === p.value ? 'rgba(99,102,241,0.3)' : border}` }}>
                    <input type="radio" name="permissions" value={p.value} checked={form.permissions === p.value} onChange={set('permissions')} className="mt-0.5 accent-primary-600" />
                    <div>
                      <p className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>{p.label}</p>
                      <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>{p.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="label">Commission</label>
              <div className="flex gap-2 mb-2">
                {COMMISSION_TYPES.map(t => (
                  <button key={t} type="button" onClick={() => setForm(p => ({ ...p, commission_type: t }))}
                    className={`flex-1 py-1.5 rounded-xl text-xs font-bold capitalize transition-all border ${form.commission_type === t ? 'bg-primary-600 text-white border-primary-600' : ''}`}
                    style={form.commission_type !== t ? { border: `1px solid ${border}`, color: 'var(--bam-text-muted)', background: 'var(--bam-surface-soft)' } : {}}>
                    {t}
                  </button>
                ))}
              </div>
              {form.commission_type !== 'none' && (
                <div>
                  <label className="label">{form.commission_type === 'percentage' ? 'Commission %' : `Flat fee (${SYM}) per booking`}</label>
                  <input className="input" type="number" min="0" step={form.commission_type === 'percentage' ? '1' : '0.50'} max={form.commission_type === 'percentage' ? '100' : undefined}
                    placeholder={form.commission_type === 'percentage' ? 'e.g. 20' : 'e.g. 15.00'}
                    value={form.commission_value || ''} onChange={set('commission_value')} />
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-3 p-5 border-t flex-shrink-0" style={{ borderColor: border }}>
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
        <button type="submit" disabled={saving} className="btn-primary flex-1">
          {saving ? <Spinner /> : form.id ? 'Save Changes' : 'Add Staff'}
        </button>
      </div>
    </form>
  );
}

/* ── StaffCard ───────────────────────────────────────────────────────────── */

function StaffCard({ member, onEdit, onSelect, isSelected, isDark, border }) {
  const initials = member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  const permColor = { owner: '#7c3aed', manager: '#2563eb', reception: '#d97706', staff: '#059669' };

  return (
    <div onClick={() => onSelect(member)}
      className={`rounded-2xl p-4 border cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary-500' : 'hover:border-primary-300'} ${!member.is_active ? 'opacity-60' : ''}`}
      style={{ background: 'var(--bam-surface)', border: `1px solid ${border}` }}>
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-sm"
          style={{ background: `hsl(${(member.name.charCodeAt(0) * 37) % 360}, 65%, 45%)` }}>
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>{member.name}</h3>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full capitalize"
              style={{ background: `${permColor[member.permissions] || '#6b7280'}20`, color: permColor[member.permissions] || '#6b7280' }}>
              {member.permissions || 'staff'}
            </span>
          </div>
          {member.role && <p className="text-xs mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>{member.role}</p>}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            {member.working_days?.length > 0 && (
              <p className="text-[10px]" style={{ color: 'var(--bam-text-faint)' }}>
                {member.working_days.join(', ')}
              </p>
            )}
            {member.commission_type && member.commission_type !== 'none' && member.commission_value > 0 && (
              <p className="text-[10px]" style={{ color: 'var(--bam-text-faint)' }}>
                {member.commission_type === 'percentage' ? `${member.commission_value}% commission` : `${SYM}${member.commission_value} / booking`}
              </p>
            )}
          </div>
          {member.service_ids?.length > 0 && (
            <p className="text-[10px] mt-1" style={{ color: 'var(--bam-text-faint)' }}>
              {member.service_ids.length} service{member.service_ids.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        <button onClick={e => { e.stopPropagation(); onEdit(member); }} className="p-1.5 rounded-lg flex-shrink-0" style={{ color: 'var(--bam-text-faint)' }}>
          <EditIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

/* ── PerformancePanel ────────────────────────────────────────────────────── */

function PerformancePanel({ member, border }) {
  const [rows, setRows] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!member) return;
    setLoading(true);
    // /staff/report returns every active staff member's totals in one call
    // (it has no per-member filter) — fetch once and pick this member's row.
    staffAPI.report()
      .then(setRows)
      .catch(() => setRows(null))
      .finally(() => setLoading(false));
  }, [member?.id]);

  if (!member) return (
    <div className="flex items-center justify-center h-full" style={{ color: 'var(--bam-text-faint)' }}>
      <div className="text-center p-6">
        <p className="text-3xl mb-2">👤</p>
        <p className="text-sm">Select a staff member to view performance</p>
      </div>
    </div>
  );

  if (loading) return <div className="p-6 space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--bam-surface-soft)' }} />)}</div>;

  const report = rows?.find(r => r.id === member.id) || null;

  const stats = report ? [
    { label: 'Appointments', value: report.total_bookings ?? '—', sub: 'all time' },
    { label: 'Completed', value: report.completed_bookings ?? '—', sub: 'all time' },
    { label: 'Cancelled', value: report.cancelled_bookings ?? '—', sub: 'all time' },
    { label: 'Revenue', value: `${SYM}${parseFloat(report.revenue || 0).toFixed(0)}`, sub: 'from completed bookings' },
    { label: 'Commission', value: `${SYM}${parseFloat(report.commission || 0).toFixed(0)}`, sub: report.commission_type && report.commission_type !== 'none' ? `${report.commission_value}${report.commission_type === 'percentage' ? '%' : ` ${SYM}`} / booking` : 'not set' },
  ] : [];

  return (
    <div className="p-5 space-y-4 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: border }}>
        <div className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white"
          style={{ background: `hsl(${(member.name.charCodeAt(0) * 37) % 360}, 65%, 45%)` }}>
          {member.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p className="font-bold" style={{ color: 'var(--bam-text)' }}>{member.name}</p>
          <p className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>{member.role || member.permissions}</p>
        </div>
      </div>

      {/* Stats grid */}
      {stats.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {stats.map(s => (
            <div key={s.label} className="rounded-2xl p-4" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--bam-text-faint)' }}>{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--bam-text)' }}>{s.value}</p>
              <p className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>{s.sub}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl p-6 text-center" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
          <p className="text-sm" style={{ color: 'var(--bam-text-faint)' }}>No performance data yet — stats appear once appointments are booked.</p>
        </div>
      )}

      {/* Schedule summary */}
      <div className="rounded-2xl p-4" style={{ background: 'var(--bam-surface-soft)', border: `1px solid ${border}` }}>
        <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--bam-text-faint)' }}>Schedule</p>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map(d => (
            <span key={d} className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ background: (member.working_days || []).includes(d) ? 'var(--bam-primary, #6366f1)' : 'transparent', color: (member.working_days || []).includes(d) ? '#fff' : 'var(--bam-text-faint)', border: `1px solid ${(member.working_days || []).includes(d) ? 'transparent' : border}` }}>
              {d}
            </span>
          ))}
        </div>
        {member.working_hours_start && (
          <p className="text-xs mt-2" style={{ color: 'var(--bam-text-muted)' }}>
            {member.working_hours_start} – {member.working_hours_end}
          </p>
        )}
        {(member.breaks || []).length > 0 && (
          <div className="mt-2 space-y-1">
            {(member.breaks || []).map((br, i) => (
              <p key={i} className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>
                Break {br.day}: {br.start} – {br.end}
              </p>
            ))}
          </div>
        )}
        {(member.time_off || []).length > 0 && (
          <div className="mt-2 border-t pt-2 space-y-1" style={{ borderColor: border }}>
            <p className="text-xs font-semibold" style={{ color: 'var(--bam-text-faint)' }}>Upcoming time off</p>
            {(member.time_off || []).map((t, i) => (
              <p key={i} className="text-xs" style={{ color: 'var(--bam-text-faint)' }}>
                {t.date}{t.reason ? ` — ${t.reason}` : ''}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */

export default function Staff() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)';

  const [staff, setStaff]       = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // null | 'create' | member
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    Promise.all([
      staffAPI.list(),
      servicesAPI.list().catch(() => []),
    ]).then(([s, svcs]) => {
      setStaff(s);
      setServices(svcs);
      if (s.length > 0 && !selected) setSelected(s[0]);
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const openEdit = (m) => { setModal({ ...m }); };
  const openCreate = () => setModal('create');
  const closeModal = () => setModal(null);

  const handleSave = async (formData) => {
    if (modal === 'create') {
      const m = await staffAPI.create(formData);
      setStaff(p => [...p, m]);
      setSelected(m);
      toast.success('Staff member added ✓');
    } else {
      const m = await staffAPI.update(modal.id, formData);
      setStaff(p => p.map(s => s.id === m.id ? m : s));
      if (selected?.id === m.id) setSelected(m);
      toast.success('Staff updated ✓');
    }
    closeModal();
  };

  const active   = staff.filter(s => s.is_active);
  const inactive = staff.filter(s => !s.is_active);

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--bam-text)' }}>Staff</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--bam-text-muted)' }}>
            {active.length} active{inactive.length > 0 ? ` · ${inactive.length} inactive` : ''}
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-1.5 text-sm">
          <PlusIcon className="w-4 h-4" /> Add Staff
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: 'var(--bam-surface-soft)' }} />)}
        </div>
      ) : staff.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">👩‍💼</p>
          <p className="font-semibold" style={{ color: 'var(--bam-text)' }}>No staff members yet</p>
          <p className="text-sm mt-1 mb-5" style={{ color: 'var(--bam-text-muted)' }}>Add your team to assign services and track performance</p>
          <button onClick={openCreate} className="btn-primary">Add Staff Member</button>
        </div>
      ) : (
        <div className="grid lg:grid-cols-[1fr_340px] gap-5">
          {/* Staff list */}
          <div className="space-y-3">
            {active.map(m => (
              <StaffCard key={m.id} member={m} onEdit={openEdit} onSelect={setSelected}
                isSelected={selected?.id === m.id} isDark={isDark} border={border} />
            ))}
            {inactive.length > 0 && (
              <>
                <div className="flex items-center gap-3 mt-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--bam-text-faint)' }}>Inactive</h3>
                  <div className="flex-1 h-px" style={{ background: border }} />
                </div>
                {inactive.map(m => (
                  <StaffCard key={m.id} member={m} onEdit={openEdit} onSelect={setSelected}
                    isSelected={selected?.id === m.id} isDark={isDark} border={border} />
                ))}
              </>
            )}
          </div>

          {/* Performance panel */}
          <div className="rounded-2xl overflow-hidden lg:sticky lg:top-4" style={{ background: 'var(--bam-surface)', border: `1px solid ${border}`, minHeight: 400 }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: border }}>
              <h2 className="font-bold text-sm" style={{ color: 'var(--bam-text)' }}>Performance</h2>
            </div>
            <PerformancePanel member={selected} border={border} />
          </div>
        </div>
      )}

      {/* Create / Edit sheet */}
      <AnimatePresence>
        {modal && (
          <>
            <motion.div key="staff-backdrop" className="fixed inset-0 z-[80] bg-black/50 backdrop-blur-sm"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeModal} />
            <motion.div key="staff-sheet"
              className="fixed inset-x-0 bottom-0 z-[81] rounded-t-3xl sm:inset-auto sm:right-4 sm:top-4 sm:bottom-4 sm:w-[480px] sm:rounded-2xl flex flex-col overflow-hidden"
              style={{ background: isDark ? '#0c1528' : '#fff', border: `1px solid ${border}` }}
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 340, mass: 0.8 }}
              onClick={e => e.stopPropagation()}>
              <div className="flex justify-center pt-3 pb-1 sm:hidden">
                <div className="w-10 h-1 rounded-full" style={{ background: 'var(--bam-border-medium)' }} />
              </div>
              <div className="flex items-center justify-between px-5 py-4 border-b flex-shrink-0" style={{ borderColor: border }}>
                <h2 className="font-bold text-base" style={{ color: 'var(--bam-text)' }}>
                  {modal === 'create' ? 'New Staff Member' : `Edit: ${modal.name}`}
                </h2>
                <button onClick={closeModal} className="p-1.5 rounded-xl" style={{ color: 'var(--bam-text-muted)' }}>
                  <XIcon className="w-5 h-5" />
                </button>
              </div>
              <StaffForm
                initial={modal === 'create' ? EMPTY : modal}
                services={services}
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
