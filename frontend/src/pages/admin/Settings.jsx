import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { businessAPI, availabilityAPI, staffAPI, photosAPI, promoAPI, intakeAPI, waitlistAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { auth } from '../../config/firebase';
import { QRCodeSVG } from 'qrcode.react';
import toast from 'react-hot-toast';
import { compressImage } from '../../utils/compressImage';
import { Users, Image, FileText, Tag, List, Plus, Trash2, Edit2, X, Check } from 'lucide-react';

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
const INTERVALS = [15,30,45,60];
const BANK_COUNTRIES = [
  { value: 'GB', label: 'United Kingdom', currency: 'GBP' },
  { value: 'IE', label: 'Ireland', currency: 'EUR' },
  { value: 'US', label: 'United States', currency: 'USD' },
  { value: 'CA', label: 'Canada', currency: 'CAD' },
  { value: 'AU', label: 'Australia', currency: 'AUD' },
  { value: 'NG', label: 'Nigeria', currency: 'NGN' },
  { value: 'INTL', label: 'Other / IBAN', currency: 'EUR' },
];
const BANK_CURRENCIES = ['GBP', 'EUR', 'USD', 'CAD', 'AUD', 'NGN'];

const emptyBankForm = {
  holder_name: '',
  bank_country: 'GB',
  bank_currency: 'GBP',
  bank_name: '',
  sort_code: '',
  account_number: '',
  routing_number: '',
  iban: '',
  bic_swift: '',
};

export default function Settings() {
  const { business, updateBusiness, changePassword, resendVerificationEmail, deleteAccount } = useAuth();
  const navigate = useNavigate();
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
  const [deleteModal, setDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  // Bank details
  const [bankForm, setBankForm] = useState(emptyBankForm);
  const [bankSaving, setBankSaving] = useState(false);

  // Verification details
  const [verForm, setVerForm] = useState({ legal_name: '', company_reg_number: '', sole_trader: false, business_address: '', contact_person: '', id_type: 'passport' });
  const [verSaving, setVerSaving] = useState(false);

  // Staff
  const [staff, setStaff] = useState([]);
  const [staffModal, setStaffModal] = useState(null);
  const [staffForm, setStaffForm] = useState({ name: '', role: '', bio: '', phone: '', email: '', working_days: [], opening_time: '09:00', closing_time: '18:00' });
  const [staffSaving, setStaffSaving] = useState(false);

  // Photos
  const [photos, setPhotos] = useState([]);
  const [photoUploading, setPhotoUploading] = useState(false);
  const photoInputRef = useRef(null);

  // Promo codes
  const [promos, setPromos] = useState([]);
  const [promoForm, setPromoForm] = useState({ code: '', type: 'percent', value: '', min_order_amount: '', max_uses: '', valid_until: '' });
  const [promoSaving, setPromoSaving] = useState(false);

  // Intake form
  const [intakeForm, setIntakeForm] = useState(null);
  const [intakeTitle, setIntakeTitle] = useState('Pre-appointment form');
  const [intakeQuestions, setIntakeQuestions] = useState([]);
  const [intakeActive, setIntakeActive] = useState(true);
  const [intakeSaving, setIntakeSaving] = useState(false);

  // Waitlist
  const [waitlist, setWaitlist] = useState([]);

  useEffect(() => {
    if (business) {
      setBizForm({ name: business.name, description: business.description || '', phone: business.phone || '', email: business.email || '', location: business.location || '', category: business.category || '', latitude: business.latitude || '', longitude: business.longitude || '' });
      setBankForm({
        ...emptyBankForm,
        holder_name: business.bank_holder_name || '',
        bank_country: business.bank_country || 'GB',
        bank_currency: business.bank_currency || 'GBP',
        bank_name: business.bank_name || '',
        sort_code: business.bank_sort_code || '',
        account_number: business.bank_account_number || '',
        routing_number: business.bank_routing_number || '',
        iban: business.bank_iban || '',
        bic_swift: business.bank_bic || '',
      });
    }
    availabilityAPI.get().then(av => {
      if (av) setAvForm({ working_days: av.working_days || [], opening_time: av.opening_time?.slice(0,5) || '09:00', closing_time: av.closing_time?.slice(0,5) || '18:00', slot_interval_minutes: av.slot_interval_minutes || 30, buffer_minutes: av.buffer_minutes || 0 });
    }).catch(() => {});
    availabilityAPI.getBlocked().then(setBlocked).catch(() => {});
    businessAPI.getQR().then(d => setQr(d.qr)).catch(() => {});
    staffAPI.list().then(setStaff).catch(() => {});
    photosAPI.list().then(setPhotos).catch(() => {});
    promoAPI.list().then(setPromos).catch(() => {});
    waitlistAPI.list().then(setWaitlist).catch(() => {});
    intakeAPI.get().then(f => {
      if (f) { setIntakeForm(f); setIntakeTitle(f.title); setIntakeQuestions(f.questions || []); setIntakeActive(f.is_active); }
    }).catch(() => {});
  }, [business]);

  const geocodeAddress = async () => {
    const address = bizForm.location?.trim();
    if (!address) return toast.error('Enter an address first');
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (!data.length) return toast.error('Address not found — try a more specific address');
      setBizForm(p => ({ ...p, latitude: parseFloat(data[0].lat).toFixed(6), longitude: parseFloat(data[0].lon).toFixed(6) }));
      toast.success('Coordinates found! Save to apply.');
    } catch {
      toast.error('Could not look up coordinates. Enter them manually.');
    } finally {
      setGeocoding(false);
    }
  };

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

    try {
      const compressed = await compressImage(file);
      setLogoProgress(30);
      const result = await businessAPI.uploadLogo(compressed, (p) => setLogoProgress(30 + Math.round(p * 0.7)));
      updateBusiness(result.business);
      toast.success('Logo updated!');
    } catch (err) {
      console.error('Logo upload error:', err);
      toast.error('Upload failed: ' + err.message);
    } finally {
      setLogoUploading(false);
      setLogoProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const bookingUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/book/${business?.slug}`
    : `https://bookam.business/book/${business?.slug}`;

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

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    setDeleteLoading(true);
    try {
      await deleteAccount(deletePassword);
      toast.success('Account deleted. Goodbye!');
      navigate('/');
    } catch (err) {
      const msg = err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential'
        ? 'Password is incorrect'
        : err.code === 'auth/requires-recent-login'
        ? 'Please sign out and sign back in first'
        : err.message;
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  };

  const saveBankDetails = async (e) => {
    e.preventDefault();
    setBankSaving(true);
    try {
      await businessAPI.saveBankDetails(bankForm);
      toast.success('Bank details saved');
    } catch (err) { toast.error(err.message); }
    finally { setBankSaving(false); }
  };

  const updateBankCountry = (country) => {
    const selected = BANK_COUNTRIES.find(item => item.value === country);
    setBankForm(p => ({
      ...p,
      bank_country: country,
      bank_currency: selected?.currency || p.bank_currency,
    }));
  };

  const submitVerification = async (e) => {
    e.preventDefault();
    setVerSaving(true);
    try {
      const result = await businessAPI.submitVerificationDetails(verForm);
      if (result.status === 'verified') {
        toast.success('Your business has been verified!');
        updateBusiness({ ...business, is_verified: true, verification_status: 'verified' });
      } else {
        toast.success(result.message);
        updateBusiness({ ...business, verification_status: 'pending' });
      }
    } catch (err) { toast.error(err.message); }
    finally { setVerSaving(false); }
  };

  const TABS = ['business','availability','blocked','staff','photos','intake','promo','waitlist','qr','embed','payouts','verification','security'];
  const TAB_LABELS = ['Business Info','Availability','Blocked Days','Staff','Gallery','Intake Forms','Promo Codes','Waitlist','QR & Link','Embed Widget','Payouts','Verification','Security'];

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-gray-500 text-sm mt-0.5">Manage your business profile and availability</p>
      </div>

      {/* Tabs — horizontal scroll on mobile */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
        <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl w-max sm:w-fit">
          {TAB_LABELS.map((t, i) => (
            <button key={t} onClick={() => setTab(TABS[i])}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${tab === TABS[i] ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Business Info */}
      {tab === 'business' && (
        <>
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
              <p className="text-xs text-gray-400 mb-2">JPG, PNG or WebP — auto-compressed and saved instantly.</p>
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
              <label className="label">Location / Address</label>
              <input className="input" placeholder="123 Main St, London" value={bizForm.location || ''} onChange={e => setBizForm(p => ({ ...p, location: e.target.value }))} />
            </div>
            <div>
              <label className="label flex items-center gap-1.5">
                GPS Coordinates <span className="text-xs text-gray-400 font-normal">(for "Near Me" search)</span>
              </label>
              <div className="grid grid-cols-2 gap-3 mb-2">
                <input className="input" type="number" step="any" placeholder="Latitude e.g. 51.5074" value={bizForm.latitude || ''} onChange={e => setBizForm(p => ({ ...p, latitude: e.target.value }))} />
                <input className="input" type="number" step="any" placeholder="Longitude e.g. -0.1278" value={bizForm.longitude || ''} onChange={e => setBizForm(p => ({ ...p, longitude: e.target.value }))} />
              </div>
              <button
                type="button"
                onClick={geocodeAddress}
                disabled={geocoding}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 disabled:opacity-50 flex items-center gap-1.5"
              >
                {geocoding ? (
                  <span className="inline-block w-3 h-3 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
                {geocoding ? 'Finding coordinates…' : 'Auto-detect from address above'}
              </button>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? <Spinner /> : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* Verification */}
        <VerificationCard business={business} />
        </>
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
            <div className="p-4 border-b border-gray-100 dark:border-gray-800 font-semibold dark:text-white">Blocked Dates</div>
            {blocked.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500 text-sm">No blocked dates</div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-800">
                {blocked.map(b => (
                  <div key={b.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="font-medium text-sm dark:text-white">{b.blocked_date}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {b.is_full_day ? 'Full day' : `${b.start_time?.slice(0,5)} – ${b.end_time?.slice(0,5)}`}
                        {b.reason && ` · ${b.reason}`}
                      </p>
                    </div>
                    <button onClick={() => removeBlock(b.id)} className="text-xs text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-2.5 py-1.5 rounded-lg transition-colors">Remove</button>
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
              <div className="bg-primary-50 dark:bg-primary-900/20 rounded-xl p-3 mb-4 flex items-center gap-2 border border-primary-100 dark:border-primary-800">
                <code className="text-sm text-primary-700 dark:text-primary-300 flex-1 truncate">{bookingUrl}</code>
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
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Email Verification</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Verify your email address to keep your account secure.</p>
            {auth.currentUser?.emailVerified ? (
              <div className="flex items-center gap-2.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800 rounded-xl px-4 py-3">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><polyline points="20 6 9 17 4 12"/></svg>
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-300">Email verified</p>
                  <p className="text-xs text-green-600 dark:text-green-400">{auth.currentUser.email}</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-100 dark:border-yellow-800 rounded-xl px-4 py-3 mb-3">
                  <svg className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
                  <div>
                    <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-300">Email not verified</p>
                    <p className="text-xs text-yellow-700 dark:text-yellow-400">{auth.currentUser?.email}</p>
                  </div>
                </div>
                <button onClick={handleResendVerification} disabled={verifyLoading} className="btn-secondary text-sm disabled:opacity-50">
                  {verifyLoading ? <><Spinner />&nbsp;Sending…</> : 'Send Verification Email'}
                </button>
              </div>
            )}
          </div>

          {/* Change password */}
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Change Password</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Enter your current password and choose a new one.</p>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="label">Current Password</label>
                <input className="input" type="password" required placeholder="Your current password" value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} />
              </div>
              <div>
                <label className="label">New Password</label>
                <input className="input" type="password" required placeholder="Min. 6 characters" value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} />
              </div>
              <div>
                <label className="label">Confirm New Password</label>
                <input className="input" type="password" required placeholder="Repeat new password" value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <button type="submit" disabled={pwLoading} className="btn-primary disabled:opacity-50">
                {pwLoading ? <><Spinner />&nbsp;Updating…</> : 'Update Password'}
              </button>
            </form>
          </div>

          {/* Danger Zone — Delete Account */}
          <div className="rounded-2xl border border-red-200 dark:border-red-900/60 bg-red-50/50 dark:bg-red-900/10 p-6">
            <h3 className="font-semibold text-red-700 dark:text-red-400 mb-1">Danger Zone</h3>
            <p className="text-sm text-red-600/80 dark:text-red-400/70 mb-4">
              Permanently delete your account, business, all services, and all booking data. <strong>This cannot be undone.</strong>
            </p>
            <button
              onClick={() => setDeleteModal(true)}
              className="text-sm px-4 py-2 border border-red-300 dark:border-red-700 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors font-medium"
            >
              Delete my account
            </button>
          </div>
        </div>
      )}

      {/* Payouts */}
      {tab === 'payouts' && (
        <div className="max-w-2xl animate-slide-up space-y-5">
          <div className="card p-6">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Payout Bank Details</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Add the bank account where your business should receive payouts. UK, US, IBAN/SWIFT, and other local bank accounts are supported.
            </p>
            <form onSubmit={saveBankDetails} className="space-y-4">
              <div>
                <label className="label">Account Holder Name</label>
                <input className="input" placeholder="As it appears on your bank account" value={bankForm.holder_name}
                  onChange={e => setBankForm(p => ({ ...p, holder_name: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">Bank Country</label>
                  <select className="input" value={bankForm.bank_country} onChange={e => updateBankCountry(e.target.value)} required>
                    {BANK_COUNTRIES.map(country => (
                      <option key={country.value} value={country.value}>{country.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Payout Currency</label>
                  <select className="input" value={bankForm.bank_currency} onChange={e => setBankForm(p => ({ ...p, bank_currency: e.target.value }))} required>
                    {BANK_CURRENCIES.map(currency => (
                      <option key={currency} value={currency}>{currency}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Bank Name</label>
                <input className="input" placeholder="Bank name, e.g. Barclays, Chase, AIB" value={bankForm.bank_name}
                  onChange={e => setBankForm(p => ({ ...p, bank_name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">{bankForm.bank_country === 'US' ? 'Routing Number' : 'Sort / Routing Code'}</label>
                  <input className="input" placeholder={bankForm.bank_country === 'US' ? '021000021' : '20-00-00'} value={bankForm.bank_country === 'US' ? bankForm.routing_number : bankForm.sort_code}
                    onChange={e => setBankForm(p => bankForm.bank_country === 'US' ? ({ ...p, routing_number: e.target.value }) : ({ ...p, sort_code: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Account Number</label>
                  <input className="input" placeholder="12345678" value={bankForm.account_number}
                    onChange={e => setBankForm(p => ({ ...p, account_number: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="label">IBAN</label>
                  <input className="input uppercase" placeholder="GB82 WEST 1234 5698 7654 32" value={bankForm.iban}
                    onChange={e => setBankForm(p => ({ ...p, iban: e.target.value.toUpperCase() }))} />
                </div>
                <div>
                  <label className="label">BIC / SWIFT</label>
                  <input className="input uppercase" placeholder="BUKBGB22" value={bankForm.bic_swift}
                    onChange={e => setBankForm(p => ({ ...p, bic_swift: e.target.value.toUpperCase() }))} />
                </div>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Use IBAN and BIC/SWIFT if your bank provides them. For countries without IBAN, enter the local routing/sort code and account number.
              </p>
              <button type="submit" disabled={bankSaving} className="btn-primary disabled:opacity-50">
                {bankSaving ? 'Saving…' : 'Save Bank Details'}
              </button>
            </form>
          </div>
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 p-4">
            <p className="text-sm font-semibold text-blue-800 dark:text-blue-300 mb-1">Stripe Connect — Coming Soon</p>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              We are adding Stripe Connect for instant automated payouts. Bank details entered above are used for manual transfers until that is live.
            </p>
          </div>
        </div>
      )}

      {/* Verification */}
      {tab === 'verification' && (
        <div className="max-w-2xl animate-slide-up space-y-5">
          {business?.is_verified || business?.verification_status === 'verified' ? (
            <div className="card p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><polyline points="20 6 9 17 4 12"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Business Verified</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Your business has been verified and displays a verified badge to customers.
                </p>
              </div>
            </div>
          ) : business?.verification_status === 'pending' ? (
            <div className="card p-6 flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-amber-600 dark:text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white">Review In Progress</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  We received your details and will verify your business within 2 working days.
                </p>
              </div>
            </div>
          ) : (
            <div className="card p-6">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Business Verification</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Verified businesses get a badge and rank higher in search. If your profile is complete and details match, you may be verified automatically.
              </p>

              <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: 'Business info', done: !!(business?.name && business?.phone && business?.email) },
                  { label: 'Location set', done: !!business?.location },
                  { label: 'Logo uploaded', done: !!business?.logo_url },
                  { label: 'Service listed', done: true },
                ].map(item => (
                  <div key={item.label} className={`rounded-xl p-3 text-center border ${item.done ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800'}`}>
                    <p className="text-lg">{item.done ? '✓' : '○'}</p>
                    <p className={`text-xs font-medium mt-0.5 ${item.done ? 'text-green-700 dark:text-green-400' : 'text-gray-400'}`}>{item.label}</p>
                  </div>
                ))}
              </div>

              <form onSubmit={submitVerification} className="space-y-4">
                <div>
                  <label className="label">Legal Business Name *</label>
                  <input className="input" placeholder="Registered trading name" value={verForm.legal_name}
                    onChange={e => setVerForm(p => ({ ...p, legal_name: e.target.value }))} required />
                </div>
                <div className="flex items-center gap-3 py-1">
                  <input type="checkbox" id="sole_trader" className="w-4 h-4 rounded accent-primary-600"
                    checked={verForm.sole_trader}
                    onChange={e => setVerForm(p => ({ ...p, sole_trader: e.target.checked, company_reg_number: e.target.checked ? '' : p.company_reg_number }))} />
                  <label htmlFor="sole_trader" className="text-sm text-gray-700 dark:text-gray-300 font-medium cursor-pointer">
                    I am a sole trader (no company registration)
                  </label>
                </div>
                {!verForm.sole_trader && (
                  <div>
                    <label className="label">Company Registration Number *</label>
                    <input className="input" placeholder="e.g. 12345678" value={verForm.company_reg_number}
                      onChange={e => setVerForm(p => ({ ...p, company_reg_number: e.target.value }))} />
                    <p className="text-xs text-gray-400 mt-1">Find yours at <a href="https://find-and-update.company-information.service.gov.uk" target="_blank" rel="noopener" className="text-primary-600 underline">Companies House</a></p>
                  </div>
                )}
                <div>
                  <label className="label">Registered Business Address</label>
                  <input className="input" placeholder="Full address including postcode" value={verForm.business_address}
                    onChange={e => setVerForm(p => ({ ...p, business_address: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Contact Person Full Name</label>
                  <input className="input" placeholder="Person responsible for this account" value={verForm.contact_person}
                    onChange={e => setVerForm(p => ({ ...p, contact_person: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Identity Document Type</label>
                  <select className="input" value={verForm.id_type} onChange={e => setVerForm(p => ({ ...p, id_type: e.target.value }))}>
                    <option value="passport">Passport</option>
                    <option value="driving_licence">UK Driving Licence</option>
                    <option value="national_id">National ID Card</option>
                  </select>
                </div>
                <button type="submit" disabled={verSaving} className="btn-primary w-full sm:w-auto disabled:opacity-50">
                  {verSaving ? 'Submitting…' : 'Submit for Verification'}
                </button>
              </form>
            </div>
          )}
        </div>
      )}

      {/* Delete Account Modal */}
      {deleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-fade-in">
          <div className="modal-panel w-full max-w-sm animate-slide-up">
            <div className="p-6">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01"/></svg>
              </div>
              <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Delete account?</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                This will permanently delete your account, business profile, all services, and all booking records. There is no going back.
              </p>
              <form onSubmit={handleDeleteAccount} className="space-y-4">
                <div>
                  <label className="label">Confirm your password</label>
                  <input
                    className="input border-red-200 dark:border-red-800 focus:ring-red-400"
                    type="password"
                    required
                    autoFocus
                    placeholder="Enter your password"
                    value={deletePassword}
                    onChange={e => setDeletePassword(e.target.value)}
                  />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={() => { setDeleteModal(false); setDeletePassword(''); }} className="btn-secondary flex-1">
                    Cancel
                  </button>
                  <button type="submit" disabled={deleteLoading || !deletePassword} className="btn-danger flex-1">
                    {deleteLoading ? <><Spinner />&nbsp;Deleting…</> : 'Delete forever'}
                  </button>
                </div>
              </form>
            </div>
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

      {/* Staff Tab */}
      {tab === 'staff' && <StaffTab staff={staff} setStaff={setStaff} />}

      {/* Photos Tab */}
      {tab === 'photos' && <PhotosTab photos={photos} setPhotos={setPhotos} />}

      {/* Intake Forms Tab */}
      {tab === 'intake' && (
        <IntakeTab
          intakeTitle={intakeTitle} setIntakeTitle={setIntakeTitle}
          intakeQuestions={intakeQuestions} setIntakeQuestions={setIntakeQuestions}
          intakeActive={intakeActive} setIntakeActive={setIntakeActive}
          intakeSaving={intakeSaving} setIntakeSaving={setIntakeSaving}
        />
      )}

      {/* Promo Codes Tab */}
      {tab === 'promo' && <PromoTab promos={promos} setPromos={setPromos} />}

      {/* Waitlist Tab */}
      {tab === 'waitlist' && <WaitlistTab waitlist={waitlist} setWaitlist={setWaitlist} />}
    </div>
  );
}

function VerificationCard({ business }) {
  const [loading, setLoading] = React.useState(false);
  const [requested, setRequested] = React.useState(false);

  if (!business) return null;

  if (business.is_verified) {
    return (
      <div className="card p-5 max-w-2xl border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
        <div className="flex items-center gap-3">
          <svg className="w-8 h-8 text-blue-500 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
          </svg>
          <div>
            <p className="font-bold text-blue-900 dark:text-blue-100">Verified Business</p>
            <p className="text-sm text-blue-700 dark:text-blue-300">Your business has been verified and displays a badge to customers.</p>
          </div>
        </div>
      </div>
    );
  }

  const handleRequest = async () => {
    setLoading(true);
    try {
      const { businessAPI } = await import('../../services/api');
      await businessAPI.requestVerification();
      setRequested(true);
      toast.success('Verification request submitted!');
    } catch (err) {
      toast.error(err.message || 'Failed to submit request');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 max-w-2xl">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="font-semibold text-gray-900 dark:text-white text-sm">Get Verified</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 mb-3">
            Verified businesses show a blue badge on their profile and in search results, building trust with customers.
          </p>
          {requested ? (
            <p className="text-sm text-green-600 font-medium">Request submitted — we'll review within 2 business days.</p>
          ) : (
            <button
              type="button"
              onClick={handleRequest}
              disabled={loading}
              className="text-sm font-semibold px-4 py-2 rounded-xl border border-blue-300 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /> : null}
              {loading ? 'Submitting…' : 'Request verification'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Spinner() { return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />; }

// ── Staff Tab ──────────────────────────────────────────────────────────────
export function StaffTab({ staff, setStaff }) {
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({ name:'', role:'', bio:'', phone:'', email:'', working_days:[], opening_time:'09:00', closing_time:'18:00' });
  const [saving, setSaving] = useState(false);
  const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];
  const toggle = (d) => setForm(p => ({ ...p, working_days: p.working_days.includes(d) ? p.working_days.filter(x=>x!==d) : [...p.working_days, d] }));

  const open = (s) => { setForm(s ? { name:s.name||'', role:s.role||'', bio:s.bio||'', phone:s.phone||'', email:s.email||'', working_days:s.working_days||[], opening_time:s.opening_time?.slice(0,5)||'09:00', closing_time:s.closing_time?.slice(0,5)||'18:00' } : { name:'', role:'', bio:'', phone:'', email:'', working_days:[], opening_time:'09:00', closing_time:'18:00' }); setModal(s||'new'); };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modal === 'new') {
        const s = await staffAPI.create(form);
        setStaff(p => [...p, s]);
        toast.success('Staff member added');
      } else {
        const s = await staffAPI.update(modal.id, form);
        setStaff(p => p.map(x => x.id===s.id ? s : x));
        toast.success('Updated');
      }
      setModal(null);
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const remove = async (id) => {
    if (!confirm('Remove this staff member?')) return;
    try { await staffAPI.remove(id); setStaff(p => p.filter(x=>x.id!==id)); toast.success('Removed'); }
    catch(err) { toast.error(err.message); }
  };

  const toggleActive = async (s) => {
    try {
      const u = await staffAPI.update(s.id, { is_active: !s.is_active });
      setStaff(p => p.map(x => x.id===u.id ? u : x));
    } catch(err) { toast.error(err.message); }
  };

  return (
    <div className="max-w-2xl animate-slide-up space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="font-bold text-gray-900 dark:text-white">Team Members</h3><p className="text-sm text-gray-500">Add staff so customers can book with a specific person</p></div>
        <button onClick={() => open(null)} className="btn-primary text-sm flex items-center gap-1.5"><Plus className="w-4 h-4"/>Add Staff</button>
      </div>
      {staff.length === 0 ? (
        <div className="card p-8 text-center"><Users className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3"/><p className="text-gray-400 text-sm">No staff members yet</p></div>
      ) : staff.map(s => (
        <div key={s.id} className="card p-4 flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 text-lg font-bold text-primary-600 dark:text-primary-400">{s.name[0]}</div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{s.name}</p>
            {s.role && <p className="text-xs text-gray-400">{s.role}</p>}
            <p className={`text-xs mt-0.5 font-medium ${s.is_active ? 'text-green-600':'text-gray-400'}`}>{s.is_active ? 'Active':'Inactive'}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => toggleActive(s)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">{s.is_active?'Deactivate':'Activate'}</button>
            <button onClick={() => open(s)} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400"><Edit2 className="w-4 h-4"/></button>
            <button onClick={() => remove(s.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
          </div>
        </div>
      ))}
      {modal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
          <form onSubmit={save} className="modal-panel w-full max-w-md p-6 space-y-4 animate-slide-up">
            <div className="flex items-center justify-between"><h2 className="font-bold text-lg">{modal==='new'?'Add Staff Member':'Edit Staff Member'}</h2><button type="button" onClick={()=>setModal(null)}><X className="w-5 h-5 text-gray-400"/></button></div>
            <div><label className="label">Name *</label><input className="input" value={form.name} onChange={e=>setForm(p=>({...p,name:e.target.value}))} required placeholder="e.g. Sarah"/></div>
            <div><label className="label">Role / Title</label><input className="input" value={form.role} onChange={e=>setForm(p=>({...p,role:e.target.value}))} placeholder="e.g. Senior Stylist"/></div>
            <div><label className="label">Bio (shown to customers)</label><textarea className="input resize-none" rows={2} value={form.bio} onChange={e=>setForm(p=>({...p,bio:e.target.value}))} placeholder="A short description…"/></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Phone</label><input className="input" value={form.phone} onChange={e=>setForm(p=>({...p,phone:e.target.value}))} placeholder="07..."/></div>
              <div><label className="label">Email</label><input className="input" type="email" value={form.email} onChange={e=>setForm(p=>({...p,email:e.target.value}))} placeholder="staff@..."/></div>
            </div>
            <div>
              <label className="label">Working Days</label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {DAYS.map(d => <button key={d} type="button" onClick={()=>toggle(d)} className={`px-2.5 py-1 rounded-lg text-xs font-medium capitalize transition-all ${form.working_days.includes(d)?'bg-primary-600 text-white':'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'}`}>{d.slice(0,3)}</button>)}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">From</label><input className="input" type="time" value={form.opening_time} onChange={e=>setForm(p=>({...p,opening_time:e.target.value}))}/></div>
              <div><label className="label">To</label><input className="input" type="time" value={form.closing_time} onChange={e=>setForm(p=>({...p,closing_time:e.target.value}))}/></div>
            </div>
            <div className="flex gap-3"><button type="button" onClick={()=>setModal(null)} className="btn-secondary flex-1">Cancel</button><button type="submit" disabled={saving} className="btn-primary flex-1">{saving?<Spinner/>:modal==='new'?'Add':'Save'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

// ── Photos Tab ─────────────────────────────────────────────────────────────
export function PhotosTab({ photos, setPhotos }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!['image/jpeg','image/png','image/webp'].includes(file.type)) { toast.error('Only JPG/PNG/WebP'); return; }
    setUploading(true);
    try {
      const compressed = await compressImage(file, 1200, 0.85);
      const photo = await photosAPI.upload(compressed);
      setPhotos(p => [...p, photo]);
      toast.success('Photo added');
    } catch(err) { toast.error(err.message); }
    finally { setUploading(false); if(inputRef.current) inputRef.current.value=''; }
  };

  const remove = async (id) => {
    if (!confirm('Delete this photo?')) return;
    try { await photosAPI.remove(id); setPhotos(p => p.filter(x=>x.id!==id)); toast.success('Deleted'); }
    catch(err) { toast.error(err.message); }
  };

  return (
    <div className="max-w-2xl animate-slide-up space-y-4">
      <div className="flex items-center justify-between">
        <div><h3 className="font-bold text-gray-900 dark:text-white">Photo Gallery</h3><p className="text-sm text-gray-500">Show your work — photos appear on your public profile</p></div>
        <button onClick={()=>inputRef.current?.click()} disabled={uploading} className="btn-primary text-sm flex items-center gap-1.5">
          {uploading?<Spinner/>:<Plus className="w-4 h-4"/>}{uploading?'Uploading…':'Add Photo'}
        </button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload}/>
      </div>
      {photos.length === 0 ? (
        <div className="card p-8 text-center border-2 border-dashed border-gray-200 dark:border-gray-700 cursor-pointer hover:border-primary-300 transition-colors" onClick={()=>inputRef.current?.click()}>
          <Image className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3"/>
          <p className="text-gray-400 text-sm">Click to upload your first photo</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(p => (
            <div key={p.id} className="relative group rounded-2xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-square">
              <img src={p.url} alt={p.caption||''} className="w-full h-full object-cover"/>
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                <button onClick={()=>remove(p.id)} className="p-2 bg-red-500 rounded-xl text-white"><Trash2 className="w-4 h-4"/></button>
              </div>
              {p.caption && <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 p-2"><p className="text-white text-xs truncate">{p.caption}</p></div>}
            </div>
          ))}
          <button onClick={()=>inputRef.current?.click()} disabled={uploading} className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 dark:border-gray-700 hover:border-primary-300 transition-colors flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-primary-500">
            {uploading?<Spinner/>:<Plus className="w-6 h-6"/>}
            <span className="text-xs font-medium">Add</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ── Intake Forms Tab ────────────────────────────────────────────────────────
export function IntakeTab({ intakeTitle, setIntakeTitle, intakeQuestions, setIntakeQuestions, intakeActive, setIntakeActive, intakeSaving, setIntakeSaving }) {
  const [newQ, setNewQ] = useState({ label:'', type:'text', required:false, options:'' });

  const addQuestion = () => {
    if (!newQ.label.trim()) return toast.error('Question text required');
    const q = { id: Date.now().toString(), label: newQ.label.trim(), type: newQ.type, required: newQ.required, options: newQ.type==='select' ? newQ.options.split(',').map(o=>o.trim()).filter(Boolean) : undefined };
    setIntakeQuestions(p => [...p, q]);
    setNewQ({ label:'', type:'text', required:false, options:'' });
  };

  const removeQ = (id) => setIntakeQuestions(p => p.filter(q=>q.id!==id));

  const save = async () => {
    setIntakeSaving(true);
    try {
      await intakeAPI.save({ title: intakeTitle, questions: intakeQuestions, is_active: intakeActive });
      toast.success('Intake form saved');
    } catch(err) { toast.error(err.message); }
    finally { setIntakeSaving(false); }
  };

  return (
    <div className="max-w-2xl animate-slide-up space-y-4">
      <div><h3 className="font-bold text-gray-900 dark:text-white">Pre-Booking Intake Form</h3><p className="text-sm text-gray-500">Collect information from customers before their appointment</p></div>
      <div className="card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div><label className="label">Form Title</label><input className="input" value={intakeTitle} onChange={e=>setIntakeTitle(e.target.value)} placeholder="Pre-appointment form"/></div>
          <div className="flex items-center gap-2 mt-5">
            <span className="text-sm text-gray-500">Active</span>
            <button type="button" onClick={()=>setIntakeActive(p=>!p)} className={`relative w-11 h-6 rounded-full transition-colors ${intakeActive?'bg-primary-600':'bg-gray-200 dark:bg-gray-700'}`}>
              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${intakeActive?'left-5.5 translate-x-0.5':'left-0.5'}`}/>
            </button>
          </div>
        </div>
        <div className="space-y-2">
          {intakeQuestions.length === 0 && <p className="text-sm text-gray-400 py-2">No questions yet — add one below</p>}
          {intakeQuestions.map((q,i) => (
            <div key={q.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{i+1}. {q.label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{q.type}{q.required?' · required':''}</p>
              </div>
              <button onClick={()=>removeQ(q.id)} className="text-gray-300 hover:text-red-500 transition-colors"><X className="w-4 h-4"/></button>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 dark:border-gray-800 pt-4 space-y-2">
          <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Add Question</p>
          <input className="input" placeholder="Question text e.g. Do you have any allergies?" value={newQ.label} onChange={e=>setNewQ(p=>({...p,label:e.target.value}))}/>
          <div className="grid grid-cols-2 gap-2">
            <select className="input" value={newQ.type} onChange={e=>setNewQ(p=>({...p,type:e.target.value}))}>
              <option value="text">Short text</option>
              <option value="textarea">Long text</option>
              <option value="select">Multiple choice</option>
              <option value="checkbox">Yes/No checkbox</option>
            </select>
            <label className="flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 text-sm cursor-pointer">
              <input type="checkbox" checked={newQ.required} onChange={e=>setNewQ(p=>({...p,required:e.target.checked}))} className="rounded"/>
              Required
            </label>
          </div>
          {newQ.type==='select' && <input className="input" placeholder="Options (comma separated): e.g. Yes, No, Not sure" value={newQ.options} onChange={e=>setNewQ(p=>({...p,options:e.target.value}))}/>}
          <button onClick={addQuestion} className="btn-secondary w-full text-sm flex items-center justify-center gap-1.5"><Plus className="w-4 h-4"/>Add Question</button>
        </div>
        <button onClick={save} disabled={intakeSaving} className="btn-primary w-full">{intakeSaving?<Spinner/>:'Save Form'}</button>
      </div>
    </div>
  );
}

// ── Promo Codes Tab ─────────────────────────────────────────────────────────
export function PromoTab({ promos, setPromos }) {
  const [form, setForm] = useState({ code:'', type:'percent', value:'', min_order_amount:'', max_uses:'', valid_until:'' });
  const [saving, setSaving] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const p = await promoAPI.create(form);
      setPromos(prev => [p, ...prev]);
      setForm({ code:'', type:'percent', value:'', min_order_amount:'', max_uses:'', valid_until:'' });
      toast.success('Promo code created');
    } catch(err) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const toggle = async (promo) => {
    try {
      const u = await promoAPI.update(promo.id, { is_active: !promo.is_active });
      setPromos(p => p.map(x => x.id===u.id ? u : x));
    } catch(err) { toast.error(err.message); }
  };

  const remove = async (id) => {
    if (!confirm('Delete this promo code?')) return;
    try { await promoAPI.remove(id); setPromos(p => p.filter(x=>x.id!==id)); toast.success('Deleted'); }
    catch(err) { toast.error(err.message); }
  };

  return (
    <div className="max-w-2xl animate-slide-up space-y-4">
      <div><h3 className="font-bold text-gray-900 dark:text-white">Promo Codes</h3><p className="text-sm text-gray-500">Create discount codes for your customers</p></div>
      <div className="card p-5">
        <form onSubmit={create} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Code *</label><input className="input uppercase" placeholder="e.g. WELCOME20" value={form.code} onChange={e=>setForm(p=>({...p,code:e.target.value.toUpperCase()}))} required/></div>
            <div><label className="label">Type</label>
              <select className="input" value={form.type} onChange={e=>setForm(p=>({...p,type:e.target.value}))}>
                <option value="percent">% off</option>
                <option value="fixed">£ off</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="label">{form.type==='percent'?'Discount %':'Amount £'} *</label><input className="input" type="number" min="0.01" step="0.01" placeholder={form.type==='percent'?'20':'5'} value={form.value} onChange={e=>setForm(p=>({...p,value:e.target.value}))} required/></div>
            <div><label className="label">Min order £</label><input className="input" type="number" min="0" step="0.01" placeholder="0" value={form.min_order_amount} onChange={e=>setForm(p=>({...p,min_order_amount:e.target.value}))}/></div>
            <div><label className="label">Max uses</label><input className="input" type="number" min="1" placeholder="∞" value={form.max_uses} onChange={e=>setForm(p=>({...p,max_uses:e.target.value}))}/></div>
          </div>
          <div><label className="label">Expires</label><input className="input" type="date" value={form.valid_until} onChange={e=>setForm(p=>({...p,valid_until:e.target.value}))}/></div>
          <button type="submit" disabled={saving} className="btn-primary w-full flex items-center justify-center gap-2">{saving?<Spinner/>:<><Plus className="w-4 h-4"/>Create Code</>}</button>
        </form>
      </div>
      {promos.length > 0 && (
        <div className="space-y-2">
          {promos.map(p => (
            <div key={p.id} className="card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-gray-900 dark:text-white">{p.code}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.is_active?'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400':'bg-gray-100 text-gray-400 dark:bg-gray-800'}`}>{p.is_active?'Active':'Off'}</span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">{p.type==='percent'?`${p.value}% off`:`£${parseFloat(p.value).toFixed(2)} off`} · {p.uses_count||0} uses{p.max_uses?` / ${p.max_uses}`:''}</p>
                {p.valid_until && <p className="text-xs text-gray-400">Expires {p.valid_until}</p>}
              </div>
              <button onClick={()=>toggle(p)} className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 transition-colors">{p.is_active?'Disable':'Enable'}</button>
              <button onClick={()=>remove(p.id)} className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4"/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Waitlist Tab ─────────────────────────────────────────────────────────────
export function WaitlistTab({ waitlist, setWaitlist }) {
  const update = async (id, status) => {
    try {
      const u = await waitlistAPI.update(id, status);
      setWaitlist(p => p.map(x => x.id===u.id ? u : x));
      toast.success(status === 'notified' ? 'Marked as notified' : 'Removed');
    } catch(err) { toast.error(err.message); }
  };

  const remove = async (id) => {
    try { await waitlistAPI.remove(id); setWaitlist(p => p.filter(x=>x.id!==id)); }
    catch(err) { toast.error(err.message); }
  };

  const STATUS_COLOR = { waiting:'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', notified:'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', cancelled:'bg-gray-100 text-gray-400 dark:bg-gray-800' };

  return (
    <div className="max-w-2xl animate-slide-up space-y-4">
      <div><h3 className="font-bold text-gray-900 dark:text-white">Waitlist</h3><p className="text-sm text-gray-500">Customers who want to be notified when a slot opens up</p></div>
      {waitlist.length === 0 ? (
        <div className="card p-8 text-center"><List className="w-10 h-10 text-gray-200 dark:text-gray-700 mx-auto mb-3"/><p className="text-gray-400 text-sm">No one on the waitlist yet</p></div>
      ) : (
        <div className="space-y-2">
          {waitlist.map(w => (
            <div key={w.id} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2"><p className="font-semibold text-sm text-gray-900 dark:text-white">{w.consumer_name}</p><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[w.status]}`}>{w.status}</span></div>
                  <p className="text-xs text-gray-400 mt-0.5">{w.consumer_email}{w.consumer_phone?` · ${w.consumer_phone}`:''}</p>
                  {w.service_name && <p className="text-xs text-gray-500 mt-0.5">Service: {w.service_name}</p>}
                  {w.requested_date && <p className="text-xs text-gray-400">Preferred: {w.requested_date}{w.preferred_time?` at ${w.preferred_time}`:''}</p>}
                  <p className="text-xs text-gray-300 mt-0.5">{new Date(w.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</p>
                </div>
                <div className="flex items-center gap-2">
                  {w.status === 'waiting' && <button onClick={()=>update(w.id,'notified')} className="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-100 transition-colors font-medium">Mark notified</button>}
                  <a href={`tel:${w.consumer_phone}`} className={`text-xs px-2 py-1 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-600 hover:bg-gray-100 transition-colors ${!w.consumer_phone?'opacity-40 pointer-events-none':''}`}>Call</a>
                  <a href={`mailto:${w.consumer_email}`} className="text-xs px-2 py-1 rounded-lg bg-primary-50 dark:bg-primary-900/20 text-primary-600 hover:bg-primary-100 transition-colors">Email</a>
                  <button onClick={()=>remove(w.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500"><X className="w-4 h-4"/></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
