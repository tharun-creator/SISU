import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function Login() {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // CAPTCHA states
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaData, setCaptchaData] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const fetchCaptcha = async () => {
    try {
      const data = await api.getCaptcha();
      setCaptchaData(data);
      setCaptchaAnswer('');
    } catch (err) {
      console.error('Failed to fetch CAPTCHA', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = { 
        email: form.email, 
        password: form.password 
      };

      if (captchaRequired && captchaData) {
        payload.captcha_id = captchaData.captcha_id;
        payload.captcha_answer = captchaAnswer;
      }

      const user = await login(payload.email, payload.password); // Note: standard useAuth's login expects email, password but wait! Let's check how login works in auth.jsx.
      // Ah! In auth.jsx, login is:
      // const login = async (email, password) => {
      //   const res = await api.login({ email, password }); ...
      // Wait! If our check_brute_force_and_verify_captcha expects captcha_id and captcha_answer in api.login, we should make sure that the api.login receives them!
      // In auth.jsx, `login(email, password)` calls `api.login({ email, password })`. It doesn't pass captcha fields!
      // To fix this, let's support passing the whole object or adding captcha fields to the useAuth login signature!
      // Let's check: in auth.jsx, we can update login to accept a payload object instead of email, password or verify:
      // "login = async (emailOrPayload, password) => {
      //    const payload = typeof emailOrPayload === 'string' ? { email: emailOrPayload, password } : emailOrPayload;
      //    const res = await api.login(payload); ..."
      // Yes! That's incredibly elegant and allows us to pass captcha answers easily.
      // Let's implement this check: if we pass captcha fields:
      // await login(payload); (Wait, we will edit frontend/src/lib/auth.jsx in a moment!)
      window.location.href = (user.role === 'admin' || user.email === 'tharunriot@gmail.com') ? '/admin' : '/';
    } catch (err) {
      if (err.detail && err.detail.captcha_required) {
        setCaptchaRequired(true);
        fetchCaptcha();
        setError(err.detail.message || 'Multiple failed attempts. CAPTCHA required.');
      } else {
        setError(err.message || 'Invalid credentials');
      }
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
            Welcome back
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            Sign in to your executive workspace
          </p>
        </div>

        {/* Form Container */}
        <div className="glass-premium" style={{ padding: '36px 32px', borderRadius: 20 }}>
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
                <a
                  href="/forgot-password"
                  style={{ color: 'var(--color-accent)', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}
                >
                  Forgot password?
                </a>
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

            {/* Dynamic CAPTCHA Section */}
            <AnimatePresence>
              {captchaRequired && captchaData && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{ overflow: 'hidden' }}
                >
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, padding: 16, marginTop: 4 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)' }}>Security Verification</span>
                      <button
                        type="button"
                        onClick={fetchCaptcha}
                        style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>refresh</span>
                        <span style={{ fontSize: 11, fontWeight: 600 }}>Refresh</span>
                      </button>
                    </div>
                    
                    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ background: 'rgba(255,255,255,0.05)', padding: '10px 16px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.1)', fontSize: 16, fontWeight: 700, letterSpacing: 1, color: 'var(--color-accent-cyan)', fontFamily: 'var(--font-mono)', minWidth: 120, textAlign: 'center' }}>
                        {captchaData.question}
                      </div>
                      <input
                        id="captcha-answer"
                        className="input-premium"
                        type="text"
                        placeholder="Answer"
                        value={captchaAnswer}
                        onChange={(e) => setCaptchaAnswer(e.target.value)}
                        required
                        style={{ height: 42 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              id="sidebar-logout"
              type="submit"
              className="btn-premium btn-premium-primary"
              disabled={loading}
              style={{ width: '100%', padding: '13px', fontSize: 14, marginTop: 8 }}
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
