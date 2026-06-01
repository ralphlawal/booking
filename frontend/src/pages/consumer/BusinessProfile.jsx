import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Star, Clock, ChevronRight,
  Calendar, Share2, Heart, CheckCircle, Sparkles, Image, MessageSquare,
  BadgeCheck, Megaphone, UserPlus, UserCheck, Users,
} from 'lucide-react';
import { businessAPI, servicesAPI, reviewsAPI, consumerAPI, availabilityAPI, consumerChatAPI, photosAPI, postsAPI, followsAPI } from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import BackButton from '../../components/shared/BackButton';
import toast from 'react-hot-toast';

const DAY_SHORT = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' };
const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function formatHours(avail) {
  if (!avail?.working_days?.length) return null;
  // working_days stored lowercase; DAY_ORDER is capitalized — normalise for comparison
  const wd = avail.working_days.map(d => d.toLowerCase());
  const days = DAY_ORDER.filter(d => wd.includes(d.toLowerCase()));
  const fmt = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2,'0')}${ampm}`;
  };
  const timeStr = avail.opening_time && avail.closing_time
    ? `${fmt(avail.opening_time)} – ${fmt(avail.closing_time)}`
    : null;
  const shorts = days.map(d => DAY_SHORT[d]);
  let label = shorts.length === 7 ? 'Every day'
    : shorts.length === 5 && !wd.includes('saturday') && !wd.includes('sunday') ? 'Mon–Fri'
    : shorts.join(', ');
  return timeStr ? `${label} · ${timeStr}` : label;
}

function isOpenNow(avail) {
  if (!avail?.working_days?.length || !avail.opening_time || !avail.closing_time) return null;
  const now = new Date();
  const dayName = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'][now.getDay()];
  if (!avail.working_days.map(d => d.toLowerCase()).includes(dayName)) return false;
  const [oh, om] = avail.opening_time.split(':').map(Number);
  const [ch, cm] = avail.closing_time.split(':').map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  return mins >= oh * 60 + om && mins < ch * 60 + cm;
}

function StarBar({ count, total }) {
  return (
    <div className="h-1.5 flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full bg-amber-400 rounded-full"
        style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }}
      />
    </div>
  );
}

function ReviewCard({ review }) {
  const initials = (review.reviewer_name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="py-4 border-b border-gray-100 dark:border-gray-800 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary-100 dark:bg-primary-900/40 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary-700 dark:text-primary-300">{initials}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-gray-900 dark:text-white">
              {review.reviewer_name || 'Anonymous'}
            </p>
            <span className="text-xs text-gray-400">
              {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-0.5 my-1">
            {[1, 2, 3, 4, 5].map(s => (
              <Star
                key={s}
                className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'}`}
              />
            ))}
          </div>
          {review.comment && <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{review.comment}</p>}
          {review.reply_text && (
            <div className="mt-3 pl-3 border-l-2 border-primary-200 dark:border-primary-800">
              <p className="text-xs font-semibold text-primary-700 dark:text-primary-400 flex items-center gap-1 mb-0.5">
                <MessageSquare className="w-3 h-3" /> Business reply
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">{review.reply_text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function BusinessProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { consumer } = useCustomerAuth();

  const [business, setBusiness] = useState(null);
  const [services, setServices] = useState([]);
  const [reviewData, setReviewData] = useState({ reviews: [], stats: null });
  const [hours, setHours] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saved, setSaved] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    Promise.all([
      businessAPI.getPublic(slug),
      servicesAPI.listPublic(slug),
      reviewsAPI.getForBusiness(slug).catch(() => ({ reviews: [], stats: null })),
      availabilityAPI.getPublicHours(slug).catch(() => null),
      photosAPI.listPublic(slug).catch(() => []),
      postsAPI.getPublic(slug).catch(() => []),
      consumer ? followsAPI.check(slug).catch(() => ({ following: false, follower_count: 0 }))
               : followsAPI.count(slug).catch(() => ({ follower_count: 0 })),
    ])
      .then(([biz, svcs, rev, avail, pics, pts, followData]) => {
        setBusiness(biz);
        setServices((svcs.filter ? svcs.filter(s => s.is_active) : svcs));
        setReviewData(rev);
        setHours(avail);
        setPhotos(Array.isArray(pics) ? pics : []);
        setPosts(Array.isArray(pts) ? pts : []);
        setFollowing(followData?.following ?? false);
        setFollowerCount(followData?.follower_count ?? 0);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleShare = async () => {
    const url = window.location.origin + `/book/${slug}`;
    if (navigator.share) {
      await navigator.share({ title: business?.name, url }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    }
  };

  const handleMessage = async () => {
    if (!consumer) return navigate('/customer/login', { state: { from: `/profile/${slug}` } });
    try {
      const room = await consumerChatAPI.createRoom({ type: 'business_customer', business_id: business.id });
      navigate(`/customer/messages?room=${room.id}`);
    } catch { toast.error('Could not open chat'); }
  };

  const handleSave = async () => {
    if (!consumer) return navigate('/customer/login', { state: { from: `/profile/${slug}` } });
    try {
      await consumerAPI.savePreference({ business_id: business.id });
      setSaved(true);
      toast.success('Saved to favourites');
    } catch {}
  };

  const handleFollow = async () => {
    if (!consumer) return navigate('/customer/login', { state: { from: `/profile/${slug}` } });
    setFollowLoading(true);
    try {
      const result = following
        ? await followsAPI.unfollow(slug)
        : await followsAPI.follow(slug);
      setFollowing(result.following);
      setFollowerCount(result.follower_count);
      toast.success(result.following ? 'Following!' : 'Unfollowed');
    } catch {
      toast.error('Could not update follow');
    } finally {
      setFollowLoading(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-8 h-8 border-3 border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <p className="text-xl font-bold text-gray-900 dark:text-white">Business not found</p>
      <Link to="/explore" className="btn-primary text-sm">Browse services</Link>
    </div>
  );

  const avgRating = parseFloat(reviewData.stats?.avg_rating || 0);
  const totalReviews = parseInt(reviewData.stats?.total || 0);
  const verified = !!business.is_verified || business.verification_status === 'verified';

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-b border-gray-100 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 min-h-14 py-2 flex items-center justify-between gap-2">
          <BackButton fallback="/explore" />
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm Business" className="h-6 w-auto object-contain dark:brightness-0 dark:invert" />
          </Link>
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-60 whitespace-nowrap ${
                following
                  ? 'bg-primary-600 text-white hover:bg-primary-700'
                  : 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20'
              }`}
            >
              {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span className="hidden min-[380px]:inline">{following ? 'Following' : 'Follow'}</span>
            </button>
            <button onClick={handleShare} className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
              <Share2 className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={handleSave} disabled={saved} className={`p-2 rounded-lg transition-colors ${saved ? 'text-red-500' : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500'}`}>
              <Heart className={`w-4 h-4 ${saved ? 'fill-red-500' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 lg:py-8 pb-consumer-cta">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Business header */}
        <div className="card p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden flex-shrink-0 bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center border border-gray-100 dark:border-gray-800">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold text-primary-600 dark:text-primary-400">
                  {business.name?.[0]}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center gap-1.5 min-w-0">
                <span className="truncate min-w-0">{business.name}</span>
                {verified && <BadgeCheck title="Verified Business" className="w-5 h-5 text-blue-500 flex-shrink-0" />}
              </h1>
              {business.category && (
                <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400 mt-1">
                  {business.category}
                </span>
              )}
              {/* Rating */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200 dark:text-gray-700'}`} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  {avgRating > 0 ? avgRating.toFixed(1) : 'New'}
                </span>
                {totalReviews > 0 && (
                  <span className="text-sm text-gray-400">({totalReviews} review{totalReviews !== 1 ? 's' : ''})</span>
                )}
                {followerCount > 0 && (
                  <span className="flex items-center gap-1 text-sm text-gray-400">
                    <Users className="w-3.5 h-3.5" />{followerCount} follower{followerCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {business.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-4 leading-relaxed">
              {business.description}
            </p>
          )}

          {/* Contact info */}
          <div className="mt-4 space-y-2.5 min-w-0">
            {business.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors group"
              >
                <MapPin className="w-4 h-4 flex-shrink-0 text-primary-500" />
                <span className="group-hover:underline break-words">{business.location}</span>
              </a>
            )}
            {business.phone && (
              <a href={`tel:${business.phone}`} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-colors">
                <Phone className="w-4 h-4 flex-shrink-0 text-primary-500" />
                <span className="break-all">{business.phone}</span>
              </a>
            )}
            {business.email && (
              <a href={`mailto:${business.email}`} className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-primary-600 transition-colors">
                <Mail className="w-4 h-4 flex-shrink-0 text-primary-500" />
                <span className="break-all">{business.email}</span>
              </a>
            )}
            {hours && formatHours(hours) && (
              <div className="flex items-start gap-2 text-sm">
                <Clock className="w-4 h-4 flex-shrink-0 text-primary-500 mt-0.5" />
                <div>
                  <span className="text-gray-500 dark:text-gray-400">{formatHours(hours)}</span>
                  {isOpenNow(hours) !== null && (
                    <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      isOpenNow(hours)
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                        : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                    }`}>
                      {isOpenNow(hours) ? 'Open now' : 'Closed'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Services */}
        <div className="card p-4 sm:p-5">
          <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary-500" />
            Services
          </h2>
          <div className="space-y-2">
            {services.length === 0 ? (
              <p className="text-sm text-gray-400">No services listed yet</p>
            ) : services.map(s => (
              <Link
                key={s.id}
                to={`/book/${slug}`}
                state={{ prefill_service_id: s.id, from: location }}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 border border-transparent hover:border-primary-200 dark:hover:border-primary-800 transition-all group"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-gray-900 dark:text-white truncate">{s.name}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <Clock className="w-3 h-3 text-gray-400" />
                    <span className="text-xs text-gray-400">{s.duration_minutes} min</span>
                    {Boolean(s.deposit_required) && Number(s.deposit_amount) > 0 && (
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        · £{parseFloat(s.deposit_amount).toFixed(0)} deposit at appointment
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-bold text-gray-900 dark:text-white text-sm">
                    {parseFloat(s.price) > 0 ? `£${parseFloat(s.price).toFixed(0)}` : 'Free'}
                  </span>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-primary-500 transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Posts */}
        {posts.length > 0 && (
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 px-1">
              <Megaphone className="w-4 h-4 text-primary-500" />
              Posts
            </h2>
            {posts.map(post => {
              const postMeta = { photo: 'Portfolio', offer: 'Offer', availability: 'Slots open', announcement: 'Update' };
              return (
                <div key={post.id} className="card p-3 sm:p-4">
                  {post.image_url && (
                    post.image_url.startsWith('data:video') ? (
                      <video src={post.image_url} className="w-full rounded-lg object-cover max-h-[34rem] mb-3 bg-gray-900" controls playsInline />
                    ) : (
                      <img src={post.image_url} alt="" className="w-full rounded-lg object-cover max-h-[34rem] mb-3" loading="lazy" />
                    )
                  )}
                  {post.offer_text && (
                    <div className="flex items-center gap-2 mb-1">
                      <p className={`text-sm font-bold ${post.is_expired ? 'text-gray-400 line-through' : 'text-amber-600 dark:text-amber-400'}`}>{post.offer_text}</p>
                      {post.is_expired && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-gray-500">Expired</span>}
                    </div>
                  )}
                  {post.caption && <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed break-words">{post.caption}</p>}
                  <div className="flex items-center justify-between gap-3 mt-3">
                    <span className="text-xs text-gray-400">
                      {new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                    </span>
                    {post.cta_label && !post.is_expired && (
                      <Link
                        to={`/book/${slug}`}
                        state={{ from: location, prefill_service_id: post.cta_service_id || undefined }}
                        onClick={() => postsAPI.recordBookClick(post.id).catch(() => {})}
                        className="btn-primary text-xs px-4 py-2"
                      >
                        {post.cta_label}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Photo Gallery */}
        {photos.length > 0 && (
          <div className="card p-4 sm:p-5 lg:col-span-2">
            <h2 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Image className="w-4 h-4 text-primary-500" />
              Gallery
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
              {photos.map(p => (
                <div key={p.id} className="aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                  <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="card p-4 sm:p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              Reviews
            </h2>
            {totalReviews > 0 && (
              <span className="text-sm text-gray-400">{totalReviews} total</span>
            )}
          </div>

          {totalReviews > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-4 mb-5 pb-5 border-b border-gray-100 dark:border-gray-800">
              <div className="text-center">
                <p className="text-4xl font-black text-gray-900 dark:text-white">{avgRating.toFixed(1)}</p>
                <div className="flex items-center gap-0.5 mt-1 justify-center">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-3 h-3 ${s <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-1">{totalReviews} reviews</p>
              </div>
              <div className="flex-1 space-y-1.5">
                {[5, 4, 3, 2, 1].map(n => (
                  <div key={n} className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-2">{n}</span>
                    <StarBar count={parseInt(reviewData.stats?.[`${['one','two','three','four','five'][n - 1]}_star`] || 0)} total={totalReviews} />
                    <span className="text-xs text-gray-400 w-4 text-right">
                      {reviewData.stats?.[`${['one','two','three','four','five'][n - 1]}_star`] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {reviewData.reviews.length === 0 ? (
            <div className="text-center py-6">
              <Star className="w-8 h-8 text-gray-200 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No reviews yet — be the first!</p>
            </div>
          ) : (
            <div>
              {reviewData.reviews.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          )}
        </div>

        </div>

        {/* Sticky book CTA — sits above the bottom nav (accounts for iOS safe area) */}
        <div className="fixed left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-t border-gray-100 dark:border-gray-800 z-40 shadow-[0_-8px_24px_rgba(15,23,42,0.06)]" style={{ bottom: 'var(--consumer-nav-height)' }}>
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 grid grid-cols-2 gap-2">
            <button onClick={handleMessage} className="flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-lg border border-primary-600 text-primary-600 dark:text-primary-400 dark:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-all">
              <Sparkles className="w-4 h-4" />
              Message
            </button>
            <Link to={`/book/${slug}`} state={{ from: location }} className="btn-primary flex items-center justify-center gap-2 py-3 text-sm">
              <CheckCircle className="w-4 h-4" />
              Book now
            </Link>
          </div>
        </div>
      </div>

      <ConsumerBottomNav />
    </div>
  );
}
