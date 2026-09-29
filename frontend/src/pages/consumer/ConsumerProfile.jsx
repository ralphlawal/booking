import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, Save, Star, LogOut, Lock, Trash2, MapPin, Navigation, Gift, Copy, Check as CheckIcon, Users, Camera, Sun, Moon, Bell, HelpCircle, ChevronRight, Shield } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { useNotifications } from '../../context/NotificationContext';
import { consumerAPI, reviewsAPI, referralAPI } from '../../services/api';
import { LOGO_BLUE_H } from '../../config/logos';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import BackButton from '../../components/shared/BackButton';
import { compressImage } from '../../utils/compressImage';
import toast from 'react-hot-toast';
import { getCurrentPosition, publicWebUrl, shareContent } from '../../services/nativeBridge';

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(s => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
        >
          <Star
            className={`w-7 h-7 transition-colors ${
              s <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewModal({ booking, onClose, onSubmitted }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!rating) return toast.error('Please select a star rating');
    setSubmitting(true);
    try {
      await reviewsAPI.create({ booking_id: booking.id, rating, comment });
      toast.success('Review submitted — thank you!');
      onSubmitted();
      onClose();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[80] flex items-end sm:items-center justify-center p-4">
      <div className="mobile-safe-sheet w-full max-w-sm p-6 animate-slide-up">
        <h2 className="font-bold text-lg text-gray-900 mb-1">Leave a review</h2>
        <p className="text-sm text-gray-500 mb-5">
          Rate your experience at <strong>{booking.business_name}</strong>
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label mb-2">Your rating</label>
            <StarPicker value={rating} onChange={setRating} />
          </div>
          <div>
            <label className="label">Comment (optional)</label>
            <textarea
              className="input resize-none"
              rows={3}
              placeholder="What did you think? Was it worth it?"
              value={comment}
              onChange={e => setComment(e.target.value)}
            />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting || !rating} className="btn-primary flex-1">
              {submitting ? '…' : 'Submit review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ConsumerProfile() {
  const { consumer, update, logout, loading: authLoading } = useCustomerAuth();
  const { browserPermission, requestBrowserNotifications } = useNotifications();
  const navigate = useNavigate();

  const [form, setForm] = useState({ full_name: '', phone: '', location_text: '' });
  const [locCoords, setLocCoords] = useState(null);
  const [detectingLoc, setDetectingLoc] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('profile');
  const [bookings, setBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  const [reviewModal, setReviewModal] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [emailForm, setEmailForm] = useState({ new_email: '', password: '' });
  const [emailSaving, setEmailSaving] = useState(false);
  const [referral, setReferral] = useState(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [familyForm, setFamilyForm] = useState({ full_name: '', relationship: '', phone: '' });
  const [savingFamily, setSavingFamily] = useState(false);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    if (authLoading) return;
    if (!consumer) { navigate('/customer/login'); return; }
    setForm({ full_name: consumer.full_name || '', phone: consumer.phone || '', location_text: consumer.location_text || '' });
  }, [consumer, authLoading]);

  useEffect(() => {
    if (tab === 'referral' && !referral) {
      referralAPI.get().then(setReferral).catch(() => {});
    }
  }, [tab]);

  useEffect(() => {
    if (!consumer || tab !== 'profile') return;
    consumerAPI.getFamilyMembers()
      .then(setFamilyMembers)
      .catch(() => {});
  }, [consumer, tab]);

  useEffect(() => {
    if (tab === 'reviews') {
      setLoadingBookings(true);
      consumerAPI.myBookings()
        .then(async data => {
          const completed = data.filter(b => b.status === 'completed');
          setBookings(completed);
          // Pre-check which bookings are already reviewed
          const checks = await Promise.allSettled(
            completed.map(b => reviewsAPI.checkReviewable(b.id))
          );
          const alreadyReviewed = new Set();
          checks.forEach((result, i) => {
            if (result.status === 'fulfilled' && result.value?.can_review === false) {
              alreadyReviewed.add(completed[i].id);
            }
          });
          setReviewedIds(alreadyReviewed);
        })
        .catch(() => {})
        .finally(() => setLoadingBookings(false));
    }
  }, [tab]);

  const detectLocation = () => {
    setDetectingLoc(true);
    getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocCoords({ latitude, longitude });
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await resp.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
          const postcode = data.address?.postcode || '';
          const text = [city, postcode].filter(Boolean).join(', ');
          setForm(p => ({ ...p, location_text: text || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        } catch {
          setForm(p => ({ ...p, location_text: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` }));
        }
        setDetectingLoc(false);
      },
      (err) => {
        setDetectingLoc(false);
        toast.error(`${err?.message || 'Could not detect location'}. You can type it below instead.`);
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    );
  };

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form };
      if (locCoords) { payload.latitude = locCoords.latitude; payload.longitude = locCoords.longitude; }
      await update(payload);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) return toast.error('Passwords do not match');
    if (pwForm.next.length < 6) return toast.error('New password must be at least 6 characters');
    setPwSaving(true);
    try {
      await consumerAPI.changePassword(pwForm.current, pwForm.next);
      toast.success('Password updated successfully');
      setPwForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      toast.error(err.message);
    } finally {
      setPwSaving(false);
    }
  };

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    setEmailSaving(true);
    try {
      await consumerAPI.changeEmail(emailForm.new_email, emailForm.password);
      toast.success('Email updated — please sign in again');
      logout();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setEmailSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Please upload a JPG, PNG, or WebP image');
      e.target.value = '';
      return;
    }
    setAvatarUploading(true);
    try {
      const compressed = await compressImage(file, 640, 0.82);
      const { avatar_url } = await consumerAPI.uploadAvatar(compressed);
      await update({ avatar_url });
      toast.success('Profile photo updated');
    } catch (err) {
      toast.error(err.message || 'Could not upload photo');
    } finally {
      setAvatarUploading(false);
      e.target.value = '';
    }
  };

  const enablePush = async () => {
    const result = await requestBrowserNotifications();
    if (result === 'granted') toast.success('Push notifications enabled');
    else if (result === 'denied') toast.error('Notifications blocked — enable them in your device Settings');
    else toast.error('Push notifications are not supported on this browser');
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirm !== consumer.email) return toast.error('Email does not match');
    setDeletingAccount(true);
    try {
      await consumerAPI.deleteAccount();
      logout();
      navigate('/');
      toast.success('Account deleted');
    } catch (err) {
      toast.error(err.message);
      setDeletingAccount(false);
    }
  };

  const addFamilyMember = async (e) => {
    e.preventDefault();
    if (!familyForm.full_name.trim()) return toast.error('Enter a name');
    setSavingFamily(true);
    try {
      const member = await consumerAPI.addFamilyMember(familyForm);
      setFamilyMembers(prev => [member, ...prev]);
      setFamilyForm({ full_name: '', relationship: '', phone: '' });
      toast.success('Family member added');
    } catch (err) {
      toast.error(err.message || 'Could not add member');
    } finally {
      setSavingFamily(false);
    }
  };

  const removeFamilyMember = async (id) => {
    try {
      await consumerAPI.deleteFamilyMember(id);
      setFamilyMembers(prev => prev.filter(member => member.id !== id));
      toast.success('Family member removed');
    } catch (err) {
      toast.error(err.message || 'Could not remove member');
    }
  };

  if (authLoading || !consumer) return null;

  return (
    <div className="app-page animate-fade-in">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <BackButton fallback="/customer/dashboard">Back</BackButton>
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-6 w-auto object-contain" />
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-600 transition-colors px-1">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 sm:py-6 lg:py-8 pb-consumer-nav">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-3">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-bold shadow-primary">
              {consumer.avatar_url
                ? <img src={consumer.avatar_url} alt={consumer.full_name} className="w-full h-full object-cover" />
                : consumer.full_name?.[0]?.toUpperCase() || '?'}
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary-600 text-white flex items-center justify-center shadow hover:bg-primary-700 transition-colors disabled:opacity-50"
              title="Change photo"
            >
              {avatarUploading
                ? <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <Camera className="w-3.5 h-3.5" />}
            </button>
            <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <h1 className="text-xl font-bold text-gray-900">{consumer.full_name}</h1>
          <p className="text-sm text-gray-400">{consumer.email}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 mb-5">
          {[
            { id: 'profile',  label: 'Profile'   },
            { id: 'reviews',  label: 'Reviews'   },
            { id: 'referral', label: 'Refer'     },
            { id: 'security', label: 'Security'  },
            { id: 'settings', label: 'Settings'  },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="max-w-3xl mx-auto space-y-4">
          <div className="app-panel p-6">
            <div className="grid gap-3 sm:grid-cols-2 mb-5">
              <div className="rounded-lg border border-primary-100 bg-primary-50/70 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="w-4 h-4 text-primary-600" />
                  <p className="font-bold text-sm text-gray-900">Family & friends</p>
                </div>
                <p className="text-xs text-gray-500">Save people you book for often, then reuse their details faster.</p>
              </div>
              <div className="rounded-lg border border-green-100 bg-green-50/70 p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Bell className="w-4 h-4 text-green-600" />
                  <p className="font-bold text-sm text-gray-900">Appointment updates</p>
                </div>
                <p className="text-xs text-gray-500">Keep reminders enabled so you never miss confirmations, changes, or messages.</p>
              </div>
            </div>
            <form onSubmit={saveProfile} className="space-y-4">
              <div>
                <label className="label flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Full name
                </label>
                <input
                  className="input"
                  placeholder="Your full name"
                  value={form.full_name}
                  onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))}
                />
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5" /> Email
                </label>
                <input className="input opacity-60 cursor-not-allowed" value={consumer.email} disabled />
                <button type="button" onClick={() => setTab('security')} className="text-xs text-primary-600 hover:underline mt-1 font-medium">
                  Change email →
                </button>
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Phone
                </label>
                <input
                  className="input"
                  type="tel"
                  placeholder="+44 7700 000000"
                  value={form.phone}
                  onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
                />
              </div>
              <div>
                <label className="label flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" /> Your location
                </label>
                <div className="flex gap-2">
                  <input
                    className="input flex-1"
                    placeholder="e.g. Manchester, M1 1AE"
                    value={form.location_text}
                    onChange={e => { setForm(p => ({ ...p, location_text: e.target.value })); setLocCoords(null); }}
                  />
                  <button
                    type="button"
                    onClick={detectLocation}
                    disabled={detectingLoc}
                    title="Detect my location"
                    className="flex-shrink-0 px-3 rounded-lg border border-gray-200 text-primary-600 hover:bg-primary-50 transition-colors disabled:opacity-50"
                  >
                    {detectingLoc
                      ? <div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" />
                      : <Navigation className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {locCoords ? 'GPS coordinates detected — save to update your location' : 'Used to show nearby businesses'}
                </p>
              </div>
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>

          <div className="app-panel p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-bold text-gray-900">Family & friends</h2>
                <p className="text-xs text-gray-500">Keep details handy for people you book services for.</p>
              </div>
              <Users className="w-5 h-5 text-primary-500" />
            </div>

            <form onSubmit={addFamilyMember} className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem_9rem_auto]">
              <input
                className="input"
                placeholder="Name"
                value={familyForm.full_name}
                onChange={e => setFamilyForm(p => ({ ...p, full_name: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Relationship"
                value={familyForm.relationship}
                onChange={e => setFamilyForm(p => ({ ...p, relationship: e.target.value }))}
              />
              <input
                className="input"
                placeholder="Phone"
                value={familyForm.phone}
                onChange={e => setFamilyForm(p => ({ ...p, phone: e.target.value }))}
              />
              <button className="btn-primary text-sm" disabled={savingFamily}>
                {savingFamily ? 'Adding...' : 'Add'}
              </button>
            </form>

            <div className="mt-4 space-y-2">
              {familyMembers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No saved members yet</p>
              ) : familyMembers.map(member => (
                <div key={member.id} className="app-list-row p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{member.full_name}</p>
                    <p className="text-xs text-gray-500 truncate">
                      {[member.relationship, member.phone].filter(Boolean).join(' · ') || 'Saved profile'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFamilyMember(member.id)}
                    className="text-xs font-semibold text-red-500 hover:text-red-600 px-2 py-1 rounded-lg hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
          </div>
        )}

        {tab === 'referral' && (
          <div className="space-y-4">
            <div className="app-panel p-6 max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-5 h-5 text-primary-600" />
                <h2 className="font-bold text-gray-900 text-lg">Refer &amp; Earn</h2>
              </div>
              <p className="text-sm text-gray-500 mb-5">
                Share your referral code with friends. Every time someone signs up using your code, you earn a credit — redeemable for discounts on future bookings.
              </p>

              {!referral ? (
                <div className="text-center py-4 text-gray-400 text-sm">Loading your referral code…</div>
              ) : (
                <>
                  <div className="bg-primary-50 border-2 border-dashed border-primary-300 rounded-lg p-5 text-center mb-4">
                    <p className="text-xs font-semibold text-primary-600 uppercase tracking-widest mb-1">Your referral code</p>
                    <p className="text-3xl font-black text-primary-700 tracking-widest font-mono">{referral.referral_code}</p>
                  </div>
                  <div className="flex gap-2 mb-4">
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(referral.referral_code);
                        setCodeCopied(true);
                        setTimeout(() => setCodeCopied(false), 2000);
                      }}
                      className="btn-secondary flex-1 flex items-center justify-center gap-2"
                    >
                      {codeCopied ? <CheckIcon className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      {codeCopied ? 'Copied!' : 'Copy code'}
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          await shareContent({ title: 'Join BookAm', text: `Use my code ${referral.referral_code} to sign up on BookAm and get started booking local services instantly.`, url: publicWebUrl('/customer/signup') });
                        } catch { toast.error('Could not share your referral link'); }
                      }}
                      className="btn-primary flex-1 flex items-center justify-center gap-2"
                    >
                      Share link
                    </button>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Users className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{referral.referrals?.length || 0} friend{referral.referrals?.length !== 1 ? 's' : ''} referred</p>
                      <p className="text-xs text-gray-500">{referral.credits || 0} credit{referral.credits !== 1 ? 's' : ''} earned</p>
                    </div>
                  </div>

                  {referral.referrals?.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Referral history</p>
                      {referral.referrals.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 last:border-0">
                          <span className="text-gray-700">{r.referred_name}</span>
                          <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="app-panel p-4 border-l-4 border-l-amber-400 max-w-3xl mx-auto">
              <p className="text-xs font-semibold text-gray-700">How credits work</p>
              <p className="text-xs text-gray-500 mt-1">
                Credits are being rolled out gradually. Once live, each credit will give you a discount on a future booking. Credits never expire.
              </p>
            </div>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="grid gap-3 lg:grid-cols-2">
            {loadingBookings ? (
              <div className="text-center py-8 text-gray-400">Loading…</div>
            ) : bookings.length === 0 ? (
              <div className="app-panel p-8 text-center lg:col-span-2">
                <Star className="w-8 h-8 text-gray-200 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 mb-1">No completed bookings</h3>
                <p className="text-sm text-gray-400">Reviews are available after your appointment is completed</p>
                <Link to="/explore" className="btn-primary text-sm mt-4 inline-flex">Explore services</Link>
              </div>
            ) : bookings.map(b => (
              <div key={b.id} className="app-list-row p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-lg overflow-hidden flex-shrink-0 bg-primary-50 flex items-center justify-center">
                  {b.logo_url
                    ? <img src={b.logo_url} alt={b.business_name} className="w-full h-full object-cover" />
                    : <span className="text-lg font-bold text-primary-600">{b.business_name?.[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900">{b.business_name}</p>
                  <p className="text-xs text-gray-400">{b.service_name} · {b.booking_date}</p>
                </div>
                {reviewedIds.has(b.id) ? (
                  <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 fill-green-500" /> Reviewed
                  </span>
                ) : (
                  <button
                    onClick={() => setReviewModal(b)}
                    className="btn-primary text-xs py-1.5 px-3 flex-shrink-0"
                  >
                    Rate
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'security' && (
          <div className="app-panel p-6 animate-slide-up max-w-3xl mx-auto">
            {/* Change email */}
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-gray-500" />
              <h2 className="font-bold text-gray-900">Change Email</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">Current: <strong className="text-gray-600">{consumer.email}</strong></p>
            <form onSubmit={handleChangeEmail} className="space-y-3 mb-6">
              <div>
                <label className="label">New email address</label>
                <input
                  className="input"
                  type="email"
                  placeholder="new@email.com"
                  required
                  value={emailForm.new_email}
                  onChange={e => setEmailForm(p => ({ ...p, new_email: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Confirm with your password</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Your current password"
                  required
                  value={emailForm.password}
                  onChange={e => setEmailForm(p => ({ ...p, password: e.target.value }))}
                />
              </div>
              <button type="submit" disabled={emailSaving} className="btn-primary text-sm py-2">
                {emailSaving ? 'Saving…' : 'Update email'}
              </button>
            </form>

            <div className="border-t border-gray-100 pt-6 mb-5">
              <div className="flex items-center gap-2 mb-5">
                <Lock className="w-4 h-4 text-gray-500" />
                <h2 className="font-bold text-gray-900">Change Password</h2>
              </div>
            </div>
            <form onSubmit={changePassword} className="space-y-4">
              <div>
                <label className="label">Current password</label>
                <input className="input" type="password" placeholder="Your current password" required value={pwForm.current} onChange={e => setPwForm(p => ({ ...p, current: e.target.value }))} />
              </div>
              <div>
                <label className="label">New password</label>
                <input className="input" type="password" placeholder="Min. 6 characters" required value={pwForm.next} onChange={e => setPwForm(p => ({ ...p, next: e.target.value }))} />
              </div>
              <div>
                <label className="label">Confirm new password</label>
                <input className="input" type="password" placeholder="Repeat new password" required value={pwForm.confirm} onChange={e => setPwForm(p => ({ ...p, confirm: e.target.value }))} />
              </div>
              <button type="submit" disabled={pwSaving} className="btn-primary">
                {pwSaving ? 'Updating…' : 'Update password'}
              </button>
            </form>
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-sm font-semibold text-gray-700 mb-1">Sign out</p>
              <p className="text-xs text-gray-400 mb-3">This will sign you out of your current session.</p>
              <button onClick={handleLogout} className="text-sm text-red-600 font-medium hover:underline">
                Sign out
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <p className="text-sm font-semibold text-red-600">Delete account</p>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                This permanently deletes your account and all saved preferences. Your past booking records will remain visible to businesses. This cannot be undone.
              </p>
              <div className="space-y-2">
                <input
                  className="input text-sm"
                  placeholder={`Type ${consumer.email} to confirm`}
                  value={deleteConfirm}
                  onChange={e => setDeleteConfirm(e.target.value)}
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={deletingAccount || deleteConfirm !== consumer.email}
                  className="text-sm px-4 py-2 rounded-lg bg-red-50 text-red-600 font-semibold border border-red-200 hover:bg-red-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deletingAccount ? 'Deleting…' : 'Delete my account'}
                </button>
              </div>
            </div>
          </div>
        )}

        {tab === 'settings' && (
          <div className="max-w-3xl mx-auto space-y-4">

            {/* Appearance */}
            <div className="app-panel p-5">
              <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
                  <Sun className="w-4 h-4 text-amber-500" />
                </span>
                Appearance
              </h3>
              <div className="flex items-center gap-2.5 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <Sun className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-sm text-amber-800 font-medium">Light mode — clean and crisp</p>
              </div>
            </div>

            {/* Notifications */}
            <div className="app-panel p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
                  <Bell className="w-4 h-4 text-green-600" />
                </span>
                Notifications
              </h3>
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Push / browser alerts</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {browserPermission === 'granted' ? 'Active — you\'ll get alerts for bookings & messages' : 'Enable to receive booking alerts on this device'}
                    </p>
                  </div>
                  {browserPermission === 'granted' ? (
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">On</span>
                  ) : (
                    <button onClick={enablePush} className="text-xs font-bold text-primary-600 bg-primary-50 px-3 py-1.5 rounded-full hover:bg-primary-100 transition-colors">
                      Enable
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Email notifications</p>
                    <p className="text-xs text-gray-400 mt-0.5">Confirmations, reminders, receipts & dispute updates</p>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">On</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Service confirmations</p>
                    <p className="text-xs text-gray-400 mt-0.5">Email 2h after your appointment asking if you were attended to</p>
                  </div>
                  <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-full">On</span>
                </div>
              </div>
            </div>

            {/* Trust & Safety */}
            <div className="app-panel p-5">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-primary-100 flex items-center justify-center">
                  <Shield className="w-4 h-4 text-primary-600" />
                </span>
                Trust & Safety
              </h3>
              <div className="divide-y divide-gray-100 text-sm text-gray-600">
                <div className="py-3">
                  <p className="font-semibold text-gray-900 mb-1">Confirming service</p>
                  <p className="text-xs">After your appointment ends, tap <strong>"Confirm received"</strong> on the booking card (or click the link in the email we send you). This releases payment to the business.</p>
                </div>
                <div className="py-3">
                  <p className="font-semibold text-gray-900 mb-1">Raising a dispute</p>
                  <p className="text-xs">If there is an issue with a booking, use <strong>"Report issue"</strong> and include clear details. BookAm will review the information and may contact you or the business.</p>
                </div>
                <div className="py-3">
                  <p className="font-semibold text-gray-900 mb-1">Cancellation refunds</p>
                  <p className="text-xs">Cancellation and refund eligibility depend on the business’s stated policy and the booking. Review the policy before you confirm a booking.</p>
                </div>
              </div>
            </div>

            {/* Help & Support */}
            <div className="app-panel p-5">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4 text-blue-600" />
                </span>
                Help & Support
              </h3>
              <div className="divide-y divide-gray-100">
                {[
                  { label: 'Contact support', href: 'mailto:hello@bookam.business' },
                  { label: 'Privacy policy', href: '/legal/privacy' },
                  { label: 'Terms of service', href: '/legal/terms' },
                  { label: 'Cookie policy', href: '/legal/cookies' },
                ].map(({ label, href }) => (
                  <a key={label} href={href} className="flex items-center justify-between py-2.5 px-1 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-sm font-medium text-gray-700">{label}</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </a>
                ))}
              </div>
            </div>

            {/* Follow BookAm */}
            <div className="app-panel p-5">
              <h3 className="font-bold text-gray-900 mb-3">Follow BookAm</h3>
              <div className="flex gap-3">
                <a
                  href="https://x.com/getbookam"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:border-primary-300 hover:bg-primary-50"
                  style={{ borderColor: 'var(--bam-border)', color: 'var(--bam-text-muted)' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.402 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.265 5.634 5.899-5.634Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  @getbookam
                </a>
                <a
                  href="https://instagram.com/getbookam"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all hover:border-pink-300 hover:bg-pink-50"
                  style={{ borderColor: 'var(--bam-border)', color: 'var(--bam-text-muted)' }}
                >
                  <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                  @getbookam
                </a>
              </div>
            </div>

            {/* Sign out */}
            <div className="app-panel p-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-lg bg-red-50 text-red-600 font-semibold text-sm border border-red-200 hover:bg-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" /> Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {reviewModal && (
        <ReviewModal
          booking={reviewModal}
          onClose={() => setReviewModal(null)}
          onSubmitted={() => setReviewedIds(prev => new Set([...prev, reviewModal.id]))}
        />
      )}

      <ConsumerBottomNav />
    </div>
  );
}
