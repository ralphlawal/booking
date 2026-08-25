import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown, MessageSquare, Link2, Clock, BarChart2,
  CalendarDays, MapPin, Search, Zap, Shield,
  RefreshCw, ArrowRight, Mail, Check,
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

const FEATURES = [
  { icon: MessageSquare, title: 'No more DM chaos', desc: 'Stop managing bookings through WhatsApp. Customers book themselves — you just show up.' },
  { icon: Link2,         title: 'Your own booking link', desc: 'A clean page at bookam.business/book/yourbusiness. Share it anywhere.' },
  { icon: Clock,         title: 'Book while you sleep', desc: '24/7 online booking with automatic email confirmations sent the moment someone books.' },
  { icon: BarChart2,     title: 'Dashboard & insights', desc: 'Upcoming bookings, revenue tracking, and customer history — from one dashboard.' },
  { icon: CalendarDays,  title: 'Flexible schedule', desc: 'Set working hours, block days off, and manage slot intervals exactly how you need.' },
  { icon: Shield,        title: 'No-show protection', desc: 'Require deposits, track no-show history, and auto-notify your waitlist when a slot opens.' },
];

const TYPES = [
  'Barbers', 'Hair Stylists', 'Nail Techs', 'Makeup Artists', 'Lash Techs',
  'Massage Therapists', 'Personal Trainers', 'Yoga Instructors', 'Photographers',
  'Tutors', 'Music Teachers', 'Consultants', 'Estheticians', 'Tattoo Artists',
  'Cleaning Services', 'Therapists', 'Mechanics', 'And more…',
];

