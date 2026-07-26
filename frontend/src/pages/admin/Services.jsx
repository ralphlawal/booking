import React, { useEffect, useState } from 'react';
import { Scissors, Lock, MapPin, Car, Clock, Plus, Trash2, Edit2, X, Eye, EyeOff, ChevronDown, ChevronUp } from 'lucide-react';
import { servicesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const EMPTY = {
  name: '',
  description: '',
  price: '',
  mobile_price: '',
  duration_minutes: 60,
  buffer_minutes: 0,
  is_active: true,
  deposit_required: false,
  deposit_amount: '',
  category: '',
};

const CATEGORIES = ['Hair', 'Beauty', 'Nails', 'Skincare', 'Massage', 'Fitness', 'Cleaning', 'Photography', 'Tutoring', 'Other'];

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | service object
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(null);

  const load = () => servicesAPI.list().then(setServices).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (svc) => {
    setForm({
      ...EMPTY,
      ...svc,
      price: svc.price ?? '',
      mobile_price: svc.mobile_price ?? '',
      deposit_amount: svc.deposit_amount ?? '',
      buffer_minutes: svc.buffer_minutes ?? 0,
    });
    setModal(svc);
  };
  const closeModal = () => setModal(null);

  const set = (k) => (e) =>
    setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        price: form.price === '' ? 0 : parseFloat(form.price),
        mobile_price: form.mobile_price === '' ? null : parseFloat(form.mobile_price),
        duration_minutes: parseInt(form.duration_minutes, 10),
        buffer_minutes: parseInt(form.buffer_minutes, 10) || 0,
        is_active: form.is_active,
        deposit_required: form.deposit_required,
        deposit_amount: form.deposit_required && form.deposit_amount !== '' ? parseFloat(form.deposit_amount) : null,
        category: form.category || null,
      };
      if (modal === 'create') {
        const svc = await servicesAPI.create(payload);
        setServices(p => [...p, svc]);
        toast.success('Service created');
      } else {
        const svc = await servicesAPI.update(modal.id, payload);
        setServices(p => p.map(s => s.id === svc.id ? svc : s));
        toast.success('Service updated');
      }
      closeModal();
    } catch (err) {
      toast.error(err.message || 'Failed to save service');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (svc) => {
    try {
      const updated = await servicesAPI.update(svc.id, { is_active: !svc.is_active });
      setServices(p => p.map(s => s.id === updated.id ? updated : s));
      toast.success(updated.is_active ? 'Service is now live' : 'Service set to draft');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (svc) => {
    if (!confirm(`Delete "${svc.name}"? This cannot be undone.`)) return;
    try {
      await servicesAPI.delete(svc.id);
      setServices(p => p.filter(s => s.id !== svc.id));
      toast.success('Service deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const liveServices = services.filter(s => s.is_active);
  const draftServices = services.filter(s => !s.is_active);

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Services</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            {liveServices.length} live · {draftServices.length} draft
          </p>
        </div>
        <button onClick={openCreate} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add service
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="app-panel h-28 animate-pulse" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="app-panel p-12 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center mx-auto mb-3">
            <Scissors className="w-6 h-6 text-primary-400" />
          </div>
          <p className="font-semibold text-gray-700 dark:text-gray-300">No services yet</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-5">Add your first service to start accepting bookings</p>
          <button onClick={openCreate} className="btn-primary">Add service</button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Live services */}
          {liveServices.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Live</h2>
                <span className="text-xs text-gray-400">{liveServices.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {liveServices.map(svc => <ServiceCard key={svc.id} svc={svc} onEdit={openEdit} onToggle={toggle} onDelete={remove} expanded={expanded} setExpanded={setExpanded} />)}
              </div>
            </section>
          )}

          {/* Draft services */}
          {draftServices.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-gray-400" />
                <h2 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">Draft</h2>
                <span className="text-xs text-gray-400">{draftServices.length}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 opacity-70">
                {draftServices.map(svc => <ServiceCard key={svc.id} svc={svc} onEdit={openEdit} onToggle={toggle} onDelete={remove} expanded={expanded} setExpanded={setExpanded} />)}
              </div>
            </section>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="mobile-safe-sheet w-full max-w-lg max-h-[92vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-800 sticky top-0 bg-white dark:bg-gray-900 z-10">
              <h2 className="font-bold text-lg text-gray-900 dark:text-white">
                {modal === 'create' ? 'New service' : 'Edit service'}
              </h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={save} className="p-5 space-y-5">
              {/* Name + Category */}
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <div>
                  <label className="label">Service name *</label>
                  <input className="input" placeholder="e.g. Classic Cut" required value={form.name} onChange={set('name')} />
                </div>
                <div>
                  <label className="label">Category</label>
                  <select className="input" value={form.category || ''} onChange={set('category')}>
                    <option value="">—</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={2} placeholder="What's included…"
                  value={form.description} onChange={set('description')} />
              </div>

              {/* Duration + Buffer */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" /> Duration (min) *
                  </label>
                  <input className="input" type="number" min="5" step="5" required value={form.duration_minutes} onChange={set('duration_minutes')} />
                </div>
                <div>
                  <label className="label flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-gray-400" /> Buffer time (min)
                  </label>
                  <input className="input" type="number" min="0" step="5" placeholder="0"
                    value={form.buffer_minutes} onChange={set('buffer_minutes')} />
                  <p className="text-[11px] text-gray-400 mt-0.5">Clean-up / travel gap after this service</p>
                </div>
              </div>

              {/* Pricing */}
              <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800/60 px-4 py-2.5">
                  <p className="text-xs font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">Pricing</p>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="label flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" /> On-premises (£)
                      </label>
                      <input className="input" type="number" min="0" step="0.01" placeholder="0.00"
                        value={form.price} onChange={set('price')} />
                    </div>
                    <div>
                      <label className="label flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5 text-gray-400" /> Mobile / home (£)
                      </label>
                      <input className="input" type="number" min="0" step="0.01" placeholder="Leave blank if not offered"
                        value={form.mobile_price} onChange={set('mobile_price')} />
                    </div>
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Set a mobile price to let customers book you at their location. Leave blank to offer on-premises only.
                  </p>
                </div>
              </div>

              {/* Deposit */}
              <div className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden">
                <label className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/60 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-primary-600"
                    checked={form.deposit_required || false} onChange={set('deposit_required')} />
                  <div>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5" /> Require deposit
                    </span>
                    <p className="text-xs text-gray-400">No-show protection — shown on your booking page</p>
                  </div>
                </label>
                {form.deposit_required && (
                  <div className="p-4">
                    <label className="label">Deposit amount (£)</label>
                    <input className="input max-w-[160px]" type="number" min="0" step="0.01" placeholder="10.00"
                      value={form.deposit_amount} onChange={set('deposit_amount')} />
                  </div>
                )}
              </div>

              {/* Live / Draft */}
              {modal !== 'create' && (
                <div className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
                  <div>
                    <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                      {form.is_active ? 'Live' : 'Draft'}
                    </p>
                    <p className="text-xs text-gray-400">
                      {form.is_active ? 'Visible to customers' : 'Hidden — not bookable'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.is_active ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${form.is_active ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
                  {saving ? <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : modal === 'create' ? 'Create service' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({ svc, onEdit, onToggle, onDelete, expanded, setExpanded }) {
  const isMobile = svc.mobile_price !== null && svc.mobile_price !== undefined;
  const isExp = expanded === svc.id;

  return (
    <div className={`app-panel overflow-hidden transition-all`}>
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">{svc.name}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                svc.is_active
                  ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {svc.is_active ? 'Live' : 'Draft'}
              </span>
              {svc.category && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400">
                  {svc.category}
                </span>
              )}
            </div>

            {svc.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">{svc.description}</p>
            )}

            <div className="flex items-center gap-3 mt-2 flex-wrap">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-sm font-bold text-primary-700 dark:text-primary-400">£{parseFloat(svc.price || 0).toFixed(2)}</span>
              </div>
              {isMobile && (
                <div className="flex items-center gap-1.5">
                  <Car className="w-3 h-3 text-gray-400" />
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">£{parseFloat(svc.mobile_price).toFixed(2)}</span>
                  <span className="text-[10px] text-gray-400">mobile</span>
                </div>
              )}
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{svc.duration_minutes}min</span>
              {svc.buffer_minutes > 0 && (
                <span className="text-xs text-gray-400 dark:text-gray-500">+{svc.buffer_minutes}min buffer</span>
              )}
              {Boolean(svc.deposit_required) && Number(svc.deposit_amount) > 0 && (
                <span className="inline-flex items-center gap-1 text-[11px] bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                  <Lock className="w-3 h-3" /> £{parseFloat(svc.deposit_amount).toFixed(0)} deposit
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 flex-shrink-0">
            <button onClick={() => onToggle(svc)} title={svc.is_active ? 'Set to draft' : 'Make live'}
              className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg transition-colors">
              {svc.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={() => onEdit(svc)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
              <Edit2 className="w-4 h-4" />
            </button>
            <button onClick={() => onDelete(svc)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
