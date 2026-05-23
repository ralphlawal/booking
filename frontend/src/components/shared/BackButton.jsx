import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

function normalizeTarget(target) {
  if (!target) return null;
  if (typeof target === 'string') return target;
  const { pathname = '/', search = '', hash = '' } = target;
  return `${pathname}${search}${hash}`;
}

export default function BackButton({
  fallback = '/',
  children = 'Back',
  className = 'flex items-center gap-1.5 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors',
  iconClassName = 'w-4 h-4',
  replace = true,
  ...props
}) {
  const navigate = useNavigate();
  const location = useLocation();

  const goBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === 'number' && idx > 0) {
      navigate(-1);
      return;
    }

    const from = normalizeTarget(location.state?.from);
    navigate(from || fallback, { replace });
  };

  return (
    <button type="button" onClick={goBack} className={className} {...props}>
      <ArrowLeft className={iconClassName} />
      {children && <span className="text-sm font-medium">{children}</span>}
    </button>
  );
}
