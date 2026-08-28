import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Rocket, Plus } from 'lucide-react';
import { businessAPI, servicesAPI } from '../../services/api';
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

// Category-specific starter service menus
const PRESETS = {
  'barber': [
    { name: 'Haircut', price: 25, duration_minutes: 30 },
    { name: 'Beard Trim', price: 15, duration_minutes: 20 },
    { name: 'Fade', price: 30, duration_minutes: 45 },
    { name: 'Hot Towel Shave', price: 20, duration_minutes: 30 },
  ],
  'hair stylist': [
    { name: 'Wash & Blow Dry', price: 40, duration_minutes: 45 },
    { name: 'Haircut & Style', price: 60, duration_minutes: 60 },
    { name: 'Colour', price: 90, duration_minutes: 120 },
    { name: 'Highlights', price: 110, duration_minutes: 120 },
  ],
  'nail tech': [
    { name: 'Manicure', price: 30, duration_minutes: 45 },
    { name: 'Pedicure', price: 40, duration_minutes: 60 },
    { name: 'Gel Nails', price: 50, duration_minutes: 75 },
    { name: 'Nail Extensions', price: 65, duration_minutes: 90 },
  ],
  'makeup artist': [
    { name: 'Bridal Makeup', price: 120, duration_minutes: 90 },
    { name: 'Event Makeup', price: 70, duration_minutes: 60 },
    { name: 'Natural / Editorial Look', price: 60, duration_minutes: 60 },
    { name: 'Makeup Lesson', price: 80, duration_minutes: 75 },
  ],
  'esthetician': [
    { name: 'Classic Facial', price: 70, duration_minutes: 60 },
    { name: 'Deep Cleanse Facial', price: 90, duration_minutes: 75 },
    { name: 'Microdermabrasion', price: 100, duration_minutes: 60 },
    { name: 'Eyebrow Waxing', price: 20, duration_minutes: 20 },
  ],
  'lash tech': [
    { name: 'Classic Full Set', price: 80, duration_minutes: 90 },
    { name: 'Hybrid Full Set', price: 95, duration_minutes: 105 },
    { name: 'Volume Full Set', price: 110, duration_minutes: 120 },
    { name: 'Lash Infill', price: 55, duration_minutes: 60 },
  ],
  'tattoo artist': [
    { name: 'Small Tattoo (< 5cm)', price: 80, duration_minutes: 60 },
    { name: 'Medium Tattoo', price: 150, duration_minutes: 120 },
    { name: 'Consultation', price: 0, duration_minutes: 30 },
    { name: 'Touch-Up', price: 40, duration_minutes: 45 },
  ],
  'massage therapist': [
    { name: 'Swedish Massage (60 min)', price: 70, duration_minutes: 60 },
    { name: 'Deep Tissue Massage (60 min)', price: 80, duration_minutes: 60 },
    { name: 'Hot Stone Massage', price: 95, duration_minutes: 75 },
    { name: 'Sports Massage (45 min)', price: 65, duration_minutes: 45 },
  ],
  'fitness trainer': [
    { name: '1-on-1 Session (60 min)', price: 65, duration_minutes: 60 },
    { name: 'Fitness Assessment', price: 40, duration_minutes: 45 },
    { name: 'Nutrition Consultation', price: 50, duration_minutes: 45 },
    { name: 'Group Session (per person)', price: 25, duration_minutes: 60 },
  ],
  'yoga instructor': [
    { name: 'Private Yoga Session', price: 60, duration_minutes: 60 },
    { name: 'Couples Yoga', price: 80, duration_minutes: 60 },
    { name: 'Yoga Assessment', price: 40, duration_minutes: 45 },
    { name: 'Meditation Session', price: 45, duration_minutes: 45 },
  ],
  'photographer': [
    { name: 'Portrait Session (1 hr)', price: 150, duration_minutes: 60 },
    { name: 'Headshots Session', price: 100, duration_minutes: 45 },
    { name: 'Event Coverage (2 hrs)', price: 250, duration_minutes: 120 },
    { name: 'Consultation & Planning', price: 0, duration_minutes: 30 },
  ],
  'tutor': [
    { name: '1-on-1 Tutoring (60 min)', price: 45, duration_minutes: 60 },
    { name: 'Exam Prep Session', price: 55, duration_minutes: 75 },
    { name: 'Initial Assessment', price: 30, duration_minutes: 45 },
    { name: 'Group Session (per student)', price: 20, duration_minutes: 60 },
  ],
  'music teacher': [
    { name: '30 Min Lesson', price: 30, duration_minutes: 30 },
    { name: '60 Min Lesson', price: 55, duration_minutes: 60 },
    { name: 'First Trial Lesson', price: 20, duration_minutes: 30 },
    { name: 'Theory & Practice (90 min)', price: 75, duration_minutes: 90 },
  ],
  'cleaning service': [
    { name: 'Regular Clean (2 bed home)', price: 80, duration_minutes: 120 },
    { name: 'Deep Clean', price: 150, duration_minutes: 180 },
    { name: 'End of Tenancy Clean', price: 200, duration_minutes: 240 },
    { name: 'Office Clean (per visit)', price: 60, duration_minutes: 90 },
  ],
  'therapist / counselor': [
    { name: 'Initial Consultation', price: 60, duration_minutes: 50 },
    { name: 'Individual Therapy Session', price: 80, duration_minutes: 50 },
    { name: 'Couples Session', price: 100, duration_minutes: 60 },
    { name: 'Group Session (per person)', price: 35, duration_minutes: 60 },
  ],
  'consultant': [
    { name: 'Discovery Call (30 min)', price: 0, duration_minutes: 30 },
    { name: 'Strategy Session (60 min)', price: 120, duration_minutes: 60 },
    { name: 'Half-Day Workshop', price: 400, duration_minutes: 240 },
    { name: 'Follow-Up Review', price: 80, duration_minutes: 45 },
  ],
};

