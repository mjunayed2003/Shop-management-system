import React from 'react';
import type { Metadata } from 'next';
import { PlatformLayoutClient } from '@/components/platform/PlatformLayoutClient';

export const metadata: Metadata = {
  title: 'Platform Administration | Shop POS BD',
  robots: {
    index: false,
    follow: false,
  },
  referrer: 'same-origin',
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformLayoutClient>{children}</PlatformLayoutClient>;
}
