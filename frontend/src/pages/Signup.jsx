import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';

export default function Signup() {
  const { register } = useAuth();
  const [form, setForm] = useState({ name: '', email: '', password: '', company: '', job_title: '', timezone: 'Asia/Kolkata' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      const user = await register({ ...form, role: 'client' });
      window.location.href = user.role === 'admin' ? '/admin' : '/';
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, position: 'relative', overflow: 'hidden' }}>
      <div className="ambient-bg" />
      <div style={{ position: 'absolute', top: '10%', right: '5%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(60px)', pointerEvents: 'none' }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ width: '100%', maxWidth: 480, position: 'relative', zIndex: 1 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: 'rgba(108, 99, 255, 0.08)', border: '1px solid rgba(108, 99, 255, 0.2)', borderRadius: 16, padding: '12px 24px', marginBottom: 24 }}
          >
            <span style={{ display: 'inline-block', fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', background: 'linear-gradient(135deg, #6C63FF, #00C2FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: '#6C63FF' }}>SISU</span>
          </motion.div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.8px', marginBottom: 8 }}>Create your account</h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 15 }}>Join the executive scheduling platform</p>
        </div>

        {/* Card */}
        <div className="glass" style={{ borderRadius: 24, padding: 36 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span> {error}
              </motion.div>
            )}

            <div className="grid-2" style={{ gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Full Name *</label>
                <input id="signup-name" className="input" type="text" placeholder="John Smith" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Email *</label>
                <input id="signup-email" className="input" type="email" placeholder="you@company.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Password *</label>
              <input id="signup-password" className="input" type="password" placeholder="At least 8 characters" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>

            <div className="grid-2" style={{ gap: 14 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Company</label>
                <input id="signup-company" className="input" type="text" placeholder="Acme Corp" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Role / Title</label>
                <input id="signup-title" className="input" type="text" placeholder="CEO, Founder…" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Timezone</label>
              <select id="signup-tz" className="input" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })}>
                <option value="Asia/Kolkata">India (IST, UTC+5:30)</option>
                <option value="America/New_York">New York (EST, UTC-5)</option>
                <option value="America/Los_Angeles">Los Angeles (PST, UTC-8)</option>
                <option value="Europe/London">London (GMT, UTC+0)</option>
                <option value="Asia/Dubai">Dubai (GST, UTC+4)</option>
                <option value="Asia/Singapore">Singapore (SGT, UTC+8)</option>
                <option value="Australia/Sydney">Sydney (AEDT, UTC+11)</option>
              </select>
            </div>

            <button id="signup-submit" type="submit" className="btn btn-primary btn-lg" disabled={loading} style={{ width: '100%', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <svg style={{ animation: 'spin 1s linear infinite', width: 18, height: 18 }} viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="31.4" strokeDashoffset="10" /></svg>
                  Creating account...
                </span>
              ) : (
                <>Create Account <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span></>
              )}
            </button>
          </form>

          <div className="divider" style={{ margin: '24px 0' }} />
          <p style={{ textAlign: 'center', color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Already have an account?{' '}
            <a href="/login" style={{ color: '#6C63FF', fontWeight: 600, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>Sign in <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_forward</span></a>
          </p>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