function getPresets(category) {
  if (!category) return [];
  const key = category.toLowerCase();
  return PRESETS[key] || [
    { name: 'Consultation', price: 0, duration_minutes: 30 },
    { name: 'Standard Session (60 min)', price: 60, duration_minutes: 60 },
    { name: 'Extended Session (90 min)', price: 85, duration_minutes: 90 },
  ];
}

const STEPS = [
  { label: 'Business',  desc: 'What do you do?' },
  { label: 'Services',  desc: 'Your starter menu' },
  { label: 'Contact',   desc: 'How to find you?' },
  { label: 'Your Page', desc: 'Claim your link' },
];

export default function Onboarding() {
  const { business, updateBusiness } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState(null);
  const [form, setForm] = useState({
    name: '', category: '', description: '', phone: '', email: '', location: '', slug: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });
  const [selectedServices, setSelectedServices] = useState(new Set());

  useEffect(() => {
    try {
      const saved = JSON.parse(window.sessionStorage.getItem('bookam.business.onboarding') || 'null');
      if (!saved) return;
      setStep(Number.isInteger(saved.step) ? saved.step : 0);
      setForm((current) => ({ ...current, ...(saved.form || {}) }));
      setSelectedServices(new Set(Array.isArray(saved.selectedServices) ? saved.selectedServices : []));
    } catch {}
  }, []);

  useEffect(() => {
    try { window.sessionStorage.setItem('bookam.business.onboarding', JSON.stringify({ step, form, selectedServices: [...selectedServices] })); } catch {}
  }, [step, form, selectedServices]);

  useEffect(() => {
    if (business) navigate('/admin/dashboard', { replace: true });
  }, [business, navigate]);

  // Pre-select all presets when category is chosen
  useEffect(() => {
    if (form.category) {
      const presets = getPresets(form.category);
      setSelectedServices(new Set(presets.map(p => p.name)));
    }
  }, [form.category]);

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const checkSlug = async (val) => {
    if (!val || val.length < 3) return;
    try {
      const { available } = await businessAPI.checkSlug(val);
      setSlugAvailable(available);
    } catch {}
  };

  const next = () => setStep(s => Math.min(s + 1, 3));
  const back = () => setStep(s => Math.max(s - 1, 0));

  const toggleService = (name) => {
    setSelectedServices(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!slugAvailable) return toast.error('Please choose an available page name');
    setLoading(true);
    try {
      const biz = await businessAPI.create(form);
      try { window.sessionStorage.removeItem('bookam.business.onboarding'); } catch {}
      updateBusiness(biz);

      // Create selected starter services in background
      const presets = getPresets(form.category);
      const toCreate = presets.filter(p => selectedServices.has(p.name));
      if (toCreate.length) {
        Promise.allSettled(
          toCreate.map(svc =>
            servicesAPI.create({ ...svc, is_active: true, description: '' }).catch(() => {})
          )
        );
      }

      toast.success(`Welcome! Your page is live at /book/${biz.slug}`);
      navigate('/admin/dashboard');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const presets = getPresets(form.category);
  const progress = ((step + 1) / STEPS.length) * 100;

  return (
    <div className="app-page min-h-[100dvh] bg-gradient-to-b from-primary-50 to-white dark:from-gray-950 dark:to-gray-900 flex items-center justify-center px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))]">
      <div className="w-full max-w-lg animate-fade-in">

        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-5">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-10 w-auto object-contain mx-auto dark:brightness-0 dark:invert" />
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Set up your business</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 text-sm">Your booking page will be live in under 2 minutes.</p>
        </div>

        {/* Step progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            {STEPS.map((s, i) => (
              <React.Fragment key={s.label}>
                <div className="flex flex-col items-center gap-1">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold transition-all duration-300 ${
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

        <div className="app-panel p-6">
          <form onSubmit={submit}>

            {/* Step 0 — Business Info */}
            {step === 0 && (
              <div className="space-y-4">
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
                  <textarea
                    className="input resize-none" rows={3}
                    placeholder={
                      form.category === 'barber' ? 'e.g. Premium cuts and grooming for men and boys.' :
                      form.category === 'nail tech' ? 'e.g. Gel, acrylics, and nail art in a clean studio.' :
                      form.category === 'fitness trainer' ? 'e.g. Personalised 1-on-1 training for all fitness levels.' :
                      'Tell customers what makes your business great.'
                    }
                    value={form.description} onChange={set('description')}
                  />
                </div>
                <button type="button" onClick={next} disabled={!form.name || !form.category} className="btn-primary w-full">
                  Continue →
                </button>
              </div>
            )}

            {/* Step 1 — Category-specific service presets */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="mb-2">
                  <h2 className="font-bold text-lg dark:text-white">{STEPS[1].desc}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                    We've pre-loaded typical services for {form.category}. Tick the ones you offer — you can edit prices and add more later.
                  </p>
                </div>

                <div className="space-y-2">
                  {presets.map(svc => {
                    const selected = selectedServices.has(svc.name);
                    return (
                      <button
                        key={svc.name}
                        type="button"
                        onClick={() => toggleService(svc.name)}
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-lg border text-left transition-all ${
                          selected
                            ? 'border-primary-300 bg-primary-50 dark:bg-primary-900/20 dark:border-primary-700'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className={`w-5 h-5 rounded flex-shrink-0 flex items-center justify-center border-2 transition-colors ${
                            selected ? 'bg-primary-600 border-primary-600' : 'border-gray-300 dark:border-gray-600'
                          }`}>
                            {selected && <Check className="w-3 h-3 text-white" />}
                          </div>
                          <span className="font-medium text-sm text-gray-900 dark:text-white truncate">{svc.name}</span>
                        </div>
                        <div className="flex-shrink-0 text-right">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            {svc.price === 0 ? 'Free' : `£${svc.price}`}
                          </span>
                          <span className="block text-xs text-gray-400">{svc.duration_minutes} min</span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-gray-400 text-center">
                  {selectedServices.size} service{selectedServices.size !== 1 ? 's' : ''} selected · All prices are editable after setup
                </p>

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={back} className="btn-secondary flex-1">← Back</button>
                  <button type="button" onClick={next} className="btn-primary flex-1">Continue →</button>
                </div>
              </div>
            )}

            {/* Step 2 — Contact */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="mb-5">
                  <h2 className="font-bold text-lg dark:text-white">{STEPS[2].desc}</h2>
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

            {/* Step 3 — Slug */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="mb-5">
                  <h2 className="font-bold text-lg dark:text-white">{STEPS[3].desc}</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Your permanent booking URL — choose carefully.</p>
                </div>
                <div>
                  <label className="label">Your Page Name *</label>
                  <div className="flex items-center border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 bg-white dark:bg-gray-800 transition-all">
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
                        <span className="flex items-center gap-1"><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" /> Checking…</span>
                      )}
                    </p>
                  )}
                  {slugAvailable === true && form.slug && (
                    <div className="mt-3 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-lg">
                      <p className="text-xs text-primary-500 dark:text-primary-400 font-medium mb-0.5">Your booking page:</p>
                      <p className="text-sm font-bold text-primary-800 dark:text-primary-300 font-mono">{window.location.origin}/book/{form.slug}</p>
                    </div>
                  )}
                </div>

                {selectedServices.size > 0 && (
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-100 dark:border-emerald-800 rounded-lg">
                    <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1">
                      {selectedServices.size} service{selectedServices.size !== 1 ? 's' : ''} will be added automatically
                    </p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-500">{[...selectedServices].join(' · ')}</p>
                  </div>
                )}

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
          © {new Date().getFullYear()} BookAm Business · A{' '}
          <a href="https://www.ralphlawalgroup.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-600 dark:hover:text-gray-300 transition-colors">Ralph Lawal Group</a> product
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />;
}
