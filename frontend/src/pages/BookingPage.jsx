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
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];
const DURATIONS = [30, 45, 60, 90, 120];
const COMM_METHODS = ['Video Call', 'Phone Call', 'In-Person', 'Email'];

export default function BookingPage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '',
    description: '',
    reason: '',
    meeting_type: 'Mentorship Session',
    priority: 'normal',
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
              <button className="btn btn-primary" onClick={() => { setSuccess(false); setStep(1); setForm({ title: '', description: '', reason: '', meeting_type: 'Mentorship Session', priority: 'normal', start_time: '', end_time: '', duration_minutes: 60, preferred_communication: 'Video Call' }); }}>
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
    <Layout>
      <main className="main-content" style={{ marginTop: 0 }}>
        <div className="ambient-bg" />
        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          {/* Page header */}
          <div className="page-header">
            <a href="/" style={{ color: 'var(--color-text-muted)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>arrow_back</span> Dashboard
            </a>
            <h1 className="page-title">Book a Meeting</h1>
            <p className="page-subtitle">Request a session with the executive team</p>
          </div>

          {/* Step progress */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: 36, overflowX: 'auto', paddingBottom: 10 }}>
            {steps.map((s, i) => (
              <React.Fragment key={i}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: i + 1 < step ? 'pointer' : 'default', flexShrink: 0 }} onClick={() => { if (i + 1 < step) setStep(i + 1); }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: step > i + 1 ? '#10b981' : step === i + 1 ? '#6C63FF' : 'rgba(255,255,255,0.08)', border: `2px solid ${step > i + 1 ? '#10b981' : step === i + 1 ? '#6C63FF' : 'var(--color-border)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: step >= i + 1 ? 'white' : 'var(--color-text-muted)', transition: 'var(--transition)' }}>
                    {step > i + 1 ? <span className="material-symbols-outlined" style={{ fontSize: 18 }}>check</span> : i + 1}
                  </div>
                  <span style={{ fontSize: 13, fontWeight: step === i + 1 ? 600 : 400, color: step === i + 1 ? 'var(--color-text-primary)' : 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>{s}</span>
                </div>
                {i < steps.length - 1 && <div style={{ flex: 1, height: 1, background: step > i + 1 ? '#10b981' : 'var(--color-border)', margin: '0 16px', transition: 'var(--transition)', minWidth: 20 }} />}
              </React.Fragment>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3 }} className="card" style={{ marginBottom: 20 }}>
              {error && (
                <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: 10, padding: '12px 16px', color: '#f87171', fontSize: 14, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span> {error}
                </div>
              )}

              {/* Step 1: Meeting Info */}
              {step === 1 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Meeting Information</h2>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Meeting Title *</label>
                    <input className="input" placeholder="e.g. Q4 Growth Strategy Discussion" value={form.title} onChange={(e) => field('title', e.target.value)} required />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Meeting Type *</label>
                    <div className="grid-3" style={{ gap: 8 }}>
                      {MEETING_TYPES.map(t => (
                        <button key={t} type="button" onClick={() => field('meeting_type', t)} style={{ padding: '10px 8px', borderRadius: 10, border: `1px solid ${form.meeting_type === t ? 'rgba(108, 99, 255, 0.5)' : 'var(--color-border)'}`, background: form.meeting_type === t ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255,255,255,0.03)', color: form.meeting_type === t ? '#6C63FF' : 'var(--color-text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'var(--transition)', textAlign: 'center' }}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Priority</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {PRIORITIES.map(p => {
                        const colors = { low: '#6ee7b7', normal: '#6C63FF', high: '#fb923c', urgent: '#ef4444' };
                        const c = colors[p];
                        return (
                          <button key={p} type="button" onClick={() => field('priority', p)} style={{ flex: 1, padding: '10px 0', borderRadius: 10, border: `1px solid ${form.priority === p ? c : 'var(--color-border)'}`, background: form.priority === p ? `${c}18` : 'rgba(255,255,255,0.03)', color: form.priority === p ? c : 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)', textTransform: 'capitalize' }}>
                            {p}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Reason for Meeting</label>
                    <textarea className="input" placeholder="Briefly describe why you'd like this meeting..." value={form.reason} onChange={(e) => field('reason', e.target.value)} style={{ minHeight: 90 }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Additional Details</label>
                    <textarea className="input" placeholder="Any context, agenda items, or documents to share..." value={form.description} onChange={(e) => field('description', e.target.value)} style={{ minHeight: 90 }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preferred Communication</label>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {COMM_METHODS.map(m => (
                        <button key={m} type="button" onClick={() => field('preferred_communication', m)} style={{ padding: '8px 16px', borderRadius: 100, border: `1px solid ${form.preferred_communication === m ? 'rgba(108, 99, 255, 0.5)' : 'var(--color-border)'}`, background: form.preferred_communication === m ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255,255,255,0.03)', color: form.preferred_communication === m ? '#6C63FF' : 'var(--color-text-secondary)', fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'var(--transition)' }}>
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
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Choose Date & Time</h2>
                  
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preferred Date & Time *</label>
                    <input className="input" type="datetime-local" value={form.start_time} onChange={(e) => handleStartTimeChange(e.target.value)} required min={new Date().toISOString().slice(0, 16)} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Duration</label>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {DURATIONS.map(d => (
                        <button key={d} type="button" onClick={() => handleDurationChange(d)} style={{ padding: '10px 20px', borderRadius: 100, border: `1px solid ${form.duration_minutes === d ? 'rgba(108, 99, 255, 0.5)' : 'var(--color-border)'}`, background: form.duration_minutes === d ? 'rgba(108, 99, 255, 0.12)' : 'rgba(255,255,255,0.03)', color: form.duration_minutes === d ? '#6C63FF' : 'var(--color-text-secondary)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)' }}>
                          {d < 60 ? `${d}m` : `${d / 60}h${d % 60 ? ` ${d % 60}m` : ''}`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {form.start_time && (
                    <div style={{ padding: 16, background: 'rgba(108, 99, 255, 0.06)', border: '1px solid rgba(108, 99, 255, 0.15)', borderRadius: 12 }}>
                      <p style={{ fontSize: 13, color: '#6C63FF', fontWeight: 600, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span> Selected Time
                      </p>
                      <p style={{ fontSize: 14, fontWeight: 700 }}>
                        {new Date(form.start_time).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                      <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                        {new Date(form.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} — {form.end_time && new Date(form.end_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} ({form.duration_minutes} min)
                      </p>
                    </div>
                  )}

                  {(alternatives.length > 0 || availableSlots.length > 0) && (
                    <div style={{ marginTop: 8 }}>
                      <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {alternatives.length > 0 ? 'Suggested Alternatives' : 'Available Slots'}
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {(alternatives.length > 0 ? alternatives : availableSlots).map((slot, i) => (
                          <button key={i} type="button" onClick={() => selectSlot(slot)} style={{ textAlign: 'left', padding: '12px', borderRadius: 12, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.02)', cursor: 'pointer', transition: 'var(--transition)' }} className="slot-btn">
                            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 2 }}>{slot.display_time.split(' IST')[0]}</p>
                            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{slot.display_date}</p>
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
                  <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Review Your Request</h2>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
                    {[
                      { label: 'Meeting', value: form.title },
                      { label: 'Type', value: form.meeting_type },
                      { label: 'Priority', value: form.priority.charAt(0).toUpperCase() + form.priority.slice(1) },
                      { label: 'Date', value: form.start_time ? new Date(form.start_time).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'long', day: 'numeric' }) : '—' },
                      { label: 'Time', value: form.start_time ? `${new Date(form.start_time).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })} (${form.duration_minutes} min)` : '—' },
                      { label: 'Via', value: form.preferred_communication },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', padding: '14px 18px', borderBottom: '1px solid var(--color-border)' }}>
                        <span style={{ width: 100, flexShrink: 0, fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
                        <span style={{ fontSize: 14, fontWeight: 500 }}>{value}</span>
                      </div>
                    ))}
                    {form.reason && (
                      <div style={{ padding: '14px 18px' }}>
                        <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 6 }}>Reason</p>
                        <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>{form.reason}</p>
                      </div>
                    )}
                  </div>
                  <div style={{ padding: 14, background: 'rgba(108, 99, 255, 0.06)', border: '1px solid rgba(108, 99, 255, 0.15)', borderRadius: 12 }}>
                    <p style={{ fontSize: 13, color: '#6C63FF', lineHeight: 1.6, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>mail</span> 
                      <span>A confirmation email will be sent to <strong>{user?.email}</strong> and you'll be notified once the admin reviews your request.</span>
                    </p>
                  </div>
                </div>
              )}
            </motion.div>

            {/* Navigation buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              {step > 1 ? (
                <button type="button" className="btn btn-secondary" onClick={() => setStep(s => s - 1)}>← Back</button>
              ) : (
                <a href="/" className="btn btn-secondary">← Dashboard</a>
              )}
              {step < 3 ? (
                <button type="button" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }} onClick={() => {
                  if (step === 1 && !form.title) { setError('Please enter a meeting title'); return; }
                  if (step === 2 && !form.start_time) { setError('Please select a date and time'); return; }
                  setError(''); setStep(s => s + 1);
                }}>
                  Continue <span className="material-symbols-outlined" style={{ fontSize: 18 }}>arrow_forward</span>
                </button>
              ) : (
                <button type="submit" className="btn btn-primary" disabled={loading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {loading ? <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>pending_actions</span> Submitting...</> : <><span className="material-symbols-outlined" style={{ fontSize: 18 }}>send</span> Submit Request</>}
                </button>
              )}
            </div>
          </form>
        </div>
      </main>
    </Layout>
  );
}
