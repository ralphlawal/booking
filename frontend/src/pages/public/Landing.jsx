import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    emoji: '💬',
    title: 'No more WhatsApp chaos',
    desc: 'Stop juggling bookings in DMs. Customers self-book in 60 seconds — you just show up.',
    color: 'bg-violet-50 border-violet-100',
    iconBg: 'bg-violet-100 text-violet-600',
  },
  {
    emoji: '🔗',
    title: 'Your own booking link',
    desc: 'Get a clean page at bookly.app/book/yourbusiness. Share it on Instagram, WhatsApp, or Google.',
    color: 'bg-blue-50 border-blue-100',
    iconBg: 'bg-blue-100 text-blue-600',
  },
  {
    emoji: '⏰',
    title: 'Bookings while you sleep',
    desc: '24/7 online booking with instant email confirmations. Never miss an appointment again.',
    color: 'bg-emerald-50 border-emerald-100',
    iconBg: 'bg-emerald-100 text-emerald-600',
  },
  {
    emoji: '📊',
    title: 'Your business at a glance',
    desc: 'Dashboard with upcoming bookings, customer history, and revenue — all in one place.',
    color: 'bg-amber-50 border-amber-100',
    iconBg: 'bg-amber-100 text-amber-600',
  },
  {
    emoji: '📅',
    title: 'Flexible availability',
    desc: 'Set your working hours, block days off, and manage slot intervals exactly how you want.',
    color: 'bg-pink-50 border-pink-100',
    iconBg: 'bg-pink-100 text-pink-600',
  },
  {
    emoji: '📱',
    title: 'Works on every device',
    desc: 'Your customers book from their phones. Your dashboard works anywhere you are.',
    color: 'bg-indigo-50 border-indigo-100',
    iconBg: 'bg-indigo-100 text-indigo-600',
  },
];

const STEPS = [
  { n: '1', title: 'Create your account', desc: 'Sign up free in 30 seconds. No credit card required.' },
  { n: '2', title: 'Set up your page', desc: 'Add your services, set your hours, and choose your unique link.' },
  { n: '3', title: 'Share & get booked', desc: 'Post your link anywhere. Customers book instantly, you get notified.' },
];

