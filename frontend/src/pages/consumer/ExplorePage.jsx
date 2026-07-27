import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import {
  MapPin, Star, Search, Navigation, Zap, User, ChevronRight,
  Building2, AlertTriangle, List, Map, BadgeCheck, Rss,
  SlidersHorizontal, X, Calendar, Clock, Car, Home, ChevronDown,
} from 'lucide-react';
import { discoverAPI } from '../../services/api';
import { LOGO_BLUE_H } from '../../config/logos';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import toast from 'react-hot-toast';

const POPULAR_SERVICES = ['Nails', 'Lash Extensions', 'Makeup', 'Hair Styling', 'Eyebrows', 'Waxing', 'Facials', 'Spray Tan'];

const CATEGORY_VISUALS = {
  hair: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=240&q=70',
  barber: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=240&q=70',
  barbers: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=240&q=70',
  nails: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&w=240&q=70',
  beauty: 'https://images.unsplash.com/photo-1512496015851-a90fb38ba796?auto=format&fit=crop&w=240&q=70',
  fitness: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=240&q=70',
  cleaning: 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=240&q=70',
};

function categoryImage(label) {
  const key = String(label || '').toLowerCase();
  return CATEGORY_VISUALS[key] || CATEGORY_VISUALS[key.split(' ')[0]] || null;
}

