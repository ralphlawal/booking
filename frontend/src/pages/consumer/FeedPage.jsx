import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { postsAPI, followsAPI, postMediaUrl } from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import { Image, Tag, Calendar, Megaphone, BadgeCheck, Star, ChevronDown, Users, Search, Zap, User } from 'lucide-react';
import toast from 'react-hot-toast';

const TYPE_META = {
  photo:        { label: 'Portfolio', icon: Image,     color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
  offer:        { label: 'Offer',     icon: Tag,       color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  availability: { label: 'Slots',     icon: Calendar,  color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  announcement: { label: 'Update',    icon: Megaphone, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
};

const CATEGORIES = ['All', 'Hair', 'Beauty', 'Nails', 'Fitness', 'Cleaning', 'Tutoring', 'Photography', 'Food', 'Other'];

function PostCard({ post }) {
  const navigate = useNavigate();
  const location = useLocation();
  const meta = TYPE_META[post.type] || TYPE_META.photo;
  const Icon = meta.icon;
  const hasBooked = post.cta_label && post.business_slug;

  const handleBook = () => {
    postsAPI.recordBookClick(post.id).catch(() => {});
    navigate(`/book/${post.business_slug}`, {
      state: { from: location, prefill_service_id: post.cta_service_id || undefined },
    });
  };

  useEffect(() => {
    postsAPI.recordView(post.id).catch(() => {});
  }, [post.id]);

  return (
    <article className="app-panel overflow-hidden">
      {/* Business header */}
      <Link
        to={`/profile/${post.business_slug}`}
        state={{ from: location }}
        className="flex items-center gap-2.5 sm:gap-3 p-3 sm:p-4 pb-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
          {post.logo_url ? (
            <img src={post.logo_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-lg font-black text-primary-600">{(post.business_name || '?')[0]}</span>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1">
            <span className="font-bold text-sm text-gray-900 dark:text-white truncate">{post.business_name}</span>
            {post.is_verified && <BadgeCheck className="w-3.5 h-3.5 text-primary-500 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            {post.business_category && <span>{post.business_category}</span>}
            {parseFloat(post.avg_rating) > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                {post.avg_rating}
              </span>
            )}
          </div>
        </div>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 flex-shrink-0 max-w-[7.5rem] truncate ${meta.color}`}>
          <Icon className="w-3 h-3" />{meta.label}
        </span>
      </Link>

      {/* Media */}
      {post.has_media && (
        <div className="px-3 sm:px-4">
          {post.media_type === 'video' ? (
            <video src={postMediaUrl(post.id)} className="w-full rounded-lg object-cover aspect-[4/5] max-h-[34rem] bg-gray-900" controls playsInline preload="metadata" />
          ) : (
            <img src={postMediaUrl(post.id)} alt="" className="w-full rounded-lg object-cover max-h-[34rem]" loading="lazy" />
          )}
        </div>
      )}

      {/* Content */}
      <div className="p-3 sm:p-4 pt-3 space-y-2">
        {post.offer_text && (
          <div className="flex items-center gap-2">
            <p className={`text-sm font-bold ${post.is_expired ? 'text-gray-400 line-through' : 'text-amber-600 dark:text-amber-400'}`}>{post.offer_text}</p>
            {post.is_expired && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">Expired</span>}
          </div>
        )}
        {post.caption && (
          <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 leading-relaxed break-words">{post.caption}</p>
        )}
        <p className="text-xs text-gray-400">
          {new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>

        {/* CTAs */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Link
            to={`/profile/${post.business_slug}`}
            state={{ from: location }}
            className="text-center text-sm font-semibold py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-primary-400 hover:text-primary-600 transition-all"
          >
            View profile
          </Link>
          <button
            onClick={handleBook}
            disabled={post.is_expired}
            className="btn-primary text-sm py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {post.is_expired ? 'Offer ended' : (post.cta_label || 'Book now')}
          </button>
        </div>
      </div>
    </article>
  );
}

export default function FeedPage() {
  const navigate = useNavigate();
  const { consumer } = useCustomerAuth();
  const [mode, setMode] = useState('all'); // 'all' | 'following'
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [category, setCategory] = useState('All');
  const offsetRef = useRef(0);
  const touchStartX = useRef(null);
  const LIMIT = 10;

  const handleModeSwitch = (m) => {
    if (m === 'following' && !consumer) {
      return navigate('/customer/login', { state: { from: '/feed' } });
    }
    setMode(m);
    setCategory('All');
  };

  // Swipe left/right to switch between For You / Following
  const onTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = touchStartX.current - e.changedTouches[0].clientX;
    touchStartX.current = null;
    if (Math.abs(dx) < 60) return;
    if (dx > 0 && mode === 'all') handleModeSwitch('following');
    else if (dx < 0 && mode === 'following') handleModeSwitch('all');
  };

  const load = useCallback(async (reset = false) => {
    const offset = reset ? 0 : offsetRef.current;
    if (reset) setLoading(true); else setLoadingMore(true);
    try {
      const params = { limit: LIMIT, offset };
      let items;
      if (mode === 'following') {
        items = await followsAPI.feed(params);
      } else {
        if (category !== 'All') params.category = category;
        items = await postsAPI.getFeed(params);
      }
      if (reset) {
        setPosts(items);
        offsetRef.current = items.length;
      } else {
        setPosts(prev => [...prev, ...items]);
        offsetRef.current = offset + items.length;
      }
      setHasMore(items.length === LIMIT);
    } catch {
      toast.error('Failed to load feed');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, mode]);

  useEffect(() => {
    offsetRef.current = 0;
    setHasMore(true);
    load(true);
  }, [load]);

  return (
    <div
      className="app-page pb-consumer-nav"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-3 sm:px-6 min-h-14 py-2 flex items-center justify-between gap-2">
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-7 w-auto object-contain dark:brightness-0 dark:invert" />
          </Link>
          {/* Mode toggle */}
          <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5 flex-shrink-0">
            <button
              onClick={() => handleModeSwitch('all')}
              className={`text-xs font-bold px-3 py-1.5 rounded-md transition-all ${mode === 'all' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
            >
              For you
            </button>
            <button
              onClick={() => handleModeSwitch('following')}
              className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-md transition-all ${mode === 'following' ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500'}`}
            >
              <Users className="w-3 h-3" />Following
            </button>
          </div>
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/explore" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-colors">
              <Search className="w-4 h-4" /> Explore
            </Link>
            <Link to="/match" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-colors">
              <Zap className="w-4 h-4" /> Smart Match
            </Link>
            <Link to={consumer ? '/customer/dashboard' : '/customer/login'} className="btn-primary text-sm py-1.5">
              <User className="w-3.5 h-3.5" /> {consumer ? 'My Bookings' : 'Sign in'}
            </Link>
          </div>
          <div className="w-8 sm:w-16 lg:hidden" />
        </div>
        {/* Category filters — only in "For you" mode */}
        {mode === 'all' && (
          <div className="max-w-6xl mx-auto flex gap-2 overflow-x-auto px-3 sm:px-6 pb-3 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`flex-shrink-0 text-xs font-bold px-3 py-1.5 rounded-full transition-all ${
                  category === cat
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}
      </nav>

      <div className="max-w-6xl mx-auto px-3 sm:px-6 pt-4 pb-10">
        {loading ? (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="app-panel overflow-hidden animate-pulse" style={{ animationDelay: `${i * 80}ms` }}>
                <div className="flex items-center gap-3 p-4">
                  <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-gray-200 dark:bg-gray-800 rounded-full w-2/5" />
                    <div className="h-2.5 bg-gray-100 dark:bg-gray-700 rounded-full w-1/4" />
                  </div>
                </div>
                <div className="mx-4 h-44 bg-gray-200 dark:bg-gray-800 rounded-lg mb-2" />
                <div className="p-4 pt-2 space-y-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded-full w-3/4" />
                  <div className="h-3 bg-gray-100 dark:bg-gray-700 rounded-full w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="empty-state py-16 app-panel">
            <div className="w-14 h-14 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center mx-auto mb-4">
              {mode === 'following' ? <Users className="w-7 h-7 text-primary-400" /> : <Megaphone className="w-7 h-7 text-primary-400" />}
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">
              {mode === 'following' ? 'No posts from businesses you follow' : 'Nothing here yet'}
            </h3>
            <p className="text-sm text-gray-400">
              {mode === 'following'
                ? 'Follow businesses to see their updates, offers, and availability here.'
                : 'Businesses haven\'t posted in this category yet. Check back soon.'}
            </p>
            <Link to="/explore" className="btn-primary mt-5 inline-block text-sm">
              {mode === 'following' ? 'Find businesses to follow' : 'Browse businesses'}
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
            {posts.map((post, i) => (
              <div key={post.id} className="animate-in" style={{ animationDelay: `${Math.min(i * 70, 350)}ms` }}>
                <PostCard post={post} />
              </div>
            ))}
            {hasMore && (
              <button
                onClick={() => load(false)}
                disabled={loadingMore}
                className="w-full py-3 text-sm font-semibold text-primary-600 dark:text-primary-400 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loadingMore ? (
                  <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <><ChevronDown className="w-4 h-4" /> Load more</>
                )}
              </button>
            )}
          </div>
        )}
      </div>

      <ConsumerBottomNav />
    </div>
  );
}
