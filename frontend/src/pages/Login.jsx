import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [isForgot, setIsForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      window.location.href = user.role === 'admin' ? '/admin' : '/';
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setForgotSuccess('');
    setLoading(true);
    try {
      await api.forgotPassword(forgotEmail);
      setForgotSuccess('If an account exists, a link has been sent.');
      setForgotEmail('');
    } catch (err) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      {/* Background radial glow */}
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(6, 182, 212, 0.04) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        {/* Logo and title */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>SISU</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
            {isForgot ? 'Reset Password' : 'Welcome back'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            {isForgot ? "We'll email you a secure recovery link" : 'Sign in to your executive workspace'}
          </p>
        </div>

        {/* Form Container */}
        <div className="glass-premium" style={{ padding: '36px 32px', borderRadius: 20 }}>
          {isForgot ? (
            <form onSubmit={handleForgotSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

              {forgotSuccess && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ background: 'rgba(132,204,22,0.08)', border: '1px solid rgba(132, 204, 22, 0.15)', borderRadius: 10, padding: '12px 16px', color: 'var(--color-green)', fontSize: 13.5, display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check_circle</span>
                  <span style={{ fontWeight: 500 }}>{forgotSuccess}</span>
                </motion.div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Email Address</label>
                <input
                  id="forgot-email"
                  className="input-premium"
                  type="email"
                  placeholder="you@company.com"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </div>

              <button
                type="submit"
                className="btn-premium btn-premium-primary"
                disabled={loading}
                style={{ width: '100%', padding: '13px', fontSize: 14 }}
              >
                {loading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <svg style={{ animation: 'spin-slow 2s linear infinite', width: 16, height: 16 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                    Sending Link...
                  </span>
                ) : (
                  <>Send Reset Link <span className="material-symbols-outlined" style={{ fontSize: 16 }}>send</span></>
                )}
              </button>

              <button
                type="button"
                onClick={() => { setIsForgot(false); setError(''); setForgotSuccess(''); }}
                className="btn-premium btn-premium-secondary"
                style={{ width: '100%', padding: '12px', fontSize: 14 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_back</span> Back to Sign In
              </button>
            </form>
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
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Email</label>
                <input
                  id="login-email"
                  className="input-premium"
                  type="email"
                  placeholder="you@company.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, fontFamily: 'var(--font-mono)' }}>Password</label>
                  <button
                    type="button"
                    onClick={() => { setIsForgot(true); setError(''); setForgotSuccess(''); }}
                    style={{ background: 'none', border: 'none', color: 'var(--color-accent)', fontSize: 12, fontWeight: 600, cursor: 'pointer', padding: 0 }}
                  >
                    Forgot password?
                  </button>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    id="login-password"
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

              <button
                id="sidebar-logout"
                type="submit"
                className="btn-premium btn-premium-primary"
                disabled={loading}
                style={{ width: '100%', padding: '13px', fontSize: 14 }}
              >
                {loading ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <svg style={{ animation: 'spin-slow 2s linear infinite', width: 16, height: 16 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                    Signing in...
                  </span>
                ) : (
                  <>Sign In <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span></>
                )}
              </button>
            </form>
          )}

          <div className="divider-premium" />

          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 13.5, margin: 0 }}>
            Don't have an account?{' '}
            <a href="/signup" style={{ color: 'var(--color-accent)', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              Create one <span className="material-symbols-outlined" style={{ fontSize: 14 }}>arrow_forward</span>
            </a>
          </p>
        </div>

        {/* Demo hint info box */}
        <div className="glass-premium" style={{ marginTop: 16, padding: '14px 20px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.01)' }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
            First registered account becomes <strong style={{ color: 'var(--color-accent)' }}>Admin</strong>.<br />
            Subsequent accounts become <strong style={{ color: 'var(--color-accent-cyan)' }}>Clients</strong>.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
