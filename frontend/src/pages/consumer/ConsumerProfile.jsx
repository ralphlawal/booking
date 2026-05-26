import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, Save, Star, LogOut, Lock, Trash2, MapPin, Navigation, Gift, Copy, Check as CheckIcon, Users, Camera } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { consumerAPI, reviewsAPI, referralAPI } from '../../services/api';
import { LOGO_BLUE_H } from '../../config/logos';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import BackButton from '../../components/shared/BackButton';
import { compressImage } from '../../utils/compressImage';
import toast from 'react-hot-toast';

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
              s <= (hovered || value) ? 'fill-amber-400 text-amber-400' : 'text-gray-300 dark:text-gray-600'
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
      <div className="modal-panel w-full max-w-sm p-6 animate-slide-up">
        <h2 className="font-bold text-lg text-gray-900 dark:text-white mb-1">Leave a review</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
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
    if (!navigator.geolocation) return toast.error('Location not supported in this browser');
    setDetectingLoc(true);
    navigator.geolocation.getCurrentPosition(
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
        if (err.code === 1) toast.error('Location access denied — please allow location in your browser settings');
        else toast.error('Could not detect location — please type it below');
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

  if (authLoading || !consumer) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 animate-fade-in">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <BackButton fallback="/customer/dashboard">Back</BackButton>
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-6 w-auto object-contain dark:brightness-0 dark:invert" />
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors px-1">
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{consumer.full_name}</h1>
          <p className="text-sm text-gray-400">{consumer.email}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-5">
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'reviews', label: 'Reviews' },
            { id: 'referral', label: 'Refer' },
            { id: 'security', label: 'Security' },
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-semibold border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-primary-600 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'profile' && (
          <div className="card p-6 max-w-3xl mx-auto">
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
                <button type="button" onClick={() => setTab('security')} className="text-xs text-primary-600 dark:text-primary-400 hover:underline mt-1 font-medium">
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
                    className="flex-shrink-0 px-3 rounded-xl border border-gray-200 dark:border-gray-700 text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-50"
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
        )}

        {tab === 'referral' && (
          <div className="space-y-4">
            <div className="card p-6 max-w-3xl mx-auto">
              <div className="flex items-center gap-2 mb-1">
                <Gift className="w-5 h-5 text-primary-600" />
                <h2 className="font-bold text-gray-900 dark:text-white text-lg">Refer &amp; Earn</h2>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                Share your referral code with friends. Every time someone signs up using your code, you earn a credit — redeemable for discounts on future bookings.
              </p>

              {!referral ? (
                <div className="text-center py-4 text-gray-400 text-sm">Loading your referral code…</div>
              ) : (
                <>
                  <div className="bg-primary-50 dark:bg-primary-900/20 border-2 border-dashed border-primary-300 dark:border-primary-700 rounded-2xl p-5 text-center mb-4">
                    <p className="text-xs font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-1">Your referral code</p>
                    <p className="text-3xl font-black text-primary-700 dark:text-primary-300 tracking-widest font-mono">{referral.referral_code}</p>
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
                    {navigator.share && (
                      <button
                        onClick={() => navigator.share({ title: 'Join BookAm', text: `Use my code ${referral.referral_code} to sign up on BookAm and get started booking local services instantly.`, url: window.location.origin + '/customer/signup' })}
                        className="btn-primary flex-1 flex items-center justify-center gap-2"
                      >
                        Share link
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
                    <Users className="w-5 h-5 text-primary-600 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{referral.referrals?.length || 0} friend{referral.referrals?.length !== 1 ? 's' : ''} referred</p>
                      <p className="text-xs text-gray-500">{referral.credits || 0} credit{referral.credits !== 1 ? 's' : ''} earned</p>
                    </div>
                  </div>

                  {referral.referrals?.length > 0 && (
                    <div className="mt-4 space-y-1.5">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Referral history</p>
                      {referral.referrals.map((r, i) => (
                        <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-gray-100 dark:border-gray-800 last:border-0">
                          <span className="text-gray-700 dark:text-gray-300">{r.referred_name}</span>
                          <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="card p-4 border-l-4 border-l-amber-400 max-w-3xl mx-auto">
              <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">How credits work</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
              <div className="card p-8 text-center lg:col-span-2">
                <Star className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 dark:text-white mb-1">No completed bookings</h3>
                <p className="text-sm text-gray-400">Reviews are available after your appointment is completed</p>
                <Link to="/explore" className="btn-primary text-sm mt-4 inline-flex">Explore services</Link>
              </div>
            ) : bookings.map(b => (
              <div key={b.id} className="card p-4 flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl overflow-hidden flex-shrink-0 bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
                  {b.logo_url
                    ? <img src={b.logo_url} alt={b.business_name} className="w-full h-full object-cover" />
                    : <span className="text-lg font-bold text-primary-600">{b.business_name?.[0]}</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-900 dark:text-white">{b.business_name}</p>
                  <p className="text-xs text-gray-400">{b.service_name} · {b.booking_date}</p>
                </div>
                {reviewedIds.has(b.id) ? (
                  <span className="text-xs text-green-600 dark:text-green-400 font-semibold flex items-center gap-1">
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
          <div className="card p-6 animate-slide-up max-w-3xl mx-auto">
            {/* Change email */}
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4 text-gray-500" />
              <h2 className="font-bold text-gray-900 dark:text-white">Change Email</h2>
            </div>
            <p className="text-xs text-gray-400 mb-4">Current: <strong className="text-gray-600 dark:text-gray-300">{consumer.email}</strong></p>
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

            <div className="border-t border-gray-100 dark:border-gray-800 pt-6 mb-5">
              <div className="flex items-center gap-2 mb-5">
                <Lock className="w-4 h-4 text-gray-500" />
                <h2 className="font-bold text-gray-900 dark:text-white">Change Password</h2>
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
            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Sign out</p>
              <p className="text-xs text-gray-400 mb-3">This will sign you out of your current session.</p>
              <button onClick={handleLogout} className="text-sm text-red-600 dark:text-red-400 font-medium hover:underline">
                Sign out
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 mb-2">
                <Trash2 className="w-4 h-4 text-red-500" />
                <p className="text-sm font-semibold text-red-600 dark:text-red-400">Delete account</p>
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
                  className="text-sm px-4 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-semibold border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {deletingAccount ? 'Deleting…' : 'Delete my account'}
                </button>
              </div>
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
