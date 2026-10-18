'use client';

import React, { useState } from 'react';
import DashboardLayout from '../../../components/dashboard-layout';
import { useStore } from '../../../contexts/store-context';
import { useAuth } from '../../../contexts/auth-context';
import { Collection, Member, Loan, LoanRepayment } from '../../../types';
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
  CheckCircle,
  Edit2,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Trash2,
  Save,
  ShieldCheck,
  UserCheck,
  Banknote,
  TrendingDown,
  History,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import PrintableReceipt from '../../../components/receipt';
import PaymentSubmitModal from '../../../components/payment-submit-modal';
import MemberCard from '../../../components/member-card';
import { PageSizeSelector, DataTablePagination, usePagination } from '../../../components/pagination';

export default function MemberProfilePage() {
  const { user } = useAuth();
  const { 
    members, 
    collections, 
    updateMember,
    updateMemberPhoto, 
    resetUserPassword,
    updateUser,
    dueDemands, 
    notifications, 
    markNotificationRead, 
    markAllNotificationsRead,
    loans,
    recordLoanRepayment
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

  // States for Edit Profile modal
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editNomineeName, setEditNomineeName] = useState('');
  const [editNomineeRelation, setEditNomineeRelation] = useState('Wife');
  const [editNomineePhone, setEditNomineePhone] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaveSuccess, setProfileSaveSuccess] = useState<string | null>(null);

  // States for Change Password modal
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);

  // States for Member Loan Repayment & Ledger
  const [loanRepayModalOpen, setLoanRepayModalOpen] = useState(false);
  const [selectedLoanForRepay, setSelectedLoanForRepay] = useState<Loan | null>(null);
  const [loanRepayAmount, setLoanRepayAmount] = useState<number>(1000);
  const [loanRepayDate, setLoanRepayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [loanRepayNote, setLoanRepayNote] = useState('');
  const [loanRepaying, setLoanRepaying] = useState(false);
  const [loanRepaySuccess, setLoanRepaySuccess] = useState<string | null>(null);
  const [loanRepayError, setLoanRepayError] = useState<string | null>(null);
  const [expandedLoanHistoryId, setExpandedLoanHistoryId] = useState<string | null>(null);

  const handleOpenEditProfile = () => {
    if (!memberProfile) return;
    setEditName(memberProfile.name || '');
    setEditPhone(memberProfile.phone || '');
    setEditEmail(memberProfile.email || '');
    setEditNomineeName(memberProfile.nomineeName || '');
    setEditNomineeRelation(memberProfile.nomineeRelation || 'Wife');
    setEditNomineePhone(memberProfile.nomineePhone || '');
    setProfileSaveSuccess(null);
    setEditProfileOpen(true);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memberProfile) return;
    if (!editName.trim()) {
      alert('Name cannot be empty.');
      return;
    }
    setProfileSaving(true);
    try {
      updateMember(memberProfile.id, {
        name: editName.trim(),
        phone: editPhone.trim(),
        email: editEmail.trim(),
        nomineeName: editNomineeName.trim(),
        nomineeRelation: editNomineeRelation.trim(),
        nomineePhone: editNomineePhone.trim()
      });

      // Update current user session in localStorage so header and greetings update
      if (typeof window !== 'undefined' && user) {
        const updatedUser = {
          ...user,
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim()
        };
        localStorage.setItem('fdc_current_user', JSON.stringify(updatedUser));
      }

      setProfileSaveSuccess('Profile details successfully updated! / তথ্য সফলভাবে আপডেট হয়েছে।');
      setTimeout(() => {
        setProfileSaveSuccess(null);
        setEditProfileOpen(false);
      }, 1400);
    } catch (err) {
      console.error(err);
      alert('Failed to update profile details.');
    } finally {
      setProfileSaving(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (!user) return;

    if (user.password && currentPassword !== user.password) {
      setPasswordError('Current password does not match. / বর্তমান পাসওয়ার্ড সঠিক নয়।');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters. / নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match. / পাসওয়ার্ড দুটি মেলেনি।');
      return;
    }

    setPasswordSaving(true);
    try {
      resetUserPassword(user.id, newPassword);

      if (typeof window !== 'undefined') {
        const updatedUser = { ...user, password: newPassword };
        localStorage.setItem('fdc_current_user', JSON.stringify(updatedUser));
      }

      setPasswordSuccess('Password successfully updated! / পাসওয়ার্ড সফলভাবে পরিবর্তিত হয়েছে।');
      setTimeout(() => {
        setPasswordModalOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPasswordSuccess(null);
      }, 1500);
    } catch (err) {
      console.error(err);
      setPasswordError('Failed to change password.');
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleRemovePhoto = () => {
    if (!memberProfile?.photoUrl) return;
    if (confirm('Are you sure you want to remove your profile picture? / আপনি কি প্রোফাইল ছবি মুছে ফেলতে চান?')) {
      updateMemberPhoto(memberProfile.id, '');
      if (typeof window !== 'undefined' && user) {
        const updatedUser = { ...user, avatar: '' };
        localStorage.setItem('fdc_current_user', JSON.stringify(updatedUser));
      }
    }
  };

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

  const {
    currentPage: paymentPage,
    setCurrentPage: setPaymentPage,
    pageSize: paymentPageSize,
    setPageSize: setPaymentPageSize,
    totalPages: paymentTotalPages,
    totalItems: paymentTotalItems,
    paginatedItems: paginatedPayments,
  } = usePagination(myPayments, 10);

  const handlePrintReceipt = (receipt: Collection) => {
    setSelectedReceipt(receipt);
    setPrintOpen(true);
  };

  // Strict matching by member unique ID — strictly prevents any other member's loans from ever leaking
  const myLoans = React.useMemo(() => {
    if (!memberProfile?.id) return [];
    return loans.filter(l => 
      l.memberId === memberProfile.id || 
      (user?.memberId && l.memberId === user.memberId) ||
      (user?.id && (l.memberId === user.id || l.memberId === user.id.replace('u-', 'm-')))
    );
  }, [loans, memberProfile, user]);

  const loanMetrics = React.useMemo(() => {
    const totalDisbursed = myLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
    const totalPayable = myLoans.reduce((sum, l) => sum + (l.totalPayable || 0), 0);
    const totalRepaid = myLoans.reduce((sum, l) => sum + (l.totalRepaid || 0), 0);
    const totalRemaining = Math.max(0, totalPayable - totalRepaid);
    const activeCount = myLoans.filter(l => l.status === 'active' || l.status === 'overdue').length;
    return { totalDisbursed, totalPayable, totalRepaid, totalRemaining, activeCount };
  }, [myLoans]);

  const handleOpenLoanRepayModal = (loan: Loan) => {
    setSelectedLoanForRepay(loan);
    const remaining = Math.max(0, loan.totalPayable - loan.totalRepaid);
    const suggested = Math.min(remaining, Math.max(1000, Math.round(loan.totalPayable / 12)));
    setLoanRepayAmount(suggested);
    setLoanRepayDate(new Date().toISOString().split('T')[0]);
    setLoanRepayNote('Monthly Installment (মাসিক কিস্তি)');
    setLoanRepaySuccess(null);
    setLoanRepayError(null);
    setLoanRepayModalOpen(true);
  };

  const handleLoanRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanForRepay || !memberProfile) return;
    if (loanRepayAmount <= 0) {
      setLoanRepayError('Repayment amount must be greater than 0.');
      return;
    }

    const remaining = Math.max(0, selectedLoanForRepay.totalPayable - selectedLoanForRepay.totalRepaid);
    if (loanRepayAmount > remaining) {
      setLoanRepayError(`Amount exceeds remaining balance of Tk ${remaining.toLocaleString()}.`);
      return;
    }

    setLoanRepaying(true);
    setLoanRepayError(null);
    try {
      const ok = await recordLoanRepayment(selectedLoanForRepay.id, {
        amount: Number(loanRepayAmount),
        date: loanRepayDate,
        note: loanRepayNote.trim() || 'Monthly Installment',
        recordedBy: `${memberProfile.name} (Member Self-Payment)`
      });

      if (ok) {
        setLoanRepaySuccess('Loan repayment submitted and logged successfully! / কিস্তি সফলভাবে পরিশোধ হয়েছে!');
        setTimeout(() => {
          setLoanRepayModalOpen(false);
          setSelectedLoanForRepay(null);
          setLoanRepaySuccess(null);
        }, 1400);
      } else {
        setLoanRepayError('Failed to record repayment.');
      }
    } catch (err: any) {
      console.error(err);
      setLoanRepayError(err.message || 'Error recording loan repayment.');
    } finally {
      setLoanRepaying(false);
    }
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
            <div className="relative group mb-3">
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

              {/* Upload / Change trigger badge */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
                className="absolute bottom-0 right-0 p-2 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border-2 border-zinc-900 transition-transform hover:scale-110 cursor-pointer"
                title="Upload or Change Photo"
              >
                <Camera className="w-3.5 h-3.5" />
              </button>

              {/* Remove photo button if photoUrl exists */}
              {memberProfile.photoUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="absolute top-0 right-0 p-1.5 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg border-2 border-zinc-900 transition-transform hover:scale-110 cursor-pointer"
                  title="Remove Photo"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Quick Photo Actions */}
            <div className="flex items-center space-x-3 mb-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={photoLoading}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1 cursor-pointer"
              >
                <Camera className="w-3 h-3" />
                <span>{memberProfile.photoUrl ? 'Change Photo' : 'Upload Photo'}</span>
              </button>
              {memberProfile.photoUrl && (
                <button
                  type="button"
                  onClick={handleRemovePhoto}
                  className="text-[11px] text-rose-400 hover:text-rose-300 font-semibold flex items-center space-x-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            {photoSuccess && (
              <span className="text-[10px] text-emerald-400 font-bold mb-2 flex items-center space-x-1 animate-in fade-in">
                <CheckCircle2 className="w-3 h-3" />
                <span>Profile photo updated!</span>
              </span>
            )}

            <h3 className="text-lg font-black text-white">{memberProfile.name}</h3>
            <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-0.5">Joined on {memberProfile.joinDate}</p>

            <div className="w-full border-t border-[var(--border)] my-3 pt-3 space-y-2 text-left text-xs">
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

            {/* Profile Action Buttons: Edit Info & Password */}
            <div className="w-full pt-3 border-t border-[var(--border)] grid grid-cols-1 sm:grid-cols-2 gap-2 mt-auto">
              <button
                type="button"
                onClick={handleOpenEditProfile}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Profile</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPasswordError(null);
                  setPasswordSuccess(null);
                  setCurrentPassword('');
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordModalOpen(true);
                }}
                className="flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-[var(--accent)] hover:bg-zinc-750 text-[var(--foreground)] text-xs font-bold border border-[var(--border)] transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>Password</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setCardModalOpen(true)}
              className="w-full mt-2 flex items-center justify-center space-x-1.5 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 cursor-pointer"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>Digital Member ID Card</span>
            </button>
          </div>

          {/* Card 2: Nominee & Emergency info */}
          <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Heart className="w-4 h-4 text-rose-500" />
                  <h3 className="text-xs font-bold text-[var(--card-foreground)]">Registered Nominee Details</h3>
                </div>
                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>Edit</span>
                </button>
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

            <div className="pt-3 border-t border-[var(--border)] flex items-center justify-between">
              <span className="text-[10px] text-[var(--muted-foreground)]/70">Emergency nomination record</span>
              <button
                type="button"
                onClick={handleOpenEditProfile}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold flex items-center space-x-1 cursor-pointer"
              >
                <Edit2 className="w-3 h-3" />
                <span>Update Details</span>
              </button>
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

          {/* Top Page Size Selector */}
          <div className="flex items-center justify-between pb-3">
            <PageSizeSelector pageSize={paymentPageSize} onPageSizeChange={setPaymentPageSize} options={[5, 10, 25, 50]} />
            <span className="text-[11px] text-[var(--muted-foreground)]">
              Total: <strong className="text-[var(--foreground)]">{myPayments.length}</strong> payments
            </span>
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
                {paginatedPayments.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-6 text-center text-[var(--muted-foreground)]/70">No payment logs recorded yet.</td>
                  </tr>
                ) : (
                  paginatedPayments.map((p) => {
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

          {/* Bottom Table Controls: Pagination */}
          <DataTablePagination
            currentPage={paymentPage}
            totalPages={paymentTotalPages}
            totalItems={paymentTotalItems}
            pageSize={paymentPageSize}
            onPageChange={setPaymentPage}
          />
        </div>

        {/* ============================================================== */}
        {/* MY LOANS & REPAYMENT SECTION                                   */}
        {/* ============================================================== */}
        <div className="glass-panel p-5 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400 flex items-center justify-center shrink-0">
                <Banknote className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--card-foreground)] flex items-center space-x-2">
                  <span>My Loans & Monthly Repayments</span>
                  <span className="text-[11px] font-normal text-indigo-400">(আমার ঋণ ও কিস্তি)</span>
                </h3>
                <p className="text-[11px] text-[var(--muted-foreground)]/80">
                  Strictly linked to Member ID: <span className="font-mono font-bold text-indigo-400">{memberProfile.id}</span>
                </p>
              </div>
            </div>

            {/* Quick Metrics Bar if user has loans */}
            {myLoans.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-xl bg-[var(--background)]/80 border border-[var(--border)] text-xs">
                  <span className="text-[10px] text-[var(--muted-foreground)] block">Total Disbursed (মোট ঋণ)</span>
                  <span className="font-bold text-[var(--foreground)]">{loanMetrics.totalDisbursed.toLocaleString()} TK</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs">
                  <span className="text-[10px] text-emerald-400 block">Total Repaid (পরিশোধিত)</span>
                  <span className="font-bold text-emerald-400">{loanMetrics.totalRepaid.toLocaleString()} TK</span>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs">
                  <span className="text-[10px] text-rose-400 block">Remaining Due (বকেয়া)</span>
                  <span className="font-bold text-rose-400">{loanMetrics.totalRemaining.toLocaleString()} TK</span>
                </div>
              </div>
            )}
          </div>

          {/* If No Loans */}
          {myLoans.length === 0 ? (
            <div className="py-8 px-4 text-center rounded-xl bg-[var(--background)]/30 border border-dashed border-[var(--border)] space-y-2">
              <div className="w-12 h-12 mx-auto rounded-2xl bg-zinc-500/10 text-zinc-400 flex items-center justify-center">
                <Banknote className="w-6 h-6" />
              </div>
              <p className="text-xs font-semibold text-[var(--foreground)]/80">No active or past loans under your account.</p>
              <p className="text-[11px] text-[var(--muted-foreground)]/70 max-w-md mx-auto">
                সমিতি কর্তৃক আপনার সদস্য আইডিতে (<span className="font-mono text-indigo-400 font-bold">{memberProfile.id}</span>) কোনো ঋণ বরাদ্দ করা হলে তা এখানে স্বয়ংক্রিয়ভাবে প্রদর্শিত হবে এবং আপনি অনলাইন থেকেই মাসিক কিস্তি পরিশোধ করতে পারবেন।
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {myLoans.map((loan) => {
                const balance = Math.max(0, loan.totalPayable - loan.totalRepaid);
                const percentRepaid = Math.min(100, Math.round(((loan.totalRepaid || 0) / (loan.totalPayable || 1)) * 100));
                const isOverdue = loan.status === 'overdue' || (loan.status === 'active' && new Date().toISOString().slice(0, 10) > loan.dueDate);
                const isFullyPaid = loan.status === 'fully_paid' || balance <= 0;
                const isExpanded = expandedLoanHistoryId === loan.id;

                return (
                  <div 
                    key={loan.id} 
                    className="p-4 sm:p-5 rounded-2xl bg-[var(--background)]/60 border border-[var(--border)] hover:border-indigo-500/30 transition-all space-y-4"
                  >
                    {/* Header of Loan Card */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--border)]/60 pb-3">
                      <div className="flex items-center space-x-2.5">
                        <span className="px-2.5 py-1 rounded-lg bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-mono text-xs font-bold">
                          {loan.loanNo}
                        </span>
                        <span className="capitalize text-xs font-semibold px-2 py-0.5 rounded-md bg-[var(--accent)] text-[var(--foreground)]/80">
                          {loan.loanType} Loan
                        </span>
                        {loan.purpose && (
                          <span className="text-[11px] text-[var(--muted-foreground)] hidden md:inline truncate max-w-xs">
                            — {loan.purpose}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center space-x-2">
                        {isFullyPaid ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>FULLY PAID (সম্পূর্ণ পরিশোধিত)</span>
                          </span>
                        ) : isOverdue ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center space-x-1">
                            <AlertCircle className="w-3 h-3" />
                            <span>OVERDUE (মেয়াদোত্তীর্ণ)</span>
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/15 text-blue-400 border border-blue-500/30 inline-flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span>ACTIVE (চলমান)</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Financial Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                      <div className="p-2.5 rounded-xl bg-[var(--secondary)]/40 border border-[var(--border)]/60">
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Principal (মূল ঋণ)</span>
                        <span className="font-bold text-[var(--foreground)]">{loan.principalAmount.toLocaleString()} TK</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[var(--secondary)]/40 border border-[var(--border)]/60">
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Interest Rate</span>
                        <span className="font-bold text-amber-400">{loan.interestRate}% / year</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[var(--secondary)]/40 border border-[var(--border)]/60">
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Total Payable (মোট প্রদেয়)</span>
                        <span className="font-bold text-[var(--foreground)]">{loan.totalPayable.toLocaleString()} TK</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-[10px] text-emerald-400 block">Total Repaid (পরিশোধিত)</span>
                        <span className="font-bold text-emerald-400">{loan.totalRepaid.toLocaleString()} TK</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <span className="text-[10px] text-rose-400 block">Remaining Balance (বাকি)</span>
                        <span className="font-bold text-rose-400 text-sm">{balance.toLocaleString()} TK</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[var(--secondary)]/40 border border-[var(--border)]/60">
                        <span className="text-[10px] text-[var(--muted-foreground)] block">Due Date (মেয়াদ শেষ)</span>
                        <span className={`font-bold ${isOverdue ? 'text-rose-400' : 'text-[var(--foreground)]'}`}>
                          {loan.dueDate}
                        </span>
                      </div>
                    </div>

                    {/* Repayment Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[var(--muted-foreground)] font-medium">
                          Repayment Progress (পরিশোধের অগ্রগতি):
                        </span>
                        <span className="font-bold text-emerald-400">
                          {percentRepaid}% ({loan.totalRepaid.toLocaleString()} / {loan.totalPayable.toLocaleString()} TK)
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--secondary)] overflow-hidden border border-[var(--border)]/50">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 via-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
                          style={{ width: `${percentRepaid}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setExpandedLoanHistoryId(isExpanded ? null : loan.id)}
                        className="px-3 py-1.5 rounded-xl bg-[var(--accent)] hover:bg-zinc-700 text-xs font-semibold text-[var(--foreground)] transition-colors inline-flex items-center space-x-1.5 cursor-pointer"
                      >
                        <History className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Installment History ({loan.repayments?.length || 0})</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>

                      {!isFullyPaid && (
                        <button
                          type="button"
                          onClick={() => handleOpenLoanRepayModal(loan)}
                          className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/25 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Banknote className="w-4 h-4" />
                          <span>Pay Monthly Installment / কিস্তি পরিশোধ</span>
                        </button>
                      )}
                    </div>

                    {/* Expandable Repayments Ledger */}
                    {isExpanded && (
                      <div className="mt-3 p-3.5 rounded-xl bg-[var(--secondary)]/50 border border-[var(--border)] animate-fade-in-up space-y-2">
                        <div className="text-xs font-bold text-[var(--card-foreground)] flex items-center space-x-2">
                          <History className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Installment Payment Logs ({loan.loanNo})</span>
                        </div>
                        {(!loan.repayments || loan.repayments.length === 0) ? (
                          <p className="text-[11px] text-[var(--muted-foreground)]/70 py-2">No installments paid yet.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)] text-[10px]">
                                  <th className="pb-1.5 font-semibold">Date</th>
                                  <th className="pb-1.5 font-semibold">Amount Paid</th>
                                  <th className="pb-1.5 font-semibold">Payment Note / Method</th>
                                  <th className="pb-1.5 font-semibold text-right">Recorded By</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[var(--border)]/50">
                                {loan.repayments.map((rep) => (
                                  <tr key={rep.id} className="hover:bg-[var(--accent)]/30">
                                    <td className="py-2 text-[var(--muted-foreground)]">{rep.date}</td>
                                    <td className="py-2 text-emerald-400 font-bold font-mono">+{rep.amount.toLocaleString()} TK</td>
                                    <td className="py-2 text-[var(--foreground)]/80 text-[11px]">{rep.note || 'Monthly Installment'}</td>
                                    <td className="py-2 text-right text-[10px] text-[var(--muted-foreground)]">{rep.recordedBy}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ---------------- MODAL: PRINT RECEIPT ---------------- */}
        {/* ---------------- MODAL: PRINT RECEIPT WITH OFFICIAL FDC PAD ---------------- */}
        {printOpen && selectedReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-3xl w-full max-w-2xl shadow-2xl p-4 sm:p-6 relative animate-fade-in-up no-print my-6">
              <button 
                type="button"
                onClick={() => setPrintOpen(false)}
                className="absolute top-4 right-4 p-2 text-[var(--muted-foreground)] hover:text-white rounded-xl hover:bg-[var(--accent)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4 pr-10">
                <h3 className="text-sm font-bold text-[var(--card-foreground)]">Official Money Receipt Voucher</h3>
                <p className="text-[11px] text-[var(--muted-foreground)]/70">FDC Foundation computerized subscription deposit pad</p>
              </div>

              {/* Printable Wrapper */}
              <div className="overflow-x-auto max-h-[70vh] overflow-y-auto rounded-xl p-1 bg-zinc-200/50">
                <PrintableReceipt collection={selectedReceipt} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-3 border-t border-[var(--border)]">
                <div className="text-[11px] text-[var(--muted-foreground)]">
                  Receipt Ref: <span className="font-mono text-emerald-400 font-bold">{selectedReceipt.receiptNo}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setPrintOpen(false)}
                    className="px-4 py-2 bg-[var(--accent)] hover:bg-zinc-750 text-[var(--muted-foreground)] text-xs rounded-xl font-medium cursor-pointer"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center space-x-1.5 px-4.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt Pad</span>
                  </button>
                </div>
              </div>
            </div>
            
            {/* Real Print Only view in DOM */}
            <div className="print-only fixed inset-0 bg-white text-black p-8 z-50">
              <PrintableReceipt collection={selectedReceipt} />
            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: EDIT PROFILE INFORMATION (সদস্য তথ্য পরিবর্তন) */}
        {/* ========================================================================= */}
        {editProfileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
            <div 
              className="bg-[var(--secondary)] border border-[var(--border)] rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 relative animate-in zoom-in-95 duration-150 my-6 max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                type="button"
                onClick={() => setEditProfileOpen(false)}
                disabled={profileSaving}
                className="absolute top-4 right-4 p-2 text-[var(--muted-foreground)] hover:text-white rounded-xl hover:bg-[var(--accent)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 mb-5 pb-3 border-b border-[var(--border)]">
                <div className="w-10 h-10 rounded-2xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Edit Profile Information</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">ব্যক্তিগত ও নমিনীর তথ্য পরিবর্তন করুন</p>
                </div>
              </div>

              {profileSaveSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{profileSaveSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
                
                {/* Personal Information Group */}
                <div className="space-y-3">
                  <div className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">
                    Personal Details (ব্যক্তিগত বিবরণ)
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                      Full Name (পূর্ণ নাম) *
                    </label>
                    <input
                      type="text"
                      required
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="e.g. Kabir Ahmed"
                      className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                        Phone / Mobile (মোবাইল)
                      </label>
                      <input
                        type="tel"
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                        placeholder="017XXXXXXXX"
                        className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                        Email Address (ইমেইল)
                      </label>
                      <input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        placeholder="name@email.com"
                        className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] placeholder-zinc-500 focus:outline-none focus:border-indigo-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Nominee Details Group */}
                <div className="space-y-3 pt-3 border-t border-[var(--border)]">
                  <div className="text-[10px] font-black uppercase text-rose-400 tracking-wider">
                    Registered Nominee (নমিনী তথ্য)
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                      Nominee Full Name (নমিনীর নাম)
                    </label>
                    <input
                      type="text"
                      value={editNomineeName}
                      onChange={(e) => setEditNomineeName(e.target.value)}
                      placeholder="e.g. Salma Begum"
                      className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                        Relation (সম্পর্ক)
                      </label>
                      <select
                        value={editNomineeRelation}
                        onChange={(e) => setEditNomineeRelation(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
                      >
                        <option value="Wife">Wife (স্ত্রী)</option>
                        <option value="Husband">Husband (স্বামী)</option>
                        <option value="Mother">Mother (মা)</option>
                        <option value="Father">Father (বাবা)</option>
                        <option value="Brother">Brother (ভাই)</option>
                        <option value="Sister">Sister (বোন)</option>
                        <option value="Son">Son (ছেলে)</option>
                        <option value="Daughter">Daughter (মেয়ে)</option>
                        <option value="Other">Other (অন্যান্য)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                        Nominee Phone (মোবাইল)
                      </label>
                      <input
                        type="tel"
                        value={editNomineePhone}
                        onChange={(e) => setEditNomineePhone(e.target.value)}
                        placeholder="01XXXXXXXXX"
                        className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] placeholder-zinc-500 focus:outline-none focus:border-rose-500 font-medium"
                      />
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setEditProfileOpen(false)}
                    disabled={profileSaving}
                    className="px-4 py-2.5 bg-[var(--accent)] hover:bg-zinc-700 text-[var(--foreground)] text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={profileSaving}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {profileSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    <span>Save Changes</span>
                  </button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* MODAL: CHANGE USER PASSWORD (পাসওয়ার্ড পরিবর্তন) */}
        {/* ========================================================================= */}
        {passwordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
            <div 
              className="bg-[var(--secondary)] border border-[var(--border)] rounded-3xl w-full max-w-md shadow-2xl p-5 sm:p-6 relative animate-in zoom-in-95 duration-150 my-6"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                type="button"
                onClick={() => setPasswordModalOpen(false)}
                disabled={passwordSaving}
                className="absolute top-4 right-4 p-2 text-[var(--muted-foreground)] hover:text-white rounded-xl hover:bg-[var(--accent)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 mb-5 pb-3 border-b border-[var(--border)]">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Change Password</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">আপনার অ্যাকাউন্টের নতুন পাসওয়ার্ড সেট করুন</p>
                </div>
              </div>

              {passwordError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {passwordSuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
                
                {user?.password && (
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                      Current Password (বর্তমান পাসওয়ার্ড)
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="Enter current password"
                        className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-medium pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-2.5 text-[var(--muted-foreground)] hover:text-white"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    New Password (নতুন পাসওয়ার্ড) *
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-medium pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-[var(--muted-foreground)] hover:text-white"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[10px] text-[var(--muted-foreground)]/70 mt-1">কমপক্ষে ৬ অক্ষরের শক্তিশালী পাসওয়ার্ড দিন</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    Confirm New Password (নতুন পাসওয়ার্ড নিশ্চিতকরণ) *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] placeholder-zinc-500 focus:outline-none focus:border-amber-500 font-medium"
                  />
                </div>

                {/* Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setPasswordModalOpen(false)}
                    disabled={passwordSaving}
                    className="px-4 py-2.5 bg-[var(--accent)] hover:bg-zinc-750 text-[var(--foreground)] text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={passwordSaving}
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/30 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {passwordSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <KeyRound className="w-3.5 h-3.5" />}
                    <span>Update Password</span>
                  </button>
                </div>

              </form>
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

        {/* Digital Member Card Modal */}
        {cardModalOpen && (
          <MemberCard
            member={memberProfile}
            collections={myPayments}
            onClose={() => setCardModalOpen(false)}
          />
        )}

        {/* ============================================================== */}
        {/* MODAL: MEMBER LOAN REPAYMENT / MONTHLY INSTALLMENT             */}
        {/* ============================================================== */}
        {loanRepayModalOpen && selectedLoanForRepay && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 overflow-y-auto">
            <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-3xl w-full max-w-lg shadow-2xl p-5 sm:p-6 relative animate-fade-in-up my-6">
              <button
                type="button"
                onClick={() => setLoanRepayModalOpen(false)}
                className="absolute top-4 right-4 p-2 text-[var(--muted-foreground)] hover:text-white rounded-xl hover:bg-[var(--accent)] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center space-x-3 mb-5 pb-3 border-b border-[var(--border)]">
                <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Banknote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white tracking-tight">Pay Loan Installment</h3>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    ঋণের মাসিক কিস্তি পরিশোধ — <span className="font-mono text-emerald-400 font-bold">{selectedLoanForRepay.loanNo}</span>
                  </p>
                </div>
              </div>

              {/* Loan Summary Badge */}
              <div className="mb-4 p-3.5 rounded-2xl bg-[var(--background)] border border-[var(--border)] grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] block">Total Payable</span>
                  <span className="font-bold text-[var(--foreground)]">{selectedLoanForRepay.totalPayable.toLocaleString()} TK</span>
                </div>
                <div>
                  <span className="text-[10px] text-emerald-400 block">Total Repaid</span>
                  <span className="font-bold text-emerald-400">{selectedLoanForRepay.totalRepaid.toLocaleString()} TK</span>
                </div>
                <div>
                  <span className="text-[10px] text-rose-400 block">Remaining Due</span>
                  <span className="font-bold text-rose-400">
                    {Math.max(0, selectedLoanForRepay.totalPayable - selectedLoanForRepay.totalRepaid).toLocaleString()} TK
                  </span>
                </div>
              </div>

              {loanRepaySuccess && (
                <div className="mb-4 p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{loanRepaySuccess}</span>
                </div>
              )}

              {loanRepayError && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{loanRepayError}</span>
                </div>
              )}

              <form onSubmit={handleLoanRepaySubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                    Repayment Amount (পরিশোধের পরিমাণ - টাকা) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={Math.max(0, selectedLoanForRepay.totalPayable - selectedLoanForRepay.totalRepaid)}
                    value={loanRepayAmount}
                    onChange={(e) => setLoanRepayAmount(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] font-bold focus:outline-none focus:border-emerald-500"
                  />
                  {/* Quick Preset Buttons */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {[1000, 2000, 5000].map((amt) => {
                      const balance = Math.max(0, selectedLoanForRepay.totalPayable - selectedLoanForRepay.totalRepaid);
                      if (amt > balance) return null;
                      return (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setLoanRepayAmount(amt)}
                          className="px-2.5 py-1 rounded-lg bg-[var(--accent)] hover:bg-zinc-700 text-[10px] font-bold text-[var(--foreground)]/80 transition-colors cursor-pointer"
                        >
                          +{amt.toLocaleString()} TK
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() => setLoanRepayAmount(Math.max(0, selectedLoanForRepay.totalPayable - selectedLoanForRepay.totalRepaid))}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold transition-colors cursor-pointer ml-auto"
                    >
                      Pay Full Due ({Math.max(0, selectedLoanForRepay.totalPayable - selectedLoanForRepay.totalRepaid).toLocaleString()} TK)
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                      Payment Date (তারিখ) *
                    </label>
                    <input
                      type="date"
                      required
                      value={loanRepayDate}
                      onChange={(e) => setLoanRepayDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[var(--foreground)] mb-1">
                      Payment Note / Trx ID (বিবরণ)
                    </label>
                    <input
                      type="text"
                      value={loanRepayNote}
                      onChange={(e) => setLoanRepayNote(e.target.value)}
                      placeholder="e.g. Bkash TrxID / Monthly Installment"
                      className="w-full px-3.5 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Remaining preview */}
                <div className="p-3 rounded-xl bg-[var(--background)]/70 border border-[var(--border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)]">Remaining after this installment:</span>
                  <span className="font-bold text-emerald-400 font-mono">
                    {Math.max(0, (selectedLoanForRepay.totalPayable - selectedLoanForRepay.totalRepaid) - (Number(loanRepayAmount) || 0)).toLocaleString()} TK
                  </span>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-2 pt-3 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setLoanRepayModalOpen(false)}
                    disabled={loanRepaying}
                    className="px-4 py-2.5 bg-[var(--accent)] hover:bg-zinc-750 text-[var(--foreground)] text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loanRepaying}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {loanRepaying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                    <span>Confirm Installment Payment</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
