'use client';

import React from 'react';

export interface AbstractWaveBackgroundProps {
  variant?: 'hero' | 'subtle';
  className?: string;
}

export function AbstractWaveBackground({
  variant = 'hero',
  className = '',
}: AbstractWaveBackgroundProps) {
  const isSubtle = variant === 'subtle';

  return (
    <div
      suppressHydrationWarning
      className={`fixed inset-0 overflow-hidden pointer-events-none z-0 select-none ${className}`}
      aria-hidden="true"
    >
      {/* 1. Base Wallpaper Image from User Reference */}
      <div
        className={`absolute inset-0 bg-cover bg-no-repeat bg-center transition-all duration-500 ${
          isSubtle ? 'opacity-35 dark:opacity-20' : 'opacity-100 dark:opacity-30'
        }`}
        style={{
          backgroundImage: "url('/images/abstract-bg.jpg')",
          backgroundPosition: 'center top',
        }}
      />

      {/* 2. Soft Ambient Lighting / Vignette Overlay */}
      <div
        className="absolute inset-0 dark:hidden pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 75% 30%, rgba(255, 255, 255, 0.4) 0%, rgba(245, 247, 250, 0.1) 40%, rgba(200, 206, 215, 0.25) 100%)',
        }}
      />

      {/* 3. Dark Mode Cyber-Obsidian Tone Overlay */}
      <div className="absolute inset-0 hidden dark:block bg-gradient-to-br from-[#090d16]/90 via-[#0f172a]/95 to-[#05070c]/98 pointer-events-none" />

      {/* 4. Modernist Decorative Accents (2x2 Dots & Hamburger Accent from template) */}
      {!isSubtle && (
        <>
          {/* Modernist 2x2 Dots in lower right (from reference template) */}
          <div className="absolute bottom-10 right-10 hidden sm:grid grid-cols-2 gap-2.5 opacity-60 dark:opacity-30 pointer-events-none">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-900 dark:bg-white" />
          </div>

          {/* Modernist 3-line hamburger accent in top right (from reference template) */}
          <div className="absolute top-8 right-8 hidden sm:flex flex-col gap-1 opacity-40 dark:opacity-20 pointer-events-none">
            <span className="w-6 h-0.5 bg-slate-900 dark:bg-white rounded-full" />
            <span className="w-6 h-0.5 bg-slate-900 dark:bg-white rounded-full" />
            <span className="w-6 h-0.5 bg-slate-900 dark:bg-white rounded-full" />
          </div>
        </>
      )}
    </div>
  );
}
