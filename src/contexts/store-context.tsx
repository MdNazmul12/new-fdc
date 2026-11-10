'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Member, Collection, Investment, Expense, Transaction, AuditLog, SystemNotification, DocumentFile, UserRole, User, DueDemand, Loan, LoanRepayment, LoanStatus, FineWaiver, TrashItem, TrashEntityType } from '../types';

interface StoreContextProps {
  members: Member[];
  collections: Collection[];
  investments: Investment[];
  expenses: Expense[];
  transactions: Transaction[];
  auditLogs: AuditLog[];
  notifications: SystemNotification[];
  documents: DocumentFile[];
  users: User[];
  dueDemands: DueDemand[];
  loans: Loan[];
  fineWaivers: FineWaiver[];
  trash: TrashItem[];

  // Trash & Two-Tier Deletion
  restoreFromTrash: (trashId: string) => Promise<boolean>;
  permanentDeleteFromTrash: (trashId: string) => Promise<boolean>;
  emptyTrash: () => Promise<boolean>;

  // Loan actions
  addLoan: (loanData: Omit<Loan, 'id' | 'loanNo' | 'totalPayable' | 'totalRepaid' | 'status' | 'repayments' | 'createdAt'>) => Promise<Loan>;
  recordLoanRepayment: (loanId: string, repayment: Omit<LoanRepayment, 'id'>) => Promise<boolean>;
  updateLoanStatus: (loanId: string, status: LoanStatus, notes?: string) => Promise<boolean>;
  deleteLoan: (loanId: string, permanent?: boolean) => Promise<boolean>;
  sendLoanReminder: (loanId: string) => Promise<boolean>;
  
  // Due actions
  addDueDemand: (demand: Omit<DueDemand, 'id' | 'createdAt'>) => Promise<DueDemand>;
  deleteDueDemand: (id: string, permanent?: boolean) => Promise<void>;
  waiveFine: (memberId: string, month: string, reason?: string) => Promise<boolean>;
  removeFineWaiver: (memberId: string, month: string) => Promise<boolean>;
  importPreviousDues: (dues: { memberId?: string; memberName?: string; phone?: string; month: string; amount?: number; lateFine?: number; notes?: string }[]) => Promise<number>;
  
  // Member actions
  addMember: (member: Omit<Member, 'id'>) => Member;
  importMembers: (members: Omit<Member, 'id'>[]) => Promise<Member[]>;
  updateMember: (id: string, member: Partial<Member>) => void;
  updateMemberPhoto: (id: string, photoUrl: string) => void;
  deleteMember: (id: string, permanent?: boolean) => void;
  
  // Collection actions
  addCollection: (collection: Omit<Collection, 'id' | 'receiptNo' | 'date' | 'status'> & { date?: string; status?: 'paid' | 'pending'; transactionRef?: string; notes?: string; isPartial?: boolean; isAdvance?: boolean; expectedAmount?: number; remainingDue?: number }) => Collection;
  approveCollection: (id: string, approvedBy?: string) => Promise<boolean>;
  rejectCollection: (id: string, reason?: string) => Promise<boolean>;
  importCollections: (collections: Omit<Collection, 'id' | 'receiptNo' | 'date'>[]) => Promise<Collection[]>;
  deleteCollection: (id: string, permanent?: boolean) => void;
  
  // Investment actions
  addInvestment: (investment: Omit<Investment, 'id' | 'status' | 'interestReceived'>) => Investment;
  importInvestments: (investments: Omit<Investment, 'id' | 'status' | 'interestReceived'>[]) => Promise<Investment[]>;
  receiveInterest: (id: string, interestAmount: number) => void;
  closeInvestment: (id: string, finalInterest: number) => void;
  
  // Expense actions
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => Expense;
  deleteExpense: (id: string, permanent?: boolean) => void;
  
  // Fund Transfer
  transferFund: (amount: number, from: 'cash' | 'bank', to: 'cash' | 'bank', description: string, performedBy: string) => void;
  
  // System actions
  addAuditLog: (action: string, role: UserRole, userName: string) => void;
  addNotification: (notif: Omit<SystemNotification, 'id' | 'date' | 'read'>) => Promise<SystemNotification>;
  broadcastAnnouncement: (title: string, message: string, type?: 'info' | 'warning' | 'alert', target?: 'all' | 'due_members' | 'admins') => Promise<boolean>;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  
  // Document actions
  addDocument: (doc: Omit<DocumentFile, 'id' | 'uploadDate'>) => DocumentFile;
  deleteDocument: (id: string, permanent?: boolean) => void;
  
  // User operations
  addUser: (user: Omit<User, 'id'>) => User;
  updateUserStatus: (id: string, status: 'active' | 'locked') => void;
  resetUserPassword: (id: string, newPassword?: string) => void;
  updateUser: (id: string, updatedFields: Partial<User>) => void;
  deleteUser: (id: string) => void;
  deleteInvestment: (id: string, permanent?: boolean) => void;
  deleteTransaction: (id: string) => void;
  clearAllTransactions: () => Promise<void>;
  
  // Stats
  stats: {
    totalMembers: number;
    activeMembers: number;
    totalCollection: number;
    totalInvestment: number;
    runningInvestments: number;
    totalInterestEarned: number;
    totalExpenses: number;
    availableCash: number;
    bankBalance: number;
    dueCollection: number;
  };
}

const StoreContext = createContext<StoreContextProps | undefined>(undefined);

// Initial Mock Data to populate on first load
const initialMembers: Member[] = [
  { id: 'm-1', name: 'Kabir Ahmed', email: 'kabir@fdc.org', phone: '+8801711223344', status: 'active', joinDate: '2025-01-10', nomineeName: 'Salma Begum', nomineeRelation: 'Wife', nomineePhone: '+8801711001122', monthlyFee: 1000 },
  { id: 'm-2', name: 'Tasnim Jahan', email: 'tasnim@fdc.org', phone: '+8801822334455', status: 'active', joinDate: '2025-02-15', nomineeName: 'Mahmudul Hasan', nomineeRelation: 'Brother', nomineePhone: '+8801822002233', monthlyFee: 1000 },
  { id: 'm-3', name: 'Imran Khan', email: 'imran@fdc.org', phone: '+8801933445566', status: 'active', joinDate: '2025-03-20', nomineeName: 'Farida Khan', nomineeRelation: 'Mother', nomineePhone: '+8801933003344', monthlyFee: 1500 },
  { id: 'm-4', name: 'Sajid Islam', email: 'sajid@fdc.org', phone: '+8801544556677', status: 'active', joinDate: '2025-05-01', nomineeName: 'Rokeya Begum', nomineeRelation: 'Mother', nomineePhone: '+8801544004455', monthlyFee: 1000 },
  { id: 'm-5', name: 'Farhana Chowdhury', email: 'farhana@fdc.org', phone: '+8801655667788', status: 'active', joinDate: '2025-06-12', nomineeName: 'Zamil Chowdhury', nomineeRelation: 'Father', nomineePhone: '+8801655005566', monthlyFee: 1200 },
  { id: 'm-6', name: 'Mustafizur Rahman', email: 'mustafiz@fdc.org', phone: '+8801766778899', status: 'active', joinDate: '2025-07-25', nomineeName: 'Halima Khatun', nomineeRelation: 'Wife', nomineePhone: '+8801766006677', monthlyFee: 2000 },
  { id: 'm-7', name: 'Nusrat Imrose', email: 'nusrat@fdc.org', phone: '+8801877889900', status: 'active', joinDate: '2025-09-05', nomineeName: 'Abul Kalam', nomineeRelation: 'Husband', nomineePhone: '+8801877007788', monthlyFee: 1000 },
  { id: 'm-8', name: 'Arifur Rahman', email: 'arif@fdc.org', phone: '+8801988990011', status: 'inactive', joinDate: '2025-10-18', nomineeName: 'Sheli Rahman', nomineeRelation: 'Sister', nomineePhone: '+8801988008899', monthlyFee: 1000 },
];

const initialCollections: Collection[] = [
  { id: 'c-1', memberId: 'm-1', memberName: 'Kabir Ahmed', amount: 1000, month: '2026-05', date: '2026-05-05', paymentType: 'cash', lateFine: 0, receiptNo: 'REC-202605-001', status: 'paid', collectedBy: 'Treasurer' },
  { id: 'c-2', memberId: 'm-2', memberName: 'Tasnim Jahan', amount: 1000, month: '2026-05', date: '2026-05-06', paymentType: 'bank', lateFine: 0, receiptNo: 'REC-202605-002', status: 'paid', collectedBy: 'Treasurer' },
  { id: 'c-3', memberId: 'm-3', memberName: 'Imran Khan', amount: 1500, month: '2026-05', date: '2026-05-12', paymentType: 'cash', lateFine: 50, receiptNo: 'REC-202605-003', status: 'paid', collectedBy: 'Collector' },
  { id: 'c-4', memberId: 'm-4', memberName: 'Sajid Islam', amount: 1000, month: '2026-05', date: '2026-05-10', paymentType: 'cash', lateFine: 0, receiptNo: 'REC-202605-004', status: 'paid', collectedBy: 'Collector' },
  { id: 'c-5', memberId: 'm-5', memberName: 'Farhana Chowdhury', amount: 1200, month: '2026-05', date: '2026-05-09', paymentType: 'bank', lateFine: 0, receiptNo: 'REC-202605-005', status: 'paid', collectedBy: 'Treasurer' },
  
  { id: 'c-6', memberId: 'm-1', memberName: 'Kabir Ahmed', amount: 1000, month: '2026-06', date: '2026-06-03', paymentType: 'cash', lateFine: 0, receiptNo: 'REC-202606-001', status: 'paid', collectedBy: 'Collector' },
  { id: 'c-7', memberId: 'm-2', memberName: 'Tasnim Jahan', amount: 1000, month: '2026-06', date: '2026-06-04', paymentType: 'bank', lateFine: 0, receiptNo: 'REC-202606-002', status: 'paid', collectedBy: 'Treasurer' },
  { id: 'c-8', memberId: 'm-3', memberName: 'Imran Khan', amount: 1500, month: '2026-06', date: '2026-06-05', paymentType: 'cash', lateFine: 0, receiptNo: 'REC-202606-003', status: 'paid', collectedBy: 'Collector' },
  { id: 'c-9', memberId: 'm-5', memberName: 'Farhana Chowdhury', amount: 1200, month: '2026-06', date: '2026-06-15', paymentType: 'bank', lateFine: 50, receiptNo: 'REC-202606-004', status: 'paid', collectedBy: 'Treasurer' },
  { id: 'c-10', memberId: 'm-6', memberName: 'Mustafizur Rahman', amount: 2000, month: '2026-06', date: '2026-06-10', paymentType: 'cash', lateFine: 0, receiptNo: 'REC-202606-005', status: 'paid', collectedBy: 'Collector' },

  { id: 'c-11', memberId: 'm-1', memberName: 'Kabir Ahmed', amount: 1000, month: '2026-07', date: '2026-07-02', paymentType: 'cash', lateFine: 0, receiptNo: 'REC-202607-001', status: 'paid', collectedBy: 'Collector' },
  { id: 'c-12', memberId: 'm-2', memberName: 'Tasnim Jahan', amount: 1000, month: '2026-07', date: '2026-07-03', paymentType: 'bank', lateFine: 0, receiptNo: 'REC-202607-002', status: 'paid', collectedBy: 'Treasurer' },
  { id: 'c-13', memberId: 'm-4', memberName: 'Sajid Islam', amount: 1000, month: '2026-07', date: '2026-07-07', paymentType: 'cash', lateFine: 0, receiptNo: 'REC-202607-003', status: 'paid', collectedBy: 'Collector' },
  { id: 'c-14', memberId: 'm-6', memberName: 'Mustafizur Rahman', amount: 2000, month: '2026-07', date: '2026-07-05', paymentType: 'cash', lateFine: 0, receiptNo: 'REC-202607-004', status: 'paid', collectedBy: 'Collector' },
  { id: 'c-15', memberId: 'm-7', memberName: 'Nusrat Imrose', amount: 1000, month: '2026-07', date: '2026-07-08', paymentType: 'bank', lateFine: 0, receiptNo: 'REC-202607-005', status: 'paid', collectedBy: 'Treasurer' },
];

