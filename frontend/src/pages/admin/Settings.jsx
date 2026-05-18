import React, { useEffect, useState, useRef } from 'react';
import { businessAPI, availabilityAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';
import { storage, auth } from '../../config/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const INTERVALS = [15,30,45,60];

export default function Settings() {
  const { business, updateBusiness, changePassword, resendVerificationEmail } = useAuth();
  const [tab, setTab] = useState('business');
  const [bizForm, setBizForm] = useState({});
  const [avForm, setAvForm] = useState({ working_days: [], opening_time: '09:00', closing_time: '18:00', slot_interval_minutes: 30, buffer_minutes: 0 });
  const [blocked, setBlocked] = useState([]);
  const [newBlock, setNewBlock] = useState({ blocked_date: '', start_time: '', end_time: '', reason: '', is_full_day: false });
  const [saving, setSaving] = useState(false);
  const [qr, setQr] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoProgress, setLogoProgress] = useState(0);
  const fileInputRef = useRef(null);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);

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

  // Upload logo directly to Firebase Storage
  const handleLogoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be under 5MB');
      return;
    }

    setLogoUploading(true);
    setLogoProgress(0);

    const path = `logos/${business.id}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
        setLogoProgress(pct);
      },
      (err) => {
        console.error('Logo upload error:', err);
        toast.error('Upload failed: ' + err.message);
        setLogoUploading(false);
      },
      async () => {
        try {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          const updated = await businessAPI.updateLogoUrl(url);
          updateBusiness(updated);
          toast.success('Logo updated!');
        } catch (err) {
          toast.error('Failed to save logo URL');
        } finally {
          setLogoUploading(false);
          setLogoProgress(0);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }
    );
  };

  const bookingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/book/${business?.slug}`
    : `https://bookam.app/book/${business?.slug}`;

  const embedCode = `<iframe\n  src="${bookingUrl}?embed=1"\n  width="100%"\n  height="700"\n  frameborder="0"\n  style="border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.1)"\n  title="${business?.name} Booking"\n></iframe>`;

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) return toast.error('New passwords do not match');
    if (pwForm.next.length < 6) return toast.error('New password must be at least 6 characters');
    setPwLoading(true);
    try {
      await changePassword(pwForm.current, pwForm.next);
      toast.success('Password updated successfully');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      const msg = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
        ? 'Current password is incorrect'
        : err.code === 'auth/requires-recent-login'
        ? 'Please sign out and sign back in, then try again'
        : err.message;
      toast.error(msg);
    } finally {
      setPwLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setVerifyLoading(true);
    try {
      await resendVerificationEmail();
      toast.success('Verification email sent — check your inbox');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setVerifyLoading(false);
    }
  };

  const TABS = ['business','availability','blocked','qr','embed','security'];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your business profile and availability</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit flex-wrap">
        {['Business Info','Availability','Blocked Days','QR & Link','Embed Widget','Security'].map((t, i) => (
          <button key={t} onClick={() => setTab(TABS[i])}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === TABS[i] ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Business Info */}
      {tab === 'business' && (
        <div className="card p-6 max-w-2xl animate-slide-up">
          {/* Logo upload — Firebase Storage */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
            <div className="relative w-20 h-20 flex-shrink-0">
              <div className="w-20 h-20 bg-primary-50 rounded-2xl flex items-center justify-center overflow-hidden border-2 border-gray-100">
                {business?.logo_url
                  ? <img src={business.logo_url} alt="Logo" className="w-full h-full object-cover" />
                  : <span className="text-3xl font-bold text-primary-600">{business?.name?.[0]}</span>}
              </div>
              {logoUploading && (
                <div className="absolute inset-0 bg-black/50 rounded-2xl flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{logoProgress}%</span>
                </div>
              )}
            </div>
            <div>
              <p className="font-semibold text-sm mb-0.5">Business Logo</p>
              <p className="text-xs text-gray-400 mb-2">JPG, PNG or WebP — max 5MB. Stored securely in the cloud.</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                id="logo-upload"
                onChange={handleLogoChange}
                disabled={logoUploading}
              />
              <label
                htmlFor="logo-upload"
                className={`btn-secondary text-xs cursor-pointer ${logoUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {logoUploading ? `Uploading ${logoProgress}%…` : 'Upload New Logo'}
              </label>
              {logoUploading && (
                <div className="mt-2 w-40 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-600 transition-all duration-200" style={{ width: `${logoProgress}%` }} />
                </div>
              )}
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
                    className={`px-3 py-1.5 rounded-xl text-sm font-semibold border transition-all ${
                      avForm.working_days.includes(day)
                        ? 'bg-primary-600 text-white border-primary-600 shadow-primary'
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
          <h3 className="font-semibold mb-1">Your Booking Link</h3>
          <p className="text-sm text-gray-500 mb-4">Share this link anywhere — Instagram bio, WhatsApp, email.</p>
          {business && (
            <>
              <div className="bg-primary-50 rounded-xl p-3 mb-4 flex items-center gap-2 border border-primary-100">
                <code className="text-sm text-primary-700 flex-1 truncate">{bookingUrl}</code>
                <button onClick={() => { navigator.clipboard.writeText(bookingUrl); toast.success('Copied!'); }}
                  className="btn-secondary text-xs py-1.5 flex-shrink-0">Copy</button>
              </div>
              <div className="flex justify-center p-6 bg-white border border-gray-100 rounded-xl mb-4">
                <QRCodeSVG value={bookingUrl} size={180} />
              </div>
              <div className="flex gap-2">
                <a href={`/book/${business.slug}`} target="_blank" rel="noopener noreferrer" className="btn-primary flex-1 justify-center">
                  Open Booking Page
                </a>
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Book an appointment with ${business.name}: ${bookingUrl}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary px-4"
                  title="Share on WhatsApp"
                >
                  <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                </a>
              </div>
            </>
          )}
        </div>
      )}

      {/* Security */}
      {tab === 'security' && (
        <div className="max-w-2xl animate-slide-up space-y-5">
          {/* Email verification */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Email Verification</h3>
            <p className="text-sm text-gray-500 mb-4">Verify your email address to keep your account secure.</p>
            {auth.currentUser?.emailVerified ? (
              <div className="flex items-center gap-2.5 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
                <svg className="w-5 h-5 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>
                <div>
                  <p className="text-sm font-semibold text-green-800">Email verified</p>
                  <p className="text-xs text-green-600">{auth.currentUser.email}</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2.5 bg-yellow-50 border border-yellow-100 rounded-xl px-4 py-3 mb-3">
                  <svg className="w-5 h-5 text-yellow-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  <div>
                    <p className="text-sm font-semibold text-yellow-800">Email not verified</p>
                    <p className="text-xs text-yellow-700">{auth.currentUser?.email}</p>
                  </div>
                </div>
                <button
                  onClick={handleResendVerification}
                  disabled={verifyLoading}
                  className="btn-secondary text-sm disabled:opacity-50"
                >
                  {verifyLoading ? <><Spinner />&nbsp;Sending…</> : 'Send Verification Email'}
                </button>
              </div>
            )}
          </div>

          {/* Change password */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 mb-1">Change Password</h3>
            <p className="text-sm text-gray-500 mb-4">Enter your current password and choose a new one.</p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input
                  className="input"
                  type="password"
                  required
                  placeholder="Your current password"
                  value={pwForm.current}
                  onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">New Password</label>
                <input
                  className="input"
                  type="password"
                  required
                  placeholder="Min. 6 characters"
                  value={pwForm.next}
                  onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input
                  className="input"
                  type="password"
                  required
                  placeholder="Repeat new password"
                  value={pwForm.confirm}
                  onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))}
                />
              </div>
              <button type="submit" disabled={pwLoading} className="btn-primary disabled:opacity-50">
                {pwLoading ? <><Spinner />&nbsp;Updating…</> : 'Update Password'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Embed Widget */}
      {tab === 'embed' && (
        <div className="max-w-2xl animate-slide-up space-y-4">
          <div className="card p-6">
            <h3 className="font-semibold mb-1">Embed on Your Website</h3>
            <p className="text-sm text-gray-500 mb-4">
              Paste this code anywhere on your website — WordPress, Wix, Squarespace, or any HTML page.
              Customers book without leaving your site.
            </p>
            <div className="bg-gray-900 rounded-xl p-4 relative mb-3">
              <pre className="text-green-400 text-xs leading-relaxed overflow-x-auto whitespace-pre-wrap">{embedCode}</pre>
              <button
                onClick={() => { navigator.clipboard.writeText(embedCode); toast.success('Embed code copied!'); }}
                className="absolute top-3 right-3 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Copy
              </button>
            </div>
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <svg className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
              <p className="text-xs text-blue-700">The widget automatically adjusts to fit any container width. Minimum recommended width: 400px.</p>
            </div>
          </div>

          <div className="card p-6">
            <h3 className="font-semibold mb-1">Button Embed</h3>
            <p className="text-sm text-gray-500 mb-4">Add a "Book Now" button that opens your booking page in a new tab.</p>
            <div className="bg-gray-900 rounded-xl p-4 relative mb-3">
              <pre className="text-green-400 text-xs leading-relaxed overflow-x-auto">{`<a href="${bookingUrl}" target="_blank"\n   style="display:inline-block;background:#5b3eea;color:white;\n          padding:12px 28px;border-radius:10px;font-weight:600;\n          text-decoration:none;font-family:sans-serif">\n  Book Now\n</a>`}</pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`<a href="${bookingUrl}" target="_blank" style="display:inline-block;background:#5b3eea;color:white;padding:12px 28px;border-radius:10px;font-weight:600;text-decoration:none;font-family:sans-serif">Book Now</a>`);
                  toast.success('Button code copied!');
                }}
                className="absolute top-3 right-3 text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Spinner() { return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />; }