function BusinessCard({ biz, from }) {
  const verified = !!biz.is_verified || biz.verification_status === 'verified';
  const rating = parseFloat(biz.avg_rating) || 0;
  return (
    <Link
      to={`/profile/${biz.slug}`}
      state={{ from }}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-200 flex flex-col border border-gray-100"
    >
      {/* Image */}
      <div className="h-44 bg-gray-100 relative overflow-hidden">
        {biz.logo_url ? (
          <img src={biz.logo_url} alt={biz.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
            <span className="text-5xl font-black text-primary-300">{(biz.name || '?')[0]}</span>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/60 to-transparent" />
        {biz.distance_km !== null && biz.distance_km !== undefined && (
          <span className="absolute top-3 right-3 bg-white/95 text-xs font-bold px-2 py-1 rounded-full text-gray-700 flex items-center gap-1 shadow-sm">
            <MapPin className="w-3 h-3" />{biz.distance_km} km
          </span>
        )}
        {biz.offers_mobile && (
          <span className="absolute top-3 left-3 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
            <Car className="w-3 h-3" /> Mobile
          </span>
        )}
        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
          <div>
            <h3 className="font-bold text-white text-sm leading-tight flex items-center gap-1 drop-shadow">
              {biz.name}
              {verified && <BadgeCheck className="w-4 h-4 text-blue-300 flex-shrink-0" />}
            </h3>
            {biz.category && (
              <span className="text-white/80 text-xs font-medium">{biz.category}</span>
            )}
          </div>
          <div className="flex items-center gap-1 bg-black/60 text-white text-xs font-bold px-2 py-1 rounded-lg">
            <Star className={`w-3.5 h-3.5 ${rating > 0 ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}`} />
            {rating > 0 ? rating.toFixed(1) : 'New'}
            {biz.review_count > 0 && <span className="text-white/60 font-normal">({biz.review_count})</span>}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        {biz.location && (
          <p className="text-xs text-gray-400 flex items-center gap-1 truncate">
            <MapPin className="w-3 h-3 flex-shrink-0 text-gray-300" />{biz.location}
          </p>
        )}
        {biz.description && (
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">{biz.description}</p>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          {biz.min_price != null ? (
            <span className="text-sm font-bold text-gray-800">From £{parseFloat(biz.min_price).toFixed(0)}</span>
          ) : <span />}
          <span className="inline-flex items-center gap-1 text-xs bg-primary-600 hover:bg-primary-500 text-white px-3 py-1.5 rounded-xl font-semibold transition-colors flex-shrink-0">
            Book <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function MapView({ results, coords, onSwitchList, from }) {
  const withCoords = results.filter(b => b.latitude && b.longitude);
  if (!withCoords.length) {
    return (
      <div className="text-center py-14 text-gray-400">
        <Map className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No businesses with location data to show on map</p>
        <button onClick={onSwitchList} className="btn-primary mt-3 text-sm">Switch to list</button>
      </div>
    );
  }
  const centerLat = coords?.lat ?? withCoords[0].latitude;
  const centerLng = coords?.lng ?? withCoords[0].longitude;
  const delta = 0.06;
  const bbox = `${centerLng - delta},${centerLat - delta},${centerLng + delta},${centerLat + delta}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;
  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm" style={{ height: 'min(55vh, 520px)', minHeight: 300 }}>
        <iframe title="Business map" src={src} style={{ width: '100%', height: '100%', border: 0 }} loading="lazy" allowFullScreen />
      </div>
      <div className="grid grid-cols-1 min-[430px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
        {withCoords.map(biz => <BusinessCard key={biz.id} biz={biz} from={from} />)}
      </div>
      {results.length > withCoords.length && (
        <p className="text-xs text-gray-400 text-center">
          {results.length - withCoords.length} result{results.length - withCoords.length !== 1 ? 's' : ''} without location shown only in list view
        </p>
      )}
    </div>
  );
}

// ── Filter pill helper ────────────────────────────────────────────────────────
function FilterPill({ label, active, onClear, children }) {
  return (
    <div className={`flex items-center gap-1.5 text-sm px-3 py-2 rounded-xl border font-medium cursor-pointer transition-all select-none
      ${active ? 'bg-primary-600 text-white border-primary-600' : 'bg-white text-gray-700 border-gray-200 hover:border-primary-300'}`}>
      {children}
      {active && onClear && (
        <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="ml-0.5 hover:opacity-70 transition-opacity">
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [showFilters, setShowFilters] = useState(false);
  const { consumer } = useCustomerAuth();

  // Filters
  const [filterDate, setFilterDate] = useState('');
  const [filterTime, setFilterTime] = useState('');
  const [filterDistance, setFilterDistance] = useState('');
  const [filterMobile, setFilterMobile] = useState(null); // null | 'mobile' | 'premises'

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';

  const activeFilterCount = [filterDate, filterTime, filterDistance, filterMobile].filter(Boolean).length;

  const doSearch = useCallback(async (overrides = {}) => {
    setLoading(true);
    setSearchError(false);
    try {
      const params = {
        q: overrides.q ?? q,
        category: overrides.category ?? category,
        lat: coords?.lat,
        lng: coords?.lng,
        date: filterDate || undefined,
        time: filterTime || undefined,
        max_km: filterDistance || undefined,
        mobile: filterMobile === 'mobile' ? true : filterMobile === 'premises' ? false : undefined,
      };
      if (params.category === 'all') delete params.category;
      const data = await discoverAPI.search(params);
      setResults(data);
    } catch {
      setSearchError(true);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [q, category, coords, filterDate, filterTime, filterDistance, filterMobile]);

  useEffect(() => {
    discoverAPI.categories().then(setCategories).catch(() => {});
  }, []);

  useEffect(() => {
    if (consumer?.latitude && consumer?.longitude && !coords) {
      setCoords({ lat: consumer.latitude, lng: consumer.longitude });
    }
  }, [consumer]);

  useEffect(() => { doSearch(); }, [category, coords, filterDate, filterTime, filterDistance, filterMobile]);

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch();
  };

  const getLocation = () => {
    if (!navigator.geolocation) { toast.error('Location not supported in this browser'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setLocating(false); },
      (err) => {
        setLocating(false);
        if (err.code === 1) toast.error('Location access denied');
        else toast.error('Could not get your location');
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    );
  };

  const topCategories = [
    { label: 'All', value: 'all' },
    ...categories.slice(0, 8).map(c => ({ label: c.category, value: c.category })),
  ];

  const clearAllFilters = () => {
    setFilterDate('');
    setFilterTime('');
    setFilterDistance('');
    setFilterMobile(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 animate-fade-in">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 min-h-14 py-2 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-7 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/feed" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-primary-600 transition-colors">
              <Rss className="w-4 h-4" /> Feed
            </Link>
            <Link to="/match" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-primary-600">
              <Zap className="w-4 h-4" /> Smart Match
            </Link>
            {consumer ? (
              <Link to="/customer/dashboard" className="btn-primary text-xs sm:text-sm py-1.5 flex items-center gap-1.5 whitespace-nowrap">
                <User className="w-3.5 h-3.5" /> My Bookings
              </Link>
            ) : (
              <Link to="/customer/login" className="btn-primary text-xs sm:text-sm py-1.5 whitespace-nowrap">Sign in</Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero search */}
      <div className="bg-gradient-to-br from-primary-950 via-primary-900 to-slate-950 px-3 sm:px-6 py-8 sm:py-12">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-2xl sm:text-4xl font-black text-white mb-1.5 tracking-tight">Find beauty treatments near you</h1>
          <p className="text-white/60 text-sm sm:text-base mb-6">Book nails, lashes, makeup, facials and more instantly</p>
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2 bg-white/10 backdrop-blur-sm p-2 rounded-2xl border border-white/20">
            <div className="flex-1 flex items-center gap-2 bg-white rounded-xl px-4 py-3">
              <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
              <input
                className="flex-1 bg-transparent text-gray-900 placeholder:text-gray-400 text-sm font-medium outline-none"
                placeholder="Search for treatments..."
                value={q}
                onChange={e => setSearchParams(p => { const n = new URLSearchParams(p); n.set('q', e.target.value); return n; })}
              />
            </div>
            <button
              type="button" onClick={getLocation} disabled={locating}
              className="sm:w-auto bg-white/10 hover:bg-white/20 text-white font-semibold px-4 py-3 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              <Navigation className={`w-4 h-4 ${locating ? 'animate-pulse text-primary-300' : ''}`} />
              {locating ? 'Locating…' : 'Near me'}
            </button>
            <button type="submit" className="bg-primary-600 hover:bg-primary-500 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors shadow-lg shadow-primary-600/30">
              Search
            </button>
          </form>
          {coords && <p className="text-primary-300 text-xs mt-3">Location found — sorted by distance</p>}
        </div>

        {/* Category circles */}
        <div className="max-w-6xl mx-auto mt-8 overflow-x-auto scrollbar-hide">
          <div className="flex items-start gap-4 min-w-max mx-auto justify-center px-1 pb-1">
            {topCategories.slice(0, 9).map(c => {
              const image = categoryImage(c.label);
              return (
                <button key={c.value}
                  onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('category', c.value); return n; })}
                  className="group flex-shrink-0 flex flex-col items-center gap-2 w-16 sm:w-20">
                  <span className={`w-14 h-14 sm:w-18 sm:h-18 rounded-2xl overflow-hidden flex items-center justify-center border-2 transition-all ${
                    category === c.value ? 'border-primary-400 scale-105 ring-2 ring-primary-400/30' : 'border-white/10 group-hover:border-white/40'}`}>
                    {image ? (
                      <img src={image} alt={c.label} className="w-14 h-14 sm:w-full sm:h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="w-full h-full bg-white/10 flex items-center justify-center text-white font-black text-lg">{c.label[0]}</span>
                    )}
                  </span>
                  <span className={`text-[11px] sm:text-xs font-semibold truncate max-w-full ${category === c.value ? 'text-white' : 'text-white/70'}`}>{c.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-14 z-40">
        <div className="max-w-6xl mx-auto px-3 sm:px-6">
          {/* Category pills */}
          <div className="flex items-center gap-2 py-3 overflow-x-auto scrollbar-hide min-w-0">
            {topCategories.map(c => (
              <button key={c.value}
                onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('category', c.value); return n; })}
                className={`text-sm px-4 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all flex-shrink-0 ${
                  category === c.value ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {c.label}
              </button>
            ))}
            <div className="w-px h-6 bg-gray-200 flex-shrink-0 mx-1" />
            <button onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 text-sm px-4 py-1.5 rounded-full font-semibold whitespace-nowrap flex-shrink-0 transition-all border ${
                showFilters || activeFilterCount > 0
                  ? 'bg-primary-50 text-primary-700 border-primary-200'
                  : 'bg-gray-100 text-gray-600 border-transparent hover:bg-gray-200'}`}>
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-primary-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {/* Expanded filters */}
          {showFilters && (
            <div className="pb-4 flex flex-wrap items-center gap-3">
              {/* Date */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <Calendar className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type="date" value={filterDate} onChange={e => setFilterDate(e.target.value)}
                  className="bg-transparent text-sm text-gray-700 outline-none font-medium cursor-pointer"
                  min={new Date().toISOString().split('T')[0]} />
                {filterDate && <button onClick={() => setFilterDate('')} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
              </div>

              {/* Time */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <input type="time" value={filterTime} onChange={e => setFilterTime(e.target.value)}
                  className="bg-transparent text-sm text-gray-700 outline-none font-medium cursor-pointer" />
                {filterTime && <button onClick={() => setFilterTime('')} className="text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>}
              </div>

              {/* Distance */}
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
                <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <select value={filterDistance} onChange={e => setFilterDistance(e.target.value)}
                  className="bg-transparent text-sm text-gray-700 outline-none font-medium cursor-pointer pr-1">
                  <option value="">Any distance</option>
                  <option value="1">Within 1 km</option>
                  <option value="3">Within 3 km</option>
                  <option value="5">Within 5 km</option>
                  <option value="10">Within 10 km</option>
                  <option value="25">Within 25 km</option>
                </select>
              </div>

              {/* Mobile / On-premises toggle */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button onClick={() => setFilterMobile(filterMobile === 'mobile' ? null : 'mobile')}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    filterMobile === 'mobile' ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
                  <Car className="w-3.5 h-3.5" /> Mobile
                </button>
                <button onClick={() => setFilterMobile(filterMobile === 'premises' ? null : 'premises')}
                  className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg font-semibold transition-all ${
                    filterMobile === 'premises' ? 'bg-primary-600 text-white shadow-sm' : 'text-gray-600 hover:bg-white'}`}>
                  <Home className="w-3.5 h-3.5" /> In-store
                </button>
              </div>

              {activeFilterCount > 0 && (
                <button onClick={clearAllFilters} className="text-sm text-red-500 hover:text-red-700 font-semibold flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Clear all
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Smart match banner + popular chips */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5 space-y-3">
        <div className="overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            {POPULAR_SERVICES.map(service => (
              <button key={service}
                onClick={() => setSearchParams(p => { const n = new URLSearchParams(p); n.set('q', service); return n; })}
                className="rounded-xl bg-white px-3 py-2 text-sm font-semibold text-gray-700 border border-gray-200 hover:border-primary-300 hover:text-primary-700 transition-colors whitespace-nowrap">
                {service}
              </button>
            ))}
          </div>
        </div>
        <Link to="/match"
          className="flex items-center gap-3 p-3 sm:p-4 rounded-2xl bg-gradient-to-r from-primary-700 to-primary-950 text-white hover:opacity-95 transition-opacity shadow-lg">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Try Smart Match</p>
            <p className="text-primary-200 text-xs truncate">Tell us what you need — we find the best option for you</p>
          </div>
          <ChevronRight className="w-5 h-5 opacity-60 flex-shrink-0" />
        </Link>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pb-28">
        {loading ? (
          <div className="grid grid-cols-1 min-[430px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden animate-pulse border border-gray-100" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="h-44 bg-gray-200" />
                <div className="p-3 space-y-2">
                  <div className="h-3.5 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : searchError ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-7 h-7 text-red-400" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">Something went wrong</h3>
            <p className="text-gray-500 text-sm mb-4">Could not load results — please try again</p>
            <button onClick={() => doSearch()} className="btn-primary text-sm">Retry</button>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-gray-400" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">No results found</h3>
            <p className="text-gray-500 text-sm mb-4">Try a different search or adjust your filters</p>
            <button onClick={() => { clearAllFilters(); setSearchParams({}); doSearch({ q: '', category: 'all' }); }} className="btn-primary text-sm">
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm font-medium text-gray-500">
                <span className="font-bold text-gray-900">{results.length}</span> result{results.length !== 1 ? 's' : ''}{coords ? ' near you' : ''}
              </p>
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                  title="List view"><List className="w-4 h-4" /></button>
                <button onClick={() => setViewMode('map')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'map' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                  title="Map view"><Map className="w-4 h-4" /></button>
              </div>
            </div>
            {viewMode === 'map' ? (
              <MapView results={results} coords={coords} onSwitchList={() => setViewMode('list')} from={location} />
            ) : (
              <div className="grid grid-cols-1 min-[430px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {results.map((biz, i) => (
                  <div key={biz.id} className="animate-in" style={{ animationDelay: `${Math.min(i * 50, 300)}ms` }}>
                    <BusinessCard biz={biz} from={location} />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <ConsumerBottomNav />
    </div>
  );
}
