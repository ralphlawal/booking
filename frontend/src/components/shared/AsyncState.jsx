import React from 'react';

export function SkeletonList({ rows = 4, className = '' }) {
  return <div className={`space-y-3 ${className}`}>{Array.from({ length: rows }, (_, i) => <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: 'var(--bam-surface-soft)' }} />)}</div>;
}

export function EmptyState({ icon = '✦', title, description, action }) {
  return <div className="rounded-2xl border p-8 sm:p-10 text-center animate-fade-in" style={{ background: 'var(--bam-surface)', borderColor: 'var(--bam-border)' }}><div className="text-3xl mb-3">{icon}</div><p className="font-bold" style={{ color: 'var(--bam-text)' }}>{title}</p>{description && <p className="text-sm mt-1 max-w-sm mx-auto" style={{ color: 'var(--bam-text-muted)' }}>{description}</p>}{action && <div className="mt-4">{action}</div>}</div>;
}

export function ErrorState({ onRetry, title = 'Something went wrong.', description = 'Please try again.' }) {
  return <EmptyState icon="⚠️" title={title} description={description} action={onRetry && <button className="btn-secondary" onClick={onRetry}>Try again</button>} />;
}
