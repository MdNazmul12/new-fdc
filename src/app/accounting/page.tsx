'use client';

import React, { useState } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { Transaction } from '../../types';
import { 
  BookOpen, 
  ArrowRight, 
  ArrowLeft,
  DollarSign, 
  ArrowUpDown, 
  Layers, 
  TrendingUp, 
  ShieldCheck, 
  Check, 
  AlertCircle,
  Trash2
} from 'lucide-react';
import ConfirmModal from '../../components/confirm-modal';

export default function AccountingPage() {
  const { transactions, stats, transferFund, deleteTransaction, clearAllTransactions } = useStore();
  const { user, hasPermission } = useAuth();

  // Tabs state: 'ledger' | 'transfer' | 'trial' | 'financials'
  const [activeTab, setActiveTab] = useState<'ledger' | 'transfer' | 'trial' | 'financials'>('ledger');
  
  // Ledger sub-filter: 'all' | 'cash' | 'bank' | 'investment'
  const [ledgerFilter, setLedgerFilter] = useState<'all' | 'cash' | 'bank' | 'investment'>('all');

  // Permission checks for accounting deletion actions
  const canDeleteAccounting = hasPermission('accounting', 'delete') || user?.role === 'super_admin' || user?.role === 'treasurer' || user?.role === 'president';
  const canClearAll = user?.role === 'super_admin' || user?.role === 'treasurer' || hasPermission('accounting', 'delete');

  // Confirmation modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<{ type: 'single' | 'all'; id?: string; desc?: string } | null>(null);

  const handleConfirmDelete = async () => {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      if (confirmTarget.type === 'all') {
        await clearAllTransactions();
      } else if (confirmTarget.id) {
        deleteTransaction(confirmTarget.id);
      }
      setConfirmOpen(false);
      setConfirmTarget(null);
    } catch (err) {
      console.error(err);
    } finally {
      setConfirmLoading(false);
    }
  };

  // Transfer Form state
  const [transferAmount, setTransferAmount] = useState(10000);
  const [transferFrom, setTransferFrom] = useState<'cash' | 'bank'>('bank');
  const [transferTo, setTransferTo] = useState<'cash' | 'bank'>('cash');
  const [transferDesc, setTransferDesc] = useState('');
  const [transferSuccess, setTransferSuccess] = useState(false);

  const handleSourceChange = (val: 'cash' | 'bank') => {
    setTransferFrom(val);
    setTransferTo(val === 'cash' ? 'bank' : 'cash');
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferAmount || transferAmount <= 0) return;

    if (transferFrom === 'cash' && transferAmount > stats.availableCash) {
      alert('Insufficient funds in Cash Drawer!');
      return;
    }
    if (transferFrom === 'bank' && transferAmount > stats.bankBalance) {
      alert('Insufficient funds in Bank Book!');
      return;
    }

    transferFund(
      transferAmount,
      transferFrom,
      transferTo,
      transferDesc || `Internal transfer from ${transferFrom} to ${transferTo}`,
      user?.name || 'Treasurer'
    );

    setTransferSuccess(true);
    setTransferAmount(10000);
    setTransferDesc('');
    setTimeout(() => setTransferSuccess(false), 3000);
  };

  // Filtered transactions for active book
  const filteredTxs = transactions
    .filter(t => ledgerFilter === 'all' || t.account === ledgerFilter)
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Generate Trial Balance metrics
  const getTrialBalance = () => {
    const trial: Record<string, { debit: number; credit: number }> = {
      'Cash in Hand': { debit: 0, credit: 0 },
      'Bank Account': { debit: 0, credit: 0 },
      'Investment Portfolios': { debit: 0, credit: 0 },
      'Member Collections': { debit: 0, credit: 0 },
      'Interest Revenue': { debit: 0, credit: 0 },
      'Foundation Expenses': { debit: 0, credit: 0 },
      'Opening Capital Fund': { debit: 0, credit: 0 },
    };

    transactions.forEach(t => {
      // 1. Asset accounts
      if (t.account === 'cash') {
        if (t.type === 'credit') trial['Cash in Hand'].debit += t.amount;
        else trial['Cash in Hand'].credit += t.amount;
      }
      if (t.account === 'bank') {
        if (t.type === 'credit') trial['Bank Account'].debit += t.amount;
        else trial['Bank Account'].credit += t.amount;
      }
      if (t.account === 'investment') {
        if (t.type === 'credit') trial['Investment Portfolios'].debit += t.amount;
        else trial['Investment Portfolios'].credit += t.amount;
      }

      // 2. Revenue & Expense mappings
      if (t.category === 'Collection') {
        trial['Member Collections'].credit += t.amount;
      }
      if (t.category === 'Interest Income') {
        trial['Interest Revenue'].credit += t.amount;
      }
      if (t.category === 'Expense') {
        trial['Foundation Expenses'].debit += t.amount;
      }
      if (t.referenceId === 'start') {
        trial['Opening Capital Fund'].credit += t.amount;
      }
    });

    // Net adjustments for balance display
    return Object.entries(trial).map(([account, value]) => {
      // Determine net balances
      let debit = 0;
      let credit = 0;
      if (account === 'Cash in Hand' || account === 'Bank Account' || account === 'Investment Portfolios' || account === 'Foundation Expenses') {
        debit = Math.max(0, value.debit - value.credit);
      } else {
        credit = Math.max(0, value.credit - value.debit);
      }

      return { account, debit, credit };
    });
  };

  const trialData = getTrialBalance();
  const trialTotalDebit = trialData.reduce((sum, d) => sum + d.debit, 0);
  const trialTotalCredit = trialData.reduce((sum, d) => sum + d.credit, 0);

  // Financial Statements computations
  const openingCapital = 1050000; // Starting setup t-0 + t-0b
  const netProfit = stats.totalCollection + stats.totalInterestEarned - stats.totalExpenses;
  const totalEquityAndLiabilities = openingCapital + netProfit;
  const totalAssets = stats.availableCash + stats.bankBalance + stats.totalInvestment;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Tab Switcher Headers */}
        <div className="flex border-b border-[var(--border)] space-x-4 no-print">
          <button
            onClick={() => setActiveTab('ledger')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'ledger' ? 'text-indigo-400 border-b-2 border-indigo-500 font-extrabold' : 'text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]'
            }`}
          >
            Ledger & Accounts Book
          </button>
          {hasPermission('accounting', 'create') && (
            <button
              onClick={() => setActiveTab('transfer')}
              className={`pb-2.5 text-xs font-bold transition-all relative ${
                activeTab === 'transfer' ? 'text-indigo-400 border-b-2 border-indigo-500 font-extrabold' : 'text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]'
              }`}
            >
              Fund Transfer Drawer
            </button>
          )}
          <button
            onClick={() => setActiveTab('trial')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'trial' ? 'text-indigo-400 border-b-2 border-indigo-500 font-extrabold' : 'text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]'
            }`}
          >
            Double Entry Trial Balance
          </button>
          <button
            onClick={() => setActiveTab('financials')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'financials' ? 'text-indigo-400 border-b-2 border-indigo-500 font-extrabold' : 'text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]'
            }`}
          >
            Balance Sheet & P/L
          </button>
        </div>

        {/* ---------------- TAB 1: LEDGER LISTINGS ---------------- */}
        {activeTab === 'ledger' && (
          <div className="space-y-4 animate-fade-in-up">
            
            {/* Book sub-switchers */}
            <div className="flex items-center justify-between no-print">
              <div className="flex items-center space-x-1.5 bg-[var(--secondary)] border border-[var(--border)] p-1 rounded-xl">
                <button
                  onClick={() => setLedgerFilter('all')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg ${ledgerFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]'}`}
                >
                  General Ledger
                </button>
                <button
                  onClick={() => setLedgerFilter('cash')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg ${ledgerFilter === 'cash' ? 'bg-indigo-600 text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]'}`}
                >
                  Cash Book
                </button>
                <button
                  onClick={() => setLedgerFilter('bank')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg ${ledgerFilter === 'bank' ? 'bg-indigo-600 text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]'}`}
                >
                  Bank Book
                </button>
                <button
                  onClick={() => setLedgerFilter('investment')}
                  className={`px-3 py-1.5 text-[10px] font-bold rounded-lg ${ledgerFilter === 'investment' ? 'bg-indigo-600 text-white' : 'text-[var(--muted-foreground)] hover:text-[var(--card-foreground)]'}`}
                >
                  Investments ledger
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                {canClearAll && (
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setConfirmTarget({ type: 'all' });
                      setConfirmOpen(true);
                    }}
                    className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 border border-rose-500/20 text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer"
                    title="Clear all ledger transactions"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete All</span>
                  </button>
                )}
                <button 
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)]/80 hover:bg-[var(--accent)] text-xs font-bold rounded-xl transition-all cursor-pointer"
                >
                  Print Ledger
                </button>
              </div>
            </div>

            {/* Ledger table */}
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/40 text-[var(--muted-foreground)]">
                      <th className="p-4 font-semibold">TxID</th>
                      <th className="p-4 font-semibold">Date</th>
                      <th className="p-4 font-semibold">Account</th>
                      <th className="p-4 font-semibold">Category</th>
                      <th className="p-4 font-semibold">Description</th>
                      <th className="p-4 font-semibold text-right">Debit (Out)</th>
                      <th className="p-4 font-semibold text-right">Credit (In)</th>
                      <th className="p-4 font-semibold text-right">Ledger Balance</th>
                      {canDeleteAccounting && <th className="p-4 font-semibold text-center">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {filteredTxs.length === 0 ? (
                      <tr>
                        <td colSpan={canDeleteAccounting ? 9 : 8} className="p-8 text-center text-[var(--muted-foreground)]/70">No ledger transactions logged for this filter.</td>
                      </tr>
                    ) : (
                      filteredTxs.map((tx) => {
                        const isCredit = tx.type === 'credit';
                        return (
                          <tr key={tx.id} className="hover:bg-[var(--secondary)]/40 transition-colors">
                            <td className="p-4 font-medium text-[var(--muted-foreground)]/70 text-[10px]">{tx.id}</td>
                            <td className="p-4 text-zinc-450 truncate max-w-[200px]">{tx.date}</td>
                            <td className="p-4 capitalize text-[var(--foreground)]/80">{tx.account}</td>
                            <td className="p-4">
                              <span className="px-2 py-0.5 rounded bg-[var(--accent)] text-[10px] text-[var(--foreground)]/80 font-extrabold">{tx.category}</span>
                            </td>
                            <td className="p-4 text-[var(--foreground)]/80 truncate max-w-[200px]">{tx.description}</td>
                            <td className="p-4 text-right font-semibold text-rose-400">
                              {!isCredit ? `${tx.amount.toLocaleString()} TK` : '-'}
                            </td>
                            <td className="p-4 text-right font-semibold text-emerald-400">
                              {isCredit ? `${tx.amount.toLocaleString()} TK` : '-'}
                            </td>
                            <td className="p-4 text-right font-bold text-[var(--foreground)]/80">
                              {tx.balanceAfter.toLocaleString()} TK
                            </td>
                            {canDeleteAccounting && (
                              <td className="p-4 text-center">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setConfirmTarget({ type: 'single', id: tx.id, desc: tx.description });
                                    setConfirmOpen(true);
                                  }}
                                  className="p-1.5 bg-[var(--accent)] hover:bg-zinc-700 text-rose-450 hover:text-rose-400 rounded-lg cursor-pointer transition-colors shadow-sm"
                                  title="Void ledger transaction"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ---------------- TAB 2: FUND TRANSFERS FORM ---------------- */}
        {activeTab === 'transfer' && hasPermission('accounting', 'create') && (
          <div className="max-w-md mx-auto glass-panel p-6 rounded-2xl space-y-4 animate-fade-in-up">
            
            <div className="flex items-center space-x-2 border-b border-[var(--border)] pb-3">
              <Layers className="w-5 h-5 text-indigo-400 animate-pulse" />
              <div>
                <h3 className="text-xs font-bold text-[var(--card-foreground)]">Execute Cash / Bank Transfer</h3>
                <p className="text-[10px] text-[var(--muted-foreground)]/70">Transfer funds internally between accounts</p>
              </div>
            </div>

            {transferSuccess && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg text-xs flex items-center space-x-2 animate-fade-in-up">
                <ShieldCheck className="w-4.5 h-4.5 shrink-0" />
                <span>Internal transfer posted successfully in double-entry books.</span>
              </div>
            )}

            <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
              
              {/* Account select buttons */}
              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1.5">Source & Target Book *</label>
                <div className="grid grid-cols-5 gap-2 items-center">
                  <div className="col-span-2 text-center">
                    <p className="text-[9px] text-[var(--muted-foreground)]/70 mb-1">TRANSFER FROM</p>
                    <select
                      value={transferFrom}
                      onChange={(e) => handleSourceChange(e.target.value as any)}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 text-[var(--foreground)]/80 cursor-pointer"
                    >
                      <option value="bank">Bank Book</option>
                      <option value="cash">Cash Drawer</option>
                    </select>
                  </div>
                  
                  <div className="flex justify-center text-[var(--muted-foreground)]/70 pt-3"><ArrowRight className="w-4 h-4" /></div>
                  
                  <div className="col-span-2 text-center">
                    <p className="text-[9px] text-[var(--muted-foreground)]/70 mb-1">TRANSFER TO</p>
                    <div className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 text-[var(--muted-foreground)] text-center font-bold uppercase py-2">
                      {transferTo}
                    </div>
                  </div>
                </div>
              </div>

              {/* Balances review */}
              <div className="grid grid-cols-2 gap-4 bg-[var(--background)]/60 p-3 border border-[var(--border)] rounded-xl">
                <div>
                  <p className="text-[9px] text-[var(--muted-foreground)]/70">Source Book Balance</p>
                  <p className="font-extrabold text-[var(--card-foreground)] mt-0.5">
                    {transferFrom === 'cash' ? formatCurrency(stats.availableCash) : formatCurrency(stats.bankBalance)}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-[var(--muted-foreground)]/70">Target Book Balance</p>
                  <p className="font-extrabold text-[var(--card-foreground)] mt-0.5">
                    {transferTo === 'cash' ? formatCurrency(stats.availableCash) : formatCurrency(stats.bankBalance)}
                  </p>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Transfer Amount (TK) *</label>
                <input
                  type="number"
                  required
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(Number(e.target.value))}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--card-foreground)] focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1">Transfer Remarks / Reference</label>
                <textarea
                  rows={2}
                  value={transferDesc}
                  onChange={(e) => setTransferDesc(e.target.value)}
                  placeholder="e.g. Deposited monthly cash collections to Bank"
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--card-foreground)] placeholder-zinc-650 focus:outline-none resize-none"
                />
              </div>

              {/* Execute Submit */}
              <button
                type="submit"
                className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-lg shadow-md shadow-indigo-600/10 cursor-pointer"
              >
                Execute Transfer
              </button>

            </form>

          </div>
        )}

        {/* ---------------- TAB 3: TRIAL BALANCE ---------------- */}
        {activeTab === 'trial' && (
          <div className="space-y-4 animate-fade-in-up">
            
            <div className="flex items-center justify-between no-print">
              <div>
                <h3 className="text-xs font-bold text-[var(--card-foreground)]">Double Entry Trial Balance Report</h3>
                <p className="text-[10px] text-[var(--muted-foreground)]/70">Trial summary mapping aggregate ledger debits and credits</p>
              </div>
              <button onClick={() => window.print()} className="px-3.5 py-1.5 bg-[var(--secondary)] border border-[var(--border)] hover:bg-[var(--accent)] text-xs font-bold text-[var(--foreground)]/80 rounded-xl">Print Statement</button>
            </div>

            <div className="glass-panel rounded-2xl overflow-hidden max-w-2xl mx-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--secondary)]/40 text-[var(--muted-foreground)]">
                    <th className="p-4 font-semibold">Account Head</th>
                    <th className="p-4 font-semibold text-right">Debit Balance</th>
                    <th className="p-4 font-semibold text-right">Credit Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {trialData.map((row) => (
                    <tr key={row.account} className="hover:bg-[var(--secondary)]/30 transition-colors">
                      <td className="p-4 font-bold text-[var(--card-foreground)]">{row.account}</td>
                      <td className="p-4 text-right text-[var(--foreground)]/80 font-semibold">
                        {row.debit > 0 ? `${row.debit.toLocaleString()} TK` : '-'}
                      </td>
                      <td className="p-4 text-right text-[var(--foreground)]/80 font-semibold">
                        {row.credit > 0 ? `${row.credit.toLocaleString()} TK` : '-'}
                      </td>
                    </tr>
                  ))}
                  
                  {/* Totals row */}
                  <tr className="bg-[var(--secondary)] font-bold border-t-2 border-[var(--border)]">
                    <td className="p-4 text-[var(--foreground)] uppercase tracking-wider text-[10px]">Total Balance Summary</td>
                    <td className="p-4 text-right text-indigo-400 font-extrabold">{trialTotalDebit.toLocaleString()} TK</td>
                    <td className="p-4 text-right text-indigo-400 font-extrabold">{trialTotalCredit.toLocaleString()} TK</td>
                  </tr>
                </tbody>
              </table>
              
              {trialTotalDebit === trialTotalCredit && (
                <div className="p-3 bg-emerald-500/10 text-emerald-400 text-[10px] text-center border-t border-[var(--border)] flex items-center justify-center space-x-2">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Double-entry books balance perfectly. Trial Balance matches.</span>
                </div>
              )}
            </div>

          </div>
        )}

        {/* ---------------- TAB 4: FINANCIAL STATEMENTS ---------------- */}
        {activeTab === 'financials' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-up">
            
            {/* Profit & Loss statement */}
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="border-b border-[var(--border)] pb-3">
                <h3 className="text-xs font-bold text-[var(--card-foreground)]">Income Statement (Profit & Loss)</h3>
                <p className="text-[10px] text-[var(--muted-foreground)]/70">Revenue collections vs administrative costs</p>
              </div>

              <div className="space-y-3 text-xs">
                
                {/* Revenues */}
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Operating Income</p>
                  <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                    <span className="text-[var(--muted-foreground)]">Monthly Subscriptions Collection</span>
                    <span className="font-bold text-[var(--card-foreground)]">{stats.totalCollection.toLocaleString()} TK</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                    <span className="text-[var(--muted-foreground)]">FDR/DPS Interest Income</span>
                    <span className="font-bold text-[var(--card-foreground)]">{stats.totalInterestEarned.toLocaleString()} TK</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-[var(--foreground)] bg-[var(--background)]/40 px-2 rounded">
                    <span>Total Revenue (A)</span>
                    <span>{(stats.totalCollection + stats.totalInterestEarned).toLocaleString()} TK</span>
                  </div>
                </div>

                {/* Expenses */}
                <div className="space-y-1 pt-2">
                  <p className="text-[10px] font-black uppercase text-rose-400 tracking-wider">Administrative Costs</p>
                  <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                    <span className="text-[var(--muted-foreground)]">Office Rents / Utilities / Misc</span>
                    <span className="font-bold text-[var(--card-foreground)]">{stats.totalExpenses.toLocaleString()} TK</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-[var(--foreground)] bg-[var(--background)]/40 px-2 rounded">
                    <span>Total Operating Expenses (B)</span>
                    <span className="text-rose-400">{(stats.totalExpenses).toLocaleString()} TK</span>
                  </div>
                </div>

                {/* Net Income */}
                <div className="flex justify-between items-center p-3 bg-[var(--secondary)] border border-[var(--border)] rounded-xl font-bold mt-4">
                  <span className="text-[var(--card-foreground)]">Net Retained Earnings (A - B)</span>
                  <span className={`text-sm font-black ${netProfit >= 0 ? 'text-emerald-400' : 'text-rose-450'}`}>
                    {netProfit.toLocaleString()} TK
                  </span>
                </div>

              </div>
            </div>

            {/* Balance sheet */}
            <div className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="border-b border-[var(--border)] pb-3">
                <h3 className="text-xs font-bold text-[var(--card-foreground)]">Foundation Balance Sheet</h3>
                <p className="text-[10px] text-[var(--muted-foreground)]/70">Assets vs Capital Reserves</p>
              </div>

              <div className="space-y-3 text-xs">
                
                {/* Assets */}
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">Current & Fixed Assets</p>
                  <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                    <span className="text-[var(--muted-foreground)]">Cash in Hand (Drawer Buffer)</span>
                    <span className="font-bold text-[var(--card-foreground)]">{stats.availableCash.toLocaleString()} TK</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                    <span className="text-[var(--muted-foreground)]">Bank Accounts Balance</span>
                    <span className="font-bold text-[var(--card-foreground)]">{stats.bankBalance.toLocaleString()} TK</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                    <span className="text-[var(--muted-foreground)]">Running Investments Value</span>
                    <span className="font-bold text-[var(--card-foreground)]">{stats.totalInvestment.toLocaleString()} TK</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-[var(--foreground)] bg-[var(--background)]/40 px-2 rounded">
                    <span>Total Foundation Assets</span>
                    <span className="text-emerald-400">{totalAssets.toLocaleString()} TK</span>
                  </div>
                </div>

                {/* Equity */}
                <div className="space-y-1 pt-2">
                  <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Equity & Capital Reserves</p>
                  <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                    <span className="text-[var(--muted-foreground)]">Opening Capital Fund</span>
                    <span className="font-bold text-[var(--card-foreground)]">{openingCapital.toLocaleString()} TK</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[var(--border)]">
                    <span className="text-[var(--muted-foreground)]">Retained Net Profit / Loss</span>
                    <span className="font-bold text-[var(--card-foreground)]">{netProfit.toLocaleString()} TK</span>
                  </div>
                  <div className="flex justify-between py-2 font-bold text-[var(--foreground)] bg-[var(--background)]/40 px-2 rounded">
                    <span>Total Capital Equity</span>
                    <span className="text-indigo-400">{totalEquityAndLiabilities.toLocaleString()} TK</span>
                  </div>
                </div>

                {/* Audit check */}
                {totalAssets === totalEquityAndLiabilities && (
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-lg text-[9px] text-center border border-emerald-500/20">
                    Audit Verification Pass: Total Assets match Capital Equity perfectly.
                  </div>
                )}

              </div>
            </div>

          </div>
        )}

        {/* Deletion Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmOpen}
          loading={confirmLoading}
          title={confirmTarget?.type === 'all' ? 'Clear All Ledger Transactions' : 'Void Ledger Transaction'}
          message={
            confirmTarget?.type === 'all'
              ? 'Are you sure you want to permanently delete ALL ledger transactions? This will reset all cash and bank ledger histories. This action cannot be undone.'
              : `Are you sure you want to void transaction ${confirmTarget?.id || ''} (${confirmTarget?.desc || 'Ledger Entry'})?`
          }
          confirmText={confirmTarget?.type === 'all' ? 'Clear All Transactions' : 'Void Transaction'}
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setConfirmOpen(false);
            setConfirmTarget(null);
          }}
        />

      </div>
    </DashboardLayout>
  );
}
