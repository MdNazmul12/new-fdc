'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/dashboard-layout';
import PrintableReceipt from '@/components/receipt';
import { useAuth } from '@/contexts/auth-context';
import { useStore } from '@/contexts/store-context';
import { Collection, Member } from '@/types';
import { 
  Coins, 
  PlusCircle, 
  Calendar, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Filter, 
  Printer, 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  PhoneCall, 
  Smartphone, 
  Building2, 
  Wallet, 
  Sparkles, 
  ChevronRight, 
  CalendarCheck,
  CheckCircle,
  XCircle,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

// Custom MFS Brand SVGs
function BkashLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#E2136E" />
      <path d="M24 10L12 28H22L20.5 38L36 19H25L24 10Z" fill="white" />
    </svg>
  );
}

function NagadLogo({ className = "w-6 h-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="48" height="48" rx="10" fill="#F7941D" />
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
      <circle cx="24" cy="24" r="14" fill="white" fillOpacity="0.15" />
      <path d="M24 11L28 19V30L24 35L20 30V19L24 11Z" fill="white" />
      <path d="M17 25L20 22V29L17 31V25Z" fill="#FDB913" />
      <path d="M31 25L28 22V29L31 31V25Z" fill="#FDB913" />
      <circle cx="24" cy="21" r="2.5" fill="#8C3494" />
    </svg>
  );
}

const STORAGE_GATEWAYS_KEY = 'fdc_payment_gateway_accounts_v1';

const DEFAULT_GATEWAYS = {
  bkash: { number: '01700-000000', type: 'Personal', instructions: 'বিকাশ অ্যাপ অথবা *247# ডায়াল করে সেন্ড মানি (Send Money) করুন।' },
  nagad: { number: '01800-000000', type: 'Personal', instructions: 'নগদ অ্যাপ অথবা *167# ডায়াল করে সেন্ড মানি (Send Money) করুন।' },
  rocket: { number: '01900-000000-0', type: 'Personal', instructions: 'রকেট অ্যাপ অথবা *322# ডায়াল করে সেন্ড মানি বা পেমেন্ট করুন।' },
  bank: { bankName: 'Dutch-Bangla Bank Limited (DBBL)', accountName: 'FDC Welfare Fund', accountNumber: '123-110-987654', branch: 'Dhanmondi Branch' }
};

