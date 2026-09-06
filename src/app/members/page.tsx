'use client';

import React, { useState } from 'react';
import DashboardLayout from '../../components/dashboard-layout';
import { useStore } from '../../contexts/store-context';
import { useAuth } from '../../contexts/auth-context';
import { Member } from '../../types';
import { 
  Search, 
  UserPlus, 
  Download, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  Briefcase, 
  Trash2, 
  Eye, 
  X, 
  Edit,
  FileSpreadsheet
} from 'lucide-react';
import ExcelImportModal from '../../components/excel-import-modal';
import ConfirmModal from '../../components/confirm-modal';

export default function MembersPage() {
  const { members, addMember, importMembers, updateMember, deleteMember } = useStore();
  const { hasPermission } = useAuth();
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [monthlyFee, setMonthlyFee] = useState(1000);
  const [nomineeName, setNomineeName] = useState('');
  const [nomineeRelation, setNomineeRelation] = useState('');
  const [nomineePhone, setNomineePhone] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive' | 'suspended'>('active');

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setMonthlyFee(1000);
    setNomineeName('');
    setNomineeRelation('');
    setNomineePhone('');
    setStatus('active');
    setEditMode(false);
    setSelectedMember(null);
  };

  const handleOpenAddModal = () => {
    resetForm();
    setEditMode(false);
    setModalOpen(true);
  };

  const handleOpenEditModal = (member: Member) => {
    setSelectedMember(member);
    setName(member.name);
    setEmail(member.email);
    setPhone(member.phone);
    setMonthlyFee(member.monthlyFee);
    setNomineeName(member.nomineeName);
    setNomineeRelation(member.nomineeRelation);
    setNomineePhone(member.nomineePhone);
    setStatus(member.status);
    setEditMode(true);
    setModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !phone) {
      alert('Please fill out all required fields');
      return;
    }

    const today = new Date().toISOString().split('T')[0];
    const memberPayload = {
      name,
      email,
      phone,
      monthlyFee: Number(monthlyFee),
      nomineeName,
      nomineeRelation,
      nomineePhone,
      status,
      joinDate: editMode && selectedMember ? selectedMember.joinDate : today,
    };

    if (editMode && selectedMember) {
      updateMember(selectedMember.id, memberPayload);
    } else {
      addMember(memberPayload);
    }

    setModalOpen(false);
    resetForm();
  };

  const handleDelete = (member: Member) => {
    setMemberToDelete(member);
    setConfirmModalOpen(true);
  };

  const handleConfirmDelete = () => {
    if (!memberToDelete) return;
    deleteMember(memberToDelete.id);
    if (selectedMember?.id === memberToDelete.id) {
      setDetailOpen(false);
    }
    setConfirmModalOpen(false);
    setMemberToDelete(null);
  };

  // Filter members
  const filteredMembers = members.filter(m => {
    const matchesSearch = 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.phone.includes(searchQuery);
      
    const matchesStatus = statusFilter === 'all' || m.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Join Date', 'Status', 'Monthly Fee', 'Nominee', 'Nominee Relation', 'Nominee Phone'];
    const rows = filteredMembers.map(m => [
      m.id,
      m.name,
      m.email,
      m.phone,
      m.joinDate,
      m.status,
      m.monthlyFee,
      m.nomineeName,
      m.nomineeRelation,
      m.nomineePhone
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `fdc_members_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        
        {/* Filters and Actions Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          {/* Search Inputs */}
          <div className="flex items-center space-x-3 w-full md:max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search member name, email or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center space-x-2">
            {hasPermission('members', 'create') && (
              <button
                onClick={() => setImportModalOpen(true)}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Import Excel</span>
              </button>
            )}

            {hasPermission('members', 'export') && (
              <button
                onClick={handleExportCSV}
                className="flex items-center space-x-1.5 px-3 py-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            )}

            {hasPermission('members', 'create') && (
              <button
                onClick={handleOpenAddModal}
                className="flex items-center space-x-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-indigo-600/15 transition-all cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Add Member</span>
              </button>
            )}
          </div>
        </div>

        {/* ---------------- MEMBER LISTING TABLE ---------------- */}
        <div className="glass-panel rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/40 text-zinc-400">
                  <th className="p-4 font-semibold">Member Info</th>
                  <th className="p-4 font-semibold">Joined Date</th>
                  <th className="p-4 font-semibold">Monthly Sub.</th>
                  <th className="p-4 font-semibold">Nominee Name</th>
                  <th className="p-4 font-semibold text-center">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-850">
                {filteredMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">No members found</td>
                  </tr>
                ) : (
                  filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-zinc-900/40 transition-colors">
                      
                      {/* Member profile detail */}
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-indigo-600/15 border border-indigo-500/20 text-indigo-400 flex items-center justify-center font-black uppercase text-sm">
                            {member.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-zinc-100">{member.name}</p>
                            <p className="text-[10px] text-zinc-500">{member.phone}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4 text-zinc-400 text-[10px]">
                        <div className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                          <span>{member.joinDate}</span>
                        </div>
                      </td>

                      <td className="p-4 font-bold text-zinc-200">
                        {member.monthlyFee.toLocaleString()} TK
                      </td>

                      <td className="p-4 text-zinc-300">
                        <div>
                          <p className="text-xs font-semibold">{member.nomineeName}</p>
                          <p className="text-[9px] text-zinc-500">Relation: {member.nomineeRelation}</p>
                        </div>
                      </td>

                      {/* Status Badges */}
                      <td className="p-4 text-center">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                          member.status === 'active' 
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                            : member.status === 'suspended'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                            : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                        }`}>
                          {member.status}
                        </span>
                      </td>

                      {/* Action buttons */}
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end space-x-1">
                          <button
                            onClick={() => {
                              setSelectedMember(member);
                              setDetailOpen(true);
                            }}
                            className="p-1.5 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                            title="View nominee / profile info"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          
                          {hasPermission('members', 'update') && (
                            <button
                              onClick={() => handleOpenEditModal(member)}
                              className="p-1.5 text-zinc-400 hover:text-indigo-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                              title="Edit Member"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                          )}

                          {hasPermission('members', 'delete') && (
                            <button
                              onClick={() => handleDelete(member)}
                              className="p-1.5 text-zinc-500 hover:text-rose-400 hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                              title="Delete Member"
                            >
                              <Trash2 className="w-4 h-4" />
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

        {/* ---------------- MODAL: ADD / EDIT MEMBER ---------------- */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl animate-fade-in-up">
              
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-zinc-850">
                <h3 className="text-sm font-bold text-zinc-200">
                  {editMode ? 'Edit Member Profile' : 'Register New Member'}
                </h3>
                <button 
                  onClick={() => setModalOpen(false)}
                  className="p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSave} className="p-4 space-y-4 text-xs">
                
                <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Personal Information</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Kabir Ahmed"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Phone Number *</label>
                    <input
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+88017XXXXXXXX"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="kabir@fdc.org"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Monthly Subscription Fee (TK) *</label>
                    <input
                      type="number"
                      required
                      value={monthlyFee}
                      onChange={(e) => setMonthlyFee(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Member Status</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                </div>

                <div className="border-t border-zinc-850 pt-3 mt-4">
                  <h4 className="text-[10px] font-black uppercase text-indigo-400 tracking-wider mb-3">Nominee & Emergency Information</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Nominee Full Name</label>
                    <input
                      type="text"
                      value={nomineeName}
                      onChange={(e) => setNomineeName(e.target.value)}
                      placeholder="Nominee Name"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-semibold mb-1">Relationship</label>
                    <input
                      type="text"
                      value={nomineeRelation}
                      onChange={(e) => setNomineeRelation(e.target.value)}
                      placeholder="e.g. Wife, Mother, Brother"
                      className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Nominee Phone Number</label>
                  <input
                    type="text"
                    value={nomineePhone}
                    onChange={(e) => setNomineePhone(e.target.value)}
                    placeholder="+8801XXXXXXXXX"
                    className="w-full bg-zinc-950 border border-zinc-850 rounded-lg p-2.5 text-zinc-200 placeholder-zinc-650 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                {/* Submit Panel */}
                <div className="flex items-center justify-end space-x-2 pt-4 border-t border-zinc-850">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold shadow-md shadow-indigo-600/10"
                  >
                    Save Member
                  </button>
                </div>

              </form>

            </div>
          </div>
        )}

        {/* ---------------- MODAL: VIEW MEMBER DETAILS ---------------- */}
        {detailOpen && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl p-5 relative overflow-hidden animate-fade-in-up">
              
              <div className="absolute top-0 right-0 w-24 h-24 grad-primary opacity-5 blur-xl rounded-full"></div>
              
              <button 
                onClick={() => setDetailOpen(false)}
                className="absolute top-4 right-4 p-1 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Detail Profile Header */}
              <div className="flex flex-col items-center text-center space-y-3 pb-4 border-b border-zinc-800">
                <div className="w-16 h-16 rounded-full bg-indigo-600/20 text-indigo-400 border border-indigo-500/20 flex items-center justify-center font-black text-2xl uppercase shadow-lg shadow-indigo-600/10">
                  {selectedMember.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">{selectedMember.name}</h3>
                  <span className={`inline-block px-2.5 py-0.5 mt-1 rounded-full text-[9px] font-black uppercase tracking-wider ${
                    selectedMember.status === 'active' 
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}>
                    {selectedMember.status}
                  </span>
                </div>
              </div>

              {/* Details List */}
              <div className="py-4 space-y-3.5 text-xs">
                
                {/* Contact items */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-[10px] uppercase font-bold">Phone Number</p>
                    <div className="flex items-center space-x-1.5 text-zinc-300">
                      <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{selectedMember.phone}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-[10px] uppercase font-bold">Email Address</p>
                    <div className="flex items-center space-x-1.5 text-zinc-300">
                      <Mail className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">{selectedMember.email}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-[10px] uppercase font-bold">Join Date</p>
                    <div className="flex items-center space-x-1.5 text-zinc-300">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>{selectedMember.joinDate}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-zinc-500 text-[10px] uppercase font-bold">Monthly Fee</p>
                    <div className="flex items-center space-x-1.5 text-zinc-300">
                      <Briefcase className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="font-bold text-zinc-200">{selectedMember.monthlyFee.toLocaleString()} TK</span>
                    </div>
                  </div>
                </div>

                {/* Nominee details */}
                <div className="bg-zinc-950/60 border border-zinc-850 p-3.5 rounded-xl space-y-2">
                  <p className="text-[10px] font-black uppercase text-indigo-400 tracking-wider">Nominee Information</p>
                  
                  <div className="grid grid-cols-2 gap-2 text-zinc-300">
                    <div>
                      <p className="text-[9px] text-zinc-500">Nominee Name</p>
                      <p className="font-semibold text-zinc-200 mt-0.5">{selectedMember.nomineeName || 'N/A'}</p>
                    </div>
                    <div>
                      <p className="text-[9px] text-zinc-500">Relationship</p>
                      <p className="font-semibold text-zinc-200 mt-0.5">{selectedMember.nomineeRelation || 'N/A'}</p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[9px] text-zinc-500">Nominee Contact</p>
                    <p className="font-semibold text-zinc-300 mt-0.5">{selectedMember.nomineePhone || 'N/A'}</p>
                  </div>
                </div>

              </div>

              {/* Close / Action Panel */}
              <div className="flex items-center justify-between border-t border-zinc-800 pt-3.5 mt-2">
                <button
                  onClick={() => {
                    setDetailOpen(false);
                    handleOpenEditModal(selectedMember);
                  }}
                  className="flex items-center space-x-1 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Edit className="w-3.5 h-3.5" />
                  <span>Edit Profile</span>
                </button>
                <button
                  onClick={() => setDetailOpen(false)}
                  className="px-4.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg cursor-pointer"
                >
                  Close
                </button>
              </div>

            </div>
          </div>
        )}

        {/* Excel Import Modal */}
        <ExcelImportModal
          isOpen={importModalOpen}
          type="members"
          title="Import Members via Excel"
          onClose={() => setImportModalOpen(false)}
          onImportSuccess={async (rows) => {
            await importMembers(rows);
          }}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={confirmModalOpen}
          title="Delete Member Profile"
          message={`Are you sure you want to delete member "${memberToDelete?.name}" (${memberToDelete?.email})? This action is irreversible.`}
          confirmText="Delete Member"
          onConfirm={handleConfirmDelete}
          onCancel={() => {
            setConfirmModalOpen(false);
            setMemberToDelete(null);
          }}
        />

      </div>
    </DashboardLayout>
  );
}
