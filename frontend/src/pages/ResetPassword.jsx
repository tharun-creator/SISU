import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/api';

export default function ResetPassword() {
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Extract token from query params
  const token = new URLSearchParams(window.location.search).get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (form.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.resetPassword(token, form.password);
      setSuccess(res.detail || 'Password reset successfully! Redirecting...');
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Background radial glow */}
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(139, 92, 246, 0.04) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        {/* Logo and title */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-cyan) 100%)', boxShadow: '0 0 16px var(--color-accent)' }} />
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>SISU</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
            Reset Password
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Enter your new secure password below
          </p>
        </div>

        {/* Card */}
        <div className="glass-premium" style={{ padding: '36px 32px', borderRadius: 20 }}>
          {!token ? (
            <div style={{ textAlign: 'center', color: 'var(--color-red)', padding: '12px 0' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 12 }}>error</span>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>Invalid Reset Link</p>
              <p style={{ fontSize: 14, color: 'var(--color-text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                The password reset token is missing or invalid. Please request a new reset link.
              </p>
              <a href="/login" className="btn-premium btn-premium-secondary" style={{ marginTop: 24, display: 'inline-flex', width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                Back to Sign In
              </a>
            </div>
          ) : success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', color: 'var(--color-green)', padding: '12px 0' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 12 }}>check_circle</span>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>Success!</p>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 8 }}>
                {success}
              </p>
              <a href="/login" className="btn-premium btn-premium-primary" style={{ marginTop: 24, display: 'inline-flex', width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                Go to Sign In
              </a>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239, 68, 68, 0.15)', borderRadius: 10, padding: '12px 16px', color: 'var(--color-red)', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span>
                  <span style={{ fontWeight: 500 }}>{error}</span>
                </motion.div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-password"
                    className="input-premium"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: 12,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 4,
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Confirm Password</label>
                <input
                  id="reset-confirm-password"
                  className="input-premium"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-premium btn-premium-primary"
                disabled={loading}
                style={{ width: '100%', padding: '13px', fontSize: 14, marginTop: 8 }}
              >
                {loading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <svg style={{ animation: 'spin-slow 2s linear infinite', width: 16, height: 16 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                    Resetting...
                  </span>
                ) : (
                  <>Reset Password <span className="material-symbols-outlined" style={{ fontSize: 16 }}>lock_reset</span></>
                )}
              </button>
            </form>
          )}

          <div className="divider-premium" />

          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13.5, margin: 0 }}>
            Remembered your password?{' '}
            <a href="/login" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Sign In <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}

