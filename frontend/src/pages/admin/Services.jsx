import React, { useEffect, useState } from 'react';
import { servicesAPI } from '../../services/api';
import toast from 'react-hot-toast';

const EMPTY = { name: '', description: '', price: '', duration_minutes: 60, is_active: true };

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | service object
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => servicesAPI.list().then(setServices).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openCreate = () => { setForm(EMPTY); setModal('create'); };
  const openEdit = (svc) => { setForm({ ...svc, price: svc.price }); setModal(svc); };
  const closeModal = () => setModal(null);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'create') {
        const svc = await servicesAPI.create(form);
        setServices(p => [...p, svc]);
        toast.success('Service created');
      } else {
        const svc = await servicesAPI.update(modal.id, form);
        setServices(p => p.map(s => s.id === svc.id ? svc : s));
        toast.success('Service updated');
      }
      closeModal();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (svc) => {
    try {
      const updated = await servicesAPI.update(svc.id, { is_active: !svc.is_active });
      setServices(p => p.map(s => s.id === updated.id ? updated : s));
    } catch (err) {
      toast.error(err.message);
    }
  };

  const remove = async (svc) => {
    if (!confirm(`Delete "${svc.name}"?`)) return;
    try {
      await servicesAPI.delete(svc.id);
      setServices(p => p.filter(s => s.id !== svc.id));
      toast.success('Service deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-gray-500 text-sm mt-0.5">Manage what you offer to customers</p>
        </div>
        <button onClick={openCreate} className="btn-primary">
          <PlusIcon /> Add Service
        </button>
      </div>

      {loading ? (
        <div className="grid sm:grid-cols-2 gap-4">
          {[...Array(3)].map((_, i) => <div key={i} className="card h-32 animate-pulse bg-gray-100" />)}
        </div>
      ) : services.length === 0 ? (
        <div className="card p-12 text-center">
          <p className="text-4xl mb-3">✂️</p>
          <p className="font-semibold text-gray-700">No services yet</p>
          <p className="text-sm text-gray-500 mt-1 mb-5">Add your first service to start accepting bookings</p>
          <button onClick={openCreate} className="btn-primary">Add Service</button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {services.map(svc => (
            <div key={svc.id} className={`card p-5 transition-all ${!svc.is_active ? 'opacity-60' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{svc.name}</h3>
                    <span className={`badge ${svc.is_active ? 'badge-confirmed' : 'bg-gray-100 text-gray-500'}`}>
                      {svc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {svc.description && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{svc.description}</p>}
                  <div className="flex items-center gap-3 mt-3">
                    <span className="text-primary-700 font-bold">${parseFloat(svc.price).toFixed(2)}</span>
                    <span className="text-gray-400 text-sm">·</span>
                    <span className="text-gray-600 text-sm">{svc.duration_minutes} min</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-3">
                  <button onClick={() => toggle(svc)} title={svc.is_active ? 'Deactivate' : 'Activate'}
                    className="p-1.5 text-gray-400 hover:text-primary-600 rounded-lg transition-colors">
                    {svc.is_active ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                  <button onClick={() => openEdit(svc)} className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg transition-colors"><EditIcon /></button>
                  <button onClick={() => remove(svc)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg transition-colors"><TrashIcon /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="font-semibold text-lg">{modal === 'create' ? 'New Service' : 'Edit Service'}</h2>
              <button onClick={closeModal} className="p-1.5 hover:bg-gray-100 rounded-lg"><XIcon /></button>
            </div>
            <form onSubmit={save} className="p-5 space-y-4">
              <div>
                <label className="label">Service Name *</label>
                <input className="input" placeholder="Classic Haircut" required value={form.name} onChange={set('name')} />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="input resize-none" rows={2} value={form.description} onChange={set('description')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Price ($)</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0.00" value={form.price} onChange={set('price')} />
                </div>
                <div>
                  <label className="label">Duration (min) *</label>
                  <input className="input" type="number" min="5" step="5" required value={form.duration_minutes} onChange={set('duration_minutes')} />
                </div>
              </div>
              {modal !== 'create' && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 accent-primary-600" checked={form.is_active} onChange={set('is_active')} />
                  <span className="text-sm text-gray-700">Active (visible to customers)</span>
                </label>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Spinner /> : modal === 'create' ? 'Create' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() { return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />; }
function PlusIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>; }
function EditIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function TrashIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>; }
function XIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>; }
function EyeIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function EyeOffIcon() { return <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>; }
