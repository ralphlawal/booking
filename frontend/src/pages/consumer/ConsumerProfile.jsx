import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { User, Phone, Mail, ArrowLeft, Save, Star, LogOut, Lock, Trash2 } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { consumerAPI, reviewsAPI } from '../../services/api';
import { LOGO_BLUE_H } from '../../config/logos';
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-4">
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

  const [form, setForm] = useState({ full_name: '', phone: '' });
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

  useEffect(() => {
    if (authLoading) return;
    if (!consumer) { navigate('/customer/login'); return; }
    setForm({ full_name: consumer.full_name || '', phone: consumer.phone || '' });
  }, [consumer, authLoading]);

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

  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await update(form);
      toast.success('Profile updated');
    } catch (err) {
      toast.error(err.message);
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
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <button onClick={() => navigate('/customer/dashboard')} className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Dashboard</span>
          </button>
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-6 w-auto object-contain dark:brightness-0 dark:invert" />
          </Link>
          <button onClick={handleLogout} className="flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors px-1">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-5 sm:py-6">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-bold shadow-primary mb-3">
            {consumer.full_name?.[0]?.toUpperCase() || '?'}
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">{consumer.full_name}</h1>
          <p className="text-sm text-gray-400">{consumer.email}</p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-800 mb-5">
          {[
            { id: 'profile', label: 'Profile' },
            { id: 'reviews', label: 'Reviews' },
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
          <div className="card p-6">
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
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
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
              <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </form>
          </div>
        )}

        {tab === 'reviews' && (
          <div className="space-y-3">
            {loadingBookings ? (
              <div className="text-center py-8 text-gray-400">Loading…</div>
            ) : bookings.length === 0 ? (
              <div className="card p-8 text-center">
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
          <div className="card p-6 animate-slide-up">
            <div className="flex items-center gap-2 mb-5">
              <Lock className="w-4 h-4 text-gray-500" />
              <h2 className="font-bold text-gray-900 dark:text-white">Change Password</h2>
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
    </div>
  );
}
