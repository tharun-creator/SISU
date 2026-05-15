import React, { useState } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    company: user?.company || '',
    job_title: user?.job_title || '',
    timezone: user?.timezone || 'Asia/Kolkata',
    phone: user?.phone || '',
  });

  const handleSave = async (e) => {
    e.preventDefault();
    // In a real app, call PUT /api/users/me
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const tabs = ['profile', 'notifications', 'security'];

  return (
    <Layout>
      <main className="main-content" style={{ marginTop: 0 }}>
        <div className="ambient-bg" />
        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="page-header">
            <h1 className="page-title">Settings</h1>
            <p className="page-subtitle">Manage your account and preferences</p>
          </div>

          {/* Tab nav */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 28, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 4 }}>
            {tabs.map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', background: activeTab === tab ? 'rgba(99,102,241,0.2)' : 'transparent', color: activeTab === tab ? '#818cf8' : 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)', textTransform: 'capitalize' }}>
                {tab}
              </button>
            ))}
          </div>

          <motion.div key={activeTab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="card">
            {activeTab === 'profile' && (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                  <div style={{ width: 64, height: 64, background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'white' }}>
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 16 }}>{user?.name}</p>
                    <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{user?.email}</p>
                    <span style={{ fontSize: 11, padding: '2px 10px', background: user?.role === 'admin' ? 'rgba(99,102,241,0.12)' : 'rgba(16,185,129,0.12)', color: user?.role === 'admin' ? '#818cf8' : '#10b981', border: `1px solid ${user?.role === 'admin' ? 'rgba(99,102,241,0.2)' : 'rgba(16,185,129,0.2)'}`, borderRadius: 100, fontWeight: 600, textTransform: 'capitalize' }}>
                      {user?.role}
                    </span>
                  </div>
                </div>

                <div className="divider" />

                <div className="grid-2" style={{ gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name</label>
                    <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company</label>
                    <input className="input" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Your company" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Job Title</label>
                    <input className="input" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} placeholder="CEO, Founder..." />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Phone</label>
                    <input className="input" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+91 98765 43210" />
                  </div>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timezone</label>
                  <select className="input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                    <option value="Asia/Kolkata">India (IST, UTC+5:30)</option>
                    <option value="America/New_York">New York (EST, UTC-5)</option>
                    <option value="America/Los_Angeles">Los Angeles (PST, UTC-8)</option>
                    <option value="Europe/London">London (GMT, UTC+0)</option>
                    <option value="Asia/Dubai">Dubai (GST, UTC+4)</option>
                    <option value="Asia/Singapore">Singapore (SGT, UTC+8)</option>
                  </select>
                </div>

                {saved && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 10, color: '#10b981', fontSize: 14 }}>
                    ✓ Changes saved successfully
                  </motion.div>
                )}

                <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Save Changes</button>
              </form>
            )}

            {activeTab === 'notifications' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Notification Preferences</h3>
                {[
                  { label: 'Meeting Approved', desc: 'Get notified when your meeting request is approved', enabled: true },
                  { label: 'Meeting Rejected', desc: 'Get notified when your request is declined', enabled: true },
                  { label: 'Meeting Rescheduled', desc: 'Get notified when a meeting time changes', enabled: true },
                  { label: 'Meeting Reminders', desc: 'Receive reminders 1 hour before meetings', enabled: true },
                  { label: 'New Booking Requests', desc: 'Admin: get notified of new client requests', enabled: true },
                ].map(({ label, desc, enabled }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: '1px solid var(--color-border)' }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{label}</p>
                      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>{desc}</p>
                    </div>
                    <div style={{ width: 44, height: 24, borderRadius: 100, background: enabled ? '#6366f1' : 'rgba(255,255,255,0.1)', position: 'relative', cursor: 'pointer', flexShrink: 0 }}>
                      <div style={{ position: 'absolute', top: 3, left: enabled ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: 'white', transition: 'left 0.2s' }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {activeTab === 'security' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700 }}>Security Settings</h3>
                <div style={{ padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
                  <p style={{ fontWeight: 600, marginBottom: 4, fontSize: 14 }}>Account Email</p>
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: 13 }}>{user?.email}</p>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>New Password</label>
                  <input className="input" type="password" placeholder="Enter new password" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Confirm Password</label>
                  <input className="input" type="password" placeholder="Confirm new password" />
                </div>
                <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>Update Password</button>

                <div className="divider" />

                <div>
                  <h4 style={{ fontSize: 15, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>Danger Zone</h4>
                  <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 16 }}>Sign out from all devices or delete your account.</p>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button className="btn btn-danger" onClick={logout}>Sign Out</button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>
    </Layout>
  );
}
