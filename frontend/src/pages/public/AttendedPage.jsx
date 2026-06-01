import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, AlertTriangle, Loader, Star } from 'lucide-react';
import { LOGO_BLUE_H } from '../../config/logos';

const API = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : import.meta.env.PROD
  ? '/api'
  : '/api';

const DISPUTE_REASONS = [
  'Service provider did not show up',
  'Arrived but refused to perform the service',
  'Location was closed or unavailable',
  'Wrong service was performed',
  'Service was significantly shorter than booked',
  'Other issue',
];

export default function AttendedPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const action = params.get('action');

  const [step, setStep] = useState('init'); // init | dispute_form | submitting | success | error
  const [reason, setReason] = useState('');
  const [description, setDescription] = useState('');
  const [message, setMessage] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [reviewLink, setReviewLink] = useState('');

  useEffect(() => {
    if (!token || !['confirm', 'dispute'].includes(action)) {
      setErrorMsg('Invalid or missing link. Please use the link from your email.');
      setStep('error');
      return;
    }
    if (action === 'confirm') {
      submitAction({ action: 'confirm' });
    } else {
      setStep('dispute_form');
    }
  }, []);

  const submitAction = async (overrides = {}) => {
    setStep('submitting');
    try {
      const body = { token, action, ...overrides };
      const res = await fetch(`${API}/bookings/attended-action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok && !data.already_done) {
        setErrorMsg(data.error || 'Something went wrong. Please contact support.');
        setStep('error');
      } else {
        setMessage(data.message);
        setStep('success');
      }
    } catch {
      setErrorMsg('Network error. Please check your connection and try again.');
      setStep('error');
    }
  };

  const handleDisputeSubmit = (e) => {
    e.preventDefault();
    if (!reason) return;
    submitAction({ action: 'dispute', reason, description });
  };

  const isConfirm = action === 'confirm';

  if (step === 'init' || step === 'submitting') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white flex items-center justify-center p-4">
        <div className="text-center">
          <Loader className="w-10 h-10 text-primary-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">
            {step === 'submitting' ? (isConfirm ? 'Recording your confirmation…' : 'Submitting your dispute…') : 'Loading…'}
          </p>
        </div>
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <div className="w-full max-w-sm text-center">
          <img src={LOGO_BLUE_H} alt="BookAm" className="h-8 mx-auto mb-8" />
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-red-100">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
            <p className="text-gray-500 text-sm mb-6">{errorMsg}</p>
            <a
              href="mailto:hello@bookam.business"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Contact support →
            </a>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'success') {
    const isDispute = action === 'dispute';
    return (
      <div className={`min-h-screen bg-gradient-to-b ${isDispute ? 'from-amber-50' : 'from-green-50'} to-white flex items-center justify-center p-4`}>
        <div className="w-full max-w-sm text-center">
          <img src={LOGO_BLUE_H} alt="BookAm" className="h-8 mx-auto mb-8" />
          <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
            <div className={`w-14 h-14 ${isDispute ? 'bg-amber-100' : 'bg-green-100'} rounded-full flex items-center justify-center mx-auto mb-4`}>
              {isDispute
                ? <AlertTriangle className="w-7 h-7 text-amber-600" />
                : <CheckCircle className="w-7 h-7 text-green-600" />
              }
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">
              {isDispute ? 'Dispute raised' : 'Thank you!'}
            </h1>
            <p className="text-gray-500 text-sm mb-6">{message}</p>
            {!isDispute && (
              <p className="text-xs text-gray-400 mb-5 flex items-center justify-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                Check your email for a link to leave a review
              </p>
            )}
            <Link
              to="/"
              className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-colors"
            >
              Back to BookAm
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // step === 'dispute_form'
  return (
    <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src={LOGO_BLUE_H} alt="BookAm" className="h-8 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-900">Report an issue</h1>
          <p className="text-gray-500 text-sm mt-1">
            Please describe what happened. Our team will investigate within 48 hours and payment is held until resolved.
          </p>
        </div>
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
          <form onSubmit={handleDisputeSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">What happened?</label>
              <select
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                value={reason}
                onChange={e => setReason(e.target.value)}
                required
              >
                <option value="">Select a reason…</option>
                {DISPUTE_REASONS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Additional details <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <textarea
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                rows={4}
                placeholder="Please share any additional details that will help us investigate…"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <p className="text-xs text-amber-700 font-medium">
                ⚠️ By submitting a dispute you confirm the service was genuinely not rendered. False disputes may result in your account being flagged.
              </p>
            </div>
            <button
              type="submit"
              disabled={!reason}
              className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              Submit dispute
            </button>
            <button
              type="button"
              onClick={() => submitAction({ action: 'confirm' })}
              className="w-full text-gray-500 text-sm hover:text-gray-700 transition-colors"
            >
              Actually, I was attended to — confirm service ✓
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
