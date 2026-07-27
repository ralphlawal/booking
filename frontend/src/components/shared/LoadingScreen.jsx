import React from 'react';
import { CalendarCheck, CheckCircle2, Clock3 } from 'lucide-react';
import { LOGO_BLUE_H } from '../../config/logos';

export default function LoadingScreen({ message = 'Preparing your BookAm experience' }) {
  return (
    <main
      className="bookam-loader min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white flex items-center justify-center px-6"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto w-28 h-28 mb-8">
          <div className="absolute inset-0 rounded-[2rem] border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 shadow-card" />
          <div className="bookam-loader-ring absolute inset-2 rounded-[1.65rem]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="w-16 h-16 object-contain dark:brightness-0 dark:invert" />
          </div>
        </div>

        <h1 className="text-xl font-black tracking-tight">BookAm Business</h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">{message}</p>

        <div className="mt-7 grid grid-cols-3 gap-2" aria-hidden="true">
          {[
            { icon: CalendarCheck, label: 'Book' },
            { icon: CheckCircle2, label: 'Confirm' },
            { icon: Clock3, label: 'Arrive' },
          ].map((item, index) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className="bookam-loader-step rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 p-3" style={{ animationDelay: `${index * 140}ms` }}>
                <Icon className="w-4 h-4 mx-auto text-primary-600 dark:text-primary-300" />
                <p className="mt-1.5 text-[11px] font-bold text-gray-500 dark:text-gray-400">{item.label}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-7 h-1.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800" aria-hidden="true">
          <div className="bookam-loader-bar h-full w-1/2 rounded-full bg-primary-600 dark:bg-primary-400" />
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </main>
  );
}
