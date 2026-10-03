'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, DollarSign, Calendar, AlertCircle, Clock, CheckCircle2, CreditCard, ShieldAlert } from 'lucide-react';
import { useStore } from '../contexts/store-context';

interface PaymentSubmitModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberId: string;
  memberName: string;
  defaultMonth?: string;
  defaultAmount?: number;
  defaultFine?: number;
  unpaidMonths?: { month: string; fee: number; fine: number }[];
  onSuccess?: () => void;
}

export default function PaymentSubmitModal({
  isOpen,
  onClose,
  memberId,
  memberName,
  defaultMonth,
  defaultAmount,
  defaultFine,
  unpaidMonths = [],
  onSuccess
}: PaymentSubmitModalProps) {
  const { addCollection } = useStore();
  const [mounted, setMounted] = useState(false);

  const [month, setMonth] = useState(defaultMonth || new Date().toISOString().slice(0, 7));
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [amount, setAmount] = useState(defaultAmount || 1000);
  const [lateFine, setLateFine] = useState(defaultFine || 0);
  const [paymentType, setPaymentType] = useState<'cash' | 'bank' | 'bkash' | 'nagad'>('bkash');
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (defaultMonth) setMonth(defaultMonth);
    if (defaultAmount !== undefined) setAmount(defaultAmount);
    if (defaultFine !== undefined) setLateFine(defaultFine);
    setSubmitted(false);
  }, [defaultMonth, defaultAmount, defaultFine, isOpen]);

  const handleMonthChange = (selectedM: string) => {
    setMonth(selectedM);
    const matched = unpaidMonths.find(u => u.month === selectedM);
    if (matched) {
      setAmount(matched.fee);
      setLateFine(matched.fine);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!month || amount <= 0) return;

    setSubmitting(true);
    try {
      addCollection({
        memberId,
        memberName,
        month,
        amount: Number(amount),
        lateFine: Number(lateFine) || 0,
        paymentType,
        date: paymentDate,
        status: 'pending',
        collectedBy: 'Member Submission',
        transactionRef: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined
      });

      setSubmitted(true);
      setTimeout(() => {
        if (onSuccess) onSuccess();
        onClose();
        setSubmitted(false);
      }, 1500);
    } catch (err) {
      console.error('Failed to submit payment:', err);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const totalPayable = Number(amount) + (Number(lateFine) || 0);

  const modalContent = (
    <div 
      className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl p-6 relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--border)]">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[var(--foreground)]">Submit Payment (টাকা জমা দিন)</h3>
              <p className="text-[11px] text-[var(--muted-foreground)]">Submit your monthly subscription for Admin review</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--accent)] rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto animate-bounce">
              <Clock className="w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-[var(--foreground)]">Payment Submitted Successfully!</h4>
            <p className="text-xs text-[var(--muted-foreground)] max-w-sm mx-auto leading-relaxed">
              আপনার জমা দেওয়া <strong>{totalPayable} TK</strong> ({month}) এডমিনের অনুমোদনের জন্য অপেক্ষমান (Pending) রয়েছে। এডমিন যাচাই করে Approve করলেই আপনার বকেয়া পরিশোধ হয়ে যাবে।
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
            
            {/* Member Details Read-only */}
            <div className="p-3 bg-[var(--secondary)] rounded-xl border border-[var(--border)] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)] uppercase font-semibold block">Member Account</span>
                <span className="font-bold text-[var(--foreground)] text-xs">{memberName}</span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-[var(--accent)] text-[var(--foreground)]">
                {memberId}
              </span>
            </div>

            {/* Target Month & Payment Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                  Billing Month *
                </label>
                {unpaidMonths.length > 0 ? (
                  <select
                    value={month}
                    onChange={(e) => handleMonthChange(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 cursor-pointer font-medium"
                    required
                  >
                    {unpaidMonths.map(u => (
                      <option key={u.month} value={u.month}>
                        {u.month} — {u.fee} TK {u.fine > 0 ? `(+${u.fine} TK Fine)` : ''}
                      </option>
                    ))}
                    {!unpaidMonths.some(u => u.month === month) && (
                      <option value={month}>{month} (Selected)</option>
                    )}
                  </select>
                ) : (
                  <input
                    type="month"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-medium"
                    required
                  />
                )}
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                  Payment Date *
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-medium"
                  required
                />
              </div>
            </div>

            {/* Amount & Fine */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                  Fee Amount (TK) *
                </label>
                <input
                  type="number"
                  min="1"
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-bold"
                  required
                />
              </div>

              <div>
                <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                  Late Fine (TK)
                </label>
                <input
                  type="number"
                  min="0"
                  value={lateFine}
                  onChange={(e) => setLateFine(Number(e.target.value))}
                  className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-semibold"
                />
              </div>
            </div>

            {/* Payment Method Selector */}
            <div>
              <label className="block text-[var(--muted-foreground)] font-semibold mb-1.5">
                Payment Channel (পেমেন্ট মাধ্যম) *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { key: 'bkash', label: 'bKash (বিকাশ)' },
                  { key: 'nagad', label: 'Nagad (নগদ)' },
                  { key: 'bank', label: 'Bank Book' },
                  { key: 'cash', label: 'Cash in Hand' }
                ].map((item) => {
                  const isSelected = paymentType === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setPaymentType(item.key as any)}
                      className={`p-2 rounded-xl border text-center font-bold text-[11px] transition-all cursor-pointer ${
                        isSelected 
                          ? 'border-indigo-500 bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500'
                          : 'border-[var(--border)] bg-[var(--secondary)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Transaction Ref / TrxID */}
            <div>
              <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                Transaction ID / Slip No. (TrxID বা রশিদ নম্বর)
              </label>
              <input
                type="text"
                placeholder="e.g. bKash TrxID: 9J4728KA or Bank Slip No"
                value={transactionRef}
                onChange={(e) => setTransactionRef(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2.5 text-[var(--foreground)] focus:outline-none focus:border-indigo-500 font-mono text-[11px]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-[var(--muted-foreground)] font-semibold mb-1">
                Notes (মন্তব্য - ঐচ্ছিক)
              </label>
              <input
                type="text"
                placeholder="Any additional remarks..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg p-2 text-[var(--foreground)] focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Pending Notice Box */}
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-xl space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-[11px]">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>অপেক্ষমান (Pending) নিয়মাবলী:</span>
              </div>
              <p className="text-[10px] leading-relaxed text-[var(--muted-foreground)]">
                টাকা সাবমিট করার পর এটি আপনার প্রোফাইলে <strong>Pending</strong> হিসেবে দেখাবে। <strong>এডমিন অনুমোদন (Approve) না করা পর্যন্ত বকেয়া পরিশোধ হিসেবে গণ্য হবে না।</strong>
              </p>
            </div>

            {/* Footer Total & Buttons */}
            <div className="pt-2 flex items-center justify-between border-t border-[var(--border)]">
              <div>
                <span className="text-[10px] text-[var(--muted-foreground)] block">Total Payable</span>
                <span className="text-base font-black text-emerald-400">{totalPayable.toLocaleString()} TK</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-3.5 py-2 rounded-xl bg-[var(--accent)] hover:bg-[var(--secondary)] text-[var(--foreground)] text-xs font-semibold transition-all cursor-pointer"
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
                    <span>Submit for Approval</span>
                  )}
                </button>
              </div>
            </div>

          </form>
        )}

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
