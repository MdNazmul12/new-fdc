'use client';

import React, { useEffect, useState } from 'react';
import { Download, X, Share2, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export default function PwaPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    // 1. Register Service Worker
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/sw.js')
          .then((reg) => {
            console.log('FDC PWA ServiceWorker registered with scope:', reg.scope);
          })
          .catch((err) => {
            console.warn('FDC PWA ServiceWorker registration failed:', err);
          });
      });
    }

    // 2. Check if already in standalone display mode (already installed as PWA)
    if (typeof window !== 'undefined') {
      const isStandalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as any).standalone === true;

      if (isStandalone) {
        setIsInstalled(true);
        return;
      }

      // Check if user dismissed previously in this session
      const hasDismissed = sessionStorage.getItem('fdc_pwa_dismissed');
      if (hasDismissed) {
        setDismissed(true);
      }

      // Detect iOS (iPhone / iPad / iPod)
      const ua = window.navigator.userAgent || '';
      const isClassicIos = /iphone|ipad|ipod/i.test(ua);
      const isModernIpad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
      const isWebKit = /WebKit/i.test(ua) && !/CriOS/i.test(ua) && !/FxiOS/i.test(ua);
      const appleDevice = isClassicIos || isModernIpad;
      setIsIos(appleDevice);

      // On Android/Chrome: listen to beforeinstallprompt
      const handleBeforeInstall = (e: Event) => {
        e.preventDefault();
        setDeferredPrompt(e as BeforeInstallPromptEvent);
      };

      window.addEventListener('beforeinstallprompt', handleBeforeInstall);

      // Listen for successful install
      window.addEventListener('appinstalled', () => {
        setIsInstalled(true);
        setDeferredPrompt(null);
      });

      return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      };
    }
  }, []);

  const handleInstallClick = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else {
      // For iOS or browsers that don't support automated prompt
      setShowIosPrompt(true);
    }
  };

  const handleDismiss = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fdc_pwa_dismissed', 'true');
    }
  };

  const handleCloseIosModal = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowIosPrompt(false);
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fdc_pwa_dismissed', 'true');
    }
  };

  if (!mounted || isInstalled || dismissed) return null;

  return (
    <>
      {/* Floating Bottom Install Banner - Hidden when iOS guide modal is open */}
      {!showIosPrompt && (
        <div 
          className="fixed bottom-20 md:bottom-6 left-3 right-3 md:left-auto md:right-6 md:w-96 z-[999999] pointer-events-auto"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="bg-slate-900/95 border-2 border-indigo-500/50 rounded-2xl p-3.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-2xl flex items-center space-x-3 text-left ring-1 ring-white/10">
            <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/40 p-1 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
              <img src="/icons/icon-192x192.png" alt="FDC App Icon" className="w-full h-full object-contain rounded-lg" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-1.5">
                <span className="text-xs font-black text-white">Install FDC App</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/30 text-indigo-300 border border-indigo-500/40">
                  {isIos ? 'iPhone / iPad' : 'PWA App'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-300 truncate mt-0.5">
                {isIos ? 'iPhone-এ অ্যাপ ইনস্টল করুন' : 'ফোনে অ্যাপ ইনস্টল করুন'}
              </p>
            </div>

            <div className="flex items-center space-x-1.5 shrink-0">
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-3.5 py-2 bg-indigo-600 active:bg-indigo-700 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/40 transition-all flex items-center space-x-1.5 cursor-pointer touch-manipulation"
              >
                <Download className="w-4 h-4" />
                <span>{isIos ? 'ইনস্টল' : 'Install'}</span>
              </button>
              <button
                type="button"
                onClick={handleDismiss}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors touch-manipulation cursor-pointer"
                title="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* iOS Safari Instructions Modal */}
      {showIosPrompt && (
        <div 
          className="fixed inset-0 z-[9999999] flex items-end sm:items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in"
          onClick={handleCloseIosModal}
        >
          <div 
            className="bg-slate-900 border border-indigo-500/40 rounded-3xl w-full max-w-sm p-5 relative shadow-2xl space-y-4 text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/30 flex items-center justify-center text-indigo-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">iPhone-এ অ্যাপ ইনস্টল করুন</h3>
                  <p className="text-[10px] text-zinc-400">iOS Safari ৩টি সহজ ধাপ</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCloseIosModal}
                className="p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white touch-manipulation"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-zinc-200">
              <div className="flex items-start space-x-3 p-3 bg-zinc-800/70 rounded-2xl border border-zinc-700/60">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  ১
                </span>
                <p className="leading-relaxed">
                  Safari ব্রাউজারের নিচে থাকা <strong className="text-white">Share (শেয়ার)</strong> আইকনে চাপ দিন (
                  <Share2 className="w-3.5 h-3.5 inline mx-1 text-indigo-400" />
                  )।
                </p>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-zinc-800/70 rounded-2xl border border-zinc-700/60">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  ২
                </span>
                <p className="leading-relaxed">
                  একটু নিচে স্ক্রোল করে <strong className="text-white">&ldquo;Add to Home Screen&rdquo;</strong> অপশনে ট্যাপ করুন।
                </p>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-zinc-800/70 rounded-2xl border border-zinc-700/60">
                <span className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center shrink-0 mt-0.5">
                  ৩
                </span>
                <p className="leading-relaxed">
                  উপরে ডান কোণায় <strong className="text-emerald-400">&ldquo;Add&rdquo;</strong> বাটনে চাপ দিন। আপনার আইফোনের হোম স্ক্রিনে FDC অ্যাপ যুক্ত হয়ে যাবে!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCloseIosModal}
              className="w-full py-3 bg-indigo-600 active:bg-indigo-700 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer touch-manipulation shadow-lg shadow-indigo-600/30"
            >
              বুঝেছি / ঠিক আছে
            </button>
          </div>
        </div>
      )}
    </>
  );
}
