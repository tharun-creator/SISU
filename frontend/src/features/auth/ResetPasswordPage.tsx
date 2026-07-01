import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { client } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const toast = useToast();

  useEffect(() => {
    const t = searchParams.get('token');
    if (t) setToken(t);
  }, [searchParams]);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.showToast('Please enter your reset token', 'error');
      return;
    }
    if (password !== confirmPassword) {
      toast.showToast('Passwords do not match', 'error');
      return;
    }

    setLoading(true);
    try {
      await client.post('/auth/reset-password', {
        token,
        new_password: password,
      });
      toast.showToast('Password reset successful!', 'success');
      setSuccess(true);
    } catch (err: any) {
      toast.showToast(err.message || 'Reset failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm max-w-md w-full">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
            ✓
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Password Reset Complete</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            Your password has been successfully updated. You can now log in using your new credentials.
          </p>
          <Button onClick={() => window.location.href = '/login'} className="w-full">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm max-w-md w-full"
      >
        <h1 className="text-xl font-bold text-slate-900 mb-2">Reset Password</h1>
        <p className="text-sm text-slate-500 mb-6 leading-relaxed">
          Please enter your secure reset token and your new password below.
        </p>
        <form onSubmit={handleReset} className="space-y-4 text-left">
          <Input
            label="Reset Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Paste your token here if not filled from link"
            required
          />
          <Input
            label="New Password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Input
            label="Confirm New Password"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          <Button type="submit" loading={loading} className="w-full">
            Reset Password
          </Button>
        </form>
      </motion.div>
    </div>
  );
};
export default ResetPasswordPage;
