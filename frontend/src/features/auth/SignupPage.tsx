import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../lib/auth';
import { useToast } from '../../components/ui/Toast';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

export const SignupPage: React.FC = () => {
  const { register } = useAuth();
  const { showToast } = useState() as any; // Wait, we can get showToast from useToast
  const toast = useToast();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [registered, setRegistered] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    setError('');
    setLoading(true);
    try {
      await register({
        name,
        email,
        password,
        phone: phone || undefined,
        company: company || undefined,
        job_title: jobTitle || undefined,
      });
      toast.showToast('Account registered! Please check your email to verify.', 'success');
      setRegistered(true);
    } catch (err: any) {
      setError(err.message || 'Registration failed');
      toast.showToast(err.message || 'Registration failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm max-w-md w-full">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full flex items-center justify-center text-3xl mx-auto mb-6">
            ✓
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Registration Successful</h1>
          <p className="text-sm text-slate-500 mb-6 leading-relaxed">
            We have sent a verification link to <strong className="text-slate-800">{email}</strong>. 
            Please check your inbox and verify your email address to log in.
          </p>
          <Button onClick={() => window.location.href = '/login'}>Go to Login</Button>
        </div>
      </div>
    );
  }

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
            Signup page
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
      <div className="flex-1 flex flex-col justify-center items-center bg-[#f8f9fc] p-12 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-[460px] my-8"
        >
          <div className="bg-white rounded-3xl border border-slate-200/80 p-12 shadow-[0_8px_40px_rgba(0,0,0,0.02)]">
            <h2 className="text-3.5xl font-black text-slate-900 mb-10 text-center" style={{ fontFamily: "'Outfit', sans-serif", letterSpacing: '-0.03em' }}>
              Create an account
            </h2>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-4 text-sm mb-8">
                {error}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name *</label>
                <input
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#007AFF] focus:bg-white focus:ring-4 focus:ring-[#007AFF]/10 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email Address *</label>
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
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password *</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#007AFF] focus:bg-white focus:ring-4 focus:ring-[#007AFF]/10 transition-all"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Phone Number</label>
                <input
                  placeholder="+1 (555) 000-0000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#007AFF] focus:bg-white focus:ring-4 focus:ring-[#007AFF]/10 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Company</label>
                  <input
                    placeholder="Acme Corp"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#007AFF] focus:bg-white focus:ring-4 focus:ring-[#007AFF]/10 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Job Title</label>
                  <input
                    placeholder="CEO"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    disabled={loading}
                    className="w-full bg-[#f8f9fc] border border-slate-200 rounded-xl px-4 py-3.5 text-sm text-slate-800 placeholder-slate-400 outline-none focus:border-[#007AFF] focus:bg-white focus:ring-4 focus:ring-[#007AFF]/10 transition-all"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading} 
                className="w-full mt-4 bg-[#007AFF] hover:bg-[#0066d6] text-white font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-md flex justify-center items-center gap-2 text-sm disabled:opacity-50"
              >
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="text-center mt-10 text-sm text-slate-500">
              Already have an account?{" "}
              <a href="/login" className="text-[#007AFF] hover:underline font-semibold">
                Log in
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
export default SignupPage;
