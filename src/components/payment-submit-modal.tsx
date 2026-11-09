'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  CreditCard, 
  Copy, 
  Check, 
  ExternalLink, 
  PhoneCall, 
  Smartphone, 
  Settings, 
  Building2, 
  Wallet, 
  Sparkles, 
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { useStore } from '../contexts/store-context';
import { useAuth } from '../contexts/auth-context';

export interface PaymentGatewaysConfig {
  bkash: {
    number: string;
    type: 'Personal' | 'Merchant' | 'Agent';
    instructions: string;
  };
  nagad: {
    number: string;
    type: 'Personal' | 'Merchant' | 'Agent';
    instructions: string;
  };
  rocket: {
    number: string;
    type: 'Personal' | 'Merchant' | 'Agent';
    instructions: string;
  };
  bank: {
    bankName: string;
    accountName: string;
    accountNumber: string;
    branch: string;
    routingNumber?: string;
  };
}

const DEFAULT_GATEWAYS: PaymentGatewaysConfig = {
  bkash: {
    number: '01700-000000',
    type: 'Personal',
    instructions: 'বিকাশ অ্যাপ অথবা *247# ডায়াল করে সেন্ড মানি (Send Money) করুন।'
  },
  nagad: {
    number: '01800-000000',
    type: 'Personal',
    instructions: 'নগদ অ্যাপ অথবা *167# ডায়াল করে সেন্ড মানি (Send Money) করুন।'
  },
  rocket: {
    number: '01900-000000-0',
    type: 'Personal',
    instructions: 'রকেট অ্যাপ অথবা *322# ডায়াল করে সেন্ড মানি বা পেমেন্ট করুন।'
  },
  bank: {
    bankName: 'Dutch-Bangla Bank Limited (DBBL)',
    accountName: 'FDC Welfare Fund',
    accountNumber: '123-110-987654',
    branch: 'Dhanmondi Branch',
    routingNumber: '090271234'
  }
};

const STORAGE_KEY = 'fdc_payment_gateway_accounts_v1';

// Custom Branded SVGs for Bangladeshi Mobile Financial Services (MFS)
function BkashLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#E2136E" />
      {/* bKash origami bird geometry */}
      <path d="M24 10L12 28H22L20.5 38L36 19H25L24 10Z" fill="white" />
    </svg>
  );
}

function NagadLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#F7941D" />
      {/* Nagad stylized emblem */}
      <circle cx="24" cy="24" r="14" fill="#ED1C24" opacity="0.3" />
      <path d="M24 11C24 11 29 16 29 22C29 26 26.5 29 24 31C21.5 29 19 26 19 22C19 16 24 11 24 11Z" fill="white" />
      <path d="M24 23C24 23 27 26 27 29C27 31 25.5 33 24 34C22.5 33 21 31 21 29C21 26 24 23 24 23Z" fill="#F7941D" />
      <circle cx="24" cy="18" r="3" fill="#FFF200" />
    </svg>
  );
}

function RocketLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#8C3494" />
      {/* DBBL Rocket emblem */}
      <circle cx="24" cy="24" r="14" fill="white" fillOpacity="0.15" />
      <path d="M24 11L28 19V30L24 35L20 30V19L24 11Z" fill="white" />
      <path d="M17 25L20 22V29L17 31V25Z" fill="#FDB913" />
      <path d="M31 25L28 22V29L31 31V25Z" fill="#FDB913" />
      <circle cx="24" cy="21" r="2.5" fill="#8C3494" />
    </svg>
  );
}

interface PaymentSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  defaultMonth?: string;
  defaultAmount?: number;
  defaultFine?: number;
  unpaidMonths?: { month: string; fee: number; fine: number }[];
  onSuccess?: () => void;
}

