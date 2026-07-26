import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search, MapPin, Navigation, ChevronDown, ArrowRight,
  Star, BadgeCheck, Shield, Clock, Zap, MessageSquare,
  BarChart2, CalendarDays, Smartphone, Mail,
} from 'lucide-react';
import { LOGO_BLUE_H, LOGO_WHITE_H } from '../../config/logos';
import { discoverAPI } from '../../services/api';

// ─── Category data ───────────────────────────────────────────────────────────
const CATEGORIES = [
  { label: 'Hair', emoji: '💇', color: 'from-pink-400 to-rose-500', bg: 'bg-rose-50' },
  { label: 'Nails', emoji: '💅', color: 'from-fuchsia-400 to-pink-500', bg: 'bg-fuchsia-50' },
  { label: 'Beauty', emoji: '✨', color: 'from-amber-400 to-orange-500', bg: 'bg-amber-50' },
  { label: 'Lashes', emoji: '👁️', color: 'from-purple-400 to-violet-500', bg: 'bg-purple-50' },
  { label: 'Massage', emoji: '🤲', color: 'from-teal-400 to-cyan-500', bg: 'bg-teal-50' },
  { label: 'Fitness', emoji: '🏋️', color: 'from-emerald-400 to-green-500', bg: 'bg-emerald-50' },
  { label: 'Cleaning', emoji: '🧹', color: 'from-sky-400 to-blue-500', bg: 'bg-sky-50' },
  { label: 'Tutoring', emoji: '📚', color: 'from-indigo-400 to-blue-500', bg: 'bg-indigo-50' },
  { label: 'Barbers', emoji: '✂️', color: 'from-slate-500 to-gray-600', bg: 'bg-slate-50' },
  { label: 'More', emoji: '＋', color: 'from-gray-400 to-gray-500', bg: 'bg-gray-100' },
];

const HOW_STEPS_CUSTOMER = [
  { n: '1', title: 'Search a service', desc: 'Find barbers, stylists, trainers, and more near you.' },
  { n: '2', title: 'Choose a time', desc: 'Pick a date and time that works. See real availability instantly.' },
  { n: '3', title: 'Book & relax', desc: "Get a confirmation email. Show up. That's it." },
];

const HOW_STEPS_BUSINESS = [
  { n: '1', title: 'Create your free page', desc: 'Set up in under 5 minutes. No tech skills needed.' },
  { n: '2', title: 'Add your services', desc: 'List what you offer, prices, and availability.' },
  { n: '3', title: 'Share your link', desc: 'Post it anywhere — bookings come straight to your dashboard.' },
];

const FAQS = [
  { q: 'Is BookAm free?', a: 'Yes — the core plan is completely free. Create your booking page, set your services and hours, and accept unlimited bookings at no cost.' },
  { q: 'Do customers need an account to book?', a: 'No. Customers can book without signing up — they just enter their name, phone, and optionally an email for confirmation.' },
  { q: 'Can customers cancel or reschedule?', a: 'Yes. Customers can cancel using the link in their confirmation email, or from their dashboard if they have an account.' },
  { q: 'How do I get notified about new bookings?', a: 'You receive an email for every new booking, cancellation, and reminder. Push notifications are available in the app too.' },
  { q: 'Does it work for mobile (home visit) services?', a: 'Yes. You can set a travel radius and mobile pricing per service, so customers can book you at their location.' },
];

