import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ErrorState, SkeletonList } from '../../components/shared/AsyncState';
import { intelligenceAPI } from '../../services/api';
import { businessCurrencySymbol } from '../../utils/currency';

const SYM = businessCurrencySymbol();

const emptyInsights = {
  revenue_7d: 0,
  booking_trend: { current: 0, change_percent: null },
  popular_services: [],
  highest_value_customers: [],
  staff_performance: [],
  customers_due: 0,
  cancellation_trends: { cancelled: 0, no_shows: 0 },
};

export default function Intelligence() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setError(false);
    try { setData(await intelligenceAPI.overview()); } catch { setError(true); }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!data && !error) return <div className="space-y-5"><div className="h-16 w-72 animate-pulse rounded-2xl" style={{ background: 'var(--bam-surface)' }} /><SkeletonList rows={5} /></div>;
  if (error) return <ErrorState title="Intelligence is unavailable right now." description="We couldn't load your business insights. Please try again." onRetry={load} />;

  const insights = { ...emptyInsights, ...(data.insights || {}) };
  const trend = { ...emptyInsights.booking_trend, ...(insights.booking_trend || {}) };
  const cancellations = { ...emptyInsights.cancellation_trends, ...(insights.cancellation_trends || {}) };
  const recommendations = Array.isArray(data.recommendations) ? data.recommendations : [];

  return <div className="space-y-6 animate-fade-in">
    <div><h1 className="text-2xl font-bold" style={{ color: 'var(--bam-text)' }}>BookAm Intelligence</h1><p className="text-sm mt-1" style={{ color: 'var(--bam-text-muted)' }}>Recommendations grounded in your BookAm business data</p></div>
    {!data.sufficient_data && <div className="p-4 rounded-2xl bg-amber-50 text-amber-800">I don't have enough data to answer detailed questions yet.</div>}
    <div className="grid sm:grid-cols-3 gap-3"><Card label="Revenue (7 days)" value={`${SYM}${Number(insights.revenue_7d || 0).toFixed(2)}`} /><Card label="Bookings this week" value={trend.current || 0} /><Card label="Booking trend" value={trend.change_percent == null ? '—' : `${trend.change_percent}%`} /></div>
    <section><h2 className="font-bold mb-3" style={{ color: 'var(--bam-text)' }}>Recommendations</h2><div className="space-y-2">{recommendations.map((recommendation, index) => <Recommendation key={index} recommendation={recommendation} />)}{!recommendations.length && <p style={{ color: 'var(--bam-text-muted)' }}>No data-backed recommendations yet.</p>}</div></section>
    <section className="grid lg:grid-cols-2 gap-5"><List title="Popular services" rows={(insights.popular_services || []).map((item) => `${item.name} — ${SYM}${Number(item.revenue || 0).toFixed(2)} · ${item.bookings} bookings`)} /><List title="Highest-value customers" rows={(insights.highest_value_customers || []).map((item) => `${item.full_name} — ${SYM}${Number(item.lifetime_value || 0).toFixed(2)}`)} /><List title="Staff performance" rows={(insights.staff_performance || []).map((item) => `${item.name} — ${item.bookings} bookings (last 30 days)`)} /><List title="Retention & attendance" rows={[`${insights.customers_due || 0} customers due for an appointment`, `${cancellations.cancelled || 0} cancellations in 30 days`, `${cancellations.no_shows || 0} no-shows in 30 days`]} /></section>
  </div>;
}

function Recommendation({ recommendation }) {
  const actionPath = recommendation.action === 'open_availability' ? '/admin/settings' : recommendation.action === 'adjust_service' ? '/admin/services' : recommendation.action === 'message_customers' ? '/admin/messages' : '/admin/bookings';
  return <div className="p-4 rounded-2xl flex justify-between gap-3" style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}><p>{recommendation.text}</p><Link className="text-sm font-bold text-primary-600 whitespace-nowrap" to={actionPath}>Act</Link></div>;
}

function Card({ label, value }) { return <div className="p-5 rounded-2xl" style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}><p className="text-xs" style={{ color: 'var(--bam-text-muted)' }}>{label}</p><p className="text-2xl font-bold mt-1" style={{ color: 'var(--bam-text)' }}>{value}</p></div>; }
function List({ title, rows }) { return <div className="p-5 rounded-2xl" style={{ background: 'var(--bam-surface)', border: '1px solid var(--bam-border)' }}><h2 className="font-bold mb-3" style={{ color: 'var(--bam-text)' }}>{title}</h2>{rows.length ? rows.map((row, index) => <p key={index} className="py-2 text-sm border-b last:border-0" style={{ color: 'var(--bam-text-muted)', borderColor: 'var(--bam-border)' }}>{row}</p>) : <p className="text-sm" style={{ color: 'var(--bam-text-muted)' }}>I don't have enough data to answer that yet.</p>}</div>; }