export default function PaymentSubmitModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  defaultMonth,
  defaultAmount,
  defaultFine,
  unpaidMonths = [],
  onSuccess
}: PaymentSubmitModalProps) {
  const { addCollection } = useStore();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  const [month, setMonth] = useState(defaultMonth || new Date().toISOString().slice(0, 7));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(defaultAmount || 1000);
  const [lateFine, setLateFine] = useState(defaultFine || 0);
  const [paymentType, setPaymentType] = useState<'cash' | 'bank' | 'bkash' | 'nagad' | 'rocket'>('bkash');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Gateway numbers config
  const [gateways, setGateways] = useState<PaymentGatewaysConfig>(DEFAULT_GATEWAYS);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [tempGateways, setTempGateways] = useState<PaymentGatewaysConfig>(DEFAULT_GATEWAYS);
  const [payActionFeedback, setPayActionFeedback] = useState<string | null>(null);

  const trxInputRef = useRef<HTMLInputElement>(null);

  const isAdminOrManager = user && ['super_admin', 'president', 'treasurer', 'collector'].includes(user.role);

  useEffect(() => {
    setMounted(true);
    // Load persisted gateway configuration from localStorage
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setGateways(prev => ({ ...prev, ...parsed }));
        setTempGateways(prev => ({ ...prev, ...parsed }));
      }
    } catch (e) {
      console.warn('Failed to load payment gateway config:', e);
    }
  }, []);

  useEffect(() => {
    if (defaultMonth) setMonth(defaultMonth);
    if (defaultAmount !== undefined) setAmount(defaultAmount);
    if (defaultFine !== undefined) setLateFine(defaultFine);
    setSubmitted(false);
    setPayActionFeedback(null);
  }, [defaultMonth, defaultAmount, defaultFine, isOpen]);

  const handleMonthChange = (selectedM: string) => {
    setMonth(selectedM);
    const matched = unpaidMonths.find(u => u.month === selectedM);
    if (matched) {
      setAmount(matched.fee);
      setLateFine(matched.fine);
    }
  };

  const copyToClipboard = (text: string, typeKey: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedType(typeKey);
    setTimeout(() => {
      setCopiedType(prev => (prev === typeKey ? null : prev));
    }, 2500);
  };

  // Launch Payment Service / App / Deep Link
  const handlePaymentNow = (channel: 'bkash' | 'nagad' | 'rocket') => {
    const account = gateways[channel];
    const cleanNumber = account.number.replace(/[^0-9]/g, '');

    // 1. Copy the number to clipboard
    copyToClipboard(cleanNumber || account.number, `${channel}_action`);

    // 2. Set action feedback toast
    const channelName = channel === 'bkash' ? 'bKash (বিকাশ)' : channel === 'nagad' ? 'Nagad (নগদ)' : 'Rocket (রকেট)';
    setPayActionFeedback(`নম্বর কপি হয়েছে (${account.number})! ${channelName} অ্যাপ ওপেন হচ্ছে... পেমেন্ট শেষ করে TrxID দিন।`);

    // 3. Attempt deep-linking to app
    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

    if (channel === 'bkash') {
      if (isAndroid) {
        window.location.href = 'intent://send#Intent;scheme=bkash;package=com.bKash.customerapp;end';
      } else if (isMobile) {
        window.location.href = 'bkash://';
      } else {
        // Desktop fallback
        window.open('https://www.bkash.com', '_blank');
      }
    } else if (channel === 'nagad') {
      if (isAndroid) {
        window.location.href = 'intent://send#Intent;scheme=nagad;package=com.konasl.nagad;end';
      } else if (isMobile) {
        window.location.href = 'nagad://';
      } else {
        window.open('https://nagad.com.bd', '_blank');
      }
    } else if (channel === 'rocket') {
      if (isAndroid) {
        window.location.href = 'intent://#Intent;package=com.dbbl.mbs.apps.ayoba;end';
      } else if (isMobile) {
        window.location.href = 'rocket://';
      } else {
        window.open('https://www.dutchbanglabank.com/rocket/rocket.html', '_blank');
      }
    }

    // 4. Focus TrxID input
    setTimeout(() => {
      if (trxInputRef.current) {
        trxInputRef.current.focus();
        trxInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 600);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setGateways(tempGateways);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tempGateways));
    } catch (e) {
      console.warn('Failed to save payment gateway config:', e);
    }
    setShowConfigModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month || amount <= 0) return;

    // Soft check for TrxID on MFS payments
    if (['bkash', 'nagad', 'rocket'].includes(paymentType) && !transactionRef.trim()) {
      const confirmNoTrx = window.confirm(
        `আপনি কি কোনো Transaction ID (TrxID) ছাড়া সাবমিট করতে চান?\n\nTrxID দিলে এডমিন দ্রুত পেমেন্ট ভেরিফাই করতে পারে।`
      );
      if (!confirmNoTrx) {
        trxInputRef.current?.focus();
        return;
      }
    }

    setSubmitting(true);
    try {
      addCollection({
        memberId,
        memberName,
        month,
        amount: Number(amount),
        lateFine: Number(lateFine) || 0,
        paymentType,
        date: paymentDate,
        status: 'pending',
        collectedBy: 'Member Submission',
        transactionRef: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined
      });

      setSubmitted(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
        setSubmitted(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to submit payment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const totalPayable = Number(amount) + (Number(lateFine) || 0);

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-5 sm:p-6 relative my-auto max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-bold text-[var(--foreground)]">Pay Dues / জমা দিন</h3>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Instant MFS
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted-foreground)]">Bkash, Nagad, Rocket ও Bank এর মাধ্যমে চাঁদা পরিশোধ করুন</p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            {isAdminOrManager && (
              <button
                type="button"
                onClick={() => setShowConfigModal(true)}
                className="p-1.5 text-[var(--muted-foreground)] hover:text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors cursor-pointer"
                title="নম্বর ও অ্যাকাউন্ট সেটিংস পরিবর্তন করুন (Admin Only)"
              >
                <Settings className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Payment Submitted Successfully!</h4>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto leading-relaxed">
              আপনার জমা দেওয়া <strong>{totalPayable.toLocaleString()} TK</strong> ({month}) এডমিনের অনুমোদনের জন্য অপেক্ষমান (Pending) রয়েছে। এডমিন যাচাই করে Approve করলেই আপনার বকেয়া পরিশোধ হয়ে যাবে।
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            
            {/* Member Details Read-only */}
            <div className="p-3 bg-[var(--secondary)] rounded-xl border border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold block">Member Account</span>
                <span className="font-bold text-[var(--foreground)] text-xs">{memberName}</span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--foreground)]">
                {memberId}
              </span>
            </div>

            {/* Target Month & Payment Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                  Billing Month *
                </label>
                {unpaidMonths.length > 0 ? (
                  <select
                    value={month}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
                    required
                  >
                    {unpaidMonths.map(u => (
                      <option key={u.month} value={u.month}>
                        {u.month} — {u.fee} TK {u.fine > 0 ? `(+${u.fine} TK Fine)` : ''}
                      </option>
                    ))}
                    {!unpaidMonths.some(u => u.month === month) && (
                      <option value={month}>{month} (Selected)</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-medium"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-medium"
                  required
                />
              </div>
            </div>

            {/* Amount & Fine */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                  Fee Amount (TK) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                  Late Fine (TK)
                </label>
                <input
                  type="number"
                  min="0"
                  value={lateFine}
                  onChange={(e) => setLateFine(Number(e.target.value))}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>
            </div>

            {/* Payment Channel Selector with Authentic MFS Brand Icons */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[var(--muted-foreground)] font-semibold">
                  Select Payment Method (পেমেন্ট মাধ্যম বেছে নিন) *
                </label>
                {isAdminOrManager && (
                  <button
                    type="button"
                    onClick={() => setShowConfigModal(true)}
                    className="text-[10px] text-indigo-400 hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Settings className="w-3 h-3" />
                    <span>নম্বর পরিবর্তন</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {/* bKash */}
                <button
                  type="button"
                  onClick={() => setPaymentType('bkash')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer relative ${
                    paymentType === 'bkash'
                      ? 'border-[#E2136E] bg-[#E2136E]/10 text-white ring-2 ring-[#E2136E]/50 shadow-md shadow-[#E2136E]/20'
                      : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:border-[#E2136E]/40 hover:text-[var(--foreground)]'
                  }`}
                >
                  <BkashLogo className="w-7 h-7 shrink-0" />
                  <span className="font-bold text-[11px] leading-tight">bKash</span>
                  <span className="text-[9px] opacity-75">বিকাশ</span>
                  {paymentType === 'bkash' && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#E2136E] text-white flex items-center justify-center text-[9px] font-black">
                      ✓
                    </span>
                  )}
                </button>

                {/* Nagad */}
                <button
                  type="button"
                  onClick={() => setPaymentType('nagad')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer relative ${
                    paymentType === 'nagad'
                      ? 'border-[#F7941D] bg-[#F7941D]/10 text-white ring-2 ring-[#F7941D]/50 shadow-md shadow-[#F7941D]/20'
                      : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:border-[#F7941D]/40 hover:text-[var(--foreground)]'
                  }`}
                >
                  <NagadLogo className="w-7 h-7 shrink-0" />
                  <span className="font-bold text-[11px] leading-tight">Nagad</span>
                  <span className="text-[9px] opacity-75">নগদ</span>
                  {paymentType === 'nagad' && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#F7941D] text-white flex items-center justify-center text-[9px] font-black">
                      ✓
                    </span>
                  )}
                </button>

                {/* Rocket (DBBL) */}
                <button
                  type="button"
                  onClick={() => setPaymentType('rocket')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer relative ${
                    paymentType === 'rocket'
                      ? 'border-[#8C3494] bg-[#8C3494]/10 text-white ring-2 ring-[#8C3494]/50 shadow-md shadow-[#8C3494]/20'
                      : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:border-[#8C3494]/40 hover:text-[var(--foreground)]'
                  }`}
                >
                  <RocketLogo className="w-7 h-7 shrink-0" />
                  <span className="font-bold text-[11px] leading-tight">Rocket</span>
                  <span className="text-[9px] opacity-75">রকেট (DBBL)</span>
                  {paymentType === 'rocket' && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#8C3494] text-white flex items-center justify-center text-[9px] font-black">
                      ✓
                    </span>
                  )}
                </button>

                {/* Bank Book */}
                <button
                  type="button"
                  onClick={() => setPaymentType('bank')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer relative ${
                    paymentType === 'bank'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-400 ring-2 ring-blue-500/50 shadow-md'
                      : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:border-blue-500/40 hover:text-[var(--foreground)]'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-[11px] leading-tight">Bank</span>
                  <span className="text-[9px] opacity-75">ব্যাংক</span>
                  {paymentType === 'bank' && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-blue-500 text-white flex items-center justify-center text-[9px] font-black">
                      ✓
                    </span>
                  )}
                </button>

                {/* Cash in Hand */}
                <button
                  type="button"
                  onClick={() => setPaymentType('cash')}
                  className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer relative ${
                    paymentType === 'cash'
                      ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/50 shadow-md'
                      : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:border-emerald-500/40 hover:text-[var(--foreground)]'
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-[11px] leading-tight">Cash</span>
                  <span className="text-[9px] opacity-75">ক্যাশ</span>
                  {paymentType === 'cash' && (
                    <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center text-[9px] font-black">
                      ✓
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Interactive MFS Payment Box with "Payment Now" Button */}
            {(paymentType === 'bkash' || paymentType === 'nagad' || paymentType === 'rocket') && (
              <div className={`p-4 rounded-xl border transition-all ${
                paymentType === 'bkash' 
                  ? 'border-[#E2136E]/40 bg-gradient-to-br from-[#E2136E]/10 to-transparent' 
                  : paymentType === 'nagad' 
                  ? 'border-[#F7941D]/40 bg-gradient-to-br from-[#F7941D]/10 to-transparent' 
                  : 'border-[#8C3494]/40 bg-gradient-to-br from-[#8C3494]/10 to-transparent'
              }`}>
                {/* Channel Header & Account Number */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]/60">
                  <div className="flex items-center space-x-2.5">
                    {paymentType === 'bkash' && <BkashLogo className="w-8 h-8 shrink-0" />}
                    {paymentType === 'nagad' && <NagadLogo className="w-8 h-8 shrink-0" />}
                    {paymentType === 'rocket' && <RocketLogo className="w-8 h-8 shrink-0" />}
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="font-bold text-sm text-[var(--foreground)] capitalize">
                          {paymentType === 'bkash' ? 'bKash' : paymentType === 'nagad' ? 'Nagad' : 'Rocket (DBBL)'} Payment
                        </span>
                        <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)]">
                          {gateways[paymentType].type}
                        </span>
                      </div>
                      <div className="text-[10px] text-[var(--muted-foreground)]">
                        {gateways[paymentType].instructions}
                      </div>
                    </div>
                  </div>

                  {/* Account Number & Copy */}
                  <div className="flex items-center space-x-1.5 bg-[var(--background)]/90 px-3 py-1.5 rounded-lg border border-[var(--border)] self-start sm:self-auto">
                    <div>
                      <span className="text-[9px] text-[var(--muted-foreground)] block leading-none mb-0.5">Account Number:</span>
                      <span className="font-mono font-bold text-xs sm:text-sm text-[var(--foreground)] tracking-wide">
                        {gateways[paymentType].number}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(gateways[paymentType].number.replace(/[^0-9]/g, ''), paymentType)}
                      className="p-1.5 rounded hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                      title="Copy number"
                    >
                      {copiedType === paymentType ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Amount to Send */}
                <div className="py-3 flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[var(--muted-foreground)] block">Payable Amount (পরিশোধযোগ্য টাকা):</span>
                    <span className="text-base font-black text-emerald-400">৳ {totalPayable.toLocaleString()} TK</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(String(totalPayable), 'amount')}
                    className="text-[11px] px-2.5 py-1 rounded bg-[var(--accent)] hover:bg-[var(--secondary)] text-[var(--foreground)] inline-flex items-center space-x-1 font-semibold transition-colors cursor-pointer"
                  >
                    {copiedType === 'amount' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedType === 'amount' ? 'Copied' : 'Copy Amount'}</span>
                  </button>
                </div>

                {/* Main "Payment Now" Deep Link Action Button */}
                <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePaymentNow(paymentType)}
                    className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-lg transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                      paymentType === 'bkash'
                        ? 'bg-[#E2136E] hover:bg-[#c90f5f] shadow-[#E2136E]/30'
                        : paymentType === 'nagad'
                        ? 'bg-[#F7941D] hover:bg-[#e07f0f] shadow-[#F7941D]/30'
                        : 'bg-[#8C3494] hover:bg-[#772b7e] shadow-[#8C3494]/30'
                    }`}
                  >
                    <Smartphone className="w-4 h-4" />
                    <span>
                      Payment Now (সরাসরি {paymentType === 'bkash' ? 'বিকাশ' : paymentType === 'nagad' ? 'নগদ' : 'রকেট'} অ্যাপে যান)
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </button>

                  {/* USSD Dial Option for mobile */}
                  <a
                    href={`tel:${paymentType === 'bkash' ? '*247%23' : paymentType === 'nagad' ? '*167%23' : '*322%23'}`}
                    className="py-2.5 px-3 rounded-xl bg-[var(--background)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] font-semibold text-xs transition-colors flex items-center justify-center space-x-1.5"
                    title="Dial USSD on phone"
                  >
                    <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Dial {paymentType === 'bkash' ? '*247#' : paymentType === 'nagad' ? '*167#' : '*322#'}</span>
                  </a>
                </div>

                {/* Instant Feedback Notice */}
                {payActionFeedback && (
                  <div className="mt-2.5 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] flex items-center space-x-1.5 animate-in fade-in duration-200">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{payActionFeedback}</span>
                  </div>
                )}
              </div>
            )}

            {/* Bank Transfer Details Box */}
            {paymentType === 'bank' && (
              <div className="p-3.5 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-2">
                <div className="flex items-center space-x-2 text-blue-400 font-bold text-xs">
                  <Building2 className="w-4 h-4" />
                  <span>ব্যাংক হিসাব বিবরণী (Bank Account Details)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[var(--foreground)] bg-[var(--background)]/80 p-2.5 rounded-lg border border-[var(--border)]">
                  <div>
                    <span className="text-[9px] text-[var(--muted-foreground)] block">Bank Name:</span>
                    <strong>{gateways.bank.bankName}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--muted-foreground)] block">Account Name:</span>
                    <strong>{gateways.bank.accountName}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--muted-foreground)] block">Account No:</span>
                    <strong className="font-mono text-emerald-400">{gateways.bank.accountNumber}</strong>
                  </div>
                  <div>
                    <span className="text-[9px] text-[var(--muted-foreground)] block">Branch:</span>
                    <strong>{gateways.bank.branch}</strong>
                  </div>
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)]">
                  ব্যাংকে জমা দিয়ে ডিপোজিট স্লিপ নম্বর বা রেফারেন্স নিচে লিখে সাবমিট করুন।
                </p>
              </div>
            )}

            {/* Transaction Ref / TrxID */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[var(--muted-foreground)] font-semibold flex items-center space-x-1">
                  <span>Transaction ID / Slip No. (TrxID বা রশিদ নম্বর)</span>
                  {['bkash', 'nagad', 'rocket'].includes(paymentType) && (
                    <span className="text-amber-400 font-bold">*</span>
                  )}
                </label>
                <span className="text-[10px] text-[var(--muted-foreground)]">
                  {paymentType === 'bkash' ? 'যেমন: 9J4728KA' : paymentType === 'nagad' ? 'যেমন: 7K92LP3' : paymentType === 'rocket' ? 'যেমন: 8847291' : 'ঐচ্ছিক'}
                </span>
              </div>
              <input
                ref={trxInputRef}
                type="text"
                placeholder={
                  paymentType === 'bkash'
                    ? 'bKash TrxID লিখুন (e.g. 9J4728KA)'
                    : paymentType === 'nagad'
                    ? 'Nagad TrxID লিখুন (e.g. 7K92LP3)'
                    : paymentType === 'rocket'
                    ? 'Rocket TxnID লিখুন (e.g. 8847291)'
                    : 'Bank Slip No or Deposit Reference'
                }
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className={`w-full bg-[var(--background)] border rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none font-mono text-[11px] transition-all ${
                  payActionFeedback 
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20' 
                    : 'border-[var(--border)] focus:border-indigo-500'
                }`}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                Notes (মন্তব্য - ঐচ্ছিক)
              </label>
              <input
                type="text"
                placeholder="Any additional remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Pending Notice Box */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-[11px]">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>অপেক্ষমান (Pending) নিয়মাবলী:</span>
              </div>
              <p className="text-[10px] leading-relaxed text-[var(--muted-foreground)]">
                টাকা সাবমিট করার পর এটি আপনার প্রোফাইলে <strong>Pending</strong> হিসেবে দেখাবে। <strong>এডমিন TrxID যাচাই করে Approve করলেই বকেয়া পরিশোধ হিসেবে গণ্য হবে।</strong>
              </p>
            </div>

            {/* Footer Total & Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]">
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)] block">Total Payable</span>
                <span className="text-base font-black text-emerald-400">{totalPayable.toLocaleString()} TK</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--secondary)] text-[var(--foreground)] text-xs font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  {submitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit for Approval</span>
                  )}
                </button>
              </div>
            </div>

          </form>
        )}

        {/* Admin Gateway Numbers Configuration Modal */}
        {showConfigModal && (
          <div className="absolute inset-0 z-50 bg-[var(--card)] p-5 overflow-y-auto animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
              <div className="flex items-center space-x-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                <h4 className="font-bold text-sm text-[var(--foreground)]">Payment Accounts Settings (Admin Only)</h4>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1 rounded text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveConfig} className="mt-4 space-y-4 text-xs">
              <p className="text-[11px] text-[var(--muted-foreground)]">
                এখানে আপনার ক্লাবের নির্ধারিত bKash, Nagad ও Rocket নম্বর সেট করুন। সদস্যরা পেমেন্ট করার সময় এই নম্বরগুলো দেখতে পাবে।
              </p>

              {/* bKash Config */}
              <div className="p-3 rounded-xl border border-[#E2136E]/30 bg-[#E2136E]/5 space-y-2">
                <div className="flex items-center space-x-2">
                  <BkashLogo className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-xs text-[var(--foreground)]">bKash Account</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">bKash Number</label>
                    <input
                      type="text"
                      value={tempGateways.bkash.number}
                      onChange={(e) => setTempGateways({
                        ...tempGateways,
                        bkash: { ...tempGateways.bkash, number: e.target.value }
                      })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">Account Type</label>
                    <select
                      value={tempGateways.bkash.type}
                      onChange={(e) => setTempGateways({
                        ...tempGateways,
                        bkash: { ...tempGateways.bkash, type: e.target.value as any }
                      })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2"
                    >
                      <option value="Personal">Personal (Send Money)</option>
                      <option value="Merchant">Merchant (Payment)</option>
                      <option value="Agent">Agent (Cash In)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Nagad Config */}
              <div className="p-3 rounded-xl border border-[#F7941D]/30 bg-[#F7941D]/5 space-y-2">
                <div className="flex items-center space-x-2">
                  <NagadLogo className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-xs text-[var(--foreground)]">Nagad Account</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">Nagad Number</label>
                    <input
                      type="text"
                      value={tempGateways.nagad.number}
                      onChange={(e) => setTempGateways({
                        ...tempGateways,
                        nagad: { ...tempGateways.nagad, number: e.target.value }
                      })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">Account Type</label>
                    <select
                      value={tempGateways.nagad.type}
                      onChange={(e) => setTempGateways({
                        ...tempGateways,
                        nagad: { ...tempGateways.nagad, type: e.target.value as any }
                      })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2"
                    >
                      <option value="Personal">Personal (Send Money)</option>
                      <option value="Merchant">Merchant (Payment)</option>
                      <option value="Agent">Agent (Cash In)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Rocket Config */}
              <div className="p-3 rounded-xl border border-[#8C3494]/30 bg-[#8C3494]/5 space-y-2">
                <div className="flex items-center space-x-2">
                  <RocketLogo className="w-5 h-5 shrink-0" />
                  <span className="font-bold text-xs text-[var(--foreground)]">Rocket (DBBL) Account</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">Rocket Number</label>
                    <input
                      type="text"
                      value={tempGateways.rocket.number}
                      onChange={(e) => setTempGateways({
                        ...tempGateways,
                        rocket: { ...tempGateways.rocket, number: e.target.value }
                      })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">Account Type</label>
                    <select
                      value={tempGateways.rocket.type}
                      onChange={(e) => setTempGateways({
                        ...tempGateways,
                        rocket: { ...tempGateways.rocket, type: e.target.value as any }
                      })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2"
                    >
                      <option value="Personal">Personal (Send Money)</option>
                      <option value="Merchant">Merchant (Payment)</option>
                      <option value="Agent">Agent (Cash In)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Bank Account Config */}
              <div className="p-3 rounded-xl border border-blue-500/30 bg-blue-500/5 space-y-2">
                <div className="flex items-center space-x-2">
                  <Building2 className="w-4 h-4 text-blue-400" />
                  <span className="font-bold text-xs text-[var(--foreground)]">Bank Account Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">Bank Name</label>
                    <input
                      type="text"
                      value={tempGateways.bank.bankName}
                      onChange={(e) => setTempGateways({
                        ...tempGateways,
                        bank: { ...tempGateways.bank, bankName: e.target.value }
                      })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">Account Name</label>
                    <input
                      type="text"
                      value={tempGateways.bank.accountName}
                      onChange={(e) => setTempGateways({
                        ...tempGateways,
                        bank: { ...tempGateways.bank, accountName: e.target.value }
                      })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">Account Number</label>
                    <input
                      type="text"
                      value={tempGateways.bank.accountNumber}
                      onChange={(e) => setTempGateways({
                        ...tempGateways,
                        bank: { ...tempGateways.bank, accountNumber: e.target.value }
                      })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--muted-foreground)] block mb-1">Branch</label>
                    <input
                      type="text"
                      value={tempGateways.bank.branch}
                      onChange={(e) => setTempGateways({
                        ...tempGateways,
                        bank: { ...tempGateways.bank, branch: e.target.value }
                      })}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent)] hover:bg-[var(--secondary)] text-[var(--foreground)] font-semibold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors cursor-pointer shadow-sm"
                >
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
