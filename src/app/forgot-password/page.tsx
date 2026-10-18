'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, ArrowLeft, KeyRound, Eye, EyeOff, ShieldCheck, RefreshCw, CheckCircle2 } from 'lucide-react';

type Step = 'email' | 'otp' | 'reset' | 'done';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const [emailNotice, setEmailNotice] = useState<string | null>(null);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: Send OTP
  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.devOtp) setDevOtp(data.devOtp);
      setEmailNotice(data.message || 'OTP sent to your email.');
      setStep('otp');
      startCountdown();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    if (countdown > 0) return;
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.devOtp) setDevOtp(data.devOtp);
      setEmailNotice(data.message || 'New OTP sent to your email.');
      startCountdown();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/otp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('reset');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/otp', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setStep('done');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const stepConfig = {
    email: { num: 1, label: 'Enter Email' },
    otp: { num: 2, label: 'Verify OTP' },
    reset: { num: 3, label: 'New Password' },
    done: { num: 4, label: 'Done' },
  };
  const currentNum = stepConfig[step].num;

  return (
    <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo & Back */}
        <div className="flex items-center justify-between mb-8">
          <Link href="/login" className="flex items-center space-x-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors text-xs">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Login</span>
          </Link>
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-white p-0.5 flex items-center justify-center overflow-hidden">
              <img src="/logo.jpg" alt="FDC Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-xs font-bold text-[var(--foreground)]">FDC Platform</span>
          </div>
        </div>

        {/* Progress Steps */}
        {step !== 'done' && (
          <div className="flex items-center justify-center space-x-2 mb-8">
            {[1, 2, 3].map((n) => (
              <React.Fragment key={n}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold transition-all ${
                  n < currentNum ? 'bg-emerald-500 text-white' :
                  n === currentNum ? 'bg-indigo-600 text-white' :
                  'bg-[var(--secondary)] text-[var(--muted-foreground)]'
                }`}>
                  {n < currentNum ? <CheckCircle2 className="w-4 h-4" /> : n}
                </div>
                {n < 3 && <div className={`flex-1 h-0.5 max-w-[48px] transition-all ${n < currentNum ? 'bg-emerald-500' : 'bg-[var(--border)]'}`} />}
              </React.Fragment>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl p-6">

          {/* ──── Step 1: Email ──── */}
          {step === 'email' && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-indigo-600/15 border border-indigo-600/20 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6 text-indigo-400" />
                </div>
                <h1 className="text-lg font-bold text-[var(--foreground)]">Forgot Password?</h1>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">আপনার ইমেইল দিন — OTP পাঠানো হবে</p>
              </div>
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="আপনার ইমেইল লিখুন"
                      className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500 placeholder-[var(--muted-foreground)]"
                    />
                  </div>
                </div>
                {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-60 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Mail className="w-4 h-4" />}
                  <span>{loading ? 'Sending OTP...' : 'Send OTP'}</span>
                </button>
              </form>
            </>
          )}

          {/* ──── Step 2: OTP Verify ──── */}
          {step === 'otp' && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-6 h-6 text-amber-400" />
                </div>
                <h1 className="text-lg font-bold text-[var(--foreground)]">Enter OTP</h1>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  6-digit OTP পাঠানো হয়েছে <strong className="text-[var(--foreground)]">{email}</strong>-এ
                </p>
                <div className="mt-2.5 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300 space-y-1 text-left">
                  <p className="font-semibold flex items-center space-x-1">
                    <span>⏱️ ইমেইল আসতে কত সময় লাগবে?</span>
                  </p>
                  <p className="text-[10px] text-[var(--muted-foreground)] leading-relaxed">
                    সাধারণত <strong>১০ থেকে ৩০ সেকেন্ডের</strong> মধ্যে ইনবক্সে পৌঁছায়। ইনবক্সে না পেলে অনুগ্রহ করে আপনার ইমেইলের <strong>Spam / Junk</strong> ফোল্ডার চেক করুন।
                  </p>
                </div>

                {devOtp && (
                  <div className="mt-2.5 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-[11px] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-emerald-400 block font-bold">Instant OTP Code:</span>
                      <span className="font-mono text-base font-black text-emerald-400 tracking-wider">{devOtp}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOtp(devOtp)}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] transition-colors cursor-pointer"
                    >
                      Fill OTP
                    </button>
                  </div>
                )}
              </div>
              <form onSubmit={handleVerifyOTP} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">OTP Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={otp}
                    onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="______"
                    className="w-full py-3 text-center bg-[var(--background)] border border-[var(--border)] rounded-xl text-2xl font-bold font-mono tracking-[1rem] text-[var(--foreground)] focus:outline-none focus:border-indigo-500 placeholder-[var(--muted-foreground)]"
                  />
                </div>
                {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading || otp.length !== 6}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-60 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  <span>{loading ? 'Verifying...' : 'Verify OTP'}</span>
                </button>
                <div className="text-center">
                  <button
                    type="button"
                    onClick={handleResendOTP}
                    disabled={countdown > 0 || loading}
                    className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] disabled:opacity-50 flex items-center space-x-1 mx-auto cursor-pointer transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>{countdown > 0 ? `Resend OTP in ${countdown}s` : 'Resend OTP'}</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {/* ──── Step 3: New Password ──── */}
          {step === 'reset' && (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                  <KeyRound className="w-6 h-6 text-emerald-400" />
                </div>
                <h1 className="text-lg font-bold text-[var(--foreground)]">Set New Password</h1>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">নতুন পাসওয়ার্ড দিন</p>
              </div>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">New Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      placeholder="নতুন পাসওয়ার্ড (min 6 chars)"
                      className="w-full px-4 py-2.5 pr-10 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] cursor-pointer">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Confirm Password</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="পাসওয়ার্ড নিশ্চিত করুন"
                    className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                  />
                </div>
                {error && <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all disabled:opacity-60 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  {loading ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  <span>{loading ? 'Resetting...' : 'Reset Password'}</span>
                </button>
              </form>
            </>
          )}

          {/* ──── Step 4: Done ──── */}
          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-20 h-20 rounded-full bg-emerald-500/15 border-2 border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h1 className="text-lg font-bold text-[var(--foreground)] mb-2">Password Reset!</h1>
              <p className="text-xs text-[var(--muted-foreground)] mb-6">আপনার পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে। এখন নতুন পাসওয়ার্ড দিয়ে লগইন করুন।</p>
              <Link
                href="/login"
                className="inline-flex items-center space-x-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition-all"
              >
                <span>Go to Login</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
