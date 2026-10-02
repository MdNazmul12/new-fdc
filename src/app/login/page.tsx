'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/auth-context';
import { Mail, KeyRound, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function LoginPage() {
  const { user, login, loading } = useAuth();
  const router = useRouter();
  
  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('password123'); // Default mock password
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user && !successMsg) {
      router.push('/dashboard');
    }
  }, [user, router, successMsg]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginId.trim()) {
      setError('Please enter your User ID, Email or Phone Number');
      return;
    }
    
    setError('');
    setSuccessMsg('');
    setSubmitting(true);
    
    try {
      const success = await login(loginId.trim(), password);
      if (success) {
        setSuccessMsg('Login Successful! Redirecting to dashboard...');
        setTimeout(() => {
          router.push('/dashboard');
        }, 800);
      } else {
        setError('Invalid login credentials. Please check your User ID / Email and password.');
      }
    } catch (err) {
      setError('An error occurred during authentication.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      
      {/* Background ambient glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-purple-600/10 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-[var(--secondary)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 lg:p-8 z-10 glass-panel animate-fade-in-up">
        
        {/* Logo and Header */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 rounded-2xl bg-white border border-[var(--border)] flex items-center justify-center shadow-lg shadow-blue-500/10 mb-4 overflow-hidden p-1">
            <img src="/logo.jpg" alt="FDC Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-[var(--foreground)]">FDC Foundation</h2>
          <p className="text-xs text-[var(--muted-foreground)] mt-1 text-center">Investment & Fund Management Platform</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center space-x-2 animate-pulse">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">User ID / Email / Phone</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]/70" />
              <input
                type="text"
                placeholder="User ID (e.g. u-6, m-1), Email or Phone"
                value={loginId}
                onChange={(e) => setLoginId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">Password</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]/70" />
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]/70 hover:text-[var(--foreground)]/80"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white grad-primary hover:opacity-90 shadow-md shadow-indigo-500/10 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center space-x-2"
          >
            {submitting ? (
              <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>



      </div>
    </div>
  );
}
