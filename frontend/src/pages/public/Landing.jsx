import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown, MessageSquare, Link2, Clock, BarChart2,
  CalendarDays, Smartphone, MapPin, Search, Zap, Shield,
  RefreshCw, ArrowRight, Mail,
} from 'lucide-react';
import { LOGO_BLUE_H, LOGO_WHITE_H } from '../../config/logos';

const FAQS = [
  {
    q: 'Is BookAm Business really free?',
    a: "Yes — the core plan is completely free. Create your booking page, set your services and hours, and accept unlimited bookings at no cost. We offer optional paid features for power users, but you'll never be forced to upgrade.",
  },
  {
    q: 'How do I get my booking link?',
    a: 'Once you create an account and set up your services, your booking page is instantly live at bookam.business/book/yourname. Share it anywhere — Instagram bio, WhatsApp, your website, or print it on a business card as a QR code.',
  },
  {
    q: 'Do customers need to create an account to book?',
    a: 'No. Customers can book without signing up — they just enter their name, phone, and optionally an email for confirmation. Creating a free customer account lets them manage their bookings, cancel, and get notifications.',
  },
  {
    q: 'Can customers cancel or reschedule?',
    a: 'Yes. Customers can cancel using the link in their confirmation email, or by looking up their booking reference on the site. Business owners can reschedule or cancel bookings from their dashboard.',
  },
  {
    q: 'Will I get notified about new bookings?',
    a: 'Yes — you receive an email for every new booking, cancellation, and reminder. Customers also get a confirmation email immediately after booking, plus reminders at 24 hours and 1 hour before their appointment.',
  },
];

