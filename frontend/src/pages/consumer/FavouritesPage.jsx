import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Heart, Building2, MapPin, Star, ChevronRight, Trash2 } from 'lucide-react';
import { consumerAPI } from '../../services/api';
import { LOGO_BLUE_H } from '../../config/logos';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import BackButton from '../../components/shared/BackButton';
import toast from 'react-hot-toast';

export default function FavouritesPage() {
  const location = useLocation();
  const [favourites, setFavourites] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    consumerAPI.getPreferences()
      .then(setFavourites)
      .catch(() => toast.error('Could not load favourites'))
      .finally(() => setLoading(false));
  }, []);

  const remove = async (businessId) => {
    try {
      await consumerAPI.removePreference(businessId);
      setFavourites(prev => prev.filter(f => f.business_id !== businessId));
      toast.success('Removed from favourites');
    } catch {
      toast.error('Could not remove');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 pb-consumer-nav">
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <BackButton
            fallback="/customer/dashboard"
            className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            iconClassName="w-5 h-5"
          >
            {null}
          </BackButton>
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-6 w-auto object-contain dark:brightness-0 dark:invert" />
          </Link>
          <h1 className="font-bold text-gray-900 dark:text-white ml-2">Favourites</h1>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-5 lg:py-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : favourites.length === 0 ? (
          <div className="text-center py-20">
            <Heart className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-4" />
            <p className="font-semibold text-gray-600 dark:text-gray-400 mb-1">No favourites yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">Tap the heart on any business profile to save it here</p>
            <Link to="/explore" className="btn-primary text-sm px-6">Browse services</Link>
          </div>
        ) : (
          <div className="grid gap-3 lg:grid-cols-2">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1 lg:col-span-2">{favourites.length} saved {favourites.length === 1 ? 'business' : 'businesses'}</p>
            {favourites.map(f => (
              <div key={f.id || f.business_id} className="card p-4 flex items-center gap-4">
                <Link to={`/profile/${f.business_slug || f.slug}`} state={{ from: location }} className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-14 h-14 rounded-2xl overflow-hidden bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0 border border-gray-100 dark:border-gray-800">
                    {f.logo_url ? (
                      <img src={f.logo_url} alt={f.business_name || f.name} className="w-full h-full object-cover" />
                    ) : (
                      <Building2 className="w-6 h-6 text-primary-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-sm truncate">
                      {f.business_name || f.name}
                    </p>
                    {f.category && (
                      <span className="text-xs text-primary-600 dark:text-primary-400">{f.category}</span>
                    )}
                    {f.location && (
                      <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin className="w-3 h-3 flex-shrink-0" />{f.location}
                      </p>
                    )}
                    {f.avg_rating > 0 && (
                      <p className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        {parseFloat(f.avg_rating).toFixed(1)}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
                </Link>
                <button
                  onClick={() => remove(f.business_id || f.id)}
                  className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                  title="Remove from favourites"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConsumerBottomNav />
    </div>
  );
}
