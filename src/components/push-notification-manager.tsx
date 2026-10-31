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
  isIos: boolean;
  isStandalone: boolean;
  permissionStatus: NotificationPermission | 'unsupported';
  subscribeToPush: () => Promise<void>;
  unsubscribeFromPush: () => Promise<void>;
}

const PushContext = createContext<PushCtx>({
  isSupported: false,
  isSubscribed: false,
  loading: false,
  isIos: false,
  isStandalone: false,
  permissionStatus: 'unsupported',
  subscribeToPush: async () => {},
  unsubscribeFromPush: async () => {},
});

export function PushNotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<NotificationPermission | 'unsupported'>('unsupported');

  // Detect support, register SW, & check current subscription status
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect iOS & Standalone PWA mode
    const ua = window.navigator.userAgent || '';
    const classicIos = /iphone|ipad|ipod/i.test(ua);
    const modernIpad = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    const appleDevice = classicIos || modernIpad;
    setIsIos(appleDevice);

    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // Check basic notification & push support
    const hasSW = 'serviceWorker' in navigator;
    const hasPush = 'PushManager' in window;
    const hasNotification = 'Notification' in window;
    const supported = hasSW && hasPush && hasNotification;

    setIsSupported(supported);

    if (hasNotification) {
      setPermissionStatus(Notification.permission);
    } else {
      setPermissionStatus('unsupported');
    }

    if (!hasSW) return;

    // Proactively register SW so navigator.serviceWorker.ready never hangs
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then(async (reg) => {
        if (supported) {
          try {
            const sub = await reg.pushManager.getSubscription();
            setIsSubscribed(!!sub);
          } catch (e) {
            console.warn('[PushNotification] Error checking subscription:', e);
          }
        }
      })
      .catch((err) => {
        console.warn('[PushNotification] SW registration failed:', err);
      });
  }, [user]);

  const subscribeToPush = useCallback(async () => {
    // 0. Secure context check (Push requires HTTPS or localhost)
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      alert(
        '⚠️ পুশ নোটিফিকেশনের জন্য নিরাপদ সংযোগ (HTTPS) আবশ্যক।\n\n' +
        'লোকাল নেটওয়ার্ক আইপি (http://...) দিয়ে পুশ সার্ভিস কাজ করে না। দয়া করে লাইভ HTTPS লিংক (Netlify) দিয়ে চেষ্টা করুন।'
      );
      return;
    }

    // 1. Specific iOS in regular Safari check
    if (isIos && !isStandalone) {
      alert(
        '📱 iPhone-এ পুশ নোটিফিকেশন পেতে:\n\n' +
        'Apple iOS শুধুমাত্র হোমস্ক্রিনে ইনস্টল করা অ্যাপে পুশ নোটিফিকেশন সাপোর্ট করে।\n\n' +
        'সহজ ৩টি ধাপ:\n' +
        '১. Safari ব্রাউজারের নিচে "Share" (শেয়ার) আইকনে চাপুন\n' +
        '২. স্ক্রোল করে "Add to Home Screen" চাপুন\n' +
        '৩. উপরে "Add" চাপুন\n\n' +
        'এরপর হোমস্ক্রিনের FDC অ্যাপ থেকে নোটিফিকেশন অন করলেই সক্রিয় হবে! (iOS 16.4+)'
      );
      return;
    }

    // 2. Generic unsupported check
    if (!isSupported) {
      alert(
        '⚠️ এই ব্রাউজার বা ডিভাইসে পুশ নোটিফিকেশন সমর্থিত নয়।\n\n' +
        'অনুগ্রহ করে Google Chrome অথবা Safari ব্যবহার করুন এবং ব্রাউজার আপডেট রাখুন।'
      );
      return;
    }

    // 3. Check if previously blocked/denied
    if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
      alert(
        '⚠️ নোটিফিকেশন পারমিশন ব্লক করা আছে!\n\n' +
        'অন করতে ফোন সেটিংস থেকে অ্যালাউ করুন:\n' +
        '• iPhone: Settings → Safari (বা FDC App) → Notifications → Allow\n' +
        '• Android: Chrome সেটিংস → Site Settings → Notifications → Allow'
      );
      return;
    }

    setLoading(true);
    try {
      // 4. Request browser permission
      const permission = await Notification.requestPermission();
      setPermissionStatus(permission);

      if (permission !== 'granted') {
        alert(
          '⚠️ নোটিফিকেশন পারমিশন অ্যালাউ করা হয়নি।\n\n' +
          'পরবর্তীতে অন করতে ফোন সেটিংস থেকে নোটিফিকেশন অন করুন।'
        );
        setLoading(false);
        return;
      }

      // 5. Get VAPID public key with client fallback
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
        console.warn('[PushNotification] Server VAPID fetch failed, using fallback:', err);
      }

      // 6. Ensure Service Worker registration is ready
      let reg: ServiceWorkerRegistration;
      try {
        reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      } catch (e) {
        reg = await navigator.serviceWorker.ready;
      }
      if (!reg || !reg.active) {
        reg = await navigator.serviceWorker.ready;
      }

      // 7. Subscribe via PushManager
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

      // 8. Save subscription token to MongoDB
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

      // 9. Update UI state immediately
      setIsSubscribed(true);

      // 10. Send a welcome push notification
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
      const errMsg = err?.message || String(err);
      if (errMsg.toLowerCase().includes('push service not available')) {
        alert(
          '⚠️ পুশ সার্ভিস উপলব্ধ নেই (Push Service Not Available)।\n\n' +
          'সম্ভাব্য কারণ:\n' +
          '১. আপনি VS Code / কোড এডিটরের প্রিভিউ ব্রাউজার থেকে ট্রাই করছেন — প্রিভিউ উইন্ডোতে পুশ নোটিফিকেশন ইঞ্জিন থাকে না।\n' +
          '২. লোকাল নেটওয়ার্ক বা কোনো ব্রাউজার (যেমন Brave) এ Push Messaging সার্ভিস ডিসেবল থাকতে পারে।\n\n' +
          '✅ সমাধান: ফোনের আসল ব্রাউজার (Google Chrome বা Safari) দিয়ে লাইভ ওয়েবসাইট (Netlify HTTPS) লিংক ভিজিট করে ট্রাই করুন।'
        );
      } else {
        alert(`Could not enable notifications:\n${errMsg}`);
      }
    } finally {
      setLoading(false);
    }
  }, [isIos, isStandalone, isSupported, user]);

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
      setIsSubscribed(false);
    } catch (err: any) {
      console.error('[PushNotification] Unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <PushContext.Provider
      value={{
        isSupported,
        isSubscribed,
        loading,
        isIos,
        isStandalone,
        permissionStatus,
        subscribeToPush,
        unsubscribeFromPush,
      }}
    >
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
  const {
    isSupported,
    isSubscribed,
    loading,
    isIos,
    isStandalone,
    permissionStatus,
    subscribeToPush,
    unsubscribeFromPush,
  } = usePushSubscription();

  const getSubtext = () => {
    if (isSubscribed) return 'Active on this device ✓';
    if (isIos && !isStandalone) return 'Add to Home Screen first';
    if (permissionStatus === 'denied') return 'Blocked in Phone Settings';
    if (!isSupported) return 'Not supported on this browser';
    return 'Push notifications off';
  };

  const getButtonText = () => {
    if (isSubscribed) return 'Turn Off';
    if (isIos && !isStandalone) return 'Guide';
    if (permissionStatus === 'denied') return 'Fix';
    return 'Turn On';
  };

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
            {getSubtext()}
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
            : isIos && !isStandalone
            ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 hover:bg-indigo-600/40'
            : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
        } disabled:opacity-60`}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <span>{getButtonText()}</span>
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
