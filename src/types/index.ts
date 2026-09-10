export type UserRole = 'super_admin' | 'president' | 'treasurer' | 'collector' | 'auditor' | 'member' | (string & {});

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  status: 'active' | 'locked';
  lastLogin?: string;
  password?: string;
  avatar?: string;
}

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  photoUrl?: string;
  joinDate: string;
  status: 'active' | 'inactive' | 'suspended';
  nomineeName: string;
  nomineeRelation: string;
  nomineePhone: string;
  monthlyFee: number;
}

export interface Collection {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  month: string; // Format: "YYYY-MM"
  date: string; // Format: "YYYY-MM-DD"
  paymentType: 'cash' | 'bank';
  lateFine: number;
  receiptNo: string;
  status: 'paid' | 'due' | 'pending';
  collectedBy: string; // Collector's name or Treasurer's name
}

export interface DueDemand {
  id: string;
  month: string; // "YYYY-MM"
  title: string;
  dueDate: string; // "YYYY-MM-DD"
  amountType: 'member_fee' | 'fixed';
  fixedAmount?: number;
  lateFine: number;
  applicableTo: 'all' | string; // 'all' or specific memberId
  createdAt: string;
  createdBy: string;
}

export type InvestmentType = 'FDR' | 'DPS' | 'Savings' | 'Business' | 'Loan' | 'Share Market' | 'Mutual Fund' | 'Others';

export interface Investment {
  id: string;
  type: InvestmentType;
  provider: string; // Name of Bank or entity
  principalAmount: number;
  interestRate: number; // Percentage
  startDate: string;
  maturityDate: string;
  status: 'running' | 'matured' | 'closed';
  interestReceived: number;
  notes?: string;
}

export type ExpenseCategory = 'Office Rent' | 'Staff Salary' | 'Utilities' | 'Maintenance' | 'Misc';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  description: string;
  paidBy: string;
}

export interface Transaction {
  id: string;
  date: string;
  type: 'credit' | 'debit';
  account: 'cash' | 'bank' | 'investment';
  amount: number;
  category: 'Collection' | 'Investment Deposit' | 'Investment Return' | 'Interest Income' | 'Expense' | 'Transfer' | 'Other';
  referenceId: string; // Id of Collection, Investment, Expense, etc.
  description: string;
  balanceAfter: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: UserRole;
  action: string;
  date: string;
  time: string;
  ipAddress: string;
  device: string;
}

export interface SystemNotification {
  id: string;
  userId?: string; // specific memberId or 'all'
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'alert';
  date: string;
  read: boolean;
  link?: string;
}

export interface DocumentFile {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'excel' | 'image' | 'doc';
  uploadedBy: string;
  uploadDate: string;
  category: 'Agreements' | 'Receipts' | 'Bank Statements' | 'Others';
  url: string;
}