function FaqAccordion() {
  const [open, setOpen] = useState(null);
  return (
    <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden bg-white">
      {FAQS.map((faq, i) => (
        <div key={i}>
          <button onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left hover:bg-gray-50 transition-colors">
            <span className="font-semibold text-gray-900 text-sm sm:text-base">{faq.q}</span>
            <ChevronDown className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && (
            <div className="px-5 sm:px-6 pb-4 sm:pb-5 bg-white">
              <p className="text-gray-600 text-sm leading-relaxed">{faq.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FeaturedCard({ biz }) {
  const verified = biz.is_verified || biz.verification_status === 'verified';
  return (
    <Link to={`/profile/${biz.slug}`}
      className="group flex-shrink-0 w-52 sm:w-60 bg-white rounded-2xl border border-gray-100 shadow-md overflow-hidden hover:-translate-y-1 hover:shadow-xl transition-all duration-200">
      <div className="h-36 bg-gray-100 relative overflow-hidden">
        {biz.logo_url ? (
          <img src={biz.logo_url} alt={biz.name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center">
            <span className="text-4xl font-black text-primary-400">{(biz.name || '?')[0]}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/50 to-transparent" />
        {biz.distance_km != null && (
          <span className="absolute top-2 right-2 bg-white/90 text-xs font-semibold px-2 py-0.5 rounded-full text-gray-700 flex items-center gap-1">
            <MapPin className="w-3 h-3" />{biz.distance_km} km
          </span>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-1">
          <h3 className="font-bold text-gray-900 text-sm truncate">{biz.name}</h3>
          {verified && <BadgeCheck className="w-4 h-4 text-blue-500 flex-shrink-0" />}
        </div>
        {biz.category && <p className="text-xs text-primary-600 font-semibold mt-0.5">{biz.category}</p>}
        <div className="flex items-center justify-between mt-2">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Star className={`w-3.5 h-3.5 ${parseFloat(biz.avg_rating) > 0 ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
            {parseFloat(biz.avg_rating) > 0 ? parseFloat(biz.avg_rating).toFixed(1) : 'New'}
            {biz.review_count > 0 && <span className="text-gray-400">({biz.review_count})</span>}
          </span>
          {biz.min_price != null && (
            <span className="text-xs font-bold text-gray-700">From £{parseFloat(biz.min_price).toFixed(0)}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [service, setService] = useState('');
  const [location, setLocation] = useState('');
  const [featured, setFeatured] = useState([]);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    discoverAPI.search({ limit: 8 }).then(setFeatured).catch(() => {});
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (service) params.set('q', service);
    navigate(`/explore?${params.toString()}`);
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      () => { setLocation('Near me'); setLocating(false); },
      () => { setLocating(false); },
      { timeout: 8000 }
    );
  };

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* ── Navbar ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-8 sm:h-9 w-auto object-contain" />
          </Link>
          <div className="hidden sm:flex items-center gap-6 text-sm font-medium text-gray-600">
            <Link to="/explore" className="hover:text-primary-600 transition-colors">Find services</Link>
            <Link to="/feed" className="hover:text-primary-600 transition-colors">Feed</Link>
            <Link to="/admin/register" className="hover:text-primary-600 transition-colors">For businesses</Link>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/customer/login" className="text-sm font-semibold text-gray-600 hover:text-gray-900 px-3 py-2 transition-colors">
              Sign in
            </Link>
            <Link to="/signup" className="btn-primary text-sm px-4 py-2">
              Get started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-b from-primary-950 via-primary-900 to-slate-950 pt-14 pb-0 overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-xs font-bold text-primary-200 tracking-wide mb-6">
            <Zap className="w-3.5 h-3.5" /> Book any service, anywhere
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-[1.02] tracking-tight">
            Book the best
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-300 to-cyan-300">
              near you
            </span>
          </h1>
          <p className="mt-4 text-base sm:text-xl text-white/70 max-w-2xl mx-auto leading-relaxed">
            Discover trusted local professionals — hair, nails, massage, fitness, cleaning and more.
            Book instantly, no phone calls needed.
          </p>

          {/* ── Search form ─────────────────────────────────────────────────── */}
          <form onSubmit={handleSearch}
            className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-2 max-w-2xl mx-auto bg-white/10 backdrop-blur-sm p-2 rounded-2xl border border-white/20">
            <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-4 py-3.5">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                className="flex-1 bg-transparent text-gray-900 placeholder:text-gray-400 text-sm font-medium outline-none"
                placeholder="What service are you looking for?"
                value={service}
                onChange={e => setService(e.target.value)}
              />
            </div>
            <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-4 py-3.5">
              <MapPin className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                className="flex-1 bg-transparent text-gray-900 placeholder:text-gray-400 text-sm font-medium outline-none"
                placeholder="City or postcode"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
              <button type="button" onClick={detectLocation} disabled={locating}
                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors" title="Use my location">
                <Navigation className={`w-4 h-4 ${locating ? 'text-primary-500 animate-pulse' : 'text-gray-400'}`} />
              </button>
            </div>
            <button type="submit"
              className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition-colors shadow-lg shadow-primary-600/30 whitespace-nowrap">
              Search
            </button>
          </form>

          {/* Quick links */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            {['Haircut', 'Nails', 'Massage', 'Personal trainer', 'Cleaning'].map(tag => (
              <button key={tag} onClick={() => navigate(`/explore?q=${encodeURIComponent(tag)}`)}
                className="text-xs bg-white/10 hover:bg-white/20 text-white/80 hover:text-white px-3 py-1.5 rounded-full font-medium transition-colors border border-white/10">
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* ── Category icons ──────────────────────────────────────────────────── */}
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 mt-10 pb-8">
          <div className="overflow-x-auto scrollbar-hide">
            <div className="flex gap-4 sm:gap-6 min-w-max mx-auto justify-center pb-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.label}
                  onClick={() => navigate(cat.label === 'More' ? '/explore' : `/explore?category=${encodeURIComponent(cat.label)}`)}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center text-2xl sm:text-3xl
                    bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/30 transition-all group-hover:scale-105 backdrop-blur-sm`}>
                    {cat.emoji}
                  </div>
                  <span className="text-[11px] sm:text-xs font-semibold text-white/70 group-hover:text-white transition-colors">{cat.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Featured businesses ─────────────────────────────────────────────── */}
      {featured.length > 0 && (
        <section className="py-12 sm:py-16 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Popular near you</h2>
                <p className="text-sm text-gray-500 mt-0.5">Top-rated professionals ready to book</p>
              </div>
              <Link to="/explore" className="text-sm font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1">
                See all <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="overflow-x-auto scrollbar-hide pb-2">
              <div className="flex gap-4 min-w-max">
                {featured.map(biz => <FeaturedCard key={biz.id} biz={biz} />)}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ── How it works (consumers) ─────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-2">For customers</p>
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900">Book in 3 easy steps</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {HOW_STEPS_CUSTOMER.map(s => (
              <div key={s.n} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 text-white text-2xl font-black flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary-200">
                  {s.n}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/explore" className="btn-primary px-8 py-3.5 text-base inline-flex items-center gap-2">
              Find a service <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Trust badges ─────────────────────────────────────────────────────── */}
      <section className="py-10 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
            {[
              { icon: Shield, label: 'Verified businesses', desc: 'Every business is reviewed before going live' },
              { icon: Star, label: 'Genuine reviews', desc: 'Reviews only from real bookings' },
              { icon: Zap, label: 'Instant booking', desc: 'No phone calls, no waiting for a reply' },
              { icon: Clock, label: '24/7 availability', desc: 'Book any time, even at midnight' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label}>
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
                  <Icon className="w-6 h-6 text-primary-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm">{label}</h3>
                <p className="text-xs text-gray-500 mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Business CTA ─────────────────────────────────────────────────────── */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 to-primary-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-primary-400 text-xs font-bold uppercase tracking-widest mb-4">For service professionals</p>
            <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
              Set up your business on BookAm
            </h2>
            <p className="text-gray-300 mt-4 text-base sm:text-lg leading-relaxed">
              Get your own booking page, manage appointments, chat with customers, track payments, and grow — all from one free dashboard.
            </p>
            <div className="mt-8 sm:mt-10 grid sm:grid-cols-2 gap-4">
              {[
                { icon: CalendarDays, label: 'Smart calendar', desc: 'Week view with colour-coded bookings' },
                { icon: Smartphone, label: 'Mobile-friendly', desc: 'Your clients book from any device' },
                { icon: MessageSquare, label: 'Customer chat', desc: 'Built-in messaging, no DM chaos' },
                { icon: BarChart2, label: 'Revenue insights', desc: 'Track earnings and top services' },
              ].map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-4 h-4 text-primary-300" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{label}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3 lg:pl-8">
            <p className="text-xs font-bold text-white/50 uppercase tracking-widest mb-5">Get started in 3 steps</p>
            {HOW_STEPS_BUSINESS.map(s => (
              <div key={s.n} className="flex items-start gap-4 bg-white/5 border border-white/10 rounded-2xl p-4">
                <div className="w-10 h-10 flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-xl flex items-center justify-center font-bold">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">{s.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-4">
              <Link to="/admin/register"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-white text-primary-700 font-bold px-5 py-3.5 rounded-xl text-sm hover:bg-gray-50 transition-all shadow-lg">
                Create my free page <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/admin/login"
                className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-semibold px-5 py-3.5 rounded-xl text-sm hover:bg-white/10 transition-all">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ──────────────────────────────────────────────────────────────── */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900">Questions?</h2>
            <p className="text-gray-500 mt-3 text-base">Everything you need to know.</p>
          </div>
          <FaqAccordion />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-10">
            <div className="sm:col-span-2 lg:col-span-1">
              <img src={LOGO_BLUE_H} alt="BookAm" className="h-8 w-auto object-contain brightness-0 invert mb-4" />
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                The easiest way to discover and book local services — or manage your business bookings. Free to start.
              </p>
              <p className="text-xs font-bold text-primary-400 tracking-widest uppercase">Book. Confirm. Be there.</p>
              <div className="flex items-center gap-3 mt-5">
                <a href="https://instagram.com/bookambusiness" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 hover:bg-primary-600 rounded-xl flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
                </a>
                <a href="https://twitter.com/bookambusiness" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 hover:bg-primary-600 rounded-xl flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://tiktok.com/@bookambusiness" target="_blank" rel="noopener noreferrer" className="w-9 h-9 bg-white/10 hover:bg-primary-600 rounded-xl flex items-center justify-center transition-colors">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.02a4.85 4.85 0 01-1-.33z"/></svg>
                </a>
              </div>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Discover</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/explore" className="hover:text-white transition-colors">Find services</Link></li>
                <li><Link to="/match" className="hover:text-white transition-colors">Smart Match</Link></li>
                <li><Link to="/feed" className="hover:text-white transition-colors">Feed</Link></li>
                <li><Link to="/customer/signup" className="hover:text-white transition-colors">Customer sign up</Link></li>
                <li><Link to="/customer/login" className="hover:text-white transition-colors">Customer sign in</Link></li>
                <li><Link to="/booking/lookup" className="hover:text-white transition-colors">Find my booking</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">For businesses</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/admin/register" className="hover:text-white transition-colors">Create a free page</Link></li>
                <li><Link to="/admin/login" className="hover:text-white transition-colors">Business sign in</Link></li>
                <li><Link to="/admin-support" className="hover:text-white transition-colors">Business support</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li><a href="https://www.ralphlawalgroup.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">Ralph Lawal Group</a></li>
                <li><a href="mailto:hello@bookam.business" className="hover:text-white transition-colors flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 flex-shrink-0" /> hello@bookam.business</a></li>
                <li><Link to="/legal/terms" className="hover:text-white transition-colors">Terms of service</Link></li>
                <li><Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy policy</Link></li>
                <li><Link to="/legal/refunds" className="hover:text-white transition-colors">Refunds & disputes</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <p>© {new Date().getFullYear()} BookAm Business. All rights reserved.</p>
            <p>A <a href="https://www.ralphlawalgroup.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors font-medium">Ralph Lawal Group</a> product</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
