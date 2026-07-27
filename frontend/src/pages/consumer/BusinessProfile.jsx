import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Star, Clock, ChevronRight,
  Calendar, Share2, Heart, CheckCircle, Sparkles, Image, MessageSquare,
  BadgeCheck, Megaphone, UserPlus, UserCheck, Users, Car, Home,
} from 'lucide-react';
import {
  businessAPI, servicesAPI, reviewsAPI, consumerAPI, availabilityAPI,
  consumerChatAPI, photosAPI, postsAPI, followsAPI, resolveMediaUrl, postMediaUrl,
} from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import BackButton from '../../components/shared/BackButton';
import toast from 'react-hot-toast';

const DAY_SHORT = { Monday:'Mon', Tuesday:'Tue', Wednesday:'Wed', Thursday:'Thu', Friday:'Fri', Saturday:'Sat', Sunday:'Sun' };
const DAY_ORDER = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

function formatHours(avail) {
  if (!avail?.working_days?.length) return null;
  const wd = avail.working_days.map(d => d.toLowerCase());
  const days = DAY_ORDER.filter(d => wd.includes(d.toLowerCase()));
  const fmt = (t) => {
    const [h, m] = t.split(':').map(Number);
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return m === 0 ? `${h12}${ampm}` : `${h12}:${String(m).padStart(2,'0')}${ampm}`;
  };
  const timeStr = avail.opening_time && avail.closing_time
    ? `${fmt(avail.opening_time)} – ${fmt(avail.closing_time)}` : null;
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
    <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
      <div className="h-full bg-amber-400 rounded-full" style={{ width: total > 0 ? `${(count / total) * 100}%` : '0%' }} />
    </div>
  );
}