export default function AdvancePaymentPage() {
  const { user } = useAuth();
  const { members, collections, addCollection, approveCollection, rejectCollection } = useStore();

  const isMember = user?.role === 'member';
  const isAdmin = user && ['super_admin', 'president', 'treasurer', 'collector'].includes(user.role);
  const canApprove = user && ['super_admin', 'president', 'treasurer'].includes(user.role);

  // Modal states
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<Collection | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetCol, setRejectTargetCol] = useState<Collection | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  // Form states for advance deposit
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [startMonth, setStartMonth] = useState('');
  const [monthsCount, setMonthsCount] = useState(3);
  const [customMonths, setCustomMonths] = useState(3);
  const [isCustomMonths, setIsCustomMonths] = useState(false);
  const [monthlyFee, setMonthlyFee] = useState(1000);
  const [paymentType, setPaymentType] = useState<'bkash' | 'nagad' | 'rocket' | 'bank' | 'cash'>('bkash');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'rejected'>('all');

  // Gateway config
  const [gateways, setGateways] = useState(DEFAULT_GATEWAYS);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [payActionFeedback, setPayActionFeedback] = useState<string | null>(null);
  const trxInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_GATEWAYS_KEY);
      if (stored) {
        setGateways(prev => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch (e) {
      console.warn('Failed to load gateways config:', e);
    }
  }, []);

  // Resolve logged-in member profile safely
  const myMember = useMemo<Member | null>(() => {
    if (!user || user.role !== 'member') return null;
    if (user.memberId) {
      const found = members.find(m => m.id === user.memberId);
      if (found) return found;
    }
    const byId = members.find(m => m.id === user.id || m.id === user.id.replace('u-', 'm-'));
    if (byId) return byId;
    if (user.name) {
      const byName = members.find(m => m.name?.trim().toLowerCase() === user.name?.trim().toLowerCase());
      if (byName) return byName;
    }
    if (user.email) {
      const byEmail = members.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
      if (byEmail) return byEmail;
    }
    if (user.phone) {
      const cleaned = user.phone.replace(/[^0-9]/g, '');
      if (cleaned.length >= 8 && !/^0+$/.test(cleaned) && !/^0170{5,}/.test(cleaned)) {
        const byPhone = members.find(m => m.phone === user.phone);
        if (byPhone) return byPhone;
      }
    }
    return null;
  }, [members, user]);

  // Determine effective member for advance payment modal
  const effectiveMember = useMemo(() => {
    if (isMember) return myMember;
    return members.find(m => m.id === selectedMemberId) || null;
  }, [isMember, myMember, members, selectedMemberId]);

  // Calculate next month to pay for effective member
  useEffect(() => {
    const targetId = isMember ? myMember?.id : selectedMemberId;
    if (!targetId) {
      const now = new Date();
      now.setMonth(now.getMonth() + 1);
      setStartMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
      return;
    }

    // Find latest month already paid or recorded for this member
    const memberCols = collections.filter(c => c.memberId === targetId && c.status !== 'rejected');
    const existingMonths = memberCols.map(c => c.month).sort();
    
    if (existingMonths.length > 0) {
      const lastMonth = existingMonths[existingMonths.length - 1];
      const [y, m] = lastMonth.split('-').map(Number);
      const nextDate = new Date(y, m, 1); // m is 1-indexed in split, so Date(y, m) gives next month
      setStartMonth(`${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`);
    } else {
      const now = new Date();
      now.setMonth(now.getMonth() + 1);
      setStartMonth(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
    }

    const mem = members.find(m => m.id === targetId);
    if (mem?.monthlyFee) {
      setMonthlyFee(mem.monthlyFee);
    }
  }, [selectedMemberId, myMember, isMember, collections, members]);

  // All advance collections
  const advanceCollections = useMemo(() => {
    return collections.filter(c => {
      // Must be marked as advance
      if (!c.isAdvance) return false;
      if (isMember) {
        const isMine = 
          (myMember && c.memberId === myMember.id) ||
          (user?.memberId && c.memberId === user.memberId) ||
          (user?.id && (c.memberId === user.id || c.memberId === user.id.replace('u-', 'm-'))) ||
          (myMember?.name && c.memberName?.toLowerCase() === myMember.name.toLowerCase()) ||
          (user?.name && c.memberName?.toLowerCase() === user.name.toLowerCase());
        if (!isMine) return false;
      }
      return true;
    });
  }, [collections, isMember, myMember, user]);

  // Filtered advance collections
  const filteredCollections = useMemo(() => {
    return advanceCollections.filter(c => {
      const matchSearch = 
        c.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.receiptNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.transactionRef && c.transactionRef.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchStatus = statusFilter === 'all' || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [advanceCollections, searchQuery, statusFilter]);

  // Pending advance submissions
  const pendingAdvanceSubmissions = useMemo(() => {
    return advanceCollections.filter(c => c.status === 'pending');
  }, [advanceCollections]);

  // Member's upcoming advance covered months
  const myCoveredMonths = useMemo(() => {
    if (!isMember) return [];
    return advanceCollections
      .filter(c => c.status === 'paid')
      .map(c => c.month)
      .sort();
  }, [advanceCollections, isMember]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (isMember) {
      const totalPaidAmt = advanceCollections.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
      const paidMonthsCount = advanceCollections.filter(c => c.status === 'paid').length;
      const pendingCount = advanceCollections.filter(c => c.status === 'pending').length;
      return {
        totalPaidAmt,
        paidMonthsCount,
        pendingCount,
        coveredMonths: myCoveredMonths
      };
    } else {
      const totalAdvanceAmt = advanceCollections.filter(c => c.status === 'paid').reduce((s, c) => s + c.amount, 0);
      const totalMonthsCount = advanceCollections.filter(c => c.status === 'paid').length;
      const pendingCount = advanceCollections.filter(c => c.status === 'pending').length;
      const uniqueMembersCount = new Set(advanceCollections.map(c => c.memberId)).size;
      return {
        totalAdvanceAmt,
        totalMonthsCount,
        pendingCount,
        uniqueMembersCount
      };
    }
  }, [isMember, advanceCollections, myCoveredMonths]);

  // Calculate covered months preview for modal
  const effectiveMonthsCount = isCustomMonths ? Math.max(1, customMonths) : monthsCount;
  const totalAdvanceAmount = effectiveMonthsCount * monthlyFee;

  const previewMonthsList = useMemo(() => {
    if (!startMonth) return [];
    const [y, m] = startMonth.split('-').map(Number);
    const list: string[] = [];
    for (let i = 0; i < effectiveMonthsCount; i++) {
      const d = new Date(y, m - 1 + i, 1);
      list.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }
    return list;
  }, [startMonth, effectiveMonthsCount]);

  const copyToClipboard = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 2500);
  };

  const handlePaymentNow = (channel: 'bkash' | 'nagad' | 'rocket') => {
    const account = gateways[channel];
    const cleanNumber = account.number.replace(/[^0-9]/g, '');
    copyToClipboard(cleanNumber || account.number, `${channel}_action`);

    const channelName = channel === 'bkash' ? 'bKash' : channel === 'nagad' ? 'Nagad' : 'Rocket';
    setPayActionFeedback(`নম্বর কপি হয়েছে (${account.number})! ${channelName} অ্যাপ ওপেন হচ্ছে... পেমেন্ট শেষ করে TrxID নিচে লিখুন।`);

    const isMobile = typeof navigator !== 'undefined' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);

    if (channel === 'bkash') {
      if (isAndroid) window.location.href = 'intent://send#Intent;scheme=bkash;package=com.bKash.customerapp;end';
      else if (isMobile) window.location.href = 'bkash://';
      else window.open('https://www.bkash.com', '_blank');
    } else if (channel === 'nagad') {
      if (isAndroid) window.location.href = 'intent://send#Intent;scheme=nagad;package=com.konasl.nagad;end';
      else if (isMobile) window.location.href = 'nagad://';
      else window.open('https://nagad.com.bd', '_blank');
    } else if (channel === 'rocket') {
      if (isAndroid) window.location.href = 'intent://#Intent;package=com.dbbl.mbs.apps.ayoba;end';
      else if (isMobile) window.location.href = 'rocket://';
      else window.open('https://www.dutchbanglabank.com/rocket/rocket.html', '_blank');
    }

    setTimeout(() => {
      trxInputRef.current?.focus();
      trxInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 600);
  };

  const handleSubmitAdvance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startMonth || effectiveMonthsCount <= 0 || monthlyFee <= 0) return;

    const targetMember = isMember ? myMember : members.find(m => m.id === selectedMemberId);
    if (!targetMember) {
      alert('অনুগ্রহ করে সদস্য নির্বাচন করুন');
      return;
    }

    if (['bkash', 'nagad', 'rocket'].includes(paymentType) && !transactionRef.trim()) {
      const confirmNoTrx = window.confirm(
        'আপনি কি TrxID ছাড়াই সাবমিট করতে চান?\n\nTrxID দিলে এডমিন দ্রুত পেমেন্ট অনুমোদন করতে পারে।'
      );
      if (!confirmNoTrx) {
        trxInputRef.current?.focus();
        return;
      }
    }

    setSubmitting(true);
    try {
      const status = isMember ? 'pending' : 'paid';

      for (let i = 0; i < previewMonthsList.length; i++) {
        const mStr = previewMonthsList[i];
        addCollection({
          memberId: targetMember.id,
          memberName: targetMember.name,
          month: mStr,
          amount: monthlyFee,
          lateFine: 0,
          paymentType,
          date: paymentDate,
          collectedBy: isMember ? 'Member Advance Submission' : (user?.name || 'Admin'),
          transactionRef: transactionRef.trim() || undefined,
          notes: notes.trim() 
            ? `${notes.trim()} (অগ্রিম চাঁদা ${i + 1}/${previewMonthsList.length})`
            : `অগ্রিম চাঁদা (${i + 1}/${previewMonthsList.length})`,
          isAdvance: true,
          status
        });
      }

      setPayModalOpen(false);
      setSuccessMsg(
        isMember 
          ? `আপনার ${effectiveMonthsCount} মাসের অগ্রিম চাঁদা (৳${totalAdvanceAmount.toLocaleString()}) সাবমিট হয়েছে! এডমিনের অনুমোদনের পর ব্যালেন্সে যুক্ত হবে।`
          : `${targetMember.name}-এর ${effectiveMonthsCount} মাসের অগ্রিম চাঁদা (৳${totalAdvanceAmount.toLocaleString()}) সফলভাবে এন্ট্রি হয়েছে!`
      );
      setTimeout(() => setSuccessMsg(null), 5000);

      // Reset form
      setTransactionRef('');
      setNotes('');
      setPayActionFeedback(null);
    } catch (err) {
      console.error('Failed to submit advance payment:', err);
      alert('অগ্রিম চাঁদা সাবমিট করতে সমস্যা হয়েছে।');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (col: Collection) => {
    try {
      await approveCollection(col.id, user?.name || 'Admin');
      setSuccessMsg(`${col.memberName}-এর ${col.month} মাসের অগ্রিম চাঁদা সফলভাবে অনুমোদিত হয়েছে!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
      alert('অনুমোদনে ত্রুটি হয়েছে।');
    }
  };

  const handleReject = async () => {
    if (!rejectTargetCol) return;
    try {
      await rejectCollection(rejectTargetCol.id, rejectReason.trim() || 'বকেয়া তথ্যে গরমিল');
      setRejectModalOpen(false);
      setRejectTargetCol(null);
      setRejectReason('');
      setSuccessMsg(`পেমেন্টটি বাতিল করা হয়েছে।`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (e) {
      console.error(e);
      alert('বাতিল করতে সমস্যা হয়েছে।');
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-12">

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--border)]">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black text-[var(--foreground)] tracking-tight">
                  Advance Payment (অগ্রিম চাঁদা)
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Live
                </span>
              </div>
              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                {isMember 
                  ? 'আপনার ভবিষ্যত মাসসমূহের অগ্রিম চাঁদা এককালীন জমা দিন এবং স্ট্যাটাস দেখুন'
                  : 'সকল সদস্যের অগ্রিম চাঁদা জমা গ্রহণ, ব্যালেন্স ট্র্যাকিং ও অনুমোদন ব্যবস্থাপনা'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              if (isMember && myMember) {
                setSelectedMemberId(myMember.id);
              }
              setPayModalOpen(true);
            }}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 transition-all cursor-pointer flex items-center justify-center space-x-2 self-start sm:self-auto"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{isMember ? 'Pay Advance (অগ্রিম চাঁদা জমা দিন)' : 'Deposit Advance for Member'}</span>
          </button>
        </div>

        {/* Success Alert Banner */}
        {successMsg && (
          <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold rounded-xl flex items-center space-x-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Analytics & Overview Cards */}
        {isMember ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Advance Months Count */}
            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">Advance Paid Months</span>
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <CalendarCheck className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {(stats as any).paidMonthsCount} <span className="text-xs font-semibold text-[var(--muted-foreground)]">Months</span>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)]">পরবর্তী মাসগুলোর জন্য অগ্রিম পরিশোধিত</p>
            </div>

            {/* Total Advance Deposited */}
            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">Total Advance Amount</span>
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-[var(--foreground)]">
                ৳ {(stats as any).totalPaidAmt.toLocaleString()}
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)]">অগ্রিম জমা দেওয়া মোট চাঁদার পরিমাণ</p>
            </div>

            {/* Pending Approvals */}
            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">Awaiting Approval</span>
                <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-amber-400">
                {(stats as any).pendingCount} <span className="text-xs font-semibold text-[var(--muted-foreground)]">Submissions</span>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)]">এডমিন যাচাই করে দ্রুত অনুমোদন করবে</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2 shadow-sm">
              <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase block">Total Advance Collected</span>
              <div className="text-2xl font-black text-emerald-400">
                ৳ {(stats as any).totalAdvanceAmt.toLocaleString()}
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)]">অনুমোদিত মোট অগ্রিম চাঁদা</p>
            </div>

            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2 shadow-sm">
              <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase block">Advance Months Covered</span>
              <div className="text-2xl font-black text-indigo-400">
                {(stats as any).totalMonthsCount} <span className="text-xs font-semibold text-[var(--muted-foreground)]">Months</span>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)]">মোট যত মাসের চাঁদা অগ্রিম আদায় হয়েছে</p>
            </div>

            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2 shadow-sm">
              <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase block">Advance Paid Members</span>
              <div className="text-2xl font-black text-blue-400">
                {(stats as any).uniqueMembersCount} <span className="text-xs font-semibold text-[var(--muted-foreground)]">Members</span>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)]">অগ্রিম প্রদানকারী সক্রিয় সদস্য</p>
            </div>

            <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2 shadow-sm">
              <span className="text-[11px] font-semibold text-[var(--muted-foreground)] uppercase block">Pending Approvals</span>
              <div className="text-2xl font-black text-amber-400">
                {(stats as any).pendingCount} <span className="text-xs font-semibold text-[var(--muted-foreground)]">Pending</span>
              </div>
              <p className="text-[10px] text-[var(--muted-foreground)]">অনুমোদনের অপেক্ষায় রয়েছে</p>
            </div>
          </div>
        )}

        {/* Member Upcoming Covered Months Pill Timeline */}
        {isMember && (stats as any).coveredMonths?.length > 0 && (
          <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl space-y-2.5 shadow-sm">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h3 className="text-xs font-bold text-[var(--foreground)]">
                আপনার অগ্রিম পরিশোধিত মাসসমূহ (Covered Months Timeline):
              </h3>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {(stats as any).coveredMonths.map((mStr: string) => (
                <span 
                  key={mStr}
                  className="px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold inline-flex items-center space-x-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span>{mStr}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Admin Section: Pending Submissions Review */}
        {isAdmin && pendingAdvanceSubmissions.length > 0 && (
          <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-[var(--foreground)]">
                  Pending Advance Submissions ({pendingAdvanceSubmissions.length} টি অপেক্ষমান)
                </h3>
              </div>
              <span className="text-[11px] text-amber-400 font-semibold">সদস্যদের অগ্রিম পেমেন্ট যাচাই করে অনুমোদন দিন</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {pendingAdvanceSubmissions.map((col) => (
                <div 
                  key={col.id} 
                  className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-3.5 space-y-2.5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-xs text-[var(--foreground)] block">{col.memberName}</span>
                      <span className="font-mono text-[10px] text-[var(--muted-foreground)]">{col.receiptNo}</span>
                    </div>
                    <span className="text-sm font-black text-emerald-400">৳ {col.amount.toLocaleString()}</span>
                  </div>

                  <div className="text-[11px] text-[var(--muted-foreground)] space-y-1 bg-[var(--secondary)] p-2 rounded-lg">
                    <div className="flex justify-between">
                      <span>Month:</span>
                      <strong className="text-[var(--foreground)]">{col.month}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Method:</span>
                      <strong className="text-indigo-400 uppercase">{col.paymentType}</strong>
                    </div>
                    {col.transactionRef && (
                      <div className="flex justify-between font-mono">
                        <span>TrxID:</span>
                        <strong className="text-amber-400">{col.transactionRef}</strong>
                      </div>
                    )}
                    {col.notes && (
                      <div className="text-[10px] text-[var(--muted-foreground)] pt-0.5 border-t border-[var(--border)]">
                        {col.notes}
                      </div>
                    )}
                  </div>

                  {canApprove && (
                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        onClick={() => handleApprove(col)}
                        className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1 shadow-sm"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setRejectTargetCol(col);
                          setRejectModalOpen(true);
                        }}
                        className="py-1.5 px-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Advance Payment History Table */}
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm overflow-hidden">
          {/* Table Controls */}
          <div className="p-4 border-b border-[var(--border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Advance Payment History (অগ্রিম চাঁদার হিস্ট্রি)</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">মোট {filteredCollections.length} টি রেকর্ড পাওয়া গেছে</p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[var(--muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search receipt, member, TrxID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-[var(--background)] border border-[var(--border)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-[var(--background)] border border-[var(--border)] rounded-xl px-2.5 py-1.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="paid">Approved (Paid)</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--secondary)] text-[var(--muted-foreground)] border-b border-[var(--border)] text-[10px] uppercase font-bold tracking-wider">
                <tr>
                  <th className="py-3 px-4">Receipt No</th>
                  <th className="py-3 px-4">Member</th>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">TrxID / Ref</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredCollections.length > 0 ? (
                  filteredCollections.map((col) => (
                    <tr key={col.id} className="hover:bg-[var(--accent)]/40 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-400">
                        {col.receiptNo}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[var(--foreground)]">
                        {col.memberName}
                      </td>
                      <td className="py-3 px-4 font-bold text-[var(--foreground)]">
                        <span className="px-2 py-0.5 rounded bg-[var(--accent)] border border-[var(--border)]">
                          {col.month}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-black text-emerald-400">
                        ৳ {col.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 uppercase font-bold text-[11px] text-[var(--muted-foreground)]">
                        <span className={`px-2 py-0.5 rounded text-[10px] ${
                          col.paymentType === 'bkash' ? 'bg-[#E2136E]/10 text-[#E2136E]' :
                          col.paymentType === 'nagad' ? 'bg-[#F7941D]/10 text-[#F7941D]' :
                          col.paymentType === 'rocket' ? 'bg-[#8C3494]/10 text-[#8C3494]' :
                          'bg-blue-500/10 text-blue-400'
                        }`}>
                          {col.paymentType}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[var(--muted-foreground)]">
                        {col.transactionRef || '—'}
                      </td>
                      <td className="py-3 px-4 text-[var(--muted-foreground)]">
                        {col.date}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center space-x-1 ${
                          col.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          col.status === 'pending' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {col.status === 'paid' && <CheckCircle2 className="w-3 h-3" />}
                          {col.status === 'pending' && <Clock className="w-3 h-3" />}
                          <span className="capitalize">{col.status === 'paid' ? 'Approved' : col.status}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedReceipt(col);
                            setPrintOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-[var(--secondary)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] transition-colors cursor-pointer inline-flex items-center space-x-1"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5 text-indigo-400" />
                          <span className="text-[10px] font-semibold">Receipt</span>
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-xs text-[var(--muted-foreground)]">
                      <Coins className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-400" />
                      <p>কোনো অগ্রিম চাঁদা পাওয়া যায়নি।</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------------- ADVANCE PAYMENT MODAL ---------------- */}
        {payModalOpen && (
          <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
            onClick={() => setPayModalOpen(false)}
          >
            <div 
              className="w-full max-w-xl bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-5 sm:p-6 relative my-auto max-h-[92vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-[var(--border)]">
                <div className="flex items-center space-x-2.5">
                  <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-[var(--foreground)]">
                      {isMember ? 'Advance Payment (অগ্রিম চাঁদা জমা)' : 'Deposit Advance for Member'}
                    </h3>
                    <p className="text-[11px] text-[var(--muted-foreground)]">
                      এককালীন একাধিক মাসের অগ্রিম চাঁদা জমা দিন
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPayModalOpen(false)}
                  className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmitAdvance} className="mt-4 space-y-4 text-xs">

                {/* Member Selection */}
                {isMember ? (
                  <div className="p-3 bg-[var(--secondary)] rounded-xl border border-[var(--border)] flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold block">Member Profile</span>
                      <span className="font-bold text-[var(--foreground)] text-xs">{myMember?.name || user?.name}</span>
                    </div>
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--foreground)]">
                      {myMember?.id || user?.id}
                    </span>
                  </div>
                ) : (
                  <div>
                    <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                      Select Member (সদস্য নির্বাচন করুন) *
                    </label>
                    <select
                      value={selectedMemberId}
                      onChange={(e) => setSelectedMemberId(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                      required
                    >
                      <option value="">— Select Member —</option>
                      {members.filter(m => m.status === 'active').map(m => (
                        <option key={m.id} value={m.id}>
                          {m.name} ({m.id}) — Fee: ৳{m.monthlyFee || 1000}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Start Month & Number of Months Preset Pills */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                      Starting Month (যে মাস থেকে শুরু) *
                    </label>
                    <input
                      type="month"
                      value={startMonth}
                      onChange={(e) => setStartMonth(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                      Monthly Fee (প্রতি মাসের ফি)
                    </label>
                    <input
                      type="number"
                      min="100"
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(Number(e.target.value))}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-bold"
                      required
                    />
                  </div>
                </div>

                {/* Duration Pills */}
                <div>
                  <label className="block text-[var(--muted-foreground)] font-semibold mb-1.5">
                    How many months in advance? (কত মাসের অগ্রিম চাঁদা?) *
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { count: 3, label: '3 Months (৩ মাস)' },
                      { count: 6, label: '6 Months (৬ মাস)' },
                      { count: 12, label: '1 Year (১ বছর)' }
                    ].map((item) => (
                      <button
                        key={item.count}
                        type="button"
                        onClick={() => {
                          setMonthsCount(item.count);
                          setIsCustomMonths(false);
                        }}
                        className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${
                          !isCustomMonths && monthsCount === item.count
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/40 shadow-sm'
                            : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}

                    <button
                      type="button"
                      onClick={() => setIsCustomMonths(true)}
                      className={`p-2.5 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${
                        isCustomMonths
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-2 ring-indigo-500/40 shadow-sm'
                          : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      Custom Months
                    </button>
                  </div>

                  {isCustomMonths && (
                    <div className="mt-2 flex items-center space-x-2">
                      <span className="text-[11px] text-[var(--muted-foreground)]">মাস সংখ্যা লিখুন:</span>
                      <input
                        type="number"
                        min="1"
                        max="36"
                        value={customMonths}
                        onChange={(e) => setCustomMonths(Math.max(1, Number(e.target.value)))}
                        className="w-24 bg-[var(--background)] border border-[var(--border)] rounded-lg p-1.5 text-center font-bold text-xs"
                      />
                      <span className="text-[11px] text-[var(--muted-foreground)]">মাস</span>
                    </div>
                  )}
                </div>

                {/* Covered Months Preview Box */}
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-bold text-indigo-400">
                    <span>কভারকৃত মাসসমূহ ({previewMonthsList.length} মাস):</span>
                    <span className="text-emerald-400 text-sm font-black">৳ {totalAdvanceAmount.toLocaleString()} TK</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {previewMonthsList.map((mStr, idx) => (
                      <span key={mStr} className="px-2 py-0.5 rounded bg-[var(--background)] border border-[var(--border)] font-mono text-[10px] text-[var(--foreground)]">
                        {idx + 1}. {mStr}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Payment Channel Selector */}
                <div>
                  <label className="block text-[var(--muted-foreground)] font-semibold mb-1.5">
                    Select Payment Method (পেমেন্ট মাধ্যম) *
                  </label>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                    {/* bKash */}
                    <button
                      type="button"
                      onClick={() => setPaymentType('bkash')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer relative ${
                        paymentType === 'bkash'
                          ? 'border-[#E2136E] bg-[#E2136E]/10 text-white ring-2 ring-[#E2136E]/50 shadow-md'
                          : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:border-[#E2136E]/40'
                      }`}
                    >
                      <BkashLogo className="w-6 h-6 shrink-0" />
                      <span className="font-bold text-[11px]">bKash</span>
                      <span className="text-[9px] opacity-75">বিকাশ</span>
                    </button>

                    {/* Nagad */}
                    <button
                      type="button"
                      onClick={() => setPaymentType('nagad')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer relative ${
                        paymentType === 'nagad'
                          ? 'border-[#F7941D] bg-[#F7941D]/10 text-white ring-2 ring-[#F7941D]/50 shadow-md'
                          : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:border-[#F7941D]/40'
                      }`}
                    >
                      <NagadLogo className="w-6 h-6 shrink-0" />
                      <span className="font-bold text-[11px]">Nagad</span>
                      <span className="text-[9px] opacity-75">নগদ</span>
                    </button>

                    {/* Rocket */}
                    <button
                      type="button"
                      onClick={() => setPaymentType('rocket')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer relative ${
                        paymentType === 'rocket'
                          ? 'border-[#8C3494] bg-[#8C3494]/10 text-white ring-2 ring-[#8C3494]/50 shadow-md'
                          : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:border-[#8C3494]/40'
                      }`}
                    >
                      <RocketLogo className="w-6 h-6 shrink-0" />
                      <span className="font-bold text-[11px]">Rocket</span>
                      <span className="text-[9px] opacity-75">রকেট (DBBL)</span>
                    </button>

                    {/* Bank */}
                    <button
                      type="button"
                      onClick={() => setPaymentType('bank')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer relative ${
                        paymentType === 'bank'
                          ? 'border-blue-500 bg-blue-500/10 text-blue-400 ring-2 ring-blue-500/50 shadow-md'
                          : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:border-blue-500/40'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                        <Building2 className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-[11px]">Bank</span>
                      <span className="text-[9px] opacity-75">ব্যাংক</span>
                    </button>

                    {/* Cash */}
                    <button
                      type="button"
                      onClick={() => setPaymentType('cash')}
                      className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1.5 transition-all cursor-pointer relative ${
                        paymentType === 'cash'
                          ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400 ring-2 ring-emerald-500/50 shadow-md'
                          : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:border-emerald-500/40'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Wallet className="w-3.5 h-3.5" />
                      </div>
                      <span className="font-bold text-[11px]">Cash</span>
                      <span className="text-[9px] opacity-75">ক্যাশ</span>
                    </button>
                  </div>
                </div>

                {/* Interactive MFS Guidance Box with "Payment Now" Button */}
                {(paymentType === 'bkash' || paymentType === 'nagad' || paymentType === 'rocket') && (
                  <div className={`p-4 rounded-xl border transition-all ${
                    paymentType === 'bkash' 
                      ? 'border-[#E2136E]/40 bg-gradient-to-br from-[#E2136E]/10 to-transparent' 
                      : paymentType === 'nagad' 
                      ? 'border-[#F7941D]/40 bg-gradient-to-br from-[#F7941D]/10 to-transparent' 
                      : 'border-[#8C3494]/40 bg-gradient-to-br from-[#8C3494]/10 to-transparent'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border)]/60">
                      <div className="flex items-center space-x-2.5">
                        {paymentType === 'bkash' && <BkashLogo className="w-7 h-7 shrink-0" />}
                        {paymentType === 'nagad' && <NagadLogo className="w-7 h-7 shrink-0" />}
                        {paymentType === 'rocket' && <RocketLogo className="w-7 h-7 shrink-0" />}
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-xs text-[var(--foreground)] capitalize">
                              {paymentType === 'bkash' ? 'bKash' : paymentType === 'nagad' ? 'Nagad' : 'Rocket'} Payment
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-[var(--accent)] text-[var(--foreground)]">
                              {gateways[paymentType].type}
                            </span>
                          </div>
                          <div className="text-[10px] text-[var(--muted-foreground)]">
                            {gateways[paymentType].instructions}
                          </div>
                        </div>
                      </div>

                      {/* Number & Copy */}
                      <div className="flex items-center space-x-1.5 bg-[var(--background)]/90 px-3 py-1.5 rounded-lg border border-[var(--border)] self-start sm:self-auto">
                        <div>
                          <span className="text-[9px] text-[var(--muted-foreground)] block">Account Number:</span>
                          <span className="font-mono font-bold text-xs text-[var(--foreground)]">
                            {gateways[paymentType].number}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(gateways[paymentType].number.replace(/[^0-9]/g, ''), paymentType)}
                          className="p-1 rounded hover:bg-[var(--accent)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
                        >
                          {copiedKey === paymentType ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    {/* Payable Amount & Action */}
                    <div className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-[10px] text-[var(--muted-foreground)] block">মোট প্রদেয় টাকা:</span>
                        <span className="text-base font-black text-emerald-400">৳ {totalAdvanceAmount.toLocaleString()} TK</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(String(totalAdvanceAmount), 'amount')}
                        className="text-[10px] px-2.5 py-1 rounded bg-[var(--accent)] text-[var(--foreground)] font-semibold inline-flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedKey === 'amount' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedKey === 'amount' ? 'Copied' : 'Copy Amount'}</span>
                      </button>
                    </div>

                    <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handlePaymentNow(paymentType)}
                        className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs text-white shadow-md transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                          paymentType === 'bkash'
                            ? 'bg-[#E2136E] hover:bg-[#c90f5f]'
                            : paymentType === 'nagad'
                            ? 'bg-[#F7941D] hover:bg-[#e07f0f]'
                            : 'bg-[#8C3494] hover:bg-[#772b7e]'
                        }`}
                      >
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Payment Now (সরাসরি অ্যাপে যান)</span>
                        <ExternalLink className="w-3 h-3 opacity-80" />
                      </button>

                      <a
                        href={`tel:${paymentType === 'bkash' ? '*247%23' : paymentType === 'nagad' ? '*167%23' : '*322%23'}`}
                        className="py-2 px-3 rounded-xl bg-[var(--background)] hover:bg-[var(--accent)] text-[var(--foreground)] border border-[var(--border)] font-semibold text-xs flex items-center justify-center space-x-1.5"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Dial {paymentType === 'bkash' ? '*247#' : paymentType === 'nagad' ? '*167#' : '*322#'}</span>
                      </a>
                    </div>

                    {payActionFeedback && (
                      <div className="mt-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] flex items-center space-x-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{payActionFeedback}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* TrxID */}
                <div>
                  <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                    Transaction ID / Reference (TrxID)
                  </label>
                  <input
                    ref={trxInputRef}
                    type="text"
                    placeholder="e.g. bKash TrxID: 9J4728KA or Bank Slip No"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] font-mono text-[11px] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                    Notes (মন্তব্য - ঐচ্ছিক)
                  </label>
                  <input
                    type="text"
                    placeholder="Remarks / details..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]">
                  <div>
                    <span className="text-[10px] text-[var(--muted-foreground)] block">Total Payable:</span>
                    <span className="text-base font-black text-emerald-400">৳ {totalAdvanceAmount.toLocaleString()} TK</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => setPayModalOpen(false)}
                      disabled={submitting}
                      className="px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--secondary)] text-[var(--foreground)] text-xs font-semibold cursor-pointer"
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
                        <span>{isMember ? 'Submit Advance for Approval' : 'Confirm & Save Advance'}</span>
                      )}
                    </button>
                  </div>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* ---------------- REJECT REASON MODAL ---------------- */}
        {rejectModalOpen && rejectTargetCol && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 max-w-sm w-full space-y-3">
              <h4 className="font-bold text-sm text-[var(--foreground)]">পেমেন্ট বাতিলের কারণ লিখুন</h4>
              <p className="text-xs text-[var(--muted-foreground)]">
                {rejectTargetCol.memberName}-এর {rejectTargetCol.month} মাসের ৳{rejectTargetCol.amount} পেমেন্টটি কেন বাতিল করা হচ্ছে?
              </p>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="যেমন: ভুল TrxID বা অ্যাকাউন্টে টাকা জমা হয়নি..."
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 text-xs text-[var(--foreground)] h-20 focus:outline-none focus:border-rose-500"
              />
              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setRejectModalOpen(false);
                    setRejectTargetCol(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[var(--accent)] text-xs font-semibold cursor-pointer"
                >
                  ফিরে যান
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  বাতিল নিশ্চিত করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- PRINT RECEIPT MODAL ---------------- */}
        {printOpen && selectedReceipt && (
          <div 
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md overflow-y-auto"
            onClick={() => setPrintOpen(false)}
          >
            <div 
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 max-w-2xl w-full relative my-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--border)]">
                <h3 className="font-bold text-sm text-[var(--foreground)]">Advance Money Receipt (টাকা জমার রশিদ)</h3>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => window.print()}
                    className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-500 flex items-center space-x-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={() => setPrintOpen(false)}
                    className="p-1 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <PrintableReceipt collection={selectedReceipt} />
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
