'use client';

import React, { useState } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { Investment, InvestmentType } from '../../types';
import { 
  TrendingUp, 
  PlusCircle, 
  CheckCircle, 
  DollarSign, 
  Percent, 
  Calendar, 
  Trash2, 
  Calculator,
  ArrowUpRight,
  UserCheck,
  X,
  FileSpreadsheet
} from 'lucide-react';
import ExcelImportModal from '../../components/excel-import-modal';
import ConfirmModal from '../../components/confirm-modal';

export default function InvestmentsPage() {
  const { investments, addInvestment, importInvestments, receiveInterest, closeInvestment, deleteInvestment } = useStore();
  const { hasPermission } = useAuth();

  // Search & Filter state
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [interestModalOpen, setInterestModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [selectedInv, setSelectedInv] = useState<Investment | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [invToDelete, setInvToDelete] = useState<Investment | null>(null);

  const handleDelete = (inv: Investment) => {
    setInvToDelete(inv);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!invToDelete) return;
    deleteInvestment(invToDelete.id);
    setConfirmModalOpen(false);
    setInvToDelete(null);
  };

  // Form fields: Add
  const [type, setType] = useState<InvestmentType>('FDR');
  const [provider, setProvider] = useState('');
  const [principalAmount, setPrincipalAmount] = useState(100000);
  const [interestRate, setInterestRate] = useState(8.5);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [maturityDate, setMaturityDate] = useState('');
  const [notes, setNotes] = useState('');

  // Form fields: Receive Interest
  const [interestAmount, setInterestAmount] = useState(5000);

  // Form fields: Close Investment
  const [finalInterest, setFinalInterest] = useState(10000);

  const resetAddForm = () => {
    setType('FDR');
    setProvider('');
    setPrincipalAmount(100000);
    setInterestRate(8.5);
    setStartDate(new Date().toISOString().split('T')[0]);
    setMaturityDate('');
    setNotes('');
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!provider || !principalAmount || !maturityDate) {
      alert('Please fill out all required fields');
      return;
    }

    addInvestment({
      type,
      provider,
      principalAmount: Number(principalAmount),
      interestRate: Number(interestRate),
      startDate,
      maturityDate,
      notes
    });

    setAddModalOpen(false);
    resetAddForm();
  };

  const handleInterestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInv || !interestAmount) return;

    receiveInterest(selectedInv.id, Number(interestAmount));
    setInterestModalOpen(false);
    setInterestAmount(5000);
    setSelectedInv(null);
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInv) return;

    closeInvestment(selectedInv.id, Number(finalInterest));
    setCloseModalOpen(false);
    setFinalInterest(0);
    setSelectedInv(null);
  };

  // Filter investments
  const filteredInvestments = investments.filter(inv => {
    const matchesType = typeFilter === 'all' || inv.type === typeFilter;
    const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;
    return matchesType && matchesStatus;
  });

  // Math calculations
  const totalPrincipalActive = investments
    .filter(i => i.status === 'running')
    .reduce((sum, i) => sum + i.principalAmount, 0);

  const totalEarningsCollected = investments
    .reduce((sum, i) => sum + i.interestReceived, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Portfolios metrics cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl">
            <span className="text-zinc-400 text-[10px] uppercase font-bold">Active Invested Capital</span>
            <p className="text-lg font-black text-white mt-1">{formatCurrency(totalPrincipalActive)}</p>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <span className="text-zinc-400 text-[10px] uppercase font-bold">Total Interest Earnings</span>
            <p className="text-lg font-black text-emerald-400 mt-1">{formatCurrency(totalEarningsCollected)}</p>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <span className="text-zinc-400 text-[10px] uppercase font-bold">Running Portfolios Count</span>
            <p className="text-lg font-black text-indigo-400 mt-1">
              {investments.filter(i => i.status === 'running').length} active
            </p>
          </div>
          <div className="glass-card p-4 rounded-xl">
            <span className="text-zinc-400 text-[10px] uppercase font-bold">Matured / Closed Assets</span>
            <p className="text-lg font-black text-zinc-400 mt-1">
              {investments.filter(i => i.status === 'closed').length} completed
            </p>
          </div>
        </div>

        {/* Controls: Search and Add */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          
          <div className="flex items-center space-x-2">
            
            {/* Filter by Category */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="FDR">FDR</option>
              <option value="DPS">DPS</option>
              <option value="Savings">Savings</option>
              <option value="Business">Business</option>
              <option value="Loan">Loan</option>
              <option value="Share Market">Share Market</option>
              <option value="Mutual Fund">Mutual Fund</option>
              <option value="Others">Others</option>
            </select>

            {/* Filter by Status */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="all">All Status</option>
              <option value="running">Running</option>
              <option value="closed">Closed</option>
              <option value="matured">Matured</option>
            </select>

          </div>

          <div className="flex items-center space-x-2">
            {hasPermission('investments', 'create') && (
              <button
                onClick={() => setImportModalOpen(true)}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                title="Import investments via Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>
            )}

            {hasPermission('investments', 'create') && (
              <button
                onClick={() => { resetAddForm(); setAddModalOpen(true); }}
                className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-600/15 transition-all cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Add Investment</span>
              </button>
            )}
          </div>

        </div>

        {/* ---------------- PORTFOLIO TABLE LISTING ---------------- */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400">
                  <th className="p-4 font-semibold">Asset Category / Provider</th>
                  <th className="p-4 font-semibold">Principal Capital</th>
                  <th className="p-4 font-semibold text-center">Interest Rate</th>
                  <th className="p-4 font-semibold">Maturity Horizon</th>
                  <th className="p-4 font-semibold text-right">Interest Collected</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filteredInvestments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-zinc-500">No investments found</td>
                  </tr>
                ) : (
                  filteredInvestments.map((inv) => {
                    const isMatured = inv.status === 'running' && new Date(inv.maturityDate).getTime() < Date.now();
                    return (
                      <tr key={inv.id} className="hover:bg-zinc-900/40 transition-colors">
                        
                        <td className="p-4">
                          <p className="font-bold text-zinc-100 flex items-center space-x-1.5">
                            <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-extrabold">{inv.type}</span>
                            <span>{inv.provider}</span>
                          </p>
                          {inv.notes && <p className="text-[10px] text-zinc-500 mt-0.5 truncate max-w-[200px]">{inv.notes}</p>}
                        </td>

                        <td className="p-4 font-bold text-zinc-200">
                          {inv.principalAmount.toLocaleString()} TK
                        </td>

                        <td className="p-4 text-center font-semibold text-zinc-400">
                          {inv.interestRate} %
                        </td>

                        <td className="p-4">
                          <div>
                            <p className="text-[10px] text-zinc-400">Matures: {inv.maturityDate}</p>
                            <p className="text-[9px] text-zinc-500">Started: {inv.startDate}</p>
                          </div>
                        </td>

                        <td className="p-4 font-bold text-right text-emerald-400">
                          {inv.interestReceived.toLocaleString()} TK
                        </td>

                        {/* Status badge */}
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            inv.status === 'closed' 
                              ? 'bg-zinc-800 text-zinc-400 border border-zinc-700' 
                              : isMatured 
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse'
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {isMatured ? 'Matured' : inv.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            {inv.status === 'running' && hasPermission('investments', 'update') && (
                              <>
                                {/* Collect intermediate interest */}
                                <button
                                  onClick={() => {
                                    setSelectedInv(inv);
                                    setInterestModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-zinc-800 hover:bg-zinc-750 text-indigo-400 font-bold rounded-lg text-[9px] cursor-pointer"
                                  title="Log intermediate interest yield"
                                >
                                  Interest
                                </button>

                                {/* Close mature/running asset */}
                                <button
                                  onClick={() => {
                                    setSelectedInv(inv);
                                    // Default close interest calculation
                                    const monthsRunning = 6; // Mock months
                                    const calcInterest = Math.round(inv.principalAmount * (inv.interestRate / 100) * (monthsRunning / 12));
                                    setFinalInterest(calcInterest);
                                    setCloseModalOpen(true);
                                  }}
                                  className="px-2 py-1 bg-emerald-650 hover:bg-emerald-500 text-white font-bold rounded-lg text-[9px] cursor-pointer"
                                  title="Close investment portfolio"
                                >
                                  Close
                                </button>
                              </>
                            )}

                            {/* Delete investment portfolio */}
                            {hasPermission('investments', 'delete') && (
                              <button
                                onClick={() => handleDelete(inv)}
                                className="p-1 bg-zinc-800 hover:bg-zinc-700 text-rose-450 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                                title="Delete investment portfolio"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {inv.status === 'closed' && !hasPermission('investments', 'delete') && (
                              <span className="text-[10px] text-zinc-500">Asset closed</span>
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

        {/* ---------------- MODAL: ADD PORTFOLIO ---------------- */}
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in-up">
              
              <div className="flex items-center justify-between p-4 border-b border-zinc-850">
                <h3 className="text-sm font-bold text-zinc-200">Open New Investment Portfolio</h3>
                <button onClick={() => setAddModalOpen(false)} className="p-1 text-zinc-400 hover:text-white rounded-lg"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleAddSubmit} className="p-4 space-y-4 text-xs">
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Asset Category</label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value as InvestmentType)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-300 focus:outline-none cursor-pointer"
                    >
                      <option value="FDR">FDR (Fixed Deposit)</option>
                      <option value="DPS">DPS (Pension Scheme)</option>
                      <option value="Savings">Savings Book</option>
                      <option value="Business">Business Venture</option>
                      <option value="Loan">Loan Disbursal</option>
                      <option value="Share Market">Stock / Share Market</option>
                      <option value="Mutual Fund">Mutual Fund</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Provider Institution *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. City Bank Ltd"
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Principal Capital (TK) *</label>
                    <input
                      type="number"
                      required
                      value={principalAmount}
                      onChange={(e) => setPrincipalAmount(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Annual Interest Rate (%) *</label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={interestRate}
                      onChange={(e) => setInterestRate(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Start Date *</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-350 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Maturity Date *</label>
                    <input
                      type="date"
                      required
                      value={maturityDate}
                      onChange={(e) => setMaturityDate(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-350 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Additional Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Certificates ID, specific return structures..."
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-850 animate-fade-in-up">
                  <button type="button" onClick={() => setAddModalOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-bold transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold">Invest Capital</button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* ---------------- MODAL: LOG INTEREST ---------------- */}
        {interestModalOpen && selectedInv && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
              
              <div className="flex items-center justify-between p-4 border-b border-zinc-850">
                <div>
                  <h3 className="text-xs font-bold text-zinc-200">Log Interest Payment</h3>
                  <p className="text-[9px] text-zinc-500 mt-0.5">{selectedInv.provider} ({selectedInv.type})</p>
                </div>
                <button onClick={() => setInterestModalOpen(false)} className="p-1 text-zinc-400 hover:text-white rounded-lg"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleInterestSubmit} className="p-4 space-y-4 text-xs">
                
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Interest Amount Received (TK) *</label>
                  <input
                    type="number"
                    required
                    value={interestAmount}
                    onChange={(e) => setInterestAmount(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-850">
                  <button type="button" onClick={() => setInterestModalOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-bold transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold">Save Interest</button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* ---------------- MODAL: CLOSE PORTFOLIO ---------------- */}
        {closeModalOpen && selectedInv && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
              
              <div className="flex items-center justify-between p-4 border-b border-zinc-850">
                <div>
                  <h3 className="text-xs font-bold text-zinc-200">Close Investment Portfolio</h3>
                  <p className="text-[9px] text-zinc-500 mt-0.5">{selectedInv.provider} ({selectedInv.type})</p>
                </div>
                <button onClick={() => setCloseModalOpen(false)} className="p-1 text-zinc-400 hover:text-white rounded-lg"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleCloseSubmit} className="p-4 space-y-4 text-xs">
                
                <div className="bg-zinc-950/60 p-3 border border-zinc-850 rounded-xl space-y-1">
                  <p className="text-[9px] text-zinc-500">Returned Principal Capital</p>
                  <p className="font-extrabold text-zinc-200 text-sm">{selectedInv.principalAmount.toLocaleString()} TK</p>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Final Remaining Interest (TK)</label>
                  <input
                    type="number"
                    value={finalInterest}
                    onChange={(e) => setFinalInterest(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                  />
                </div>

                <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg text-[9px] leading-relaxed">
                  Notice: Closing will move the entire Principal Capital and final interest returns back to the Bank Balance. This asset status is set to closed.
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-850">
                  <button type="button" onClick={() => setCloseModalOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-bold transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold">Confirm Closure</button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Excel Import Modal */}
        <ExcelImportModal
          isOpen={importModalOpen}
          type="investments"
          title="Import Investments via Excel"
          onClose={() => setImportModalOpen(false)}
          onImportSuccess={async (rows) => {
            await importInvestments(rows);
          }}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModalOpen}
          title="Delete Investment Portfolio"
          message={`Are you sure you want to delete investment portfolio "${invToDelete?.type} - ${invToDelete?.provider}" (${invToDelete?.principalAmount?.toLocaleString()} TK)? The bank ledger entry will be reverted.`}
          confirmText="Delete & Revert"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setConfirmModalOpen(false);
            setInvToDelete(null);
          }}
        />

      </div>
    </DashboardLayout>
  );
}