function ReviewCard({ review }) {
  const initials = (review.reviewer_name || 'A').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary-700">{initials}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-gray-900">{review.reviewer_name || 'Anonymous'}</p>
            <span className="text-xs text-gray-400">
              {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
          <div className="flex items-center gap-0.5 my-1">
            {[1, 2, 3, 4, 5].map(s => (
              <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
            ))}
          </div>
          {review.comment && <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>}
          {review.reply_text && (
            <div className="mt-3 pl-3 border-l-2 border-primary-200">
              <p className="text-xs font-semibold text-primary-700 flex items-center gap-1 mb-0.5">
                <MessageSquare className="w-3 h-3" /> Business reply
              </p>
              <p className="text-xs text-gray-600 leading-relaxed">{review.reply_text}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const TABS = [
  { id: 'about', label: 'About' },
  { id: 'services', label: 'Services' },
  { id: 'reviews', label: 'Reviews' },
  { id: 'gallery', label: 'Gallery' },
];

export default function BusinessProfile() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { consumer } = useCustomerAuth();
  const tabRef = useRef(null);

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
  const [eligibleBookingId, setEligibleBookingId] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [activeTab, setActiveTab] = useState('about');

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
      consumer ? reviewsAPI.getEligible(slug).catch(() => ({ booking_id: null })) : Promise.resolve({ booking_id: null }),
    ])
      .then(([biz, svcs, rev, avail, pics, pts, followData, eligibleData]) => {
        setBusiness(biz);
        setServices((svcs.filter ? svcs.filter(s => s.is_active) : svcs));
        setReviewData(rev);
        setHours(avail);
        setPhotos(Array.isArray(pics) ? pics : []);
        setPosts(Array.isArray(pts) ? pts : []);
        setFollowing(followData?.following ?? false);
        setFollowerCount(followData?.follower_count ?? 0);
        setEligibleBookingId(eligibleData?.booking_id || null);
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewRating || !eligibleBookingId) return;
    setReviewSubmitting(true);
    try {
      await reviewsAPI.create({ booking_id: eligibleBookingId, rating: reviewRating, comment: reviewComment });
      setReviewDone(true);
      setEligibleBookingId(null);
      const updated = await reviewsAPI.getForBusiness(slug).catch(() => reviewData);
      setReviewData(updated);
      toast.success('Review submitted — thank you!');
    } catch (err) {
      toast.error(err?.message || 'Failed to submit review');
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleShare = async () => {
    const url = window.location.origin + `/book/${slug}`;
    if (navigator.share) await navigator.share({ title: business?.name, url }).catch(() => {});
    else { await navigator.clipboard.writeText(url); toast.success('Link copied!'); }
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
      const result = following ? await followsAPI.unfollow(slug) : await followsAPI.follow(slug);
      setFollowing(result.following);
      setFollowerCount(result.follower_count);
      toast.success(result.following ? 'Following!' : 'Unfollowed');
    } catch { toast.error('Could not update follow'); }
    finally { setFollowLoading(false); }
  };

  const switchTab = (id) => {
    setActiveTab(id);
    tabRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4">
      <p className="text-xl font-bold text-gray-900">Business not found</p>
      <Link to="/explore" className="btn-primary text-sm">Browse services</Link>
    </div>
  );

  const avgRating = parseFloat(reviewData.stats?.avg_rating || 0);
  const totalReviews = parseInt(reviewData.stats?.total || 0);
  const verified = !!business.is_verified || business.verification_status === 'verified';
  const heroPhotos = [
    ...photos.map(p => resolveMediaUrl(p.url)),
    ...posts.filter(p => p.has_media && p.media_type !== 'video').map(p => postMediaUrl(p.id)),
  ].slice(0, 5);
  const galleryAll = [...photos.map(p => ({ src: resolveMediaUrl(p.url), caption: p.caption }))];

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-xl border-b border-gray-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 min-h-14 py-2 flex items-center justify-between gap-2">
          <BackButton fallback="/explore" />
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="Glam Genie" className="h-6 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-1.5">
            <button onClick={handleFollow} disabled={followLoading}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60 whitespace-nowrap ${
                following ? 'bg-primary-600 text-white' : 'border-2 border-primary-600 text-primary-600 hover:bg-primary-50'}`}>
              {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span className="hidden min-[380px]:inline">{following ? 'Following' : 'Follow'}</span>
            </button>
            <button onClick={handleShare} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
              <Share2 className="w-4 h-4 text-gray-500" />
            </button>
            <button onClick={handleSave} disabled={saved}
              className={`p-2 rounded-xl transition-colors ${saved ? 'text-red-500' : 'hover:bg-gray-100 text-gray-500'}`}>
              <Heart className={`w-4 h-4 ${saved ? 'fill-red-500' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {/* ── Photo hero grid ──────────────────────────────────────────────────── */}
      {heroPhotos.length > 0 ? (
        <div className="bg-black">
          <div className={`max-w-5xl mx-auto grid gap-0.5 ${heroPhotos.length >= 3 ? 'grid-cols-3' : heroPhotos.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}
            style={{ height: heroPhotos.length >= 3 ? 'min(56vw, 420px)' : 'min(60vw, 380px)' }}>
            {heroPhotos.length >= 3 ? (
              <>
                <div className="row-span-2 overflow-hidden">
                  <img src={heroPhotos[0]} alt="" className="w-full h-full object-cover" />
                </div>
                {heroPhotos.slice(1, 5).map((src, i) => (
                  <div key={i} className="overflow-hidden">
                    <img src={src} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ))}
              </>
            ) : heroPhotos.map((src, i) => (
              <div key={i} className="overflow-hidden">
                <img src={src} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="h-48 sm:h-64 bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center">
          <span className="text-8xl font-black text-primary-200">{business.name?.[0]}</span>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 sm:px-6 pb-28">

        {/* ── Identity card ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-b-2xl shadow-md border-x border-b border-gray-100 px-4 sm:px-6 pb-5 -mt-0">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-white overflow-hidden bg-primary-50 flex items-center justify-center flex-shrink-0 shadow-md">
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl font-bold text-primary-500">{business.name?.[0]}</span>
              )}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-1.5 leading-tight">
                <span className="truncate">{business.name}</span>
                {verified && <BadgeCheck className="w-5 h-5 text-blue-500 flex-shrink-0" />}
              </h1>
              {business.category && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary-50 text-primary-600 font-semibold">{business.category}</span>
              )}
            </div>
          </div>

          {/* Rating + followers */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
            <div className="flex items-center gap-1.5">
              {[1,2,3,4,5].map(s => (
                <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
              ))}
              <span className="font-bold text-gray-800 text-sm ml-0.5">{avgRating > 0 ? avgRating.toFixed(1) : 'New'}</span>
              {totalReviews > 0 && <span className="text-xs text-gray-400">({totalReviews})</span>}
            </div>
            {followerCount > 0 && (
              <span className="flex items-center gap-1 text-sm text-gray-400">
                <Users className="w-3.5 h-3.5" />{followerCount} follower{followerCount !== 1 ? 's' : ''}
              </span>
            )}
            {hours && isOpenNow(hours) !== null && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isOpenNow(hours) ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {isOpenNow(hours) ? '● Open now' : 'Closed'}
              </span>
            )}
          </div>

          {business.description && (
            <p className="text-sm text-gray-600 leading-relaxed">{business.description}</p>
          )}

          {/* Book + message CTA (desktop inlined, mobile in sticky bar) */}
          <div className="hidden sm:flex gap-3 mt-4">
            <Link to={`/book/${slug}`} state={{ from: location }}
              className="btn-primary flex items-center gap-2 px-6 py-2.5 text-sm">
              <CheckCircle className="w-4 h-4" /> Book now
            </Link>
            <button onClick={handleMessage}
              className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border border-primary-600 text-primary-600 hover:bg-primary-50 transition-colors">
              <Sparkles className="w-4 h-4" /> Message
            </button>
          </div>
        </div>

        {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
        <div ref={tabRef} className="bg-white rounded-2xl shadow-sm border border-gray-100 mt-3 overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-hide">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => switchTab(tab.id)}
                className={`flex-shrink-0 px-5 py-3.5 text-sm font-bold transition-colors border-b-2 -mb-px ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-700'
                    : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
                {tab.label}
                {tab.id === 'reviews' && totalReviews > 0 && (
                  <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{totalReviews}</span>
                )}
              </button>
            ))}
          </div>

          {/* About tab */}
          {activeTab === 'about' && (
            <div className="p-4 sm:p-6 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                {business.location && (
                  <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors group">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPin className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Location</p>
                      <p className="text-sm font-medium text-gray-700 group-hover:text-primary-700 transition-colors">{business.location}</p>
                    </div>
                  </a>
                )}
                {business.phone && (
                  <a href={`tel:${business.phone}`}
                    className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Phone</p>
                      <p className="text-sm font-medium text-gray-700">{business.phone}</p>
                    </div>
                  </a>
                )}
                {business.email && (
                  <a href={`mailto:${business.email}`}
                    className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-primary-50 transition-colors">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Mail className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Email</p>
                      <p className="text-sm font-medium text-gray-700 break-all">{business.email}</p>
                    </div>
                  </a>
                )}
                {hours && formatHours(hours) && (
                  <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                    <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Clock className="w-4 h-4 text-primary-600" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Hours</p>
                      <p className="text-sm font-medium text-gray-700">{formatHours(hours)}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Posts / announcements */}
              {posts.length > 0 && (
                <div className="space-y-3 pt-2">
                  <h3 className="font-bold text-gray-900 flex items-center gap-2 text-sm">
                    <Megaphone className="w-4 h-4 text-primary-500" /> Latest posts
                  </h3>
                  {posts.map(post => (
                    <div key={post.id} className="rounded-xl border border-gray-100 overflow-hidden bg-white">
                      {post.has_media && (
                        post.media_type === 'video' ? (
                          <video src={postMediaUrl(post.id)} className="w-full max-h-72 object-cover bg-gray-900" controls playsInline />
                        ) : (
                          <img src={postMediaUrl(post.id)} alt="" className="w-full max-h-72 object-cover" loading="lazy" />
                        )
                      )}
                      <div className="p-3">
                        {post.offer_text && (
                          <p className={`text-sm font-bold mb-1 ${post.is_expired ? 'text-gray-400 line-through' : 'text-amber-600'}`}>
                            {post.offer_text}
                          </p>
                        )}
                        {post.caption && <p className="text-sm text-gray-700 leading-relaxed">{post.caption}</p>}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-gray-400">
                            {new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                          </span>
                          {post.cta_label && !post.is_expired && (
                            <Link to={`/book/${slug}`} state={{ from: location, prefill_service_id: post.cta_service_id || undefined }}
                              onClick={() => postsAPI.recordBookClick(post.id).catch(() => {})}
                              className="btn-primary text-xs px-4 py-1.5">
                              {post.cta_label}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Services tab */}
          {activeTab === 'services' && (
            <div className="p-4 sm:p-6">
              {services.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No services listed yet</p>
              ) : (
                <div className="space-y-2.5">
                  {services.map(s => {
                    const hasOnPrem = parseFloat(s.price) > 0;
                    const hasMobile = s.mobile_price && parseFloat(s.mobile_price) > 0;
                    return (
                      <Link key={s.id} to={`/book/${slug}`} state={{ prefill_service_id: s.id, from: location }}
                        className="flex items-center gap-3 p-3.5 rounded-2xl border border-gray-100 bg-white hover:border-primary-200 hover:bg-primary-50/50 transition-all group">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0 group-hover:bg-primary-100 transition-colors">
                          <Calendar className="w-5 h-5 text-primary-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-900 truncate">{s.name}</p>
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                            <span className="text-xs text-gray-400 flex items-center gap-0.5">
                              <Clock className="w-3 h-3" />{s.duration_minutes} min
                            </span>
                            {Boolean(s.deposit_required) && Number(s.deposit_amount) > 0 && (
                              <span className="text-xs text-amber-600">· £{parseFloat(s.deposit_amount).toFixed(0)} deposit</span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          {hasOnPrem && (
                            <span className="flex items-center gap-1 text-xs font-bold text-gray-800 bg-gray-100 px-2 py-0.5 rounded-lg">
                              <Home className="w-3 h-3 text-gray-500" />
                              £{parseFloat(s.price).toFixed(0)}
                            </span>
                          )}
                          {hasMobile && (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg">
                              <Car className="w-3 h-3" />
                              £{parseFloat(s.mobile_price).toFixed(0)}
                            </span>
                          )}
                          {!hasOnPrem && !hasMobile && (
                            <span className="text-sm font-bold text-gray-800">Free</span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-primary-500 transition-colors flex-shrink-0" />
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Reviews tab */}
          {activeTab === 'reviews' && (
            <div className="p-4 sm:p-6">
              {totalReviews > 0 && (
                <div className="flex gap-6 mb-5 pb-5 border-b border-gray-100">
                  <div className="text-center flex-shrink-0">
                    <p className="text-5xl font-black text-gray-900">{avgRating.toFixed(1)}</p>
                    <div className="flex gap-0.5 justify-center mt-1">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{totalReviews} reviews</p>
                  </div>
                  <div className="flex-1 space-y-1.5">
                    {[5,4,3,2,1].map(n => (
                      <div key={n} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-2">{n}</span>
                        <StarBar count={parseInt(reviewData.stats?.[`${['one','two','three','four','five'][n-1]}_star`] || 0)} total={totalReviews} />
                        <span className="text-xs text-gray-400 w-4 text-right">{reviewData.stats?.[`${['one','two','three','four','five'][n-1]}_star`] || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {eligibleBookingId && !reviewDone && (
                <form onSubmit={handleReviewSubmit} className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                  <p className="text-sm font-semibold text-amber-900 mb-3">You visited — leave a review</p>
                  <div className="flex gap-1 mb-3">
                    {[1,2,3,4,5].map(s => (
                      <button key={s} type="button" onClick={() => setReviewRating(s)}>
                        <Star className={`w-7 h-7 transition-transform ${s <= reviewRating ? 'fill-amber-400 text-amber-400 scale-110' : 'text-gray-300'}`} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white resize-none outline-none focus:ring-2 focus:ring-amber-400 mb-3"
                    rows={3} placeholder="Share your experience (optional)"
                    value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                  />
                  <button type="submit" disabled={!reviewRating || reviewSubmitting}
                    className="btn-primary text-sm py-2 disabled:opacity-50">
                    {reviewSubmitting ? 'Submitting…' : 'Submit review'}
                  </button>
                </form>
              )}

              {reviewData.reviews.length === 0 ? (
                <div className="text-center py-10">
                  <Star className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No reviews yet — be the first!</p>
                </div>
              ) : reviewData.reviews.map(r => <ReviewCard key={r.id} review={r} />)}
            </div>
          )}

          {/* Gallery tab */}
          {activeTab === 'gallery' && (
            <div className="p-4 sm:p-6">
              {galleryAll.length === 0 ? (
                <div className="text-center py-10">
                  <Image className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">No photos yet</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
                  {galleryAll.map((p, i) => (
                    <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100">
                      <img src={p.src} alt={p.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sticky mobile CTA */}
      <div className="sm:hidden fixed left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-100 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.06)]" style={{ bottom: 'var(--consumer-nav-height)' }}>
        <div className="px-3 py-2.5 grid grid-cols-2 gap-2">
          <button onClick={handleMessage}
            className="flex items-center justify-center gap-2 py-3 text-sm font-semibold rounded-xl border border-primary-600 text-primary-600 hover:bg-primary-50 transition-all">
            <Sparkles className="w-4 h-4" /> Message
          </button>
          <Link to={`/book/${slug}`} state={{ from: location }}
            className="btn-primary flex items-center justify-center gap-2 py-3 text-sm">
            <CheckCircle className="w-4 h-4" /> Book now
          </Link>
        </div>
      </div>

      <ConsumerBottomNav />
    </div>
  );
}
