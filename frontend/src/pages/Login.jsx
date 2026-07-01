import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../lib/auth';
import { api } from '../constants/api';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Captcha state
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const fetchCaptcha = async () => {
    try {
      const data = await api.getCaptcha();
      setCaptchaId(data.captcha_id);
      setCaptchaQuestion(data.question);
      setCaptchaAnswer('');
    } catch (err) {
      console.error('Failed to load CAPTCHA:', err);
    }
  };

  const handleCredentialLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    if (captchaRequired && !captchaAnswer) {
      setError('Please answer the CAPTCHA question');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const payload = {
        email,
        password,
        ...(captchaRequired ? { captcha_id: captchaId, captcha_answer: captchaAnswer } : {})
      };
      const user = await login(payload);
      window.location.href = (user.role?.toLowerCase() === 'admin' || user.email?.toLowerCase() === 'tharunriot@gmail.com') ? '/admin' : '/';
    } catch (err) {
      // Check if CAPTCHA is required (usually 400 error status with captcha_required flag in detail)
      if (err.detail && err.detail.captcha_required) {
        setCaptchaRequired(true);
        fetchCaptcha();
      }
      setError(err.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (response) => {
    setError('');
    setLoading(true);
    try {
      const user = await login({ google_credential: response.credential });
      window.location.href = (user.role?.toLowerCase() === 'admin' || user.email?.toLowerCase() === 'tharunriot@gmail.com') ? '/admin' : '/';
    } catch (err) {
      setError(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: "793728037081-03p54l6ntfisafaavflhpmtq5o3dfs1g.apps.googleusercontent.com",
          callback: handleGoogleLogin,
        });
        window.google.accounts.id.renderButton(
          document.getElementById("google-signin-btn"),
          { theme: "outline", size: "large", width: "100%", text: "continue_with" }
        );
      } else {
        setTimeout(initializeGoogleSignIn, 100);
      }
    };
    initializeGoogleSignIn();
  }, []);

  return (
    <div className="login-split-container" style={{ display: 'flex', minHeight: '100vh', fontFamily: "'Inter', sans-serif", background: '#ffffff' }}>
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />
      
      {/* Left panel - Dark blue brand display */}
      <div className="brand-side" style={{ flex: '0 0 45%', background: 'linear-gradient(135deg, #030f26 0%, #081b3b 100%)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px', color: '#ffffff', position: 'relative', overflow: 'hidden' }}>
        {/* Glow decoration */}
        <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '400px', height: '400px', background: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(50px)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ zIndex: 2 }}>
          <span style={{ fontSize: '24px', fontWeight: 900, letterSpacing: '1px', fontFamily: "'Outfit', sans-serif" }}>
            SISU<span style={{ color: '#007AFF' }}>.</span>
          </span>
        </div>

        {/* Hero Title */}
        <div style={{ zIndex: 2, margin: 'auto 0' }}>
          <h1 style={{ fontSize: '64px', fontWeight: 800, fontStyle: 'italic', lineHeight: 1.1, color: '#ffffff', fontFamily: "'Outfit', sans-serif", marginBottom: '16px' }}>
            Login page
          </h1>
          <p style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)', fontWeight: 400 }}>
            Start your journey now with us
          </p>
        </div>

        {/* Footer info/copyright */}
        <div style={{ zIndex: 2, fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          © Sisu Executive Mentorship Portal
        </div>
      </div>

      {/* Right panel - Form container */}
      <div className="form-side" style={{ flex: '1', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', background: '#f8f9fc', padding: '40px' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          style={{ width: '100%', maxWidth: '420px' }}
        >
          {/* Card */}
          <div style={{ background: '#ffffff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.03), 0 1px 2px rgba(0,0,0,0.02)', padding: '40px 32px' }}>
            <h2 style={{ fontSize: '28px', fontWeight: 700, color: '#0f172a', fontFamily: "'Outfit', sans-serif", marginBottom: '28px', textAlign: 'center' }}>
              Login to your account
            </h2>

            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px', color: '#991b1b', fontSize: '13.5px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>warning</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCredentialLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Email field */}
              <div>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#475569', marginBottom: '6px' }}>Email</label>
                <input
                  type="email"
                  placeholder="balamia@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px',
                    color: '#0f172a',
                    outline: 'none',
                    transition: 'border-color 0.2s, box-shadow 0.2s',
                  }}
                  className="input-focus-effect"
                />
              </div>

              {/* Password field */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '14px', fontWeight: 500, color: '#475569' }}>Password</label>
                  <a href="/forgot-password" style={{ fontSize: '13.5px', fontWeight: 600, color: '#007AFF', textDecoration: 'none' }}>
                    Forgot?
                  </a>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    style={{
                      width: '100%',
                      padding: '12px 48px 12px 16px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '15px',
                      color: '#0f172a',
                      outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    className="input-focus-effect"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'none',
                      border: 'none',
                      color: '#64748b',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      padding: 4
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                      {showPassword ? 'visibility_off' : 'visibility'}
                    </span>
                  </button>
                </div>
              </div>

              {/* CAPTCHA dynamic rendering */}
              {captchaRequired && (
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                  <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                    Security Check: {captchaQuestion}
                  </label>
                  <input
                    type="text"
                    placeholder="Your answer"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                    }}
                  />
                </div>
              )}

              {/* Login Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  background: '#007AFF',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '14px',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'background 0.2s, transform 0.1s',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '4px'
                }}
                className="btn-login-hover"
              >
                {loading ? 'Logging in...' : 'Login now'}
              </button>
            </form>

            <div style={{ display: 'flex', alignItems: 'center', margin: '24px 0', color: '#cbd5e1' }}>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
              <span style={{ padding: '0 12px', fontSize: '13px', color: '#94a3b8', fontWeight: 500 }}>or</span>
              <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }} />
            </div>

            {/* Google Sign in */}
            <div style={{ width: '100%' }}>
              <div id="google-signin-btn" style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
            </div>

            <p style={{ textAlign: 'center', marginTop: '28px', color: '#64748b', fontSize: '14px', margin: '28px 0 0 0' }}>
              Don't have an account?{' '}
              <a href="/signup" style={{ color: '#007AFF', fontWeight: 600, textDecoration: 'none' }}>
                Sign up
              </a>
            </p>
          </div>

          {/* Demo hint info box */}
          <div style={{ marginTop: '20px', padding: '12px 16px', textAlign: 'center', borderRadius: '12px', background: 'rgba(0,0,0,0.02)', border: '1px dashed rgba(0,0,0,0.06)' }}>
            <p style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.5, margin: 0 }}>
              First registered account becomes <strong style={{ color: '#007AFF' }}>Admin</strong>.<br />
              Subsequent accounts become <strong style={{ color: '#0ea5e9' }}>Clients</strong>.
            </p>
          </div>
        </motion.div>
      </div>

      <style>{`
        .input-focus-effect:focus {
          border-color: #007AFF !important;
          box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.12) !important;
        }
        .btn-login-hover:hover {
          background: #0066d6 !important;
        }
        .btn-login-hover:active {
          transform: scale(0.98);
        }
        @media (max-width: 768px) {
          .login-split-container {
            flex-direction: column !important;
          }
          .brand-side {
            display: none !important;
          }
          .form-side {
            padding: 24px !important;
            min-height: 100vh !important;
          }
        }
      `}</style>
    </div>
  );
}

