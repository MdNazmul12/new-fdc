'use client';

import React, { useState, useMemo } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { Loan, LoanType, LoanStatus, LoanRepayment } from '../../types';
import {
  Banknote,
  TrendingDown,
  Clock,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  History,
  DollarSign,
  User,
  ShieldAlert,
  X,
  CreditCard,
  Calendar,
  FileText,
  AlertCircle,
  Trash2
} from 'lucide-react';

export default function LoansPage() {
  const { loans, members, addLoan, recordLoanRepayment, updateLoanStatus, deleteLoan } = useStore();
  const { user, hasPermission } = useAuth();

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LoanStatus>('all');
  const [typeFilter, setTypeFilter] = useState<'all' | LoanType>('all');

  // Modal states
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [repayModalOpen, setRepayModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);

  // Issue Loan Form State
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loanType, setLoanType] = useState<LoanType>('personal');
  const [principalAmount, setPrincipalAmount] = useState<number>(20000);
  const [interestRate, setInterestRate] = useState<number>(10);
  const [disbursedDate, setDisbursedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 12);
    return d.toISOString().split('T')[0];
  });
  const [purpose, setPurpose] = useState('');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Repayment Form State
  const [repayAmount, setRepayAmount] = useState<number>(1000);
  const [repayDate, setRepayDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [repayNote, setRepayNote] = useState('');
  const [repaying, setRepaying] = useState(false);

  // Live Interest & Total Payable Calculation for Form
  const formCalculation = useMemo(() => {
    const p = Number(principalAmount) || 0;
    const rate = Number(interestRate) || 0;
    const d1 = new Date(disbursedDate);
    const d2 = new Date(dueDate);
    const diffMonths = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
    const interest = Math.round(p * (rate / 100) * (diffMonths / 12));
    const totalPayable = p + interest;
    return { diffMonths, interest, totalPayable };
  }, [principalAmount, interestRate, disbursedDate, dueDate]);

  // Filtered loans based on permissions and search
  const visibleLoans = useMemo(() => {
    let list = loans;

    // Regular member sees only their own loans
    if (user?.role === 'member') {
      list = list.filter((l) => {
        return (
          l.memberId === user.memberId ||
          l.memberId === user.id ||
          l.memberId === user.id.replace('u-', 'm-') ||
          (user.name && l.memberName?.toLowerCase() === user.name.toLowerCase())
        );
      });
    }

    return list.filter((l) => {
      const matchesSearch =
        l.loanNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (l.purpose && l.purpose.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === 'all' || l.status === statusFilter;
      const matchesType = typeFilter === 'all' || l.loanType === typeFilter;

      return matchesSearch && matchesStatus && matchesType;
    });
  }, [loans, user, searchQuery, statusFilter, typeFilter]);

  // Metrics
  const metrics = useMemo(() => {
    const totalDisbursed = visibleLoans.reduce((sum, l) => sum + (l.principalAmount || 0), 0);
    const totalRepaid = visibleLoans.reduce((sum, l) => sum + (l.totalRepaid || 0), 0);
    const totalPayable = visibleLoans.reduce((sum, l) => sum + (l.totalPayable || 0), 0);
    const totalOutstanding = Math.max(0, totalPayable - totalRepaid);
    const activeCount = visibleLoans.filter((l) => l.status === 'active').length;
    return { totalDisbursed, totalRepaid, totalOutstanding, activeCount };
  }, [visibleLoans]);

  const handleOpenIssueModal = () => {
    if (members.length > 0 && !selectedMemberId) {
      setSelectedMemberId(members[0].id);
    }
    setIssueModalOpen(true);
  };

  const handleIssueLoanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId) {
      alert('Please select a member.');
      return;
    }
    const targetMember = members.find((m) => m.id === selectedMemberId);
    if (!targetMember) return;

    if (principalAmount <= 0) {
      alert('Principal amount must be greater than 0.');
      return;
    }

    setSubmitting(true);
    try {
      await addLoan({
        memberId: targetMember.id,
        memberName: targetMember.name,
        loanType,
        principalAmount: Number(principalAmount),
        interestRate: Number(interestRate),
        disbursedDate,
        dueDate,
        purpose: purpose.trim() || 'General Welfare Loan',
        guarantorName: guarantorName.trim(),
        guarantorPhone: guarantorPhone.trim(),
        approvedBy: user?.name || 'Administrator',
        notes: notes.trim(),
      });
      setIssueModalOpen(false);
      setPurpose('');
      setGuarantorName('');
      setGuarantorPhone('');
      setNotes('');
    } catch (err) {
      console.error('Error issuing loan:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenRepayModal = (loan: Loan) => {
    setSelectedLoan(loan);
    const balance = Math.max(0, loan.totalPayable - loan.totalRepaid);
    setRepayAmount(Math.min(balance, 1000));
    setRepayDate(new Date().toISOString().split('T')[0]);
    setRepayNote('');
    setRepayModalOpen(true);
  };

  const handleRepaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoan) return;
    if (repayAmount <= 0) {
      alert('Repayment amount must be greater than 0.');
      return;
    }

    setRepaying(true);
    try {
      await recordLoanRepayment(selectedLoan.id, {
        amount: Number(repayAmount),
        date: repayDate,
        note: repayNote.trim(),
        recordedBy: user?.name || 'Admin',
      });
      setRepayModalOpen(false);
      setSelectedLoan(null);
    } catch (err) {
      console.error('Error recording repayment:', err);
    } finally {
      setRepaying(false);
    }
  };

  const canManageLoans =
    user?.role === 'super_admin' ||
    user?.role === 'president' ||
    user?.role === 'treasurer';

  const getStatusBadge = (status: LoanStatus) => {
    switch (status) {
      case 'active':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-sky-500/10 text-sky-400 border border-sky-500/20">
            Active
          </span>
        );
      case 'fully_paid':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Fully Paid
          </span>
        );
      case 'overdue':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-500/10 text-rose-400 border border-rose-500/20">
            Overdue
          </span>
        );
      case 'written_off':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-zinc-500/10 text-zinc-400 border border-zinc-500/20">
            Written Off
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-black text-[var(--foreground)] tracking-tight flex items-center space-x-2">
              <Banknote className="w-6 h-6 text-indigo-400" />
              <span>Loan Management & Repayments</span>
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              Disburse community loans, monitor interest schedules, and track monthly repayments
            </p>
          </div>

          {canManageLoans && (
            <button
              onClick={handleOpenIssueModal}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center space-x-1.5 cursor-pointer self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Issue New Loan</span>
            </button>
          )}
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel p-4 rounded-2xl border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Total Disbursed</span>
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Banknote className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-[var(--foreground)] mt-2">
              ৳{metrics.totalDisbursed.toLocaleString()}
            </p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Principal issued</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 bg-amber-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-amber-400">Outstanding Balance</span>
              <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-amber-400 mt-2">
              ৳{metrics.totalOutstanding.toLocaleString()}
            </p>
            <p className="text-[10px] text-amber-400/70 mt-0.5">Principal + Interest remaining</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-400">Total Repaid</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-emerald-400 mt-2">
              ৳{metrics.totalRepaid.toLocaleString()}
            </p>
            <p className="text-[10px] text-emerald-400/70 mt-0.5">Recovered into fund</p>
          </div>

          <div className="glass-panel p-4 rounded-2xl border border-[var(--border)]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[var(--muted-foreground)]">Active Loans</span>
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <p className="text-xl font-black text-[var(--foreground)] mt-2">{metrics.activeCount}</p>
            <p className="text-[10px] text-[var(--muted-foreground)] mt-0.5">Running repayment cycles</p>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input
              type="text"
              placeholder="Search by loan no, member name, purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-[var(--secondary)] border border-[var(--border)] rounded-xl text-xs text-[var(--foreground)] placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center space-x-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="fully_paid">Fully Paid</option>
              <option value="overdue">Overdue</option>
              <option value="written_off">Written Off</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="bg-[var(--secondary)] border border-[var(--border)] rounded-xl px-3 py-2 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Loan Types</option>
              <option value="personal">Personal</option>
              <option value="emergency">Emergency</option>
              <option value="business">Business</option>
              <option value="education">Education</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Loans Table */}
        <div className="glass-panel rounded-2xl overflow-hidden border border-[var(--border)]">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)]">
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Loan No</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Member</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Type & Purpose</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Principal</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Total Payable</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Repaid / Balance</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px]">Timeline</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-center">Status</th>
                  <th className="p-3.5 font-bold uppercase tracking-wider text-[10px] text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {visibleLoans.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-[var(--muted-foreground)]">
                      <Banknote className="w-8 h-8 mx-auto mb-2 opacity-30" />
                      <p className="font-semibold text-sm">No loan records found.</p>
                      <p className="text-[11px] mt-0.5">
                        {canManageLoans ? 'Click "Issue New Loan" to create one.' : 'You have no loans assigned.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  visibleLoans.map((loan) => {
                    const balance = Math.max(0, loan.totalPayable - loan.totalRepaid);
                    const progressPercent = Math.min(
                      100,
                      Math.round((loan.totalRepaid / (loan.totalPayable || 1)) * 100)
                    );

                    return (
                      <tr key={loan.id} className="hover:bg-[var(--accent)]/30 transition-colors">
                        <td className="p-3.5 font-mono font-bold text-indigo-400">{loan.loanNo}</td>

                        <td className="p-3.5">
                          <p className="font-bold text-[var(--foreground)]">{loan.memberName}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)] font-mono">{loan.memberId}</p>
                        </td>

                        <td className="p-3.5">
                          <span className="capitalize px-2 py-0.5 rounded-md bg-[var(--secondary)] text-[var(--foreground)] border border-[var(--border)] text-[10px] font-semibold">
                            {loan.loanType}
                          </span>
                          <p className="text-[10px] text-[var(--muted-foreground)] truncate max-w-[140px] mt-1">
                            {loan.purpose}
                          </p>
                        </td>

                        <td className="p-3.5 font-bold text-[var(--foreground)]">
                          ৳{loan.principalAmount.toLocaleString()}
                          <span className="block text-[9px] text-[var(--muted-foreground)] font-normal">
                            @{loan.interestRate}% p.a.
                          </span>
                        </td>

                        <td className="p-3.5 font-black text-white">
                          ৳{loan.totalPayable.toLocaleString()}
                        </td>

                        <td className="p-3.5 min-w-[130px]">
                          <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                            <span className="text-emerald-400">৳{loan.totalRepaid.toLocaleString()}</span>
                            <span className="text-amber-400">৳{balance.toLocaleString()}</span>
                          </div>
                          <div className="w-full bg-[var(--secondary)] h-1.5 rounded-full overflow-hidden">
                            <div
                              className="bg-emerald-500 h-full rounded-full transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <span className="text-[9px] text-[var(--muted-foreground)] mt-0.5 block">
                            {progressPercent}% repaid
                          </span>
                        </td>

                        <td className="p-3.5 text-[11px] text-[var(--muted-foreground)]">
                          <p>From: {loan.disbursedDate}</p>
                          <p className="text-rose-400/90 font-medium">Due: {loan.dueDate}</p>
                        </td>

                        <td className="p-3.5 text-center">{getStatusBadge(loan.status)}</td>

                        <td className="p-3.5 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {canManageLoans && loan.status === 'active' && (
                              <button
                                onClick={() => handleOpenRepayModal(loan)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                                title="Record Repayment"
                              >
                                <DollarSign className="w-3.5 h-3.5" />
                                <span>Repay</span>
                              </button>
                            )}

                            <button
                              onClick={() => {
                                setSelectedLoan(loan);
                                setDetailModalOpen(true);
                              }}
                              className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-white hover:bg-[var(--accent)] transition-colors cursor-pointer"
                              title="View History & Details"
                            >
                              <History className="w-4 h-4" />
                            </button>

                            {user?.role === 'super_admin' && (
                              <button
                                onClick={() => {
                                  if (confirm(`Are you sure you want to delete loan ${loan.loanNo}?`)) {
                                    deleteLoan(loan.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-rose-400/70 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                title="Delete Loan Record"
                              >
                                <Trash2 className="w-4 h-4" />
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

        {/* ==================== MODAL: ISSUE NEW LOAN ==================== */}
        {issueModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-xl bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
                <div className="flex items-center space-x-2">
                  <Banknote className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-base text-[var(--foreground)]">Issue New Community Loan</h3>
                </div>
                <button
                  onClick={() => setIssueModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleIssueLoanSubmit} className="space-y-4">
                {/* Select Member */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                    Select Borrower (Member) *
                  </label>
                  <select
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    required
                    className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                  >
                    <option value="">-- Choose Member --</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.id}) - {m.phone}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Loan Category *
                    </label>
                    <select
                      value={loanType}
                      onChange={(e) => setLoanType(e.target.value as LoanType)}
                      className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                    >
                      <option value="personal">Personal / Family</option>
                      <option value="emergency">Emergency / Medical</option>
                      <option value="business">Small Business / Shop</option>
                      <option value="education">Education / Training</option>
                      <option value="other">Other Need</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Principal Amount (৳) *
                    </label>
                    <input
                      type="number"
                      min={1000}
                      step={500}
                      value={principalAmount}
                      onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                      required
                      className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Interest Rate (%/yr)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      step={0.5}
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Disbursed Date *
                    </label>
                    <input
                      type="date"
                      value={disbursedDate}
                      onChange={(e) => setDisbursedDate(e.target.value)}
                      required
                      className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Due Date *
                    </label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      required
                      className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Live Loan Calculation Summary */}
                <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-2xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] text-indigo-300 font-medium block">
                      Duration: ~{formCalculation.diffMonths} month(s)
                    </span>
                    <span className="text-[11px] text-zinc-300">
                      Total Interest: <strong className="text-amber-300">৳{formCalculation.interest.toLocaleString()}</strong>
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-zinc-400 block">Total Payable</span>
                    <span className="text-base font-black text-emerald-400">
                      ৳{formCalculation.totalPayable.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Purpose */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                    Purpose / Reason for Loan
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Shop renovation, Medical expense, Tuition..."
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Guarantor Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Guarantor Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Guarantor full name"
                      value={guarantorName}
                      onChange={(e) => setGuarantorName(e.target.value)}
                      className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                      Guarantor Phone (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="017XXXXXXXX"
                      value={guarantorPhone}
                      onChange={(e) => setGuarantorPhone(e.target.value)}
                      className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                    Internal Notes / Comments
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Additional terms or notes..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setIssueModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--foreground)] bg-[var(--secondary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-md shadow-indigo-600/20 active:scale-[0.98] transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    {submitting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Banknote className="w-4 h-4" />
                        <span>Confirm & Disburse Loan</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== MODAL: RECORD REPAYMENT ==================== */}
        {repayModalOpen && selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-extrabold text-base text-[var(--foreground)]">Record Loan Repayment</h3>
                </div>
                <button
                  onClick={() => setRepayModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Loan Summary */}
              <div className="p-3 bg-[var(--secondary)] rounded-2xl mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Loan No:</span>
                  <span className="font-mono font-bold text-indigo-400">{selectedLoan.loanNo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Borrower:</span>
                  <span className="font-bold text-[var(--foreground)]">{selectedLoan.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Total Payable:</span>
                  <span className="font-bold">৳{selectedLoan.totalPayable.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[var(--muted-foreground)]">Already Repaid:</span>
                  <span className="font-bold text-emerald-400">৳{selectedLoan.totalRepaid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[var(--border)]">
                  <span className="font-semibold text-amber-400">Remaining Balance:</span>
                  <span className="font-black text-amber-400">
                    ৳{Math.max(0, selectedLoan.totalPayable - selectedLoan.totalRepaid).toLocaleString()}
                  </span>
                </div>
              </div>

              <form onSubmit={handleRepaySubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                    Repayment Amount (৳) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={Math.max(1, selectedLoan.totalPayable - selectedLoan.totalRepaid)}
                    value={repayAmount}
                    onChange={(e) => setRepayAmount(Number(e.target.value))}
                    required
                    className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-mono text-base font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                    Payment Date *
                  </label>
                  <input
                    type="date"
                    value={repayDate}
                    onChange={(e) => setRepayDate(e.target.value)}
                    required
                    className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1">
                    Note / Transaction Ref (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Cash handed over / bKash TxID"
                    value={repayNote}
                    onChange={(e) => setRepayNote(e.target.value)}
                    className="w-full bg-[var(--secondary)] border border-[var(--border)] rounded-xl p-2.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2 border-t border-[var(--border)]">
                  <button
                    type="button"
                    onClick={() => setRepayModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-[var(--foreground)] bg-[var(--secondary)] hover:bg-[var(--border)] transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={repaying}
                    className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center space-x-1.5 cursor-pointer"
                  >
                    {repaying ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Confirm Repayment</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ==================== MODAL: LOAN DETAILS & HISTORY ==================== */}
        {detailModalOpen && selectedLoan && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-xl bg-[var(--card)] border border-[var(--border)] rounded-3xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between pb-4 border-b border-[var(--border)] mb-4">
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-extrabold text-base text-[var(--foreground)]">
                    Loan History — {selectedLoan.loanNo}
                  </h3>
                </div>
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Overview Details */}
              <div className="grid grid-cols-2 gap-3 p-4 bg-[var(--secondary)] rounded-2xl text-xs mb-5">
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] uppercase">Borrower</span>
                  <p className="font-bold text-[var(--foreground)] text-sm">{selectedLoan.memberName}</p>
                  <p className="text-[10px] text-[var(--muted-foreground)] font-mono">{selectedLoan.memberId}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] uppercase">Status</span>
                  <div className="mt-0.5">{getStatusBadge(selectedLoan.status)}</div>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] uppercase">Principal</span>
                  <p className="font-bold text-[var(--foreground)]">৳{selectedLoan.principalAmount.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] uppercase">Total Payable</span>
                  <p className="font-black text-emerald-400">৳{selectedLoan.totalPayable.toLocaleString()}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] uppercase">Disbursed Date</span>
                  <p className="font-medium text-[var(--foreground)]">{selectedLoan.disbursedDate}</p>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--muted-foreground)] uppercase">Due Date</span>
                  <p className="font-medium text-rose-400">{selectedLoan.dueDate}</p>
                </div>
                {selectedLoan.guarantorName && (
                  <div className="col-span-2 pt-2 border-t border-[var(--border)]">
                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase">Guarantor</span>
                    <p className="font-medium text-[var(--foreground)]">
                      {selectedLoan.guarantorName} ({selectedLoan.guarantorPhone || 'No phone'})
                    </p>
                  </div>
                )}
                {selectedLoan.purpose && (
                  <div className="col-span-2">
                    <span className="text-[10px] text-[var(--muted-foreground)] uppercase">Purpose</span>
                    <p className="font-medium text-[var(--foreground)]">{selectedLoan.purpose}</p>
                  </div>
                )}
              </div>

              {/* Status Change Controls (for Admin) */}
              {canManageLoans && (
                <div className="mb-5 p-3 rounded-xl border border-[var(--border)] flex items-center justify-between text-xs">
                  <span className="text-[var(--muted-foreground)] font-medium">Quick Status Change:</span>
                  <div className="flex items-center space-x-1.5">
                    {(['active', 'fully_paid', 'overdue', 'written_off'] as LoanStatus[]).map((st) => (
                      <button
                        key={st}
                        onClick={async () => {
                          await updateLoanStatus(selectedLoan.id, st);
                          setSelectedLoan({ ...selectedLoan, status: st });
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                          selectedLoan.status === st
                            ? 'bg-indigo-600 text-white'
                            : 'bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-white'
                        }`}
                      >
                        {st.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Repayments History */}
              <div>
                <h4 className="font-bold text-xs text-[var(--foreground)] mb-2 flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Repayment Installments ({selectedLoan.repayments?.length || 0})</span>
                </h4>

                {!selectedLoan.repayments || selectedLoan.repayments.length === 0 ? (
                  <div className="p-4 rounded-xl bg-[var(--secondary)] text-center text-[var(--muted-foreground)] text-xs">
                    No installments recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedLoan.repayments.map((rep, idx) => (
                      <div
                        key={rep.id || idx}
                        className="p-3 bg-[var(--secondary)] border border-[var(--border)] rounded-xl flex items-center justify-between text-xs"
                      >
                        <div>
                          <p className="font-bold text-emerald-400">৳{rep.amount.toLocaleString()}</p>
                          <p className="text-[10px] text-[var(--muted-foreground)]">
                            {rep.date} · Recorded by: {rep.recordedBy}
                          </p>
                          {rep.note && (
                            <p className="text-[10px] text-zinc-400 italic mt-0.5">{rep.note}</p>
                          )}
                        </div>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          Inst #{idx + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setDetailModalOpen(false)}
                  className="px-5 py-2 bg-[var(--secondary)] hover:bg-[var(--border)] text-[var(--foreground)] text-xs font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
