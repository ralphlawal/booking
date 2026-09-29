import React, { useEffect, useState, useMemo } from 'react';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import {
  MapPin, Phone, Mail, Star, Clock, ChevronRight,
  Calendar, Share2, Heart, CheckCircle, Sparkles, Image, MessageSquare,
  BadgeCheck, Megaphone, UserPlus, UserCheck, Users,
} from 'lucide-react';
import { businessAPI, servicesAPI, reviewsAPI, consumerAPI, availabilityAPI, consumerChatAPI, photosAPI, postsAPI, followsAPI, aiAPI } from '../../services/api';
import { useCustomerAuth } from '../../context/CustomerAuthContext';
import { LOGO_BLUE_H } from '../../config/logos';
import ConsumerBottomNav from '../../components/layout/ConsumerBottomNav';
import BackButton from '../../components/shared/BackButton';
import AIChatBooking from '../../components/shared/AIChatBooking';
import toast from 'react-hot-toast';
import { openExternalLink, publicWebUrl, shareContent } from '../../services/nativeBridge';

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
    <div className="h-1.5 flex-1 bg-gray-100 rounded-full overflow-hidden">
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
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
          <span className="text-xs font-bold text-primary-700">{initials}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm text-gray-900">
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
                className={`w-3.5 h-3.5 ${s <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`}
              />
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
  const [eligibleBookingId, setEligibleBookingId] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(false);

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
    const url = publicWebUrl(`/book/${slug}`);
    try {
      await shareContent({ title: business?.name || 'BookAm', url });
      if (!navigator.share) toast.success('Link copied!');
    } catch {
      toast.error('Could not share this booking page');
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
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bam-bg)' }}>
      <div className="w-8 h-8 border-[3px] border-primary-600 border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-4" style={{ background: 'var(--bam-bg)' }}>
      <p className="text-xl font-bold" style={{ color: 'var(--bam-text)' }}>Business not found</p>
      <Link to="/explore" className="btn-primary text-sm">Browse services</Link>
    </div>
  );

  const avgRating = parseFloat(reviewData.stats?.avg_rating || 0);
  const totalReviews = parseInt(reviewData.stats?.total || 0);
  const verified = !!business.is_verified || business.verification_status === 'verified';
  const heroPhotos = [
    ...photos.map(p => p.url),
    ...posts.filter(p => p.image_url && !p.image_url.startsWith('data:video')).map(p => p.image_url),
  ].slice(0, 5);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bam-bg)' }}>
      {/* Nav */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl" style={{ background: 'rgba(255,255,255,0.92)', borderBottom: '1px solid var(--bam-border)' }}>
        <div className="max-w-5xl mx-auto px-3 sm:px-6 min-h-14 py-2 flex items-center justify-between gap-2">
          <BackButton fallback="/explore" />
          <Link to="/">
            <img src={LOGO_BLUE_H} alt="BookAm" className="h-6 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              onClick={handleFollow}
              disabled={followLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all disabled:opacity-60 whitespace-nowrap"
              style={following
                ? { background: '#5B3FEA', color: '#fff' }
                : { background: 'rgba(91,63,234,0.08)', color: '#5B3FEA' }
              }
            >
              {following ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
              <span className="hidden min-[380px]:inline">{following ? 'Following' : 'Follow'}</span>
            </button>
            <button onClick={handleShare} className="p-2 rounded-xl transition-colors" style={{ color: 'var(--bam-text-muted)' }}
              onMouseEnter={e => e.currentTarget.style.background='var(--bam-surface-soft)'}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <Share2 className="w-4 h-4" />
            </button>
            <button onClick={handleSave} disabled={saved}
              className="p-2 rounded-xl transition-colors"
              style={{ color: saved ? '#ef4444' : 'var(--bam-text-muted)' }}
              onMouseEnter={e => !saved && (e.currentTarget.style.background='var(--bam-surface-soft)')}
              onMouseLeave={e => e.currentTarget.style.background='transparent'}>
              <Heart className={`w-4 h-4 ${saved ? 'fill-red-500' : ''}`} />
            </button>
          </div>
        </div>
      </nav>

      {heroPhotos.length > 0 && (
        <div style={{ background: '#fff', borderBottom: '1px solid var(--bam-border)' }}>
          <div className="max-w-5xl mx-auto grid grid-cols-4 sm:grid-cols-5 gap-0.5 h-44 sm:h-64 lg:h-80">
            <div className="col-span-2 sm:col-span-3 row-span-2 overflow-hidden" style={{ background: 'var(--bam-surface-soft)' }}>
              <img src={heroPhotos[0]} alt="" className="h-full w-full object-cover hover:scale-105 transition-transform duration-500" />
            </div>
            {heroPhotos.slice(1, 5).map((src, idx) => (
              <div key={src + idx} className="overflow-hidden" style={{ background: 'var(--bam-surface-soft)' }}>
                <img src={src} alt="" className="h-full w-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 lg:py-8 pb-consumer-cta">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        {/* Business header */}
        <div className="rounded-2xl p-4 sm:p-6 lg:col-span-2" style={{ background: '#fff', border: '1px solid var(--bam-border)', boxShadow: '0 2px 16px rgba(91,63,234,0.06)' }}>
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex-shrink-0 flex items-center justify-center" style={{ background: 'rgba(91,63,234,0.06)', border: '1px solid var(--bam-border)' }}>
              {business.logo_url ? (
                <img src={business.logo_url} alt={business.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-3xl font-bold" style={{ color: '#5B3FEA' }}>
                  {business.name?.[0]}
                </span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-1.5 min-w-0 tracking-tight" style={{ color: 'var(--bam-text)' }}>
                <span className="truncate min-w-0">{business.name}</span>
                {verified && <BadgeCheck title="Verified Business" className="w-5 h-5 text-blue-500 flex-shrink-0" />}
              </h1>
              {business.category && (
                <span className="inline-block text-xs px-2.5 py-0.5 rounded-full mt-1 font-semibold" style={{ background: 'rgba(91,63,234,0.08)', color: '#5B3FEA' }}>
                  {business.category}
                </span>
              )}
              {/* Rating */}
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-2">
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} className={`w-4 h-4 ${s <= Math.round(avgRating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />
                  ))}
                </div>
                <span className="text-sm font-bold" style={{ color: 'var(--bam-text)' }}>
                  {avgRating > 0 ? avgRating.toFixed(1) : 'New'}
                </span>
                {totalReviews > 0 && (
                  <span className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>({totalReviews} review{totalReviews !== 1 ? 's' : ''})</span>
                )}
                {followerCount > 0 && (
                  <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--bam-text-muted)' }}>
                    <Users className="w-3.5 h-3.5" />{followerCount} follower{followerCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {business.description && (
            <p className="text-sm mt-4 leading-relaxed" style={{ color: 'var(--bam-text-muted)' }}>
              {business.description}
            </p>
          )}

          {/* Location preview. A no-token build retains a real directions
              action rather than making the location disappear altogether. */}
          {business.latitude && business.longitude && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location || `${business.latitude},${business.longitude}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(event) => openExternalLink(event, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location || `${business.latitude},${business.longitude}`)}`)}
              className="block mt-4 rounded-xl overflow-hidden border border-gray-200 shadow-sm hover:opacity-90 transition-opacity"
            >
              {MAPBOX_TOKEN ? (
                <img
                  src={`https://api.mapbox.com/styles/v1/mapbox/streets-v12/static/pin-s+3B82F6(${business.longitude},${business.latitude})/${business.longitude},${business.latitude},14,0/680x180@2x?access_token=${MAPBOX_TOKEN}`}
                  alt={`Map showing ${business.name}`}
                  className="w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="min-h-28 p-5 flex items-end" style={{ background: 'radial-gradient(circle at 72% 24%, rgba(91,62,234,0.18) 0%, transparent 60%), linear-gradient(135deg, #eef2ff, #e0e7ff 48%, #f8fafc)' }}>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/95 px-3 py-2 text-xs font-bold text-gray-800 shadow-lg">
                    <MapPin className="w-4 h-4 text-primary-600" /> Open directions
                  </span>
                </div>
              )}
            </a>
          )}

          {/* Contact info */}
          <div className="mt-5 grid gap-2 sm:grid-cols-2 min-w-0 pt-4" style={{ borderTop: '1px solid var(--bam-border)' }}>
            {business.location && (
              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(event) => openExternalLink(event, `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(business.location)}`)}
                className="flex items-center gap-2.5 text-sm transition-colors group"
                style={{ color: 'var(--bam-text-muted)' }}
              >
                <MapPin className="w-4 h-4 flex-shrink-0" style={{ color: '#5B3FEA' }} />
                <span className="group-hover:underline break-words">{business.location}</span>
              </a>
            )}
            {business.phone && (
              <a href={`tel:${business.phone}`} className="flex items-center gap-2.5 text-sm transition-colors" style={{ color: 'var(--bam-text-muted)' }}>
                <Phone className="w-4 h-4 flex-shrink-0" style={{ color: '#5B3FEA' }} />
                <span className="break-all">{business.phone}</span>
              </a>
            )}
            {business.email && (
              <a href={`mailto:${business.email}`} className="flex items-center gap-2.5 text-sm transition-colors" style={{ color: 'var(--bam-text-muted)' }}>
                <Mail className="w-4 h-4 flex-shrink-0" style={{ color: '#5B3FEA' }} />
                <span className="break-all">{business.email}</span>
              </a>
            )}
            {hours && formatHours(hours) && (
              <div className="flex items-start gap-2.5 text-sm">
                <Clock className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#5B3FEA' }} />
                <div>
                  <span style={{ color: 'var(--bam-text-muted)' }}>{formatHours(hours)}</span>
                  {isOpenNow(hours) !== null && (
                    <span className={`ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      isOpenNow(hours)
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
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
        <div className="rounded-2xl p-4 sm:p-5" style={{ background: '#fff', border: '1px solid var(--bam-border)', boxShadow: '0 2px 16px rgba(91,63,234,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-black text-xl flex items-center gap-2" style={{ color: 'var(--bam-text)' }}>
              <Calendar className="w-4 h-4" style={{ color: '#5B3FEA' }} />
              Services
            </h2>
            <AIChatBooking slug={slug} businessName={business.name} />
          </div>
          <div className="space-y-2">
            {services.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>No services listed yet</p>
            ) : services.map(s => (
              <Link
                key={s.id}
                to={`/book/${slug}`}
                state={{ prefill_service_id: s.id, from: location }}
                className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 p-3.5 rounded-xl transition-all group"
                style={{ background: 'var(--bam-surface-soft)', border: '1px solid var(--bam-border)' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(91,63,234,0.05)'; e.currentTarget.style.borderColor='rgba(91,63,234,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='var(--bam-surface-soft)'; e.currentTarget.style.borderColor='var(--bam-border)'; }}
              >
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: 'var(--bam-text)' }}>{s.name}</p>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                    <Clock className="w-3 h-3" style={{ color: 'var(--bam-text-muted)' }} />
                    <span className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>{s.duration_minutes} min</span>
                    {Boolean(s.deposit_required) && Number(s.deposit_amount) > 0 && (
                      <span className="text-xs text-amber-600">
                        · £{parseFloat(s.deposit_amount).toFixed(0)} deposit
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-bold text-sm whitespace-nowrap" style={{ color: 'var(--bam-text)' }}>
                    {parseFloat(s.price) > 0 ? `£${parseFloat(s.price).toFixed(0)}` : 'Free'}
                  </span>
                  <span className="hidden sm:inline-flex text-white text-xs font-bold px-3 py-1.5 rounded-lg" style={{ background: '#5B3FEA' }}>Book</span>
                  <ChevronRight className="w-4 h-4 transition-colors sm:hidden" style={{ color: 'var(--bam-text-muted)' }} />
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Posts */}
        {posts.length > 0 && (
          <div className="lg:col-span-2 space-y-3">
            <h2 className="font-bold flex items-center gap-2 px-1" style={{ color: 'var(--bam-text)' }}>
              <Megaphone className="w-4 h-4" style={{ color: '#5B3FEA' }} />
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
                      <p className={`text-sm font-bold ${post.is_expired ? 'text-gray-400 line-through' : 'text-amber-600'}`}>{post.offer_text}</p>
                      {post.is_expired && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">Expired</span>}
                    </div>
                  )}
                  {post.caption && <p className="text-sm text-gray-700 leading-relaxed break-words">{post.caption}</p>}
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
          <div className="rounded-2xl p-4 sm:p-5 lg:col-span-2" style={{ background: '#fff', border: '1px solid var(--bam-border)', boxShadow: '0 2px 16px rgba(91,63,234,0.06)' }}>
            <h2 className="font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--bam-text)' }}>
              <Image className="w-4 h-4" style={{ color: '#5B3FEA' }} />
              Gallery
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5 sm:gap-2">
              {photos.map(p => (
                <div key={p.id} className="aspect-square rounded-xl overflow-hidden" style={{ background: 'var(--bam-surface-soft)' }}>
                  <img src={p.url} alt={p.caption || ''} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Reviews */}
        <div className="rounded-2xl p-4 sm:p-5 lg:col-span-2" style={{ background: '#fff', border: '1px solid var(--bam-border)', boxShadow: '0 2px 16px rgba(91,63,234,0.06)' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold flex items-center gap-2" style={{ color: 'var(--bam-text)' }}>
              <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
              Reviews
            </h2>
            {totalReviews > 0 && (
              <span className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>{totalReviews} total</span>
            )}
          </div>

          {/* AI Review Summary */}
          {totalReviews >= 3 && (
            <div className="mb-4">
              {aiSummary ? (
                <div className="flex gap-2.5 p-3.5 bg-violet-50 border border-violet-100 rounded-lg">
                  <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-violet-900 leading-relaxed">{aiSummary}</p>
                </div>
              ) : (
                <button
                  onClick={async () => {
                    setAiSummaryLoading(true);
                    try {
                      const data = await aiAPI.reviewSummary(slug);
                      if (data?.summary) setAiSummary(data.summary);
                    } catch {}
                    setAiSummaryLoading(false);
                  }}
                  disabled={aiSummaryLoading}
                  className="flex items-center gap-2 text-xs text-violet-600 font-semibold hover:text-violet-700 transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {aiSummaryLoading ? 'Generating summary…' : 'AI summary of reviews'}
                </button>
              )}
            </div>
          )}

          {totalReviews > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-[auto_minmax(0,1fr)] gap-4 mb-5 pb-5 border-b border-gray-100">
              <div className="text-center">
                <p className="text-4xl font-black text-gray-900">{avgRating.toFixed(1)}</p>
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

          {/* Review submission form — shown when consumer has a completed unreviewed booking */}
          {eligibleBookingId && !reviewDone && (
            <form onSubmit={handleReviewSubmit} className="mb-5 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-sm font-semibold text-amber-900 mb-3">You visited — leave a review</p>
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(s => (
                  <button key={s} type="button" onClick={() => setReviewRating(s)}
                    className={`text-2xl leading-none transition-transform ${s <= reviewRating ? 'scale-110' : ''}`}>
                    <Star className={`w-7 h-7 ${s <= reviewRating ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400 mb-3"
                rows={3}
                placeholder="Share your experience (optional)"
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
              />
              <button type="submit" disabled={!reviewRating || reviewSubmitting}
                className="btn-primary text-sm py-2 disabled:opacity-50">
                {reviewSubmitting ? 'Submitting…' : 'Submit review'}
              </button>
            </form>
          )}

          {reviewData.reviews.length === 0 ? (
            <div className="text-center py-6">
              <Star className="w-8 h-8 text-gray-200 mx-auto mb-2" />
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
        <div
          className="lg:hidden fixed left-0 right-0 z-40 backdrop-blur-xl"
          style={{
            bottom: 'var(--consumer-nav-height)',
            background: 'rgba(255,255,255,0.95)',
            borderTop: '1px solid var(--bam-border)',
            boxShadow: '0 -8px 32px rgba(91,63,234,0.08)',
          }}
        >
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex gap-2">
            <button
              onClick={handleMessage}
              className="flex items-center justify-center gap-2 py-3 px-3.5 text-sm font-semibold rounded-xl transition-all flex-shrink-0"
              style={{ border: '1.5px solid rgba(91,63,234,0.25)', color: '#5B3FEA', background: 'rgba(91,63,234,0.04)' }}
            >
              <MessageSquare className="w-4 h-4" />
            </button>
            <AIChatBooking slug={slug} businessName={business.name} />
            <Link
              to={`/book/${slug}`}
              state={{ from: location }}
              className="flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-xl flex-1 transition-all"
              style={{ background: '#5B3FEA', color: '#fff', boxShadow: '0 4px 14px rgba(91,63,234,0.3)' }}
            >
              <CheckCircle className="w-4 h-4" />
              Book Now
            </Link>
          </div>
        </div>
      </div>

      <ConsumerBottomNav />
    </div>
  );
}
