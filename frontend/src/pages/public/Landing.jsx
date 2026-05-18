import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LOGO_BLUE_H, LOGO_WHITE_H } from '../../config/logos';

const FEATURES = [
  { emoji: '💬', title: 'No more DM chaos', desc: 'Stop managing bookings through WhatsApp. Customers book themselves — you just show up.', bg: 'bg-violet-50', border: 'border-violet-100' },
  { emoji: '🔗', title: 'Your own booking link', desc: 'A clean page at bookam.business/book/yourbusiness. Share it anywhere — Instagram, WhatsApp, your website.', bg: 'bg-blue-50', border: 'border-blue-100' },
  { emoji: '⏰', title: 'Book while you sleep', desc: '24/7 online booking with automatic email confirmations. Never miss an appointment again.', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  { emoji: '📊', title: 'Dashboard & insights', desc: 'See upcoming bookings, track customers, and monitor revenue — all from one dashboard.', bg: 'bg-amber-50', border: 'border-amber-100' },
  { emoji: '📅', title: 'Flexible schedule', desc: 'Set your working hours, block days off, manage slot intervals exactly how you need.', bg: 'bg-pink-50', border: 'border-pink-100' },
  { emoji: '📱', title: 'Works everywhere', desc: 'Mobile-first design. Your customers book from any device, any time.', bg: 'bg-indigo-50', border: 'border-indigo-100' },
];

const TYPES = [
  'Barbers', 'Hair Stylists', 'Nail Techs', 'Makeup Artists', 'Lash Techs',
  'Massage Therapists', 'Personal Trainers', 'Yoga Instructors', 'Photographers',
  'Tutors', 'Music Teachers', 'Consultants', 'Estheticians', 'Tattoo Artists',
  'Cleaning Services', 'Therapists', 'Mechanics', 'And more…',
];

export default function Landing() {
  const navigate = useNavigate();
  const [searchQ, setSearchQ] = useState('');

  return (
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <img src={LOGO_BLUE_H} alt="BookAm" className="h-9 w-auto object-contain" />
          <div className="flex items-center gap-3">
            <Link to="/explore" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 hidden sm:block">
              Find services
            </Link>
            <Link to="/admin/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">
              Business sign in
            </Link>
            <Link to="/admin/register" className="btn-primary text-sm">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/80 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-primary-200 text-primary-700 text-xs font-semibold px-4 py-2 rounded-full mb-8 shadow-sm">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            Free to start — no credit card needed
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.07] tracking-tight max-w-4xl mx-auto">
            Your booking page,
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-400">
              live in minutes
            </span>
          </h1>

          <p className="mt-7 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Built for every service business. Let customers book themselves 24/7 — you get notified instantly and just show up.
          </p>

          <p className="mt-4 text-base font-semibold text-primary-600 tracking-wide">
            Book. Confirm. Be there.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/admin/register" className="btn-primary px-8 py-3.5 text-base w-full sm:w-auto">
              Create my booking page
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </Link>
            <a href="/book/smoothcuts" target="_blank" rel="noopener noreferrer" className="btn-secondary px-8 py-3.5 text-base w-full sm:w-auto">
              See a live example
            </a>
          </div>

          {/* Browser mockup */}
          <div className="mt-16 max-w-2xl mx-auto">
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
                      <p className="text-xs text-gray-400">📍 Your Location</p>
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
                            {s.active ? 'Selected ✓' : 'Book'}
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
      <section className="py-16 bg-gradient-to-br from-gray-900 to-primary-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-primary-300 text-xs font-bold uppercase tracking-widest mb-3">For customers</p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">Find and book any service</h2>
          <p className="text-gray-300 text-base mb-8">
            Search thousands of local businesses and book instantly — barbers, stylists, trainers, tutors and more.
          </p>

          {/* Search bar */}
          <form
            onSubmit={(e) => { e.preventDefault(); navigate(`/explore?q=${encodeURIComponent(searchQ)}`); }}
            className="flex gap-2 max-w-md mx-auto mb-6"
          >
            <input
              className="flex-1 px-4 py-3 rounded-xl text-sm outline-none"
              placeholder="Haircut, massage, personal trainer…"
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
            />
            <button type="submit" className="bg-primary-500 hover:bg-primary-400 text-white font-bold px-5 py-3 rounded-xl text-sm transition-colors">
              Search
            </button>
          </form>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/explore"
              className="inline-flex items-center gap-2 bg-white text-gray-900 font-bold px-6 py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              🔍 Browse all services
            </Link>
            <Link
              to="/match"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-semibold px-6 py-3 rounded-xl text-sm hover:bg-white/10 transition-colors"
            >
              ⚡ Smart Match — find best available
            </Link>
          </div>

          {/* Feature pills */}
          <div className="flex flex-wrap justify-center gap-2 mt-8">
            {['📍 Near me', '⚡ Instant booking', '💳 No-show protection', '↩ One-tap rebook', '🕐 Available 24/7'].map(f => (
              <span key={f} className="text-xs bg-white/10 text-gray-200 px-3 py-1.5 rounded-full">{f}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-14 bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-5">Built for every service business</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {TYPES.map(c => (
              <span key={c} className={`text-sm font-medium px-4 py-2 rounded-full border ${c === 'And more…' ? 'text-primary-600 border-primary-200 bg-primary-50' : 'text-gray-700 border-gray-200 bg-white'}`}>
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Everything you need to run your bookings</h2>
            <p className="text-gray-500 mt-3 text-lg">No complex setup. No monthly fees to get started.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className={`rounded-2xl p-6 border ${f.bg} ${f.border}`}>
                <div className="text-3xl mb-4">{f.emoji}</div>
                <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Up in 3 steps</h2>
            <p className="text-gray-500 mt-3 text-lg">Your first booking can come in today.</p>
          </div>
          <div className="max-w-2xl mx-auto space-y-4">
            {[
              { n: '1', title: 'Create your free account', desc: 'Sign up in 30 seconds. No card needed.' },
              { n: '2', title: 'Add your services & hours', desc: 'Tell customers what you offer, how long it takes, and your schedule.' },
              { n: '3', title: 'Share your link', desc: 'Post /book/yourname anywhere. Customers book instantly.' },
            ].map(s => (
              <div key={s.n} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-5 shadow-card">
                <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-xl flex items-center justify-center text-xl font-bold shadow-primary">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{s.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700 to-primary-900" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.08),transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <img src={LOGO_WHITE_H} alt="BookAm" className="h-10 w-auto object-contain mx-auto mb-8 opacity-95" />
          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Ready to stop the DM chaos?
          </h2>
          <p className="text-primary-200 mt-4 text-lg">Create your free booking page today.</p>
          <p className="text-primary-300/70 mt-2 text-base font-medium tracking-wide">Book. Confirm. Be there.</p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/admin/register"
              className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-4 rounded-xl text-base hover:bg-gray-50 transition-all shadow-lg hover:-translate-y-px w-full sm:w-auto justify-center"
            >
              Create my free page
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path d="M13 7l5 5m0 0l-5 5m5-5H6"/></svg>
            </Link>
            <a
              href="/book/smoothcuts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 border border-white/30 text-white font-semibold px-8 py-4 rounded-xl text-base hover:bg-white/10 transition-all w-full sm:w-auto justify-center"
            >
              See live example
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-8 w-auto object-contain" />
            <p className="text-sm font-semibold text-primary-600 tracking-wide">Book. Confirm. Be there.</p>
            <Link to="/admin/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
              Sign in →
            </Link>
          </div>
          <div className="border-t border-gray-100 pt-6 text-center">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} BookAm · A{' '}
              <a href="https://www.ralphlawalgroup.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-500 hover:text-primary-600 transition-colors">Ralph Lawal Group</a> product
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