const initialInvestments: Investment[] = [
  { id: 'i-1', type: 'FDR', provider: 'BRAC Bank Ltd', principalAmount: 250000, interestRate: 8.5, startDate: '2025-06-01', maturityDate: '2026-06-01', status: 'closed', interestReceived: 21250, notes: 'FDR Matured & amount deposited back to bank' },
  { id: 'i-2', type: 'FDR', provider: 'City Bank Ltd', principalAmount: 500000, interestRate: 9.0, startDate: '2026-01-15', maturityDate: '2027-01-15', status: 'running', interestReceived: 22500, notes: 'Half-yearly interest paid recently' },
  { id: 'i-3', type: 'DPS', provider: 'Mutual Trust Bank', principalAmount: 120000, interestRate: 7.5, startDate: '2025-10-01', maturityDate: '2028-10-01', status: 'running', interestReceived: 0, notes: 'Monthly deposit 10,000 TK' },
  { id: 'i-4', type: 'Loan', provider: 'M/S Rahman Electronics', principalAmount: 300000, interestRate: 12.0, startDate: '2026-03-01', maturityDate: '2026-09-01', status: 'running', interestReceived: 18000, notes: 'Business Loan' },
  { id: 'i-5', type: 'Share Market', provider: 'LankaBangla Securities', principalAmount: 150000, interestRate: 15.0, startDate: '2026-05-10', maturityDate: '2027-05-10', status: 'running', interestReceived: 5000, notes: 'Stock investment in Blue Chips' },
];

const initialExpenses: Expense[] = [
  { id: 'e-1', category: 'Office Rent', amount: 15000, date: '2026-05-01', description: 'Office Rent for May 2026', paidBy: 'Treasurer' },
  { id: 'e-2', category: 'Staff Salary', amount: 12000, date: '2026-05-05', description: 'Salary for Office Assistant', paidBy: 'Treasurer' },
  { id: 'e-3', category: 'Utilities', amount: 3500, date: '2026-05-10', description: 'Electricity & Internet bills May', paidBy: 'Treasurer' },
  { id: 'e-4', category: 'Office Rent', amount: 15000, date: '2026-06-01', description: 'Office Rent for June 2026', paidBy: 'Treasurer' },
  { id: 'e-5', category: 'Staff Salary', amount: 12000, date: '2026-06-05', description: 'Salary for Office Assistant', paidBy: 'Treasurer' },
  { id: 'e-6', category: 'Utilities', amount: 4100, date: '2026-06-12', description: 'Electricity & Internet bills June', paidBy: 'Treasurer' },
  { id: 'e-7', category: 'Maintenance', amount: 2500, date: '2026-06-18', description: 'Office AC Servicing', paidBy: 'Treasurer' },
  { id: 'e-8', category: 'Office Rent', amount: 15000, date: '2026-07-01', description: 'Office Rent for July 2026', paidBy: 'Treasurer' },
  { id: 'e-9', category: 'Staff Salary', amount: 12000, date: '2026-07-05', description: 'Salary for Office Assistant', paidBy: 'Treasurer' },
  { id: 'e-10', category: 'Utilities', amount: 3800, date: '2026-07-10', description: 'Electricity & Internet bills July', paidBy: 'Treasurer' },
];

const initialTransactions: Transaction[] = [
  { id: 't-0', date: '2026-01-01', type: 'credit', account: 'bank', amount: 1000000, category: 'Other', referenceId: 'start', description: 'Foundation Capital Fund Opening Balance', balanceAfter: 1000000 },
  { id: 't-0b', date: '2026-01-01', type: 'credit', account: 'cash', amount: 50000, category: 'Other', referenceId: 'start', description: 'Cash In Hand Opening Balance', balanceAfter: 50000 },
  { id: 't-1', date: '2026-01-15', type: 'debit', account: 'bank', amount: 500000, category: 'Investment Deposit', referenceId: 'i-2', description: 'FDR Deposit City Bank Ltd', balanceAfter: 500000 },
  { id: 't-2', date: '2026-03-01', type: 'debit', account: 'bank', amount: 300000, category: 'Investment Deposit', referenceId: 'i-4', description: 'Business Loan Rahman Electronics', balanceAfter: 200000 },
  
  { id: 't-3', date: '2026-05-05', type: 'credit', account: 'cash', amount: 1000, category: 'Collection', referenceId: 'c-1', description: 'Monthly subscription Kabir Ahmed', balanceAfter: 51000 },
  { id: 't-4', date: '2026-05-06', type: 'credit', account: 'bank', amount: 1000, category: 'Collection', referenceId: 'c-2', description: 'Monthly subscription Tasnim Jahan', balanceAfter: 201000 },
  { id: 't-5', date: '2026-05-09', type: 'credit', account: 'bank', amount: 1200, category: 'Collection', referenceId: 'c-5', description: 'Monthly subscription Farhana Chowdhury', balanceAfter: 202200 },
  { id: 't-6', date: '2026-05-10', type: 'credit', account: 'cash', amount: 1000, category: 'Collection', referenceId: 'c-4', description: 'Monthly subscription Sajid Islam', balanceAfter: 52000 },
  { id: 't-7', date: '2026-05-12', type: 'credit', account: 'cash', amount: 1550, category: 'Collection', referenceId: 'c-3', description: 'Monthly subscription & fine Imran Khan', balanceAfter: 53550 },
  
  { id: 't-8', date: '2026-05-01', type: 'debit', account: 'cash', amount: 15000, category: 'Expense', referenceId: 'e-1', description: 'Office Rent May 2026', balanceAfter: 38550 },
  { id: 't-9', date: '2026-05-05', type: 'debit', account: 'cash', amount: 12000, category: 'Expense', referenceId: 'e-2', description: 'Salary for Office Assistant', balanceAfter: 26550 },
  { id: 't-10', date: '2026-05-10', type: 'debit', account: 'cash', amount: 3500, category: 'Expense', referenceId: 'e-3', description: 'Electricity & Internet bills May', balanceAfter: 23050 },

  { id: 't-11', date: '2026-06-01', type: 'credit', account: 'bank', amount: 250000, category: 'Investment Return', referenceId: 'i-1', description: 'Matured FDR Principal BRAC Bank', balanceAfter: 452200 },
  { id: 't-12', date: '2026-06-01', type: 'credit', account: 'bank', amount: 21250, category: 'Interest Income', referenceId: 'i-1', description: 'Matured FDR Interest BRAC Bank', balanceAfter: 473450 },

  { id: 't-13', date: '2026-06-01', type: 'debit', account: 'cash', amount: 15000, category: 'Expense', referenceId: 'e-4', description: 'Office Rent June 2026', balanceAfter: 8050 },
  { id: 't-14', date: '2026-06-03', type: 'credit', account: 'cash', amount: 1000, category: 'Collection', referenceId: 'c-6', description: 'Monthly subscription Kabir Ahmed', balanceAfter: 9050 },
  { id: 't-15', date: '2026-06-04', type: 'credit', account: 'bank', amount: 1000, category: 'Collection', referenceId: 'c-7', description: 'Monthly subscription Tasnim Jahan', balanceAfter: 474450 },
  { id: 't-16', date: '2026-06-05', type: 'debit', account: 'cash', amount: 12000, category: 'Expense', referenceId: 'e-5', description: 'Salary Office Assistant June', balanceAfter: -2950 },
  
  { id: 't-17', date: '2026-06-06', type: 'debit', account: 'bank', amount: 50000, category: 'Transfer', referenceId: 'transfer-1', description: 'Transferred bank funds to cash', balanceAfter: 424450 },
  { id: 't-18', date: '2026-06-06', type: 'credit', account: 'cash', amount: 50000, category: 'Transfer', referenceId: 'transfer-1', description: 'Transferred bank funds to cash', balanceAfter: 47050 },
  
  { id: 't-19', date: '2026-06-05', type: 'credit', account: 'cash', amount: 1500, category: 'Collection', referenceId: 'c-8', description: 'Monthly subscription Imran Khan', balanceAfter: 48550 },
  { id: 't-20', date: '2026-06-10', type: 'credit', account: 'cash', amount: 2000, category: 'Collection', referenceId: 'c-10', description: 'Monthly subscription Mustafizur Rahman', balanceAfter: 50550 },
  { id: 't-21', date: '2026-06-12', type: 'debit', account: 'cash', amount: 4100, category: 'Expense', referenceId: 'e-6', description: 'Electricity & Internet bills June', balanceAfter: 46450 },
  { id: 't-22', date: '2026-06-15', type: 'credit', account: 'bank', amount: 1250, category: 'Collection', referenceId: 'c-9', description: 'Monthly subscription & fine Farhana Chowdhury', balanceAfter: 425700 },
  { id: 't-23', date: '2026-06-18', type: 'debit', account: 'cash', amount: 2500, category: 'Expense', referenceId: 'e-7', description: 'Office AC Servicing', balanceAfter: 43950 },

  { id: 't-24', date: '2026-05-10', type: 'debit', account: 'bank', amount: 150000, category: 'Investment Deposit', referenceId: 'i-5', description: 'Share Market LankaBangla Securities', balanceAfter: 275700 },
  { id: 't-25', date: '2026-07-28', type: 'credit', account: 'bank', amount: 5000, category: 'Interest Income', referenceId: 'i-5', description: 'Dividend payout LankaBangla Securities', balanceAfter: 280700 },

  { id: 't-26', date: '2026-07-01', type: 'debit', account: 'cash', amount: 15000, category: 'Expense', referenceId: 'e-8', description: 'Office Rent July 2026', balanceAfter: 28950 },
  { id: 't-27', date: '2026-07-02', type: 'credit', account: 'cash', amount: 1000, category: 'Collection', referenceId: 'c-11', description: 'Monthly subscription Kabir Ahmed', balanceAfter: 29950 },
  { id: 't-28', date: '2026-07-03', type: 'credit', account: 'bank', amount: 1000, category: 'Collection', referenceId: 'c-12', description: 'Monthly subscription Tasnim Jahan', balanceAfter: 281700 },
  { id: 't-29', date: '2026-07-05', type: 'debit', account: 'cash', amount: 12000, category: 'Expense', referenceId: 'e-9', description: 'Salary Office Assistant July', balanceAfter: 17950 },
  { id: 't-30', date: '2026-07-05', type: 'credit', account: 'cash', amount: 2000, category: 'Collection', referenceId: 'c-14', description: 'Monthly subscription Mustafizur Rahman', balanceAfter: 19950 },
  { id: 't-31', date: '2026-07-07', type: 'credit', account: 'cash', amount: 1000, category: 'Collection', referenceId: 'c-13', description: 'Monthly subscription Sajid Islam', balanceAfter: 20950 },
  { id: 't-32', date: '2026-07-08', type: 'credit', account: 'bank', amount: 1000, category: 'Collection', referenceId: 'c-15', description: 'Monthly subscription Nusrat Imrose', balanceAfter: 282700 },
  { id: 't-33', date: '2026-07-10', type: 'debit', account: 'cash', amount: 3800, category: 'Expense', referenceId: 'e-10', description: 'Electricity & Internet bills July', balanceAfter: 17150 },
];

const initialAuditLogs: AuditLog[] = [
  { id: 'a-1', userId: 'u-1', userName: 'Super Admin', role: 'super_admin', action: 'System Initialization', date: '2026-01-01', time: '09:00:00', ipAddress: '192.168.1.100', device: 'Windows / Chrome' },
  { id: 'a-2', userId: 'u-3', userName: 'Treasurer Account', role: 'treasurer', action: 'Logged In', date: '2026-07-28', time: '10:15:30', ipAddress: '192.168.1.102', device: 'Windows / Chrome' },
  { id: 'a-3', userId: 'u-3', userName: 'Treasurer Account', role: 'treasurer', action: 'Approved FDR City Bank', date: '2026-01-15', time: '11:00:00', ipAddress: '192.168.1.102', device: 'Windows / Chrome' },
  { id: 'a-4', userId: 'u-4', userName: 'Collector Account', role: 'collector', action: 'Collected Monthly Fee - Kabir Ahmed', date: '2026-07-02', time: '14:22:15', ipAddress: '192.168.1.105', device: 'Android / Chrome' },
  { id: 'a-5', userId: 'u-2', userName: 'President Account', role: 'president', action: 'Viewed Ledger Reports', date: '2026-07-30', time: '16:45:00', ipAddress: '192.168.1.101', device: 'macOS / Safari' },
];

