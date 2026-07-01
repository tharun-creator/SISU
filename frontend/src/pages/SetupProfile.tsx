import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import authApi from '../api/auth';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export const SetupProfile: React.FC = () => {
  const { user, updateUser } = useAuth();
  const [form, setForm] = useState({
    phone: '',
    company: '',
    job_title: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const phoneInput = form.phone.trim();
    const companyInput = form.company.trim();

    if (!phoneInput || !companyInput) {
      setError('Mobile number and Company name are required.');
      return;
    }

    setLoading(true);
    try {
      const updatedUser = await authApi.updateProfile({
        name: user?.name || '',
        phone: phoneInput,
        company: companyInput,
      });
      updateUser(updatedUser);
      window.location.href = '/';
    } catch (err: any) {
      setError(err.message || 'Failed to update profile details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[15%] left-[10%] w-96 h-96 bg-indigo-100/40 rounded-full filter blur-[80px] pointer-events-none" />
      <div className="absolute bottom-[15%] right-[10%] w-80 h-80 bg-rose-100/30 rounded-full filter blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <h1 className="font-heading text-3xl font-extrabold tracking-tight text-slate-800">SISU</h1>
          <h2 className="font-heading text-lg font-bold text-slate-700">Complete Profile Setup</h2>
          <p className="font-body text-xs text-slate-400">Please provide contact and company details to unlock the dashboard.</p>
        </div>

        <Card className="p-8 bg-white border border-slate-200 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-100 p-4 text-xs font-body text-rose-600 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>{error}</span>
              </div>
            )}

            <Input
              id="setup-phone"
              type="tel"
              label="Mobile Number *"
              placeholder="+91 98765 43210"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />

            <Input
              id="setup-company"
              type="text"
              label="Company Name *"
              placeholder="e.g. Acme Corp"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              required
            />

            <Input
              id="setup-title"
              type="text"
              label="Job Title / Role"
              placeholder="e.g. Founder, Director"
              value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            />

            <Button
              id="setup-submit"
              type="submit"
              variant="primary"
              disabled={loading}
              className="w-full flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100 mt-2"
            >
              <span>{loading ? 'Saving details...' : 'Complete Setup'}</span>
              <span className="material-symbols-outlined text-base">arrow_forward</span>
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};
export default SetupProfile;
