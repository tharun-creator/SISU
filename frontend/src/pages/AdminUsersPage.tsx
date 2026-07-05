import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AppLayout from '../components/layout/AppLayout';
import { api } from '../constants/api';
import { useAuth } from '../lib/auth';
import { invoicesApi } from '../api/invoices';

interface User {
  id: string | number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  is_priority: boolean;
}

export default function AdminUsersPage() {
  const envAdmins = import.meta.env.VITE_ADMIN_EMAILS ? import.meta.env.VITE_ADMIN_EMAILS.split(',').map((e: string) => e.trim().toLowerCase()) : [];
  const { user: currentUser, isAdmin } = useAuth();
  if (!isAdmin) {
    window.location.href = '/';
    return null;
  }
  const [users, setUsers] = useState<User[]>([]);
  const [clientName, setClientName] = useState<string>('');
  const [clientEmail, setClientEmail] = useState<string>('');
  const [clientPassword, setClientPassword] = useState<string>('');
  const [adminEmailInput, setAdminEmailInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [newClientCreds, setNewClientCreds] = useState<{ email: string; password?: string; isAdmin?: boolean } | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [activeReportTab, setActiveReportTab] = useState<'profile' | 'sessions' | 'metrics' | 'invoices'>('profile');

  const fetchUsers = async () => {
    try {
      const data = await api.adminGetUsers();
      setUsers(data || []);
    } catch (err: any) {
      console.error(err);
      setMessage({ text: err.message || 'Failed to fetch users', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchMeetings = async () => {
    try {
      const data = await api.adminGetMeetings();
      setMeetings(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const data = await invoicesApi.getInvoices();
      setInvoices(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchMeetings();
    fetchInvoices();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      const freshUser = users.find(u => u.id === selectedUser.id);
      if (freshUser) {
        setSelectedUser(freshUser);
      } else {
        setSelectedUser(null);
      }
    }
  }, [users, selectedUser?.id]);

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim() || !clientPassword.trim()) return;
    setActionLoading(true);
    setMessage(null);
    setNewClientCreds(null);
    try {
      const res = await api.adminCreateUser({
        name: clientName.trim(),
        email: clientEmail.trim(),
        password: clientPassword.trim(),
        role: 'client'
      });
      setMessage({ text: `Successfully created client account for ${res.name}`, type: 'success' });
      setClientName('');
      setClientEmail('');
      setClientPassword('');
      setNewClientCreds({
        email: res.email,
        password: clientPassword.trim()
      });
      await fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to create client account', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminEmailInput.trim()) return;
    setActionLoading(true);
    setMessage(null);
    setNewClientCreds(null);
    try {
      const res = await api.adminPromoteUser({ email: adminEmailInput.trim() });
      setMessage({ text: res.message, type: 'success' });
      setAdminEmailInput('');
      if (res.created_new && res.user.temporary_password) {
        setNewClientCreds({
          email: res.user.email,
          password: res.user.temporary_password,
          isAdmin: true
        });
      }
      await fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to promote user', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteUser = async (email: string) => {
    if (!window.confirm(`Are you sure you want to promote '${email}' to admin?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.adminPromoteUser({ email });
      setMessage({ text: res.message, type: 'success' });
      await fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to promote user', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemoteUser = async (email: string) => {
    if (!window.confirm(`Are you sure you want to demote admin '${email}' to a regular client?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.adminDemoteUser({ email });
      setMessage({ text: res.message, type: 'success' });
      await fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to demote user', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user: User) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const newStatus = !user.is_active;
      await api.adminUpdateUserStatus(user.id, { is_active: newStatus });
      setMessage({ text: `Account status for ${user.name} successfully updated`, type: 'success' });
      await fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update user status', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePriority = async (user: User) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const newPriority = !user.is_priority;
      await api.adminUpdateUserPriority(user.id, { is_priority: newPriority });
      setMessage({ text: `Priority status for ${user.name} successfully updated`, type: 'success' });
      await fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to update user priority', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`Warning: Are you absolutely sure you want to permanently delete user '${user.name}' (${user.email})?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      await api.adminDeleteUser(user.id);
      setMessage({ text: `Successfully deleted user ${user.name}`, type: 'success' });
      await fetchUsers();
    } catch (err: any) {
      setMessage({ text: err.message || 'Failed to delete user', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const filteredUsers = users.filter(u => 
    u.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout title="Manage Users">
      <div className="relative space-y-6">
        <div className="absolute top-[-10%] left-[20%] w-[600px] h-[600px] bg-[radial-gradient(circle,rgba(59,130,246,0.04)_0%,transparent_65%)] rounded-full filter blur-[80px] pointer-events-none z-0" />

        {/* Page Header */}
        <div className="flex justify-between items-center relative z-10">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 font-heading">User & Role Management</h1>
            <p className="text-slate-500 text-xs mt-1">Add admins, manage client accounts, and revoke admin permissions.</p>
          </div>
        </div>

        {/* Status Messages */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`p-4 rounded-xl text-sm flex items-center gap-2 border relative z-10 ${
                message.type === 'success' 
                  ? 'bg-green-50 border-green-200 text-green-700' 
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {message.type === 'success' ? 'check_circle' : 'error'}
              </span>
              <span>{message.text}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Add User Forms Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {/* Create Client Form */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 font-heading">Create Client Account</h3>
            <form onSubmit={handleCreateClient} className="space-y-4">
              <input 
                type="text" 
                placeholder="Client Full Name"
                value={clientName} 
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10 transition-all"
                required
              />
              <input 
                type="email" 
                placeholder="Client Email"
                value={clientEmail} 
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10 transition-all"
                required
              />
              <input 
                type="password" 
                placeholder="Initial Password"
                value={clientPassword} 
                onChange={(e) => setClientPassword(e.target.value)}
                className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-800 outline-none focus:border-[#4F46E5] focus:bg-white focus:ring-4 focus:ring-[#4F46E5]/10 transition-all"
                required
              />
              <button 
                type="submit" 
                disabled={actionLoading}
                className="px-4 py-2 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-bold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50"
              >
                Create Client
              </button>
            </form>
          </div>

          {/* Promote Admin Form Removed */}
        </div>

        {/* User Table Section */}
        <div className="relative z-10 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-heading">
              Registered Accounts ({filteredUsers.length})
            </h3>
            
            {/* Search Bar */}
            <div className="relative w-full max-w-[300px]">
              <span className="material-symbols-outlined absolute left-3 top-[50%] -translate-y-[50%] text-lg text-slate-400">search</span>
              <input 
                type="text" 
                placeholder="Search user by name or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-2 text-xs text-slate-800 outline-none focus:border-[#4F46E5] focus:ring-4 focus:ring-[#4F46E5]/10 transition-all"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-[50%] -translate-y-[50%] text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              )}
            </div>
          </div>
          
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">User</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Role</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Priority</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="px-5 py-3.5"><div className="h-4 w-32 bg-slate-200 rounded" /></td>
                      <td className="px-5 py-3.5"><div className="h-5 w-12 bg-slate-200 rounded" /></td>
                      <td className="px-5 py-3.5"><div className="h-5 w-14 bg-slate-200 rounded" /></td>
                      <td className="px-5 py-3.5"><div className="h-5 w-12 bg-slate-200 rounded" /></td>
                      <td className="px-5 py-3.5 text-right"><div className="h-6 w-20 bg-slate-200 rounded inline-block" /></td>
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-slate-400 text-xs">
                      No accounts found.
                    </td>
                  </tr>
                ) : filteredUsers.map((u) => {
                  const isSelf = u.id === currentUser?.id;
                  const userIsAdmin = u.role === 'admin';
                  
                  return (
                    <tr 
                      key={u.id} 
                      onClick={() => setSelectedUser(u)}
                      className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${isSelf ? 'bg-[#4F46E5]/[0.01]' : ''}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0 shadow-sm"
                            style={{
                              background: userIsAdmin 
                                ? 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)' 
                                : 'linear-gradient(135deg, #94A3B8 0%, #cbd5e1 100%)'
                            }}
                          >
                            {u.name ? u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                              {u.name}
                              {isSelf && <span className="text-[9px] px-1.5 py-0.5 bg-slate-100 text-slate-500 border border-slate-200 rounded font-bold font-mono">YOU</span>}
                            </p>
                            <p className="text-[10px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-5 py-3.5 text-xs">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono ${
                          userIsAdmin 
                            ? 'bg-[#4F46E5]/10 text-[#4F46E5] border-[#4F46E5]/15' 
                            : 'bg-lime-500/10 text-lime-600 border-lime-500/15'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      
                      <td className="px-5 py-3.5 text-xs">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono ${
                          u.is_priority 
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/15' 
                            : 'bg-slate-50 text-slate-400 border-slate-200'
                        }`}>
                          {u.is_priority ? '⭐ Priority' : 'Standard'}
                        </span>
                      </td>
                      
                      <td className="px-5 py-3.5 text-xs">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border font-mono ${
                          u.is_active 
                            ? 'bg-lime-500/10 text-lime-600 border-lime-500/15' 
                            : 'bg-red-50 text-red-500 border-red-200'
                        }`}>
                          {u.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      
                      <td className="px-5 py-3.5 text-right text-xs" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-2 justify-end items-center">
                          {!isSelf && (
                            <>
                              {userIsAdmin ? (
                                !envAdmins.includes(u.email?.toLowerCase() || '') && (
                                  <button
                                    onClick={() => handleDemoteUser(u.email)}
                                    className="px-2.5 py-1 text-[11px] font-bold rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                                    disabled={actionLoading}
                                  >
                                    Demote
                                  </button>
                                )
                              ) : null}

                              {!userIsAdmin && (
                                <button
                                  onClick={() => handleTogglePriority(u)}
                                  className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                                    u.is_priority 
                                      ? 'border-slate-200 text-slate-500 hover:bg-slate-50' 
                                      : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                                  }`}
                                  disabled={actionLoading}
                                >
                                  {u.is_priority ? 'Make Standard' : 'Make Priority'}
                                </button>
                              )}

                              <button
                                onClick={() => handleToggleStatus(u)}
                                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                                  u.is_active 
                                    ? 'border-red-200 text-red-500 hover:bg-red-50' 
                                    : 'border-green-200 text-green-600 hover:bg-green-50'
                                }`}
                                disabled={actionLoading}
                              >
                                {u.is_active ? 'Deactivate' : 'Activate'}
                              </button>
                              
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-all cursor-pointer"
                                disabled={actionLoading}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden flex flex-col gap-3 p-4">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="border border-slate-200 bg-white rounded-2xl p-4 flex gap-3 animate-pulse">
                  <div className="h-8 w-8 rounded-full bg-slate-200" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 w-[40%] bg-slate-200" />
                    <div className="h-3 w-[60%] bg-slate-200" />
                  </div>
                </div>
              ))
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-6 text-slate-400 text-xs">
                No accounts found.
              </div>
            ) : filteredUsers.map((u) => {
              const isSelf = u.id === currentUser?.id;
              const userIsAdmin = u.role === 'admin';
              return (
                <div 
                  key={u.id} 
                  onClick={() => setSelectedUser(u)}
                  className={`border rounded-2xl p-4 flex flex-col gap-3 cursor-pointer transition-all ${
                    isSelf ? 'border-[#4F46E5]/20 bg-[#4F46E5]/[0.01]' : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black text-white flex-shrink-0"
                        style={{
                          background: userIsAdmin 
                            ? 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)' 
                            : 'linear-gradient(135deg, #94A3B8 0%, #cbd5e1 100%)'
                        }}
                      >
                        {u.name ? u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?'}
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          {u.name}
                          {isSelf && <span className="text-[8px] px-1 bg-slate-100 text-slate-500 rounded font-bold font-mono">YOU</span>}
                        </p>
                        <p className="text-[10px] text-slate-400">{u.email}</p>
                      </div>
                    </div>
                    
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono ${
                      u.is_active 
                        ? 'bg-lime-500/10 text-lime-600 border-lime-500/15' 
                        : 'bg-red-50 text-red-500 border-red-200'
                    }`}>
                      {u.is_active ? 'Active' : 'Disabled'}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <span className={`text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono ${
                      userIsAdmin 
                        ? 'bg-[#4F46E5]/10 text-[#4F46E5] border-[#4F46E5]/15' 
                        : 'bg-lime-500/10 text-lime-600 border-lime-500/15'
                    }`}>
                      {u.role}
                    </span>
                    <span className={`text-[8.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border font-mono ${
                      u.is_priority 
                        ? 'bg-amber-500/10 text-amber-600 border-amber-500/15' 
                        : 'bg-slate-50 text-slate-400 border-slate-200'
                    }`}>
                      {u.is_priority ? '⭐ Priority' : 'Standard'}
                    </span>
                  </div>

                  {!isSelf && (
                    <div className="flex gap-1.5 flex-wrap border-t border-slate-100 pt-2.5 mt-1" onClick={(e) => e.stopPropagation()}>
                      {userIsAdmin ? (
                        !envAdmins.includes(u.email?.toLowerCase() || '') && (
                          <button
                            onClick={() => handleDemoteUser(u.email)}
                            className="px-2.5 py-1 text-[10px] font-bold rounded-lg border border-orange-200 text-orange-600 hover:bg-orange-50 transition-colors cursor-pointer"
                            disabled={actionLoading}
                          >
                            Demote
                          </button>
                        )
                      ) : null}

                      {!userIsAdmin && (
                        <button
                          onClick={() => handleTogglePriority(u)}
                          className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                            u.is_priority 
                              ? 'border-slate-200 text-slate-500 hover:bg-slate-50' 
                              : 'border-amber-200 text-amber-600 hover:bg-amber-50'
                          }`}
                          disabled={actionLoading}
                        >
                          {u.is_priority ? 'Standard' : 'Priority'}
                        </button>
                      )}

                      <button
                        onClick={() => handleToggleStatus(u)}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border transition-colors cursor-pointer ${
                          u.is_active 
                            ? 'border-red-200 text-red-500' 
                            : 'border-green-200 text-green-600'
                        }`}
                        disabled={actionLoading}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="px-2.5 py-1 text-[10px] font-bold rounded-lg bg-red-500 text-white hover:bg-red-600 cursor-pointer ml-auto"
                        disabled={actionLoading}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Slide-over User Details Drawer */}
      <AnimatePresence>
        {selectedUser && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              className="fixed inset-0 bg-black z-[999]"
            />

            {/* Slide-over Drawer Panel */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 w-full h-full bg-[#f8f9fa] shadow-2xl z-[1000] flex flex-col p-8 overflow-y-auto font-sans"
            >
              {/* Drawer Header */}
              <div className="flex justify-between items-center pb-4 border-b border-slate-200 mb-6">
                <div>
                  <h3 className="text-2xl font-black text-slate-900 font-heading tracking-tight">User Profile Report</h3>
                  <p className="text-slate-400 text-xs mt-0.5">Comprehensive overview of user details, activity, and financial records.</p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-50 cursor-pointer shadow-sm transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>

              {/* Drawer Content (Full Page Layout) */}
              {(() => {
                const userMeetings = meetings.filter(m => m.client_email === selectedUser.email);
                const total = userMeetings.length;
                const approved = userMeetings.filter(m => m.status === 'approved').length;
                const attended = userMeetings.filter(m => m.status === 'completed').length;
                const rescheduled = userMeetings.filter(m => m.status === 'rescheduled' || m.status === 'reschedule_requested').length;
                const cancelled = userMeetings.filter(m => m.status === 'rejected' || m.status === 'cancelled').length;

                const userInvoices = invoices.filter(i => i.client_email === selectedUser.email);
                const totalInv = userInvoices.length;
                const clearedInv = userInvoices.filter(i => i.status === 'paid' || i.status === 'cleared');
                const pendingInv = userInvoices.filter(i => i.status !== 'paid' && i.status !== 'cleared');
                const clearedCount = clearedInv.length;
                const pendingCount = pendingInv.length;

                return (
                  <div className="flex-1 flex flex-col gap-6 max-w-4xl mx-auto w-full">
                    {/* Centered Tab Buttons */}
                    <div className="flex justify-center mb-2 w-full">
                      <div className="flex flex-nowrap overflow-x-auto gap-1.5 p-1 bg-slate-200/60 rounded-2xl border border-slate-150/80 w-full max-w-3xl shadow-sm scrollbar-none">
                        <button
                          type="button"
                          onClick={() => setActiveReportTab('profile')}
                          className={`flex-1 min-w-[120px] sm:min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-extrabold tracking-wide transition-all cursor-pointer text-center whitespace-nowrap ${
                            activeReportTab === 'profile' 
                              ? 'bg-white text-slate-900 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          User Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveReportTab('sessions')}
                          className={`flex-1 min-w-[120px] sm:min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-extrabold tracking-wide transition-all cursor-pointer text-center whitespace-nowrap ${
                            activeReportTab === 'sessions' 
                              ? 'bg-white text-slate-900 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          Session History
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveReportTab('metrics')}
                          className={`flex-1 min-w-[150px] sm:min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-extrabold tracking-wide transition-all cursor-pointer text-center whitespace-nowrap ${
                            activeReportTab === 'metrics' 
                              ? 'bg-white text-slate-900 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          Booking & Financial Metrics
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveReportTab('invoices')}
                          className={`flex-1 min-w-[120px] sm:min-w-0 py-2.5 px-3 rounded-xl text-[11px] font-extrabold tracking-wide transition-all cursor-pointer text-center whitespace-nowrap ${
                            activeReportTab === 'invoices' 
                              ? 'bg-white text-slate-900 shadow-sm' 
                              : 'text-slate-500 hover:text-slate-850'
                          }`}
                        >
                          Invoices ({totalInv})
                        </button>
                      </div>
                    </div>

                    {/* Active Tab Panel */}
                    <div className="flex-1 w-full">
                      {/* User Profile Card */}
                      {activeReportTab === 'profile' && (
                        <div className="bg-white rounded-3xl p-8 border border-slate-200/50 shadow-sm space-y-6 animate-fade-in max-w-2xl mx-auto">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-xl">person</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">User Profile</h4>
                              <p className="text-slate-400 text-[10px] font-medium">Identification & Account Details</p>
                            </div>
                          </div>

                          <div className="space-y-4 pt-2">
                            <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2 text-slate-500 font-medium">
                                <span className="material-symbols-outlined text-base text-slate-400">person</span>
                                <span>Name</span>
                              </div>
                              <span className="text-slate-900 font-bold">{selectedUser.name}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2 text-slate-500 font-medium">
                                <span className="material-symbols-outlined text-base text-slate-400">mail</span>
                                <span>Email Address</span>
                              </div>
                              <span className="text-slate-900 font-semibold">{selectedUser.email}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2 text-slate-500 font-medium">
                                <span className="material-symbols-outlined text-base text-slate-400">badge</span>
                                <span>Account Role</span>
                              </div>
                              <span className={`text-[8.5px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                                selectedUser.role === 'admin' 
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-100' 
                                  : 'bg-lime-50 text-lime-700 border-lime-100'
                              }`}>{selectedUser.role}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs border-b border-slate-100 pb-3">
                              <div className="flex items-center gap-2 text-slate-500 font-medium">
                                <span className="material-symbols-outlined text-base text-slate-400">workspace_premium</span>
                                <span>Priority Tier</span>
                              </div>
                              <span className={`text-[8.5px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                                selectedUser.is_priority 
                                  ? 'bg-amber-50 text-amber-700 border-amber-100' 
                                  : 'bg-slate-50 text-slate-500 border-slate-100'
                              }`}>{selectedUser.is_priority ? 'Priority' : 'Standard'}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                              <div className="flex items-center gap-2 text-slate-500 font-medium">
                                <span className="material-symbols-outlined text-base text-slate-400">check_circle</span>
                                <span>Account Status</span>
                              </div>
                              <span className={`text-[8.5px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                                selectedUser.is_active 
                                  ? 'bg-green-50 text-green-700 border-green-150' 
                                  : 'bg-red-50 text-red-700 border-red-150'
                              }`}>{selectedUser.is_active ? 'Active' : 'Disabled'}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Session History Card */}
                      {activeReportTab === 'sessions' && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm flex flex-col min-h-[290px] animate-fade-in max-w-2xl mx-auto">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-xl">calendar_month</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">Session History</h4>
                              <p className="text-slate-400 text-[10px] font-medium">Recent sessions and their current status.</p>
                            </div>
                          </div>

                          <div className="flex-1 overflow-hidden">
                            {userMeetings.length === 0 ? (
                              <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs py-8">
                                No sessions booked yet by this user.
                              </div>
                            ) : (
                              <div className="overflow-x-auto h-full">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                                      <th className="pb-3">Meeting Title</th>
                                      <th className="pb-3">Date</th>
                                      <th className="pb-3">Type</th>
                                      <th className="pb-3 text-right">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {userMeetings.slice(0, 3).map((m) => {
                                      const isPending = m.status === 'pending' || m.status === 'reschedule_requested';
                                      const isApproved = m.status === 'approved' || m.status === 'rescheduled';
                                      const isCompleted = m.status === 'completed';
                                      
                                      const badgeStyles = isCompleted
                                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                                        : isApproved
                                        ? 'bg-green-50 text-green-700 border-green-100'
                                        : isPending
                                        ? 'bg-amber-50 text-amber-700 border-amber-100'
                                        : 'bg-red-50 text-red-700 border-red-100';

                                      return (
                                        <tr key={m.id} className="hover:bg-slate-50/40 transition-colors">
                                          <td className="py-3 text-slate-900 font-semibold max-w-[200px] truncate">{m.title}</td>
                                          <td className="py-3 text-slate-500">
                                            <div className="flex items-center gap-1">
                                              <span className="material-symbols-outlined text-[14px] text-slate-400">calendar_today</span>
                                              <span>{m.display_date || (m.start_time ? m.start_time.split('T')[0] : 'TBD')}</span>
                                            </div>
                                          </td>
                                          <td className="py-3 text-slate-400 font-medium">{m.meeting_type}</td>
                                          <td className="py-3 text-right">
                                            <span className={`text-[8.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${badgeStyles}`}>
                                              {m.status}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                          {userMeetings.length > 3 && (
                            <button
                              onClick={() => alert("Showing all session logs.")}
                              className="w-full bg-[#f0f4f9] hover:bg-[#e4ebf5] text-sky-700 text-xs font-bold py-2.5 rounded-xl transition-all text-center block mt-4 cursor-pointer"
                            >
                              View all sessions
                            </button>
                          )}
                        </div>
                      )}

                      {/* Booking & Financial Metrics Card */}
                      {activeReportTab === 'metrics' && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm space-y-4 animate-fade-in max-w-2xl mx-auto">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-xl">analytics</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">Booking & Financial Metrics</h4>
                              <p className="text-slate-400 text-[10px] font-medium">Overview of engagement and finances</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-2">
                            {/* Total Bookings */}
                            <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/20">
                              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-lg">event_note</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Total Bookings</span>
                                <span className="text-base font-black text-slate-800">{total}</span>
                              </div>
                            </div>
                            {/* Attended Sessions */}
                            <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/20">
                              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-lg">how_to_reg</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Attended Sessions</span>
                                <span className="text-base font-black text-purple-600">{attended}</span>
                              </div>
                            </div>
                            {/* Confirmed (Approved) */}
                            <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/20">
                              <div className="w-9 h-9 rounded-xl bg-green-500/10 text-green-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-lg">check_circle</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Confirmed (Approved)</span>
                                <span className="text-base font-black text-green-600">{approved}</span>
                              </div>
                            </div>
                            {/* Rescheduled Sessions */}
                            <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/20">
                              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-500 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-lg">history</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Rescheduled Sessions</span>
                                <span className="text-base font-black text-orange-500">{rescheduled}</span>
                              </div>
                            </div>
                            {/* Cancelled / Declined */}
                            <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/20">
                              <div className="w-9 h-9 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-lg">cancel</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Cancelled / Declined</span>
                                <span className="text-base font-black text-red-500">{cancelled}</span>
                              </div>
                            </div>
                            {/* Cleared Invoices */}
                            <div className="flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/20">
                              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-lg">receipt_long</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Cleared Invoices</span>
                                <span className="text-base font-black text-emerald-600">{clearedCount}</span>
                              </div>
                            </div>
                            {/* Pending Invoices */}
                            <div className="col-span-2 flex items-center gap-3.5 p-3 rounded-2xl border border-slate-100 bg-slate-50/20">
                              <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                <span className="material-symbols-outlined text-lg">pending_actions</span>
                              </div>
                              <div>
                                <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">Pending Invoices</span>
                                <span className="text-base font-black text-amber-600">{pendingCount}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Invoices Card */}
                      {activeReportTab === 'invoices' && (
                        <div className="bg-white rounded-3xl p-6 border border-slate-200/50 shadow-sm flex flex-col min-h-[290px] animate-fade-in max-w-2xl mx-auto">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                              <span className="material-symbols-outlined text-xl">description</span>
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-slate-900">Invoices</h4>
                              <p className="text-slate-400 text-[10px] font-medium">Overview of invoices and payment status.</p>
                            </div>
                          </div>

                          <div className="flex-1 overflow-hidden">
                            {totalInv === 0 ? (
                              <div className="h-full flex items-center justify-center border border-dashed border-slate-200 rounded-2xl text-center text-slate-400 text-xs py-8">
                                No invoices generated for this user.
                              </div>
                            ) : (
                              <div className="overflow-x-auto h-full">
                                <table className="w-full text-left border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-slate-100 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
                                      <th className="pb-3">Invoice Name</th>
                                      <th className="pb-3">Value</th>
                                      <th className="pb-3">Raised Date</th>
                                      <th className="pb-3 text-right">Status</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {userInvoices.slice(0, 3).map((inv) => {
                                      const isCleared = inv.status === 'paid' || inv.status === 'cleared';
                                      return (
                                        <tr key={inv.id} className="hover:bg-slate-50/40 transition-colors">
                                          <td className="py-3 text-slate-900 font-semibold max-w-[200px] truncate">{inv.name}</td>
                                          <td className="py-3 text-slate-900 font-bold">${inv.value}</td>
                                          <td className="py-3 text-slate-500">
                                            <div className="flex items-center gap-1">
                                              <span className="material-symbols-outlined text-[14px] text-slate-400">calendar_today</span>
                                              <span>{inv.raised_date ? inv.raised_date.split('T')[0] : 'N/A'}</span>
                                            </div>
                                          </td>
                                          <td className="py-3 text-right">
                                            <span className={`text-[8.5px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-md border ${
                                              isCleared ? 'bg-green-50 text-green-700 border-green-100' : 'bg-orange-50 text-orange-700 border-orange-100'
                                            }`}>
                                              {inv.status === 'paid' ? 'PAID' : inv.status.toUpperCase()}
                                            </span>
                                          </td>
                                        </tr>
                                      );
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                          {totalInv > 3 && (
                            <button
                              onClick={() => alert("Showing all invoices logs.")}
                              className="w-full bg-[#f0f4f9] hover:bg-[#e4ebf5] text-sky-700 text-xs font-bold py-2.5 rounded-xl transition-all text-center block mt-4 cursor-pointer"
                            >
                              View all invoices
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Insights Footer Card */}
                    <div className="bg-[#f0f4f9]/50 border border-sky-100 rounded-2xl p-4 flex items-start gap-3 mt-4 max-w-3xl mx-auto w-full">
                      <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                        <span className="material-symbols-outlined text-lg">info</span>
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-800">Insights</h5>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-medium">
                          This user has {approved} confirmed session{approved !== 1 ? 's' : ''} and {clearedCount} cleared invoice{clearedCount !== 1 ? 's' : ''}. Please follow up on {pendingCount} pending invoice{pendingCount !== 1 ? 's' : ''} and any required session actions.
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </AppLayout>
  );
}
