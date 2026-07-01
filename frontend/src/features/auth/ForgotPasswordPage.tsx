import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { client } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const toast = useToast();

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await client.post('/auth/forgot-password', { email });
      toast.showToast('Reset request submitted successfully.', 'success');
      setSubmitted(true);
    } catch (err: any) {
      toast.showToast(err.message || 'Request failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm max-w-md w-full"
      >
        {!submitted ? (
          <>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Forgot Password</h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            <form onSubmit={handleRequest} className="space-y-4 text-left">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button type="submit" loading={loading} className="w-full">
                Send Reset Link
              </Button>
            </form>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
              ✉
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Check Your Email</h1>
            <p className="text-sm text-slate-500 mb-6 leading-relaxed">
              If an account is associated with <strong className="text-slate-800">{email}</strong>, we have sent a password reset link.
            </p>
            <Button onClick={() => window.location.href = '/login'} className="w-full">
              Back to Login
            </Button>
          </>
        )}
      </motion.div>
    </div>
  );
};
export default ForgotPasswordPage;
