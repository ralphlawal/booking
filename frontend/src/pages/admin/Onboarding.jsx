import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Rocket } from 'lucide-react';
import { businessAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'Barber', 'Hair Stylist', 'Nail Tech', 'Makeup Artist', 'Esthetician', 'Tattoo Artist', 'Lash Tech',
  'Massage Therapist', 'Fitness Trainer', 'Yoga Instructor', 'Personal Coach',
  'Photographer', 'Videographer',
  'Tutor', 'Music Teacher', 'Driving Instructor', 'Language Teacher',
  'Consultant', 'Therapist / Counselor', 'Accountant', 'Lawyer',
  'Cleaning Service', 'Mechanic', 'Electrician', 'Plumber',
  'Chef / Cooking Class', 'Event Planner', 'Other',
];

const STEPS = [
  { label: 'Business',    desc: 'What do you do?' },
  { label: 'Contact',     desc: 'How to find you?' },
  { label: 'Your Page',   desc: 'Claim your link' },
];

export default function Onboarding() {
  const { updateBusiness } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [form, setForm] = useState({
    name: '', category: '', description: '', phone: '', email: '', location: '', slug: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
    if (!slugAvailable) return toast.error('Please choose an available page name');
    setLoading(true);
    try {
      const biz = await businessAPI.create(form);
      updateBusiness(biz);
      toast.success(`Welcome! Your page is live at /book/${biz.slug}`);
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg animate-fade-in">

        {/* Logo + tagline */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-5">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-10 w-auto object-contain mx-auto dark:brightness-0 dark:invert" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Set up your business</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Your booking page will be live in under 2 minutes.</p>
          <p className="text-primary-600 dark:text-primary-400 font-semibold text-sm mt-1 tracking-wide">Book. Confirm. Be there.</p>
        </div>

        {/* Step progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.label}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                    i < step  ? 'bg-primary-600 text-white scale-95'
                    : i === step ? 'bg-primary-600 text-white shadow-primary'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                  }`}>
                    {i < step ? <Check className="w-4 h-4" /> : i + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:block ${i === step ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className="flex-1 mx-2 h-0.5 bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div className={`h-full bg-primary-600 transition-all duration-500 ${i < step ? 'w-full' : 'w-0'}`} />
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="h-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-primary-600 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Card */}
        <div className="card p-6">
          <form onSubmit={submit}>
            {/* Step 0 — Business Info */}
            {step === 0 && (
              <div className="space-y-4 animate-in">
                <div className="mb-5">
                  <h2 className="font-bold text-lg dark:text-white">{STEPS[0].desc}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Tell customers what you offer.</p>
                </div>
                <div>
                  <label className="label">Business Name *</label>
                  <input className="input" placeholder="e.g. Smooth Cuts Barbershop" required value={form.name} onChange={set('name')} />
                </div>
                <div>
                  <label className="label">Category *</label>
                  <select className="input" required value={form.category} onChange={set('category')}>
                    <option value="">Select your industry…</option>
                    {CATEGORIES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Short Description</label>
                  <textarea className="input resize-none" rows={3} placeholder="e.g. Premium haircuts and grooming for gentlemen." value={form.description} onChange={set('description')} />
                </div>
                <button type="button" onClick={next} disabled={!form.name || !form.category} className="btn-primary w-full">
                  Continue →
                </button>
              </div>
            )}

            {/* Step 1 — Contact */}
            {step === 1 && (
              <div className="space-y-4 animate-in">
                <div className="mb-5">
                  <h2 className="font-bold text-lg dark:text-white">{STEPS[1].desc}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Shown to customers on your booking page.</p>
                </div>
                <div>
                  <label className="label">Phone Number</label>
                  <input className="input" type="tel" placeholder="+1-555-0100" value={form.phone} onChange={set('phone')} />
                </div>
                <div>
                  <label className="label">Business Email</label>
                  <input className="input" type="email" placeholder="hello@mybusiness.com" value={form.email} onChange={set('email')} />
                </div>
                <div>
                  <label className="label">Location / Address</label>
                  <input className="input" placeholder="123 Main St, City" value={form.location} onChange={set('location')} />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={back} className="btn-secondary flex-1">← Back</button>
                  <button type="button" onClick={next} className="btn-primary flex-1">Continue →</button>
                </div>
              </div>
            )}

            {/* Step 2 — Slug */}
            {step === 2 && (
              <div className="space-y-4 animate-in">
                <div className="mb-5">
                  <h2 className="font-bold text-lg dark:text-white">{STEPS[2].desc}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">This is your permanent booking URL — choose carefully.</p>
                </div>
                <div>
                  <label className="label">Your Page Name *</label>
                  <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 bg-white dark:bg-gray-800 transition-all">
                    <span className="px-3 py-2.5 bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm border-r border-gray-200 dark:border-gray-700 whitespace-nowrap font-mono">/book/</span>
                    <input
                      className="flex-1 px-3 py-2.5 text-sm outline-none bg-transparent text-gray-900 dark:text-white placeholder:text-gray-400"
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
                  {form.slug.length > 0 && form.slug.length < 3 && (
                    <p className="text-xs mt-1 text-gray-400">Minimum 3 characters</p>
                  )}
                  {form.slug.length >= 3 && (
                    <p className={`text-xs mt-1.5 font-medium ${slugAvailable === true ? 'text-green-600 dark:text-green-400' : slugAvailable === false ? 'text-red-600 dark:text-red-400' : 'text-gray-400'}`}>
                      {slugAvailable === true ? (
                        <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Available — great choice!</span>
                      ) : slugAvailable === false ? (
                        <span className="flex items-center gap-1"><X className="w-3.5 h-3.5" /> Already taken — try another name</span>
                      ) : (
                        <span className="flex items-center gap-1"><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" /> Checking availability…</span>
                      )}
                    </p>
                  )}
                  {slugAvailable === true && form.slug && (
                    <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl">
                      <p className="text-xs text-primary-500 dark:text-primary-400 font-medium mb-0.5">Your booking page will be at:</p>
                      <p className="text-sm font-bold text-primary-800 dark:text-primary-300 font-mono">{window.location.origin}/book/{form.slug}</p>
                    </div>
                  )}
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={back} className="btn-secondary flex-1">← Back</button>
                  <button type="submit" disabled={loading || !slugAvailable} className="btn-primary flex-1">
                    {loading ? <Spinner /> : <span className="flex items-center gap-2"><Rocket className="w-4 h-4" /> Launch My Page</span>}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-5">
          © {new Date().getFullYear()} BookAm · A{' '}
          <a href="https://www.ralphlawalgroup.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Ralph Lawal Group</a> product
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />;
}
