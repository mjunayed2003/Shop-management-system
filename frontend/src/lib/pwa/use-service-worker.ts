'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '../store/cart-store';

export function useServiceWorker() {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);
  const [showReloadPrompt, setShowReloadPrompt] = useState(false);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  const cartItemsCount = useCartStore((s) => s.items.length);

  // Register SW and listen for waiting updates
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    navigator.serviceWorker.register('/sw.js').then((registration) => {
      // Check if update is waiting immediately
      if (registration.waiting) {
        setWaitingWorker(registration.waiting);
      }

      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (!newWorker) return;

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            setWaitingWorker(newWorker);
          }
        });
      });
    }).catch((err) => {
      console.warn('Service worker registration failed:', err);
    });

    // Handle beforeinstallprompt for PWA install button
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  // Update prompt rule: only offer reload when the cart is empty!
  useEffect(() => {
    if (waitingWorker && cartItemsCount === 0) {
      setShowReloadPrompt(true);
    } else {
      setShowReloadPrompt(false);
    }
  }, [waitingWorker, cartItemsCount]);

  const reloadApp = useCallback(() => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, [waitingWorker]);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
      setDeferredPrompt(null);
    }
  }, [deferredPrompt]);

  return {
    showReloadPrompt,
    reloadApp,
    isInstallable,
    promptInstall,
  };
}
