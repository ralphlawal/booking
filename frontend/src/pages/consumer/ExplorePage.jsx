import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { MapPin, Star, Search, Navigation, Zap, User, ChevronRight, Building2, AlertTriangle, List, Map, BadgeCheck } from 'lucide-react';
import { discoverAPI } from '../../services/api';
import { LOGO_BLUE_H } from '../../config/logos';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import toast from 'react-hot-toast';


function StarRating({ rating }) {
  const r = parseFloat(rating) || 0;
  return (
    <span className="flex items-center gap-1 text-xs">
      <Star className={`w-3.5 h-3.5 ${r > 0 ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      <span className={r > 0 ? 'text-gray-600 dark:text-gray-400 font-medium' : 'text-gray-400'}>
        {r > 0 ? r.toFixed(1) : 'New'}
      </span>
    </span>
  );
}

function BusinessCard({ biz }) {
  return (
    <Link
      to={`/profile/${biz.slug}`}
      className="group card p-0 overflow-hidden hover:-translate-y-1 transition-all duration-200 hover:shadow-lg flex flex-col"
    >
      <div className="h-28 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-900/40 dark:to-primary-800/40 flex items-center justify-center relative">
        {biz.logo_url ? (
          <img src={biz.logo_url} alt={biz.name} className="h-full w-full object-cover" />
        ) : (
          <Building2 className="w-10 h-10 text-primary-300 dark:text-primary-600" />
        )}
        {biz.distance_km !== null && biz.distance_km !== undefined && (
          <span className="absolute top-2 right-2 bg-white/90 dark:bg-gray-900/90 text-xs font-semibold px-2 py-1 rounded-full text-gray-700 dark:text-gray-200 flex items-center gap-1">
            <MapPin className="w-3 h-3" />{biz.distance_km} km
          </span>
        )}
      </div>
      <div className="p-4 flex flex-col gap-1 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-gray-900 dark:text-white text-sm leading-tight line-clamp-1 flex items-center gap-1">
            {biz.name}
            {!!biz.is_verified && <BadgeCheck title="Verified Business" className="w-4 h-4 text-blue-500 flex-shrink-0" />}
          </h3>
          {biz.category && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 whitespace-nowrap flex-shrink-0">
              {biz.category}
            </span>
          )}
        </div>
        <StarRating rating={biz.avg_rating} />
        {biz.location && (
          <p className="text-xs text-gray-400 line-clamp-1 flex items-center gap-1">
            <MapPin className="w-3 h-3 flex-shrink-0" />{biz.location}
          </p>
        )}
        {biz.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mt-1 leading-relaxed">
            {biz.description}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between">
          {biz.min_price != null ? (
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">
              From £{parseFloat(biz.min_price).toFixed(0)}
            </span>
          ) : <span />}
          <span className="flex items-center gap-1 text-xs text-primary-600 dark:text-primary-400 font-semibold group-hover:underline">
            View <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function MapView({ results, coords, onSwitchList }) {
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
  const markers = withCoords.map(b => `${b.latitude},${b.longitude}`).join('|');
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik`;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-800" style={{ height: '55vh', minHeight: 320 }}>
        <iframe
          title="Business map"
          src={src}
          style={{ width: '100%', height: '100%', border: 0 }}
          loading="lazy"
          allowFullScreen
        />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {withCoords.map(biz => <BusinessCard key={biz.id} biz={biz} />)}
      </div>
      {results.length > withCoords.length && (
        <p className="text-xs text-gray-400 text-center">
          {results.length - withCoords.length} result{results.length - withCoords.length !== 1 ? 's' : ''} without location data shown only in list view
        </p>
      )}
    </div>
  );
}

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [locating, setLocating] = useState(false);
  const [coords, setCoords] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const { consumer } = useCustomerAuth();

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';

  const doSearch = useCallback(async (overrides = {}) => {
    setLoading(true);
    setSearchError(false);
    try {
      const params = {
        q: overrides.q ?? q,
        category: overrides.category ?? category,
        lat: coords?.lat,
        lng: coords?.lng,
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
  }, [q, category, coords]);

  useEffect(() => {
    discoverAPI.categories().then(setCategories).catch(() => {});
  }, []);

  // Auto-use stored consumer location on mount
  useEffect(() => {
    if (consumer?.latitude && consumer?.longitude && !coords) {
      setCoords({ lat: consumer.latitude, lng: consumer.longitude });
    }
  }, [consumer]);

  useEffect(() => { doSearch(); }, [category, coords]);

  const handleSearch = (e) => {
    e.preventDefault();
    doSearch();
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Location not supported in this browser');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        if (err.code === 1) toast.error('Location access denied — please allow location in your browser settings');
        else toast.error('Could not get your location — please try again');
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    );
  };

  const topCategories = [
    { label: 'All', value: 'all' },
    ...categories.slice(0, 8).map((c) => ({ label: c.category, value: c.category })),
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 animate-fade-in">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-7 w-auto object-contain dark:brightness-0 dark:invert" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/match" className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-primary-600 dark:text-primary-400">
              <Zap className="w-4 h-4" /> Smart Match
            </Link>
            {consumer ? (
              <Link to="/customer/dashboard" className="btn-primary text-sm py-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> My Bookings
              </Link>
            ) : (
              <Link to="/customer/login" className="btn-primary text-sm py-1.5">Sign in</Link>
            )}
          </div>
        </div>
      </nav>

      {/* Hero search */}
      <div className="bg-gradient-to-b from-primary-700 to-primary-900 px-4 py-8 text-center">
        <h1 className="text-xl sm:text-3xl font-bold text-white mb-1">Find services near you</h1>
        <p className="text-primary-200 text-xs sm:text-sm mb-5">Book barbers, stylists, trainers and more — instantly</p>
        <form onSubmit={handleSearch} className="max-w-lg mx-auto flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full pl-9 pr-3 py-3 rounded-xl text-sm outline-none border-0 shadow-sm"
              placeholder="Search barbers, nail techs…"
              value={q}
              onChange={(e) => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('q', e.target.value); return n; })}
            />
          </div>
          <button type="submit" className="bg-white text-primary-700 font-bold px-4 py-3 rounded-xl text-sm hover:bg-gray-50 transition-colors flex items-center gap-1">
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </button>
        </form>
        <button
          onClick={getLocation}
          disabled={locating}
          className="mt-3 text-primary-200 hover:text-white text-xs font-medium transition-colors flex items-center gap-1.5 mx-auto"
        >
          <Navigation className="w-3.5 h-3.5" />
          {locating ? 'Getting your location…' : 'Use my location for nearby results'}
        </button>
        {coords && (
          <p className="text-primary-300 text-xs mt-1">Location found — results sorted by distance</p>
        )}
      </div>

      {/* Category filter */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 px-4 py-3 min-w-max mx-auto max-w-6xl">
          {topCategories.map((c) => (
            <button
              key={c.value}
              onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('category', c.value); return n; })}
              className={`text-sm px-4 py-1.5 rounded-full font-medium whitespace-nowrap transition-all ${
                category === c.value
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Smart match banner */}
      <div className="max-w-6xl mx-auto px-4 py-4">
        <Link
          to="/match"
          className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-primary-600 to-indigo-600 text-white hover:opacity-95 transition-opacity"
        >
          <Zap className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-sm">Try Smart Match</p>
            <p className="text-primary-100 text-xs">Tell us what you need — we find the best available option for you</p>
          </div>
          <svg className="w-4 h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

      {/* Results */}
      <div className="max-w-6xl mx-auto px-4 pb-28">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-0 overflow-hidden animate-pulse">
                <div className="h-28 bg-gray-200 dark:bg-gray-800" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : searchError ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-7 h-7 text-red-400" /></div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">Something went wrong</h3>
            <p className="text-gray-500 text-sm mb-4">Could not load results — please try again</p>
            <button onClick={() => doSearch()} className="btn-primary text-sm">Retry</button>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-4"><Search className="w-7 h-7 text-gray-400" /></div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">No results found</h3>
            <p className="text-gray-500 text-sm">Try a different search or browse all categories</p>
            <button onClick={() => { setSearchParams({}); doSearch({ q: '', category: 'all' }); }} className="btn-primary mt-4 text-sm">
              Browse all
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {results.length} result{results.length !== 1 ? 's' : ''} {coords ? 'near you' : 'found'}
              </p>
              <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400'}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'map' ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-400'}`}
                  title="Map view"
                >
                  <Map className="w-4 h-4" />
                </button>
              </div>
            </div>
            {viewMode === 'map' ? (
              <MapView results={results} coords={coords} onSwitchList={() => setViewMode('list')} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {results.map((biz) => <BusinessCard key={biz.id} biz={biz} />)}
              </div>
            )}
          </>
        )}
      </div>

      <ConsumerBottomNav />
    </div>
  );
}
