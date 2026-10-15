'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export function Breadcrumbs() {
  const pathname = usePathname();
  const { t } = useTranslation();

  if (!pathname || pathname === '/' || pathname === '/dashboard') {
    return null;
  }

  const segments = pathname.split('/').filter(Boolean);

  const segmentLabels: Record<string, string> = {
    roles: t('nav.roles'),
    users: t('nav.users'),
    branches: t('nav.branches'),
    profile: t('nav.profile'),
    dev: 'Dev',
    components: t('nav.componentDocs'),
    dashboard: t('nav.dashboard'),
  };

  return (
    <nav className="flex items-center text-xs text-slate-500 dark:text-slate-400 py-2.5 px-1" aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1.5">
        <li className="inline-flex items-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
          >
            <Home className="w-3.5 h-3.5" />
            <span>{t('nav.dashboard')}</span>
          </Link>
        </li>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;
          const label = segmentLabels[segment] || segment;

          return (
            <li key={href} className="inline-flex items-center space-x-1.5">
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              {isLast ? (
                <span className="font-semibold text-slate-800 dark:text-slate-200" aria-current="page">
                  {label}
                </span>
              ) : (
                <Link
                  href={href}
                  className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                >
                  {label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