const initialNotifications: SystemNotification[] = [
  { id: 'n-1', userId: 'all', title: 'Upcoming FDR Maturity', message: 'FDR of 5,00,000 TK at City Bank Ltd will mature on 2027-01-15.', type: 'info', date: '2026-08-01', read: false },
  { id: 'n-2', userId: 'all', title: 'Low Cash Balance Alert', message: 'Office cash drawer is below 20,000 TK. Please transfer funds from Bank.', type: 'warning', date: '2026-07-10', read: true },
  { id: 'n-3', userId: 'all', title: 'Late Payment Fine Configuration', message: 'Fines have been configured. 50 TK applied after 10th of each month.', type: 'success', date: '2026-05-01', read: true },
  { id: 'n-4', userId: 'all', title: 'Maturity Alert: Loan Return Due', message: 'Business loan of 3,00,000 TK to Rahman Electronics matures in 30 days.', type: 'alert', date: '2026-08-02', read: false },
  { id: 'n-5', userId: 'all', title: 'Monthly Due Demand (2026-08)', message: 'Monthly subscription for August 2026 is due. Cutoff date: 2026-08-10.', type: 'warning', date: '2026-08-01', read: false, link: '/dues' },
  { id: 'n-6', userId: 'm-1', title: 'Payment Received (2026-07)', message: 'Tk 1000 deposited for 2026-07 via CASH. Receipt No: REC-202607-001.', type: 'success', date: '2026-07-02', read: false, link: '/members/profile' },
  { id: 'n-7', userId: 'm-2', title: 'Payment Received (2026-07)', message: 'Tk 1000 deposited for 2026-07 via BANK. Receipt No: REC-202607-002.', type: 'success', date: '2026-07-03', read: true, link: '/members/profile' },
];

const initialDocuments: DocumentFile[] = [
  { id: 'd-1', name: 'BRAC_Bank_FDR_Receipt.pdf', size: '1.2 MB', type: 'pdf', uploadedBy: 'Treasurer', uploadDate: '2025-06-02', category: 'Agreements', url: '#' },
  { id: 'd-2', name: 'Office_Rental_Agreement_2026.pdf', size: '2.4 MB', type: 'pdf', uploadedBy: 'President', uploadDate: '2026-01-05', category: 'Agreements', url: '#' },
  { id: 'd-3', name: 'Electricity_Bill_July_2026.jpg', size: '780 KB', type: 'image', uploadedBy: 'Collector', uploadDate: '2026-07-11', category: 'Receipts', url: '#' },
  { id: 'd-4', name: 'Bank_Statement_Q2_2026.xlsx', size: '450 KB', type: 'excel', uploadedBy: 'Treasurer', uploadDate: '2026-07-02', category: 'Bank Statements', url: '#' },
];

const initialUsers: User[] = [
  { id: 'u-1', name: 'Super Admin', email: 'admin@fdc.org', role: 'super_admin', phone: '+8801700000001', status: 'active', lastLogin: '2026-08-03 10:00 AM', password: 'password123' },
  { id: 'u-2', name: 'President Account', email: 'president@fdc.org', role: 'president', phone: '+8801700000002', status: 'active', lastLogin: '2026-08-02 04:30 PM', password: 'password123' },
  { id: 'u-3', name: 'Treasurer Account', email: 'treasurer@fdc.org', role: 'treasurer', phone: '+8801700000003', status: 'active', lastLogin: '2026-08-03 11:15 AM', password: 'password123' },
  { id: 'u-4', name: 'Collector Account', email: 'collector@fdc.org', role: 'collector', phone: '+8801700000004', status: 'active', lastLogin: '2026-08-03 08:45 AM', password: 'password123' },
  { id: 'u-5', name: 'Auditor Account', email: 'auditor@fdc.org', role: 'auditor', phone: '+8801700000005', status: 'active', lastLogin: '2026-07-31 02:10 PM', password: 'password123' },
  { id: 'u-6', name: 'Kabir Ahmed', email: 'kabir@fdc.org', role: 'member', phone: '+8801711223344', status: 'active', lastLogin: '2026-08-01 07:15 PM', password: 'password123', memberId: 'm-1' },
];

const initialDueDemands: DueDemand[] = [
  { id: 'dd-2026-05', month: '2026-05', title: 'Monthly Subscription Fee - May 2026', dueDate: '2026-05-10', amountType: 'member_fee', lateFine: 50, applicableTo: 'all', createdAt: '2026-05-01', createdBy: 'Super Admin' },
  { id: 'dd-2026-06', month: '2026-06', title: 'Monthly Subscription Fee - June 2026', dueDate: '2026-06-10', amountType: 'member_fee', lateFine: 50, applicableTo: 'all', createdAt: '2026-06-01', createdBy: 'Super Admin' },
  { id: 'dd-2026-07', month: '2026-07', title: 'Monthly Subscription Fee - July 2026', dueDate: '2026-07-10', amountType: 'member_fee', lateFine: 50, applicableTo: 'all', createdAt: '2026-07-01', createdBy: 'Super Admin' },
  { id: 'dd-2026-08', month: '2026-08', title: 'Monthly Subscription Fee - August 2026', dueDate: '2026-08-10', amountType: 'member_fee', lateFine: 50, applicableTo: 'all', createdAt: '2026-08-01', createdBy: 'Super Admin' },
  { id: 'dd-2026-09', month: '2026-09', title: 'Monthly Subscription Fee - September 2026', dueDate: '2026-09-10', amountType: 'member_fee', lateFine: 50, applicableTo: 'all', createdAt: '2026-09-01', createdBy: 'Super Admin' },
];

