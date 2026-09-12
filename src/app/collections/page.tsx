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
  Calendar
} from 'lucide-react';
import PrintableReceipt from '../../components/receipt';
import ExcelImportModal from '../../components/excel-import-modal';
import ConfirmModal from '../../components/confirm-modal';

export default function CollectionsPage() {
  const { members, collections, addCollection, importCollections, deleteCollection, dueDemands } = useStore();
  const { user, hasPermission } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState('all');

  // Form State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [targetMonth, setTargetMonth] = useState('2026-07');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentType, setPaymentType] = useState<'cash' | 'bank'>('cash');
  const [amount, setAmount] = useState(1000);
  const [lateFine, setLateFine] = useState(0);
  const [autoFineEnabled, setAutoFineEnabled] = useState(true);
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

  // Compute unpaid due demands for currently selected member
  const selectedMemberUnpaidDues = React.useMemo(() => {
    if (!selectedMemberId) return [];
    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return [];

    const todayStr = paymentDate || new Date().toISOString().slice(0, 10);

    return dueDemands.map(demand => {
      const isPaid = collections.some(
        c => c.memberId === selectedMemberId && c.month === demand.month && c.status === 'paid'
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
  }, [selectedMemberId, members, collections, dueDemands, paymentDate]);

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
    if (selectedMemberId && autoFineEnabled) {
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

      // Parse headers (lowercased & trimmed)
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Identify column indices
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

        // Split columns and strip surrounding quotes
        const cols = line.split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        
        const memberEmail = emailIdx !== -1 && cols[emailIdx] ? cols[emailIdx] : '';
        const memberPhone = phoneIdx !== -1 && cols[phoneIdx] ? cols[phoneIdx] : '';
        const memberName = nameIdx !== -1 && cols[nameIdx] ? cols[nameIdx] : '';
        const amountVal = amountIdx !== -1 && cols[amountIdx] ? Number(cols[amountIdx]) : 0;
        const monthVal = monthIdx !== -1 && cols[monthIdx] ? cols[monthIdx] : '2026-07';
        const paymentTypeVal = typeIdx !== -1 && cols[typeIdx] && cols[typeIdx].toLowerCase().includes('bank') ? 'bank' : 'cash';
        const fineVal = fineIdx !== -1 && cols[fineIdx] ? Number(cols[fineIdx]) : 0;

        // Find match in active members list
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

      alert(`CSV Import Complete!\n\nSuccessfully imported: ${importCount} collections.\nFailed / skipped rows: ${failCount}.\n(Make sure headers contain: Email, Phone or Name, Amount, Month, and Type)`);
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      alert('Please select a member');
      return;
    }

    const member = members.find(m => m.id === selectedMemberId);
    if (!member) return;

    // Check duplicate payment
    const alreadyPaid = collections.some(c => 
      c.memberId === selectedMemberId && c.month === targetMonth && c.status === 'paid'
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
      status: 'paid',
      collectedBy: user?.name || 'Treasurer'
    });

    // Automatically open receipt print view
    setActiveReceipt(coll);
    setPrintOpen(true);

    // Reset Form
    setSelectedMemberId('');
    setAmount(1000);
    setLateFine(0);
  };

  // Resolve logged-in member for member role — most specific first
  const myMember = React.useMemo(() => {
    if (!user) return null;
    if (user.memberId) {
      const found = members.find(m => m.id === user.memberId);
      if (found) return found;
    }
    const byId = members.find(m => m.id === user.id);
    if (byId) return byId;
    if (user.email) {
      const byEmail = members.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
      if (byEmail) return byEmail;
    }
    if (user.phone) {
      const byPhone = members.find(m => m.phone === user.phone);
      if (byPhone) return byPhone;
    }
    return null;
  }, [members, user]);

  // Filter collections
  const filteredCollections = collections.filter(c => {
    if (user?.role === 'member') {
      if (!myMember || c.memberId !== myMember.id) return false;
    }
    const matchesSearch = c.memberName.toLowerCase().includes(searchQuery.toLowerCase()) || c.receiptNo.includes(searchQuery);
    const matchesMonth = monthFilter === 'all' || c.month === monthFilter;
    const matchesType = paymentTypeFilter === 'all' || c.paymentType === paymentTypeFilter;
    return matchesSearch && matchesMonth && matchesType;
  });

  // Calculate stats
  const totalReceived = filteredCollections.reduce((sum, c) => sum + c.amount, 0);
  const totalFines = filteredCollections.reduce((sum, c) => sum + c.lateFine, 0);

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Top metrics summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card p-4 rounded-xl">
            <span className="text-zinc-400 text-[10px] uppercase font-bold">Total Fees Received (Filtered)</span>
            <p className="text-lg font-black text-white mt-1">{(totalReceived).toLocaleString()} TK</p>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <span className="text-zinc-400 text-[10px] uppercase font-bold">Late Fines Logged (Filtered)</span>
            <p className="text-lg font-black text-rose-400 mt-1">{(totalFines).toLocaleString()} TK</p>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <span className="text-zinc-400 text-[10px] uppercase font-bold">Receipt Transactions count</span>
            <p className="text-lg font-black text-indigo-400 mt-1">{filteredCollections.length} Invoices</p>
          </div>
        </div>

        {/* ---------------- TWO COLUMN GRID ---------------- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Record payment form */}
          <div className="glass-panel p-5 rounded-2xl h-fit">
            <div className="flex items-center space-x-2 mb-4">
              <PlusCircle className="w-4.5 h-4.5 text-indigo-400" />
              <h3 className="text-xs font-bold text-zinc-200">Record Subscription Fees</h3>
            </div>

            {hasPermission('collections', 'create') ? (
              <form onSubmit={handlePay} className="space-y-4 text-xs">
                
                {/* Member selection */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Select Member *</label>
                  <select
                    required
                    value={selectedMemberId}
                    onChange={(e) => handleMemberChange(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
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

                {/* Unpaid Dues Box when member selected */}
                {selectedMemberId && (
                  <div className="p-3 bg-zinc-950/80 border border-zinc-800/80 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-amber-400" />
                        Pending Dues ({selectedMemberUnpaidDues.length} Month{selectedMemberUnpaidDues.length !== 1 ? 's' : ''})
                      </span>
                      {selectedMemberUnpaidDues.length > 0 && (
                        <span className="text-[10px] text-indigo-400 font-medium">Click month to collect</span>
                      )}
                    </div>

                    {selectedMemberUnpaidDues.length > 0 ? (
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
                                  : 'bg-zinc-900/70 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs">{item.demand.month}</span>
                                <span className="text-[10px] text-zinc-300 font-semibold">{item.baseFee} TK</span>
                              </div>
                              <div className="flex items-center justify-between mt-1 text-[9px]">
                                <span className="text-zinc-500">Cutoff: {item.demand.dueDate}</span>
                                {item.fine > 0 ? (
                                  <span className="text-rose-400 font-bold">+{item.fine} TK Fine</span>
                                ) : (
                                  <span className="text-emerald-400 font-medium">No Fine</span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-emerald-400 font-medium py-1">
                        ✓ All active monthly dues are cleared for this member.
                      </p>
                    )}
                  </div>
                )}

                {/* Date & Month selections */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-zinc-400 font-semibold">Billing Month *</label>
                      {selectedMemberUnpaidDues.length > 0 && (
                        <span className="text-[9px] text-amber-400 font-semibold">Unpaid Dues</span>
                      )}
                    </div>
                    {selectedMemberUnpaidDues.length > 0 ? (
                      <select
                        value={targetMonth}
                        onChange={(e) => {
                          const chosenMonth = e.target.value;
                          setTargetMonth(chosenMonth);
                          const matchedDue = selectedMemberUnpaidDues.find(d => d.demand.month === chosenMonth);
                          if (matchedDue) {
                            handleSelectDueMonth(matchedDue);
                          }
                        }}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                      >
                        {selectedMemberUnpaidDues.map((d) => (
                          <option key={d.demand.month} value={d.demand.month}>
                            {d.demand.month} — {d.baseFee} TK {d.fine > 0 ? `(+${d.fine} TK Fine)` : ''}
                          </option>
                        ))}
                        <option value={targetMonth} disabled={selectedMemberUnpaidDues.some(d => d.demand.month === targetMonth)}>
                          {targetMonth} (Selected)
                        </option>
                      </select>
                    ) : (
                      <input
                        type="month"
                        required
                        value={targetMonth}
                        onChange={(e) => setTargetMonth(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500"
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Payment Date *</label>
                    <input
                      type="date"
                      required
                      value={paymentDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Amount and Fine values */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Amount (TK) *</label>
                    <input
                      type="number"
                      required
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Late Fine (TK)</label>
                    <input
                      type="number"
                      value={lateFine}
                      onChange={(e) => setLateFine(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Automatic Fines configuration option */}
                <div className="flex items-center space-x-2 bg-zinc-950/60 p-2.5 border border-zinc-850 rounded-lg">
                  <input
                    type="checkbox"
                    id="autoFine"
                    checked={autoFineEnabled}
                    onChange={(e) => {
                      setAutoFineEnabled(e.target.checked);
                      if (!e.target.checked) setLateFine(0);
                    }}
                    className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 cursor-pointer"
                  />
                  <label htmlFor="autoFine" className="text-[10px] text-zinc-400 cursor-pointer select-none">
                    Enable auto-fine calculation (50 TK after 10th day)
                  </label>
                </div>

                {/* Payment channel selection */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentType('cash')}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        paymentType === 'cash' 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                          : 'border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      Cash in Hand
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentType('bank')}
                      className={`p-2.5 rounded-lg border text-center transition-all ${
                        paymentType === 'bank' 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400' 
                          : 'border-zinc-850 bg-zinc-950 hover:bg-zinc-900 text-zinc-400'
                      }`}
                    >
                      Bank Book
                    </button>
                  </div>
                </div>

                {/* Pay contribution submit */}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg shadow-md shadow-indigo-600/10 transition-all cursor-pointer text-center"
                >
                  Pay & Generate Receipt
                </button>

              </form>
            ) : (
              <div className="p-4 bg-zinc-950 text-zinc-500 rounded-lg text-center">
                Your role does not have permission to record collections.
              </div>
            )}
          </div>

          {/* Right Column: Collections directory logs */}
          <div className="glass-panel p-5 rounded-2xl lg:col-span-2">
            
            {/* Filter headers */}
            <div className="flex flex-col space-y-3 mb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-zinc-200">Collections History Log</h3>
                
                {hasPermission('collections', 'create') && (
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
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                
                {/* Search bar */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search receipt, member..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-850 rounded-lg text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Billing Month Filter */}
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none"
                >
                  <option value="all">All Months</option>
                  <option value="2026-05">2026-05</option>
                  <option value="2026-06">2026-06</option>
                  <option value="2026-07">2026-07</option>
                </select>

                {/* Cash/Bank Channel Filter */}
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value)}
                  className="bg-zinc-950 border border-zinc-850 rounded-lg px-2 py-1.5 text-[11px] text-zinc-300 focus:outline-none"
                >
                  <option value="all">All Accounts</option>
                  <option value="cash">Cash in Hand</option>
                  <option value="bank">Bank Book</option>
                </select>

              </div>
            </div>

            {/* Invoices listings */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 text-zinc-400">
                    <th className="pb-2 font-semibold">Receipt No</th>
                    <th className="pb-2 font-semibold">Member</th>
                    <th className="pb-2 font-semibold text-center">Month</th>
                    <th className="pb-2 font-semibold text-right">Paid Amount</th>
                    <th className="pb-2 font-semibold text-center">Channel</th>
                    <th className="pb-2 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-zinc-500">No collections matched filters</td>
                    </tr>
                  ) : (
                    filteredCollections.map((col) => {
                      const grandTotal = col.amount + col.lateFine;
                      return (
                        <tr key={col.id} className="hover:bg-zinc-900/30 transition-colors">
                          <td className="py-2.5 font-medium text-zinc-300">{col.receiptNo}</td>
                          <td className="py-2.5">
                            <p className="font-bold text-zinc-200">{col.memberName}</p>
                            <p className="text-[9px] text-zinc-500">{col.date}</p>
                          </td>
                          <td className="py-2.5 text-center text-indigo-400 font-semibold">{col.month}</td>
                          <td className="py-2.5 text-right">
                            <p className="font-bold text-zinc-200">{grandTotal.toLocaleString()} TK</p>
                            {col.lateFine > 0 && <p className="text-[8px] text-rose-400">Fine: {col.lateFine} TK</p>}
                          </td>
                          <td className="py-2.5 text-center">
                            <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              col.paymentType === 'cash' 
                                ? 'bg-zinc-800 text-zinc-300' 
                                : 'bg-emerald-500/10 text-emerald-400'
                            }`}>
                              {col.paymentType}
                            </span>
                          </td>
                          <td className="py-2.5 text-right">
                            <div className="flex items-center justify-end space-x-1">
                              
                              {hasPermission('collections', 'print') && (
                                <button
                                  onClick={() => {
                                    setActiveReceipt(col);
                                    setPrintOpen(true);
                                  }}
                                  className="p-1 text-indigo-400 hover:text-indigo-300 hover:bg-zinc-850 rounded"
                                  title="Print Receipt"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {hasPermission('collections', 'delete') && (
                                <button
                                  onClick={() => handleDelete(col)}
                                  className="p-1 text-zinc-500 hover:text-rose-400 hover:bg-zinc-850 rounded"
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
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-5 relative animate-fade-in-up no-print">
              <button 
                onClick={() => setPrintOpen(false)}
                className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="mb-4">
                <h3 className="text-xs font-bold text-zinc-200">Print Receipt Details</h3>
                <p className="text-[9px] text-zinc-500">Record verification complete</p>
              </div>

              {/* Printable Wrapper */}
              <div className="bg-zinc-950 p-4 border border-zinc-850 rounded-xl">
                <PrintableReceipt collection={activeReceipt} />
              </div>

              <div className="flex items-center justify-end space-x-2 mt-4 pt-3 border-t border-zinc-800">
                <button
                  onClick={() => setPrintOpen(false)}
                  className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white border border-zinc-700 text-xs rounded-lg font-bold transition-colors cursor-pointer"
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
