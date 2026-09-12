'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { Collection } from '../../types';
import { 
  Users, 
  TrendingUp, 
  CreditCard, 
  DollarSign, 
  Percent, 
  PiggyBank, 
  Wallet,
  AlertTriangle,
  ArrowUpRight,
  Plus,
  PlusCircle,
  CalendarClock,
  CheckCircle2,
  Receipt,
  UserCheck,
  ChevronRight,
  Printer,
  X,
  FileText,
  Building2,
  Calendar,
  CheckCircle,
  Clock
} from 'lucide-react';
import Link from 'next/link';

// Dynamic Recharts import to avoid SSR issues
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';

export default function Dashboard() {
  const { stats, transactions, investments, notifications, members, collections, dueDemands } = useStore();
  const { user, hasPermission } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Modal state for viewing money receipt
  const [viewReceipt, setViewReceipt] = useState<Collection | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const role = user?.role || 'member';

  // Format Currency in BDT
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value);
  };

  // Find linked member record for regular member role
  const myMember = useMemo(() => {
    if (!user) return null;
    // 1. Exact memberId link (stored at login)
    if (user.memberId) {
      const found = members.find(m => m.id === user.memberId);
      if (found) return found;
    }
    // 2. Direct id match
    const byId = members.find(m => m.id === user.id);
    if (byId) return byId;
    // 3. Email match
    if (user.email) {
      const byEmail = members.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
      if (byEmail) return byEmail;
    }
    // 4. Phone match
    if (user.phone) {
      const byPhone = members.find(m => m.phone === user.phone);
      if (byPhone) return byPhone;
    }
    return null;
  }, [members, user]);

  // Member-specific collections (Paid)
  const myPaidCollections = useMemo(() => {
    if (!myMember) return [];
    return collections
      .filter(c => c.memberId === myMember.id && c.status === 'paid')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [collections, myMember]);

  const myTotalPaid = useMemo(() => {
    return myPaidCollections.reduce(
      (sum, c) => sum + (c.amount || 0) + (c.lateFine || 0), 0
    );
  }, [myPaidCollections]);

  // Member-specific monthly due breakdown for all generated active demands
  const myDuesBreakdown = useMemo(() => {
    if (!myMember) return [];
    const today = new Date().toISOString().slice(0, 10);

    return dueDemands.map(demand => {
      const paidRecord = collections.find(
        c => c.memberId === myMember.id && c.month === demand.month && c.status === 'paid'
      );
      const isPaid = !!paidRecord;
      const baseFee = demand.amountType === 'fixed' 
        ? (demand.fixedAmount || 0) 
        : (myMember.monthlyFee || 500);
      const isOverdue = !isPaid && today > demand.dueDate;
      const fine = isOverdue ? (demand.lateFine || 50) : 0;
      const totalAmount = isPaid 
        ? (paidRecord.amount + (paidRecord.lateFine || 0)) 
        : (baseFee + fine);

      return {
        demand,
        paidRecord,
        isPaid,
        isOverdue,
        baseFee,
        fine,
        totalAmount
      };
    }).sort((a, b) => b.demand.month.localeCompare(a.demand.month));
  }, [dueDemands, collections, myMember]);

  const myUnpaidDuesList = useMemo(() => {
    return myDuesBreakdown.filter(item => !item.isPaid);
  }, [myDuesBreakdown]);

  const myTotalDueWithFines = useMemo(() => {
    return myUnpaidDuesList.reduce((sum, item) => sum + item.totalAmount, 0);
  }, [myUnpaidDuesList]);

  // Collector-specific metrics
  const currentMonthStr = new Date().toISOString().slice(0, 7);
  const thisMonthCollections = collections.filter(c => c.month === currentMonthStr && c.status === 'paid');
  const thisMonthCollectedAmount = thisMonthCollections.reduce((sum, c) => sum + (c.amount || 0) + (c.lateFine || 0), 0);

  // Chart data for admins / management
  const getChartData = () => {
    const months = ['2026-05', '2026-06', '2026-07'];
    
    return months.map(m => {
      const monthlyIncome = transactions
        .filter(t => t.date.startsWith(m) && (t.category === 'Collection' || t.category === 'Interest Income'))
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyExpense = transactions
        .filter(t => t.date.startsWith(m) && t.category === 'Expense')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthName = new Date(m + '-01').toLocaleDateString('en-US', { month: 'short' });
      return {
        month: monthName,
        Income: monthlyIncome,
        Expense: monthlyExpense
      };
    });
  };

  const getInvestmentDistribution = () => {
    const distribution: Record<string, number> = {};
    const runningInvs = investments.filter(i => i.status === 'running');
    
    if (runningInvs.length === 0) return [{ name: 'No Investments', value: 1 }];

    runningInvs.forEach(inv => {
      distribution[inv.type] = (distribution[inv.type] || 0) + inv.principalAmount;
    });

    return Object.entries(distribution).map(([name, value]) => ({
      name,
      value
    }));
  };

  const chartData = getChartData();
  const pieData = getInvestmentDistribution();
  const PIE_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#3b82f6', '#8b5cf6'];

  const recentTransactions = transactions
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const activeAlerts = notifications.filter(n => !n.read).slice(0, 3);

  const getRoleBadge = (r: string) => {
    switch (r) {
      case 'super_admin':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">Super Admin</span>;
      case 'president':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30">President</span>;
      case 'treasurer':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">Treasurer</span>;
      case 'auditor':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">Auditor</span>;
      case 'collector':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Collection Officer</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Club Member</span>;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Quick welcome bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-xl font-bold text-zinc-100">Assalamu Alaikum, {role === 'member' ? (myMember?.name || user?.name) : user?.name}</h2>
              {getRoleBadge(role)}
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              {role === 'member' && 'Welcome to your personal member portal. View your user-wise dues, collections, and money receipts.'}
              {role === 'collector' && 'Field collection center. Monitor member subscription dues and record new cash receipts.'}
              {['super_admin', 'president', 'treasurer', 'auditor'].includes(role) && 'Financial command center. Real-time overview of collections, assets, and liquidity.'}
            </p>
          </div>
          
          {/* Role-based Header Quick Actions */}
          <div className="flex items-center space-x-2">
            {role === 'member' && (
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono font-medium">
                  ID: {myMember?.id}
                </span>
                <Link 
                  href="/dues"
                  className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/20 transition-all"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>My Dues</span>
                </Link>
              </div>
            )}

            {role === 'collector' && (
              <>
                <Link 
                  href="/dues"
                  className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl transition-all"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Due List</span>
                </Link>
                <Link 
                  href="/collections"
                  className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Collect Payment</span>
                </Link>
              </>
            )}

            {['super_admin', 'president', 'treasurer', 'auditor'].includes(role) && (
              <>
                {hasPermission('collections', 'create') && (
                  <Link 
                    href="/dues"
                    className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl transition-all"
                  >
                    <CalendarClock className="w-3.5 h-3.5" />
                    <span>Manage Dues</span>
                  </Link>
                )}
                {hasPermission('collections', 'create') && (
                  <Link 
                    href="/collections"
                    className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold rounded-xl transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Collection</span>
                  </Link>
                )}
                {hasPermission('investments', 'create') && (
                  <Link
                    href="/investments" 
                    className="flex items-center space-x-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-indigo-600/15 transition-all"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>New Investment</span>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Live warnings / notifications bar */}
        {activeAlerts.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/20 text-amber-400 p-4 rounded-2xl flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0 animate-pulse" />
            <div>
              <p className="text-xs font-bold">Action Required: Pending Reminders</p>
              <ul className="list-disc list-inside text-[11px] text-zinc-400 mt-1 space-y-1">
                {activeAlerts.map(alert => (
                  <li key={alert.id}>{alert.title}: {alert.message}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 1: MEMBER DASHBOARD VIEW (USER-WISE DUES & COLLECTIONS ONLY) */}
        {/* ========================================================================= */}
        {role === 'member' && (
          <div className="space-y-6">
            
            {/* Member KPI Cards - Strictly User-Wise */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: My Total Paid Collections */}
              <div className="glass-card p-4 rounded-2xl relative overflow-hidden border border-emerald-500/20">
                <div className="absolute top-0 right-0 w-24 h-24 grad-emerald opacity-10 blur-2xl rounded-full"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Total Collections (Paid)</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><DollarSign className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(myTotalPaid)}</p>
                <div className="flex items-center space-x-1 text-[10px] text-emerald-400 mt-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{myPaidCollections.length} verified money receipts</span>
                </div>
              </div>

              {/* Card 2: My Outstanding Dues */}
              <div className={`glass-card p-4 rounded-2xl relative overflow-hidden border ${myTotalDueWithFines > 0 ? 'border-amber-500/30' : 'border-zinc-800'}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Total Outstanding Due</span>
                  <div className={`p-2 rounded-lg ${myTotalDueWithFines > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-zinc-800 text-zinc-400'}`}>
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <p className={`text-lg lg:text-2xl font-black mt-3 ${myTotalDueWithFines > 0 ? 'text-amber-400' : 'text-white'}`}>
                  {formatCurrency(myTotalDueWithFines)}
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">
                  {myUnpaidDuesList.length > 0 ? `${myUnpaidDuesList.length} month(s) pending payment` : 'All monthly dues are cleared!'}
                </p>
              </div>

              {/* Card 3: Monthly Subscription Fee */}
              <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Monthly Subscription Plan</span>
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><CalendarClock className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">
                  {formatCurrency(myMember?.monthlyFee || 500)} <span className="text-xs font-normal text-zinc-400">/ mo</span>
                </p>
                <p className="text-[10px] text-zinc-500 mt-1">Due cutoff by the 10th of every month</p>
              </div>

              {/* Card 4: Membership Status */}
              <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Membership Status</span>
                  <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg"><UserCheck className="w-4 h-4" /></div>
                </div>
                <div className="mt-3 flex items-center space-x-2">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                    myMember?.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {myMember?.status || 'ACTIVE'}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-500 mt-2">Member since: {myMember?.joinDate || 'N/A'}</p>
              </div>

            </div>

            {/* Section 1: User-Wise Monthly Dues Status */}
            <div className="glass-panel p-5 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-zinc-800 gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-zinc-100">My Monthly Dues Status (User-Wise)</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                      {myUnpaidDuesList.length} Unpaid / {myDuesBreakdown.length} Total Demand(s)
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Official record of active foundation due demands issued for your membership account
                  </p>
                </div>
                <Link 
                  href="/dues" 
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center space-x-1"
                >
                  <span>Detailed Due List</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {myDuesBreakdown.length > 0 ? (
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="pb-3 font-semibold">Billing Month</th>
                        <th className="pb-3 font-semibold">Demand Title</th>
                        <th className="pb-3 font-semibold">Cutoff Date</th>
                        <th className="pb-3 font-semibold">Base Fee</th>
                        <th className="pb-3 font-semibold">Late Fine</th>
                        <th className="pb-3 font-semibold">Total Payable</th>
                        <th className="pb-3 font-semibold text-center">Status</th>
                        <th className="pb-3 font-semibold text-right">Payment Info</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {myDuesBreakdown.map((item) => (
                        <tr key={item.demand.id} className="hover:bg-zinc-850/40 transition-colors">
                          <td className="py-3 text-zinc-200 font-bold font-mono text-xs">{item.demand.month}</td>
                          <td className="py-3 text-zinc-300 text-xs">{item.demand.title}</td>
                          <td className="py-3 text-zinc-400 text-[11px]">
                            <div className="flex items-center space-x-1">
                              <Calendar className="w-3 h-3 text-zinc-500" />
                              <span>{item.demand.dueDate}</span>
                            </div>
                          </td>
                          <td className="py-3 text-zinc-300 text-xs">{formatCurrency(item.baseFee)}</td>
                          <td className="py-3 text-xs">
                            {item.fine > 0 ? (
                              <span className="text-rose-400 font-semibold">+{formatCurrency(item.fine)}</span>
                            ) : (
                              <span className="text-zinc-500">0 TK</span>
                            )}
                          </td>
                          <td className="py-3 font-bold text-xs text-zinc-100">
                            {formatCurrency(item.totalAmount)}
                          </td>
                          <td className="py-3 text-center">
                            {item.isPaid ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>PAID</span>
                              </span>
                            ) : item.isOverdue ? (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 animate-pulse">
                                <AlertTriangle className="w-3 h-3" />
                                <span>OVERDUE</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                                <Clock className="w-3 h-3" />
                                <span>DUE</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            {item.isPaid && item.paidRecord ? (
                              <button
                                type="button"
                                onClick={() => setViewReceipt(item.paidRecord || null)}
                                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] font-medium transition-all cursor-pointer inline-flex items-center space-x-1"
                              >
                                <Receipt className="w-3 h-3 text-emerald-400" />
                                <span className="font-mono">{item.paidRecord.receiptNo}</span>
                              </button>
                            ) : (
                              <span className="text-[11px] text-zinc-500">
                                Pay to Collector / Bank
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-zinc-500 text-xs">
                  <CalendarClock className="w-8 h-8 mx-auto mb-2 text-zinc-600 opacity-60" />
                  <p>No monthly due demands have been issued yet by administration.</p>
                </div>
              )}
            </div>

            {/* Section 2: User-Wise Collections & Money Receipts History */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Payment Receipts History */}
              <div className="glass-panel p-5 rounded-2xl lg:col-span-2">
                <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
                  <div>
                    <h3 className="text-sm font-bold text-zinc-100">My Collections & Payment Receipts</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Verified payment deposits registered under your member account</p>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {myPaidCollections.length} Receipts
                  </span>
                </div>

                {myPaidCollections.length > 0 ? (
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-zinc-800 text-zinc-400">
                          <th className="pb-2.5 font-semibold">Date</th>
                          <th className="pb-2.5 font-semibold">Month</th>
                          <th className="pb-2.5 font-semibold">Method</th>
                          <th className="pb-2.5 font-semibold">Receipt No</th>
                          <th className="pb-2.5 font-semibold">Collected By</th>
                          <th className="pb-2.5 font-semibold text-right">Amount</th>
                          <th className="pb-2.5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-850">
                        {myPaidCollections.map((c) => (
                          <tr key={c.id} className="hover:bg-zinc-850/40 transition-colors">
                            <td className="py-2.5 text-zinc-400 text-[11px]">{c.date}</td>
                            <td className="py-2.5 text-zinc-200 font-semibold text-[11px]">{c.month}</td>
                            <td className="py-2.5 text-[11px]">
                              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 capitalize">{c.paymentType}</span>
                            </td>
                            <td className="py-2.5 text-zinc-300 font-mono text-[11px]">{c.receiptNo || `REC-${c.id.slice(-5)}`}</td>
                            <td className="py-2.5 text-zinc-400 text-[11px]">{c.collectedBy || 'Treasurer'}</td>
                            <td className="py-2.5 font-bold text-right text-xs text-emerald-400">
                              {formatCurrency(c.amount + (c.lateFine || 0))}
                            </td>
                            <td className="py-2.5 text-right">
                              <button
                                type="button"
                                onClick={() => setViewReceipt(c)}
                                className="px-2 py-1 rounded bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 text-[11px] font-semibold transition-all cursor-pointer inline-flex items-center space-x-1"
                              >
                                <Receipt className="w-3 h-3" />
                                <span>Receipt</span>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    <Receipt className="w-8 h-8 mx-auto mb-2 text-zinc-600 opacity-60" />
                    <p>No payment records found yet under your account.</p>
                  </div>
                )}
              </div>

              {/* Profile & Nominee Information */}
              <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-zinc-100 mb-1">My Member Profile</h3>
                  <p className="text-[11px] text-zinc-400 mb-4">Official registered membership & nominee records</p>
                  
                  <div className="space-y-3 text-xs">
                    <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">Full Name</span>
                      <span className="text-zinc-200 font-semibold">{myMember?.name || user?.name}</span>
                    </div>

                    <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">Contact Phone & Email</span>
                      <span className="text-zinc-200 font-medium">{myMember?.phone || user?.phone || 'N/A'}</span>
                      <span className="text-zinc-400 block text-[11px] mt-0.5">{myMember?.email || user?.email}</span>
                    </div>

                    <div className="p-3 bg-zinc-900/80 rounded-xl border border-zinc-800/80">
                      <span className="text-[10px] text-zinc-500 block uppercase font-bold">Nominee Designation</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-zinc-200 font-semibold">{myMember?.nomineeName || 'Not Appointed'}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">{myMember?.nomineeRelation || 'N/A'}</span>
                      </div>
                      <span className="text-[11px] text-zinc-400 block mt-1">Contact: {myMember?.nomineePhone || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 mt-4 border-t border-zinc-850 flex items-center justify-between text-[11px] text-zinc-500">
                  <span>Member ID: {myMember?.id || user?.id}</span>
                  <Link href="/members/profile" className="text-indigo-400 hover:text-indigo-300 font-medium flex items-center space-x-0.5">
                    <span>Edit Profile</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 2: COLLECTOR DASHBOARD VIEW */}
        {/* ========================================================================= */}
        {role === 'collector' && (
          <div className="space-y-6">
            {/* Collector KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Club Collections */}
              <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 grad-primary opacity-5 blur-2xl rounded-full"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Total Collections</span>
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><DollarSign className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.totalCollection)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Cumulative collected funds</p>
              </div>

              {/* Card 2: This Month Collections */}
              <div className="glass-card p-4 rounded-2xl relative overflow-hidden border border-emerald-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Collected This Month</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><TrendingUp className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-emerald-400 mt-3">{formatCurrency(thisMonthCollectedAmount)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{thisMonthCollections.length} payments recorded in {currentMonthStr}</p>
              </div>

              {/* Card 3: Total Outstanding Dues */}
              <div className="glass-card p-4 rounded-2xl relative overflow-hidden border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Outstanding Dues</span>
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-amber-400 mt-3">{formatCurrency(stats.dueCollection)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Pending payments across generated demands</p>
              </div>

              {/* Card 4: Active Members to Collect */}
              <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Active Member Profiles</span>
                  <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg"><Users className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">{stats.activeMembers}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Out of {stats.totalMembers} total registered</p>
              </div>

            </div>

            {/* Collector Work Queue: Recent Collections & Collection Quick Links */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Recent Collections */}
              <div className="glass-panel p-5 rounded-2xl lg:col-span-2">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">Recent Collections Recorded</h3>
                    <p className="text-[10px] text-zinc-500">Live feed of subscription payments collected</p>
                  </div>
                  <Link 
                    href="/collections" 
                    className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 flex items-center space-x-1"
                  >
                    <span>View All Collections</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="pb-2 font-semibold">Date</th>
                        <th className="pb-2 font-semibold">Member</th>
                        <th className="pb-2 font-semibold">Month</th>
                        <th className="pb-2 font-semibold">Method</th>
                        <th className="pb-2 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {collections.slice(0, 6).map((c) => (
                        <tr key={c.id} className="hover:bg-zinc-850/40 transition-colors">
                          <td className="py-2.5 text-zinc-400 text-[10px]">{c.date}</td>
                          <td className="py-2.5 font-medium text-zinc-200 text-[10px]">{c.memberName}</td>
                          <td className="py-2.5 text-zinc-400 text-[10px]">{c.month}</td>
                          <td className="py-2.5 text-[10px]">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 capitalize">{c.paymentType}</span>
                          </td>
                          <td className="py-2.5 font-bold text-right text-[11px] text-emerald-400">
                            +{formatCurrency(c.amount + (c.lateFine || 0))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Collection Quick Actions & Targets */}
              <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-200 mb-1">Collection Field Actions</h3>
                  <p className="text-[10px] text-zinc-500 mb-4">Quick shortcuts for member collection rounds</p>

                  <div className="space-y-3">
                    <Link
                      href="/dues"
                      className="block p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                            <CalendarClock className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-200">Collect Monthly Due</p>
                            <p className="text-[10px] text-zinc-400">View roster of unpaid members</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </Link>

                    <Link
                      href="/collections"
                      className="block p-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-zinc-200">Direct Payment Entry</p>
                            <p className="text-[10px] text-zinc-400">Add collection with auto receipt</p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-zinc-500" />
                      </div>
                    </Link>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-zinc-850">
                  <div className="flex justify-between text-[10px] mb-1.5">
                    <span className="text-zinc-400">Collection Recovery Ratio</span>
                    <span className="text-zinc-200 font-semibold">
                      {Math.round((stats.totalCollection / (stats.totalCollection + stats.dueCollection || 1)) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                      style={{ width: `${(stats.totalCollection / (stats.totalCollection + stats.dueCollection || 1)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CASE 3: ADMIN / PRESIDENT / TREASURER / AUDITOR FULL COMMAND VIEW */}
        {/* ========================================================================= */}
        {['super_admin', 'president', 'treasurer', 'auditor'].includes(role) && (
          <>
            {/* ---------------- 8 METRICS CARDS GRID ---------------- */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card 1: Total Collection */}
              <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 grad-primary opacity-5 blur-2xl rounded-full"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Total Collections</span>
                  <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg"><DollarSign className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.totalCollection)}</p>
                <div className="flex items-center space-x-1 text-[10px] text-emerald-400 mt-1">
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  <span>Verified member deposits</span>
                </div>
              </div>

              {/* Card 2: Total Active Investment */}
              <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 grad-emerald opacity-5 blur-2xl rounded-full"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Running Portfolios</span>
                  <div className="p-2 bg-emerald-500/10 text-emerald-400 rounded-lg"><TrendingUp className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.totalInvestment)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{stats.runningInvestments} active assets running</p>
              </div>

              {/* Card 3: Total Expenses */}
              <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 grad-rose opacity-5 blur-2xl rounded-full"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Total Expenses</span>
                  <div className="p-2 bg-rose-500/10 text-rose-400 rounded-lg"><CreditCard className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.totalExpenses)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Office rents, utilities, logistics</p>
              </div>

              {/* Card 4: Accumulated Interest */}
              <div className="glass-card p-4 rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 grad-amber opacity-5 blur-2xl rounded-full"></div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Interest Income</span>
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><Percent className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.totalInterestEarned)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">FDR/DPS dividends & returns</p>
              </div>

              {/* Card 5: Bank Balance */}
              <div className="glass-card p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Bank Book Balance</span>
                  <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg"><PiggyBank className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.bankBalance)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Savings & operational bank accounts</p>
              </div>

              {/* Card 6: Cash In Hand */}
              <div className="glass-card p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Available Cash (Drawer)</span>
                  <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg"><Wallet className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">{formatCurrency(stats.availableCash)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Cash buffer for administrative expenses</p>
              </div>

              {/* Card 7: Outstanding Dues */}
              <div className="glass-card p-4 rounded-2xl border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Outstanding Dues</span>
                  <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg"><AlertTriangle className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-amber-400 mt-3">{formatCurrency(stats.dueCollection)}</p>
                <p className="text-[10px] text-zinc-500 mt-1">Unpaid dues from active generated demands</p>
              </div>

              {/* Card 8: Total Members */}
              <div className="glass-card p-4 rounded-2xl">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-400">Total Members</span>
                  <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg"><Users className="w-4 h-4" /></div>
                </div>
                <p className="text-lg lg:text-2xl font-black text-white mt-3">{stats.totalMembers}</p>
                <p className="text-[10px] text-zinc-500 mt-1">{stats.activeMembers} Active Profiles registered</p>
              </div>

            </div>

            {/* ---------------- CHARTS SECTION ---------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Income vs Expenses Chart */}
              <div className="glass-panel p-5 rounded-2xl lg:col-span-2 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">Monthly Cash Inflow vs Expenses</h3>
                    <p className="text-[10px] text-zinc-500">Summary comparison of monthly collected funds against administrative logs</p>
                  </div>
                </div>
                
                <div className="h-64 w-full text-xs">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                        <XAxis dataKey="month" stroke="#71717a" />
                        <YAxis stroke="#71717a" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                          labelStyle={{ color: '#fafafa', fontWeight: 'bold' }}
                        />
                        <Legend />
                        <Area type="monotone" dataKey="Income" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                        <Area type="monotone" dataKey="Expense" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-zinc-500">Loading Chart...</div>
                  )}
                </div>
              </div>

              {/* Asset Allocation Chart */}
              <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
                <div className="mb-4">
                  <h3 className="text-xs font-bold text-zinc-200">Investment Asset Allocation</h3>
                  <p className="text-[10px] text-zinc-500">Breakdown of principal values in running portfolios</p>
                </div>

                <div className="h-48 w-full flex items-center justify-center">
                  {mounted ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value) => formatCurrency(Number(value))}
                          contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="text-zinc-500">Loading Chart...</div>
                  )}
                </div>

                {/* Custom Pie Legend */}
                <div className="grid grid-cols-2 gap-2 mt-4 text-[10px]">
                  {pieData.map((entry, idx) => (
                    <div key={entry.name} className="flex items-center space-x-1.5 truncate">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}></span>
                      <span className="text-zinc-300 truncate">{entry.name}</span>
                      <span className="text-zinc-500 ml-auto">({formatCurrency(entry.value)})</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* ---------------- BOTTOM SEGMENT: TRANSACTIONS & DETAILS ---------------- */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Recent Double Entry Ledgers */}
              <div className="glass-panel p-5 rounded-2xl lg:col-span-2 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-zinc-200">Recent Accounting Ledgers</h3>
                    <p className="text-[10px] text-zinc-500">Double-entry record of capital credits and expenses</p>
                  </div>
                  
                  <Link 
                    href="/accounting"
                    className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300"
                  >
                    View Cash Book
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-400">
                        <th className="pb-2 font-semibold">Date</th>
                        <th className="pb-2 font-semibold">Account</th>
                        <th className="pb-2 font-semibold">Category</th>
                        <th className="pb-2 font-semibold">Description</th>
                        <th className="pb-2 font-semibold text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-850">
                      {recentTransactions.map((tx) => {
                        const isCredit = tx.type === 'credit';
                        return (
                          <tr key={tx.id} className="hover:bg-zinc-850/40 transition-colors">
                            <td className="py-2.5 text-zinc-400 text-[10px]">{tx.date}</td>
                            <td className="py-2.5 font-medium text-zinc-300 capitalize text-[10px]">{tx.account}</td>
                            <td className="py-2.5 text-[10px]"><span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">{tx.category}</span></td>
                            <td className="py-2.5 text-zinc-400 truncate max-w-[200px] text-[10px]">{tx.description}</td>
                            <td className={`py-2.5 font-bold text-right text-[11px] ${isCredit ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Quick Stats overview */}
              <div className="glass-panel p-5 rounded-2xl flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-zinc-200">Portfolio Status</h3>
                  <p className="text-[10px] text-zinc-500">Summary ratios for foundation health check</p>
                </div>

                <div className="space-y-4 my-4">
                  {/* Stat 1: Collections Ratio */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-zinc-400">Paid Collections Ratio</span>
                      <span className="text-zinc-200 font-semibold">
                        {Math.round((stats.totalCollection / (stats.totalCollection + stats.dueCollection || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-indigo-500 h-full rounded-full" 
                        style={{ width: `${(stats.totalCollection / (stats.totalCollection + stats.dueCollection || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stat 2: Expense to Income Ratio */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-zinc-400">Expense-to-Income Ratio</span>
                      <span className="text-zinc-200 font-semibold">
                        {Math.min(100, Math.round((stats.totalExpenses / (stats.totalCollection + stats.totalInterestEarned || 1)) * 100))}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-rose-500 h-full rounded-full" 
                        style={{ width: `${Math.min(100, (stats.totalExpenses / (stats.totalCollection + stats.totalInterestEarned || 1)) * 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Stat 3: Investment returns */}
                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-zinc-400">Running Investments Principal Ratio</span>
                      <span className="text-zinc-200 font-semibold">
                        {Math.round((stats.totalInvestment / (stats.bankBalance + stats.totalInvestment || 1)) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full" 
                        style={{ width: `${(stats.totalInvestment / (stats.bankBalance + stats.totalInvestment || 1)) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
                
                <div className="text-[9px] text-zinc-500 pt-2 border-t border-zinc-850 text-center">
                  All financial ratios are updated automatically.
                </div>
              </div>

            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* OFFICIAL MONEY RECEIPT POPUP MODAL */}
        {/* ========================================================================= */}
        {viewReceipt && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 relative text-zinc-100 shadow-2xl">
              
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setViewReceipt(null)}
                className="absolute top-4 right-4 p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Receipt Header */}
              <div className="flex items-center space-x-3 pb-4 border-b border-zinc-800">
                <div className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0">
                  <img src="/logo.jpg" alt="FDC Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight text-white uppercase">Foundation Development Cooperative</h3>
                  <p className="text-[11px] text-emerald-400 font-semibold">Official Money Receipt / ভাউচার</p>
                </div>
              </div>

              {/* Receipt Details Body */}
              <div className="my-5 space-y-3 text-xs bg-zinc-950/70 p-4 rounded-xl border border-zinc-850">
                <div className="flex justify-between items-center pb-2 border-b border-zinc-850 text-zinc-400">
                  <span>Receipt No:</span>
                  <span className="font-mono text-zinc-100 font-bold text-xs">{viewReceipt.receiptNo || `REC-${viewReceipt.id}`}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                  <span className="text-zinc-400">Member Name:</span>
                  <span className="font-bold text-zinc-200">{viewReceipt.memberName}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                  <span className="text-zinc-400">Member ID:</span>
                  <span className="font-mono text-zinc-300">{viewReceipt.memberId}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                  <span className="text-zinc-400">Billing Period:</span>
                  <span className="font-semibold text-indigo-400">{viewReceipt.month}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                  <span className="text-zinc-400">Payment Date:</span>
                  <span className="text-zinc-300">{viewReceipt.date}</span>
                </div>

                <div className="flex justify-between items-center pb-2 border-b border-zinc-850">
                  <span className="text-zinc-400">Payment Mode:</span>
                  <span className="capitalize px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-semibold text-[10px]">
                    {viewReceipt.paymentType}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-1 text-sm font-bold">
                  <span className="text-zinc-300">Total Amount Paid:</span>
                  <span className="text-emerald-400 text-base">{formatCurrency(viewReceipt.amount + (viewReceipt.lateFine || 0))}</span>
                </div>
              </div>

              {/* Footer and Print Button */}
              <div className="pt-2 flex items-center justify-between">
                <div className="text-[10px] text-zinc-500">
                  Verified by {viewReceipt.collectedBy || 'Treasurer'}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all inline-flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewReceipt(null)}
                    className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
