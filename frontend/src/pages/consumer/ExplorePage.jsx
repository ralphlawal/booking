import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { MapPin, Star, Search, Navigation, Zap, User, ChevronRight, Building2, AlertTriangle, List, Map, BadgeCheck, Rss, X } from 'lucide-react';
import MapGL, { Marker, Popup, NavigationControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
import { discoverAPI, aiAPI } from '../../services/api';
import { LOGO_BLUE_H } from '../../config/logos';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import toast from 'react-hot-toast';
import { getCurrentPosition } from '../../services/nativeBridge';

const POPULAR_SERVICES = ['Haircut', 'Beard trim', 'Shave', 'Nails', 'Lashes', 'Massage', 'Tutoring', 'Cleaning'];

// A map must remain useful in release builds even when a Mapbox token has not
// been provisioned. Mapbox GL can render a standards-compliant raster style
// without one; a paid provider token still upgrades this to the Mapbox style.
// Attribution is deliberately retained for OpenStreetMap data.
const OPEN_STREET_MAP_STYLE = {
  version: 8,
  sources: {
    openstreetmap: {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [{ id: 'openstreetmap', type: 'raster', source: 'openstreetmap' }],
};

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

function StarRating({ rating }) {
  const r = parseFloat(rating) || 0;
  return (
    <span className="flex items-center gap-1 text-xs">
      <Star className={`w-3.5 h-3.5 ${r > 0 ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
      <span className={r > 0 ? 'text-gray-600 font-medium' : 'text-gray-400'}>
        {r > 0 ? r.toFixed(1) : 'New'}
      </span>
    </span>
  );
}

function BusinessCard({ biz, from }) {
  const verified = !!biz.is_verified || biz.verification_status === 'verified';
  return (
    <Link
      to={`/profile/${biz.slug}`}
      state={{ from }}
      className="group overflow-hidden flex flex-col min-w-0 transition-all duration-200 hover:-translate-y-1"
      style={{ background: '#fff', borderRadius: '1.25rem', border: '1px solid var(--bam-border)', boxShadow: '0 2px 12px rgba(91,63,234,0.04)' }}
    >
      <div className="relative overflow-hidden" style={{ height: 160 }}>
        {biz.logo_url ? (
          <img src={biz.logo_url} alt={biz.name} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #f0edff 0%, #e8f4ff 100%)' }}>
            <Building2 className="w-12 h-12" style={{ color: 'rgba(91,63,234,0.4)' }} />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent" />
        {biz.distance_km !== null && biz.distance_km !== undefined && (
          <span className="absolute top-2.5 left-2.5 bg-white/95 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow-sm" style={{ color: 'var(--bam-text)' }}>
            <MapPin className="w-3 h-3" style={{ color: '#5B3FEA' }} />{biz.distance_km} km
          </span>
        )}
        {parseFloat(biz.avg_rating) > 0 && (
          <span className="absolute bottom-2.5 left-2.5 bg-black/65 text-white text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            {parseFloat(biz.avg_rating).toFixed(1)}
          </span>
        )}
        {biz.category && (
          <span className="absolute bottom-2.5 right-2.5 bg-white/90 text-xs font-bold px-2.5 py-1 rounded-full truncate max-w-[48%]" style={{ color: '#5B3FEA' }}>
            {biz.category}
          </span>
        )}
      </div>
      <div className="p-3.5 flex flex-col gap-1 flex-1">
        <h3 className="font-bold text-sm leading-tight flex items-center gap-1 min-w-0" style={{ color: 'var(--bam-text)' }}>
          <span className="truncate min-w-0">{biz.name}</span>
          {verified && <BadgeCheck title="Verified Business" className="w-4 h-4 text-blue-500 flex-shrink-0" />}
        </h3>
        {biz.location && (
          <p className="text-xs line-clamp-1 flex items-center gap-1" style={{ color: 'var(--bam-text-faint)' }}>
            <MapPin className="w-3 h-3 flex-shrink-0" />{biz.location}
          </p>
        )}
        {biz.description && (
          <p className="text-xs line-clamp-2 mt-0.5 leading-relaxed" style={{ color: 'var(--bam-text-muted)' }}>
            {biz.description}
          </p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between gap-2 min-w-0">
          {biz.min_price != null ? (
            <span className="text-sm font-bold truncate min-w-0" style={{ color: 'var(--bam-text)' }}>
              From £{parseFloat(biz.min_price).toFixed(0)}
            </span>
          ) : <span />}
          <span className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0 text-white" style={{ background: '#5B3FEA' }}>
            Book <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </Link>
  );
}

function MapView({ results, coords, onSwitchList, from }) {
  const [popup, setPopup] = useState(null);
  const withCoords = results.filter((business) => Number.isFinite(Number(business.latitude)) && Number.isFinite(Number(business.longitude)));

  if (!withCoords.length) {
    return (
      <div className="text-center py-14 text-gray-400">
        <Map className="w-10 h-10 mx-auto mb-2 text-gray-300" />
        <p className="text-sm">No businesses with location data to show on map</p>
        <button onClick={onSwitchList} className="btn-primary mt-3 text-sm">Switch to list</button>
      </div>
    );
  }

  const centerLat = coords?.lat ?? parseFloat(withCoords[0].latitude);
  const centerLng = coords?.lng ?? parseFloat(withCoords[0].longitude);

  return (
    <div className="space-y-3">
      <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 'min(58vh, 520px)', minHeight: 300 }}>
        <MapGL
          initialViewState={{ longitude: centerLng, latitude: centerLat, zoom: 12 }}
          style={{ width: '100%', height: '100%' }}
          mapStyle={MAPBOX_TOKEN ? 'mapbox://styles/mapbox/streets-v12' : OPEN_STREET_MAP_STYLE}
          mapboxAccessToken={MAPBOX_TOKEN || undefined}
          onClick={() => setPopup(null)}
        >
          <NavigationControl position="top-right" />
          {coords && (
            <Marker longitude={coords.lng} latitude={coords.lat} anchor="center">
              <div className="w-4 h-4 rounded-full bg-sky-500 border-[3px] border-white shadow-lg ring-4 ring-sky-400/30" title="Your location" />
            </Marker>
          )}
          {withCoords.map(biz => (
            <Marker
              key={biz.id}
              longitude={parseFloat(biz.longitude)}
              latitude={parseFloat(biz.latitude)}
              anchor="bottom"
              onClick={e => { e.originalEvent.stopPropagation(); setPopup(biz); }}
            >
              <div className="w-9 h-9 bg-primary-600 rounded-full border-[2.5px] border-white shadow-md flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                <MapPin className="w-4 h-4 text-white" />
              </div>
            </Marker>
          ))}
          {popup && (
            <Popup
              longitude={parseFloat(popup.longitude)}
              latitude={parseFloat(popup.latitude)}
              anchor="top"
              onClose={() => setPopup(null)}
              closeButton={false}
              closeOnClick={false}
              offset={12}
            >
              <div className="p-1 min-w-[170px] max-w-[200px]">
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <p className="font-bold text-sm text-gray-900 leading-tight">{popup.name}</p>
                  <button onClick={() => setPopup(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0 mt-0.5">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                {popup.category && <p className="text-xs text-gray-500 capitalize mb-0.5">{popup.category}</p>}
                {parseFloat(popup.avg_rating) > 0 && (
                  <p className="text-xs text-amber-500 font-medium mb-1">★ {parseFloat(popup.avg_rating).toFixed(1)}</p>
                )}
                {popup.min_price != null && (
                  <p className="text-xs text-gray-600 mb-1">From £{parseFloat(popup.min_price).toFixed(0)}</p>
                )}
                <Link
                  to={`/profile/${popup.slug}`}
                  state={{ from }}
                  className="block text-center text-xs font-semibold bg-primary-600 text-white px-3 py-1.5 rounded-lg hover:bg-primary-700 transition-colors"
                >
                  Check availability
                </Link>
              </div>
            </Popup>
          )}
        </MapGL>
      </div>
      {results.length > withCoords.length && (
        <p className="text-xs text-gray-400 text-center">
          {results.length - withCoords.length} result{results.length - withCoords.length !== 1 ? 's' : ''} without location data — switch to list to see all
        </p>
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
  const [aiMatching, setAiMatching] = useState(false);
  const [availableToday, setAvailableToday] = useState(false);
  const { consumer } = useCustomerAuth();

  const q = searchParams.get('q') || '';
  const category = searchParams.get('category') || 'all';

  const doSearch = useCallback(async (overrides = {}) => {
    setLoading(true);
    setSearchError(false);
    try {
      let effectiveQ = overrides.q ?? q;
      let effectiveCategory = overrides.category ?? category;

      // AI intent matching: if the query looks like natural language (> 2 words),
      // use Claude to extract the best keyword + category before searching.
      if (effectiveQ && effectiveQ.trim().split(' ').length > 2) {
        try {
          setAiMatching(true);
          const matched = await aiAPI.matchService(effectiveQ);
          if (matched?.q) effectiveQ = matched.q;
          if (matched?.category && effectiveCategory === 'all') effectiveCategory = matched.category;
        } catch {}
        setAiMatching(false);
      }

      const params = {
        q: effectiveQ,
        category: effectiveCategory,
        lat: coords?.lat,
        lng: coords?.lng,
        available_today: availableToday ? 'true' : undefined,
      };
      if (params.category === 'all') delete params.category;
      if (!params.available_today) delete params.available_today;
      const data = await discoverAPI.search(params);
      setResults(data);
    } catch {
      setSearchError(true);
      setResults([]);
    } finally {
      setLoading(false);
      setAiMatching(false);
    }
  }, [q, category, coords, availableToday]);

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
    setLocating(true);
    getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        toast.error(err?.message || 'Could not get your location — please try again');
      },
      { timeout: 10000, maximumAge: 300000, enableHighAccuracy: false }
    );
  };

  const topCategories = [
    { label: 'All', value: 'all' },
    ...categories.slice(0, 8).map((c) => ({ label: c.category, value: c.category })),
  ];

  return (
    <div className="min-h-screen animate-fade-in" style={{ background: 'var(--bam-bg)' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl border-b" style={{ background: 'rgba(255,255,255,0.97)', borderColor: 'var(--bam-border)' }}>
        <div className="max-w-6xl mx-auto px-3 sm:px-6 min-h-14 py-2 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-7 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
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
      <div className="border-b px-3 sm:px-6 py-6 sm:py-8" style={{ background: '#fff', borderColor: 'var(--bam-border)' }}>
        <div className="max-w-3xl mx-auto">
          <h1 className="text-xl sm:text-2xl font-extrabold mb-4 tracking-tight" style={{ color: 'var(--bam-text)' }}>Find services near you</h1>
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--bam-text-faint)' }} />
              <input
                className="w-full pl-10 pr-4 py-3 rounded-xl text-sm outline-none transition-all"
                style={{ border: '1.5px solid var(--bam-border)', background: 'var(--bam-surface-soft)', color: 'var(--bam-text)' }}
                placeholder="Search services or businesses"
                value={q}
                onChange={(e) => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('q', e.target.value); return n; })}
              />
            </div>
            <button
              type="button"
              onClick={getLocation}
              disabled={locating}
              className="font-semibold px-3.5 py-3 rounded-xl text-sm transition-colors flex items-center gap-1.5"
              style={{ border: '1.5px solid var(--bam-border)', color: 'var(--bam-text-muted)', background: '#fff' }}
            >
              <Navigation className="w-4 h-4" />
              <span className="hidden sm:inline">{locating ? 'Locating…' : 'Near me'}</span>
            </button>
            <button type="submit" disabled={aiMatching} className="text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors flex items-center gap-1.5 disabled:opacity-70" style={{ background: '#5B3FEA' }}>
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">{aiMatching ? 'Thinking…' : 'Search'}</span>
            </button>
          </form>
          <div className="flex items-center gap-3 mt-3">
            <button
              type="button"
              onClick={() => setAvailableToday(v => !v)}
              className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                availableToday
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400 hover:text-emerald-600'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${availableToday ? 'bg-white' : 'bg-emerald-400'}`} />
              Open today
            </button>
            {coords && !aiMatching && (
              <p className="text-emerald-600 text-xs font-medium">Sorted by distance</p>
            )}
            {aiMatching && (
              <p className="text-violet-600 text-xs font-medium flex items-center gap-1">
                <Zap className="w-3 h-3" /> AI matching…
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Category filter */}
      <div className="border-b overflow-x-auto scrollbar-hide" style={{ background: '#fff', borderColor: 'var(--bam-border)' }}>
        <div className="flex items-center gap-2 px-3 sm:px-6 py-3 min-w-max mx-auto max-w-6xl">
          {topCategories.map((c) => (
            <button
              key={c.value}
              onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('category', c.value); return n; })}
              className="text-sm px-4 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all"
              style={{
                background: category === c.value ? '#5B3FEA' : 'var(--bam-surface-soft)',
                color: category === c.value ? '#fff' : 'var(--bam-text-muted)',
              }}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Smart match banner */}
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-5">
        <div className="mb-4 overflow-x-auto scrollbar-hide">
          <div className="flex items-center gap-2 min-w-max">
            {POPULAR_SERVICES.map((service) => (
              <button
                key={service}
                onClick={() => setSearchParams((p) => { const n = new URLSearchParams(p); n.set('q', service); return n; })}
                className="rounded-xl px-3.5 py-2 text-sm font-semibold transition-all"
                style={{ background: '#fff', border: '1px solid var(--bam-border)', color: 'var(--bam-text)' }}
              >
                {service}
              </button>
            ))}
          </div>
        </div>
        <Link
          to="/match"
          className="flex items-center gap-3 p-4 rounded-2xl text-white transition-opacity hover:opacity-95"
          style={{ background: 'linear-gradient(135deg, #5B3FEA 0%, #3d2ab5 100%)', boxShadow: '0 4px 24px rgba(91,63,234,0.25)' }}
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
      <div className="max-w-6xl mx-auto px-3 sm:px-6 pb-consumer-nav">
        {loading ? (
          <div className="grid grid-cols-1 min-[430px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="card p-0 overflow-hidden animate-pulse" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="h-28 bg-gray-200" />
                <div className="p-4 space-y-2.5">
                  <div className="h-3.5 bg-gray-200 rounded-full w-3/4" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-1/2" />
                  <div className="h-2.5 bg-gray-100 rounded-full w-2/3" />
                </div>
              </div>
            ))}
          </div>
        ) : searchError ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-lg bg-red-50 flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-7 h-7 text-red-400" /></div>
            <h3 className="font-bold text-gray-900 mb-1">Something went wrong</h3>
            <p className="text-gray-500 text-sm mb-4">Could not load results — please try again</p>
            <button onClick={() => doSearch()} className="btn-primary text-sm">Retry</button>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-14 h-14 rounded-lg bg-gray-100 flex items-center justify-center mx-auto mb-4"><Search className="w-7 h-7 text-gray-400" /></div>
            <h3 className="font-bold text-gray-900 mb-1">No results found</h3>
            <p className="text-gray-500 text-sm">Try a different search or browse all categories</p>
            <button onClick={() => { setSearchParams({}); doSearch({ q: '', category: 'all' }); }} className="btn-primary mt-4 text-sm">
              Browse all
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="text-sm text-gray-500">
                {results.length} result{results.length !== 1 ? 's' : ''} {coords ? 'near you' : 'found'}
              </p>
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                  title="List view"
                >
                  <List className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'map' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-400'}`}
                  title="Map view"
                >
                  <Map className="w-4 h-4" />
                </button>
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
