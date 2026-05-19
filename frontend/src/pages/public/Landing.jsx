import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ChevronDown, MessageSquare, Link2, Clock, BarChart2,
  CalendarDays, Smartphone, MapPin, Search, Zap, Shield,
  RefreshCw, ArrowRight,
} from 'lucide-react';
import { LOGO_BLUE_H, LOGO_WHITE_H } from '../../config/logos';

const FAQS = [
  {
    q: 'Is BookAm really free?',
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
    q: 'What is the AI booking chat?',
    a: 'The AI booking assistant lets customers describe what they want in plain English (e.g. "I need a haircut on Friday afternoon") and handles the back-and-forth automatically. It collects all the details and creates the booking — like having a receptionist available 24/7.',
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
    <div className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <img src={LOGO_BLUE_H} alt="BookAm" className="h-8 sm:h-9 w-auto object-contain" />
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/explore" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-2 sm:px-3 py-2">
              <span className="hidden sm:inline">Find services</span>
              <span className="sm:hidden">Explore</span>
            </Link>
            <Link to="/admin/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-3 py-2 hidden sm:block">
              Business sign in
            </Link>
            <Link to="/admin/register" className="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-2">
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-50/80 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-primary-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 sm:pb-24 text-center">
          <div className="inline-flex items-center gap-2 bg-white border border-primary-200 text-primary-700 text-xs font-semibold px-4 py-2 rounded-full mb-6 sm:mb-8 shadow-sm">
            <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
            Free to start — no credit card needed
          </div>

          <h1 className="text-3xl sm:text-6xl lg:text-7xl font-bold text-gray-900 leading-[1.07] tracking-tight max-w-4xl mx-auto">
            Your booking page,
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-primary-600 via-primary-500 to-indigo-400">
              live in minutes
            </span>
          </h1>

          <p className="mt-5 sm:mt-7 text-base sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed px-2">
            Built for every service business. Let customers book themselves 24/7 — you get notified instantly and just show up.
          </p>

          <p className="mt-3 sm:mt-4 text-sm sm:text-base font-semibold text-primary-600 tracking-wide">
            Book. Confirm. Be there.
          </p>

          <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
            <Link to="/admin/register" className="btn-primary px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base flex items-center justify-center gap-2">
              Create my booking page
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link to="/explore" className="btn-secondary px-6 sm:px-8 py-3 sm:py-3.5 text-sm sm:text-base flex items-center justify-center">
              Browse services
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
          <img src={LOGO_WHITE_H} alt="BookAm" className="h-8 sm:h-10 w-auto object-contain mx-auto mb-6 sm:mb-8 opacity-95" />
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
      <footer className="border-t border-gray-100 py-8 sm:py-10 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-5 sm:mb-6">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-7 sm:h-8 w-auto object-contain" />
            <p className="text-sm font-semibold text-primary-600 tracking-wide">Book. Confirm. Be there.</p>
            <div className="flex items-center gap-4">
              <Link to="/booking/lookup" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
                Find my booking
              </Link>
              <Link to="/admin/login" className="text-sm text-gray-500 hover:text-gray-900 transition-colors font-medium">
                Sign in →
              </Link>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-5 sm:pt-6 text-center">
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
