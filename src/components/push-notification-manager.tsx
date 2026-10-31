'use client';

import React, { useEffect, useState, useCallback, createContext, useContext } from 'react';
import { BellRing, BellOff, Loader2 } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';

const FALLBACK_VAPID_PUBLIC_KEY =
  'BNnVdd1nN7aYXnJ7czvMz9El_eVXDTImVa2Yj9Pdn9WZWp2eVg4SyYcuNg_yBLoUEolchh6-Vu837YX-jN9ugrU';

// ── VAPID key helper ─────────────────────────────────────────────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// ── Shared Push Context (single source of truth) ─────────────────────────────
interface PushCtx {
  isSupported: boolean;
  isSubscribed: boolean;
  loading: boolean;
  subscribeToPush: () => Promise<void>;
  unsubscribeFromPush: () => Promise<void>;
}

const PushContext = createContext<PushCtx>({
  isSupported: false,
  isSubscribed: false,
  loading: false,
  subscribeToPush: async () => {},
  unsubscribeFromPush: async () => {},
});

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  // Detect support & check current subscription status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check for basic push support
    const hasPushSupport =
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window;

    setIsSupported(hasPushSupport);

    if (!hasPushSupport) return;

    // Check if already subscribed
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => {
        setIsSubscribed(!!sub);
      })
      .catch(() => {});
  }, [user]);

  const subscribeToPush = useCallback(async () => {
    if (!isSupported) {
      alert('Push notifications are not supported on this browser/device.');
      return;
    }
    setLoading(true);
    try {
      // 1. Request browser permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert(
          'Notification permission was denied.\n\n' +
          'To fix this:\n' +
          '• iPhone: Settings → Safari → [this site] → Notifications → Allow\n' +
          '• Android: Site settings → Notifications → Allow'
        );
        setLoading(false);
        return;
      }

      // 2. Get VAPID public key from server (with client fallback)
      let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || FALLBACK_VAPID_PUBLIC_KEY;
      try {
        const resKey = await fetch('/api/push/subscribe');
        if (resKey.ok) {
          const data = await resKey.json();
          if (data?.publicKey) {
            publicKey = data.publicKey;
          }
        }
      } catch (err) {
        console.warn('Could not fetch VAPID key from server, using fallback key:', err);
      }

      // 3. Subscribe via Service Worker PushManager
      const reg = await navigator.serviceWorker.ready;
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // 4. Save subscription token to MongoDB
      const saveRes = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscription,
          userId: user?.id,
          memberId: user?.memberId,
          role: user?.role || 'member',
          userAgent: navigator.userAgent,
        }),
      });

      if (!saveRes.ok) {
        const errBody = await saveRes.json().catch(() => ({}));
        throw new Error(errBody.error || 'Server failed to save push subscription');
      }

      // 5. Update UI state immediately (no reload needed)
      setIsSubscribed(true);

      // 6. Send a welcome push notification
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🎉 Notifications Enabled!',
          message: 'FDC push notifications are now active on this device.',
          targetUserId: user?.id || 'all',
          url: '/dashboard',
        }),
      }).catch(() => {});

    } catch (err: any) {
      console.error('[PushNotification] Subscribe error:', err);
      alert(`Could not enable notifications:\n${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [isSupported, user]);

  const unsubscribeFromPush = useCallback(async () => {
    setLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await sub.unsubscribe();
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      // Update UI state immediately (no reload needed)
      setIsSubscribed(false);
    } catch (err: any) {
      console.error('[PushNotification] Unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <PushContext.Provider value={{ isSupported, isSubscribed, loading, subscribeToPush, unsubscribeFromPush }}>
      {children}
    </PushContext.Provider>
  );
}

// ── Hook for any component to consume push state ─────────────────────────────
export function usePushSubscription() {
  return useContext(PushContext);
}

// ── Phone Alerts Row inside Notification Dropdown ────────────────────────────
export function PushNotificationRow() {
  const { isSupported, isSubscribed, loading, subscribeToPush, unsubscribeFromPush } = usePushSubscription();

  // Show the row regardless of isSupported — so user can see an explanation on unsupported browsers
  return (
    <div className="p-3 bg-zinc-900/40 border-b border-[var(--border)] flex items-center justify-between gap-3">
      <div className="flex items-center space-x-2.5 min-w-0">
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isSubscribed
              ? 'bg-emerald-500/20 text-emerald-400'
              : 'bg-zinc-800 text-zinc-400'
          }`}
        >
          {isSubscribed ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold text-[var(--foreground)]">Phone Alerts</p>
          <p className="text-[10px] text-[var(--muted-foreground)] truncate">
            {!isSupported
              ? 'Install as app for notifications'
              : isSubscribed
              ? 'Active on this device ✓'
              : 'Push notifications off'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
        disabled={loading}
        className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all touch-manipulation cursor-pointer flex items-center space-x-1 shrink-0 ${
          isSubscribed
            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
            : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
        } disabled:opacity-60`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : isSubscribed ? (
          <span>Turn Off</span>
        ) : (
          <span>Turn On</span>
        )}
      </button>
    </div>
  );
}

// ── Background manager: shows first-time prompt banner (no duplicate bell) ───
export default function PushNotificationManager() {
  const { isSupported, isSubscribed, loading, subscribeToPush } = usePushSubscription();
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  useEffect(() => {
    if (!isSupported || isSubscribed) return;

    const dismissed = localStorage.getItem('fdc_push_dismissed');
    if (!dismissed && Notification.permission === 'default') {
      const timer = setTimeout(() => setShowPromptBanner(true), 5000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed]);

  // Auto-hide banner once subscribed
  useEffect(() => {
    if (isSubscribed) setShowPromptBanner(false);
  }, [isSubscribed]);

  const dismissBanner = () => {
    setShowPromptBanner(false);
    localStorage.setItem('fdc_push_dismissed', 'true');
  };

  if (!showPromptBanner) return null;

  return (
    <div className="fixed top-16 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-top duration-300">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-start space-x-3.5">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
          <BellRing className="w-5 h-5 animate-bounce" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">Enable Phone Notifications?</p>
          <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
            চাঁদা জমা হলে রিসিট, মাসিক বকেয়া রিমাইন্ডার ও লোন নোটিফিকেশন সরাসরি ফোনে পেতে চাইলে নোটিফিকেশন অন করুন।
          </p>

          <div className="flex items-center space-x-2 mt-3">
            <button
              type="button"
              onClick={subscribeToPush}
              disabled={loading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-60"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Allow Notifications</span>
            </button>
            <button
              type="button"
              onClick={dismissBanner}
              className="px-2.5 py-1.5 text-zinc-400 hover:text-white text-xs transition-colors"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