const isRealPhone = (phone?: string): boolean => {
  if (!phone) return false;
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (!cleaned || cleaned.length < 8) return false;
  if (/^0+$/.test(cleaned)) return false;
  if (/^0170{5,}/.test(cleaned)) return false;
  if (/^880170{5,}/.test(cleaned)) return false;
  return true;
};

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [investments, setInvestments] = useState<Investment[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [documents, setDocuments] = useState<DocumentFile[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [dueDemands, setDueDemands] = useState<DueDemand[]>(initialDueDemands);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [fineWaivers, setFineWaivers] = useState<FineWaiver[]>([]);
  const [trash, setTrash] = useState<TrashItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  // High-Performance Initialize from MongoDB (with instant LocalStorage hydration)
  useEffect(() => {
    // 1. Instant 0ms Hydration from LocalStorage on initial client mount
    if (typeof window !== 'undefined') {
      try {
        const readLocal = <T,>(key: string): T | null => {
          const val = localStorage.getItem(`fdc_${key}`);
          if (!val) return null;
          try { return JSON.parse(val) as T; } catch (e) { return null; }
        };

        const cachedMembers = readLocal<Member[]>('members');
        if (cachedMembers && cachedMembers.length > 0) setMembers(cachedMembers);

        const cachedUsers = readLocal<User[]>('users');
        if (cachedUsers && cachedUsers.length > 0) setUsers(cachedUsers);

        const cachedCols = readLocal<Collection[]>('collections');
        if (cachedCols) setCollections(cachedCols);

        const cachedDemands = readLocal<DueDemand[]>('due_demands');
        if (cachedDemands && cachedDemands.length > 0) setDueDemands(cachedDemands);

        const cachedLoans = readLocal<Loan[]>('loans');
        if (cachedLoans) setLoans(cachedLoans);

        const cachedExp = readLocal<Expense[]>('expenses');
        if (cachedExp) setExpenses(cachedExp);

        const cachedInv = readLocal<Investment[]>('investments');
        if (cachedInv) setInvestments(cachedInv);

        const cachedTx = readLocal<Transaction[]>('transactions');
        if (cachedTx) setTransactions(cachedTx);

        const cachedNotifs = readLocal<SystemNotification[]>('notifications');
        if (cachedNotifs) setNotifications(cachedNotifs);

        const cachedTrash = readLocal<TrashItem[]>('trash');
        if (cachedTrash) setTrash(cachedTrash);

        const cachedWaivers = readLocal<FineWaiver[]>('fine_waivers');
        if (cachedWaivers) setFineWaivers(cachedWaivers);
      } catch (e) {
        console.warn('Local cache hydration note:', e);
      }
    }

    const initDb = async () => {
      const collectionsToFetch = ['members', 'collections', 'investments', 'expenses', 'transactions', 'auditLogs', 'notifications', 'documents', 'users', 'permissions', 'due_demands', 'loans', 'fine_waivers', 'trash'];

      try {
        let dbStates: Record<string, any[]> = {};

        // Ultra-Fast Unified Bootstrap Request (1 single HTTP round-trip instead of 14 separate requests)
        try {
          const bootRes = await fetch('/api/db/bootstrap');
          if (bootRes.ok) {
            const bootData = await bootRes.json();
            if (bootData && typeof bootData === 'object' && Object.keys(bootData).length > 0) {
              dbStates = bootData;
            }
          }
        } catch (e) {
          console.warn('Bootstrap fetch fallback to parallel calls:', e);
        }

        // Fallback to parallel fetches only if bootstrap did not return all data
        if (Object.keys(dbStates).length === 0) {
          const fetches = collectionsToFetch.map(async (name) => {
            try {
              const res = await fetch(`/api/db/${name}`);
              if (res.ok) {
                const data = await res.json();
                return { name, data: Array.isArray(data) ? data : [] };
              }
            } catch (e) {}

            if (typeof window !== 'undefined') {
              const stored = localStorage.getItem(`fdc_${name}`);
              if (stored) {
                try {
                  const parsed = JSON.parse(stored);
                  if (Array.isArray(parsed)) return { name, data: parsed };
                } catch (e) {}
              }
            }
            return { name, data: [] };
          });

          const results = await Promise.all(fetches);
          for (const { name, data } of results) {
            dbStates[name] = data;
          }
        }

        let loadedMembers = dbStates['members'] || [];
        let loadedUsers = dbStates['users'] || [];

        if (loadedMembers.length === 0) loadedMembers = initialMembers;
        if (loadedUsers.length === 0) loadedUsers = initialUsers;

        // Ensure every member has memberId linked to user account
        loadedUsers.forEach(u => {
          if (u.role === 'member') {
            const m = loadedMembers.find(rec => 
              (u.memberId && rec.id === u.memberId) ||
              (u.id && (rec.id === u.id || rec.id === u.id.replace('u-', 'm-'))) ||
              (u.name && rec.name && rec.name.trim().toLowerCase() === u.name.trim().toLowerCase()) ||
              (rec.email && u.email && rec.email.toLowerCase() === u.email.toLowerCase()) ||
              (isRealPhone(u.phone) && rec.phone === u.phone)
            );
            if (m) {
              u.memberId = m.id;
            }
          }
        });

        setMembers(loadedMembers);
        setUsers(loadedUsers);
        setCollections(dbStates['collections'] || []);
        setInvestments(dbStates['investments'] || []);
        setExpenses(dbStates['expenses'] || []);
        setTransactions(dbStates['transactions'] || []);
        setAuditLogs(dbStates['auditLogs'] || []);
        setNotifications(dbStates['notifications'] || []);
        setDocuments(dbStates['documents'] || []);
        setLoans(dbStates['loans'] || []);
        setFineWaivers(dbStates['fine_waivers'] || []);
        setTrash(dbStates['trash'] || []);

        const loadedDueDemands = dbStates['due_demands'] || [];
        setDueDemands(loadedDueDemands.length > 0 ? loadedDueDemands : initialDueDemands);

        // Sync to LocalStorage
        Object.keys(dbStates).forEach(key => {
          localStorage.setItem(`fdc_${key}`, JSON.stringify(dbStates[key]));
        });
        localStorage.setItem('fdc_members', JSON.stringify(loadedMembers));
        localStorage.setItem('fdc_users', JSON.stringify(loadedUsers));
      } catch (err) {
        console.warn('MongoDB connection failed. Using local storage fallback.', err);
        const loadLocal = <T,>(key: string, initial: T): T => {
          const stored = localStorage.getItem(`fdc_${key}`);
          if (stored) {
            try { return JSON.parse(stored) as T; } catch (e) {}
          }
          return initial;
        };

        // Fallback to empty arrays so deleted items never resurrect
        setMembers(loadLocal('members', []));
        setCollections(loadLocal('collections', []));
        setInvestments(loadLocal('investments', []));
        setExpenses(loadLocal('expenses', []));
        setTransactions(loadLocal('transactions', []));
        setAuditLogs(loadLocal('auditLogs', []));
        setNotifications(loadLocal('notifications', []));
        setDocuments(loadLocal('documents', []));
        setUsers(loadLocal('users', initialUsers));
        setDueDemands(loadLocal('due_demands', initialDueDemands));
        setLoans(loadLocal('loans', []));
        setFineWaivers(loadLocal('fine_waivers', []));
        setTrash(loadLocal('trash', []));
      } finally {
        setLoaded(true);
      }
    };

    if (typeof window !== 'undefined') {
      initDb();

      // Real-time synchronization:
      // 1. When user switches back to the app / unlocks phone
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible') {
          initDb();
        }
      };

      // 2. When internet connection is restored
      const handleOnline = () => {
        initDb();
      };

      // 3. Periodic background sync every 15 seconds
      const pollInterval = setInterval(() => {
        if (document.visibilityState === 'visible') {
          initDb();
        }
      }, 15000);

      window.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleVisibilityChange);
      window.addEventListener('online', handleOnline);

      return () => {
        clearInterval(pollInterval);
        window.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleVisibilityChange);
        window.removeEventListener('online', handleOnline);
      };
    }
  }, []);

  // Sync state to local storage & backend database
  const syncToDbAndLocal = async (name: string, updatedData: any[], actionType: 'create' | 'update' | 'delete' | 'sync', itemOrQuery?: any) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`fdc_${name}`, JSON.stringify(updatedData));
    }

    try {
      if (actionType === 'create') {
        await fetch(`/api/db/${name}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(itemOrQuery)
        });
      } else if (actionType === 'update') {
        const { filter, update } = itemOrQuery;
        await fetch(`/api/db/${name}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter, update })
        });
      } else if (actionType === 'delete') {
        await fetch(`/api/db/${name}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter: itemOrQuery })
        });
      } else {
        // Full overwrite sync
        await fetch(`/api/db/${name}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter: {} })
        });
        if (updatedData.length > 0) {
          await fetch(`/api/db/${name}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
          });
        }
      }
    } catch (err) {
      console.error(`MongoDB sync error for ${name}`, err);
    }
  };

  // Helper to add ledger transactions
  const recordTransaction = (
    type: 'credit' | 'debit',
    account: 'cash' | 'bank' | 'investment',
    amount: number,
    category: Transaction['category'],
    referenceId: string,
    description: string,
    currentTransactionsList?: Transaction[]
  ) => {
    const list = currentTransactionsList || transactions;
    
    // Calculate last balances
    const cashBalance = list.filter(t => t.account === 'cash').reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
    const bankBalance = list.filter(t => t.account === 'bank').reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
    const investmentBalance = list.filter(t => t.account === 'investment').reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);

    let balanceAfter = 0;
    if (account === 'cash') {
      balanceAfter = cashBalance + (type === 'credit' ? amount : -amount);
    } else if (account === 'bank') {
      balanceAfter = bankBalance + (type === 'credit' ? amount : -amount);
    } else {
      balanceAfter = investmentBalance + (type === 'credit' ? amount : -amount);
    }

    const newTx: Transaction = {
      id: `t-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString().split('T')[0],
      type,
      account,
      amount,
      category,
      referenceId,
      description,
      balanceAfter,
    };

    const updatedTx = [...list, newTx];
    setTransactions(updatedTx);
    syncToDbAndLocal('transactions', updatedTx, 'create', newTx);
  };

  // ---------------- MEMBERS ACTIONS ----------------
  const addMember = (memberData: Omit<Member, 'id'>) => {
    const newMember: Member = {
      ...memberData,
      id: `m-${Date.now()}`,
    };
    const updated = [newMember, ...members];
    setMembers(updated);
    syncToDbAndLocal('members', updated, 'create', newMember);
    
    // Auto Link or Create Member Login User Profile
    const existingUser = users.find(u => 
      (newMember.email && u.email && u.email.toLowerCase() === newMember.email.toLowerCase()) ||
      (newMember.phone && u.phone && u.phone === newMember.phone)
    );

    let updatedUsers = users;
    if (existingUser) {
      updatedUsers = users.map(u => u.id === existingUser.id ? { ...u, memberId: newMember.id, name: newMember.name } : u);
      setUsers(updatedUsers);
      syncToDbAndLocal('users', updatedUsers, 'update', { filter: { id: existingUser.id }, update: { memberId: newMember.id, name: newMember.name } });
    } else {
      const newUser: User = {
        id: `u-${Date.now()}`,
        name: newMember.name,
        email: newMember.email,
        role: 'member',
        phone: newMember.phone,
        status: 'active',
        password: 'password123',
        memberId: newMember.id
      };
      updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      syncToDbAndLocal('users', updatedUsers, 'create', newUser);
    }

    addAuditLog(`Created Member Profile & User Account: ${newMember.name}`, 'super_admin', 'System Log');
    return newMember;
  };

  const importMembers = async (membersList: Omit<Member, 'id'>[]): Promise<Member[]> => {
    const timestamp = Date.now();
    const newMembers: Member[] = membersList.map((m, idx) => ({
      ...m,
      id: `m-${timestamp}-${idx}`,
    }));

    const newUsers: User[] = newMembers.map((m, idx) => ({
      id: `u-${timestamp}-${idx}`,
      name: m.name,
      email: m.email,
      role: 'member' as const,
      phone: m.phone,
      status: 'active' as const,
      password: 'password123',
      memberId: m.id  // Link to member record
    }));

    const updatedMembers = [...newMembers, ...members];
    const updatedUsers = [...users, ...newUsers];

    setMembers(updatedMembers);
    setUsers(updatedUsers);

    await syncToDbAndLocal('members', updatedMembers, 'create', newMembers);
    await syncToDbAndLocal('users', updatedUsers, 'create', newUsers);

    addAuditLog(`Bulk Imported ${newMembers.length} Members via Excel`, 'super_admin', 'System Log');
    return newMembers;
  };

  const updateMemberPhoto = (id: string, photoUrl: string) => {
    const exists = members.some(m => m.id === id);
    let updated: Member[];
    if (exists) {
      updated = members.map(m => m.id === id ? { ...m, photoUrl } : m);
    } else {
      const newM: Member = {
        id,
        name: 'Member',
        email: '',
        phone: '',
        status: 'active',
        joinDate: new Date().toISOString().split('T')[0],
        monthlyFee: 1000,
        nomineeName: '',
        nomineeRelation: '',
        nomineePhone: '',
        photoUrl
      };
      updated = [newM, ...members];
    }
    setMembers(updated);
    const matched = updated.find(m => m.id === id);
    syncToDbAndLocal('members', updated, exists ? 'update' : 'create', exists ? { filter: { id }, update: { photoUrl } } : matched);

    if (matched && matched.email) {
      const updatedUsers = users.map(u => 
        (u.memberId === id || u.email?.toLowerCase() === matched.email.toLowerCase() || u.id === id.replace('m-', 'u-')) 
          ? { ...u, avatar: photoUrl } 
          : u
      );
      setUsers(updatedUsers);
      syncToDbAndLocal('users', updatedUsers, 'update', { filter: { email: matched.email }, update: { avatar: photoUrl } });
    }
    addAuditLog(`Updated Profile Photo for ID: ${id}`, 'member', matched?.name || id);
  };

  const updateMember = (id: string, updatedFields: Partial<Member>) => {
    const exists = members.some(m => m.id === id);
    let updated: Member[];
    if (exists) {
      updated = members.map(m => m.id === id ? { ...m, ...updatedFields } : m);
    } else {
      const newM: Member = {
        id,
        name: updatedFields.name || 'Member',
        email: updatedFields.email || '',
        phone: updatedFields.phone || '',
        status: updatedFields.status || 'active',
        joinDate: new Date().toISOString().split('T')[0],
        monthlyFee: updatedFields.monthlyFee || 1000,
        nomineeName: updatedFields.nomineeName || '',
        nomineeRelation: updatedFields.nomineeRelation || '',
        nomineePhone: updatedFields.nomineePhone || '',
        ...updatedFields
      };
      updated = [newM, ...members];
    }
    setMembers(updated);
    const matched = updated.find(m => m.id === id);
    syncToDbAndLocal('members', updated, exists ? 'update' : 'create', exists ? { filter: { id }, update: matched } : matched);
    addAuditLog(`Updated Member Information: ID ${id} (${matched?.name})`, 'member', matched?.name || id);

    // Sync updated name, phone, email to linked user account
    if (matched) {
      const updatedUsers = users.map(u => {
        if (u.memberId === id || u.id === id.replace('m-', 'u-') || (matched.email && u.email?.toLowerCase() === matched.email.toLowerCase())) {
          return {
            ...u,
            name: matched.name || u.name,
            phone: matched.phone || u.phone,
            email: matched.email || u.email
          };
        }
        return u;
      });
      setUsers(updatedUsers);
      const matchedUser = updatedUsers.find(u => u.memberId === id || u.id === id.replace('m-', 'u-') || (matched.email && u.email?.toLowerCase() === matched.email.toLowerCase()));
      if (matchedUser) {
        syncToDbAndLocal('users', updatedUsers, 'update', { filter: { id: matchedUser.id }, update: matchedUser });
      }
    }
  };

  const deleteMember = (id: string, permanent: boolean = false) => {
    const member = members.find(m => m.id === id);
    if (!member) return;
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);

    if (permanent) {
      syncToDbAndLocal('members', updated, 'delete', { id });
      addAuditLog(`Permanently Deleted Member Profile: ${member.name}`, 'super_admin', 'System Log');
    } else {
      syncToDbAndLocal('members', updated, 'delete', { id });
      const trashItem: TrashItem = {
        id: `trash-${Date.now()}-${id}`,
        originalId: id,
        entityType: 'member',
        title: member.name,
        subtitle: `${member.id} • ${member.phone}`,
        amount: member.monthlyFee,
        data: member,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Admin'
      };
      const updatedTrash = [trashItem, ...trash];
      setTrash(updatedTrash);
      syncToDbAndLocal('trash', updatedTrash, 'create', trashItem);
      addAuditLog(`Moved Member Profile to Trash: ${member.name}`, 'super_admin', 'System Log');
    }
  };

  // ---------------- COLLECTIONS ACTIONS ----------------
  const addCollection = (collData: Omit<Collection, 'id' | 'receiptNo' | 'date' | 'status'> & { date?: string; status?: 'paid' | 'pending'; transactionRef?: string; notes?: string }) => {
    const today = new Date().toISOString().split('T')[0];
    const status = collData.status || 'paid';
    const newColl: Collection = {
      ...collData,
      id: `c-${Date.now()}`,
      date: collData.date || today,
      receiptNo: `REC-${collData.month.replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
      status,
      submittedAt: new Date().toISOString()
    };
    const updated = [newColl, ...collections];
    setCollections(updated);
    syncToDbAndLocal('collections', updated, 'create', newColl);

    if (status === 'paid') {
      // Record Ledger Entry only if already verified paid
      const account = (collData.paymentType === 'cash') ? 'cash' : 'bank';
      recordTransaction(
        'credit',
        account,
        collData.amount + (collData.lateFine || 0),
        'Collection',
        newColl.id,
        `Monthly collection for ${collData.memberName} (${collData.month})`
      );

      addAuditLog(`Recorded Collection: ${newColl.amount} TK for ${newColl.memberName}`, 'treasurer', 'System Log');
      
      // Auto-dispatch confirmation notification to member profile
      addNotification({
        userId: newColl.memberId,
        title: `💰 চাঁদা জমা গৃহীত (${newColl.month})`,
        message: `${newColl.memberName}, আপনার ${newColl.month} মাসের ৳${newColl.amount + (newColl.lateFine || 0)} চাঁদা সফলভাবে জমা হয়েছে। রশিদ নং: ${newColl.receiptNo}।`,
        type: 'success',
        link: '/members/profile'
      });
    } else {
      // Status is 'pending' - Member submitted payment awaiting Admin approval
      addAuditLog(`Member Payment Submitted (Pending Approval): ${newColl.amount} TK for ${newColl.memberName} (${newColl.month})`, 'member', newColl.memberName);

      // Notification to Admins / Collectors
      addNotification({
        userId: 'all',
        title: `📝 নতুন পেমেন্ট জমা (${newColl.memberName})`,
        message: `${newColl.memberName} ${newColl.month} মাসের ৳${newColl.amount + (newColl.lateFine || 0)} চাঁদা জমা দিয়েছেন (${newColl.paymentType.toUpperCase()})। রশিদ/ট্রানজ্যাকশন যাচাই করে অনুমোদন করুন।`,
        type: 'warning',
        link: '/collections'
      });

      // Notification to Member
      addNotification({
        userId: newColl.memberId,
        title: `⏳ পেমেন্ট সাবমিট হয়েছে (${newColl.month})`,
        message: `আপনার ${newColl.month} মাসের ৳${newColl.amount + (newColl.lateFine || 0)} জমা তথ্য গৃহীত হয়েছে। অ্যাডমিন অনুমোদনের পর বকেয়া পরিশোধ সম্পন্ন হবে।`,
        type: 'warning',
        link: '/members/profile'
      });
    }

    return newColl;
  };

  const approveCollection = async (id: string, approvedByAdminName?: string): Promise<boolean> => {
    const col = collections.find(c => c.id === id);
    if (!col) return false;

    const approvedAt = new Date().toISOString();
    const approvedBy = approvedByAdminName || 'Admin';

    const updatedCol: Collection = {
      ...col,
      status: 'paid',
      approvedBy,
      approvedAt
    };

    const updatedCollections = collections.map(c => c.id === id ? updatedCol : c);
    setCollections(updatedCollections);
    await syncToDbAndLocal('collections', updatedCollections, 'update', { filter: { id }, update: updatedCol });

    // Record Ledger Entry now that the payment is approved
    const totalAmt = updatedCol.amount + (updatedCol.lateFine || 0);
    const account = (updatedCol.paymentType === 'cash') ? 'cash' : 'bank';
    recordTransaction(
      'credit',
      account,
      totalAmt,
      'Collection',
      updatedCol.id,
      `Monthly collection for ${updatedCol.memberName} (${updatedCol.month}) [Approved by ${approvedBy}]`
    );

    addAuditLog(`Approved Member Payment: ${updatedCol.amount} TK for ${updatedCol.memberName} (${updatedCol.month})`, 'super_admin', approvedBy);

    // Notify member that payment has been approved and dues are cleared
    await addNotification({
      userId: updatedCol.memberId,
      title: `✅ পেমেন্ট অনুমোদিত (${updatedCol.month})`,
      message: `আপনার ${updatedCol.month} মাসের ৳${totalAmt} পেমেন্ট ${approvedBy} কর্তৃক অনুমোদিত হয়েছে। রশিদ নং: ${updatedCol.receiptNo}। বকেয়া ক্লিয়ার!`,
      type: 'success',
      link: '/members/profile'
    });

    return true;
  };

  const rejectCollection = async (id: string, reason?: string): Promise<boolean> => {
    const col = collections.find(c => c.id === id);
    if (!col) return false;

    const updatedCol: Collection = {
      ...col,
      status: 'rejected',
      notes: reason ? `${col.notes ? col.notes + ' | ' : ''}Rejected: ${reason}` : col.notes
    };

    const updatedCollections = collections.map(c => c.id === id ? updatedCol : c);
    setCollections(updatedCollections);
    await syncToDbAndLocal('collections', updatedCollections, 'update', { filter: { id }, update: updatedCol });

    addAuditLog(`Rejected Member Payment Submission: ${col.amount} TK for ${col.memberName} (${col.month})`, 'super_admin', 'Admin');

    await addNotification({
      userId: col.memberId,
      title: `❌ পেমেন্ট বাতিল করা হয়েছে (${col.month})`,
      message: `আপনার ${col.month} মাসের ৳${col.amount + (col.lateFine || 0)} পেমেন্ট অনুমোদন করা হয়নি।${reason ? ' কারণ: ' + reason : ''} প্রয়োজনে অ্যাডমিনের সাথে যোগাযোগ করুন।`,
      type: 'alert',
      link: '/members/profile'
    });

    return true;
  };

  const importCollections = async (collectionsList: Omit<Collection, 'id' | 'receiptNo' | 'date'>[]): Promise<Collection[]> => {
    const timestamp = Date.now();
    const today = new Date().toISOString().split('T')[0];

    const newCollections: Collection[] = collectionsList.map((c, idx) => ({
      ...c,
      id: `c-${timestamp}-${idx}`,
      date: (c as any).date || today,
      receiptNo: `REC-${c.month.replace('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`,
      status: 'paid'
    }));

    const updatedCollections = [...newCollections, ...collections];
    setCollections(updatedCollections);
    await syncToDbAndLocal('collections', updatedCollections, 'create', newCollections);

    // Record matching ledger transactions for each imported collection
    let currentTxs = [...transactions];
    for (const c of newCollections) {
      const cashBal = currentTxs.filter(t => t.account === 'cash').reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
      const bankBal = currentTxs.filter(t => t.account === 'bank').reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
      const totalAmt = c.amount + c.lateFine;
      const balanceAfter = c.paymentType === 'cash' ? (cashBal + totalAmt) : (bankBal + totalAmt);

      const tx: Transaction = {
        id: `t-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        date: c.date,
        type: 'credit',
        account: c.paymentType === 'cash' ? 'cash' : 'bank',
        amount: totalAmt,
        category: 'Collection',
        referenceId: c.id,
        description: `Imported Monthly collection for ${c.memberName} (${c.month})`,
        balanceAfter
      };
      currentTxs.push(tx);
    }
    setTransactions(currentTxs);
    await syncToDbAndLocal('transactions', currentTxs, 'sync');

    addAuditLog(`Bulk Imported ${newCollections.length} Collections via Excel`, 'treasurer', 'System Log');
    return newCollections;
  };

  const deleteCollection = (id: string, permanent: boolean = false) => {
    const col = collections.find(c => c.id === id);
    if (!col) return;
    const updated = collections.filter(c => c.id !== id);
    setCollections(updated);

    // Record Reversal Transaction
    recordTransaction(
      'debit',
      col.paymentType === 'cash' ? 'cash' : 'bank',
      col.amount + (col.lateFine || 0),
      'Other',
      id,
      `REVERSAL: Deleted collection ID ${id} for ${col.memberName}`
    );

    if (permanent) {
      syncToDbAndLocal('collections', updated, 'delete', { id });
      addAuditLog(`Permanently Deleted Collection Receipt: ${col.receiptNo}`, 'treasurer', 'System Log');
    } else {
      syncToDbAndLocal('collections', updated, 'delete', { id });
      const trashItem: TrashItem = {
        id: `trash-${Date.now()}-${id}`,
        originalId: id,
        entityType: 'collection',
        title: `Receipt ${col.receiptNo} (${col.memberName})`,
        subtitle: `${col.month} • ${col.paymentType.toUpperCase()}`,
        amount: col.amount + (col.lateFine || 0),
        data: col,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Treasurer'
      };
      const updatedTrash = [trashItem, ...trash];
      setTrash(updatedTrash);
      syncToDbAndLocal('trash', updatedTrash, 'create', trashItem);
      addAuditLog(`Moved Collection to Trash: ${col.receiptNo}`, 'treasurer', 'System Log');
    }
  };

  // ---------------- DUE DEMANDS ACTIONS ----------------
  const addDueDemand = async (demandData: Omit<DueDemand, 'id' | 'createdAt'>): Promise<DueDemand> => {
    const newDemand: DueDemand = {
      ...demandData,
      id: `dd-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [newDemand, ...dueDemands.filter(d => d.month !== newDemand.month || d.applicableTo !== newDemand.applicableTo)];
    setDueDemands(updated);
    await syncToDbAndLocal('due_demands', updated, 'create', newDemand);
    addAuditLog(`Generated Due Demand for ${newDemand.month}: ${newDemand.title}`, 'super_admin', 'System Log');
    
    // Auto-dispatch notification for monthly due demand
    addNotification({
      userId: 'all',
      title: `📋 নতুন মাসিক চাঁদা ধার্য (${newDemand.month})`,
      message: `${newDemand.title} - চাঁদা জমা দেওয়ার শেষ সময়: ${newDemand.dueDate}। সময়মতো পরিশোধের অনুরোধ করা হচ্ছে।`,
      type: 'warning',
      link: '/dues'
    });

    return newDemand;
  };

  const deleteDueDemand = async (id: string, permanent: boolean = false): Promise<void> => {
    const demandToDelete = dueDemands.find(d => d.id === id);
    if (!demandToDelete) return;
    const updated = dueDemands.filter(d => d.id !== id);
    setDueDemands(updated);

    if (permanent) {
      await syncToDbAndLocal('due_demands', updated, 'delete', { id });
      addAuditLog(`Permanently Deleted Due Demand for ${demandToDelete.month}`, 'super_admin', 'System Log');
    } else {
      await syncToDbAndLocal('due_demands', updated, 'delete', { id });
      const trashItem: TrashItem = {
        id: `trash-${Date.now()}-${id}`,
        originalId: id,
        entityType: 'due_demand',
        title: `Due Demand: ${demandToDelete.month}`,
        subtitle: demandToDelete.title,
        amount: demandToDelete.fixedAmount,
        data: demandToDelete,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Admin'
      };
      const updatedTrash = [trashItem, ...trash];
      setTrash(updatedTrash);
      await syncToDbAndLocal('trash', updatedTrash, 'create', trashItem);
      addAuditLog(`Moved Due Demand to Trash: ${demandToDelete.month}`, 'super_admin', 'System Log');
    }
  };

  const waiveFine = async (memberId: string, month: string, reason?: string): Promise<boolean> => {
    const existing = fineWaivers.find(w => w.memberId === memberId && w.month === month);
    if (existing) return true;

    const newWaiver: FineWaiver = {
      id: `fw-${Date.now()}`,
      memberId,
      month,
      waivedBy: 'Admin',
      waivedAt: new Date().toISOString(),
      reason: reason || 'কমিটির সিদ্ধান্তক্রমে জরিমানা মওকুফ'
    };

    const updated = [newWaiver, ...fineWaivers];
    setFineWaivers(updated);
    await syncToDbAndLocal('fine_waivers', updated, 'create', newWaiver);

    const m = members.find(mem => mem.id === memberId);
    addAuditLog(`Waived Late Fine for ${m?.name || memberId} (${month})`, 'super_admin', 'Admin');

    // Notify member
    addNotification({
      userId: memberId,
      title: `🎁 জরিমানা মওকুফ (${month})`,
      message: `আপনার ${month} মাসের চাঁদার বিলম্ব জরিমানা মওকুফ করা হয়েছে। নির্ধারিত ফি পরিশোধ করতে পারেন।`,
      type: 'info',
      link: '/dues',
      category: 'due'
    });

    return true;
  };

  const removeFineWaiver = async (memberId: string, month: string): Promise<boolean> => {
    const targetWaiver = fineWaivers.find(w => w.memberId === memberId && w.month === month);
    const updated = fineWaivers.filter(w => !(w.memberId === memberId && w.month === month));
    setFineWaivers(updated);
    if (targetWaiver) {
      await syncToDbAndLocal('fine_waivers', updated, 'delete', { id: targetWaiver.id });
    }
    return true;
  };

  const importPreviousDues = async (
    rawDues: { memberId?: string; memberName?: string; phone?: string; month: string; amount?: number; lateFine?: number; notes?: string }[]
  ): Promise<number> => {
    if (!rawDues || rawDues.length === 0) return 0;

    let updatedDemands = [...dueDemands];
    let updatedCollections = [...collections];
    let importedCount = 0;

    const cleanPhone = (p?: string) => (p || '').replace(/[^0-9]/g, '');

    interface IdentifiedDue {
      member: Member;
      month: string;
      amount: number;
      lateFine: number;
      notes: string;
    }
    const identifiedList: IdentifiedDue[] = [];

    for (const row of rawDues) {
      const rowId = (row.memberId || '').trim();
      const rowPhone = cleanPhone(row.phone);
      const rowName = (row.memberName || '').trim().toLowerCase();

      const matchedMember = members.find(m => {
        if (rowId && (m.id.toLowerCase() === rowId.toLowerCase() || m.id.toLowerCase() === `m-${rowId.toLowerCase()}`)) return true;
        if (rowPhone && rowPhone.length >= 8 && cleanPhone(m.phone).includes(rowPhone.slice(-8))) return true;
        if (rowName && m.name.toLowerCase() === rowName) return true;
        return false;
      });

      if (!matchedMember) {
        console.warn('Could not match member for previous due row:', row);
        continue;
      }

      let rawMonth = (row.month || '').trim();
      let formattedMonth = rawMonth;
      if (/^\d{4}-\d{2}$/.test(rawMonth)) {
        formattedMonth = rawMonth;
      } else if (/^\d{4}\/\d{2}$/.test(rawMonth)) {
        formattedMonth = rawMonth.replace('/', '-');
      } else if (/^\d{4}\.\d{2}$/.test(rawMonth)) {
        formattedMonth = rawMonth.replace('.', '-');
      } else {
        const d = new Date(rawMonth);
        if (!isNaN(d.getTime())) {
          formattedMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        }
      }

      if (!/^\d{4}-\d{2}$/.test(formattedMonth)) {
        console.warn('Invalid month format for row:', row);
        continue;
      }

      const amount = Number(row.amount) || matchedMember.monthlyFee || 1000;
      const lateFine = Number(row.lateFine) || 0;
      const notes = (row.notes || '').trim() || 'পূর্বের বকেয়া চাঁদা (Previous Due Import)';

      identifiedList.push({
        member: matchedMember,
        month: formattedMonth,
        amount,
        lateFine,
        notes
      });
    }

    if (identifiedList.length === 0) {
      throw new Error('কোনো সদস্যের সাথে এক্সেল ডাটা মেলানো যায়নি। Member ID, Phone অথবা Name সঠিকভাবে দিন।');
    }

    const monthsSet = Array.from(new Set(identifiedList.map(item => item.month)));

    for (const mStr of monthsSet) {
      let existingDemand = updatedDemands.find(d => d.month === mStr);
      if (!existingDemand) {
        existingDemand = {
          id: `dd-${Date.now()}-${mStr}`,
          month: mStr,
          title: `Monthly Subscription Fee - ${mStr}`,
          dueDate: `${mStr}-10`,
          amountType: 'member_fee',
          lateFine: 50,
          applicableTo: 'all',
          createdAt: new Date().toISOString().split('T')[0],
          createdBy: 'Excel Due Import'
        };
        updatedDemands = [existingDemand, ...updatedDemands];
      }

      const dueItemsForMonth = identifiedList.filter(item => item.month === mStr);
      const dueMemberIds = new Set(dueItemsForMonth.map(item => item.member.id));

      const otherMembers = members.filter(m => m.status === 'active' && !dueMemberIds.has(m.id));
      for (const otherM of otherMembers) {
        const alreadyHasRecord = updatedCollections.some(c => c.memberId === otherM.id && c.month === mStr);
        if (!alreadyHasRecord) {
          const baselineColl: Collection = {
            id: `c-prev-paid-${Date.now()}-${otherM.id}-${mStr}`,
            memberId: otherM.id,
            memberName: otherM.name,
            amount: otherM.monthlyFee || 1000,
            month: mStr,
            date: `${mStr}-05`,
            paymentType: 'cash',
            lateFine: 0,
            receiptNo: `REC-PREV-${mStr.replace('-', '')}-${otherM.id.replace(/[^0-9]/g, '').slice(-4) || '1000'}`,
            status: 'paid',
            collectedBy: 'Previously Settled',
            notes: 'সফটওয়্যার চালুর পূর্বের পরিশোধিত চাঁদা (Opening Record)'
          };
          updatedCollections = [baselineColl, ...updatedCollections];
        }
      }

      for (const dueItem of dueItemsForMonth) {
        updatedCollections = updatedCollections.filter(
          c => !(c.memberId === dueItem.member.id && c.month === mStr && c.status === 'paid')
        );
        importedCount++;
      }
    }

    setDueDemands(updatedDemands);
    setCollections(updatedCollections);

    await syncToDbAndLocal('due_demands', updatedDemands, 'create', updatedDemands);
    await syncToDbAndLocal('collections', updatedCollections, 'create', updatedCollections);

    addAuditLog(`Imported ${importedCount} Previous Dues records across ${monthsSet.length} months via Excel`, 'super_admin', 'Admin');

    return importedCount;
  };

  // ---------------- INVESTMENTS ACTIONS ----------------
  const addInvestment = (invData: Omit<Investment, 'id' | 'status' | 'interestReceived'>) => {
    const newInv: Investment = {
      ...invData,
      id: `i-${Date.now()}`,
      status: 'running',
      interestReceived: 0,
    };
    const updated = [newInv, ...investments];
    setInvestments(updated);
    syncToDbAndLocal('investments', updated, 'create', newInv);

    // Record Ledger Entry
    recordTransaction(
      'debit',
      'bank', // All investments made via Bank Book
      invData.principalAmount,
      'Investment Deposit',
      newInv.id,
      `Investment in ${invData.type} with ${invData.provider}`
    );

    addAuditLog(`Opened Investment: ${newInv.type} - ${newInv.principalAmount} TK with ${newInv.provider}`, 'treasurer', 'System Log');
    return newInv;
  };

  const importInvestments = async (investmentsList: Omit<Investment, 'id' | 'status' | 'interestReceived'>[]): Promise<Investment[]> => {
    const timestamp = Date.now();
    const newInvestments: Investment[] = investmentsList.map((inv, idx) => ({
      ...inv,
      id: `i-${timestamp}-${idx}`,
      status: 'running',
      interestReceived: 0,
    }));

    const updatedInvestments = [...newInvestments, ...investments];
    setInvestments(updatedInvestments);
    await syncToDbAndLocal('investments', updatedInvestments, 'create', newInvestments);

    // Record matching debit transactions
    let currentTxs = [...transactions];
    for (const inv of newInvestments) {
      const bankBal = currentTxs.filter(t => t.account === 'bank').reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
      const balanceAfter = bankBal - inv.principalAmount;

      const tx: Transaction = {
        id: `t-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
        date: inv.startDate || new Date().toISOString().split('T')[0],
        type: 'debit',
        account: 'bank',
        amount: inv.principalAmount,
        category: 'Investment Deposit',
        referenceId: inv.id,
        description: `Imported Investment in ${inv.type} with ${inv.provider}`,
        balanceAfter
      };
      currentTxs.push(tx);
    }
    setTransactions(currentTxs);
    await syncToDbAndLocal('transactions', currentTxs, 'sync');

    addAuditLog(`Bulk Imported ${newInvestments.length} Investments via Excel`, 'treasurer', 'System Log');
    return newInvestments;
  };

  const receiveInterest = (id: string, interestAmount: number) => {
    const updated = investments.map(inv => {
      if (inv.id === id) {
        return {
          ...inv,
          interestReceived: inv.interestReceived + interestAmount
        };
      }
      return inv;
    });
    setInvestments(updated);
    const matched = updated.find(i => i.id === id);
    syncToDbAndLocal('investments', updated, 'update', { filter: { id }, update: matched });

    const inv = investments.find(i => i.id === id);
    if (inv) {
      recordTransaction(
        'credit',
        'bank',
        interestAmount,
        'Interest Income',
        id,
        `Received interest/dividend for ${inv.type} (${inv.provider})`
      );
      addAuditLog(`Received Interest: ${interestAmount} TK from ${inv.type} (${inv.provider})`, 'treasurer', 'System Log');
    }
  };

  const closeInvestment = (id: string, finalInterest: number) => {
    const updated = investments.map(inv => {
      if (inv.id === id) {
        return {
          ...inv,
          status: 'closed' as const,
          interestReceived: inv.interestReceived + finalInterest
        };
      }
      return inv;
    });
    setInvestments(updated);
    const matched = updated.find(i => i.id === id);
    syncToDbAndLocal('investments', updated, 'update', { filter: { id }, update: matched });

    const inv = investments.find(i => i.id === id);
    if (inv) {
      // 1. Receive Remaining Interest
      if (finalInterest > 0) {
        recordTransaction(
          'credit',
          'bank',
          finalInterest,
          'Interest Income',
          id,
          `Final interest payment upon closure of ${inv.type} (${inv.provider})`
        );
      }
      // 2. Receive Principal Back
      recordTransaction(
        'credit',
        'bank',
        inv.principalAmount,
        'Investment Return',
        id,
        `Returned principal amount for closed ${inv.type} (${inv.provider})`
      );

      addAuditLog(`Closed Investment: ${inv.type} (${inv.provider}) returned ${inv.principalAmount} TK principal`, 'treasurer', 'System Log');
    }
  };

  // ---------------- EXPENSES ACTIONS ----------------
  const addExpense = (expData: Omit<Expense, 'id' | 'date'>) => {
    const newExp: Expense = {
      ...expData,
      id: `e-${Date.now()}`,
      date: new Date().toISOString().split('T')[0]
    };
    const updated = [newExp, ...expenses];
    setExpenses(updated);
    syncToDbAndLocal('expenses', updated, 'create', newExp);

    // Ledger Entry (Assuming paid by Cash in Hand)
    recordTransaction(
      'debit',
      'cash',
      expData.amount,
      'Expense',
      newExp.id,
      `Office Expense - ${expData.category}: ${expData.description}`
    );

    addAuditLog(`Recorded Expense: ${expData.amount} TK for ${expData.category}`, 'treasurer', 'System Log');
    return newExp;
  };

  const deleteExpense = (id: string, permanent: boolean = false) => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);

    // Reverse Transaction
    recordTransaction(
      'credit',
      'cash',
      exp.amount,
      'Other',
      id,
      `REVERSAL: Deleted expense ID ${id} for ${exp.category}`
    );

    if (permanent) {
      syncToDbAndLocal('expenses', updated, 'delete', { id });
      addAuditLog(`Permanently Deleted Expense: ${exp.category} - ${exp.amount} TK`, 'treasurer', 'System Log');
    } else {
      syncToDbAndLocal('expenses', updated, 'delete', { id });
      const trashItem: TrashItem = {
        id: `trash-${Date.now()}-${id}`,
        originalId: id,
        entityType: 'expense',
        title: `${exp.category} — ${exp.description}`,
        subtitle: `${exp.date} • Cash`,
        amount: exp.amount,
        data: exp,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Treasurer'
      };
      const updatedTrash = [trashItem, ...trash];
      setTrash(updatedTrash);
      syncToDbAndLocal('trash', updatedTrash, 'create', trashItem);
      addAuditLog(`Moved Expense to Trash: ${exp.category} - ${exp.amount} TK`, 'treasurer', 'System Log');
    }
  };

  // ---------------- FUND TRANSFERS ----------------
  const transferFund = (amount: number, from: 'cash' | 'bank', to: 'cash' | 'bank', description: string, performedBy: string) => {
    const transferId = `transfer-${Date.now()}`;
    
    // Debit from source
    recordTransaction(
      'debit',
      from,
      amount,
      'Transfer',
      transferId,
      `Transfer: ${description} (Outflow)`
    );

    // Credit to target
    recordTransaction(
      'credit',
      to,
      amount,
      'Transfer',
      transferId,
      `Transfer: ${description} (Inflow)`
    );

    addAuditLog(`Fund Transfer: Transferred ${amount} TK from ${from.toUpperCase()} to ${to.toUpperCase()}`, 'treasurer', performedBy);
  };

  // ---------------- SYSTEM / AUDIT ACTIONS ----------------
  const addAuditLog = (action: string, role: UserRole, userName: string) => {
    const newLog: AuditLog = {
      id: `a-${Date.now()}`,
      userId: `u-logged`,
      userName,
      role,
      action,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('en-US', { hour12: false }),
      ipAddress: '192.168.1.110',
      device: typeof window !== 'undefined' ? window.navigator.userAgent.split(') ')[0] + ')' : 'Windows Node'
    };
    setAuditLogs(prev => {
      const updated = [newLog, ...prev].slice(0, 200); // Max 200 entries
      syncToDbAndLocal('auditLogs', updated, 'create', newLog);
      return updated;
    });
  };

  // Helper to dispatch Web Push notifications asynchronously to registered devices
  const sendPushNotification = async (payload: {
    title: string;
    message: string;
    url?: string;
    targetUserId?: string;
    targetRole?: string;
  }) => {
    try {
      fetch('/api/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: payload.title,
          message: payload.message,
          url: payload.url || '/dashboard',
          targetUserId: payload.targetUserId || 'all',
          targetRole: payload.targetRole,
        }),
      }).catch((err) => {
        console.warn('[PushNotification] async push dispatch warning:', err);
      });
    } catch (e) {
      // Ignore background fetch errors
    }
  };

  // ---------------- NOTIFICATIONS ACTIONS ----------------
  const addNotification = async (notifData: Omit<SystemNotification, 'id' | 'date' | 'read'>): Promise<SystemNotification> => {
    const newNotif: SystemNotification = {
      ...notifData,
      id: `notif-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      date: new Date().toISOString().split('T')[0],
      read: false
    };
    const updated = [newNotif, ...notifications];
    setNotifications(updated);
    await syncToDbAndLocal('notifications', updated, 'create', newNotif);

    // Automatically trigger Web Push notification to user's phone / all devices
    sendPushNotification({
      title: newNotif.title,
      message: newNotif.message,
      url: newNotif.link || '/dashboard',
      targetUserId: newNotif.userId || 'all',
    });

    return newNotif;
  };

  const markNotificationRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    setNotifications(updated);
    const matched = updated.find(n => n.id === id);
    syncToDbAndLocal('notifications', updated, 'update', { filter: { id }, update: matched });
  };

  const markAllNotificationsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    syncToDbAndLocal('notifications', updated, 'update', { filter: {}, update: { read: true } });
  };

  const broadcastAnnouncement = async (
    title: string,
    message: string,
    type: 'info' | 'warning' | 'alert' = 'info',
    target: 'all' | 'due_members' | 'admins' = 'all'
  ): Promise<boolean> => {
    try {
      const cleanTitle = title.startsWith('📢') ? title : `📢 ${title}`;
      let targetUserId: string | undefined = 'all';
      let targetRole: string | undefined = undefined;

      if (target === 'admins') {
        targetUserId = undefined;
        targetRole = 'admin';
      }

      const notif = await addNotification({
        userId: target === 'admins' ? 'admin' : 'all',
        title: cleanTitle,
        message,
        type,
        link: '/dashboard',
        category: 'notice'
      });

      // Explicitly push
      sendPushNotification({
        title: cleanTitle,
        message,
        url: '/dashboard',
        targetUserId,
        targetRole,
      });

      addAuditLog(`Broadcasted Announcement: ${title} (${target})`, 'super_admin', 'Admin');
      return true;
    } catch (e) {
      console.error('Failed to broadcast announcement:', e);
      return false;
    }
  };

  // ---------------- DOCUMENT ACTIONS ----------------
  const addDocument = (docData: Omit<DocumentFile, 'id' | 'uploadDate'>) => {
    const newDoc: DocumentFile = {
      ...docData,
      id: `d-${Date.now()}`,
      uploadDate: new Date().toISOString().split('T')[0]
    };
    const updated = [newDoc, ...documents];
    setDocuments(updated);
    syncToDbAndLocal('documents', updated, 'create', newDoc);
    addAuditLog(`Uploaded Document: ${newDoc.name}`, 'treasurer', 'System Log');
    return newDoc;
  };

  const deleteDocument = (id: string, permanent: boolean = false) => {
    const doc = documents.find(d => d.id === id);
    if (!doc) return;
    const updated = documents.filter(d => d.id !== id);
    setDocuments(updated);

    if (permanent) {
      syncToDbAndLocal('documents', updated, 'delete', { id });
      addAuditLog(`Permanently Deleted Document: ${doc.name}`, 'super_admin', 'Admin');
    } else {
      syncToDbAndLocal('documents', updated, 'delete', { id });
      const trashItem: TrashItem = {
        id: `trash-${Date.now()}-${id}`,
        originalId: id,
        entityType: 'document',
        title: doc.name,
        subtitle: `${doc.size} • ${doc.category}`,
        data: doc,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Admin'
      };
      const updatedTrash = [trashItem, ...trash];
      setTrash(updatedTrash);
      syncToDbAndLocal('trash', updatedTrash, 'create', trashItem);
      addAuditLog(`Moved Document to Trash: ${doc.name}`, 'treasurer', 'System Log');
    }
  };

  // ---------------- USER MANAGEMENT ----------------
  const addUser = (userData: Omit<User, 'id'>) => {
    let linkedMemberId = userData.memberId;

    if (userData.role === 'member') {
      const existingMember = members.find(m => 
        (userData.email && m.email?.toLowerCase() === userData.email.toLowerCase()) ||
        (userData.phone && m.phone === userData.phone) ||
        (userData.name && m.name.toLowerCase() === userData.name.toLowerCase())
      );

      if (existingMember) {
        linkedMemberId = existingMember.id;
      } else {
        const autoMemberId = `m-${Date.now()}`;
        const autoMember: Member = {
          id: autoMemberId,
          name: userData.name,
          email: userData.email,
          phone: userData.phone || '',
          status: 'active',
          joinDate: new Date().toISOString().split('T')[0],
          monthlyFee: 1000,
          nomineeName: '',
          nomineeRelation: '',
          nomineePhone: ''
        };
        const updatedMembers = [autoMember, ...members];
        setMembers(updatedMembers);
        syncToDbAndLocal('members', updatedMembers, 'create', autoMember);
        linkedMemberId = autoMemberId;
      }
    }

    const newUser: User = {
      ...userData,
      id: `u-${Date.now()}`,
      memberId: linkedMemberId,
    };
    const updated = [...users, newUser];
    setUsers(updated);
    syncToDbAndLocal('users', updated, 'create', newUser);
    addAuditLog(`Added System User: ${newUser.email} as ${newUser.role}`, 'super_admin', 'System Log');
    return newUser;
  };

  const updateUserStatus = (id: string, status: 'active' | 'locked') => {
    const updated = users.map(u => u.id === id ? { ...u, status } : u);
    setUsers(updated);
    const matched = updated.find(u => u.id === id);
    syncToDbAndLocal('users', updated, 'update', { filter: { id }, update: matched });
    addAuditLog(`Changed User Status: ID ${id} to ${status}`, 'super_admin', 'System Log');
  };

  const resetUserPassword = (id: string, newPassword?: string) => {
    const updated = users.map(u => u.id === id ? { ...u, password: newPassword || 'password123' } : u);
    setUsers(updated);
    const matched = updated.find(u => u.id === id);
    syncToDbAndLocal('users', updated, 'update', { filter: { id }, update: matched });
    addAuditLog(`Reset password request processed for ID: ${id}`, 'super_admin', 'System Log');
  };

  const updateUser = (id: string, updatedFields: Partial<User>) => {
    const updated = users.map(u => u.id === id ? { ...u, ...updatedFields } : u);
    setUsers(updated);
    const matched = updated.find(u => u.id === id);
    syncToDbAndLocal('users', updated, 'update', { filter: { id }, update: matched });
    addAuditLog(`Updated System User Details: ID ${id}`, 'super_admin', 'System Log');
  };

  const deleteUser = (id: string) => {
    const matched = users.find(u => u.id === id);
    if (!matched) return;
    const updated = users.filter(u => u.id !== id);
    setUsers(updated);
    syncToDbAndLocal('users', updated, 'delete', { id });
    addAuditLog(`Deleted System User: ${matched.email}`, 'super_admin', 'System Log');
  };

  const deleteInvestment = (id: string, permanent: boolean = false) => {
    const inv = investments.find(i => i.id === id);
    if (!inv) return;
    const updated = investments.filter(i => i.id !== id);
    setInvestments(updated);
    
    // Reverse investment ledger deposit entry by crediting Bank
    recordTransaction(
      'credit',
      'bank',
      inv.principalAmount,
      'Other',
      id,
      `REVERSAL: Deleted investment portfolio ID ${id} with ${inv.provider}`
    );

    if (permanent) {
      syncToDbAndLocal('investments', updated, 'delete', { id });
      addAuditLog(`Permanently Deleted Investment Portfolio: ${inv.type} (${inv.provider})`, 'treasurer', 'System Log');
    } else {
      syncToDbAndLocal('investments', updated, 'delete', { id });
      const trashItem: TrashItem = {
        id: `trash-${Date.now()}-${id}`,
        originalId: id,
        entityType: 'investment',
        title: `${inv.type} — ${inv.provider}`,
        subtitle: `Rate: ${inv.interestRate}% • Start: ${inv.startDate}`,
        amount: inv.principalAmount,
        data: inv,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Treasurer'
      };
      const updatedTrash = [trashItem, ...trash];
      setTrash(updatedTrash);
      syncToDbAndLocal('trash', updatedTrash, 'create', trashItem);
      addAuditLog(`Moved Investment to Trash: ${inv.type} (${inv.provider})`, 'treasurer', 'System Log');
    }
  };

  const deleteTransaction = (id: string) => {
    const tx = transactions.find(t => t.id === id);
    if (!tx) return;
    const updated = transactions.filter(t => t.id !== id);
    setTransactions(updated);
    syncToDbAndLocal('transactions', updated, 'delete', { id });
    addAuditLog(`Voided Ledger Transaction: ID ${id} (${tx.description})`, 'super_admin', 'System Log');
  };

  const clearAllTransactions = async () => {
    setTransactions([]);
    if (typeof window !== 'undefined') {
      localStorage.setItem('fdc_transactions', JSON.stringify([]));
    }
    try {
      await fetch('/api/db/transactions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: {} })
      });
      addAuditLog('Cleared all general ledger transactions', 'super_admin', 'System Log');
    } catch (err) {
      console.error('Failed to clear transactions from DB:', err);
    }
  };

  // ---------------- LOAN ACTIONS ----------------
  const addLoan = async (loanData: Omit<Loan, 'id' | 'loanNo' | 'totalPayable' | 'totalRepaid' | 'status' | 'repayments' | 'createdAt'>): Promise<Loan> => {
    const d1 = new Date(loanData.disbursedDate);
    const d2 = new Date(loanData.dueDate);
    const diffMonths = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24 * 30.4375)));
    const interest = loanData.principalAmount * (loanData.interestRate / 100) * (diffMonths / 12);
    const totalPayable = Math.round(loanData.principalAmount + interest);
    
    // Auto-generate Loan No
    const loanSeq = loans.length + 1;
    const loanNo = `FDC-LN-${String(loanSeq).padStart(4, '0')}`;
    const installments = loanData.installmentMonths || diffMonths || 12;
    const monthlyInstallment = Math.round(totalPayable / installments);

    const newLoan: Loan = {
      ...loanData,
      id: `ln-${Date.now()}`,
      loanNo,
      totalPayable,
      totalRepaid: 0,
      status: 'active',
      repayments: [],
      installmentMonths: installments,
      monthlyInstallment,
      createdAt: new Date().toISOString()
    };

    const updated = [newLoan, ...loans];
    setLoans(updated);
    syncToDbAndLocal('loans', updated, 'create', newLoan);

    // Ledger debit entry
    recordTransaction(
      'debit',
      'bank',
      newLoan.principalAmount,
      'Other',
      newLoan.id,
      `Loan Disbursed: ${newLoan.loanNo} to ${newLoan.memberName} (${newLoan.purpose})`
    );

    addAuditLog(`Issued Loan ${newLoan.loanNo} to ${newLoan.memberName} of Tk ${newLoan.principalAmount}`, 'treasurer', 'System Log');

    // Notify member
    addNotification({
      userId: newLoan.memberId,
      title: `💳 লোন প্রদান সম্পন্ন (${newLoan.loanNo})`,
      message: `আপনার অনুকূলে ৳${newLoan.principalAmount} লোন প্রদান করা হয়েছে। কিস্তির শেষ সময়: ${newLoan.dueDate}।`,
      type: 'success',
      link: '/loans'
    });

    return newLoan;
  };

  const recordLoanRepayment = async (loanId: string, repayment: Omit<LoanRepayment, 'id'>): Promise<boolean> => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return false;

    const newRepayment: LoanRepayment = {
      ...repayment,
      id: `rep-${Date.now()}`
    };

    const updatedRepayments = [...(loan.repayments || []), newRepayment];
    const newTotalRepaid = (loan.totalRepaid || 0) + repayment.amount;
    const isFullyPaid = newTotalRepaid >= loan.totalPayable;
    const newStatus: LoanStatus = isFullyPaid ? 'fully_paid' : loan.status;

    const updatedLoan: Loan = {
      ...loan,
      totalRepaid: newTotalRepaid,
      status: newStatus,
      repayments: updatedRepayments
    };

    const updatedLoans = loans.map(l => l.id === loanId ? updatedLoan : l);
    setLoans(updatedLoans);
    syncToDbAndLocal('loans', updatedLoans, 'update', { filter: { id: loanId }, update: updatedLoan });

    // Ledger credit entry
    recordTransaction(
      'credit',
      'bank',
      repayment.amount,
      'Other',
      newRepayment.id,
      `Loan Repayment for ${loan.loanNo} (${loan.memberName}): Tk ${repayment.amount}`
    );

    addAuditLog(`Recorded Loan Repayment: Tk ${repayment.amount} for ${loan.loanNo} (${loan.memberName})`, 'treasurer', 'System Log');

    addNotification({
      userId: loan.memberId,
      title: `💵 লোন কিস্তি জমা (${loan.loanNo})`,
      message: `৳${repayment.amount} কিস্তি সফলভাবে জমা হয়েছে। অবশিষ্ট বকেয়া: ৳${Math.max(0, loan.totalPayable - newTotalRepaid)}।`,
      type: 'success',
      link: '/loans'
    });

    return true;
  };

  const updateLoanStatus = async (loanId: string, status: LoanStatus, notes?: string): Promise<boolean> => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return false;

    const updatedLoan: Loan = {
      ...loan,
      status,
      notes: notes ? (loan.notes ? `${loan.notes}\n${notes}` : notes) : loan.notes
    };

    const updatedLoans = loans.map(l => l.id === loanId ? updatedLoan : l);
    setLoans(updatedLoans);
    syncToDbAndLocal('loans', updatedLoans, 'update', { filter: { id: loanId }, update: updatedLoan });

    addAuditLog(`Updated Loan Status: ${loan.loanNo} -> ${status}`, 'super_admin', 'System Log');
    return true;
  };

  const deleteLoan = async (loanId: string, permanent: boolean = false): Promise<boolean> => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return false;

    const updated = loans.filter(l => l.id !== loanId);
    setLoans(updated);

    if (permanent) {
      syncToDbAndLocal('loans', updated, 'delete', { id: loanId });
      addAuditLog(`Permanently Deleted Loan Record: ${loan.loanNo} (${loan.memberName})`, 'super_admin', 'Admin');
    } else {
      syncToDbAndLocal('loans', updated, 'delete', { id: loanId });
      const trashItem: TrashItem = {
        id: `trash-${Date.now()}-${loanId}`,
        originalId: loanId,
        entityType: 'loan',
        title: `Loan ${loan.loanNo} — ${loan.memberName}`,
        subtitle: `Amount: Tk ${loan.principalAmount} • Due: ${loan.dueDate}`,
        amount: loan.principalAmount,
        data: loan,
        deletedAt: new Date().toISOString(),
        deletedBy: 'Admin'
      };
      const updatedTrash = [trashItem, ...trash];
      setTrash(updatedTrash);
      syncToDbAndLocal('trash', updatedTrash, 'create', trashItem);
      addAuditLog(`Moved Loan to Trash: ${loan.loanNo} (${loan.memberName})`, 'super_admin', 'Admin');
    }
    return true;
  };

  // ---------------- TRASH & RECYCLE BIN OPERATIONS ----------------
  const restoreFromTrash = async (trashId: string): Promise<boolean> => {
    const item = trash.find(t => t.id === trashId);
    if (!item) return false;

    try {
      switch (item.entityType) {
        case 'member': {
          const m = item.data as Member;
          const updated = [...members, m];
          setMembers(updated);
          syncToDbAndLocal('members', updated, 'create', m);
          break;
        }
        case 'collection': {
          const c = item.data as Collection;
          const updated = [...collections, c];
          setCollections(updated);
          syncToDbAndLocal('collections', updated, 'create', c);
          recordTransaction(
            'credit',
            c.paymentType === 'cash' ? 'cash' : 'bank',
            c.amount + (c.lateFine || 0),
            'Collection',
            c.id,
            `RESTORE: Collection from ${c.memberName}`
          );
          break;
        }
        case 'expense': {
          const e = item.data as Expense;
          const updated = [...expenses, e];
          setExpenses(updated);
          syncToDbAndLocal('expenses', updated, 'create', e);
          recordTransaction(
            'debit',
            'cash',
            e.amount,
            'Expense',
            e.id,
            `RESTORE: Expense for ${e.category}`
          );
          break;
        }
        case 'investment': {
          const inv = item.data as Investment;
          const updated = [...investments, inv];
          setInvestments(updated);
          syncToDbAndLocal('investments', updated, 'create', inv);
          break;
        }
        case 'loan': {
          const l = item.data as Loan;
          const updated = [...loans, l];
          setLoans(updated);
          syncToDbAndLocal('loans', updated, 'create', l);
          break;
        }
        case 'due_demand': {
          const d = item.data as DueDemand;
          const updated = [...dueDemands, d];
          setDueDemands(updated);
          syncToDbAndLocal('due_demands', updated, 'create', d);
          break;
        }
        case 'document': {
          const doc = item.data as DocumentFile;
          const updated = [...documents, doc];
          setDocuments(updated);
          syncToDbAndLocal('documents', updated, 'create', doc);
          break;
        }
      }

      // Remove from trash
      const updatedTrash = trash.filter(t => t.id !== trashId);
      setTrash(updatedTrash);
      syncToDbAndLocal('trash', updatedTrash, 'delete', { id: trashId });
      addAuditLog(`Restored from Trash: ${item.title} (${item.entityType})`, 'super_admin', 'Admin');
      return true;
    } catch (err) {
      console.error('Error restoring from trash:', err);
      return false;
    }
  };

  const permanentDeleteFromTrash = async (trashId: string): Promise<boolean> => {
    const item = trash.find(t => t.id === trashId);
    if (!item) return false;

    try {
      // 1. Remove from local trash state & db
      const updatedTrash = trash.filter(t => t.id !== trashId);
      setTrash(updatedTrash);
      syncToDbAndLocal('trash', updatedTrash, 'delete', { id: trashId });

      // 2. Hard delete original item from its database collection to ensure no trace remains
      const collectionName =
        item.entityType === 'member' ? 'members' :
        item.entityType === 'collection' ? 'collections' :
        item.entityType === 'expense' ? 'expenses' :
        item.entityType === 'investment' ? 'investments' :
        item.entityType === 'loan' ? 'loans' :
        item.entityType === 'due_demand' ? 'due_demands' : 'documents';

      fetch(`/api/db/${collectionName}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filter: { id: item.originalId } })
      }).catch(e => console.warn('Permanent hard delete API error:', e));

      addAuditLog(`Permanently Erased from Database: ${item.title} (${item.entityType})`, 'super_admin', 'Admin');
      return true;
    } catch (err) {
      console.error('Error in permanentDeleteFromTrash:', err);
      return false;
    }
  };

  const emptyTrash = async (): Promise<boolean> => {
    try {
      for (const item of trash) {
        const collectionName =
          item.entityType === 'member' ? 'members' :
          item.entityType === 'collection' ? 'collections' :
          item.entityType === 'expense' ? 'expenses' :
          item.entityType === 'investment' ? 'investments' :
          item.entityType === 'loan' ? 'loans' :
          item.entityType === 'due_demand' ? 'due_demands' : 'documents';

        fetch(`/api/db/${collectionName}`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filter: { id: item.originalId } })
        }).catch(() => {});
      }

      setTrash([]);
      syncToDbAndLocal('trash', [], 'delete', { filter: {} });
      addAuditLog('Emptied Recycle Bin (All items permanently deleted from DB)', 'super_admin', 'Admin');
      return true;
    } catch (err) {
      console.error('Error emptying trash:', err);
      return false;
    }
  };

  const sendLoanReminder = async (loanId: string): Promise<boolean> => {
    const loan = loans.find(l => l.id === loanId);
    if (!loan) return false;

    const remaining = Math.max(0, loan.totalPayable - loan.totalRepaid);
    const title = `⏰ লোন কিস্তি পরিশোধের সময় এসেছে (${loan.loanNo})`;
    const message = `${loan.memberName}, আপনার লোন নং ${loan.loanNo}-এর কিস্তি পরিশোধের সময় হয়েছে। অবশিষ্ট বকেয়া: ৳${remaining}। পরিশোধের শেষ তারিখ: ${loan.dueDate}।`;

    await addNotification({
      userId: loan.memberId,
      title,
      message,
      type: 'warning',
      link: '/loans',
      category: 'loan'
    });

    // Also dispatch email if available
    const member = members.find(m => m.id === loan.memberId);
    if (member?.email) {
      fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'due_reminder',
          to: member.email,
          data: {
            memberName: loan.memberName,
            month: `Loan ${loan.loanNo}`,
            amount: remaining,
            dueDate: loan.dueDate,
            lateFine: 0
          }
        })
      }).catch(() => {});
    }

    addAuditLog(`Sent Loan Repayment Reminder to ${loan.memberName} for ${loan.loanNo}`, 'treasurer', 'Treasurer');
    return true;
  };

  // ---------------- CALCULATE METRICS ----------------
  const getCashBalance = () => {
    return transactions
      .filter(t => t.account === 'cash')
      .reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
  };

  const getBankBalance = () => {
    return transactions
      .filter(t => t.account === 'bank')
      .reduce((sum, t) => sum + (t.type === 'credit' ? t.amount : -t.amount), 0);
  };

  const totalMembers = members.length;
  const activeMembers = members.filter(m => m.status === 'active').length;
  
  const totalCollection = collections
    .filter(c => c.status === 'paid')
    .reduce((sum, c) => sum + c.amount + c.lateFine, 0);

  const totalInvestment = investments
    .reduce((sum, i) => sum + i.principalAmount, 0);

  const runningInvestments = investments
    .filter(i => i.status === 'running')
    .reduce((sum, i) => sum + i.principalAmount, 0);

  const totalInterestEarned = investments.reduce((sum, i) => sum + i.interestReceived, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const availableCash = getCashBalance();
  const bankBalance = getBankBalance();

  // Dues calculation: sum of unpaid dues across all active demands
  const dueCollection = dueDemands.reduce((sum, demand) => {
    return sum + members.filter(m => m.status === 'active').reduce((mSum, m) => {
      const isPaid = collections.some(c => c.memberId === m.id && c.month === demand.month && c.status === 'paid');
      if (isPaid) return mSum;
      const fee = demand.amountType === 'fixed' ? (demand.fixedAmount || 0) : m.monthlyFee;
      return mSum + fee;
    }, 0);
  }, 0);

  const stats = {
    totalMembers,
    activeMembers,
    totalCollection,
    totalInvestment,
    runningInvestments,
    totalInterestEarned,
    totalExpenses,
    availableCash,
    bankBalance,
    dueCollection
  };

  return (
    <StoreContext.Provider
      value={{
        members,
        collections,
        investments,
        expenses,
        transactions,
        auditLogs,
        notifications,
        documents,
        users,
        dueDemands,
        loans,
        fineWaivers,
        trash,
        restoreFromTrash,
        permanentDeleteFromTrash,
        emptyTrash,
        addLoan,
        recordLoanRepayment,
        updateLoanStatus,
        deleteLoan,
        sendLoanReminder,
        addDueDemand,
        deleteDueDemand,
        waiveFine,
        removeFineWaiver,
        importPreviousDues,
        broadcastAnnouncement,
        addMember,
        importMembers,
        updateMember,
        updateMemberPhoto,
        deleteMember,
        addCollection,
        approveCollection,
        rejectCollection,
        importCollections,
        deleteCollection,
        addInvestment,
        importInvestments,
        receiveInterest,
        closeInvestment,
        addExpense,
        deleteExpense,
        transferFund,
        addAuditLog,
        addNotification,
        markNotificationRead,
        markAllNotificationsRead,
        addDocument,
        deleteDocument,
        addUser,
        updateUserStatus,
        resetUserPassword,
        updateUser,
        deleteUser,
        deleteInvestment,
        deleteTransaction,
        clearAllTransactions,
        stats
      }}
    >
      {loaded && children}
    </StoreContext.Provider>
  );
};

export const useStore = () => {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
};
