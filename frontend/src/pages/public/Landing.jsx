import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'No more WhatsApp chaos',
    desc: 'Stop managing bookings through text messages. Customers book themselves — you just show up.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
      </svg>
    ),
    title: 'Your own booking link',
    desc: 'Get a clean page at /book/yourbusiness — share it on Instagram, WhatsApp, or your website.',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Bookings while you sleep',
    desc: 'Customers can book any time, 24/7. You get email confirmations. No missed appointments.',
  },
];

const STEPS = [
  { n: '1', title: 'Sign up free', desc: 'Create your account in 30 seconds. No credit card needed.' },
  { n: '2', title: 'Add your services', desc: 'Tell customers what you offer, how long it takes, and the price.' },
  { n: '3', title: 'Share your link', desc: 'Post /book/yourname anywhere. Customers book instantly.' },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-lg">Bookly</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/admin/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              Sign in
            </Link>
            <Link to="/admin/register" className="btn-primary text-sm">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 text-primary-700 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
          <span className="w-1.5 h-1.5 bg-primary-500 rounded-full" />
          Free to get started — no credit card
        </div>
        <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 leading-tight tracking-tight max-w-3xl mx-auto">
          Your own booking page{' '}
          <span className="text-primary-600">in 2 minutes</span>
        </h1>
        <p className="mt-6 text-xl text-gray-500 max-w-xl mx-auto leading-relaxed">
          Stop managing appointments over WhatsApp. Let customers book themselves — you just show up and get paid.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link to="/admin/register" className="btn-primary px-8 py-3 text-base w-full sm:w-auto">
            Create my booking page
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
          <a
            href="/book/smoothcuts"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary px-8 py-3 text-base w-full sm:w-auto"
          >
            See live demo
          </a>
        </div>

        {/* Mock browser preview */}
        <div className="mt-16 max-w-2xl mx-auto">
          <div className="bg-gray-900 rounded-2xl overflow-hidden shadow-2xl">
            <div className="flex items-center gap-1.5 px-4 py-3 bg-gray-800">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="flex-1 ml-3 bg-gray-700 rounded-md px-3 py-1 text-xs text-gray-400">
                bookly.app/book/smoothcuts
              </div>
            </div>
            <div className="bg-gradient-to-br from-primary-50 to-white p-6 text-left">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-primary-600 rounded-xl flex items-center justify-center text-white font-bold text-lg">S</div>
                <div>
                  <p className="font-bold text-gray-900">Smooth Cuts Barbershop</p>
                  <p className="text-xs text-gray-500">123 Main St, New York</p>
                </div>
              </div>
              <div className="space-y-2">
                {[
                  { name: 'Classic Haircut', time: '30 min', price: '$30' },
                  { name: 'Beard Trim', time: '20 min', price: '$20' },
                  { name: 'Full Grooming Package', time: '75 min', price: '$65' },
                ].map(s => (
                  <div key={s.name} className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-gray-100">
                    <div>
                      <p className="font-medium text-sm text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.time}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-gray-900">{s.price}</span>
                      <div className="bg-primary-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium">Book</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-gray-50 py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Everything you need, nothing you don't</h2>
            <p className="text-gray-500 mt-3">Built for solo service providers and small teams.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
                <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center mb-4">
                  {f.icon}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900">Up and running in minutes</h2>
            <p className="text-gray-500 mt-3">No technical setup. No complicated tools.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {STEPS.map((s, i) => (
              <div key={s.n} className="text-center">
                <div className="w-14 h-14 bg-primary-600 text-white rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4 shadow-lg shadow-primary-200">
                  {s.n}
                </div>
                {i < STEPS.length - 1 && (
                  <div className="hidden sm:block absolute translate-x-32 -translate-y-8">
                  </div>
                )}
                <h3 className="font-semibold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-widest mb-6">Perfect for</p>
          <div className="flex flex-wrap justify-center gap-3">
            {['Barbers', 'Hair Stylists', 'Nail Techs', 'Makeup Artists', 'Photographers', 'Personal Trainers', 'Massage Therapists', 'Tutors', 'Consultants'].map(c => (
              <span key={c} className="bg-white border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2 rounded-full shadow-sm">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl font-bold text-gray-900">Ready to stop the WhatsApp chaos?</h2>
          <p className="text-gray-500 mt-4 text-lg">Create your free booking page today. Takes 2 minutes.</p>
          <Link to="/admin/register" className="btn-primary px-10 py-3.5 text-base mt-8 inline-flex">
            Get started for free
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-primary-600 rounded-md flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>
            </div>
            <span className="font-bold text-gray-900">Bookly</span>
          </div>
          <p className="text-sm text-gray-400">© {new Date().getFullYear()} Bookly. All rights reserved.</p>
          <Link to="/admin/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
