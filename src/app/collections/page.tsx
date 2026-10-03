'use client';

import React, { useState } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { Collection, Member } from '../../types';
import { 
  Search, 
  DollarSign, 
  FileSpreadsheet, 
  Trash2, 
  Printer, 
  X,
  CreditCard,
  Percent,
  PlusCircle,
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Building2,
  Check
} from 'lucide-react';
import PrintableReceipt from '../../components/receipt';
import ExcelImportModal from '../../components/excel-import-modal';
import ConfirmModal from '../../components/confirm-modal';

export default function CollectionsPage() {
  const { 
    members, 
    collections, 
    addCollection, 
    approveCollection, 
    rejectCollection, 
    importCollections, 
    deleteCollection, 
    dueDemands,
    stats 
  } = useStore();
  const { user, hasPermission } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'rejected'>('all');

  // Form State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [targetMonth, setTargetMonth] = useState('2026-07');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<'cash' | 'bank' | 'bkash' | 'nagad'>('cash');
  const [amount, setAmount] = useState(1000);
  const [lateFine, setLateFine] = useState(0);
  const [autoFineEnabled, setAutoFineEnabled] = useState(true);
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeReceipt, setActiveReceipt] = useState<Collection | null>(null);
  const [printOpen, setPrintOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<Collection | null>(null);

  const handleDelete = (col: Collection) => {
    setCollectionToDelete(col);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (collectionToDelete) {
      deleteCollection(collectionToDelete.id);
      setConfirmModalOpen(false);
      setCollectionToDelete(null);
    }
  };

  // Resolve logged-in member for member role — most specific first
  const myMember = React.useMemo(() => {
    if (!user) return null;
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
      const isReal = cleaned.length >= 8 && !/^0+$/.test(cleaned) && !/^0170{5,}/.test(cleaned) && !/^880170{5,}/.test(cleaned);
      if (isReal) {
        const byPhone = members.find(m => m.phone === user.phone);
        if (byPhone) return byPhone;
      }
    }
    return {
      id: user.memberId || user.id.replace('u-', 'm-') || `m-${user.id}`,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      status: 'active' as const,
      joinDate: new Date().toISOString().split('T')[0],
      monthlyFee: 1000,
      nomineeName: '',
      nomineeRelation: '',
      nomineePhone: ''
    };
  }, [members, user]);

  React.useEffect(() => {
    if (user?.role === 'member' && myMember?.id) {
      setSelectedMemberId(myMember.id);
    }
  }, [user, myMember]);

  // Compute unpaid due demands for currently selected member
  const effectiveMemberId = user?.role === 'member' ? (myMember?.id || selectedMemberId) : selectedMemberId;
  const selectedMemberUnpaidDues = React.useMemo(() => {
    if (!effectiveMemberId) return [];
    const member = members.find(m => m.id === effectiveMemberId) || myMember;
    if (!member) return [];

    const todayStr = paymentDate || new Date().toISOString().slice(0, 10);

    return dueDemands.map(demand => {
      const isPaid = collections.some(
        c => (c.memberId === effectiveMemberId || 
              (myMember && c.memberId === myMember.id) ||
              (user?.memberId && c.memberId === user.memberId) ||
              (user?.name && c.memberName?.toLowerCase() === user.name.toLowerCase())) && 
             c.month === demand.month && 
             c.status === 'paid'
      );
      if (isPaid) return null;

      const baseFee = demand.amountType === 'fixed' 
        ? (demand.fixedAmount || 1000) 
        : (member.monthlyFee || 1000);

      const cutoffDay = Number(demand.dueDate.split('-')[2] || 10);
      const payDay = Number(todayStr.split('-')[2] || 1);
      const isOverdue = todayStr > demand.dueDate || payDay > cutoffDay;
      const fine = isOverdue ? (demand.lateFine || 50) : 0;
      const totalPayable = baseFee + fine;

      return {
        demand,
        baseFee,
        fine,
        isOverdue,
        totalPayable
      };
    }).filter(Boolean) as {
      demand: typeof dueDemands[0];
      baseFee: number;
      fine: number;
      isOverdue: boolean;
      totalPayable: number;
    }[];
  }, [effectiveMemberId, members, myMember, collections, dueDemands, paymentDate, user]);

  // Handle member selection changes (Auto populate unpaid due months)
  const handleMemberChange = (id: string) => {
    setSelectedMemberId(id);
    const member = members.find(m => m.id === id);
    if (!member) return;

    // Find if member has unpaid dues
    const unpaid = dueDemands.filter(d => {
      return !collections.some(c => c.memberId === id && c.month === d.month && c.status === 'paid');
    }).sort((a, b) => a.month.localeCompare(b.month));

    if (unpaid.length > 0) {
      const oldestDue = unpaid[0];
      setTargetMonth(oldestDue.month);
      const fee = oldestDue.amountType === 'fixed' ? (oldestDue.fixedAmount || 1000) : member.monthlyFee;
      setAmount(fee);
      const day = new Date(paymentDate).getDate();
      setLateFine(day > 10 ? (oldestDue.lateFine || 50) : 0);
    } else {
      setAmount(member.monthlyFee);
      setLateFine(0);
    }
  };

  // Quick select a specific due month
  const handleSelectDueMonth = (dueItem: typeof selectedMemberUnpaidDues[0]) => {
    setTargetMonth(dueItem.demand.month);
    setAmount(dueItem.baseFee);
    setLateFine(dueItem.fine);
  };

  // Adjust late fine if payment date changes
  const handleDateChange = (date: string) => {
    setPaymentDate(date);
    if (effectiveMemberId && autoFineEnabled) {
      const paymentDay = new Date(date).getDate();
      const matchedDue = dueDemands.find(d => d.month === targetMonth);
      const cutoff = matchedDue ? Number(matchedDue.dueDate.split('-')[2] || 10) : 10;
      if (paymentDay > cutoff) {
        setLateFine(matchedDue?.lateFine || 50);
      } else {
        setLateFine(0);
      }
    }
  };

  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split('\n');
      if (lines.length < 2) {
        alert('CSV file is empty or missing headers');
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const emailIdx = headers.findIndex(h => h.includes('email'));
      const phoneIdx = headers.findIndex(h => h.includes('phone'));
      const nameIdx = headers.findIndex(h => h.includes('name'));
      const amountIdx = headers.findIndex(h => h.includes('amount') || h.includes('fee'));
      const monthIdx = headers.findIndex(h => h.includes('month') || h.includes('period'));
      const typeIdx = headers.findIndex(h => h.includes('type') || h.includes('method') || h.includes('payment'));
      const fineIdx = headers.findIndex(h => h.includes('fine') || h.includes('penalty'));

      let importCount = 0;
      let failCount = 0;

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        const memberEmail = emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx] : '';
        const memberPhone = phoneIdx !== -1 && cols[phoneIdx] ? cols[phoneIdx] : '';
        const memberName = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : '';
        const amountVal = amountIdx !== -1 && cols[amountIdx] ? Number(cols[amountIdx]) : 0;
        const monthVal = monthIdx !== -1 && cols[monthIdx] ? cols[monthIdx] : '2026-07';
        const paymentTypeVal = typeIdx !== -1 && cols[typeIdx] && cols[typeIdx].toLowerCase().includes('bank') ? 'bank' : 'cash';
        const fineVal = fineIdx !== -1 && cols[fineIdx] ? Number(cols[fineIdx]) : 0;

        const member = members.find(m => 
          (memberEmail && m.email.toLowerCase() === memberEmail.toLowerCase()) ||
          (memberPhone && m.phone.replace(/[^0-9]/g, '').includes(memberPhone.replace(/[^0-9]/g, ''))) ||
          (memberName && m.name.toLowerCase() === memberName.toLowerCase())
        );

        if (member && amountVal > 0) {
          addCollection({
            memberId: member.id,
            memberName: member.name,
            amount: amountVal,
            month: monthVal,
            paymentType: paymentTypeVal,
            lateFine: fineVal,
            status: 'paid',
            collectedBy: user?.name || 'Treasurer'
          });
          importCount++;
        } else {
          failCount++;
        }
      }

      alert(`CSV Import Complete!\n\nSuccessfully imported: ${importCount} collections.\nFailed / skipped rows: ${failCount}.`);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    const memId = user?.role === 'member' ? (myMember?.id || selectedMemberId) : selectedMemberId;
    if (!memId) {
      alert('Please select a member');
      return;
    }

    const member = members.find(m => m.id === memId) || myMember;
    if (!member) return;

    const isMemberRole = user?.role === 'member';

    // Check duplicate payment
    const alreadyPaid = collections.some(c => 
      c.memberId === memId && c.month === targetMonth && c.status === 'paid'
    );
    if (alreadyPaid) {
      if (!confirm(`Warning: ${member.name} has already paid subscription fees for ${targetMonth}. Record another payment?`)) {
        return;
      }
    }

    const coll = addCollection({
      memberId: member.id,
      memberName: member.name,
      amount,
      month: targetMonth,
      paymentType,
      lateFine,
      date: paymentDate,
      status: isMemberRole ? 'pending' : 'paid',
      collectedBy: isMemberRole ? 'Member Submission' : (user?.name || 'Treasurer'),
      transactionRef: transactionRef.trim() || undefined,
      notes: notes.trim() || undefined
    });

    if (isMemberRole) {
      setSuccessMessage(`Payment of ${amount + lateFine} TK submitted successfully for ${targetMonth}! It is now pending Admin approval. Dues will remain pending until approved.`);
      setTimeout(() => setSuccessMessage(''), 6000);
    } else {
      setActiveReceipt(coll);
      setPrintOpen(true);
      setSelectedMemberId('');
    }

    // Reset Form
    setAmount(1000);
    setLateFine(0);
    setTransactionRef('');
    setNotes('');
  };

  const handleApprove = async (col: Collection) => {
    if (!confirm(`Approve payment of ${col.amount + col.lateFine} TK for ${col.memberName} (${col.month})? This will mark their due as cleared.`)) {
      return;
    }
    await approveCollection(col.id, user?.name || 'Admin');
  };

  const handleReject = async (col: Collection) => {
    const reason = prompt(`Enter rejection reason for ${col.memberName}'s submission:`, 'Incorrect amount or unverifiable transaction');
    if (reason === null) return;
    await rejectCollection(col.id, reason);
  };

  // Filter collections
  const filteredCollections = collections.filter(c => {
    if (user?.role === 'member') {
      const isMine = 
        (myMember && c.memberId === myMember.id) ||
        (user?.memberId && c.memberId === user.memberId) ||
        (user?.id && (c.memberId === user.id || c.memberId === user.id.replace('u-', 'm-'))) ||
        (myMember?.name && c.memberName?.toLowerCase() === myMember.name.toLowerCase()) ||
        (user?.name && c.memberName?.toLowerCase() === user.name.toLowerCase());
      if (!isMine) return false;
    }
    const matchesSearch = c.memberName.toLowerCase().includes(searchQuery.toLowerCase()) || c.receiptNo.includes(searchQuery);
    const matchesMonth = monthFilter === 'all' || c.month === monthFilter;
    const matchesType = paymentTypeFilter === 'all' || c.paymentType === paymentTypeFilter;
    const matchesStatus = statusFilter === 'all' || c.status === statusFilter;
    return matchesSearch && matchesMonth && matchesType && matchesStatus;
  });

  const pendingCount = collections.filter(c => c.status === 'pending').length;
  const totalReceived = filteredCollections.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
  const totalFines = filteredCollections.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.lateFine, 0);
  const canApprove = user?.role !== 'member';

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* ========================================================================= */}
        {/* REQUIREMENT 2: OVERALL COLLECTION & DUE VISIBLE TO ALL USERS */}
        {/* ========================================================================= */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-emerald-600/10 border border-indigo-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold text-[var(--foreground)] uppercase tracking-wider">Overall Foundation Status (সার্বিক আদায় ও বকেয়া)</span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              Visible to All Users
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* Card 1: Overall Collection */}
            <div className="p-3 rounded-xl bg-[var(--card)]/90 border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold block">Overall Total Collections</span>
              <p className="text-lg md:text-xl font-black text-emerald-400 mt-1">{stats.totalCollection.toLocaleString()} TK</p>
              <span className="text-[9px] text-[var(--muted-foreground)]/70">Verified & approved payments</span>
            </div>

            {/* Card 2: Overall Dues */}
            <div className="p-3 rounded-xl bg-[var(--card)]/90 border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold block">Overall Total Dues</span>
              <p className="text-lg md:text-xl font-black text-amber-400 mt-1">{stats.dueCollection.toLocaleString()} TK</p>
              <span className="text-[9px] text-[var(--muted-foreground)]/70">Across all active members</span>
            </div>

            {/* Card 3: Filtered Received */}
            <div className="p-3 rounded-xl bg-[var(--card)]/90 border border-[var(--border)]">
              <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-bold block">
                {user?.role === 'member' ? 'My Paid Collections' : 'Filtered Collection'}
              </span>
              <p className="text-lg md:text-xl font-black text-white mt-1">{totalReceived.toLocaleString()} TK</p>
              <span className="text-[9px] text-[var(--muted-foreground)]/70">{filteredCollections.filter(c => c.status === 'paid').length} verified receipts</span>
            </div>

            {/* Card 4: Pending Approvals */}
            <div className={`p-3 rounded-xl bg-[var(--card)]/90 border ${pendingCount > 0 ? 'border-amber-500/40 bg-amber-500/5' : 'border-[var(--border)]'}`}>
              <span className="text-[10px] text-amber-400 uppercase font-bold block">Pending Admin Review</span>
              <p className="text-lg md:text-xl font-black text-amber-400 mt-1">{pendingCount} Submissions</p>
              <span className="text-[9px] text-[var(--muted-foreground)]/70">Awaiting admin verification</span>
            </div>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center space-x-2 animate-fade-in-up">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ---------------- TWO COLUMN GRID ---------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Record payment form */}
          <div className="glass-panel p-5 rounded-2xl h-fit">
            <div className="flex items-center space-x-2 mb-4">
              <PlusCircle className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="text-xs font-bold text-[var(--card-foreground)]">Record Subscription Fees</h3>
            </div>

            {user?.role === 'member' ? (
              /* MEMBER PAYMENT SUBMISSION FORM */
              <form onSubmit={handlePay} className="space-y-4 text-xs">
                
                {/* Member locked profile */}
                <div className="p-3 bg-[var(--secondary)] rounded-xl border border-[var(--border)] flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold block">Member Name</span>
                    <span className="font-bold text-[var(--foreground)] text-xs">{myMember?.name || user?.name}</span>
                  </div>
                  <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--foreground)]">
                    {myMember?.id || user?.id}
                  </span>
                </div>

                {/* Unpaid dues notice */}
                {selectedMemberUnpaidDues.length > 0 && (
                  <div className="p-3 bg-[var(--background)]/80 border border-[var(--border)] rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-[var(--foreground)]/80 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Unpaid Dues ({selectedMemberUnpaidDues.length} Month{selectedMemberUnpaidDues.length !== 1 ? 's' : ''})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {selectedMemberUnpaidDues.map((item) => {
                        const isSelected = targetMonth === item.demand.month;
                        return (
                          <button
                            key={item.demand.id || item.demand.month}
                            type="button"
                            onClick={() => handleSelectDueMonth(item)}
                            className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500'
                                : 'bg-[var(--secondary)]/70 border-[var(--border)] text-[var(--foreground)]/80 hover:border-indigo-500/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs">{item.demand.month}</span>
                              <span className="text-[10px] font-semibold">{item.baseFee} TK</span>
                            </div>
                            {item.fine > 0 && (
                              <span className="text-rose-400 font-bold text-[9px] block mt-0.5">+{item.fine} TK Fine</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Billing Month & Payment Date */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Billing Month *</label>
                    {selectedMemberUnpaidDues.length > 0 ? (
                      <select
                        value={targetMonth}
                        onChange={(e) => {
                          const chosen = e.target.value;
                          setTargetMonth(chosen);
                          const matched = selectedMemberUnpaidDues.find(d => d.demand.month === chosen);
                          if (matched) handleSelectDueMonth(matched);
                        }}
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-medium"
                      >
                        {selectedMemberUnpaidDues.map((d) => (
                          <option key={d.demand.month} value={d.demand.month}>
                            {d.demand.month} — {d.baseFee} TK {d.fine > 0 ? `(+${d.fine} TK)` : ''}
                          </option>
                        ))}
                        {!selectedMemberUnpaidDues.some(d => d.demand.month === targetMonth) && (
                          <option value={targetMonth}>{targetMonth} (Selected)</option>
                        )}
                      </select>
                    ) : (
                      <input
                        type="month"
                        required
                        value={targetMonth}
                        onChange={(e) => setTargetMonth(e.target.value)}
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                      />
                    )}
                  </div>

                  <div>
                    <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Amount & Fine */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Amount (TK) *</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--card-foreground)] font-bold focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Late Fine (TK)</label>
                    <input
                      type="number"
                      min="0"
                      value={lateFine}
                      onChange={(e) => setLateFine(Number(e.target.value))}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Payment Channel */}
                <div>
                  <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Payment Method (মাধ্যম) *</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { key: 'bkash', label: 'bKash' },
                      { key: 'nagad', label: 'Nagad' },
                      { key: 'bank', label: 'Bank' },
                      { key: 'cash', label: 'Cash' }
                    ].map((item) => (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => setPaymentType(item.key as any)}
                        className={`p-2 rounded-lg border text-center font-bold text-[11px] transition-all cursor-pointer ${
                          paymentType === item.key 
                            ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500' 
                            : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* TrxID / Slip No */}
                <div>
                  <label className="block text-[var(--muted-foreground)] font-semibold mb-1">TrxID / Reference Note</label>
                  <input
                    type="text"
                    placeholder="e.g. TrxID: 9J4728KA or Bank Slip No"
                    value={transactionRef}
                    onChange={(e) => setTransactionRef(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
                  />
                </div>

                {/* Warning notice: Pending approval */}
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl space-y-1">
                  <div className="flex items-center space-x-1.5 font-bold text-[11px]">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    <span>অপেক্ষমান (Pending) নিয়মাবলী:</span>
                  </div>
                  <p className="text-[10px] leading-relaxed text-[var(--muted-foreground)]">
                    টাকা জমা দেওয়ার পর এটি আপনার অ্যাকাউন্টে <strong>Pending</strong> দেখাবে। <strong>Admin অনুমোদন (Approve) করার পর বকেয়া পরিশোধ গণ্য হবে।</strong>
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg shadow-md shadow-indigo-600/20 transition-all cursor-pointer text-center"
                >
                  Submit Payment for Approval ({amount + lateFine} TK)
                </button>

              </form>
            ) : hasPermission('collections', 'create') ? (
              /* ADMIN DIRECT COLLECTION ENTRY FORM */
              <form onSubmit={handlePay} className="space-y-4 text-xs">
                
                <div>
                  <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Select Member *</label>
                  <select
                    required
                    value={selectedMemberId}
                    onChange={(e) => handleMemberChange(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)]/80 focus:outline-none focus:border-indigo-500 cursor-pointer"
                  >
                    <option value="">-- Choose Member Profile --</option>
                    {members
                      .filter(m => m.status === 'active')
                      .map(m => (
                        <option key={m.id} value={m.id}>{m.name} ({m.phone})</option>
                      ))
                    }
                  </select>
                </div>

                {selectedMemberId && selectedMemberUnpaidDues.length > 0 && (
                  <div className="p-3 bg-[var(--background)]/80 border border-[var(--border)]/80 rounded-xl space-y-2">
                    <span className="text-[11px] font-bold text-[var(--foreground)]/80 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-amber-400" />
                      Pending Dues ({selectedMemberUnpaidDues.length} Month{selectedMemberUnpaidDues.length !== 1 ? 's' : ''})
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {selectedMemberUnpaidDues.map((item) => {
                        const isSelected = targetMonth === item.demand.month;
                        return (
                          <button
                            key={item.demand.id || item.demand.month}
                            type="button"
                            onClick={() => handleSelectDueMonth(item)}
                            className={`p-2 rounded-lg text-left border transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-200 ring-1 ring-indigo-500'
                                : 'bg-[var(--secondary)]/70 border-[var(--border)] text-[var(--foreground)]/80 hover:border-indigo-500/50'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-xs">{item.demand.month}</span>
                              <span className="text-[10px] font-semibold">{item.baseFee} TK</span>
                            </div>
                            {item.fine > 0 && (
                              <span className="text-rose-400 font-bold text-[9px] block mt-0.5">+{item.fine} TK Fine</span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Billing Month *</label>
                    <input
                      type="month"
                      required
                      value={targetMonth}
                      onChange={(e) => setTargetMonth(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Amount (TK) *</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-indigo-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Late Fine (TK)</label>
                    <input
                      type="number"
                      value={lateFine}
                      onChange={(e) => setLateFine(Number(e.target.value))}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--card-foreground)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentType('cash')}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        paymentType === 'cash' 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' 
                          : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      Cash in Hand
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('bank')}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        paymentType === 'bank' 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 font-bold' 
                          : 'border-[var(--border)] bg-[var(--background)] text-[var(--muted-foreground)]'
                      }`}
                    >
                      Bank Book
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg shadow-md shadow-indigo-600/10 transition-all cursor-pointer text-center"
                >
                  Pay & Generate Receipt
                </button>

              </form>
            ) : (
              <div className="p-4 bg-[var(--background)] text-[var(--muted-foreground)]/70 rounded-lg text-center">
                Your role does not have permission to record collections.
              </div>
            )}
          </div>

          {/* Right Column: Collections directory logs */}
          <div className="glass-panel p-5 rounded-2xl lg:col-span-2">
            
            {/* Filter headers */}
            <div className="flex flex-col space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xs font-bold text-[var(--card-foreground)]">Collections History Log</h3>
                  {pendingCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {pendingCount} Pending Approval
                    </span>
                  )}
                </div>
                
                {hasPermission('collections', 'create') && user?.role !== 'member' && (
                  <button
                    onClick={() => setImportModalOpen(true)}
                    className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold rounded-xl cursor-pointer shadow-sm transition-all"
                    title="Import collections via Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Import Excel</span>
                  </button>
                )}
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--muted-foreground)]/70" />
                  <input
                    type="text"
                    placeholder="Search receipt, member..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-[var(--background)] border border-[var(--border)] rounded-lg text-[11px] text-[var(--card-foreground)] placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11px] text-[var(--foreground)] focus:outline-none font-medium"
                >
                  <option value="all">All Statuses</option>
                  <option value="paid">✓ Verified (Paid)</option>
                  <option value="pending">⏳ Pending Approval</option>
                  <option value="rejected">✕ Rejected</option>
                </select>

                {/* Billing Month Filter */}
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11px] text-[var(--foreground)]/80 focus:outline-none"
                >
                  <option value="all">All Months</option>
                  {dueDemands.map(d => (
                    <option key={d.month} value={d.month}>{d.month}</option>
                  ))}
                  <option value="2026-05">2026-05</option>
                  <option value="2026-06">2026-06</option>
                  <option value="2026-07">2026-07</option>
                </select>

                {/* Cash/Bank Channel Filter */}
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value)}
                  className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[11px] text-[var(--foreground)]/80 focus:outline-none"
                >
                  <option value="all">All Methods</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="bank">Bank Book</option>
                  <option value="bkash">bKash</option>
                  <option value="nagad">Nagad</option>
                </select>

              </div>
            </div>

            {/* Invoices listings */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] text-[var(--muted-foreground)]">
                    <th className="pb-2 font-semibold">Receipt No</th>
                    <th className="pb-2 font-semibold">Member</th>
                    <th className="pb-2 font-semibold text-center">Month</th>
                    <th className="pb-2 font-semibold text-right">Amount</th>
                    <th className="pb-2 font-semibold text-center">Status</th>
                    <th className="pb-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-[var(--muted-foreground)]/70">No collections matched filters</td>
                    </tr>
                  ) : (
                    filteredCollections.map((col) => {
                      const grandTotal = col.amount + (col.lateFine || 0);
                      const isPending = col.status === 'pending';
                      const isPaid = col.status === 'paid';
                      return (
                        <tr key={col.id} className="hover:bg-[var(--secondary)]/30 transition-colors">
                          <td className="py-2.5 font-medium text-[var(--foreground)]">
                            <span className="font-mono">{col.receiptNo}</span>
                            {col.transactionRef && (
                              <span className="block text-[9px] text-indigo-400 font-mono">Ref: {col.transactionRef}</span>
                            )}
                          </td>
                          <td className="py-2.5">
                            <p className="font-bold text-[var(--card-foreground)]">{col.memberName}</p>
                            <p className="text-[9px] text-[var(--muted-foreground)]/70">
                              {col.date} • <span className="uppercase">{col.paymentType}</span>
                            </p>
                          </td>
                          <td className="py-2.5 text-center text-indigo-400 font-semibold">{col.month}</td>
                          <td className="py-2.5 text-right">
                            <p className={`font-bold ${isPending ? 'text-amber-400' : 'text-emerald-400'}`}>
                              {grandTotal.toLocaleString()} TK
                            </p>
                            {col.lateFine > 0 && <p className="text-[8px] text-rose-400">Fine: {col.lateFine} TK</p>}
                          </td>
                          
                          {/* Status Badge */}
                          <td className="py-2.5 text-center">
                            {isPaid ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-2.5 h-2.5" />
                                <span>PAID</span>
                              </span>
                            ) : isPending ? (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/15 text-amber-400 border border-amber-500/30 inline-flex items-center space-x-1 animate-pulse">
                                <Clock className="w-2.5 h-2.5" />
                                <span>PENDING</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500/15 text-rose-400 border border-rose-500/30 inline-flex items-center space-x-1">
                                <XCircle className="w-2.5 h-2.5" />
                                <span>REJECTED</span>
                              </span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              
                              {/* Admin Approve & Reject Buttons for Pending */}
                              {isPending && canApprove && (
                                <>
                                  <button
                                    onClick={() => handleApprove(col)}
                                    className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold inline-flex items-center space-x-1 transition-all cursor-pointer shadow-sm"
                                    title="Approve this payment submission"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Approve</span>
                                  </button>
                                  <button
                                    onClick={() => handleReject(col)}
                                    className="p-1 text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                                    title="Reject payment"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {isPaid && hasPermission('collections', 'print') && (
                                <button
                                  onClick={() => {
                                    setActiveReceipt(col);
                                    setPrintOpen(true);
                                  }}
                                  className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-[var(--muted)] rounded cursor-pointer"
                                  title="Print Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {hasPermission('collections', 'delete') && user?.role !== 'member' && (
                                <button
                                  onClick={() => handleDelete(col)}
                                  className="p-1 text-[var(--muted-foreground)]/70 hover:text-rose-400 hover:bg-[var(--muted)] rounded cursor-pointer"
                                  title="Delete Receipt & Reverse Entry"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}

                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

          </div>

        </div>

        {/* ---------------- MODAL: PRINT RECEIPT ---------------- */}
        {printOpen && activeReceipt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="bg-[var(--secondary)] border border-[var(--border)] rounded-2xl w-full max-w-md shadow-2xl p-5 relative animate-fade-in-up no-print">
              <button 
                onClick={() => setPrintOpen(false)}
                className="absolute top-4 right-4 p-1 text-[var(--muted-foreground)] hover:text-white rounded-lg hover:bg-[var(--accent)]"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="text-xs font-bold text-[var(--card-foreground)]">Print Receipt Details</h3>
                <p className="text-[9px] text-[var(--muted-foreground)]/70">Record verification complete</p>
              </div>

              {/* Printable Wrapper */}
              <div className="bg-[var(--background)] p-4 border border-[var(--border)] rounded-xl">
                <PrintableReceipt collection={activeReceipt} />
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-[var(--border)]">
                <button
                  onClick={() => setPrintOpen(false)}
                  className="px-4 py-1.5 bg-[var(--accent)] hover:bg-zinc-700 text-[var(--card-foreground)] hover:text-white border border-[var(--border)] text-xs rounded-lg font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center space-x-1 px-4.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg shadow-md shadow-indigo-600/10 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Send to Printer</span>
                </button>
              </div>
            </div>
            
            {/* Real Print Only view in DOM */}
            <div className="print-only fixed inset-0 bg-white text-black p-8 z-50">
              <PrintableReceipt collection={activeReceipt} />
            </div>
          </div>
        )}

        {/* Excel Import Modal */}
        <ExcelImportModal
          isOpen={importModalOpen}
          type="collections"
          title="Import Collections via Excel"
          onClose={() => setImportModalOpen(false)}
          onImportSuccess={async (rows) => {
            await importCollections(rows);
          }}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModalOpen}
          title="Delete Collection Invoice"
          message={`Are you sure you want to delete receipt "${collectionToDelete?.receiptNo}" for ${collectionToDelete?.memberName} (${collectionToDelete?.amount} TK)? The associated ledger entry will be reverted.`}
          confirmText="Delete & Reverse"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setConfirmModalOpen(false);
            setCollectionToDelete(null);
          }}
        />

      </div>
    </DashboardLayout>
  );
}
