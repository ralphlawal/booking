import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Sparkles, ChevronRight, Check, Navigation, CalendarCheck, MessageSquare, Shield } from 'lucide-react';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import toast from 'react-hot-toast';

const CATEGORIES = [
  { id: 'barber', label: 'Barber', emoji: '✂️' },
  { id: 'beauty', label: 'Beauty', emoji: '💄' },
  { id: 'nails', label: 'Nails', emoji: '💅' },
  { id: 'fitness', label: 'Fitness', emoji: '🏋️' },
  { id: 'massage', label: 'Massage', emoji: '🧘' },
  { id: 'health', label: 'Health', emoji: '🏥' },
  { id: 'hair', label: 'Hair', emoji: '💇' },
  { id: 'tattoo', label: 'Tattoo', emoji: '🎨' },
  { id: 'photography', label: 'Photography', emoji: '📷' },
  { id: 'cleaning', label: 'Cleaning', emoji: '🧹' },
  { id: 'personal_training', label: 'Personal Training', emoji: '🏃' },
  { id: 'therapy', label: 'Therapy', emoji: '🧠' },
];

export default function ConsumerOnboarding() {
  const { consumer, update } = useCustomerAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 0: Location
  const [locationText, setLocationText] = useState('');
  const [coords, setCoords] = useState(null);
  const [detectingLocation, setDetectingLocation] = useState(false);

  // Step 1: Preferences
  const [selected, setSelected] = useState([]);

  const detectLocation = () => {
    if (!navigator.geolocation) return toast.error('Location not supported on this device — please type your city or postcode');
    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ latitude, longitude });
        try {
          const resp = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await resp.json();
          const city = data.address?.city || data.address?.town || data.address?.village || data.address?.county || '';
          const postcode = data.address?.postcode || '';
          const text = [city, postcode].filter(Boolean).join(', ');
          setLocationText(text || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } catch {
          setLocationText(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setDetectingLocation(false);
      },
      (err) => {
        setDetectingLocation(false);
        if (err.code === 1) {
          toast.error('Location access denied — please type your city or postcode below');
        } else if (err.code === 3) {
          toast.error('Location timed out — please type your city or postcode below');
        } else {
          toast.error('Could not detect location — please type your city or postcode below');
        }
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    );
  };

  const toggleCategory = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]);
  };

  const saveAndFinish = async () => {
    setSaving(true);
    try {
      const payload = {
        onboarding_complete: true,
        service_preferences: selected,
      };
      if (locationText) payload.location_text = locationText;
      if (coords) { payload.latitude = coords.latitude; payload.longitude = coords.longitude; }
      await update(payload);
      navigate('/customer/dashboard');
    } catch {
      toast.error('Could not save — you can update this in your profile later');
      navigate('/customer/dashboard');
    } finally {
      setSaving(false);
    }
  };

  const skipAll = async () => {
    setSaving(true);
    try { await update({ onboarding_complete: true }); } catch {}
    setSaving(false);
    navigate('/customer/dashboard');
  };

  const STEPS = [
    {
      icon: <MapPin className="w-8 h-8 text-primary-500" />,
      title: `Welcome, ${consumer?.full_name?.split(' ')[0] || 'there'}.`,
      subtitle: 'Tell us where you\'re based so we can show you nearby services',
      content: (
        <div className="space-y-4">
          <div>
            <label className="label">Your city or postcode</label>
            <div className="relative">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                className="input pl-10"
                placeholder="e.g. Manchester, M1 1AE"
                value={locationText}
                onChange={e => setLocationText(e.target.value)}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={detectLocation}
            disabled={detectingLocation}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-primary-300 dark:border-primary-700 text-primary-600 dark:text-primary-400 font-semibold text-sm hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors disabled:opacity-50"
          >
            {detectingLocation ? (
              <><div className="w-4 h-4 border-2 border-primary-400 border-t-transparent rounded-full animate-spin" /> Detecting…</>
            ) : (
              <><Navigation className="w-4 h-4" /> Use my current location</>
            )}
          </button>
          {coords && locationText && (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl px-4 py-2.5">
              <Check className="w-4 h-4 flex-shrink-0" />
              Location detected: <strong className="ml-1">{locationText}</strong>
            </div>
          )}
        </div>
      ),
      canContinue: true,
    },
    {
      icon: <Sparkles className="w-8 h-8 text-indigo-500" />,
      title: 'What services interest you?',
      subtitle: 'We\'ll personalise your recommendations — select all that apply',
      content: (
        <div className="grid grid-cols-3 gap-2.5">
          {CATEGORIES.map(cat => {
            const isSelected = selected.includes(cat.id);
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => toggleCategory(cat.id)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all duration-150 text-center ${
                  isSelected
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 shadow-md shadow-primary-100'
                    : 'border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300'
                }`}
              >
                <span className="text-xl">{cat.emoji}</span>
                <span className={`text-[11px] font-bold leading-tight ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-400'}`}>
                  {cat.label}
                </span>
                {isSelected && <Check className="w-3 h-3 text-primary-500" />}
              </button>
            );
          })}
        </div>
      ),
      canContinue: true,
    },
    {
      icon: <CalendarCheck className="w-8 h-8 text-emerald-500" />,
      title: 'You\'re all set.',
      subtitle: 'Here\'s what you can do with BookAm right now',
      content: (
        <div className="space-y-3">
          {[
            { icon: <CalendarCheck className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />, title: 'Book services near you', desc: 'Browse and book barbers, stylists, trainers and more — instantly.' },
            { icon: <MessageSquare className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />, title: 'Message businesses directly', desc: 'Chat with businesses before and after your appointment.' },
            { icon: <Shield className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" />, title: 'BookAm Buyer Protection', desc: 'Your payment is held securely. Raise a dispute within 14 days if anything goes wrong.' },
          ].map(item => (
            <div key={item.title} className="flex gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl">
              {item.icon}
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{item.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{item.desc}</p>
              </div>
            </div>
          ))}
          <div className="mt-1 p-3 bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 rounded-xl">
            <p className="text-xs font-semibold text-primary-800 dark:text-primary-200">Early Access</p>
            <p className="text-xs text-primary-600 dark:text-primary-400 mt-0.5">
              BookAm is in active development. We are building new features every week — payments, reviews, loyalty rewards, and more. Thank you for being part of this journey.
            </p>
          </div>
        </div>
      ),
      canContinue: true,
    },
  ];

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-700 to-primary-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-6">
          <img src={LOGO_BLUE_H} alt="BookAm" className="h-8 mx-auto brightness-0 invert" />
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? 'w-6 bg-white' : i < step ? 'w-3 bg-white/60' : 'w-3 bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl p-6">
          {/* Icon + heading */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-primary-50 dark:bg-primary-900/40 flex items-center justify-center mx-auto mb-4">
              {current.icon}
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">{current.title}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{current.subtitle}</p>
          </div>

          {current.content}

          {/* Buttons */}
          <div className="mt-6 flex flex-col gap-2">
            <button
              onClick={isLast ? saveAndFinish : () => setStep(s => s + 1)}
              disabled={saving}
              className="btn-primary w-full py-3 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isLast ? (
                <><Check className="w-4 h-4" /> Get started</>
              ) : (
                <>Continue <ChevronRight className="w-4 h-4" /></>
              )}
            </button>
            {!isLast && (
              <button
                onClick={step === 0 ? () => setStep(1) : saveAndFinish}
                disabled={saving}
                className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-center py-2 transition-colors"
              >
                Skip this step
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-primary-200 mt-4">
          Step {step + 1} of {STEPS.length} · You can update these in your profile anytime
        </p>
      </div>
    </div>
  );
}