const TYPES = [
  'Barbers', 'Hair Stylists', 'Nail Techs', 'Makeup Artists', 'Lash Techs',
  'Massage Therapists', 'Personal Trainers', 'Yoga Instructors', 'Photographers',
  'Tutors', 'Music Teachers', 'Consultants', 'Estheticians', 'Tattoo Artists',
  'Cleaning Services', 'Therapists', 'And more…'
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white overflow-hidden">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-primary">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg tracking-tight">Bookly</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2">
              Sign in
            </Link>
            <Link to="/admin/register" className="btn-primary text-sm">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/60 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-primary-200 text-primary-700 text-xs font-semibold px-4 py-2 rounded-full mb-8 shadow-sm">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            Free to get started — no credit card needed
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.08] tracking-tight max-w-4xl mx-auto">
            Your own booking page
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-400">
              in 2 minutes
            </span>
          </h1>

          <p className="mt-7 text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Built for every service business — barbers, trainers, tutors, photographers and more.
            Stop managing appointments over WhatsApp. Let customers book themselves, 24/7.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/admin/register" className="btn-primary px-8 py-3.5 text-base w-full sm:w-auto">
              Create my free booking page
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="/book/smoothcuts"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary px-8 py-3.5 text-base w-full sm:w-auto"
            >
              See live example
            </a>
          </div>

          {/* Mockup */}
          <div className="mt-16 relative max-w-2xl mx-auto">
            <div className="absolute inset-0 bg-gradient-to-br from-primary-300/20 to-purple-300/20 rounded-3xl blur-2xl scale-105" />
            <div className="relative bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-800">
              <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800/80 backdrop-blur">
                <div className="w-3 h-3 rounded-full bg-red-500" />
                <div className="w-3 h-3 rounded-full bg-yellow-500" />
                <div className="w-3 h-3 rounded-full bg-green-500" />
                <div className="flex-1 ml-3 bg-gray-700/80 rounded-md px-3 py-1.5 text-xs text-gray-400 text-left">
                  bookly.app/book/smoothcuts
                </div>
              </div>
              <div className="bg-gradient-to-br from-primary-50/80 to-white p-6 text-left">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-primary">S</div>
                  <div>
                    <p className="font-bold text-gray-900">Smooth Cuts Barbershop</p>
                    <p className="text-xs text-gray-500">📍 123 Main St, New York</p>
                  </div>
                </div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Choose a service</p>
                <div className="space-y-2">
                  {[
                    { name: 'Classic Haircut', time: '30 min', price: '$30' },
                    { name: 'Beard Trim', time: '20 min', price: '$20' },
                    { name: 'Full Grooming Package', time: '75 min', price: '$65' },
                  ].map((s, i) => (
                    <div key={s.name} className={`rounded-xl px-4 py-3 flex items-center justify-between border transition-all ${i === 0 ? 'bg-primary-50 border-primary-200 ring-1 ring-primary-400' : 'bg-white border-gray-100'}`}>
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.time}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-gray-900">{s.price}</span>
                        <div className={`text-xs px-3 py-1.5 rounded-lg font-semibold ${i === 0 ? 'bg-primary-600 text-white shadow-primary' : 'bg-gray-100 text-gray-600'}`}>
                          {i === 0 ? 'Selected' : 'Book'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Who it's for */}
      <section className="py-14 border-y border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6">Works for every service business</p>
          <div className="flex flex-wrap justify-center gap-2.5">
            {TYPES.map(c => (
              <span key={c} className={`text-sm font-medium px-4 py-2 rounded-full border transition-colors ${c === 'And more…' ? 'text-primary-600 border-primary-200 bg-primary-50' : 'text-gray-700 border-gray-200 bg-white hover:border-primary-200 hover:bg-primary-50 hover:text-primary-700'}`}>
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
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Everything you need to run bookings</h2>
            <p className="text-gray-500 mt-3 text-lg max-w-xl mx-auto">No complicated setup. No monthly fees to start. Just your link, your services, your schedule.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(f => (
              <div key={f.title} className={`rounded-2xl p-6 border ${f.color}`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl mb-4 ${f.iconBg}`}>
                  {f.emoji}
                </div>
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
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">Up and running in minutes</h2>
            <p className="text-gray-500 mt-3 text-lg">Seriously — your first booking can come in today.</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {STEPS.map((s, i) => (
              <div key={s.n} className="bg-white rounded-2xl border border-gray-100 p-6 flex items-start gap-5 shadow-card">
                <div className="w-12 h-12 flex-shrink-0 bg-gradient-to-br from-primary-500 to-primary-700 text-white rounded-xl flex items-center justify-center text-xl font-bold shadow-primary">
                  {s.n}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg">{s.title}</h3>
                  <p className="text-gray-500 mt-1">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-600 to-primary-800" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.1),transparent)]" />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white leading-tight">
            Ready to get your first online booking?
          </h2>
          <p className="text-primary-200 mt-4 text-lg">
            Join thousands of service businesses already using Bookly. Free to start.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/admin/register"
              className="inline-flex items-center gap-2 bg-white text-primary-700 font-bold px-8 py-4 rounded-xl text-base hover:bg-gray-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-px w-full sm:w-auto justify-center"
            >
              Create my free page
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
            <a
              href="/book/smoothcuts"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white font-semibold px-8 py-4 rounded-xl text-base hover:bg-white/20 transition-all w-full sm:w-auto justify-center"
            >
              See it live first
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">Bookly</span>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Bookly. Built for service professionals.</p>
          <Link to="/admin/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
            Sign in →
          </Link>
        </div>
      </footer>
    </div>
  );
}
