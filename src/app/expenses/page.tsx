'use client';

import React, { useState } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { Expense, ExpenseCategory } from '../../types';
import { 
  CreditCard, 
  PlusCircle, 
  Trash2, 
  Search, 
  Filter,
  DollarSign,
  TrendingDown,
  Building,
  Wrench,
  Users,
  X
} from 'lucide-react';
import ConfirmModal from '../../components/confirm-modal';

export default function ExpensesPage() {
  const { expenses, addExpense, deleteExpense } = useStore();
  const { hasPermission } = useAuth();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Form fields
  const [category, setCategory] = useState<ExpenseCategory>('Utilities');
  const [amount, setAmount] = useState(1000);
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState('Treasurer');
  
  // Add modal toggle & delete confirmation
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [expToDelete, setExpToDelete] = useState<Expense | null>(null);

  const handleDelete = (exp: Expense) => {
    setExpToDelete(exp);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!expToDelete) return;
    deleteExpense(expToDelete.id);
    setConfirmModalOpen(false);
    setExpToDelete(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !description) {
      alert('Please fill out all required fields');
      return;
    }

    addExpense({
      category,
      amount: Number(amount),
      description,
      paidBy
    });

    setAddModalOpen(false);
    setAmount(1000);
    setDescription('');
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = exp.description.toLowerCase().includes(searchQuery.toLowerCase()) || exp.paidBy.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || exp.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  // Math totals
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);

  const getCategoryTotal = (cat: ExpenseCategory) => {
    return expenses
      .filter(e => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-BD', { style: 'currency', currency: 'BDT', maximumFractionDigits: 0 }).format(value);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Category breakdown cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="glass-card p-3 rounded-xl">
            <span className="text-zinc-500 text-[9px] uppercase font-bold flex items-center space-x-1">
              <Building className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span>Office Rent</span>
            </span>
            <p className="text-sm font-black text-white mt-1.5">{formatCurrency(getCategoryTotal('Office Rent'))}</p>
          </div>
          <div className="glass-card p-3 rounded-xl">
            <span className="text-zinc-500 text-[9px] uppercase font-bold flex items-center space-x-1">
              <Users className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Staff Salary</span>
            </span>
            <p className="text-sm font-black text-white mt-1.5">{formatCurrency(getCategoryTotal('Staff Salary'))}</p>
          </div>
          <div className="glass-card p-3 rounded-xl">
            <span className="text-zinc-500 text-[9px] uppercase font-bold flex items-center space-x-1">
              <DollarSign className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span>Utilities</span>
            </span>
            <p className="text-sm font-black text-white mt-1.5">{formatCurrency(getCategoryTotal('Utilities'))}</p>
          </div>
          <div className="glass-card p-3 rounded-xl">
            <span className="text-zinc-500 text-[9px] uppercase font-bold flex items-center space-x-1">
              <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Maintenance</span>
            </span>
            <p className="text-sm font-black text-white mt-1.5">{formatCurrency(getCategoryTotal('Maintenance'))}</p>
          </div>
          <div className="glass-card p-3 rounded-xl col-span-2 lg:col-span-1">
            <span className="text-zinc-500 text-[9px] uppercase font-bold flex items-center space-x-1">
              <CreditCard className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span>Misc Expense</span>
            </span>
            <p className="text-sm font-black text-white mt-1.5">{formatCurrency(getCategoryTotal('Misc'))}</p>
          </div>
        </div>

        {/* Filter controls header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          
          <div className="flex items-center space-x-2 w-full md:max-w-md">
            
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search description, payer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-880 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none"
              />
            </div>

            {/* Category dropdown filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none"
            >
              <option value="all">All Categories</option>
              <option value="Office Rent">Office Rent</option>
              <option value="Staff Salary">Staff Salary</option>
              <option value="Utilities">Utilities</option>
              <option value="Maintenance">Maintenance</option>
              <option value="Misc">Misc</option>
            </select>

          </div>

          {hasPermission('expenses', 'create') && (
            <button
              onClick={() => setAddModalOpen(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-rose-600/15 transition-all cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Log Expense</span>
            </button>
          )}

        </div>

        {/* ---------------- EXPENSE TABLE ---------------- */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400">
                  <th className="p-4 font-semibold">Expense Category</th>
                  <th className="p-4 font-semibold">Description</th>
                  <th className="p-4 font-semibold">Payer Info</th>
                  <th className="p-4 font-semibold">Date Logged</th>
                  <th className="p-4 font-semibold text-right">Amount</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">No expenses found</td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-zinc-900/40 transition-colors">
                      
                      <td className="p-4">
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-[10px] text-zinc-300 font-extrabold">{exp.category}</span>
                      </td>

                      <td className="p-4 font-semibold text-zinc-200 truncate max-w-[250px]">
                        {exp.description}
                      </td>

                      <td className="p-4 text-zinc-400 capitalize">
                        {exp.paidBy}
                      </td>

                      <td className="p-4 text-zinc-500 text-[10px]">
                        {exp.date}
                      </td>

                      <td className="p-4 font-bold text-right text-rose-400 text-sm">
                        {exp.amount.toLocaleString()} TK
                      </td>

                      <td className="p-4 text-right">
                        {hasPermission('expenses', 'delete') && (
                          <button
                            onClick={() => handleDelete(exp)}
                            className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-850 rounded-lg transition-colors cursor-pointer"
                            title="Delete Expense Log"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>

                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ---------------- MODAL: ADD EXPENSE ---------------- */}
        {addModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
              
              <div className="flex items-center justify-between p-4 border-b border-zinc-850">
                <h3 className="text-sm font-bold text-zinc-200">Log New Foundation Expense</h3>
                <button onClick={() => setAddModalOpen(false)} className="p-1 text-zinc-400 hover:text-white rounded-lg"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
                
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Expense Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="Office Rent">Office Rent</option>
                    <option value="Staff Salary">Staff Salary</option>
                    <option value="Utilities">Utilities (Bills/Internet)</option>
                    <option value="Maintenance">Maintenance / Repairs</option>
                    <option value="Misc">Miscellaneous Expenses</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Expense Amount (TK) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Description / Notes *</label>
                  <textarea
                    rows={3}
                    required
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Utility bills for month of July 2026"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none resize-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Authorised Payer</label>
                  <input
                    type="text"
                    value={paidBy}
                    onChange={(e) => setPaidBy(e.target.value)}
                    placeholder="Treasurer, President..."
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-850">
                  <button type="button" onClick={() => setAddModalOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-bold transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold">Log Expense</button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModalOpen}
          title="Delete Expense Record"
          message={`Are you sure you want to delete expense "${expToDelete?.description}" (${expToDelete?.amount?.toLocaleString()} TK - ${expToDelete?.category})? The associated ledger entry will be reverted.`}
          confirmText="Delete Expense"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setConfirmModalOpen(false);
            setExpToDelete(null);
          }}
        />

      </div>
    </DashboardLayout>
  );
}
