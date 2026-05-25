import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

export default function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  if (currentUser?.email !== 'tharunriot@gmail.com') {
    window.location.href = '/';
    return null;
  }
  const [users, setUsers] = useState([]);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPassword, setClientPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState(null); // { text, type: 'success' | 'error' }
  const [newClientCreds, setNewClientCreds] = useState(null); // { email, password }

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

  useEffect(() => {
    fetchUsers();
  }, []);

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

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 24, alignItems: 'start', position: 'relative', zIndex: 1 }}>
          {/* Left Column: Create Client form & Temporary credentials card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Create Client card */}
            <div className="glass-premium" style={{ padding: 24 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
                Create Client Account
              </h3>
              <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 20, lineHeight: 1.5 }}>
                Add a new client manually. A new account will be created with the specified details.
              </p>

              <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                    Full Name
                  </label>
                  <input
                    type="text"
                    className="input-premium"
                    placeholder="e.g. John Doe"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                    Email Address
                  </label>
                  <input
                    type="email"
                    className="input-premium"
                    placeholder="e.g. client@example.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                    Password
                  </label>
                  <input
                    type="password"
                    className="input-premium"
                    placeholder="e.g. SecurePass123"
                    value={clientPassword}
                    onChange={(e) => setClientPassword(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading || !clientName || !clientEmail || !clientPassword}
                  className="btn-premium btn-premium-primary"
                  style={{ alignSelf: 'stretch', justifyContent: 'center' }}
                >
                  {actionLoading ? 'Processing...' : 'Create Client'}
                </button>
              </form>
            </div>

            {/* Temporary Credentials Box */}
            <AnimatePresence>
              {newClientCreds && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-premium"
                  style={{ padding: 20, border: '1px solid rgba(132,204,22,0.2)', background: 'rgba(132,204,22,0.02)' }}
                >
                  <h4 style={{ fontSize: 13, color: '#84cc16', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12, fontFamily: 'var(--font-mono)' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock</span> 
                    Client Credentials Created
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, borderBottom: '1px solid var(--color-border)', paddingBottom: 6 }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Email:</span>
                      <strong style={{ color: 'var(--color-text-primary)' }}>{newClientCreds.email}</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--color-text-muted)' }}>Password:</span>
                      <strong style={{ color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{newClientCreds.password}</strong>
                    </div>
                  </div>
                  <div style={{ marginTop: 14, fontSize: 11.5, color: 'var(--color-text-secondary)', lineHeight: 1.5, background: 'rgba(255,255,255,0.01)', padding: 10, borderRadius: 8, border: '1px solid var(--color-border)' }}>
                    ℹ️ Provide these details to the client so they can log in.
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right Column: User list Table */}
          <div className="glass-premium" style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: 20, borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>
                Registered Accounts ({users.length})
              </h3>
            </div>
            
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.01)' }}>
                    <th style={{ padding: '12px 18px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>User</th>
                    <th style={{ padding: '12px 18px', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Role</th>
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
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}><div className="skeleton-pulse" style={{ height: 24, width: 100, borderRadius: 6, display: 'inline-block' }} /></td>
                      </tr>
                    ))
                  ) : users.length === 0 ? (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--color-text-muted)', fontSize: 13 }}>
                        No accounts found.
                      </td>
                    </tr>
                  ) : users.map((u) => {
                    const isSelf = u.id === currentUser?.id;
                    const isAdmin = u.role === 'admin';
                    
                    return (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--color-border)', background: isSelf ? 'rgba(59, 130, 246, 0.01)' : 'transparent' }}>
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
                            background: u.is_active ? 'rgba(132,204,22,0.1)' : 'rgba(239,68,68,0.1)',
                            color: u.is_active ? '#84cc16' : '#ef4444',
                            border: `1px solid ${u.is_active ? 'rgba(132,204,22,0.15)' : 'rgba(239,68,68,0.15)'}`,
                            fontFamily: 'var(--font-mono)',
                            textTransform: 'uppercase'
                          }}>
                            {u.is_active ? 'Active' : 'Disabled'}
                          </span>
                        </td>
                        
                        <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end', alignItems: 'center' }}>
                            {!isSelf && (
                              <>
                                {/* Enable / Disable Status */}
                                <button
                                  onClick={() => handleToggleStatus(u)}
                                  className="btn-premium btn-premium-ghost"
                                  style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, color: u.is_active ? 'var(--color-red)' : 'var(--color-green)' }}
                                  title={u.is_active ? 'Deactivate account' : 'Activate account'}
                                >
                                  {u.is_active ? 'Deactivate' : 'Activate'}
                                </button>
                                
                                {/* Delete Account */}
                                <button
                                  onClick={() => handleDeleteUser(u)}
                                  className="btn-premium btn-premium-danger"
                                  style={{ padding: '4px 8px', fontSize: 11, borderRadius: 6, minWidth: 'auto' }}
                                  title="Delete Account"
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
        </div>
      </div>
    </Layout>
  );
}
