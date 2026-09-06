'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { User, UserRole, DocumentFile } from '../../types';
import { 
  Users, 
  ShieldAlert, 
  FolderOpen, 
  Lock, 
  Unlock, 
  RefreshCw, 
  PlusCircle, 
  Trash2, 
  Download, 
  Upload, 
  FileText, 
  Image as ImageIcon, 
  FileSpreadsheet,
  X,
  CheckCircle,
  AlertCircle,
  Edit2,
  Eye,
  EyeOff
} from 'lucide-react';
import ConfirmModal from '../../components/confirm-modal';

export default function UsersPage() {
  const { users, addUser, updateUserStatus, resetUserPassword, updateUser, deleteUser, documents, addDocument, deleteDocument, auditLogs } = useStore();
  const { user: currentUser, hasPermission, permissions, updateRolePermission } = useAuth();

  // Tabs state: 'users' | 'rbac' | 'files'
  const [activeTab, setActiveTab] = useState<'users' | 'rbac' | 'files'>('users');

  // Confirmation modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmConfig({ title, message, onConfirm });
    setConfirmModalOpen(true);
  };

  // Selected role for RBAC editing
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<UserRole>('treasurer');

  // Add User Form state
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('collector');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('password123');

  // Edit User Form state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editUserId, setEditUserId] = useState('');
  const [editUserName, setEditUserName] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('collector');
  const [editUserPhone, setEditUserPhone] = useState('');
  const [editUserPassword, setEditUserPassword] = useState('');

  // Password visibility states
  const [showNewUserPassword, setShowNewUserPassword] = useState(false);
  const [showEditUserPassword, setShowEditUserPassword] = useState(false);

  // Add File Form state
  const [fileModalOpen, setFileModalOpen] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileCategory, setFileCategory] = useState<DocumentFile['category']>('Agreements');
  const [fileType, setFileType] = useState<'pdf' | 'excel' | 'image' | 'doc'>('pdf');
  const [fileSize, setFileSize] = useState('1.5 MB');

  // Local state for RBAC permissions editing
  const [localPermissions, setLocalPermissions] = useState<Record<UserRole, Record<string, string[]>> | null>(null);

  // Sync localPermissions when permissions from useAuth() loads
  useEffect(() => {
    if (permissions && !localPermissions) {
      setLocalPermissions(JSON.parse(JSON.stringify(permissions)));
    }
  }, [permissions, localPermissions]);

  const handleToggleLocalPermission = (role: UserRole, module: string, action: string, checked: boolean) => {
    if (!localPermissions) return;
    const updated = JSON.parse(JSON.stringify(localPermissions));
    const roleModules = updated[role] || {};
    const actions = roleModules[module] || [];
    
    if (checked) {
      if (!actions.includes(action)) {
        actions.push(action);
      }
    } else {
      updated[role][module] = actions.filter((a: string) => a !== action);
    }
    
    setLocalPermissions(updated);
  };

  const handleSavePermissions = async () => {
    if (!localPermissions) return;
    
    try {
      showFeedback('Saving permissions to database...');
      
      // Update each role modules in MongoDB
      const savePromises = Object.keys(localPermissions).map(async (roleKey) => {
        const role = roleKey as UserRole;
        const modules = localPermissions[role];
        
        const res = await fetch('/api/db/permissions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filter: { role },
            update: { role, modules }
          })
        });
        const data = await res.json();
        if (data.matchedCount === 0) {
          // If role settings document doesn't exist, insert it
          await fetch('/api/db/permissions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role, modules })
          });
        }
      });
      
      await Promise.all(savePromises);
      localStorage.setItem('fdc_permissions', JSON.stringify(localPermissions));
      showFeedback('Permissions successfully saved to MongoDB! Page reloading...');
      setTimeout(() => {
        window.location.reload();
      }, 1200);
    } catch (err) {
      console.error(err);
      showFeedback('Failed to save permissions to database.');
    }
  };

  // Trigger feedback banner
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail) return;

    addUser({
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      phone: newUserPhone,
      password: newUserPassword,
      status: 'active'
    });

    setUserModalOpen(false);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserPassword('password123');
    showFeedback(`Successfully registered system user ${newUserEmail}`);
  };

  const handleEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUserId || !editUserName || !editUserEmail) return;

    updateUser(editUserId, {
      name: editUserName,
      email: editUserEmail,
      role: editUserRole,
      phone: editUserPhone,
      password: editUserPassword || undefined
    });

    setEditModalOpen(false);
    showFeedback(`Successfully updated system user ${editUserEmail}`);
  };

  const handleUploadFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileName) return;

    addDocument({
      name: fileName.endsWith(`.${fileType}`) ? fileName : `${fileName}.${fileType}`,
      size: fileSize,
      type: fileType,
      uploadedBy: currentUser?.name || 'Treasurer',
      category: fileCategory,
      url: '#'
    });

    setFileModalOpen(false);
    setFileName('');
    showFeedback(`Document uploaded successfully: ${fileName}`);
  };

  // Modules & Actions list
  const modulesList = [
    { key: 'dashboard', name: 'Dashboard Module' },
    { key: 'members', name: 'Member Management' },
    { key: 'collections', name: 'Collection Management' },
    { key: 'investments', name: 'Investment Management' },
    { key: 'expenses', name: 'Expense Management' },
    { key: 'accounting', name: 'Accounting Bookkeeping' },
    { key: 'reports', name: 'Financial Reports' },
    { key: 'users', name: 'User Accounts' },
    { key: 'audit', name: 'Audit Logs' },
    { key: 'documents', name: 'File Repository' },
  ];

  const actionsList = [
    { key: 'view', name: 'View Screen' },
    { key: 'create', name: 'Add/Create' },
    { key: 'update', name: 'Update/Edit' },
    { key: 'delete', name: 'Delete/Void' },
    { key: 'approve', name: 'Approve' },
    { key: 'export', name: 'Export Data' },
    { key: 'print', name: 'Print Copy' },
  ];

  const getDocIcon = (type: string) => {
    switch (type) {
      case 'excel': return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
      case 'image': return <ImageIcon className="w-8 h-8 text-sky-400" />;
      default: return <FileText className="w-8 h-8 text-indigo-400" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Tab switcher headers */}
        <div className="flex border-b border-zinc-800 space-x-4">
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'users' ? 'text-indigo-400 border-b-2 border-indigo-500 font-extrabold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            User Accounts Directory
          </button>
          <button
            onClick={() => setActiveTab('rbac')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'rbac' ? 'text-indigo-400 border-b-2 border-indigo-500 font-extrabold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            RBAC Permission Matrix
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`pb-2.5 text-xs font-bold transition-all relative ${
              activeTab === 'files' ? 'text-indigo-400 border-b-2 border-indigo-500 font-extrabold' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            File Repository Manager
          </button>
        </div>

        {/* Notification Feedback */}
        {feedbackMsg && (
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-lg text-xs flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{feedbackMsg}</span>
          </div>
        )}

        {/* ---------------- TAB 1: USERS DIRECTORY ---------------- */}
        {activeTab === 'users' && (
          <div className="space-y-4 animate-fade-in-up">
            
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-200">System Logins Directory</h3>
                <p className="text-[10px] text-zinc-500">Manage authorization roles for treasury & auditors</p>
              </div>
              
              {hasPermission('users', 'create') && (
                <button
                  onClick={() => setUserModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Create User</span>
                </button>
              )}
            </div>

            {/* Grid listings */}
            <div className="glass-panel rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400">
                      <th className="p-4 font-semibold">User Info</th>
                      <th className="p-4 font-semibold">System Role</th>
                      <th className="p-4 font-semibold">Phone Number</th>
                      <th className="p-4 font-semibold">Last login</th>
                      <th className="p-4 font-semibold text-center">Status</th>
                      <th className="p-4 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-850">
                    {users.map((u) => (
                      <tr key={u.id} className="hover:bg-zinc-900/30 transition-colors">
                        
                        <td className="p-4">
                          <p className="font-bold text-zinc-200">{u.name}</p>
                          <p className="text-[10px] text-zinc-500">{u.email}</p>
                        </td>

                        <td className="p-4">
                          <span className="px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-400 text-[10px] uppercase font-black tracking-wider">
                            {u.role.replace('_', ' ')}
                          </span>
                        </td>

                        <td className="p-4 text-zinc-300">{u.phone || 'N/A'}</td>
                        <td className="p-4 text-zinc-500 text-[10px]">{u.lastLogin || 'Never'}</td>

                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                            u.status === 'active' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {u.status}
                          </span>
                        </td>

                        {/* Action buttons */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            
                            {/* Edit user details */}
                            {hasPermission('users', 'update') && (
                              <button
                                onClick={() => {
                                  setEditUserId(u.id);
                                  setEditUserName(u.name);
                                  setEditUserEmail(u.email);
                                  setEditUserRole(u.role);
                                  setEditUserPhone(u.phone || '');
                                  setEditUserPassword(u.password || '');
                                  setEditModalOpen(true);
                                }}
                                className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                                title="Edit User Details & Password"
                              >
                                <Edit2 className="w-3.5 h-3.5 text-indigo-400" />
                              </button>
                            )}

                            {/* Delete User Account */}
                            {currentUser?.role === 'super_admin' && u.id !== currentUser?.id && (
                              <button
                                onClick={() => {
                                  triggerConfirm(
                                    'Delete User Account',
                                    `Are you sure you want to delete system user: ${u.email}? This action cannot be undone.`,
                                    () => {
                                      deleteUser(u.id);
                                      showFeedback(`Successfully deleted system user ${u.email}`);
                                    }
                                  );
                                }}
                                className="p-1.5 bg-zinc-800 hover:bg-zinc-750 text-rose-450 hover:text-rose-400 rounded-lg cursor-pointer transition-colors"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                              </button>
                            )}

                            {/* Reset password */}
                            <button
                              onClick={() => {
                                resetUserPassword(u.id);
                                showFeedback(`Password reset email triggered for ${u.email}`);
                              }}
                              className="p-1.5 bg-zinc-800 text-zinc-400 hover:text-white rounded-lg cursor-pointer"
                              title="Reset Password credentials"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                            </button>

                            {/* Lock/Unlock profile */}
                            {u.id !== currentUser?.id && hasPermission('users', 'update') && (
                              <button
                                onClick={() => {
                                  const targetStatus = u.status === 'active' ? 'locked' : 'active';
                                  updateUserStatus(u.id, targetStatus);
                                  showFeedback(`User ${u.email} status set to ${targetStatus}`);
                                }}
                                className="p-1.5 bg-zinc-800 text-zinc-300 hover:text-white rounded-lg cursor-pointer"
                                title={u.status === 'active' ? 'Lock User Profile' : 'Unlock User Profile'}
                              >
                                {u.status === 'active' ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : <Unlock className="w-3.5 h-3.5 text-emerald-400" />}
                              </button>
                            )}

                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ---------------- TAB 2: RBAC MATRIX ---------------- */}
        {activeTab === 'rbac' && (
          <div className="space-y-6 animate-fade-in-up">
            
            {/* Header selector */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4 space-y-3 sm:space-y-0 text-xs">
              <div>
                <h3 className="text-xs font-bold text-zinc-200">Role Permissions Configurator</h3>
                <p className="text-[10px] text-zinc-500">Toggle screen views or CRUD permissions dynamically below. Changes apply instantly.</p>
              </div>
              
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-zinc-400 font-semibold">Configuring Role:</span>
                  <select
                    value={selectedRoleForPerms}
                    onChange={(e) => setSelectedRoleForPerms(e.target.value as UserRole)}
                    className="bg-zinc-950 border border-zinc-850 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none cursor-pointer"
                  >
                    <option value="super_admin">Super Admin</option>
                    <option value="president">President</option>
                    <option value="treasurer">Treasurer</option>
                    <option value="collector">Collector</option>
                    <option value="auditor">Auditor</option>
                    <option value="member">Member</option>
                  </select>
                </div>
                {currentUser?.role === 'super_admin' && (
                  <button
                    onClick={handleSavePermissions}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-md shadow-indigo-600/10"
                  >
                    Save Permissions
                  </button>
                )}
              </div>
            </div>

            {/* Matrix cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {modulesList.map((mod) => {
                const rolePermissions = localPermissions?.[selectedRoleForPerms] || permissions?.[selectedRoleForPerms] || {};
                const moduleActions = rolePermissions[mod.key] || [];

                return (
                  <div key={mod.key} className="bg-zinc-900 border border-zinc-850 rounded-xl p-4 space-y-3 shadow-sm">
                    <h4 className="font-bold text-xs text-zinc-100 flex items-center space-x-2 border-b border-zinc-850 pb-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                      <span>{mod.name}</span>
                    </h4>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {actionsList.map((act) => {
                        const isGranted = moduleActions.includes(act.key);
                        return (
                          <label 
                            key={act.key} 
                            className="flex items-center space-x-2 p-2 bg-zinc-950/40 hover:bg-zinc-950 rounded border border-zinc-850/50 cursor-pointer select-none"
                          >
                            <input
                              type="checkbox"
                              checked={isGranted}
                              onChange={(e) => {
                                handleToggleLocalPermission(selectedRoleForPerms, mod.key, act.key, e.target.checked);
                              }}
                              className="rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                            <span className="text-[10px] text-zinc-400 font-semibold">{act.key.toUpperCase()}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 bg-zinc-950 border border-zinc-850 text-[10px] text-zinc-400 rounded-xl leading-relaxed text-center">
              ⚠️ Warning: Restricting View permissions for any module will instantly hide that section from the user sidebar menu.
            </div>

          </div>
        )}

        {/* ---------------- TAB 3: FILE MANAGER ---------------- */}
        {activeTab === 'files' && (
          <div className="space-y-4 animate-fade-in-up">
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-zinc-200">Document Repository</h3>
                <p className="text-[10px] text-zinc-500">Upload and storage for agreements, receipts, bank statements</p>
              </div>
              
              {hasPermission('documents', 'create') && (
                <button
                  onClick={() => setFileModalOpen(true)}
                  className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
              )}
            </div>

            {/* Folder grid view */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 py-2">
              {['Agreements', 'Receipts', 'Bank Statements', 'Others'].map((folder) => {
                const count = documents.filter(d => d.category === folder).length;
                return (
                  <div key={folder} className="glass-card p-4 rounded-xl flex items-center space-x-3.5">
                    <FolderOpen className="w-9 h-9 text-indigo-400 shrink-0" />
                    <div>
                      <h4 className="font-bold text-zinc-200 text-xs">{folder}</h4>
                      <p className="text-[10px] text-zinc-500 mt-0.5">{count} registered files</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Files list */}
            <div className="glass-panel rounded-2xl overflow-hidden mt-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400">
                    <th className="p-4 font-semibold">Document Name</th>
                    <th className="p-4 font-semibold">Category</th>
                    <th className="p-4 font-semibold">File Size</th>
                    <th className="p-4 font-semibold">Uploaded By</th>
                    <th className="p-4 font-semibold">Date Uploaded</th>
                    <th className="p-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850">
                  {documents.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-zinc-500">No documents uploaded</td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id} className="hover:bg-zinc-900/30 transition-colors">
                        
                        <td className="p-4">
                          <div className="flex items-center space-x-3">
                            <span className="shrink-0">{getDocIcon(doc.type)}</span>
                            <div>
                              <p className="font-bold text-zinc-200">{doc.name}</p>
                              <p className="text-[9px] text-zinc-500 uppercase">{doc.type}</p>
                            </div>
                          </div>
                        </td>

                        <td className="p-4 text-zinc-400">{doc.category}</td>
                        <td className="p-4 text-zinc-300">{doc.size}</td>
                        <td className="p-4 text-zinc-300">{doc.uploadedBy}</td>
                        <td className="p-4 text-zinc-500 text-[10px]">{doc.uploadDate}</td>

                        {/* Actions */}
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            
                            {hasPermission('documents', 'view') && (
                              <a
                                href="#"
                                onClick={(e) => { e.preventDefault(); alert(`Downloading mock file: ${doc.name}`); }}
                                className="p-1.5 bg-zinc-850 hover:bg-zinc-800 text-zinc-300 rounded-lg cursor-pointer"
                                title="Download document copy"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {hasPermission('documents', 'delete') && (
                              <button
                                onClick={() => {
                                  triggerConfirm(
                                    'Delete Document',
                                    `Are you sure you want to permanently delete document: ${doc.name}?`,
                                    () => {
                                      deleteDocument(doc.id);
                                      showFeedback(`Document deleted: ${doc.name}`);
                                    }
                                  );
                                }}
                                className="p-1.5 bg-zinc-850 hover:bg-zinc-850 text-zinc-500 hover:text-rose-400 rounded-lg cursor-pointer"
                                title="Delete document copy"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}

                          </div>
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>
        )}

        {/* ---------------- MODAL: ADD USER ---------------- */}
        {userModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
              
              <div className="flex items-center justify-between p-4 border-b border-zinc-850">
                <h3 className="text-sm font-bold text-zinc-200">Register System User</h3>
                <button onClick={() => setUserModalOpen(false)} className="p-1 text-zinc-400 hover:text-white rounded-lg"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleAddUser} className="p-4 space-y-4 text-xs">
                
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">User Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asif Chowdhury"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="asif@fdc.org"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Assign Role</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-300 focus:outline-none cursor-pointer"
                    >
                      <option value="president">President</option>
                      <option value="treasurer">Treasurer</option>
                      <option value="collector">Collector</option>
                      <option value="auditor">Auditor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+8801XXXXXXXXX"
                      value={newUserPhone}
                      onChange={(e) => setNewUserPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Assign Login Password *</label>
                  <div className="relative">
                    <input
                      type={showNewUserPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter login password"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 pr-10 text-zinc-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white focus:outline-none cursor-pointer"
                    >
                      {showNewUserPassword ? <EyeOff className="w-4 h-4 text-zinc-400" /> : <Eye className="w-4 h-4 text-zinc-400" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-850">
                  <button type="button" onClick={() => setUserModalOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-bold transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold">Register User</button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* ---------------- MODAL: UPLOAD FILE ---------------- */}
        {fileModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
              
              <div className="flex items-center justify-between p-4 border-b border-zinc-850">
                <h3 className="text-sm font-bold text-zinc-200">Upload Agreement / Receipt</h3>
                <button onClick={() => setFileModalOpen(false)} className="p-1 text-zinc-400 hover:text-white rounded-lg"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleUploadFile} className="p-4 space-y-4 text-xs">
                
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Document File Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bank_Deposit_Slip_August"
                    value={fileName}
                    onChange={(e) => setFileName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Category Folder</label>
                    <select
                      value={fileCategory}
                      onChange={(e) => setFileCategory(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-350 focus:outline-none cursor-pointer"
                    >
                      <option value="Agreements">Agreements</option>
                      <option value="Receipts">Receipts</option>
                      <option value="Bank Statements">Bank Statements</option>
                      <option value="Others">Others</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">File Extension Format</label>
                    <select
                      value={fileType}
                      onChange={(e) => {
                        setFileType(e.target.value as any);
                        setFileSize(e.target.value === 'image' ? '820 KB' : '1.5 MB');
                      }}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-350 focus:outline-none cursor-pointer"
                    >
                      <option value="pdf">PDF File</option>
                      <option value="excel">Excel Sheet</option>
                      <option value="image">JPEG/PNG Image</option>
                      <option value="doc">MS Word DOC</option>
                    </select>
                  </div>
                </div>

                {/* Mock Size */}
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">File Size Allocation</label>
                  <input
                    type="text"
                    value={fileSize}
                    onChange={(e) => setFileSize(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-300 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-850">
                  <button type="button" onClick={() => setFileModalOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-bold transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold font-sans">Upload Document</button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* ---------------- MODAL: EDIT USER ---------------- */}
        {editModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-sm shadow-2xl">
              
              <div className="flex items-center justify-between p-4 border-b border-zinc-850">
                <h3 className="text-sm font-bold text-zinc-200">Edit System User</h3>
                <button onClick={() => setEditModalOpen(false)} className="p-1 text-zinc-400 hover:text-white rounded-lg"><X className="w-5 h-5" /></button>
              </div>

              <form onSubmit={handleEditUser} className="p-4 space-y-4 text-xs">
                
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">User Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Asif Chowdhury"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    placeholder="asif@fdc.org"
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Assign Role</label>
                    <select
                      value={editUserRole}
                      onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-300 focus:outline-none cursor-pointer"
                    >
                      <option value="super_admin">Super Admin</option>
                      <option value="president">President</option>
                      <option value="treasurer">Treasurer</option>
                      <option value="collector">Collector</option>
                      <option value="auditor">Auditor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+8801XXXXXXXXX"
                      value={editUserPhone}
                      onChange={(e) => setEditUserPhone(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Login Password *</label>
                  <div className="relative">
                    <input
                      type={showEditUserPassword ? 'text' : 'password'}
                      required
                      placeholder="Enter login password"
                      value={editUserPassword}
                      onChange={(e) => setEditUserPassword(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 pr-10 text-zinc-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditUserPassword(!showEditUserPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-white focus:outline-none cursor-pointer"
                    >
                      {showEditUserPassword ? <EyeOff className="w-4 h-4 text-zinc-400" /> : <Eye className="w-4 h-4 text-zinc-400" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-850">
                  <button type="button" onClick={() => setEditModalOpen(false)} className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-bold transition-colors cursor-pointer">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold">Save Changes</button>
                </div>

              </form>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModalOpen}
          title={confirmConfig?.title || 'Confirm Action'}
          message={confirmConfig?.message || 'Are you sure you want to proceed?'}
          confirmText="Delete"
          onConfirm={() => {
            if (confirmConfig) confirmConfig.onConfirm();
            setConfirmModalOpen(false);
            setConfirmConfig(null);
          }}
          onCancel={() => {
            setConfirmModalOpen(false);
            setConfirmConfig(null);
          }}
        />

      </div>
    </DashboardLayout>
  );
}