function FaqAccordion() {
  const [open, setOpen] = useState(null);
  return (
    <div className="divide-y divide-gray-100">
      {FAQS.map((faq, i) => (
        <div key={i}>
          <button
            onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between gap-4 py-5 text-left"
          >
            <span className="font-semibold text-gray-900 text-sm sm:text-base">{faq.q}</span>
            <ChevronDown className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-200 ${open === i ? 'rotate-180' : ''}`} />
          </button>
          {open === i && (
            <p className="pb-5 text-gray-500 text-sm leading-relaxed">{faq.a}</p>
          )}
        </div>
      ))}
    </div>
  );
}

export default function Landing() {
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState('');

  return (
    <div className="min-h-screen bg-white text-gray-900">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-9 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-1">
            <Link to="/explore" className="hidden sm:inline-flex text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors px-3 py-2">
              Find services
            </Link>
            <Link to="/customer/login" className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link to="/signup" className="ml-1 bg-primary-600 hover:bg-primary-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero — split layout */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-12 sm:pb-20">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Left: copy + CTAs */}
          <div>
            <span className="inline-block text-xs font-bold text-primary-600 uppercase tracking-widest mb-5">
              Free for service businesses
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-950 leading-[1.05] tracking-tight">
              Your booking page,<br />
              <span className="text-primary-600">up in 3 minutes.</span>
            </h1>
            <p className="mt-5 text-base sm:text-lg text-gray-500 leading-relaxed max-w-lg">
              Set up your services, share your link, and customers book themselves.
              No DMs to manage, no missed appointments, no monthly fees.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                to="/admin/register"
                className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-6 py-3.5 rounded-lg text-sm transition-colors"
              >
                Start for free <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/explore"
                className="inline-flex items-center justify-center gap-2 border border-gray-200 text-gray-700 font-semibold px-6 py-3.5 rounded-lg text-sm hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                <Search className="w-4 h-4" /> Find a service
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2">
              {['No credit card needed', 'Live in minutes', 'Unlimited bookings'].map(t => (
                <span key={t} className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                  <Check className="w-3.5 h-3.5 text-emerald-500" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Right: product mockup */}
          <div className="hidden lg:block">
            <div className="relative bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-2xl">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 px-4 py-3 bg-[#1a1d20]">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <div className="flex-1 ml-3 bg-gray-700 rounded px-3 py-1 text-xs text-gray-400">
                  bookam.business/book/your-business
                </div>
              </div>
              {/* Page content */}
              <div className="bg-white p-5 text-left">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-primary-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">YB</div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">Your Business Name</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> Your Location
                    </p>
                  </div>
                  <span className="ml-auto text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-1 rounded">Open now</span>
                </div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Select a service</p>
                <div className="space-y-2">
                  {[
                    { name: 'Your Service 1', time: '30 min', price: '$50', active: true },
                    { name: 'Your Service 2', time: '60 min', price: '$80', active: false },
                    { name: 'Your Service 3', time: '45 min', price: '$65', active: false },
                  ].map(s => (
                    <div key={s.name} className={`rounded-lg px-4 py-3 flex items-center justify-between border ${s.active ? 'border-primary-200 ring-1 ring-primary-400 bg-primary-50' : 'border-gray-100 bg-white'}`}>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400 mt-0.5">{s.time}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">{s.price}</span>
                        <div className={`text-xs px-3 py-1.5 rounded-md font-semibold ${s.active ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                          {s.active ? 'Selected ✓' : 'Book'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="mt-4 w-full bg-primary-600 text-white font-bold py-3 rounded-lg text-sm">
                  Continue to pick a time →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-14 sm:mt-16 pt-8 border-t border-gray-100 grid grid-cols-3 gap-6 sm:gap-10 max-w-lg">
          {[
            { stat: '2,400+', label: 'businesses' },
            { stat: '48k+',   label: 'bookings taken' },
            { stat: '4.9',    label: 'average rating' },
          ].map(s => (
            <div key={s.stat}>
              <p className="text-2xl sm:text-3xl font-black text-slate-950">{s.stat}</p>
              <p className="text-xs text-gray-400 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Who it's for — scrolling pill strip */}
      <div className="border-y border-gray-100 bg-gray-50 py-4 overflow-hidden">
        <div className="flex gap-2 px-4 overflow-x-auto scrollbar-hide">
          {TYPES.map(c => (
            <span
              key={c}
              className={`flex-shrink-0 text-xs font-medium px-3 py-1.5 rounded-full border ${c === 'And more…' ? 'text-primary-600 border-primary-200 bg-white' : 'text-gray-600 border-gray-200 bg-white'}`}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* Features — editorial 2-column */}
      <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20 items-start">
          <div className="lg:sticky lg:top-24">
            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">What you get</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 leading-tight">
              Everything you need.<br />Nothing you don't.
            </h2>
            <p className="mt-4 text-gray-500 leading-relaxed">
              A booking page, automated messages, a customer dashboard — and a direct link to share everywhere.
              No complicated setup. No per-booking fees.
            </p>
            <Link
              to="/admin/register"
              className="inline-flex items-center gap-2 mt-6 bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-3 rounded-lg text-sm transition-colors"
            >
              Create your page <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 gap-px bg-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white p-5 sm:p-6">
                <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center mb-4">
                  <f.icon className="w-4 h-4 text-primary-600" />
                </div>
                <h3 className="font-bold text-gray-900 text-sm mb-1.5">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* For customers — dark section */}
      <section className="bg-slate-950 py-14 sm:py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="grid lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-primary-400 text-xs font-bold uppercase tracking-widest mb-4">For customers</p>
              <h2 className="text-2xl sm:text-4xl font-black text-white leading-tight">
                Find and book any<br />local service, instantly.
              </h2>
              <p className="text-gray-400 mt-4 text-sm sm:text-base leading-relaxed">
                Search barbers, stylists, trainers, tutors and more — then book in seconds without calling ahead or waiting for a reply.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/explore"
                  className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-bold px-5 py-3 rounded-lg text-sm hover:bg-gray-100 transition-colors"
                >
                  <Search className="w-4 h-4" /> Browse services
                </Link>
                <Link
                  to="/match"
                  className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-semibold px-5 py-3 rounded-lg text-sm hover:bg-white/10 transition-colors"
                >
                  <Zap className="w-4 h-4" /> Smart Match
                </Link>
              </div>
            </div>

            <div>
              <form
                onSubmit={(e) => { e.preventDefault(); navigate(`/explore?q=${encodeURIComponent(searchQ)}`); }}
                className="flex gap-2 mb-4"
              >
                <input
                  className="flex-1 px-4 py-3 rounded-lg bg-white/10 border border-white/10 text-white placeholder:text-gray-500 text-sm outline-none focus:border-primary-500 transition-colors"
                  placeholder="Haircut, massage, personal trainer…"
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                />
                <button type="submit" className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-5 py-3 rounded-lg text-sm transition-colors">
                  Go
                </button>
              </form>
              <div className="flex flex-wrap gap-2">
                {[
                  { icon: MapPin,    label: 'Near me' },
                  { icon: Zap,       label: 'Instant booking' },
                  { icon: Shield,    label: 'No-show protection' },
                  { icon: RefreshCw, label: 'One-tap rebook' },
                  { icon: Clock,     label: 'Available 24/7' },
                ].map(p => (
                  <span key={p.label} className="inline-flex items-center gap-1.5 text-xs bg-white/8 text-gray-400 border border-white/10 px-3 py-1.5 rounded-full">
                    <p.icon className="w-3 h-3 flex-shrink-0" />
                    {p.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — plain, numbered */}
      <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-20">
          <div>
            <p className="text-xs font-bold text-primary-600 uppercase tracking-widest mb-4">Getting started</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-950 leading-tight">
              Live before your<br />next appointment.
            </h2>
            <p className="mt-4 text-gray-500 text-sm sm:text-base leading-relaxed">
              Most businesses are taking online bookings within 10 minutes of signing up.
            </p>
          </div>

          <div className="space-y-8">
            {[
              { n: '01', title: 'Create your free account', desc: 'Sign up in 30 seconds. No card needed. No commitments.' },
              { n: '02', title: 'Add your services & hours', desc: 'Tell customers what you offer, how long it takes, and when you\'re available.' },
              { n: '03', title: 'Share your link', desc: 'Post bookam.business/book/yourname anywhere. Customers book instantly, you get notified.' },
            ].map(s => (
              <div key={s.n} className="flex gap-5">
                <div className="flex-shrink-0 w-10 text-right">
                  <span className="text-2xl font-black text-gray-200">{s.n}</span>
                </div>
                <div className="pt-1">
                  <h3 className="font-bold text-gray-900">{s.title}</h3>
                  <p className="text-sm text-gray-500 mt-1 leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}

            <div className="pl-14">
              <Link
                to="/admin/register"
                className="inline-flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-bold px-5 py-3 rounded-lg text-sm transition-colors"
              >
                Get started free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-14 sm:py-20 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            <div>
              <h2 className="text-2xl sm:text-3xl font-black text-slate-950 leading-tight">Questions?</h2>
              <p className="text-gray-500 text-sm mt-3">
                Can't find what you need?{' '}
                <a href="mailto:hello@bookam.business" className="text-primary-600 font-medium hover:underline">
                  Email us.
                </a>
              </p>
            </div>
            <div className="sm:col-span-2">
              <FaqAccordion />
            </div>
          </div>
        </div>
      </section>

      {/* CTA — solid, no gradient */}
      <section className="py-14 sm:py-20 bg-slate-950">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <img src={LOGO_WHITE_H} alt="BookAm Business" className="h-8 w-auto object-contain mx-auto mb-8 opacity-80" />
          <h2 className="text-3xl sm:text-5xl font-black text-white leading-tight">
            Stop managing bookings<br />through your DMs.
          </h2>
          <p className="text-gray-400 mt-5 text-base sm:text-lg">Your free booking page is a few clicks away.</p>
          <div className="mt-8 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link
              to="/admin/register"
              className="inline-flex items-center justify-center gap-2 bg-white text-gray-900 font-bold px-7 py-4 rounded-lg text-sm hover:bg-gray-100 transition-colors"
            >
              Create my free page <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/explore"
              className="inline-flex items-center justify-center gap-2 border border-white/20 text-white font-semibold px-7 py-4 rounded-lg text-sm hover:bg-white/10 transition-colors"
            >
              Browse services
            </Link>
          </div>
          <p className="mt-6 text-xs text-gray-600">No credit card · No setup fee · Cancel any time</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-16 pb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 mb-10 sm:mb-12">

            {/* Brand */}
            <div className="sm:col-span-2 lg:col-span-1">
              <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-8 w-auto object-contain brightness-0 invert mb-4" />
              <p className="text-sm leading-relaxed mb-4">
                The easiest way for service businesses to accept online bookings. Free to start.
              </p>
              <div className="flex items-center gap-2.5 mt-5">
                <a href="https://instagram.com/bookambusiness" target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 hover:bg-primary-600 hover:text-white rounded-lg flex items-center justify-center transition-colors" title="Instagram">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="0.5" fill="currentColor"/></svg>
                </a>
                <a href="https://twitter.com/bookambusiness" target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 hover:bg-primary-600 hover:text-white rounded-lg flex items-center justify-center transition-colors" title="X / Twitter">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.911-5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://tiktok.com/@bookambusiness" target="_blank" rel="noopener noreferrer"
                  className="w-8 h-8 bg-white/10 hover:bg-primary-600 hover:text-white rounded-lg flex items-center justify-center transition-colors" title="TikTok">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.02a4.85 4.85 0 01-1-.33z"/></svg>
                </a>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold text-xs mb-4 uppercase tracking-wider">Product</h4>
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
              <h4 className="text-white font-semibold text-xs mb-4 uppercase tracking-wider">Support</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="mailto:hello@bookam.business" className="hover:text-white transition-colors flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 flex-shrink-0" /> hello@bookam.business
                  </a>
                </li>
                <li><Link to="/customer/messages" className="hover:text-white transition-colors">Live chat</Link></li>
                <li><Link to="/customer/messages" className="hover:text-white transition-colors">Report an issue</Link></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-white font-semibold text-xs mb-4 uppercase tracking-wider">Company</h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="https://www.ralphlawalgroup.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                    Ralph Lawal Group
                  </a>
                </li>
                <li><Link to="/legal/terms" className="hover:text-white transition-colors">Terms of service</Link></li>
                <li><Link to="/legal/privacy" className="hover:text-white transition-colors">Privacy policy</Link></li>
                <li><Link to="/legal/cookies" className="hover:text-white transition-colors">Cookie policy</Link></li>
                <li><Link to="/legal/refunds" className="hover:text-white transition-colors">Refunds & disputes</Link></li>
                <li><a href="mailto:hello@bookam.business" className="hover:text-white transition-colors">Contact us</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-600">
              © {new Date().getFullYear()} BookAm Business · All rights reserved
            </p>
            <p className="text-xs text-gray-600">
              Built by{' '}
              <a href="https://www.ralphlawalgroup.com" target="_blank" rel="noopener noreferrer" className="hover:text-gray-400 transition-colors">
                Ralph Lawal Group
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
