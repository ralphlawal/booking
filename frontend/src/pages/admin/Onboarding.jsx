import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Check, X, Rocket, Camera, CalendarDays, Banknote, Star, Users, Zap,
  MapPin, Phone, Mail, BadgeCheck,
} from 'lucide-react';
import { businessAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LOGO_BLUE_H, LOGO_WHITE_H } from '../../config/logos';
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
  { num: 1, label: 'Business', desc: 'What do you do?' },
  { num: 2, label: 'Contact', desc: 'How to find you?' },
  { num: 3, label: 'Your Link', desc: 'Claim your URL' },
];

const BENEFITS = [
  { icon: CalendarDays, label: 'Smart booking calendar', desc: 'Week view with colour-coded appointments' },
  { icon: Zap, label: 'Instant confirmations', desc: 'Customers get booking refs automatically' },
  { icon: Users, label: 'Customer management', desc: 'Built-in CRM and chat for every client' },
  { icon: Banknote, label: 'Revenue tracking', desc: 'See earnings, top services, and trends' },
  { icon: Star, label: 'Verified reviews', desc: 'Only real customers can leave reviews' },
  { icon: Camera, label: 'Portfolio & posts', desc: 'Showcase your work with photos and offers' },
];

function Spinner() {
  return <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />;
}

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

  useEffect(() => {
    if (business) navigate('/admin/dashboard', { replace: true });
  }, [business, navigate]);

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

  return (
    <div className="min-h-screen bg-white flex">

      {/* ── Left panel (hidden on mobile) ─────────────────────────────────── */}
      <div className="hidden lg:flex flex-col w-[420px] flex-shrink-0 bg-gradient-to-b from-primary-950 to-slate-900 relative overflow-hidden">
        {/* Blobs */}
        <div className="absolute -top-20 -left-20 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col flex-1 px-10 py-10">
          <Link to="/">
            <img src={LOGO_WHITE_H} alt="BookAm Business"
              className="h-9 w-auto object-contain mb-10 brightness-0 invert"
              onError={e => { e.currentTarget.src = LOGO_BLUE_H; e.currentTarget.className = 'h-9 w-auto object-contain mb-10'; }} />
          </Link>

          <div className="flex-1">
            <h2 className="text-3xl font-black text-white leading-tight mb-3">
              Your booking page in{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-cyan-300">
                2 minutes
              </span>
            </h2>
            <p className="text-primary-200 text-sm leading-relaxed mb-8">
              Everything you need to manage appointments, grow your client base, and get paid — all in one free dashboard.
            </p>

            <div className="space-y-4">
              {BENEFITS.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-primary-300" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-sm">{label}</p>
                    <p className="text-primary-300 text-xs mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 border-t border-white/10 pt-6">
            <p className="text-white/40 text-xs">© {new Date().getFullYear()} BookAm Business</p>
            <p className="text-white/30 text-xs mt-0.5">A Ralph Lawal Group product · Free to start</p>
          </div>
        </div>
      </div>

      {/* ── Right panel ───────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-y-auto">
        {/* Mobile logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 lg:hidden">
          <Link to="/"><img src={LOGO_BLUE_H} alt="BookAm" className="h-8 w-auto object-contain" /></Link>
          <Link to="/admin/login" className="text-sm font-semibold text-gray-500 hover:text-gray-700">Sign in</Link>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
          <div className="w-full max-w-md animate-fade-in">

            {/* Step header */}
            <div className="mb-8">
              <div className="flex items-center gap-2 mb-5">
                {STEPS.map((s, i) => (
                  <React.Fragment key={s.num}>
                    <div className={`flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold transition-all ${
                      i < step ? 'bg-primary-600 text-white' :
                      i === step ? 'bg-primary-600 text-white ring-4 ring-primary-100' :
                      'bg-gray-100 text-gray-400'}`}>
                      {i < step ? <Check className="w-4 h-4" /> : s.num}
                    </div>
                    {i < STEPS.length - 1 && (
                      <div className="flex-1 h-1 rounded-full bg-gray-100 overflow-hidden">
                        <div className={`h-full bg-primary-600 transition-all duration-500 ${i < step ? 'w-full' : 'w-0'}`} />
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div>
                <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-1">
                  Step {step + 1} of {STEPS.length}
                </p>
                <h1 className="text-2xl font-black text-gray-900">{STEPS[step].desc}</h1>
                <p className="text-gray-500 text-sm mt-1">
                  {step === 0 && 'Tell customers what you offer and where to find you.'}
                  {step === 1 && 'Your contact info will appear on your public booking page.'}
                  {step === 2 && 'This is your permanent booking link — choose it carefully.'}
                </p>
              </div>
            </div>

            {/* Form card */}
            <form onSubmit={submit} className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-100/60 p-6">

              {/* Step 0 — Business */}
              {step === 0 && (
                <div className="space-y-4 animate-in">
                  <div>
                    <label className="label">Business name *</label>
                    <input className="input" placeholder="e.g. Smooth Cuts Barbershop" required value={form.name} onChange={set('name')} />
                  </div>
                  <div>
                    <label className="label">Industry / category *</label>
                    <select className="input" required value={form.category} onChange={set('category')}>
                      <option value="">Select your industry…</option>
                      {CATEGORIES.map(c => <option key={c} value={c.toLowerCase()}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Short description <span className="text-gray-400 font-normal">(optional)</span></label>
                    <textarea className="input resize-none" rows={3} placeholder="e.g. Premium haircuts and grooming for gentlemen." value={form.description} onChange={set('description')} />
                  </div>
                  <button type="button" onClick={next} disabled={!form.name || !form.category}
                    className="btn-primary w-full py-3.5 text-base mt-2 disabled:opacity-50">
                    Continue →
                  </button>
                </div>
              )}

              {/* Step 1 — Contact */}
              {step === 1 && (
                <div className="space-y-4 animate-in">
                  <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3.5 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <BadgeCheck className="w-5 h-5 text-primary-600" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{form.name}</p>
                      <p className="text-xs text-gray-500 capitalize">{form.category}</p>
                    </div>
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /> Phone number</label>
                    <input className="input" type="tel" placeholder="+44 7700 900000" value={form.phone} onChange={set('phone')} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-gray-400" /> Business email</label>
                    <input className="input" type="email" placeholder="hello@mybusiness.com" value={form.email} onChange={set('email')} />
                  </div>
                  <div>
                    <label className="label flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400" /> Location / address</label>
                    <input className="input" placeholder="123 Main St, London" value={form.location} onChange={set('location')} />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={back} className="btn-secondary flex-1 py-3">← Back</button>
                    <button type="button" onClick={next} className="btn-primary flex-1 py-3">Continue →</button>
                  </div>
                </div>
              )}

              {/* Step 2 — Slug */}
              {step === 2 && (
                <div className="space-y-4 animate-in">
                  <div>
                    <label className="label">Your booking page name *</label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 bg-white transition-all">
                      <span className="px-3 py-3 bg-gray-50 text-gray-500 text-sm border-r border-gray-200 whitespace-nowrap font-mono">/book/</span>
                      <input
                        className="flex-1 px-3 py-3 text-sm outline-none bg-transparent text-gray-900 placeholder:text-gray-400 font-mono"
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
                      <p className={`text-xs mt-1.5 font-semibold flex items-center gap-1 ${
                        slugAvailable === true ? 'text-green-600' :
                        slugAvailable === false ? 'text-red-600' : 'text-gray-400'}`}>
                        {slugAvailable === true ? <><Check className="w-3.5 h-3.5" /> Available — great choice!</> :
                         slugAvailable === false ? <><X className="w-3.5 h-3.5" /> Already taken — try another name</> :
                         <><span className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin inline-block" /> Checking…</>}
                      </p>
                    )}
                  </div>

                  {slugAvailable === true && form.slug && (
                    <div className="p-4 bg-primary-50 border border-primary-100 rounded-xl">
                      <p className="text-xs text-primary-500 font-semibold mb-1">Your booking page will be live at:</p>
                      <p className="text-sm font-bold text-primary-800 font-mono break-all">{window.location.origin}/book/{form.slug}</p>
                    </div>
                  )}

                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700 leading-relaxed">
                    This URL is permanent and will be shared with your customers. Choose something short and memorable.
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={back} className="btn-secondary flex-1 py-3">← Back</button>
                    <button type="submit" disabled={loading || !slugAvailable} className="btn-primary flex-1 py-3 disabled:opacity-50">
                      {loading ? <Spinner /> : <span className="flex items-center gap-2"><Rocket className="w-4 h-4" /> Launch!</span>}
                    </button>
                  </div>
                </div>
              )}
            </form>

            <p className="text-center text-xs text-gray-400 mt-5">
              Already have an account?{' '}
              <Link to="/admin/login" className="text-primary-600 font-semibold hover:underline">Sign in →</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
