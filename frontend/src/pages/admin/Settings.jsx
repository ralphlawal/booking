import React, { useEffect, useState } from 'react';
import { businessAPI, availabilityAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const INTERVALS = [15,30,45,60];

export default function Settings() {
  const { business, updateBusiness } = useAuth();
  const [tab, setTab] = useState('business');
  const [bizForm, setBizForm] = useState({});
  const [avForm, setAvForm] = useState({ working_days: [], opening_time: '09:00', closing_time: '18:00', slot_interval_minutes: 30, buffer_minutes: 0 });
  const [blocked, setBlocked] = useState([]);
  const [newBlock, setNewBlock] = useState({ blocked_date: '', start_time: '', end_time: '', reason: '', is_full_day: false });
  const [saving, setSaving] = useState(false);
  const [qr, setQr] = useState(null);
  const [logoFile, setLogoFile] = useState(null);

  useEffect(() => {
    if (business) {
      setBizForm({ name: business.name, description: business.description || '', phone: business.phone || '', email: business.email || '', location: business.location || '', category: business.category || '' });
    }
    availabilityAPI.get().then(av => {
      if (av) setAvForm({ working_days: av.working_days || [], opening_time: av.opening_time?.slice(0,5) || '09:00', closing_time: av.closing_time?.slice(0,5) || '18:00', slot_interval_minutes: av.slot_interval_minutes || 30, buffer_minutes: av.buffer_minutes || 0 });
    }).catch(() => {});
    availabilityAPI.getBlocked().then(setBlocked).catch(() => {});
    businessAPI.getQR().then(d => setQr(d.qr)).catch(() => {});
  }, [business]);

  const saveBusiness = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await businessAPI.update(bizForm);
      updateBusiness(updated);
      toast.success('Business info saved');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const saveAvailability = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await availabilityAPI.save(avForm);
      toast.success('Availability saved');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const toggleDay = (day) =>
    setAvForm(p => ({
      ...p,
      working_days: p.working_days.includes(day) ? p.working_days.filter(d => d !== day) : [...p.working_days, day],
    }));

  const addBlock = async (e) => {
    e.preventDefault();
    try {
      const b = await availabilityAPI.block(newBlock);
      setBlocked(p => [...p, b]);
      setNewBlock({ blocked_date: '', start_time: '', end_time: '', reason: '', is_full_day: false });
      toast.success('Date/time blocked');
    } catch (err) { toast.error(err.message); }
  };

  const removeBlock = async (id) => {
    try {
      await availabilityAPI.unblock(id);
      setBlocked(p => p.filter(b => b.id !== id));
      toast.success('Unblocked');
    } catch (err) { toast.error(err.message); }
  };

  const uploadLogo = async () => {
    if (!logoFile) return;
    try {
      const { business: updated } = await businessAPI.uploadLogo(logoFile);
      updateBusiness(updated);
      setLogoFile(null);
      toast.success('Logo updated');
    } catch (err) { toast.error(err.message); }
  };

  const TABS = ['business','availability','blocked','qr'];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your business profile and availability</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {['Business Info','Availability','Blocked Days','QR & Link'].map((t, i) => (
          <button key={t} onClick={() => setTab(TABS[i])}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === TABS[i] ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Business Info */}
      {tab === 'business' && (
        <div className="card p-6 max-w-2xl animate-slide-up">
          {/* Logo upload */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="w-16 h-16 bg-primary-50 rounded-2xl flex items-center justify-center overflow-hidden">
              {business?.logo_url
                ? <img src={business.logo_url} alt="Logo" className="w-full h-full object-cover" />
                : <span className="text-2xl font-bold text-primary-600">{business?.name?.[0]}</span>}
            </div>
            <div>
              <p className="font-medium text-sm mb-1">Business Logo</p>
              <div className="flex gap-2">
                <input type="file" accept="image/*" className="hidden" id="logo-upload"
                  onChange={e => setLogoFile(e.target.files[0])} />
                <label htmlFor="logo-upload" className="btn-secondary text-xs cursor-pointer">Choose File</label>
                {logoFile && <button onClick={uploadLogo} className="btn-primary text-xs">Upload</button>}
              </div>
              {logoFile && <p className="text-xs text-gray-400 mt-1">{logoFile.name}</p>}
            </div>
          </div>

          <form onSubmit={saveBusiness} className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Business Name</label>
                <input className="input" required value={bizForm.name || ''} onChange={e => setBizForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="label">Category</label>
                <input className="input" value={bizForm.category || ''} onChange={e => setBizForm(p => ({ ...p, category: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Description</label>
              <textarea className="input resize-none" rows={3} value={bizForm.description || ''} onChange={e => setBizForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Phone</label>
                <input className="input" value={bizForm.phone || ''} onChange={e => setBizForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="label">Email</label>
                <input className="input" type="email" value={bizForm.email || ''} onChange={e => setBizForm(p => ({ ...p, email: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Location</label>
              <input className="input" value={bizForm.location || ''} onChange={e => setBizForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Spinner /> : 'Save Changes'}
            </button>
          </form>
        </div>
      )}

      {/* Availability */}
      {tab === 'availability' && (
        <div className="card p-6 max-w-2xl animate-slide-up">
          <form onSubmit={saveAvailability} className="space-y-5">
            <div>
              <label className="label mb-3">Working Days</label>
              <div className="flex flex-wrap gap-2">
                {DAYS.map(day => (
                  <button key={day} type="button" onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-xl text-sm font-medium border transition-all ${
                      avForm.working_days.includes(day)
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'
                    }`}>
                    {day.slice(0,3).toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Opening Time</label>
                <input className="input" type="time" value={avForm.opening_time} onChange={e => setAvForm(p => ({ ...p, opening_time: e.target.value }))} />
              </div>
              <div>
                <label className="label">Closing Time</label>
                <input className="input" type="time" value={avForm.closing_time} onChange={e => setAvForm(p => ({ ...p, closing_time: e.target.value }))} />
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Slot Interval (minutes)</label>
                <select className="input" value={avForm.slot_interval_minutes} onChange={e => setAvForm(p => ({ ...p, slot_interval_minutes: parseInt(e.target.value) }))}>
                  {INTERVALS.map(i => <option key={i} value={i}>{i} min</option>)}
                </select>
              </div>
              <div>
                <label className="label">Buffer Between Slots (min)</label>
                <input className="input" type="number" min="0" step="5" value={avForm.buffer_minutes} onChange={e => setAvForm(p => ({ ...p, buffer_minutes: parseInt(e.target.value) }))} />
              </div>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Spinner /> : 'Save Availability'}
            </button>
          </form>
        </div>
      )}

      {/* Blocked slots */}
      {tab === 'blocked' && (
        <div className="space-y-4 max-w-2xl animate-slide-up">
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Block a Date or Time Slot</h3>
            <form onSubmit={addBlock} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Date *</label>
                  <input className="input" type="date" required value={newBlock.blocked_date} onChange={e => setNewBlock(p => ({ ...p, blocked_date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Reason</label>
                  <input className="input" placeholder="Holiday, personal, etc." value={newBlock.reason} onChange={e => setNewBlock(p => ({ ...p, reason: e.target.value }))} />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-primary-600" checked={newBlock.is_full_day} onChange={e => setNewBlock(p => ({ ...p, is_full_day: e.target.checked }))} />
                <span className="text-sm">Block entire day</span>
              </label>
              {!newBlock.is_full_day && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Start Time</label>
                    <input className="input" type="time" value={newBlock.start_time} onChange={e => setNewBlock(p => ({ ...p, start_time: e.target.value }))} />
                  </div>
                  <div>
                    <label className="label">End Time</label>
                    <input className="input" type="time" value={newBlock.end_time} onChange={e => setNewBlock(p => ({ ...p, end_time: e.target.value }))} />
                  </div>
                </div>
              )}
              <button type="submit" className="btn-primary">Block Date/Time</button>
            </form>
          </div>

          <div className="card overflow-hidden">
            <div className="p-4 border-b border-gray-100 font-semibold">Blocked Dates</div>
            {blocked.length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No blocked dates</div>
            ) : (
              <div className="divide-y divide-gray-50">
                {blocked.map(b => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-sm">{b.blocked_date}</p>
                      <p className="text-xs text-gray-500">
                        {b.is_full_day ? 'Full day' : `${b.start_time?.slice(0,5)} – ${b.end_time?.slice(0,5)}`}
                        {b.reason && ` · ${b.reason}`}
                      </p>
                    </div>
                    <button onClick={() => removeBlock(b.id)} className="text-xs text-red-500 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-colors">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* QR Code */}
      {tab === 'qr' && (
        <div className="card p-6 max-w-md animate-slide-up">
          <h3 className="font-semibold mb-4">Your Booking Page</h3>
          {business && (
            <>
              <div className="bg-gray-50 rounded-xl p-4 mb-4 flex items-center gap-2">
                <code className="text-sm text-primary-700 flex-1 truncate">{window.location.origin}/book/{business.slug}</code>
                <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/book/${business.slug}`); toast.success('Copied!'); }}
                  className="text-xs btn-secondary py-1.5">Copy</button>
              </div>
              <div className="flex justify-center p-4 bg-white border border-gray-100 rounded-xl mb-4">
                <QRCodeSVG value={`${window.location.origin}/book/${business.slug}`} size={200} />
              </div>
              <a href={`/book/${business.slug}`} target="_blank" rel="noopener noreferrer" className="btn-primary w-full justify-center">
                Open Booking Page
              </a>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Spinner() { return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />; }
