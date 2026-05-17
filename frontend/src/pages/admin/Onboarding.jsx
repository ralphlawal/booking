import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { businessAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'barber', 'hair stylist', 'nail tech', 'makeup artist', 'esthetician', 'tattoo artist', 'lash tech',
  'massage therapist', 'fitness trainer', 'yoga instructor', 'personal coach',
  'photographer', 'videographer',
  'tutor', 'music teacher', 'driving instructor', 'language teacher',
  'consultant', 'therapist / counselor', 'accountant', 'lawyer',
  'cleaning service', 'mechanic', 'electrician', 'plumber',
  'chef / cooking class', 'event planner', 'other',
];
const STEPS = ['Business Info', 'Contact & Location', 'Your Page'];

export default function Onboarding() {
  const { updateBusiness } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [form, setForm] = useState({
    name: '', category: '', description: '', phone: '', email: '', location: '', slug: '', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const checkSlug = async (val) => {
    if (!val || val.length < 3) return;
    try {
      const { available } = await businessAPI.checkSlug(val);
      setSlugAvailable(available);
    } catch {}
  };

  const next = () => setStep(s => Math.min(s + 1, 2));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const submit = async (e) => {
    e.preventDefault();
    if (!slugAvailable) return toast.error('Please choose an available username');
    setLoading(true);
    try {
      const biz = await businessAPI.create(form);
      updateBusiness(biz);
      toast.success('Business created! Welcome to Bookly.');
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Set up your business</h1>
          <p className="text-gray-500 mt-2">Tell us about your business so customers can book you</p>
        </div>

        {/* Progress */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${i <= step ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-sm font-medium hidden sm:block ${i === step ? 'text-primary-700' : 'text-gray-400'}`}>{s}</span>
              </div>
              {i < 2 && <div className={`flex-1 h-0.5 mx-3 ${i < step ? 'bg-primary-600' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>

        <div className="card p-6">
          <form onSubmit={submit}>
            {step === 0 && (
              <div className="space-y-4 animate-slide-up">
                <h2 className="font-semibold text-lg">Business Info</h2>
                <div>
                  <label className="label">Business Name *</label>
                  <input className="input" placeholder="Smooth Cuts Barbershop" required value={form.name} onChange={set('name')} />
                </div>
                <div>
                  <label className="label">Category *</label>
                  <select className="input" required value={form.category} onChange={set('category')}>
                    <option value="">Select category…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Description</label>
                  <textarea className="input resize-none" rows={3} placeholder="Tell customers what you do…" value={form.description} onChange={set('description')} />
                </div>
                <button type="button" onClick={next} disabled={!form.name || !form.category} className="btn-primary w-full">
                  Continue
                </button>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4 animate-slide-up">
                <h2 className="font-semibold text-lg">Contact & Location</h2>
                <div>
                  <label className="label">Phone Number</label>
                  <input className="input" type="tel" placeholder="+1-555-0100" value={form.phone} onChange={set('phone')} />
                </div>
                <div>
                  <label className="label">Business Email</label>
                  <input className="input" type="email" placeholder="hello@mybusiness.com" value={form.email} onChange={set('email')} />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input" placeholder="123 Main St, City" value={form.location} onChange={set('location')} />
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={back} className="btn-secondary flex-1">Back</button>
                  <button type="button" onClick={next} className="btn-primary flex-1">Continue</button>
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-slide-up">
                <h2 className="font-semibold text-lg">Your Booking Page</h2>
                <div>
                  <label className="label">Username / Page URL *</label>
                  <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 bg-white">
                    <span className="px-3 py-2.5 bg-gray-50 text-gray-500 text-sm border-r border-gray-200 whitespace-nowrap">/book/</span>
                    <input
                      className="flex-1 px-3 py-2.5 text-sm outline-none"
                      placeholder="smoothcuts"
                      required
                      value={form.slug}
                      onChange={e => {
                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                        setForm(p => ({ ...p, slug: val }));
                        setSlugAvailable(null);
                        if (val.length >= 3) checkSlug(val);
                      }}
                    />
                  </div>
                  {form.slug.length >= 3 && (
                    <p className={`text-xs mt-1 ${slugAvailable === true ? 'text-green-600' : slugAvailable === false ? 'text-red-600' : 'text-gray-400'}`}>
                      {slugAvailable === true ? '✓ Available' : slugAvailable === false ? '✗ Already taken' : 'Checking…'}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  <button type="button" onClick={back} className="btn-secondary flex-1">Back</button>
                  <button type="submit" disabled={loading || !slugAvailable} className="btn-primary flex-1">
                    {loading ? <Spinner /> : 'Launch My Page'}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />;
}
