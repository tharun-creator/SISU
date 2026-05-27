import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';

export default function ResetPassword() {
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // CAPTCHA state
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaData, setCaptchaData] = useState(null);
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  // Password strength state
  const [strength, setStrength] = useState({
    score: 0,
    hasLength: false,
    hasUpper: false,
    hasLower: false,
    hasDigit: false,
    hasSpecial: false,
  });

  // Extract token from query params
  const token = new URLSearchParams(window.location.search).get('token');

  const checkPasswordStrength = (pwd) => {
    const hasLength = pwd.length >= 8;
    const hasUpper = /[A-Z]/.test(pwd);
    const hasLower = /[a-z]/.test(pwd);
    const hasDigit = /\d/.test(pwd);
    const hasSpecial = /[ !@#$%^&*()_+=\-\[\]{}|;:'\",.<>?/`~]/.test(pwd);

    let score = 0;
    if (pwd.length > 0) {
      if (hasLength) score++;
      if (hasUpper) score++;
      if (hasLower) score++;
      if (hasDigit) score++;
      if (hasSpecial) score++;
    }

    setStrength({ score, hasLength, hasUpper, hasLower, hasDigit, hasSpecial });
  };

  const handlePasswordChange = (val) => {
    setForm({ ...form, password: val });
    checkPasswordStrength(val);
  };

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

    if (!token) {
      setError('Invalid or missing password reset token.');
      return;
    }

    if (strength.score < 5) {
      setError('Please fulfill all password strength criteria.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload = { 
        token, 
        password: form.password 
      };
      
      if (captchaRequired && captchaData) {
        payload.captcha_id = captchaData.captcha_id;
        payload.captcha_answer = captchaAnswer;
      }

      const res = await api.resetPassword(payload);
      setSuccess(res.detail || 'Password reset successfully! Redirecting...');
      setCaptchaRequired(false);
      setCaptchaData(null);
      setCaptchaAnswer('');
      
      setTimeout(() => {
        window.location.href = '/login';
      }, 3000);
    } catch (err) {
      if (err.detail && err.detail.captcha_required) {
        setCaptchaRequired(true);
        fetchCaptcha();
        setError(err.detail.message || 'Verification required. Please solve the CAPTCHA.');
      } else {
        setError(err.message || 'Failed to reset password. The link may have expired.');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStrengthLabel = () => {
    switch (strength.score) {
      case 0: return { label: 'None', color: 'var(--color-text-muted)' };
      case 1:
      case 2: return { label: 'Weak', color: 'var(--color-red)' };
      case 3:
      case 4: return { label: 'Medium', color: 'var(--color-accent-cyan)' };
      case 5: return { label: 'Strong', color: 'var(--color-green)' };
      default: return { label: 'None', color: 'var(--color-text-muted)' };
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
                    onChange={(e) => handlePasswordChange(e.target.value)}
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

                {/* Password Strength Meter */}
                {form.password.length > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Strength:</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: getStrengthLabel().color }}>
                        {getStrengthLabel().label}
                      </span>
                    </div>
                    {/* Strengths Bar */}
                    <div style={{ display: 'flex', gap: 4, height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2, overflow: 'hidden' }}>
                      {[1, 2, 3, 4, 5].map((idx) => {
                        let barColor = 'transparent';
                        if (idx <= strength.score) {
                          if (strength.score <= 2) barColor = 'var(--color-red)';
                          else if (strength.score <= 4) barColor = 'var(--color-accent-cyan)';
                          else barColor = 'var(--color-green)';
                        }
                        return (
                          <div
                            key={idx}
                            style={{
                              flex: 1,
                              background: barColor,
                              transition: 'background 0.3s ease',
                            }}
                          />
                        );
                      })}
                    </div>
                    {/* Criteria checklist */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: strength.hasLength ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {strength.hasLength ? 'check_circle' : 'circle'}
                        </span>
                        <span>At least 8 characters</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: strength.hasUpper ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {strength.hasUpper ? 'check_circle' : 'circle'}
                        </span>
                        <span>At least one uppercase letter</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: strength.hasLower ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {strength.hasLower ? 'check_circle' : 'circle'}
                        </span>
                        <span>At least one lowercase letter</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: strength.hasDigit ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {strength.hasDigit ? 'check_circle' : 'circle'}
                        </span>
                        <span>At least one number</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: strength.hasSpecial ? 'var(--color-green)' : 'var(--color-text-muted)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
                          {strength.hasSpecial ? 'check_circle' : 'circle'}
                        </span>
                        <span>At least one special character</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="reset-confirm-password"
                    className="input-premium"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    required
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
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
                      {showConfirmPassword ? 'visibility_off' : 'visibility'}
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
