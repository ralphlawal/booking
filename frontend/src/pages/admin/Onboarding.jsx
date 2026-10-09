import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check, X, Rocket, ArrowLeft, ArrowRight } from 'lucide-react';
import { businessAPI, servicesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import { openExternalLink } from '../../services/nativeBridge';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { label: 'Barber',              emoji: '✂️' },
  { label: 'Hair Stylist',        emoji: '💇' },
  { label: 'Nail Tech',           emoji: '💅' },
  { label: 'Makeup Artist',       emoji: '💄' },
  { label: 'Esthetician',         emoji: '✨' },
  { label: 'Tattoo Artist',       emoji: '🖋' },
  { label: 'Lash Tech',           emoji: '👁' },
  { label: 'Massage Therapist',   emoji: '🤲' },
  { label: 'Fitness Trainer',     emoji: '💪' },
  { label: 'Yoga Instructor',     emoji: '🧘' },
  { label: 'Personal Coach',      emoji: '🎯' },
  { label: 'Photographer',        emoji: '📸' },
  { label: 'Videographer',        emoji: '🎬' },
  { label: 'Tutor',               emoji: '📚' },
  { label: 'Music Teacher',       emoji: '🎵' },
  { label: 'Driving Instructor',  emoji: '🚗' },
  { label: 'Language Teacher',    emoji: '🗣' },
  { label: 'Consultant',          emoji: '💼' },
  { label: 'Therapist / Counselor', emoji: '🧠' },
  { label: 'Accountant',          emoji: '📊' },
  { label: 'Lawyer',              emoji: '⚖️' },
  { label: 'Cleaning Service',    emoji: '🧹' },
  { label: 'Mechanic',            emoji: '🔧' },
  { label: 'Electrician',         emoji: '⚡' },
  { label: 'Plumber',             emoji: '🔩' },
  { label: 'Chef / Cooking Class',emoji: '👨‍🍳' },
  { label: 'Event Planner',       emoji: '🎉' },
  { label: 'Other',               emoji: '🌟' },
];

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
  'personal coach': [
    { name: 'Strategy Session', price: 80, duration_minutes: 60 },
    { name: 'Follow-Up Session', price: 60, duration_minutes: 45 },
    { name: 'Discovery Call', price: 0, duration_minutes: 30 },
    { name: 'Goal-Setting Workshop', price: 100, duration_minutes: 90 },
  ],
  'photographer': [
    { name: 'Portrait Session (1 hr)', price: 120, duration_minutes: 60 },
    { name: 'Headshot Session', price: 80, duration_minutes: 45 },
    { name: 'Event Photography (2 hr)', price: 250, duration_minutes: 120 },
    { name: 'Consultation', price: 0, duration_minutes: 30 },
  ],
  'tutor': [
    { name: '1-on-1 Tutoring (1 hr)', price: 40, duration_minutes: 60 },
    { name: 'Group Tutoring (per person)', price: 20, duration_minutes: 60 },
    { name: 'Assessment Session', price: 35, duration_minutes: 45 },
    { name: 'Exam Prep Session', price: 45, duration_minutes: 60 },
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
  { label: 'Business',  desc: 'What do you do?',      icon: '🏪' },
  { label: 'Services',  desc: 'Your starter menu',    icon: '📋' },
  { label: 'Contact',   desc: 'How to find you?',     icon: '📍' },
  { label: 'Your Page', desc: 'Claim your link',      icon: '🚀' },
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
      toast.error(err.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const presets = getPresets(form.category);
  const categoryObj = CATEGORIES.find(c => c.label.toLowerCase() === form.category);

  return (
    <div
      className="min-h-[100dvh] flex items-start justify-center px-4"
      style={{
        background: 'linear-gradient(160deg, #f0edff 0%, #faf9ff 40%, #ffffff 100%)',
        paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))',
      }}
    >
      <div className="w-full max-w-lg">

        {/* Brand header */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block mb-6">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-9 w-auto object-contain mx-auto" />
          </Link>

          {/* Step icon */}
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-4 shadow-sm"
            style={{ background: 'rgba(91,63,234,0.08)' }}
          >
            {STEPS[step].icon}
          </div>

          <h1 className="text-2xl font-extrabold" style={{ color: 'var(--bam-text)' }}>
            {STEPS[step].desc}
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>
            Step {step + 1} of {STEPS.length} — your booking page goes live in under 2 minutes
          </p>
        </div>

        {/* Progress track */}
        <div className="flex items-center gap-2 mb-7 px-1">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-2 flex-1 last:flex-none">
              <div
                className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300"
                style={{
                  background: i < step ? '#5B3FEA' : i === step ? '#5B3FEA' : 'var(--bam-surface-soft)',
                  color: i <= step ? '#fff' : 'var(--bam-text-faint)',
                  boxShadow: i === step ? '0 0 0 4px rgba(91,63,234,0.15)' : 'none',
                }}
              >
                {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex-1 h-0.5 rounded-full overflow-hidden" style={{ background: 'var(--bam-surface-soft)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: i < step ? '100%' : '0%', background: '#5B3FEA' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-6 shadow-xl"
          style={{ background: '#fff', border: '1px solid var(--bam-border)' }}
        >
          <form onSubmit={submit}>

            {/* ── Step 0: Business Info ── */}
            {step === 0 && (
              <div className="space-y-5">
                <div>
                  <label className="label">Business Name *</label>
                  <input
                    className="input"
                    placeholder="e.g. Smooth Cuts Barbershop"
                    required
                    value={form.name}
                    onChange={set('name')}
                  />
                </div>

                <div>
                  <label className="label">What do you do? *</label>
                  <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1 -mr-1">
                    {CATEGORIES.map(c => {
                      const selected = form.category === c.label.toLowerCase();
                      return (
                        <button
                          key={c.label}
                          type="button"
                          onClick={() => setForm(p => ({ ...p, category: c.label.toLowerCase() }))}
                          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border text-left transition-all duration-150"
                          style={{
                            background: selected ? 'rgba(91,63,234,0.07)' : 'var(--bam-surface-soft)',
                            borderColor: selected ? '#5B3FEA' : 'transparent',
                            color: selected ? '#5B3FEA' : 'var(--bam-text)',
                          }}
                        >
                          <span className="text-base leading-none flex-shrink-0">{c.emoji}</span>
                          <span className="text-xs font-semibold leading-tight">{c.label}</span>
                          {selected && <Check className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="label">Short Description</label>
                  <textarea
                    className="input resize-none"
                    rows={3}
                    placeholder={
                      form.category === 'barber' ? 'e.g. Premium cuts and grooming for men and boys.' :
                      form.category === 'nail tech' ? 'e.g. Gel, acrylics, and nail art in a clean studio.' :
                      form.category === 'fitness trainer' ? 'e.g. Personalised 1-on-1 training for all fitness levels.' :
                      'Tell customers what makes your business great.'
                    }
                    value={form.description}
                    onChange={set('description')}
                  />
                </div>

                <button
                  type="button"
                  onClick={next}
                  disabled={!form.name || !form.category}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* ── Step 1: Service Presets ── */}
            {step === 1 && (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--bam-text-muted)' }}>
                    We pre-loaded typical services for{' '}
                    <span className="font-bold" style={{ color: 'var(--bam-text)' }}>
                      {categoryObj?.emoji} {form.category}
                    </span>
                    . Select the ones you offer — prices are fully editable after setup.
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
                        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border text-left transition-all duration-150"
                        style={{
                          background: selected ? 'rgba(91,63,234,0.06)' : 'var(--bam-surface-soft)',
                          borderColor: selected ? 'rgba(91,63,234,0.3)' : 'transparent',
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center border-2 transition-all"
                          style={{
                            background: selected ? '#5B3FEA' : 'transparent',
                            borderColor: selected ? '#5B3FEA' : 'var(--bam-border)',
                          }}
                        >
                          {selected && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <span className="flex-1 text-sm font-semibold" style={{ color: 'var(--bam-text)' }}>
                          {svc.name}
                        </span>
                        <div className="flex-shrink-0 text-right">
                          <span className="text-sm font-bold" style={{ color: 'var(--bam-text)' }}>
                            {svc.price === 0 ? 'Free' : `£${svc.price}`}
                          </span>
                          <span className="block text-xs" style={{ color: 'var(--bam-text-faint)' }}>
                            {svc.duration_minutes} min
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <p className="text-xs text-center py-1" style={{ color: 'var(--bam-text-faint)' }}>
                  {selectedServices.size} of {presets.length} selected · You can add more after setup
                </p>

                <div className="flex gap-3">
                  <button type="button" onClick={back} className="btn-secondary flex items-center gap-1.5">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button type="button" onClick={next} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 2: Contact ── */}
            {step === 2 && (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>
                  Shown to customers on your public booking page. All fields are optional.
                </p>
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
                <div className="flex gap-3">
                  <button type="button" onClick={back} className="btn-secondary flex items-center gap-1.5">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button type="button" onClick={next} className="btn-primary flex-1 flex items-center justify-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ── Step 3: Slug ── */}
            {step === 3 && (
              <div className="space-y-5">
                <p className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>
                  Your permanent booking URL. Choose something short and memorable — you can't change this later.
                </p>

                <div>
                  <label className="label">Your Page Name *</label>
                  <div
                    className="flex items-center rounded-2xl overflow-hidden transition-all"
                    style={{ border: '1.5px solid var(--bam-border)', background: '#fff' }}
                  >
                    <span
                      className="px-3 py-3 text-sm border-r font-mono"
                      style={{ background: 'var(--bam-surface-soft)', color: 'var(--bam-text-muted)', borderColor: 'var(--bam-border)' }}
                    >
                      /book/
                    </span>
                    <input
                      className="flex-1 px-3 py-3 text-sm outline-none bg-transparent font-mono"
                      style={{ color: 'var(--bam-text)' }}
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
                    <p className="text-xs mt-1.5" style={{ color: 'var(--bam-text-faint)' }}>At least 3 characters</p>
                  )}
                  {form.slug.length >= 3 && (
                    <p className={`text-xs mt-1.5 font-semibold flex items-center gap-1 ${
                      slugAvailable === true ? 'text-emerald-600' : slugAvailable === false ? 'text-red-500' : ''
                    }`} style={slugAvailable === null ? { color: 'var(--bam-text-faint)' } : {}}>
                      {slugAvailable === true ? (
                        <><Check className="w-3.5 h-3.5" /> Available — great choice!</>
                      ) : slugAvailable === false ? (
                        <><X className="w-3.5 h-3.5" /> Already taken — try another name</>
                      ) : (
                        <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" /> Checking…</>
                      )}
                    </p>
                  )}
                </div>

                {slugAvailable === true && form.slug && (
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(91,63,234,0.06)', border: '1px solid rgba(91,63,234,0.15)' }}
                  >
                    <p className="text-xs font-semibold mb-1" style={{ color: '#5B3FEA' }}>Your booking page will be live at:</p>
                    <p className="text-sm font-bold font-mono" style={{ color: '#4c35c5' }}>
                      {window.location.origin}/book/{form.slug}
                    </p>
                  </div>
                )}

                {selectedServices.size > 0 && (
                  <div
                    className="rounded-2xl p-4"
                    style={{ background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)' }}
                  >
                    <p className="text-xs font-semibold text-emerald-700 mb-1">
                      {selectedServices.size} service{selectedServices.size !== 1 ? 's' : ''} will be added automatically
                    </p>
                    <p className="text-xs text-emerald-600">{[...selectedServices].join(' · ')}</p>
                  </div>
                )}

                <div className="flex gap-3">
                  <button type="button" onClick={back} className="btn-secondary flex items-center gap-1.5">
                    <ArrowLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !slugAvailable}
                    className="btn-primary flex-1 flex items-center justify-center gap-2"
                  >
                    {loading ? <Spinner /> : <><Rocket className="w-4 h-4" /> Launch My Page</>}
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'var(--bam-text-faint)' }}>
          © {new Date().getFullYear()} BookAm ·{' '}
          <a
            href="https://www.ralphlawalgroup.com"
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => openExternalLink(e, 'https://www.ralphlawalgroup.com')}
            className="hover:underline"
          >
            A Ralph Lawal Group product
          </a>
        </p>
      </div>
    </div>
  );
}

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />;
}
