'use client';

import React, { useEffect, useState } from 'react';
import { Bell, BellRing, BellOff, Loader2, Check, Smartphone } from 'lucide-react';
import { useAuth } from '../contexts/auth-context';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Custom hook to share push notification state between components
export function usePushSubscription() {
  const { user } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window) {
      setIsSupported(true);

      navigator.serviceWorker.ready.then((reg) => {
        reg.pushManager.getSubscription().then((sub) => {
          if (sub) {
            setIsSubscribed(true);
          }
        });
      });
    }
  }, [user]);

  const subscribeToPush = async () => {
    if (!isSupported) return;
    setLoading(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        alert('Notification permission denied. Please allow notifications in site settings.');
        setLoading(false);
        return;
      }

      const resKey = await fetch('/api/push/subscribe');
      const { publicKey } = await resKey.json();
      if (!publicKey) throw new Error('Could not get VAPID public key');

      const reg = await navigator.serviceWorker.ready;
      const convertedVapidKey = urlBase64ToUint8Array(publicKey);
      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey,
      });

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

      if (!saveRes.ok) throw new Error('Failed to save subscription to database');

      setIsSubscribed(true);

      // Trigger a test welcoming push notification
      await fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: '🎉 Notifications Active!',
          message: 'FDC Push Notifications are now successfully enabled on this phone.',
          targetUserId: user?.id || 'all',
          url: '/dashboard',
        }),
      }).catch(() => {});
    } catch (err: any) {
      console.error('Push subscription error:', err);
      alert(`Could not enable notifications: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const unsubscribeFromPush = async () => {
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
      console.error('Error unsubscribing:', err);
    } finally {
      setLoading(false);
    }
  };

  return { isSupported, isSubscribed, loading, subscribeToPush, unsubscribeFromPush };
}

// Integrated toggle row inside the single Notification Dropdown
export function PushNotificationRow() {
  const { isSupported, isSubscribed, loading, subscribeToPush, unsubscribeFromPush } = usePushSubscription();

  if (!isSupported) return null;

  return (
    <div className="p-3 bg-zinc-900/40 border-b border-[var(--border)] flex items-center justify-between">
      <div className="flex items-center space-x-2.5">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
          isSubscribed 
            ? 'bg-emerald-500/20 text-emerald-400' 
            : 'bg-zinc-800 text-zinc-400'
        }`}>
          {isSubscribed ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        </div>
        <div>
          <p className="text-xs font-bold text-[var(--foreground)]">Phone Alerts</p>
          <p className="text-[10px] text-[var(--muted-foreground)]">
            {isSubscribed ? 'Active on this device' : 'Push notifications off'}
          </p>
        </div>
      </div>

      <button
        type="button"
        onClick={isSubscribed ? unsubscribeFromPush : subscribeToPush}
        disabled={loading}
        className={`px-3 py-1 text-[11px] font-bold rounded-lg transition-all touch-manipulation cursor-pointer flex items-center space-x-1 ${
          isSubscribed
            ? 'bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30'
            : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-sm'
        }`}
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

// Background manager: Only handles prompt banner if desired, DOES NOT render duplicate navbar icon
export default function PushNotificationManager() {
  const { isSupported, isSubscribed, loading, subscribeToPush } = usePushSubscription();
  const [showPromptBanner, setShowPromptBanner] = useState(false);

  useEffect(() => {
    if (!isSupported || isSubscribed) return;

    // Check if user dismissed previously
    const dismissed = localStorage.getItem('fdc_push_dismissed');
    if (!dismissed && Notification.permission === 'default') {
      const timer = setTimeout(() => setShowPromptBanner(true), 4000);
      return () => clearTimeout(timer);
    }
  }, [isSupported, isSubscribed]);

  const dismissBanner = () => {
    setShowPromptBanner(false);
    localStorage.setItem('fdc_push_dismissed', 'true');
  };

  if (!isSupported || isSubscribed || !showPromptBanner) return null;

  return (
    <div className="fixed top-16 right-4 left-4 sm:left-auto sm:right-6 sm:w-96 z-50 animate-in slide-in-from-top duration-300">
      <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex items-start space-x-3.5">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400 mt-0.5">
          <BellRing className="w-5 h-5 animate-bounce" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">Enable Phone Notifications?</p>
          <p className="text-[11px] text-zinc-300 mt-0.5 leading-relaxed">
            চাঁদা জমা হলে রিসিট, মাসিক বকেয়া রিমাইন্ডার ও লোন নোটিফিকেশন সরাসরি মোবাইল স্ক্রিনে পেতে নোটিফিকেশন অন করুন।
          </p>

          <div className="flex items-center space-x-2 mt-3">
            <button
              type="button"
              onClick={subscribeToPush}
              disabled={loading}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/30 transition-all flex items-center space-x-1 cursor-pointer"
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
