import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // CAPTCHA state
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
    setSuccess('');
    setLoading(true);

    try {
      const payload = { email };
      if (captchaRequired && captchaData) {
        payload.captcha_id = captchaData.captcha_id;
        payload.captcha_answer = captchaAnswer;
      }

      const res = await api.forgotPassword(payload);
      setSuccess(res.detail || 'If an account exists, a link has been sent.');
      setEmail('');
      setCaptchaRequired(false);
      setCaptchaData(null);
      setCaptchaAnswer('');
    } catch (err) {
      // Check if CAPTCHA is required
      if (err.detail && err.detail.captcha_required) {
        setCaptchaRequired(true);
        fetchCaptcha();
        setError(err.detail.message || 'Verification required. Please solve the CAPTCHA.');
      } else {
        setError(err.message || 'An error occurred. Please try again.');
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
            <div style={{ width: 12, height: 12, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-cyan) 100%)', boxShadow: '0 0 16px var(--color-accent)' }} />
            <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>SISU</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
            Recover Password
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>
            We'll send you a secure email link to reset your password
          </p>
        </div>

        {/* Card */}
        <div className="glass-premium" style={{ padding: '36px 32px', borderRadius: 20 }}>
          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ textAlign: 'center', color: 'var(--color-green)', padding: '12px 0' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 48, marginBottom: 12 }}>check_circle</span>
              <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text-primary)' }}>Email Sent Successfully</p>
              <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', marginTop: 8, lineHeight: 1.5 }}>
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
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Email Address</label>
                <input
                  id="forgot-email"
                  className="input-premium"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
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
                type="submit"
                className="btn-premium btn-premium-primary"
                disabled={loading}
                style={{ width: '100%', padding: '13px', fontSize: 14, marginTop: 8 }}
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
