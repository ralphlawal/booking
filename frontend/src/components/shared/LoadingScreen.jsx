import React from 'react';
import { CalendarCheck, CheckCircle2, Clock3 } from 'lucide-react';
import { LOGO_BLUE_H } from '../../config/logos';

export default function LoadingScreen({ message = 'Preparing your BookAm experience' }) {
  return (
    <main
      className="bookam-loader min-h-screen flex items-center justify-center px-6"
      style={{ background: 'var(--bam-bg)', color: 'var(--bam-text)' }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-sm text-center">
        <div className="relative mx-auto w-28 h-28 mb-8">
          <div
            className="absolute inset-0 rounded-[2rem] shadow-card"
            style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}
          />
          <div className="bookam-loader-ring absolute inset-2 rounded-[1.65rem]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="w-16 h-16 object-contain" />
          </div>
        </div>

        <h1 className="text-xl font-black tracking-tight" style={{ color: 'var(--bam-text)' }}>BookAm Business</h1>
        <p className="mt-2 text-sm" style={{ color: 'var(--bam-text-muted)' }}>{message}</p>

        <div className="mt-7 grid grid-cols-3 gap-2" aria-hidden="true">
          {[
            { icon: CalendarCheck, label: 'Book' },
            { icon: CheckCircle2,  label: 'Confirm' },
            { icon: Clock3,        label: 'Arrive' },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={item.label}
                className="bookam-loader-step rounded-2xl p-3"
                style={{
                  animationDelay: `${i * 140}ms`,
                  background: 'var(--bam-surface)',
                  border: '1px solid var(--bam-border)',
                }}
              >
                <Icon className="w-4 h-4 mx-auto text-primary-600" />
                <p className="mt-1.5 text-[11px] font-bold" style={{ color: 'var(--bam-text-muted)' }}>{item.label}</p>
              </div>
            );
          })}
        </div>

        <div
          className="mt-7 h-1.5 overflow-hidden rounded-full"
          style={{ background: 'var(--bam-surface-soft)' }}
          aria-hidden="true"
        >
          <div className="bookam-loader-bar h-full w-1/2 rounded-full bg-primary-600" />
        </div>
      </div>
      <span className="sr-only">Loading</span>
    </main>
  );
}
