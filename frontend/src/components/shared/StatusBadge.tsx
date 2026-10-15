'use client';

import React from 'react';
import { Badge } from '../ui/badge';
import { useTranslation } from '@/lib/i18n';

export interface StatusBadgeProps {
  status: boolean | string;
  label?: string;
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label, className = '' }) => {
  const { t } = useTranslation();

  if (typeof status === 'boolean') {
    return status ? (
      <Badge variant="success" className={className}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        {label || t('active')}
      </Badge>
    ) : (
      <Badge variant="neutral" className={className}>
        <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
        {label || t('inactive')}
      </Badge>
    );
  }

  const s = String(status).toUpperCase();

  if (s === 'ACTIVE' || s === 'TRIAL') {
    return (
      <Badge variant="success" className={className}>
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        {label || (s === 'TRIAL' ? 'ট্রায়াল (Trial)' : t('active'))}
      </Badge>
    );
  }

  if (s === 'SUSPENDED' || s === 'OVERDUE' || s === 'FAILED') {
    return (
      <Badge variant="danger" className={className}>
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        {label || (s === 'SUSPENDED' ? 'স্থগিত (Suspended)' : s)}
      </Badge>
    );
  }

  if (s === 'PAYMENT_DUE' || s === 'GRACE' || s === 'PENDING') {
    return (
      <Badge variant="warning" className={className}>
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
        {label || s}
      </Badge>
    );
  }

  return (
    <Badge variant="neutral" className={className}>
      {label || s}
    </Badge>
  );
};
