'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Member, Collection, Investment, Expense, Transaction, AuditLog, SystemNotification, DocumentFile, UserRole, User } from '../types';

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
  
  // Member actions
  addMember: (member: Omit<Member, 'id'>) => Member;
  importMembers: (members: Omit<Member, 'id'>[]) => Promise<Member[]>;
  updateMember: (id: string, member: Partial<Member>) => void;
  updateMemberPhoto: (id: string, photoUrl: string) => void;
  deleteMember: (id: string) => void;
  
  // Collection actions
  addCollection: (collection: Omit<Collection, 'id' | 'receiptNo' | 'date'> & { date?: string }) => Collection;
  importCollections: (collections: Omit<Collection, 'id' | 'receiptNo' | 'date'>[]) => Promise<Collection[]>;
  deleteCollection: (id: string) => void;
  
  // Investment actions
  addInvestment: (investment: Omit<Investment, 'id' | 'status' | 'interestReceived'>) => Investment;
  importInvestments: (investments: Omit<Investment, 'id' | 'status' | 'interestReceived'>[]) => Promise<Investment[]>;
  receiveInterest: (id: string, interestAmount: number) => void;
  closeInvestment: (id: string, finalInterest: number) => void;
  
  // Expense actions
  addExpense: (expense: Omit<Expense, 'id' | 'date'>) => Expense;
  deleteExpense: (id: string) => void;
  
  // Fund Transfer
  transferFund: (amount: number, from: 'cash' | 'bank', to: 'cash' | 'bank', description: string, performedBy: string) => void;
  
  // System actions
  addAuditLog: (action: string, role: UserRole, userName: string) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  
  // Document actions
  addDocument: (doc: Omit<DocumentFile, 'id' | 'uploadDate'>) => DocumentFile;
  deleteDocument: (id: string) => void;
  
  // User operations
  addUser: (user: Omit<User, 'id'>) => User;
  updateUserStatus: (id: string, status: 'active' | 'locked') => void;
  resetUserPassword: (id: string, newPassword?: string) => void;
  updateUser: (id: string, updatedFields: Partial<User>) => void;
  deleteUser: (id: string) => void;
  deleteInvestment: (id: string) => void;
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
  { id: 'n-1', title: 'Upcoming FDR Maturity', message: 'FDR of 5,00,000 TK at City Bank Ltd will mature on 2027-01-15.', type: 'info', date: '2026-08-01', read: false },
  { id: 'n-2', title: 'Low Cash Balance Alert', message: 'Office cash drawer is below 20,000 TK. Please transfer funds from Bank.', type: 'warning', date: '2026-07-10', read: true },
  { id: 'n-3', title: 'Late Payment Fine Configuration', message: 'Fines have been configured. 50 TK applied after 10th of each month.', type: 'success', date: '2026-05-01', read: true },
  { id: 'n-4', title: 'Maturity Alert: Loan Return Due', message: 'Business loan of 3,00,000 TK to Rahman Electronics matures in 30 days.', type: 'alert', date: '2026-08-02', read: false },
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
  { id: 'u-6', name: 'Kabir Ahmed', email: 'kabir@fdc.org', role: 'member', phone: '+8801711223344', status: 'active', lastLogin: '2026-08-01 07:15 PM', password: 'password123' },
];

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
  const [loaded, setLoaded] = useState(false);

  // Initialize from MongoDB (with LocalStorage fallback)
  useEffect(() => {
    const initDb = async () => {
      const collectionsToFetch = ['members', 'collections', 'investments', 'expenses', 'transactions', 'auditLogs', 'notifications', 'documents', 'users', 'permissions'];

      try {
        const dbStates: Record<string, any[]> = {};
        
        // Fetch all collections in parallel, safely handling each collection independently
        const fetches = collectionsToFetch.map(async (name) => {
          try {
            const res = await fetch(`/api/db/${name}`);
            if (res.ok) {
              const data = await res.json();
              return { name, data: Array.isArray(data) ? data : [] };
            }
          } catch (e) {
            console.warn(`Could not load ${name} from API:`, e);
          }
          
          // Fallback to local storage if API call fails
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

        // Set state directly from database results
        setMembers(dbStates['members'] || []);
        setCollections(dbStates['collections'] || []);
        setInvestments(dbStates['investments'] || []);
        setExpenses(dbStates['expenses'] || []);
        setTransactions(dbStates['transactions'] || []);
        setAuditLogs(dbStates['auditLogs'] || []);
        setNotifications(dbStates['notifications'] || []);
        setDocuments(dbStates['documents'] || []);

        // For users: if completely empty, initialize default users list so admin is never locked out
        const loadedUsers = dbStates['users'] || [];
        setUsers(loadedUsers.length > 0 ? loadedUsers : initialUsers);

        // Sync to LocalStorage
        Object.keys(dbStates).forEach(key => {
          localStorage.setItem(`fdc_${key}`, JSON.stringify(dbStates[key]));
        });
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
      } finally {
        setLoaded(true);
      }
    };

    if (typeof window !== 'undefined') {
      initDb();
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
    
    // Auto Create Member Login User Profile
    const newUser: User = {
      id: `u-${Date.now()}`,
      name: newMember.name,
      email: newMember.email,
      role: 'member',
      phone: newMember.phone,
      status: 'active',
      password: 'member123'
    };
    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    syncToDbAndLocal('users', updatedUsers, 'create', newUser);

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
      role: 'member',
      phone: m.phone,
      status: 'active',
      password: 'member123'
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
    const updated = members.map(m => m.id === id ? { ...m, photoUrl } : m);
    setMembers(updated);
    const matched = updated.find(m => m.id === id);
    syncToDbAndLocal('members', updated, 'update', { filter: { id }, update: { photoUrl } });

    if (matched) {
      const updatedUsers = users.map(u => u.email.toLowerCase() === matched.email.toLowerCase() ? { ...u, avatar: photoUrl } : u);
      setUsers(updatedUsers);
      syncToDbAndLocal('users', updatedUsers, 'update', { filter: { email: matched.email }, update: { avatar: photoUrl } });
    }
    addAuditLog(`Updated Profile Photo for ID: ${id}`, 'super_admin', 'System Log');
  };

  const updateMember = (id: string, updatedFields: Partial<Member>) => {
    const updated = members.map(m => m.id === id ? { ...m, ...updatedFields } : m);
    setMembers(updated);
    const matched = updated.find(m => m.id === id);
    syncToDbAndLocal('members', updated, 'update', { filter: { id }, update: matched });
    addAuditLog(`Updated Member ID: ${id}`, 'super_admin', 'System Log');
  };

  const deleteMember = (id: string) => {
    const memberName = members.find(m => m.id === id)?.name || id;
    const updated = members.filter(m => m.id !== id);
    setMembers(updated);
    syncToDbAndLocal('members', updated, 'delete', { id });
    addAuditLog(`Deleted Member Profile: ${memberName}`, 'super_admin', 'System Log');
  };

  // ---------------- COLLECTIONS ACTIONS ----------------
  const addCollection = (collData: Omit<Collection, 'id' | 'receiptNo' | 'date'> & { date?: string }) => {
    const today = new Date().toISOString().split('T')[0];
    const newColl: Collection = {
      ...collData,
      id: `c-${Date.now()}`,
      date: collData.date || today,
      receiptNo: `REC-${collData.month.replace('-', '')}-${Math.floor(100 + Math.random() * 900)}`,
      status: 'paid'
    };
    const updated = [newColl, ...collections];
    setCollections(updated);
    syncToDbAndLocal('collections', updated, 'create', newColl);

    // Record Ledger Entry
    recordTransaction(
      'credit',
      collData.paymentType,
      collData.amount + collData.lateFine,
      'Collection',
      newColl.id,
      `Monthly collection for ${collData.memberName} (${collData.month})`
    );

    addAuditLog(`Recorded Collection: ${newColl.amount} TK for ${newColl.memberName}`, 'treasurer', 'System Log');
    return newColl;
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
        account: c.paymentType,
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

  const deleteCollection = (id: string) => {
    const col = collections.find(c => c.id === id);
    if (!col) return;
    const updated = collections.filter(c => c.id !== id);
    setCollections(updated);
    syncToDbAndLocal('collections', updated, 'delete', { id });

    // Record Reversal Transaction
    recordTransaction(
      'debit',
      col.paymentType,
      col.amount + col.lateFine,
      'Other',
      id,
      `REVERSAL: Deleted collection ID ${id} for ${col.memberName}`
    );

    addAuditLog(`Reversed Collection Receipt: ${col.receiptNo}`, 'treasurer', 'System Log');
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

  const deleteExpense = (id: string) => {
    const exp = expenses.find(e => e.id === id);
    if (!exp) return;
    const updated = expenses.filter(e => e.id !== id);
    setExpenses(updated);
    syncToDbAndLocal('expenses', updated, 'delete', { id });

    // Reverse Transaction
    recordTransaction(
      'credit',
      'cash',
      exp.amount,
      'Other',
      id,
      `REVERSAL: Deleted expense ID ${id} for ${exp.category}`
    );

    addAuditLog(`Deleted Expense Log: ${exp.category} - ${exp.amount} TK`, 'treasurer', 'System Log');
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

  const deleteDocument = (id: string) => {
    const doc = documents.find(d => d.id === id);
    const updated = documents.filter(d => d.id !== id);
    setDocuments(updated);
    syncToDbAndLocal('documents', updated, 'delete', { id });
    if (doc) {
      addAuditLog(`Deleted Document: ${doc.name}`, 'treasurer', 'System Log');
    }
  };

  // ---------------- USER MANAGEMENT ----------------
  const addUser = (userData: Omit<User, 'id'>) => {
    const newUser: User = {
      ...userData,
      id: `u-${Date.now()}`,
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

  const deleteInvestment = (id: string) => {
    const inv = investments.find(i => i.id === id);
    if (!inv) return;
    const updated = investments.filter(i => i.id !== id);
    setInvestments(updated);
    syncToDbAndLocal('investments', updated, 'delete', { id });
    
    // Reverse investment ledger deposit entry by crediting Bank
    recordTransaction(
      'credit',
      'bank',
      inv.principalAmount,
      'Other',
      id,
      `REVERSAL: Deleted investment portfolio ID ${id} with ${inv.provider}`
    );
    addAuditLog(`Deleted Investment Portfolio: ${inv.type} (${inv.provider})`, 'treasurer', 'System Log');
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

  // Dues calculation
  const dueCollection = members.reduce((sum, m) => {
    return sum + m.monthlyFee;
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
        addMember,
        importMembers,
        updateMember,
        updateMemberPhoto,
        deleteMember,
        addCollection,
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
