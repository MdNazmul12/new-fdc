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

  useEffect(() => {
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

      // Check sessionStorage if user dismissed in this session
      const hasDismissed = sessionStorage.getItem('fdc_pwa_dismissed');
      if (hasDismissed) {
        setDismissed(true);
      }

      // Detect iOS Safari
      const ua = window.navigator.userAgent.toLowerCase();
      const isApple = /iphone|ipad|ipod/.test(ua) && !(window as any).MSStream;
      setIsIos(isApple);

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

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
    } else if (isIos) {
      setShowIosPrompt(true);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('fdc_pwa_dismissed', 'true');
    }
  };

  // Don't show if already installed or dismissed
  if (isInstalled || dismissed) return null;

  // Only show if we either have an Android install prompt or iOS is detected
  if (!deferredPrompt && !isIos) return null;

  return (
    <>
      {/* Floating Bottom Install Banner */}
      <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 border border-indigo-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-indigo-600/30 border border-indigo-500/40 p-1 flex items-center justify-center shrink-0 overflow-hidden">
            <img src="/icons/icon-192x192.png" alt="FDC App Icon" className="w-full h-full object-contain rounded-lg" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-black text-white">Install FDC App</span>
              <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PWA
              </span>
            </div>
            <p className="text-[11px] text-zinc-300 truncate mt-0.5">
              {isIos ? 'iPhone-এ অ্যাপ হিসেবে সেভ করুন' : 'ফোনে অ্যাপ হিসেবে ইনস্টল করুন'}
            </p>
          </div>

          <div className="flex items-center space-x-1.5 shrink-0">
            <button
              type="button"
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/30 transition-all flex items-center space-x-1 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isIos ? 'Instructions' : 'Install'}</span>
            </button>
            <button
              type="button"
              onClick={handleDismiss}
              className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              title="Close"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* iOS Safari Instructions Modal */}
      {showIosPrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-3xl w-full max-w-sm p-6 relative shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-600/30 flex items-center justify-center text-indigo-400">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Install on iPhone / iPad</h3>
                  <p className="text-[10px] text-zinc-400">iOS Safari ইন্সটলেশন নির্দেশিকা</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIosPrompt(false)}
                className="p-1 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300">
              <div className="flex items-start space-x-3 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/50">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  1
                </span>
                <p>
                  Safari ব্রাউজারের নিচে থাকা <strong className="text-white">Share (শেয়ার)</strong> আইকনে চাপ দিন (
                  <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-indigo-400" />
                  )।
                </p>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/50">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  2
                </span>
                <p>
                  নিচের দিকে স্ক্রোল করে <strong className="text-white">&ldquo;Add to Home Screen&rdquo;</strong> অপশনে ট্যাপ করুন।
                </p>
              </div>

              <div className="flex items-start space-x-3 p-3 bg-zinc-800/60 rounded-xl border border-zinc-700/50">
                <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">
                  3
                </span>
                <p>
                  উপরে ডান কোণায় <strong className="text-emerald-400">&ldquo;Add&rdquo;</strong> বাটনে চাপ দিলেই আপনার ফোনের হোম স্ক্রিনে FDC অ্যাপ যুক্ত হয়ে যাবে!
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosPrompt(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
            >
              বুঝেছি / Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
