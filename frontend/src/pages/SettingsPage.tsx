import React, { useState, useEffect } from 'react';
import AppLayout from '../components/layout/AppLayout';
import { useAuth } from '../lib/auth';
import authApi from '../api/auth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';

export const SettingsPage: React.FC = () => {
  const { user, logout, updateUser, isAdmin } = useAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'security'>('profile');
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: user?.name || '',
    company: user?.company || '',
    timezone: user?.timezone || 'Asia/Kolkata',
    phone: user?.phone || '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        company: user.company || '',
        timezone: user.timezone || 'Asia/Kolkata',
        phone: user.phone || '',
      });
    }
  }, [user]);

  // Password fields
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const updatedUser = await authApi.updateProfile({
        name: form.name,
        phone: form.phone,
        company: form.company,
      });
      updateUser(updatedUser);
      toast.show('Profile updated successfully', 'success');
    } catch (err: any) {
      toast.show(err.message || 'Failed to update profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.show('New passwords do not match', 'error');
      return;
    }
    setLoading(true);
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.show('Password updated successfully', 'success');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      toast.show(err.message || 'Failed to change password', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Notification preferences state
  const [channels, setChannels] = useState({
    email: true,
    sms: false,
    push: true,
  });
  const [events, setEvents] = useState({
    bookings: true,
    reminders: true,
    reschedules: true,
    invoices: true,
  });

  useEffect(() => {
    const savedChannels = localStorage.getItem('notif_channels');
    const savedEvents = localStorage.getItem('notif_events');
    if (savedChannels) setChannels(JSON.parse(savedChannels));
    if (savedEvents) setEvents(JSON.parse(savedEvents));
  }, []);

  const handleSaveNotifications = () => {
    localStorage.setItem('notif_channels', JSON.stringify(channels));
    localStorage.setItem('notif_events', JSON.stringify(events));
    toast.show('Notification preferences saved successfully', 'success');
  };

  return (
    <AppLayout title="Account Settings">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="border-b border-slate-200 pb-4">
          <h1 className="font-heading text-2xl font-bold text-slate-800">Settings</h1>
          <p className="font-body text-xs text-slate-400 mt-1">Manage your account preferences, timezone and security.</p>
        </div>

        {/* Tabs Bar */}
        <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          {(['profile', 'notifications', 'security'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 text-xs font-semibold capitalize font-body rounded-xl transition-all ${
                activeTab === tab 
                  ? 'bg-white text-indigo-600 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab contents */}
        <Card className="p-6 bg-white border border-slate-100">
          {activeTab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="flex items-center gap-4 border-b border-slate-50 pb-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-600 font-heading text-lg font-bold text-white shadow-md">
                  {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                </div>
                <div>
                  <p className="font-heading text-sm font-bold text-slate-800">{user?.name}</p>
                  <p className="font-body text-xs text-slate-400 mt-0.5">{user?.email}</p>
                  <span className="mt-2 inline-block rounded-full bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                    {isAdmin ? 'Admin' : 'Client'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name *"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
                <Input
                  label="Phone Number *"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
                <Input
                  label="Company Name *"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  required
                />
                <div>
                  <label className="mb-1.5 block font-body text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Timezone
                  </label>
                  <select
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 font-body text-sm text-slate-600 focus:border-indigo-600 focus:outline-none"
                  >
                    <option value="Asia/Kolkata">India (IST, UTC+5:30)</option>
                    <option value="America/New_York">New York (EST, UTC-5)</option>
                    <option value="America/Los_Angeles">Los Angeles (PST, UTC-8)</option>
                    <option value="Europe/London">London (GMT, UTC+0)</option>
                    <option value="Asia/Dubai">Dubai (GST, UTC+4)</option>
                    <option value="Asia/Singapore">Singapore (SGT, UTC+8)</option>
                  </select>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-50">
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Profile Details'}
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'notifications' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-heading text-sm font-bold text-slate-800">Notification Preferences</h3>
                <p className="font-body text-xs text-slate-400 mt-1">Configure your preferred channels and alert triggers.</p>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="font-heading text-xs font-bold text-slate-500 uppercase tracking-wider">Preferred Channels</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-body text-sm text-slate-700">Email Notifications</span>
                    <input 
                      type="checkbox" 
                      checked={channels.email} 
                      onChange={(e) => setChannels({ ...channels, email: e.target.checked })} 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-body text-sm text-slate-700">SMS / Text Alerts</span>
                    <input 
                      type="checkbox" 
                      checked={channels.sms} 
                      onChange={(e) => setChannels({ ...channels, sms: e.target.checked })} 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-body text-sm text-slate-700">Push Notifications</span>
                    <input 
                      type="checkbox" 
                      checked={channels.push} 
                      onChange={(e) => setChannels({ ...channels, push: e.target.checked })} 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="font-heading text-xs font-bold text-slate-500 uppercase tracking-wider">Event Triggers</h4>
                <div className="space-y-3">
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-body text-sm text-slate-700">Session Booking & Approvals</span>
                    <input 
                      type="checkbox" 
                      checked={events.bookings} 
                      onChange={(e) => setEvents({ ...events, bookings: e.target.checked })} 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-body text-sm text-slate-700">Session Reminders</span>
                    <input 
                      type="checkbox" 
                      checked={events.reminders} 
                      onChange={(e) => setEvents({ ...events, reminders: e.target.checked })} 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-body text-sm text-slate-700">Rescheduling Proposal Alerts</span>
                    <input 
                      type="checkbox" 
                      checked={events.reschedules} 
                      onChange={(e) => setEvents({ ...events, reschedules: e.target.checked })} 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <span className="font-body text-sm text-slate-700">Invoices & Billing Statements</span>
                    <input 
                      type="checkbox" 
                      checked={events.invoices} 
                      onChange={(e) => setEvents({ ...events, invoices: e.target.checked })} 
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                    />
                  </label>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <Button variant="primary" onClick={handleSaveNotifications}>
                  Save Settings Preferences
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <h3 className="font-heading text-sm font-bold text-slate-800 mb-2">Update Password</h3>
              <Input
                type="password"
                label="Current Password"
                placeholder="••••••••"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
              <Input
                type="password"
                label="New Password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <Input
                type="password"
                label="Confirm New Password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />

              <div className="pt-4 border-t border-slate-50 flex justify-between items-center">
                <Button variant="primary" type="submit" disabled={loading || !currentPassword || !newPassword}>
                  {loading ? 'Updating...' : 'Change Password'}
                </Button>
                <Button variant="danger" size="sm" onClick={logout}>
                  Sign Out from Account
                </Button>
              </div>
            </form>
          )}
        </Card>
      </div>
    </AppLayout>
  );
};
export default SettingsPage;
