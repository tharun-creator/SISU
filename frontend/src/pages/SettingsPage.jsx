import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function SettingsPage() {
  const { user, logout, updateUser, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    company: user?.company || '',
    timezone: user?.timezone || 'Asia/Kolkata',
    phone: user?.phone || '',
  });

  React.useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        company: user.company || '',
        timezone: user.timezone || 'Asia/Kolkata',
        phone: user.phone || '',
      });
    }
  }, [user]);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMessage, setSecurityMessage] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const updatedUser = await api.updateProfile({
        name: form.name,
        phone: form.phone,
        company: form.company,
        timezone: form.timezone
      });
      updateUser(updatedUser);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert(err.message || 'Failed to update profile');
    }
  };

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword || !confirmPassword) return;
    if (newPassword !== confirmPassword) {
      setSecurityMessage({ text: 'New passwords do not match', type: 'error' });
      return;
    }
    setActionLoading(true);
    setSecurityMessage(null);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      setSecurityMessage({ text: 'Password updated successfully', type: 'success' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setSecurityMessage({ text: err.message || 'Failed to update password', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const tabs = ['profile', 'notifications', 'security'];

  return (
    <Layout title="Settings">
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
        <div style={{ position: 'absolute', top: '10%', left: '30%', width: 400, height: 400, background: 'rgba(59,130,255,0.03)', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0 }} />

        <div style={{ width: '100%', maxWidth: 680, position: 'relative', zIndex: 1 }}>
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 16, marginBottom: 24 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>Settings</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, marginBottom: 0 }}>Manage your account, scheduling timezone, and notifications.</p>
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 4 }}>
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', background: activeTab === tab ? 'rgba(59, 130, 246, 0.1)' : 'transparent', color: activeTab === tab ? 'var(--color-text-primary)' : 'var(--color-text-muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition-fast)', textTransform: 'capitalize' }}>
                {tab}
              </button>
            ))}
          </div>

          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-premium" style={{ padding: 28 }}>
            {activeTab === 'profile' && (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                  <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, var(--color-accent), var(--color-accent-cyan))', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'white' }}>
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 16, color: 'var(--color-text-primary)', margin: 0 }}>{user?.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', margin: '2px 0 6px 0' }}>{user?.email}</p>
                    <span style={{ fontSize: 11, padding: '2px 10px', background: isAdmin ? 'rgba(59,130,246,0.12)' : 'rgba(132,204,22,0.12)', color: isAdmin ? 'var(--color-accent)' : '#84cc16', border: `1px solid ${isAdmin ? 'rgba(59,130,246,0.2)' : 'rgba(132,204,22,0.2)'}`, borderRadius: 100, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>
                      {isAdmin ? 'admin' : 'client'}
                    </span>
                  </div>
                </div>

                <div className="divider-premium" />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                      Full Name <span style={{ color: 'var(--color-red)' }}>*</span>
                    </label>
                    <input className="input-premium" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                      Phone Number <span style={{ color: 'var(--color-red)' }}>*</span>
                    </label>
                    <input className="input-premium" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" required />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                      Company <span style={{ color: 'var(--color-red)' }}>*</span>
                    </label>
                    <input className="input-premium" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Your company" required />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Timezone</label>
                  <select className="input-premium" style={{ appearance: 'none', background: 'rgba(255,255,255,0.02) url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'white\'%3E%3Cpath d=\'M7 10l5 5 5-5H7z\'/%3E%3C/svg%3E") no-repeat right 12px center', backgroundSize: '20px' }} value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                    <option value="Asia/Kolkata">India (IST, UTC+5:30)</option>
                    <option value="America/New_York">New York (EST, UTC-5)</option>
                    <option value="America/Los_Angeles">Los Angeles (PST, UTC-8)</option>
                    <option value="Europe/London">London (GMT, UTC+0)</option>
                    <option value="Asia/Dubai">Dubai (GST, UTC+4)</option>
                    <option value="Asia/Singapore">Singapore (SGT, UTC+8)</option>
                  </select>
                </div>

                {saved && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '12px 16px', background: 'rgba(132,204,22,0.1)', border: '1px solid rgba(132,204,22,0.2)', borderRadius: 10, color: 'var(--color-green)', fontSize: 14 }}>
                    ✓ Changes saved successfully
                  </motion.div>
                )}

                <button type="submit" className="btn-premium btn-premium-primary" style={{ alignSelf: 'flex-start' }}>Save Changes</button>
              </form>
            )}

            {activeTab === 'notifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Notification Preferences</h3>
                {[
                  { label: 'Meeting Approved', desc: 'Get notified when your meeting request is approved', enabled: true },
                  { label: 'Meeting Rejected', desc: 'Get notified when your request is declined', enabled: true },
                  { label: 'Meeting Rescheduled', desc: 'Get notified when a meeting time changes', enabled: true },
                  { label: 'Meeting Reminders', desc: 'Receive reminders 1 hour before meetings', enabled: true },
                  { label: 'New Booking Requests', desc: 'Admin: get notified of new client requests', enabled: true },
                ].map(({ label, desc, enabled }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3, color: 'var(--color-text-primary)' }}>{label}</p>
                      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{desc}</p>
                    </div>
                    <div style={{ width: 44, height: 24, borderRadius: 100, background: enabled ? 'var(--color-accent)' : 'rgba(255,255,255,0.06)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 3, left: enabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'security' && (
              <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Security Settings</h3>
                
                {securityMessage && (
                  <div style={{
                    padding: '12px 16px',
                    background: securityMessage.type === 'success' ? 'rgba(132,204,22,0.1)' : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${securityMessage.type === 'success' ? 'rgba(132,204,22,0.2)' : 'rgba(239,68,68,0.2)'}`,
                    borderRadius: 10,
                    color: securityMessage.type === 'success' ? 'var(--color-green)' : 'var(--color-red)',
                    fontSize: 14
                  }}>
                    {securityMessage.text}
                  </div>
                )}

                <div style={{ padding: 16, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4, fontSize: 14, color: 'var(--color-text-primary)' }}>Account Email</p>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{user?.email}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Current Password</label>
                  <input className="input-premium" type="password" placeholder="Enter current password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>New Password</label>
                  <input className="input-premium" type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Confirm Password</label>
                  <input className="input-premium" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={actionLoading || !currentPassword || !newPassword || !confirmPassword} className="btn-premium btn-premium-primary" style={{ alignSelf: 'flex-start' }}>
                  {actionLoading ? 'Updating...' : 'Update Password'}
                </button>

                <div className="divider-premium" />

                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-red)', marginBottom: 8, fontFamily: 'var(--font-heading)' }}>Danger Zone</h4>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>Sign out from all devices or delete your account.</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="button" className="btn-premium btn-premium-danger" onClick={logout}>Sign Out</button>
                  </div>
                </div>
              </form>
            )}
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
