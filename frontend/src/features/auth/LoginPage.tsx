import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/auth';
import { client } from '../../api/client';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { env } from '../../config/env';

declare global {
  interface Window {
    google: any;
  }
}

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // CAPTCHA
  const [captchaRequired, setCaptchaRequired] = useState(false);
  const [captchaId, setCaptchaId] = useState('');
  const [captchaQuestion, setCaptchaQuestion] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');

  const fetchCaptcha = async () => {
    try {
      const res: any = await client.get('/auth/captcha');
      setCaptchaId(res.captcha_id);
      setCaptchaQuestion(res.question);
      setCaptchaAnswer('');
    } catch (err) {
      showToast('Failed to load CAPTCHA', 'error');
    }
  };

  const handleCredentialLogin = async (e: React.FormEvent) => {
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
        ...(captchaRequired ? { captcha_id: captchaId, captcha_answer: captchaAnswer } : {}),
      };
      const user = await login(payload);
      showToast(`Welcome back, ${user.name}!`, 'success');
      window.location.href = (user.role === 'admin' || user.role === 'super_admin') ? '/admin' : '/';
    } catch (err: any) {
      if (err.response?.data?.error?.details?.captcha_required) {
        setCaptchaRequired(true);
        fetchCaptcha();
      }
      setError(err.message || 'Invalid email or password');
      showToast(err.message || 'Login failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async (response: any) => {
    setError('');
    setLoading(true);
    try {
      const user = await login({ google_credential: response.credential });
      showToast(`Welcome back, ${user.name}!`, 'success');
      window.location.href = (user.role === 'admin' || user.role === 'super_admin') ? '/admin' : '/';
    } catch (err: any) {
      setError(err.message || 'Google authentication failed');
      showToast(err.message || 'Google Sign-in failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (window.google && env.googleClientId) {
        window.google.accounts.id.initialize({
          client_id: env.googleClientId,
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
    <div className="flex min-h-screen bg-white font-sans">
      <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800&display=swap" rel="stylesheet" />
      
      {/* Left panel - Deep navy blue gradient brand panel */}
      <div className="hidden md:flex md:w-[45%] bg-gradient-to-b from-[#030f26] to-[#081b3b] flex-col justify-between p-16 text-white relative overflow-hidden">
        {/* Glow effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[400px] height-[400px] bg-[radial-gradient(circle,rgba(59,130,246,0.15)_0%,transparent_70%)] rounded-full filter blur-[50px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] height-[400px] bg-[radial-gradient(circle,rgba(6,182,212,0.1)_0%,transparent_70%)] rounded-full filter blur-[50px] pointer-events-none" />

        {/* Logo */}
        <div className="z-10">
          <span className="text-2xl font-black tracking-wider font-heading uppercase text-white" style={{ fontFamily: "'Outfit', sans-serif" }}>
            SISU<span className="text-[#007AFF]">.</span>
          </span>
        </div>

        {/* Brand Slogan */}
        <div className="z-10 my-auto space-y-3">
          <h1 className="text-7xl font-black italic tracking-tight text-white mb-6" style={{ fontFamily: "'Outfit', sans-serif", lineHeight: '1.05' }}>
            Login page
          </h1>
          <p className="text-3xl font-light text-slate-300 leading-normal" style={{ fontFamily: "'Outfit', sans-serif" }}>
            Start your journey <br />
            now with us
          </p>
        </div>

        {/* Footer */}
        <div className="z-10 text-xs text-slate-500 font-medium">
          &copy; {new Date().getFullYear()} SISU Executive Mentorship Portal
        </div>
      </div>

      {/* Right panel - Clean minimalist Card */}
      <div className="flex-1 flex flex-col justify-center items-center bg-[#f8f9fc] p-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[440px]"
        >
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 shadow-[0_8px_40px_rgba(0,0,0,0.02)]">
            <h2 className="text-3.5xl font-black text-slate-900 mb-10 text-center" style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.03em' }}>
              Login to your account
            </h2>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-sm mb-8 flex items-center gap-2">
                <span className="material-symbols-outlined text-lg">warning</span>
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCredentialLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  placeholder="balamia@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#007AFF] focus:bg-white focus:ring-4 focus:ring-[#007AFF]/10 transition-all"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
                  <a href="/forgot-password" className="text-xs font-bold text-[#007AFF] hover:underline">
                    Forgot?
                  </a>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-4 py-3.5 pr-12 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#007AFF] focus:bg-white focus:ring-4 focus:ring-[#007AFF]/10 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-[50%] transform translate-y-[-50%] text-slate-400 hover:text-slate-600 focus:outline-none flex items-center"
                  >
                    <span className="material-symbols-outlined text-xl">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              {captchaRequired && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 space-y-3">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Security Check: {captchaQuestion}
                  </label>
                  <input
                    placeholder="Your answer"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    required
                    className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 outline-none focus:border-[#007AFF] focus:bg-white focus:ring-4 focus:ring-[#007AFF]/10 transition-all"
                  />
                </div>
              )}

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full mt-4 bg-[#007AFF] hover:bg-[#0066d6] text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-md flex justify-center items-center gap-2 text-sm disabled:opacity-50"
              >
                {loading ? "Logging in..." : "Login now"}
              </button>
            </form>

            <div className="flex items-center my-8 text-slate-300">
              <div className="flex-1 h-[1px] bg-slate-200" />
              <span className="px-4 text-xs text-slate-400 font-semibold uppercase tracking-wider">or</span>
              <div className="flex-1 h-[1px] bg-slate-200" />
            </div>

            <div id="google-signin-btn" className="w-full flex justify-center" />

            <p className="text-center mt-10 text-sm text-slate-500">
              Don't have an account?{" "}
              <a href="/signup" className="text-[#007AFF] hover:underline font-semibold">
                Sign up
              </a>
            </p>
          </div>

          {/* Hint */}
          <div className="mt-8 p-5 text-center rounded-2xl bg-slate-100/50 border border-dashed border-slate-200">
            <p className="text-xs text-slate-500 leading-normal">
              First registered account becomes <strong className="text-[#007AFF]">Admin</strong>.<br />
              Subsequent accounts become <strong className="text-[#007AFF]/80">Clients</strong>.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
export default LoginPage;
