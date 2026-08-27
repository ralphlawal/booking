import { Link } from 'react-router-dom';
import { ArrowRight, BriefcaseBusiness, CalendarDays, Sparkles } from 'lucide-react';
import { LOGO_WHITE_H } from '../../config/logos';

export default function NativeWelcome() {
  return (
    <main className="min-h-[100dvh] overflow-hidden bg-[#09081d] text-white flex flex-col" style={{ paddingTop: 'max(2rem, env(safe-area-inset-top, 0px))', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))', paddingLeft: 'max(1.5rem, env(safe-area-inset-left, 0px))', paddingRight: 'max(1.5rem, env(safe-area-inset-right, 0px))' }}>
      <div className="flex items-center justify-center pt-2">
        <img src={LOGO_WHITE_H} alt="BookAm" className="h-8 w-auto" />
      </div>

      <section className="flex-1 flex flex-col justify-center max-w-sm mx-auto w-full">
        <div className="relative w-48 h-48 mx-auto mb-9">
          <div className="absolute inset-0 rounded-[42%] bg-gradient-to-br from-violet-400 via-primary-500 to-fuchsia-500 blur-2xl opacity-45 animate-pulse" />
          <div className="relative w-full h-full rounded-[42%] bg-[radial-gradient(circle_at_28%_24%,#b89bff_0%,#7044ec_28%,#2b1769_62%,#100b2b_100%)] shadow-[0_24px_70px_rgba(112,68,236,0.48)] border border-white/25 flex items-center justify-center">
            <Sparkles className="w-16 h-16 text-white/90" strokeWidth={1.4} />
          </div>
        </div>
        <p className="text-primary-300 text-sm font-bold tracking-[0.18em] uppercase text-center">More than booking</p>
        <h1 className="mt-3 text-4xl sm:text-5xl text-center font-bold tracking-tight">Run smarter.<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-fuchsia-300">Book better.</span></h1>
        <p className="mt-4 text-center text-[15px] leading-6 text-white/60">Your bookings, customers, payments, and growth—together in BookAm.</p>
      </section>

      <section className="max-w-sm mx-auto w-full space-y-3">
        <Link to="/admin/login" className="min-h-14 rounded-2xl bg-gradient-to-r from-primary-500 to-violet-500 flex items-center px-4 shadow-[0_12px_32px_rgba(107,70,236,0.35)] active:scale-[0.98] transition-transform">
          <span className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center"><BriefcaseBusiness className="w-5 h-5" /></span>
          <span className="ml-3 flex-1"><span className="block font-bold">I run a business</span><span className="block text-xs text-white/65 mt-0.5">Manage your BookAm Business</span></span>
          <ArrowRight className="w-5 h-5" />
        </Link>
        <Link to="/customer/login" className="min-h-14 rounded-2xl bg-white/8 border border-white/12 flex items-center px-4 active:scale-[0.98] transition-transform">
          <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center"><CalendarDays className="w-5 h-5 text-violet-200" /></span>
          <span className="ml-3 flex-1"><span className="block font-bold">I’m booking an appointment</span><span className="block text-xs text-white/55 mt-0.5">Discover and book local businesses</span></span>
          <ArrowRight className="w-5 h-5 text-white/70" />
        </Link>
        <p className="pt-3 text-center text-xs leading-5 text-white/40">By continuing, you agree to BookAm’s Terms and Privacy Policy.</p>
      </section>
    </main>
  );
}