function FaqAccordion() {
  const [open, setOpen] = useState(null);
  return (
    <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
      {FAQS.map((faq, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5 text-left bg-white hover:bg-gray-50 transition-colors"
          >
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

const FEATURES = [
  { icon: MessageSquare, iconBg: 'bg-violet-100', iconColor: 'text-violet-600', title: 'No more DM chaos', desc: 'Stop managing bookings through WhatsApp. Customers book themselves — you just show up.', bg: 'bg-violet-50', border: 'border-violet-100' },
  { icon: Link2,         iconBg: 'bg-blue-100',   iconColor: 'text-blue-600',   title: 'Your own booking link', desc: 'A clean page at bookam.business/book/yourbusiness. Share it anywhere — Instagram, WhatsApp, your website.', bg: 'bg-blue-50', border: 'border-blue-100' },
  { icon: Clock,         iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', title: 'Book while you sleep', desc: '24/7 online booking with automatic email confirmations. Never miss an appointment again.', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { icon: BarChart2,     iconBg: 'bg-amber-100',  iconColor: 'text-amber-600',  title: 'Dashboard & insights', desc: 'See upcoming bookings, track customers, and monitor revenue — all from one dashboard.', bg: 'bg-amber-50', border: 'border-amber-100' },
  { icon: CalendarDays,  iconBg: 'bg-pink-100',   iconColor: 'text-pink-600',   title: 'Flexible schedule', desc: 'Set your working hours, block days off, manage slot intervals exactly how you need.', bg: 'bg-pink-50', border: 'border-pink-100' },
  { icon: Smartphone,    iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', title: 'Works everywhere', desc: 'Mobile-first design. Your customers book from any device, any time.', bg: 'bg-indigo-50', border: 'border-indigo-100' },
];

const TYPES = [
  'Barbers', 'Hair Stylists', 'Nail Techs', 'Makeup Artists', 'Lash Techs',
  'Massage Therapists', 'Personal Trainers', 'Yoga Instructors', 'Photographers',
  'Tutors', 'Music Teachers', 'Consultants', 'Estheticians', 'Tattoo Artists',
  'Cleaning Services', 'Therapists', 'Mechanics', 'And more…',
];

const PILLS = [
  { icon: MapPin,     label: 'Near me' },
  { icon: Zap,        label: 'Instant booking' },
  { icon: Shield,     label: 'No-show protection' },
  { icon: RefreshCw,  label: 'One-tap rebook' },
  { icon: Clock,      label: 'Available 24/7' },
];

export default function Landing() {
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState('');

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-9 sm:h-10 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <Link to="/explore" className="hidden sm:inline-flex text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-2 sm:px-3 py-2">
              <span className="hidden sm:inline">Find services</span>
              <span className="sm:hidden">Explore</span>
            </Link>
            <Link to="/customer/login" className="text-xs sm:text-sm font-semibold text-gray-600 hover:text-gray-900 transition-colors px-2 sm:px-3 py-2">
              Sign in
            </Link>
            <Link to="/signup" className="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2 whitespace-nowrap">
              Sign up
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[linear-gradient(180deg,#f5f3ff_0%,#ffffff_55%,#ffffff_100%)] pointer-events-none" />
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[720px] h-[360px] bg-primary-300/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-7 sm:pt-10 pb-10 sm:pb-14 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-primary-200 text-primary-700 text-xs font-semibold px-4 py-2 rounded-full mb-5 shadow-sm">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            Welcome to BookAm Business
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-gray-950 leading-[1.05] tracking-tight max-w-4xl mx-auto">
            Book services or run your business,
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-400">
              all in one place
            </span>
          </h1>

          <p className="mt-4 sm:mt-5 text-base sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed px-2">
            Customers can discover trusted local services and book instantly. Businesses can create a booking page, manage appointments, chat, and grow from one dashboard.
          </p>

          <p className="mt-2 sm:mt-3 text-sm sm:text-base font-bold text-primary-600 tracking-wide">
            Book. Confirm. Be there.
          </p>

          <div className="mt-6 sm:mt-8 grid gap-3 sm:grid-cols-2 max-w-3xl mx-auto text-left">
            <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-card">
              <div className="w-11 h-11 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center mb-4">
                <Search className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">I want to book</h2>
              <p className="text-sm text-gray-500 mt-1 mb-4">Find barbers, stylists, tutors, trainers, and more near you.</p>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/customer/signup" className="btn-primary px-3 py-2.5 text-sm">Customer sign up</Link>
                <Link to="/customer/login" className="btn-secondary px-3 py-2.5 text-sm">Customer sign in</Link>
              </div>
            </div>

            <div className="rounded-2xl border border-primary-200 bg-primary-50 p-4 sm:p-5 shadow-card ring-1 ring-primary-100">
              <div className="w-11 h-11 rounded-xl bg-white text-primary-600 flex items-center justify-center mb-4">
                <CalendarDays className="w-5 h-5" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">I run a business</h2>
              <p className="text-sm text-gray-600 mt-1 mb-4">Create your booking page and manage customers, services, payments, and chats.</p>
              <div className="grid grid-cols-2 gap-2">
                <Link to="/admin/register" className="btn-primary px-3 py-2.5 text-sm">Business sign up</Link>
                <Link to="/admin/login" className="btn-secondary px-3 py-2.5 text-sm bg-white">Business sign in</Link>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-600 hover:text-primary-700 px-3 py-2">
              Browse services <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/booking/lookup" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-800 px-3 py-2">
              Find my booking
            </Link>
          </div>

          {/* Browser mockup — hide on very small screens */}
          <div className="mt-12 sm:mt-16 max-w-2xl mx-auto hidden sm:block">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-primary-300/20 to-indigo-300/20 rounded-3xl blur-2xl scale-105 pointer-events-none" />
              <div className="relative bg-gray-900 rounded-2xl overflow-hidden border border-gray-700/50 shadow-2xl">
                <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800">
                  <div className="w-3 h-3 rounded-full bg-red-500/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  <div className="flex-1 ml-3 bg-gray-700 rounded-md px-3 py-1.5 text-xs text-gray-400 text-left">
                    bookam.business/book/your-business
                  </div>
                </div>
                <div className="bg-white p-5 text-left">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-11 h-11 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold shadow-primary">Y</div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">Your Business Name</p>
                      <p className="text-xs text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> Your Location
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Choose a service</p>
                  <div className="space-y-2">
                    {[
                      { name: 'Your Service 1', time: '30 min', price: '$50', active: true },
                      { name: 'Your Service 2', time: '60 min', price: '$80', active: false },
                      { name: 'Your Service 3', time: '45 min', price: '$65', active: false },
                    ].map(s => (
                      <div key={s.name} className={`rounded-xl px-4 py-3 flex items-center justify-between border ${s.active ? 'bg-primary-50 border-primary-200 ring-1 ring-primary-400' : 'bg-gray-50 border-gray-100'}`}>
                        <div>
                          <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-400">{s.time}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-900">{s.price}</span>
                          <div className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${s.active ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'}`}>
                            {s.active ? 'Selected' : 'Book'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Consumer discovery banner */}
      <section className="py-12 sm:py-16 bg-gradient-to-br from-gray-900 to-primary-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-primary-300 text-xs font-bold uppercase tracking-widest mb-3">For customers</p>
          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-3">Find and book any service</h2>
          <p className="text-gray-300 text-sm sm:text-base mb-6 sm:mb-8">
            Search thousands of local businesses and book instantly — barbers, stylists, trainers, tutors and more.
          </p>

          <form
            onSubmit={(e) => { e.preventDefault(); navigate(`/explore?q=${encodeURIComponent(searchQ)}`); }}
            className="flex gap-2 max-w-md mx-auto mb-5 sm:mb-6"
          >
            <input
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
              placeholder="Haircut, massage, personal trainer…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            <button type="submit" className="bg-primary-500 hover:bg-primary-400 text-white font-bold px-4 sm:px-5 py-3 rounded-xl text-sm transition-colors">
              Search
            </button>
          </form>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-5 sm:px-6 py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors w-full sm:w-auto justify-center"
            >
              <Search className="w-4 h-4" /> Browse all services
            </Link>
            <Link
              to="/match"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-semibold px-5 sm:px-6 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors w-full sm:w-auto justify-center"
            >
              <Zap className="w-4 h-4" /> Smart Match — find best available
            </Link>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-6 sm:mt-8">
            {PILLS.map(p => (
              <span key={p.label} className="inline-flex items-center gap-1.5 text-xs bg-white/10 text-gray-200 px-3 py-1.5 rounded-full">
                <p.icon className="w-3 h-3 flex-shrink-0" />
                {p.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-10 sm:py-14 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4 sm:mb-5">Built for every service business</p>
          <div className="flex flex-wrap justify-center gap-2">
            {TYPES.map(c => (
              <span key={c} className={`text-xs sm:text-sm font-medium px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border ${c === 'And more…' ? 'text-primary-600 border-primary-200 bg-primary-50' : 'text-gray-700 border-gray-200 bg-white'}`}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-14">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900">Everything you need to run your bookings</h2>
            <p className="text-gray-500 mt-3 text-base sm:text-lg">No complex setup. No monthly fees to get started.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className={`rounded-2xl p-5 sm:p-6 border ${f.bg} ${f.border}`}>
                <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-xl ${f.iconBg} flex items-center justify-center mb-4`}>
                  <f.icon className={`w-5 h-5 sm:w-6 sm:h-6 ${f.iconColor}`} />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-14 sm:py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-10 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900">Up in 3 steps</h2>
            <p className="text-gray-500 mt-3 text-base sm:text-lg">Your first booking can come in today.</p>
          </div>
          <div className="max-w-2xl mx-auto space-y-3 sm:space-y-4">
            {[
              { n: '1', title: 'Create your free account', desc: 'Sign up in 30 seconds. No card needed.' },
              { n: '2', title: 'Add your services & hours', desc: 'Tell customers what you offer, how long it takes, and your schedule.' },
              { n: '3', title: 'Share your link', desc: 'Post /book/yourname anywhere. Customers book instantly.' },
            ].map(s => (
              <div key={s.n} className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-5 flex items-center gap-4 sm:gap-5 shadow-card">
                <div className="w-10 h-10 sm:w-12 sm:h-12 flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-xl flex items-center justify-center text-lg sm:text-xl font-bold shadow-primary">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm sm:text-base">{s.title}</h3>
                  <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-20 bg-white">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-4xl font-bold text-gray-900">Frequently asked questions</h2>
            <p className="text-gray-500 mt-3 text-base sm:text-lg">Everything you need to know before getting started.</p>
          </div>
          <FaqAccordion />
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <img src={LOGO_WHITE_H} alt="BookAm Business" className="h-8 sm:h-10 w-auto object-contain mx-auto mb-6 sm:mb-8 opacity-95" />
          <h2 className="text-3xl sm:text-5xl font-bold text-white leading-tight">
            Ready to stop the DM chaos?
          </h2>
          <p className="text-primary-200 mt-4 text-base sm:text-lg">Create your free booking page today.</p>
          <p className="text-primary-300/70 mt-2 text-sm sm:text-base font-medium tracking-wide">Book. Confirm. Be there.</p>
          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              to="/admin/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-primary-700 font-bold px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base hover:bg-gray-50 transition-all shadow-lg hover:-translate-y-px"
            >
              Create my free page
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center justify-center gap-2 border border-white/30 text-white font-semibold px-6 sm:px-8 py-3.5 sm:py-4 rounded-xl text-sm sm:text-base hover:bg-white/10 transition-all"
            >
              Browse services
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">

            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-8 w-auto object-contain brightness-0 invert mb-4" />
              <p className="text-sm text-gray-400 leading-relaxed mb-4">
                The easiest way for service businesses to accept online bookings. Free to start — no credit card needed.
              </p>
              <p className="text-xs font-semibold text-primary-400 tracking-widest uppercase">Book. Confirm. Be there.</p>
              {/* Social */}
              <div className="flex items-center gap-3 mt-5">
                <a href="https://instagram.com/bookambusiness" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-white/10 hover:bg-primary-600 rounded-xl flex items-center justify-center transition-colors" title="Instagram">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
                </a>
                <a href="https://twitter.com/bookambusiness" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-white/10 hover:bg-primary-600 rounded-xl flex items-center justify-center transition-colors" title="X / Twitter">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://tiktok.com/@bookambusiness" target="_blank" rel="noopener noreferrer"
                  className="w-9 h-9 bg-white/10 hover:bg-primary-600 rounded-xl flex items-center justify-center transition-colors" title="TikTok">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.02a4.85 4.85 0 01-1-.33z"/></svg>
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Product</h4>
              <ul className="space-y-2.5 text-sm">
                <li><Link to="/admin/register" className="hover:text-white transition-colors">Get started free</Link></li>
                <li><Link to="/explore" className="hover:text-white transition-colors">Find services</Link></li>
                <li><Link to="/match" className="hover:text-white transition-colors">Smart match</Link></li>
                <li><Link to="/booking/lookup" className="hover:text-white transition-colors">Find my booking</Link></li>
                <li><Link to="/admin/login" className="hover:text-white transition-colors">Business sign in</Link></li>
                <li><Link to="/customer/login" className="hover:text-white transition-colors">Customer sign in</Link></li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Support</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="mailto:hello@bookam.business" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" /> hello@bookam.business
                  </a>
                </li>
                <li><Link to="/customer/messages" className="hover:text-white transition-colors">Live chat</Link></li>
                <li><Link to="/customer/messages" className="hover:text-white transition-colors">Report an issue</Link></li>
                <li><Link to="/customer/messages" className="hover:text-white transition-colors">Make a complaint</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="https://www.ralphlawalgroup.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Ralph Lawal Group
                  </a>
                </li>
                <li><Link to="/legal/terms" className="hover:text-white transition-colors">Terms of service</Link></li>
                <li><Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy policy</Link></li>
                <li><Link to="/legal/cookies" className="hover:text-white transition-colors">Cookie policy</Link></li>
                <li><Link to="/legal/refunds" className="hover:text-white transition-colors">Refunds and disputes</Link></li>
                <li><a href="mailto:hello@bookam.business" className="hover:text-white transition-colors">Contact us</a></li>
                <li><span className="text-gray-500 text-xs">@bookambusiness</span></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-gray-500">
            <p>© {new Date().getFullYear()} BookAm Business. All rights reserved.</p>
            <p>
              A{' '}
              <a href="https://www.ralphlawalgroup.com" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors font-medium">
                Ralph Lawal Group
              </a>{' '}product
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
