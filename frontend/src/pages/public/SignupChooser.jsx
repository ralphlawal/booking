import React from 'react';
import { Link } from 'react-router-dom';
import { LOGO_BLUE_H } from '../../config/logos';

export default function SignupChooser() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-700 via-primary-900 to-slate-950 flex flex-col items-center justify-center p-4">
      <Link to="/" className="mb-10">
        <img src={LOGO_BLUE_H} alt="BookAm" className="h-9 w-auto brightness-0 invert" />
      </Link>

      <div className="w-full max-w-2xl animate-slide-up text-center">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-3">Join BookAm</h1>
        <p className="text-primary-200 text-sm mb-8">Choose how you want to use BookAm</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Business Owner */}
          <Link
            to="/admin/register"
            className="group flex flex-col items-center text-center bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/40 rounded-lg p-6 transition-all duration-200 shadow-2xl shadow-black/10"
          >
            <div className="w-16 h-16 rounded-lg bg-primary-500 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform shadow-primary">
              <BusinessIcon />
            </div>
            <p className="text-white font-bold text-lg mb-1">Business Owner</p>
            <p className="text-primary-200 text-xs leading-relaxed">
              Create your booking page, manage appointments, and grow your business
            </p>
            <span className="mt-4 text-xs font-semibold bg-white/10 text-white px-3 py-1.5 rounded-full">
              Free to start →
            </span>
          </Link>

          {/* Customer */}
          <Link
            to="/customer/signup"
            className="group flex flex-col items-center text-center bg-white/10 hover:bg-white/15 border border-white/20 hover:border-white/40 rounded-lg p-6 transition-all duration-200 shadow-2xl shadow-black/10"
          >
            <div className="w-16 h-16 rounded-lg bg-white text-primary-700 flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
              <CustomerIcon />
            </div>
            <p className="text-white font-bold text-lg mb-1">Customer</p>
            <p className="text-primary-200 text-xs leading-relaxed">
              Book services, track your appointments, and manage everything in one place
            </p>
            <span className="mt-4 text-xs font-semibold bg-white/10 text-white px-3 py-1.5 rounded-full">
              Sign up free →
            </span>
          </Link>
        </div>

        <div className="mt-8 space-y-2">
          <p className="text-white/50 text-xs">Already have an account?</p>
          <div className="flex items-center justify-center gap-4">
            <Link to="/admin/login" className="text-sm font-semibold text-primary-300 hover:text-white transition-colors">
              Business sign in
            </Link>
            <span className="text-white/20">·</span>
            <Link to="/customer/login" className="text-sm font-semibold text-primary-300 hover:text-white transition-colors">
              Customer sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function BusinessIcon() {
  return (
    <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function CustomerIcon() {
  return (
    <svg className="w-8 h-8 text-primary-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  );
}
