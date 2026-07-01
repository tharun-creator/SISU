import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { api } from '../constants/api';
import { useAuth } from '../lib/auth';

export default function AdminUsersPage() {
  const { user: currentUser, isAdmin } = useAuth();
  if (!isAdmin) {
    window.location.href = '/';
    return null;
  }
  const [users, setUsers] = useState([]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [adminEmailInput, setAdminEmailInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null); // { text, type: 'success' | 'error' }
  const [newClientCreds, setNewClientCreds] = useState(null); // { email, password, isAdmin }
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [meetings, setMeetings] = useState([]);

  const fetchUsers = async () => {
    try {
      const data = await api.adminGetUsers();
      setUsers(data || []);
    } catch (err) {
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

  useEffect(() => {
    fetchUsers();
    fetchMeetings();
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

  const handleCreateClient = async (e) => {
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
    } catch (err) {
      setMessage({ text: err.message || 'Failed to create client account', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteAdmin = async (e) => {
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
    } catch (err) {
      setMessage({ text: err.message || 'Failed to promote user', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePromoteUser = async (email) => {
    if (!window.confirm(`Are you sure you want to promote '${email}' to admin?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.adminPromoteUser({ email });
      setMessage({ text: res.message, type: 'success' });
      await fetchUsers();
    } catch (err) {
      setMessage({ text: err.message || 'Failed to promote user', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemoteUser = async (email) => {
    if (!window.confirm(`Are you sure you want to demote admin '${email}' to a regular client?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await api.adminDemoteUser({ email });
      setMessage({ text: res.message, type: 'success' });
      await fetchUsers();
    } catch (err) {
      setMessage({ text: err.message || 'Failed to demote user', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleStatus = async (user) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const newStatus = !user.is_active;
      await api.adminUpdateUserStatus(user.id, { is_active: newStatus });
      setMessage({ text: `Account status for ${user.name} successfully updated`, type: 'success' });
      await fetchUsers();
    } catch (err) {
      setMessage({ text: err.message || 'Failed to update user status', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePriority = async (user) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const newPriority = !user.is_priority;
      await api.adminUpdateUserPriority(user.id, { is_priority: newPriority });
      setMessage({ text: `Priority status for ${user.name} successfully updated`, type: 'success' });
      await fetchUsers();
    } catch (err) {
      setMessage({ text: err.message || 'Failed to update user priority', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user) => {
    if (!window.confirm(`Warning: Are you absolutely sure you want to permanently delete user '${user.name}' (${user.email})?`)) return;
    setActionLoading(true);
    setMessage(null);
    try {
      await api.adminDeleteUser(user.id);
      setMessage({ text: `Successfully deleted user ${user.name}`, type: 'success' });
      await fetchUsers();
    } catch (err) {
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
    <Layout title="Manage Users">
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>User & Role Management</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, marginBottom: 0 }}>Add admins, manage client accounts, and revoke admin permissions.</p>
          </div>
        </div>

        {/* Status Messages */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding: '12px 16px',
                background: message.type === 'success' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                borderRadius: 12,
                color: message.type === 'success' ? 'var(--color-green)' : 'var(--color-red)',
                fontSize: 13,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                zIndex: 1,
                position: 'relative'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {message.type === 'success' ? 'check_circle' : 'error'}
              </span>
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* Right Column: User list Table */}
          <div className="glass-premium" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 20, borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                Registered Accounts ({filteredUsers.length})
              </h3>
              
              {/* Search Bar */}
              <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
                <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 18, color: 'var(--color-text-muted)' }}>search</span>
                <input 
                  type="text" 
                  placeholder="Search user by name or email..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-premium"
                  style={{ padding: '8px 12px 8px 38px', fontSize: 13, width: '100%', boxSizing: 'border-box' }}
                />
                {searchQuery && (
                  <button 
                    onClick={() => setSearchQuery('')}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </button>
                )}
              </div>
            </div>
            
            {/* Desktop Table View */}
            <div className="desktop-only-table" style={{ width: '100%' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.01)' }}>
                      <th style={{ padding: '12px 18px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>User</th>
                      <th style={{ padding: '12px 18px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Role</th>
                      <th style={{ padding: '12px 18px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Priority</th>
                      <th style={{ padding: '12px 18px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Status</th>
                      <th style={{ padding: '12px 18px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ height: 14, width: 140 }} /></td>
                          <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ height: 18, width: 60, borderRadius: 6 }} /></td>
                          <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ height: 18, width: 50, borderRadius: 6 }} /></td>
                          <td style={{ padding: '14px 18px' }}><div className="skeleton-pulse" style={{ height: 18, width: 50, borderRadius: 6 }} /></td>
                          <td style={{ padding: '14px 18px', textAlign: 'right' }}><div className="skeleton-pulse" style={{ height: 24, width: 100, borderRadius: 6, display: 'inline-block' }} /></td>
                        </tr>
                      ))
                    ) : filteredUsers.length === 0 ? (
                      <tr>
                        <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                          No accounts found.
                        </td>
                      </tr>
                    ) : filteredUsers.map((u) => {
                      const isSelf = u.id === currentUser?.id;
                      const isAdmin = u.role === 'admin';
                      
                      return (
                        <tr 
                          key={u.id} 
                          onClick={() => setSelectedUser(u)}
                          style={{ 
                            borderBottom: '1px solid var(--color-border)', 
                            background: isSelf ? 'rgba(59, 130, 246, 0.01)' : 'transparent',
                            cursor: 'pointer',
                            transition: 'var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = isSelf ? 'rgba(59, 130, 246, 0.01)' : 'transparent'; }}
                        >
                          <td style={{ padding: '14px 18px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: isAdmin ? 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-cyan) 100%)' : 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--color-border)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 10,
                                fontWeight: 800,
                                color: 'white',
                                flexShrink: 0
                              }}>
                                {u.name ? u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?'}
                              </div>
                              <div style={{ minWidth: 0 }}>
                                <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {u.name}
                                  {isSelf && <span style={{ fontSize: 9, padding: '1px 5px', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 4, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>YOU</span>}
                                </p>
                                <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0, textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>{u.email}</p>
                              </div>
                            </div>
                          </td>
                          
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: isAdmin ? 'rgba(59,130,246,0.1)' : 'rgba(132,204,22,0.1)',
                              color: isAdmin ? 'var(--color-accent)' : '#84cc16',
                              border: `1px solid ${isAdmin ? 'rgba(59,130,246,0.15)' : 'rgba(132,204,22,0.15)'}`,
                              fontFamily: 'var(--font-mono)',
                              textTransform: 'uppercase'
                            }}>
                              {u.role}
                            </span>
                          </td>
                          
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: u.is_priority ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.03)',
                              color: u.is_priority ? '#eab308' : 'var(--color-text-muted)',
                              border: `1px solid ${u.is_priority ? 'rgba(234,179,8,0.15)' : 'var(--color-border)'}`,
                              fontFamily: 'var(--font-mono)',
                              textTransform: 'uppercase'
                            }}>
                              {u.is_priority ? '⭐ Priority' : 'Standard'}
                            </span>
                          </td>
                          
                          <td style={{ padding: '14px 18px' }}>
                            <span style={{
                              fontSize: 9.5,
                              fontWeight: 800,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: u.is_active ? 'rgba(132,204,22,0.1)' : 'rgba(239,68,68,0.1)',
                              color: u.is_active ? '#84cc16' : '#ef4444',
                              border: `1px solid ${u.is_active ? 'rgba(132,204,22,0.15)' : 'rgba(239,68,68,0.15)'}`,
                              fontFamily: 'var(--font-mono)',
                              textTransform: 'uppercase'
                            }}>
                              {u.is_active ? 'Active' : 'Disabled'}
                            </span>
                          </td>
                          
                          <td style={{ padding: '14px 18px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                              {!isSelf && (
                                <>
                                  {/* Promote / Demote Action */}
                                  {isAdmin ? (
                                    u.email?.toLowerCase() !== 'tharunriot@gmail.com' && (
                                      <button
                                        onClick={() => handleDemoteUser(u.email)}
                                        className="btn-premium btn-premium-ghost"
                                        style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, color: 'var(--color-accent-orange)', border: '1px solid rgba(249,115,22,0.08)' }}
                                        title="Demote to client"
                                        disabled={actionLoading}
                                      >
                                        Demote
                                      </button>
                                    )
                                  ) : (
                                    <button
                                      onClick={() => handlePromoteUser(u.email)}
                                      className="btn-premium btn-premium-ghost"
                                      style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, color: 'var(--color-accent)', border: '1px solid rgba(59,130,246,0.08)' }}
                                      title="Promote to admin"
                                      disabled={actionLoading}
                                    >
                                      Promote
                                    </button>
                                  )}

                                  {/* Toggle Priority */}
                                  {!isAdmin && (
                                    <button
                                      onClick={() => handleTogglePriority(u)}
                                      className="btn-premium btn-premium-ghost"
                                      style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, color: u.is_priority ? 'var(--color-text-muted)' : '#eab308', border: u.is_priority ? '1px solid var(--color-border)' : '1px solid rgba(234,179,8,0.08)' }}
                                      title={u.is_priority ? 'Make standard client' : 'Make priority client'}
                                      disabled={actionLoading}
                                    >
                                      {u.is_priority ? 'Make Standard' : 'Make Priority'}
                                    </button>
                                  )}

                                  {/* Enable / Disable Status */}
                                  <button
                                    onClick={() => handleToggleStatus(u)}
                                    className="btn-premium btn-premium-ghost"
                                    style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, color: u.is_active ? 'var(--color-red)' : 'var(--color-green)' }}
                                    title={u.is_active ? 'Deactivate account' : 'Activate account'}
                                    disabled={actionLoading}
                                  >
                                    {u.is_active ? 'Deactivate' : 'Activate'}
                                  </button>
                                  
                                  {/* Delete Account */}
                                  <button
                                    onClick={() => handleDeleteUser(u)}
                                    className="btn-premium btn-premium-danger"
                                    style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, minWidth: 'auto' }}
                                    title="Delete Account"
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
            </div>

            {/* Mobile Cards View */}
            <div className="mobile-only-cards" style={{ display: 'none', flexDirection: 'column', gap: 12, padding: 16 }}>
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="glass-premium" style={{ padding: 16, borderRadius: 12, border: '1px solid var(--color-border)', background: 'var(--glass-bg)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <div className="skeleton-pulse" style={{ height: 28, width: 28, borderRadius: '50%' }} />
                      <div style={{ flex: 1 }}><div className="skeleton-pulse" style={{ height: 12, width: '40%', marginBottom: 4 }} /><div className="skeleton-pulse" style={{ height: 10, width: '60%' }} /></div>
                    </div>
                  </div>
                ))
              ) : filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                  No accounts found.
                </div>
              ) : filteredUsers.map((u) => {
                const isSelf = u.id === currentUser?.id;
                const isAdmin = u.role === 'admin';
                return (
                  <div 
                    key={u.id} 
                    className="glass-premium"
                    onClick={() => setSelectedUser(u)}
                    style={{ 
                      padding: 16, 
                      borderRadius: 12, 
                      border: '1px solid var(--color-border)', 
                      background: isSelf ? 'rgba(59, 130, 246, 0.01)' : 'var(--glass-bg)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 12,
                      cursor: 'pointer'
                    }}
                  >
                    {/* User profile row */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          background: isAdmin ? 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-cyan) 100%)' : 'rgba(255,255,255,0.03)',
                          border: '1px solid var(--color-border)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 800,
                          color: 'white',
                          flexShrink: 0
                        }}>
                          {u.name ? u.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?'}
                        </div>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                            {u.name}
                            {isSelf && <span style={{ fontSize: 8.5, padding: '1px 5px', background: 'rgba(255,255,255,0.05)', color: 'var(--color-text-muted)', border: '1px solid var(--color-border)', borderRadius: 4, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>YOU</span>}
                          </p>
                          <p style={{ fontSize: 11, color: 'var(--color-text-secondary)', margin: 0 }}>{u.email}</p>
                        </div>
                      </div>
                      
                      {/* Active Status Badge */}
                      <span style={{
                        fontSize: 9,
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 6,
                        background: u.is_active ? 'rgba(132,204,22,0.1)' : 'rgba(239,68,68,0.1)',
                        color: u.is_active ? '#84cc16' : '#ef4444',
                        border: `1px solid ${u.is_active ? 'rgba(132,204,22,0.15)' : 'rgba(239,68,68,0.15)'}`,
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase'
                      }}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    </div>

                    {/* Meta Row: Role and Priority */}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: isAdmin ? 'rgba(59,130,246,0.1)' : 'rgba(132,204,22,0.1)',
                        color: isAdmin ? 'var(--color-accent)' : '#84cc16',
                        border: `1px solid ${isAdmin ? 'rgba(59,130,246,0.15)' : 'rgba(132,204,22,0.15)'}`,
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase'
                      }}>
                        {u.role}
                      </span>
                      <span style={{
                        fontSize: 9.5,
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: u.is_priority ? 'rgba(234,179,8,0.1)' : 'rgba(255,255,255,0.03)',
                        color: u.is_priority ? '#eab308' : 'var(--color-text-muted)',
                        border: `1px solid ${u.is_priority ? 'rgba(234,179,8,0.15)' : 'var(--color-border)'}`,
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase'
                      }}>
                        {u.is_priority ? '⭐ Priority' : 'Standard'}
                      </span>
                    </div>

                    {/* Actions row */}
                    {!isSelf && (
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', borderTop: '1px solid rgba(255,255,255,0.03)', paddingTop: 10, marginTop: 2 }} onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          u.email?.toLowerCase() !== 'tharunriot@gmail.com' && (
                            <button
                              onClick={() => handleDemoteUser(u.email)}
                              className="btn-premium btn-premium-ghost"
                              style={{ padding: '6px 10px', fontSize: 11, borderRadius: 6, color: 'var(--color-accent-orange)', border: '1px solid rgba(249,115,22,0.08)' }}
                              disabled={actionLoading}
                            >
                              Demote
                            </button>
                          )
                        ) : (
                          <button
                            onClick={() => handlePromoteUser(u.email)}
                            className="btn-premium btn-premium-ghost"
                            style={{ padding: '6px 10px', fontSize: 11, borderRadius: 6, color: 'var(--color-accent)', border: '1px solid rgba(59,130,246,0.08)' }}
                            disabled={actionLoading}
                          >
                            Promote
                          </button>
                        )}

                        {!isAdmin && (
                          <button
                            onClick={() => handleTogglePriority(u)}
                            className="btn-premium btn-premium-ghost"
                            style={{ padding: '6px 10px', fontSize: 11, borderRadius: 6, color: u.is_priority ? 'var(--color-text-muted)' : '#eab308', border: u.is_priority ? '1px solid var(--color-border)' : '1px solid rgba(234,179,8,0.08)' }}
                            disabled={actionLoading}
                          >
                            {u.is_priority ? 'Make Standard' : 'Make Priority'}
                          </button>
                        )}

                        <button
                          onClick={() => handleToggleStatus(u)}
                          className="btn-premium btn-premium-ghost"
                          style={{ padding: '6px 10px', fontSize: 11, borderRadius: 6, color: u.is_active ? 'var(--color-red)' : 'var(--color-green)', border: '1px solid var(--color-border)' }}
                          disabled={actionLoading}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                        
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="btn-premium btn-premium-danger"
                          style={{ padding: '6px 10px', fontSize: 11, borderRadius: 6, minWidth: 'auto', marginLeft: 'auto' }}
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
      </div>

      {/* Slide-over User Details Drawer */}
      <AnimatePresence>
        {selectedUser && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedUser(null)}
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: '#000',
                zIndex: 999
              }}
            />

            {/* Slide-over Drawer Panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{
                position: 'fixed',
                top: 0,
                right: 0,
                bottom: 0,
                width: '100%',
                maxWidth: 480,
                background: 'var(--color-surface-2)',
                borderLeft: '1px solid var(--color-border)',
                boxShadow: 'var(--shadow-2xl)',
                zIndex: 1000,
                display: 'flex',
                flexDirection: 'column',
                padding: 24,
                boxSizing: 'border-box',
                overflow: 'hidden'
              }}
            >
              {/* Drawer Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                    User Profile
                  </h3>
                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '4px 0 0 0' }}>
                    Metrics & Session History
                  </p>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--color-text-primary)',
                    transition: 'var(--transition-fast)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-text-muted)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
                </button>
              </div>

              {/* Drawer Content (Scrollable) */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 24, paddingRight: 4 }}>
                
                {/* User Card */}
                <div className="glass-premium" style={{ padding: 18, borderRadius: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: selectedUser.role === 'admin' ? 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-cyan) 100%)' : 'rgba(255,255,255,0.04)',
                    border: '1px solid var(--color-border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 14,
                    fontWeight: 800,
                    color: 'white'
                  }}>
                    {selectedUser.name ? selectedUser.name.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase() : '?'}
                  </div>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0 }}>
                      {selectedUser.name}
                    </h4>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', margin: '2px 0 0 0' }}>{selectedUser.email}</p>
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <span style={{
                        fontSize: 8,
                        fontWeight: 800,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: selectedUser.role === 'admin' ? 'rgba(59,130,246,0.1)' : 'rgba(132,204,22,0.1)',
                        color: selectedUser.role === 'admin' ? 'var(--color-accent)' : '#84cc16',
                        border: `1px solid ${selectedUser.role === 'admin' ? 'rgba(59,130,246,0.15)' : 'rgba(132,204,22,0.15)'}`,
                        fontFamily: 'var(--font-mono)',
                        textTransform: 'uppercase'
                      }}>
                        {selectedUser.role}
                      </span>
                      {selectedUser.is_priority && (
                        <span style={{
                          fontSize: 8,
                          fontWeight: 800,
                          padding: '2px 6px',
                          borderRadius: 4,
                          background: 'rgba(234,179,8,0.1)',
                          color: '#eab308',
                          border: '1px solid rgba(234,179,8,0.15)',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase'
                        }}>
                          ⭐ Priority
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Metrics Stats Grid */}
                <div>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                    Booking Statistics
                  </h4>
                  {(() => {
                    const userMeetings = meetings.filter(m => m.client_email === selectedUser.email);
                    const total = userMeetings.length;
                    const approved = userMeetings.filter(m => m.status === 'approved' || m.status === 'completed').length;
                    const rescheduled = userMeetings.filter(m => m.status === 'rescheduled' || m.status === 'reschedule_requested').length;
                    const declined = userMeetings.filter(m => m.status === 'rejected' || m.status === 'cancelled').length;

                    return (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                        <div className="glass-premium" style={{ padding: '12px 8px', borderRadius: 12, textAlign: 'center' }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', display: 'block' }}>{total}</span>
                          <span style={{ fontSize: 9, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Total</span>
                        </div>
                        <div className="glass-premium" style={{ padding: '12px 8px', borderRadius: 12, textAlign: 'center', border: '1px solid rgba(34,197,94,0.15)', background: 'rgba(34,197,94,0.02)' }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-green)', display: 'block' }}>{approved}</span>
                          <span style={{ fontSize: 9, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Approved</span>
                        </div>
                        <div className="glass-premium" style={{ padding: '12px 8px', borderRadius: 12, textAlign: 'center', border: '1px solid rgba(249,115,22,0.15)', background: 'rgba(249,115,22,0.02)' }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-accent-orange)', display: 'block' }}>{rescheduled}</span>
                          <span style={{ fontSize: 9, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Rescheduled</span>
                        </div>
                        <div className="glass-premium" style={{ padding: '12px 8px', borderRadius: 12, textAlign: 'center', border: '1px solid rgba(239,68,68,0.15)', background: 'rgba(239,68,68,0.02)' }}>
                          <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-red)', display: 'block' }}>{declined}</span>
                          <span style={{ fontSize: 9, color: 'var(--color-text-secondary)', fontWeight: 600 }}>Declined</span>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Session History List */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <h4 style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
                    Session History
                  </h4>
                  {(() => {
                    const userMeetings = meetings.filter(m => m.client_email === selectedUser.email);
                    if (userMeetings.length === 0) {
                      return (
                        <div style={{ padding: '24px 12px', border: '1px dashed var(--color-border)', borderRadius: 12, textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                          No sessions booked yet by this user.
                        </div>
                      );
                    }
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, overflowY: 'auto', maxHeight: 240, paddingRight: 4 }}>
                        {userMeetings.map((m) => {
                          const isPending = m.status === 'pending' || m.status === 'reschedule_requested';
                          const isApproved = m.status === 'approved' || m.status === 'rescheduled';
                          const isCompleted = m.status === 'completed';
                          const statusColor = isPending ? 'var(--color-amber)' : isApproved ? 'var(--color-green)' : isCompleted ? 'var(--color-accent-purple)' : 'var(--color-text-muted)';
                          
                          return (
                            <div
                              key={m.id}
                              style={{
                                padding: 12,
                                borderRadius: 12,
                                border: '1px solid var(--color-border)',
                                background: 'rgba(255, 255, 255, 0.01)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 6
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.title}</span>
                                <span style={{
                                  fontSize: 8,
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  background: `${statusColor}10`,
                                  color: statusColor,
                                  border: `1px solid ${statusColor}20`,
                                  fontFamily: 'var(--font-mono)',
                                  textTransform: 'uppercase',
                                  flexShrink: 0
                                }}>
                                  {m.status === 'reschedule_requested' ? 'resched requested' : m.status}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: '#475569', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                                <span>{m.display_date || (m.start_time ? m.start_time.split('T')[0] : 'TBD')}</span>
                                <span>{m.meeting_type}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>

              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </Layout>
  );
}
