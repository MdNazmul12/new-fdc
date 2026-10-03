'use client';

import React, { useState } from 'react';
import DashboardLayout from '../../../components/dashboard-layout';
import { useStore } from '../../../contexts/store-context';
import { useAuth } from '../../../contexts/auth-context';
import { Collection, Member } from '../../../types';
import { 
  User, 
  Calendar, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  Printer, 
  Heart,
  Phone,
  Mail, 
  X,
  Camera,
  Loader2,
  Bell,
  Check,
  ExternalLink,
  ShieldAlert,
  CreditCard,
  Clock,
  CheckCircle
} from 'lucide-react';
import PrintableReceipt from '../../../components/receipt';
import PaymentSubmitModal from '../../../components/payment-submit-modal';

export default function MemberProfilePage() {
  const { user } = useAuth();
  const { 
    members, 
    collections, 
    updateMemberPhoto, 
    dueDemands, 
    notifications, 
    markNotificationRead, 
    markAllNotificationsRead 
  } = useStore();

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const [photoSuccess, setPhotoSuccess] = useState(false);
  
  // Find matching member profile based on user details — most specific first
  const memberProfile = React.useMemo(() => {
    if (!user) return null;
    // 1. Exact memberId link (set during login)
    if (user.memberId) {
      const found = members.find(m => m.id === user.memberId);
      if (found) return found;
    }
    // 2. Direct id match (member id === user id)
    const byId = members.find(m => m.id === user.id || m.id === user.id.replace('u-', 'm-'));
    if (byId) return byId;
    // 3. Name match (Highest priority for identity over shared placeholder phones)
    if (user.name) {
      const byName = members.find(m => m.name?.trim().toLowerCase() === user.name?.trim().toLowerCase());
      if (byName) return byName;
    }
    // 4. Email match
    if (user.email) {
      const byEmail = members.find(m => m.email?.toLowerCase() === user.email.toLowerCase());
      if (byEmail) return byEmail;
    }
    // 5. Phone match (Only if real non-dummy phone number)
    if (user.phone) {
      const cleaned = user.phone.replace(/[^0-9]/g, '');
      const isReal = cleaned.length >= 8 && !/^0+$/.test(cleaned) && !/^0170{5,}/.test(cleaned) && !/^880170{5,}/.test(cleaned);
      if (isReal) {
        const byPhone = members.find(m => m.phone === user.phone);
        if (byPhone) return byPhone;
      }
    }
    // 6. Synthesize profile directly from logged-in user so the right name ALWAYS shows
    return {
      id: user.memberId || user.id.replace('u-', 'm-') || `m-${user.id}`,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      joinDate: new Date().toISOString().split('T')[0],
      status: 'active' as const,
      monthlyFee: 1000,
      nomineeName: '',
      nomineeRelation: '',
      nomineePhone: '',
      photoUrl: user.avatar
    };
  }, [user, members]);
  
  // States for print dialog
  const [selectedReceipt, setSelectedReceipt] = useState<Collection | null>(null);
  const [printOpen, setPrintOpen] = useState(false);

  // States for member self-payment submission modal
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payModalMonth, setPayModalMonth] = useState('');
  const [payModalAmount, setPayModalAmount] = useState(1000);
  const [payModalFine, setPayModalFine] = useState(0);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    setPhotoLoading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 400;

        if (width > height) {
          if (width > maxDim) {
            height *= maxDim / width;
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width *= maxDim / height;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

        // Update photo in MongoDB and state (guard against null memberProfile)
        if (memberProfile) {
          updateMemberPhoto(memberProfile.id, dataUrl);
        }

        // Also update local storage session if currently logged-in user
        if (typeof window !== 'undefined' && user) {
          const updatedUser = { ...user, avatar: dataUrl };
          localStorage.setItem('fdc_current_user', JSON.stringify(updatedUser));
        }

        setPhotoLoading(false);
        setPhotoSuccess(true);
        setTimeout(() => setPhotoSuccess(false), 3000);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Real dynamic due demands for this member (must be before early return — React hooks order)
  const memberUnpaidDues = React.useMemo(() => {
    if (!memberProfile?.id) return [];
    const today = new Date().toISOString().slice(0, 10);
    return dueDemands.map(demand => {
      const isPaid = collections.some(
        c => (
          c.memberId === memberProfile.id || 
          (user?.memberId && c.memberId === user.memberId) ||
          (user?.id && (c.memberId === user.id || c.memberId === user.id.replace('u-', 'm-'))) ||
          (memberProfile.name && c.memberName?.toLowerCase() === memberProfile.name.toLowerCase()) ||
          (user?.name && c.memberName?.toLowerCase() === user.name.toLowerCase())
        ) && c.month === demand.month && c.status === 'paid'
      );
      if (isPaid) return null;

      const pendingRecord = collections.find(
        c => (
          c.memberId === memberProfile.id || 
          (user?.memberId && c.memberId === user.memberId) ||
          (user?.id && (c.memberId === user.id || c.memberId === user.id.replace('u-', 'm-'))) ||
          (memberProfile.name && c.memberName?.toLowerCase() === memberProfile.name.toLowerCase()) ||
          (user?.name && c.memberName?.toLowerCase() === user.name.toLowerCase())
        ) && c.month === demand.month && c.status === 'pending'
      );

      const baseFee = demand.amountType === 'fixed'
        ? (demand.fixedAmount || 1000)
        : (memberProfile.monthlyFee || 1000);
      const isPending = !!pendingRecord;
      const isOverdue = !isPending && today > demand.dueDate;
      const fine = isOverdue ? (demand.lateFine || 50) : 0;
      return { 
        ...demand, 
        baseFee, 
        fine, 
        pendingRecord, 
        isPending,
        isOverdue,
        totalPayable: baseFee + fine
      };
    }).filter(Boolean) as (typeof dueDemands[0] & { 
      baseFee: number; 
      fine: number; 
      pendingRecord?: Collection; 
      isPending: boolean;
      isOverdue: boolean;
      totalPayable: number;
    })[];
  }, [dueDemands, collections, memberProfile, user]);

  const totalDueAmount = memberUnpaidDues.reduce((sum, d) => sum + d.totalPayable, 0);

  // Filter notifications relevant to this member (must be before early return)
  const memberNotifications = React.useMemo(() => {
    if (!memberProfile?.id) return [];
    return notifications.filter(n => {
      if (!n.userId || n.userId === 'all') return true;
      if (n.userId === memberProfile.id) return true;
      if (user?.id && n.userId === user.id) return true;
      return false;
    }).sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [notifications, memberProfile, user]);

  const unreadCount = memberNotifications.filter(n => !n.read).length;

  // Filter collections recorded for this specific member
  const myPayments = React.useMemo(() => {
    if (!memberProfile) return [];
    return collections.filter(c => 
      c.memberId === memberProfile.id || 
      (user?.memberId && c.memberId === user.memberId) ||
      (user?.id && (c.memberId === user.id || c.memberId === user.id.replace('u-', 'm-'))) ||
      (memberProfile.name && c.memberName?.toLowerCase() === memberProfile.name.toLowerCase()) ||
      (user?.name && c.memberName?.toLowerCase() === user.name.toLowerCase())
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [collections, memberProfile, user]);

  const myPaidPayments = React.useMemo(() => myPayments.filter(p => p.status === 'paid'), [myPayments]);
  const myPendingPayments = React.useMemo(() => myPayments.filter(p => p.status === 'pending'), [myPayments]);

  const totalPaid = myPaidPayments.reduce((sum, p) => sum + p.amount + (p.lateFine || 0), 0);
  const totalPending = myPendingPayments.reduce((sum, p) => sum + p.amount + (p.lateFine || 0), 0);

  const handlePrintReceipt = (receipt: Collection) => {
    setSelectedReceipt(receipt);
    setPrintOpen(true);
  };

  if (!memberProfile) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center space-y-3">
          <div className="text-4xl">🔍</div>
          <p className="text-[var(--foreground)]/80 font-semibold text-sm">No member profile linked to your account.</p>
          <p className="text-[var(--muted-foreground)]/70 text-xs">
            Ask the administrator to register your email <strong className="text-indigo-400">{user?.email}</strong> in the Members list.
          </p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Profile Card & Details Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Personal profile */}
          <div className="glass-panel p-5 rounded-2xl relative overflow-hidden flex flex-col items-center text-center">
            <div className="absolute top-0 right-0 w-24 h-24 grad-primary opacity-5 blur-xl rounded-full"></div>
            
            {/* Avatar circle with photo upload overlay */}
            <div className="relative group mb-4">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoUpload}
                className="hidden"
              />
              
              <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-indigo-500/30 bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-black text-3xl uppercase shadow-xl relative">
                {memberProfile.photoUrl ? (
                  <img
                    src={memberProfile.photoUrl}
                    alt={memberProfile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  memberProfile.name.charAt(0)
                )}

                {photoLoading && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                )}
              </div>

              {/* Upload trigger badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border-2 border-zinc-900 transition-transform hover:scale-110 cursor-pointer"
                title="Change Profile Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>

            {photoSuccess && (
              <span className="text-[10px] text-emerald-400 font-bold mb-2 flex items-center space-x-1 animate-in fade-in">
                <CheckCircle2 className="w-3 h-3" />
                <span>Profile photo updated!</span>
              </span>
            )}

            <h3 className="text-lg font-black text-white">{memberProfile.name}</h3>
            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-0.5">Joined on {memberProfile.joinDate}</p>

            <div className="w-full border-t border-[var(--border)] my-4 pt-4 space-y-3 text-left text-xs">
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted-foreground)]/70 font-medium">Monthly Fee:</span>
                <span className="font-bold text-[var(--card-foreground)]">{memberProfile.monthlyFee.toLocaleString()} TK</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted-foreground)]/70 font-medium">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {memberProfile.status}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted-foreground)]/70 font-medium">Contact:</span>
                <span className="text-[var(--foreground)]/80 font-semibold">{memberProfile.phone}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[var(--muted-foreground)]/70 font-medium">Email:</span>
                <span className="text-[var(--foreground)]/80 font-semibold truncate max-w-[150px]">{memberProfile.email}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Nominee & Emergency info */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Heart className="w-4 h-4 text-rose-500" />
                <h3 className="text-xs font-bold text-[var(--card-foreground)]">Registered Nominee Details</h3>
              </div>
              
              <div className="space-y-4 my-2 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-[var(--muted-foreground)]/70 uppercase font-semibold">Nominee Name</span>
                  <p className="font-bold text-[var(--card-foreground)]">{memberProfile.nomineeName || 'Not Set'}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[var(--muted-foreground)]/70 uppercase font-semibold">Relation</span>
                    <p className="font-bold text-[var(--card-foreground)]">{memberProfile.nomineeRelation || 'Not Set'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-[var(--muted-foreground)]/70 uppercase font-semibold">Nominee Contact</span>
                    <p className="font-bold text-[var(--card-foreground)]">{memberProfile.nomineePhone || 'Not Set'}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[9px] text-[var(--muted-foreground)]/70 pt-3 border-t border-[var(--border)]">
              * To edit nominee credentials, contact any Super Admin or President.
            </div>
          </div>

          {/* Card 3: Due tracker */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-[var(--card-foreground)]">Outstanding Dues Summary</h3>
                {memberUnpaidDues.some(d => !d.isPending) && (
                  <button
                    type="button"
                    onClick={() => {
                      const firstUnpaid = memberUnpaidDues.find(d => !d.isPending);
                      if (firstUnpaid) {
                        setPayModalMonth(firstUnpaid.month);
                        setPayModalAmount(firstUnpaid.baseFee);
                        setPayModalFine(firstUnpaid.fine);
                        setPayModalOpen(true);
                      }
                    }}
                    className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold rounded-lg shadow-sm transition-all cursor-pointer inline-flex items-center space-x-1"
                  >
                    <CreditCard className="w-3 h-3" />
                    <span>Pay Dues</span>
                  </button>
                )}
              </div>
              
              <div className="space-y-2.5">
                {/* Total Contribution Approved */}
                <div className="flex justify-between items-center p-3 bg-[var(--background)]/40 border border-[var(--border)] rounded-xl">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-[var(--muted-foreground)]/70">Approved Contribution</p>
                    <p className="text-base font-extrabold text-emerald-400 mt-0.5">{totalPaid.toLocaleString()} TK</p>
                  </div>
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg"><CheckCircle2 className="w-5 h-5" /></div>
                </div>

                {/* Pending Approval Submissions (if any) */}
                {totalPending > 0 && (
                  <div className="flex justify-between items-center p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl animate-pulse">
                    <div>
                      <p className="text-[9px] uppercase font-bold text-amber-400">Awaiting Admin Approval (অপেক্ষমান)</p>
                      <p className="text-base font-extrabold text-amber-300 mt-0.5">{totalPending.toLocaleString()} TK</p>
                    </div>
                    <div className="p-2.5 bg-amber-500/20 text-amber-300 rounded-lg"><Clock className="w-5 h-5" /></div>
                  </div>
                )}

                {/* Outstanding Dues */}
                <div className="flex justify-between items-center p-3 bg-[var(--background)]/40 border border-[var(--border)] rounded-xl">
                  <div>
                    <p className="text-[9px] uppercase font-bold text-[var(--muted-foreground)]/70">Outstanding Dues ({memberUnpaidDues.length} Months)</p>
                    <p className="text-base font-extrabold text-amber-500 mt-0.5">{totalDueAmount.toLocaleString()} TK</p>
                  </div>
                  <div className="p-2.5 bg-amber-500/10 text-amber-400 rounded-lg"><AlertCircle className="w-5 h-5" /></div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-[var(--muted-foreground)] mt-3 pt-3 border-t border-[var(--border)] space-y-1.5">
              {memberUnpaidDues.length > 0 ? (
                <div className="space-y-1">
                  <div className="font-semibold text-amber-400">Dues breakdown by month:</div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {memberUnpaidDues.map((d) => (
                      <span 
                        key={d.id} 
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                          d.isPending 
                            ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                            : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        }`}
                      >
                        {d.isPending ? <Clock className="w-2.5 h-2.5" /> : <AlertCircle className="w-2.5 h-2.5" />}
                        <span>{d.month}: {d.isPending ? 'Pending Approval' : `${d.totalPayable} TK`}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>All subscription payments are cleared and up to date!</span>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Notifications & Messages Panel */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold text-[var(--card-foreground)]">Notifications & Society Messages</h3>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-indigo-600 text-white animate-pulse">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[var(--muted-foreground)]/70">Official notices regarding subscription dues, receipts, and society updates</p>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={() => markAllNotificationsRead()}
                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Check className="w-3 h-3" />
                <span>Mark all as read</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {memberNotifications.length === 0 ? (
              <div className="p-4 text-center text-[var(--muted-foreground)]/70 text-xs border border-dashed border-[var(--border)] rounded-xl">
                No notifications or announcement messages at this time.
              </div>
            ) : (
              memberNotifications.slice(0, 10).map((n) => {
                const isDue = n.type === 'warning' || n.title.toLowerCase().includes('due');
                const isPaid = n.type === 'success' || n.title.toLowerCase().includes('payment') || n.title.toLowerCase().includes('received');
                
                return (
                  <div
                    key={n.id}
                    className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      !n.read 
                        ? 'bg-[var(--secondary)]/90 border-indigo-500/40 shadow-sm' 
                        : 'bg-[var(--background)]/40 border-[var(--border)] opacity-80'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg mt-0.5 shrink-0 ${
                        isPaid
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : isDue
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      }`}>
                        {isPaid ? (
                          <CheckCircle2 className="w-4 h-4" />
                        ) : isDue ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <Bell className="w-4 h-4" />
                        )}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 flex-wrap">
                          <span className="text-xs font-bold text-[var(--card-foreground)]">{n.title}</span>
                          <span className="text-[9px] text-[var(--muted-foreground)]/70">{n.date}</span>
                          {!n.read && (
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 ring-2 ring-indigo-500/30"></span>
                          )}
                        </div>
                        <p className="text-[11px] text-[var(--muted-foreground)] leading-relaxed">{n.message}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                      {n.link && (
                        <a
                          href={n.link}
                          className="px-2.5 py-1 rounded-lg bg-[var(--accent)] hover:bg-zinc-700 text-[var(--foreground)]/80 text-[10px] font-bold flex items-center space-x-1"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {!n.read && (
                        <button
                          onClick={() => markNotificationRead(n.id)}
                          className="px-2.5 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 text-[10px] font-bold cursor-pointer"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Payment History List */}
        <div className="glass-panel p-5 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-xs font-bold text-[var(--card-foreground)]">Subscription & Contribution Ledger</h3>
              <p className="text-[10px] text-[var(--muted-foreground)]/70">Receipts and submission records logged under your profile</p>
            </div>
            {memberUnpaidDues.some(d => !d.isPending) && (
              <button
                type="button"
                onClick={() => {
                  const firstUnpaid = memberUnpaidDues.find(d => !d.isPending);
                  if (firstUnpaid) {
                    setPayModalMonth(firstUnpaid.month);
                    setPayModalAmount(firstUnpaid.baseFee);
                    setPayModalFine(firstUnpaid.fine);
                    setPayModalOpen(true);
                  }
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all cursor-pointer inline-flex items-center space-x-1.5 self-start sm:self-auto"
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Submit Subscription Payment</span>
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Receipt / Ref</th>
                  <th className="pb-2 font-semibold">Target Month</th>
                  <th className="pb-2 font-semibold">Base Amount</th>
                  <th className="pb-2 font-semibold">Late Fine</th>
                  <th className="pb-2 font-semibold">Payment Via</th>
                  <th className="pb-2 font-semibold text-center">Status</th>
                  <th className="pb-2 font-semibold text-right">Invoice / Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {myPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-[var(--muted-foreground)]/70">No payment logs recorded yet.</td>
                  </tr>
                ) : (
                  myPayments.map((p) => {
                    const isPending = p.status === 'pending';
                    const isRejected = p.status === 'rejected';
                    const isPaid = p.status === 'paid' || (!p.status && true);

                    return (
                      <tr key={p.id} className="hover:bg-[var(--secondary)]/30 transition-colors">
                        <td className="py-3 text-[var(--muted-foreground)]">{p.date}</td>
                        <td className="py-3 text-[var(--card-foreground)] font-mono text-[11px] font-medium">
                          {p.receiptNo}
                          {p.transactionRef && (
                            <span className="block text-[10px] text-[var(--muted-foreground)]">Trx: {p.transactionRef}</span>
                          )}
                        </td>
                        <td className="py-3 text-indigo-400 font-semibold">{p.month}</td>
                        <td className="py-3 text-[var(--foreground)]/80 font-bold">{p.amount.toLocaleString()} TK</td>
                        <td className="py-3 text-[var(--muted-foreground)]">
                          {(p.lateFine || 0) > 0 ? (
                            <span className="text-rose-400 font-semibold">+{p.lateFine} TK</span>
                          ) : (
                            <span>0 TK</span>
                          )}
                        </td>
                        <td className="py-3 capitalize text-[var(--muted-foreground)]">{p.paymentType}</td>
                        
                        {/* Status Column */}
                        <td className="py-3 text-center">
                          {isPaid ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>PAID</span>
                            </span>
                          ) : isPending ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center space-x-1 animate-pulse">
                              <Clock className="w-3 h-3" />
                              <span>PENDING APPROVAL</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center space-x-1">
                              <AlertCircle className="w-3 h-3" />
                              <span>REJECTED</span>
                            </span>
                          )}
                        </td>

                        {/* Invoice / Action */}
                        <td className="py-3 text-right">
                          {isPaid ? (
                            <button
                              onClick={() => handlePrintReceipt(p)}
                              className="inline-flex items-center space-x-1 px-2.5 py-1.5 bg-[var(--accent)] hover:bg-zinc-700 text-indigo-400 font-bold rounded-lg text-[10px] transition-colors cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>Receipt Duplicate</span>
                            </button>
                          ) : isPending ? (
                            <span className="text-[11px] text-amber-400 font-semibold">
                              Awaiting Admin Review
                            </span>
                          ) : (
                            <span className="text-[11px] text-rose-400 font-semibold">
                              Rejected
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------------- MODAL: PRINT RECEIPT ---------------- */}
        {printOpen && selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl p-5 relative animate-fade-in-up no-print">
              <button 
                onClick={() => setPrintOpen(false)}
                className="absolute top-4 right-4 p-1 text-[var(--muted-foreground)] hover:text-white rounded-lg hover:bg-[var(--accent)]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="text-xs font-bold text-[var(--card-foreground)]">Print Receipt</h3>
                <p className="text-[9px] text-[var(--muted-foreground)]/70">Send copy to administrative printer</p>
              </div>

              {/* Printable Wrapper */}
              <div className="bg-[var(--background)] p-4 border border-[var(--border)] rounded-xl">
                <PrintableReceipt collection={selectedReceipt} />
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-[var(--border)]">
                <button
                  onClick={() => setPrintOpen(false)}
                  className="px-4 py-1.5 bg-[var(--accent)] hover:bg-zinc-750 text-[var(--muted-foreground)] text-xs rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1 px-4.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Receipt</span>
                </button>
              </div>
            </div>
            
            {/* Real Print Only view in DOM */}
            <div className="print-only fixed inset-0 bg-white text-black p-8 z-50">
              <PrintableReceipt collection={selectedReceipt} />
            </div>

          </div>
        )}

        {/* Member Self-Payment Modal */}
        {payModalOpen && (
          <PaymentSubmitModal
            isOpen={payModalOpen}
            onClose={() => setPayModalOpen(false)}
            memberId={memberProfile.id}
            memberName={memberProfile.name}
            defaultMonth={payModalMonth}
            defaultAmount={payModalAmount}
            defaultFine={payModalFine}
            unpaidMonths={memberUnpaidDues.filter(d => !d.isPending).map(d => ({
              month: d.month,
              fee: d.baseFee,
              fine: d.fine
            }))}
          />
        )}

      </div>
    </DashboardLayout>
  );
}
