import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const MEETING_TYPES = [
  'Mentorship Session', 'Strategy Review', 'Business Consultation', 
  'Investment Meeting', 'Partnership Discussion', 'Product Review', 'Other'
];
const PRIORITIES = ['low', 'medium', 'high'];
const DURATIONS = [30, 45, 60, 90, 120];
const COMM_METHODS = ['Video Call', 'Phone Call', 'In-Person', 'Email'];

export default function BookingPage() {
  const { user, isAdmin } = useAuth();
  if (isAdmin) {
    window.location.href = '/admin';
    return null;
  }
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '',
    description: '',
    reason: '',
    meeting_type: 'Mentorship Session',
    priority: 'medium',
    start_time: '',
    end_time: '',
    duration_minutes: 60,
    preferred_communication: 'Video Call',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [alternatives, setAlternatives] = useState([]);

  const field = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleStartTimeChange = (val) => {
    field('start_time', val);
    if (val) {
      const start = new Date(val);
      start.setMinutes(start.getMinutes() + form.duration_minutes);
      field('end_time', start.toISOString().slice(0, 16));
    }
  };

  const handleDurationChange = (dur) => {
    field('duration_minutes', dur);
    if (form.start_time) {
      const start = new Date(form.start_time);
      start.setMinutes(start.getMinutes() + dur);
      field('end_time', start.toISOString().slice(0, 16));
    }
  };

  // Fetch available slots when entering Step 2
  useEffect(() => {
    if (step === 2) {
      const fetchSlots = async () => {
        try {
          const now = new Date().toISOString();
          const data = await api.getAvailableSlots(now, form.duration_minutes, 8);
          setAvailableSlots(data.available_slots || []);
        } catch (err) {
          console.error('Failed to fetch slots:', err);
        }
      };
      fetchSlots();
    }
  }, [step, form.duration_minutes]);

  const selectSlot = (slot) => {
    setForm(f => ({
      ...f,
      start_time: slot.start_time.slice(0, 16),
      end_time: slot.end_time.slice(0, 16)
    }));
    setAlternatives([]);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title || !form.start_time || !form.end_time) {
      setError('Please fill all required fields');
      return;
    }
    const start = new Date(form.start_time);
    if (start < new Date()) { setError('Cannot book a past date'); return; }

    setLoading(true);
    try {
      // Send as ISO string to include timezone context if possible
      // (The backend parse_dt_to_ist handles naive strings as IST, 
      // but ISO is more robust)
      await api.createMeeting({
        ...form,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
      });
      setSuccess(true);
    } catch (err) {
      if (err.detail && err.detail.conflict) {
        setAlternatives(err.detail.alternative_slots || []);
        setError(err.detail.message);
        setStep(2); // Move back to schedule step to show alternatives
      } else {
        setError(err.message || 'Booking failed');
      }
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <Layout>
        <main className="main-content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ textAlign: 'center', maxWidth: 440 }}>
            <div style={{ width: 80, height: 80, background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 40, color: '#10b981' }}>check</span>
            </div>
            <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 12 }}>Request Submitted!</h1>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 15, lineHeight: 1.7, marginBottom: 32 }}>
              Your meeting request has been sent. You'll receive an email notification once the admin reviews your request.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <a href="/" className="btn btn-secondary">← Back to Dashboard</a>
              <button className="btn btn-primary" onClick={() => { setSuccess(false); setStep(1); setForm({ title: '', description: '', reason: '', meeting_type: 'Mentorship Session', priority: 'medium', start_time: '', end_time: '', duration_minutes: 60, preferred_communication: 'Video Call' }); }}>
                Book Another
              </button>
            </div>
          </motion.div>
        </main>
      </Layout>
    );
  }

  const steps = ['Meeting Info', 'Schedule', 'Review'];

  return (
    <Layout title="Book Meeting">
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
        <div style={{ position: 'absolute', top: '10%', left: '30%', width: 400, height: 400, background: 'rgba(59,130,255,0.03)', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0 }} />

        <div style={{ width: '100%', maxWidth: 680, position: 'relative', zIndex: 1 }}>
          {/* Page header */}
          <div style={{ borderBottom: '1px solid var(--color-border)', paddingBottom: 16, marginBottom: 24 }}>
            <a href="/" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 12, fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span> Back to Dashboard
            </a>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>Book a Meeting</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, marginBottom: 0 }}>Request a session with the executive mentorship team.</p>
          </div>

          {/* Step progress */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32, padding: '0 8px' }}>
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: i + 1 < step ? 'pointer' : 'default' }} onClick={() => { if (i + 1 < step) setStep(i + 1); }}>
                  <div 
                    style={{ 
                      width: 28, 
                      height: 28, 
                      borderRadius: '50%', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justify: 'center', 
                      justifyContent: 'center',
                      background: step > i + 1 ? 'var(--color-green)' : step === i + 1 ? 'var(--color-accent)' : 'rgba(255,255,255,0.04)', 
                      border: `1.5px solid ${step > i + 1 ? 'var(--color-green)' : step === i + 1 ? 'var(--color-accent)' : 'var(--color-border)'}`, 
                      color: step >= i + 1 ? 'white' : 'var(--color-text-secondary)',
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: 'var(--font-mono)'
                    }}
                  >
                    {step > i + 1 ? <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span> : i + 1}
                  </div>
                  <span 
                    style={{ 
                      fontSize: 13,
                      fontWeight: step === i + 1 ? 700 : 500, 
                      color: step === i + 1 ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                      fontFamily: 'var(--font-heading)'
                    }}
                  >
                    {s}
                  </span>
                </div>
                {i < steps.length - 1 && (
                  <div 
                    style={{ 
                      flex: 1,
                      height: 1.5,
                      margin: '0 16px',
                      background: step > i + 1 ? 'var(--color-green)' : 'var(--color-border)' 
                    }} 
                  />
                )}
              </React.Fragment>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="glass-premium" style={{ padding: 28, marginBottom: 20 }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span> {error}
                </div>
              )}

              {/* Step 1: Meeting Info */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}>Meeting Information</h2>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Meeting Title *</label>
                    <input className="input-premium" placeholder="e.g. Q4 Growth Strategy Discussion" value={form.title} onChange={(e) => field('title', e.target.value)} required />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Meeting Type *</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8 }}>
                      {MEETING_TYPES.map(t => (
                        <button key={t} type="button" onClick={() => field('meeting_type', t)} style={{ padding: '10px 8px', borderRadius: 10, border: `1px solid ${form.meeting_type === t ? 'rgba(59, 130, 246, 0.4)' : 'var(--color-border)'}`, background: form.meeting_type === t ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.02)', color: form.meeting_type === t ? 'var(--color-accent)' : 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition-fast)', textAlign: 'center' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Priority</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                      {PRIORITIES.map(p => {
                        const colors = { low: 'var(--color-green)', medium: 'var(--color-accent)', high: 'var(--color-accent-orange)' };
                        const c = colors[p];
                        return (
                          <button key={p} type="button" onClick={() => field('priority', p)} style={{ padding: '10px 0', borderRadius: 10, border: `1px solid ${form.priority === p ? c : 'var(--color-border)'}`, background: form.priority === p ? `${c}15` : 'rgba(255,255,255,0.02)', color: form.priority === p ? c : 'var(--color-text-secondary)', fontSize: 12, fontWeight: 700, cursor: 'pointer', transition: 'var(--transition-fast)', textTransform: 'capitalize' }}>
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Reason for Meeting</label>
                    <textarea className="input-premium" placeholder="Briefly describe why you'd like this meeting..." value={form.reason} onChange={(e) => field('reason', e.target.value)} style={{ minHeight: 90 }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Additional Details</label>
                    <textarea className="input-premium" placeholder="Any context, agenda items, or documents to share..." value={form.description} onChange={(e) => field('description', e.target.value)} style={{ minHeight: 90 }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Preferred Communication</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {COMM_METHODS.map(m => (
                        <button key={m} type="button" onClick={() => field('preferred_communication', m)} style={{ padding: '8px 16px', borderRadius: 100, border: `1px solid ${form.preferred_communication === m ? 'rgba(59, 130, 246, 0.4)' : 'var(--color-border)'}`, background: form.preferred_communication === m ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.02)', color: form.preferred_communication === m ? 'var(--color-accent)' : 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition-fast)' }}>
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Schedule */}
              {step === 2 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}>Choose Date & Time</h2>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Preferred Date & Time *</label>
                    <input className="input-premium" type="datetime-local" value={form.start_time} onChange={(e) => handleStartTimeChange(e.target.value)} required min={new Date().toISOString().slice(0, 16)} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Duration</label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {DURATIONS.map(d => (
                        <button key={d} type="button" onClick={() => handleDurationChange(d)} style={{ padding: '10px 20px', borderRadius: 100, border: `1px solid ${form.duration_minutes === d ? 'rgba(59, 130, 246, 0.4)' : 'var(--color-border)'}`, background: form.duration_minutes === d ? 'rgba(59, 130, 246, 0.12)' : 'rgba(255,255,255,0.02)', color: form.duration_minutes === d ? 'var(--color-accent)' : 'var(--color-text-secondary)', fontSize: 13, fontWeight: 700, cursor: 'pointer', transition: 'var(--transition-fast)' }}>
                          {d < 60 ? `${d}m` : `${d / 60}h${d % 60 ? ` ${d % 60}m` : ''}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.start_time && (
                    <div style={{ padding: 16, background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: 12 }}>
                      <p style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 700, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-mono)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span> Selected Time
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)' }}>
                        {new Date(form.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 2 }}>
                        {new Date(form.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — {form.end_time && new Date(form.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ({form.duration_minutes} min)
                      </p>
                    </div>
                  )}

                  {(alternatives.length > 0 || availableSlots.length > 0) && (
                    <div style={{ marginTop: 8 }}>
                      <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>
                        {alternatives.length > 0 ? 'Suggested Alternatives' : 'Available Slots'}
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 10 }}>
                        {(alternatives.length > 0 ? alternatives : availableSlots).map((slot, i) => (
                          <button key={i} type="button" onClick={() => selectSlot(slot)} style={{ textAlign: 'left', padding: '12px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.01)', cursor: 'pointer', transition: 'var(--transition-fast)' }} onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--color-accent)'; e.currentTarget.style.background = 'rgba(59, 130, 246, 0.03)'; }} onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'rgba(255,255,255,0.01)'; }}>
                            <p style={{ fontSize: 13, fontWeight: 700, marginBottom: 2, color: 'var(--color-text-primary)' }}>{slot.display_time.split(' IST')[0]}</p>
                            <p style={{ fontSize: 11, color: 'var(--color-text-secondary)' }}>{slot.display_date}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 3: Review */}
              {step === 3 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 800, marginBottom: 4, fontFamily: 'var(--font-heading)', color: 'var(--color-text-primary)' }}>Review Your Request</h2>
                  <div style={{ background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
                    {[
                      { label: 'Meeting', value: form.title },
                      { label: 'Type', value: form.meeting_type },
                      { label: 'Priority', value: form.priority.charAt(0).toUpperCase() + form.priority.slice(1) },
                      { label: 'Date', value: form.start_time ? new Date(form.start_time).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                      { label: 'Time', value: form.start_time ? `${new Date(form.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (${form.duration_minutes} min)` : '—' },
                      { label: 'Via', value: form.preferred_communication },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ width: 100, flexShrink: 0, fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>{label}</span>
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</span>
                      </div>
                    ))}
                    {form.reason && (
                      <div style={{ padding: '14px 18px' }}>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>Reason</p>
                        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{form.reason}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 14, background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.15)', borderRadius: 12 }}>
                    <p style={{ fontSize: 13, color: 'var(--color-accent)', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 8, margin: 0 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>mail</span> 
                      <span>A confirmation email will be sent to <strong>{user?.email}</strong> and you'll be notified once the admin reviews your request.</span>
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              {step > 1 ? (
                <button type="button" className="btn-premium btn-premium-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>
              ) : (
                <a href="/" className="btn-premium btn-premium-secondary" style={{ textDecoration: 'none' }}>← Dashboard</a>
              )}
              {step < 3 ? (
                <button type="button" className="btn-premium btn-premium-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => {
                  if (step === 1 && !form.title) { setError('Please enter a meeting title'); return; }
                  if (step === 2 && !form.start_time) { setError('Please select a date and time'); return; }
                  setError(''); setStep(s => s + 1);
                }}>
                  Continue <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                </button>
              ) : (
                <button type="submit" className="btn-premium btn-premium-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {loading ? <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>pending_actions</span> Submitting...</> : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span> Submit Request</>}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
}
