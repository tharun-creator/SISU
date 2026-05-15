import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div className="ambient-bg" />
      
      {/* Background decoration */}
      <div style={{ position: 'absolute', top: '15%', left: '10%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '15%', right: '10%', width: 300, height: 300, background: 'radial-gradient(circle, rgba(139,92,246,0.06) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(40px)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: '100%', maxWidth: 440, position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(108, 99, 255, 0.08)', border: '1px solid rgba(108, 99, 255, 0.2)', borderRadius: 16, padding: '12px 24px', marginBottom: 24 }}
          >
            <span style={{ display: 'inline-block', fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #6C63FF, #00C2FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: '#6C63FF' }}>SISU</span>
          </motion.div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 8 }}>Welcome back</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 15 }}>Sign in to your executive platform</p>
        </div>

        {/* Card */}
        <div className="glass" style={{ borderRadius: 24, padding: 36 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span> {error}
              </motion.div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email</label>
              <input
                id="login-email"
                className="input"
                type="email"
                placeholder="you@company.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password</label>
              <input
                id="login-password"
                className="input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>

            <button
              id="sidebar-logout"
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ width: '100%', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg style={{ animation: 'spin 1s linear infinite', width: 18, height: 18 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                  Signing in...
                </span>
              ) : (
                <>Sign In <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span></>
              )}
            </button>
          </form>

          <div className="divider" style={{ margin: '24px 0' }} />

          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Don't have an account?{' '}
            <a href="/signup" style={{ color: '#6C63FF', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Create one <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span></a>
          </p>
        </div>

        {/* Demo hint */}
        <div style={{ marginTop: 20, padding: '14px 20px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 12, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
            First registered account becomes <strong style={{ color: '#6C63FF' }}>Admin</strong>.<br />Subsequent accounts become <strong style={{ color: '#00C2FF' }}>Clients</strong>.
          </p>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
