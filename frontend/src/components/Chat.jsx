import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';

export default function Chat({ onMeetingBooked }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      id: 1, sender: 'ai',
      text: `Hello${user?.name ? `, ${user.name.split(' ')[0]}` : ''}! I'm your SISU booking assistant. I can help you schedule a session with our mentorship team. What would you like to discuss?`,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showSlots, setShowSlots] = useState(false);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [isBooking, setIsBooking] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [pendingSlot, setPendingSlot] = useState(null);
  const [bookingForm, setBookingForm] = useState({ meeting_type: 'Mentorship Session', preferred_communication: 'video', priority: 'normal', reason: '' });
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [messages, showCalendar, showSlots, isTyping]);

  const addMsg = (sender, text) => {
    const msg = { id: Date.now() + Math.random(), sender, text, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  const handleSend = async (customMessage = null) => {
    const messageText = customMessage || input;
    if (!messageText.trim()) return;
    if (!customMessage) setInput('');
    addMsg('user', messageText);

    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text
      }));
      const data = await api.chat(messageText, history);
      setIsTyping(false);
      let aiText = data.response || `Error: ${data.error}`;
      let triggerCalendar = false;
      if (aiText.includes('[SHOW_CALENDAR]')) {
        triggerCalendar = true;
        aiText = aiText.replace('[SHOW_CALENDAR]', '').trim();
      }
      addMsg('ai', aiText);
      if (triggerCalendar) setShowCalendar(true);
    } catch (err) {
      setIsTyping(false);
      addMsg('ai', 'Connection issue — please try again.');
    }
  };

  const handleDateSelect = async (year, month, day) => {
    setSelectedDate({ year, month, day });
    setShowCalendar(false);
    addMsg('ai', `Great choice! Let me check availability for ${new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}...`);

    try {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const slots = await api.getFreeSlots(dateStr, 60);
      setAvailableSlots(slots);
      setShowSlots(true);
      addMsg('ai', 'Here are the available time slots for that day:');
    } catch {
      const fallbackSlots = [];
      const d = new Date(year, month, day, 10, 0);
      const endD = new Date(year, month, day, 20, 0);
      while (d.getTime() + 60*60*1000 <= endD.getTime()) {
        const end = new Date(d.getTime() + 60*60*1000);
        fallbackSlots.push({
          label: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          start: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          end: end.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        });
        d.setMinutes(d.getMinutes() + 60);
      }
      setAvailableSlots(fallbackSlots);
      setShowSlots(true);
      addMsg('ai', 'Here are some available time slots:');
    }
  };

  const handleSlotSelect = async (slot) => {
    if (!selectedDate) return;
    setShowSlots(false);
    setPendingSlot(slot);
    addMsg('ai', `Perfect! You selected ${slot.label}. Please fill out these final details to complete your booking:`);
  };

  const confirmBooking = async () => {
    if (!pendingSlot) return;
    setIsBooking(true);
    const slot = pendingSlot;
    setPendingSlot(null);
    const { year, month, day } = selectedDate;
    const startStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${slot.start || '10:00'}:00`;
    const endStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T${slot.end || '11:00'}:00`;

    try {
      await api.createMeeting({
        title: `Mentorship Session — ${user?.name || 'Client'}`,
        meeting_type: bookingForm.meeting_type,
        priority: bookingForm.priority,
        start_time: startStr,
        end_time: endStr,
        duration_minutes: 60,
        preferred_communication: bookingForm.preferred_communication,
        reason: bookingForm.reason || 'Booked via AI assistant',
      });

      const methodLabels = {
        'video': 'Google Meet',
        'phone': 'Phone Call',
        'in_person': 'In Person'
      };
      const methodLabel = methodLabels[bookingForm.preferred_communication] || bookingForm.preferred_communication;

      addMsg('ai', `Your ${bookingForm.meeting_type} for ${slot.label} on ${new Date(year, month, day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} has been submitted! We will connect via ${methodLabel}. You'll receive an email confirmation once the admin approves.`);
      if (onMeetingBooked) onMeetingBooked();
      setBookingForm({ meeting_type: 'Mentorship Session', preferred_communication: 'video', priority: 'normal', reason: '' });
    } catch (err) {
      addMsg('ai', `Sorry, I couldn't complete the booking: ${err.message}. Please try the Book Meeting page instead.`);
    } finally {
      setIsBooking(false);
      setSelectedDate(null);
    }
  };

  // Inline mini calendar
  const CalendarInline = () => {
    const now = new Date();
    const [viewYear, setViewYear] = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const today = now.getDate();
    const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    return (
      <motion.div initial={{ opacity: 0, y: 8, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 18, margin: '8px 0', maxWidth: 380, boxShadow: '0 16px 50px rgba(17, 24, 39, 0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <button onClick={() => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); }}
            style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, color: '#475569', cursor: 'pointer', padding: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
          </button>
          <span style={{ fontSize: 16, fontWeight: 800, letterSpacing: 0, color: '#111827' }}>{monthName}</span>
          <button onClick={() => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); }}
            style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, color: '#475569', cursor: 'pointer', padding: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 42px)', gap: 6, justifyContent: 'center', marginBottom: 10 }}>
          {['S','M','T','W','T','F','S'].map((d, i) => (
            <div key={i} style={{ height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#94A3B8' }}>{d}</div>
          ))}
          {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const isPast = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day < today;
            const isToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === today;
            return (
              <button key={day} disabled={isPast}
                onClick={() => handleDateSelect(viewYear, viewMonth, day)}
                style={{ width: 42, height: 36, textAlign: 'center', borderRadius: 8, border: isToday ? 'none' : '1px solid #111111', background: isToday ? 'linear-gradient(135deg, #6C63FF, #00C2FF)' : '#111111', color: isPast ? 'rgba(255,255,255,0.3)' : '#FFFFFF', fontSize: 13, cursor: isPast ? 'default' : 'pointer', fontWeight: isToday ? 800 : 600, transition: 'all 0.15s', boxShadow: isToday ? '0 8px 18px rgba(108, 99, 255, 0.25)' : 'none', opacity: isPast ? 0.75 : 1 }}
                onMouseEnter={(e) => { if (!isPast && !isToday) { e.currentTarget.style.background = '#2A2A2A'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                onMouseLeave={(e) => { if (!isToday) { e.currentTarget.style.background = '#111111'; e.currentTarget.style.transform = 'translateY(0)'; } }}
              >{day}</button>
            );
          })}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 2 }}>
          <span style={{ width: 8, height: 8, borderRadius: 3, background: 'linear-gradient(135deg, #6C63FF, #00C2FF)' }} />
          <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Tap a date to check available slots</span>
        </div>
      </motion.div>
    );
  };

  const quickPrompts = [
    'Book a meeting', 'Pricing info', 'About SISU', 'How does it work?'
  ];

  return (
    <section style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', position: 'relative', background: 'var(--color-bg)' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(20px)', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6C63FF, #00C2FF)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'white' }}>smart_toy</span>
        </div>
        <div>
          <p style={{ fontWeight: 700, fontSize: 14 }}>SISU Assistant</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981' }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>Always available</span>
          </div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <a href="/book" className="btn btn-secondary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>calendar_today</span> Full booking form
          </a>
        </div>
      </div>

      {/* Messages */}
      <div ref={chatRef} style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16, paddingBottom: 120 }}>
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: msg.sender === 'user' ? 'linear-gradient(135deg, #6C63FF, #00C2FF)' : 'rgba(0,0,0,0.05)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {msg.sender === 'user' ? (
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'white' }}>{user?.name?.[0] || 'U'}</span>
                ) : (
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-text-secondary)' }}>smart_toy</span>
                )}
              </div>
              <div style={{ maxWidth: '75%', display: 'flex', flexDirection: 'column', alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{ padding: '12px 16px', borderRadius: msg.sender === 'user' ? '18px 4px 18px 18px' : '4px 18px 18px 18px', background: msg.sender === 'user' ? 'linear-gradient(135deg, #6C63FF, #00C2FF)' : '#F3F4F6', border: msg.sender === 'user' ? 'none' : '1px solid var(--color-border)', color: msg.sender === 'user' ? '#FFFFFF' : '#111111', fontSize: 14, lineHeight: 1.6 }}>
                  {msg.text}
                </div>
                <span style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 4 }}>{msg.time}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isTyping && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-text-secondary)' }}>smart_toy</span>
            </div>
            <div style={{ padding: '12px 16px', background: '#FFFFFF', border: '1px solid var(--color-border)', borderRadius: '4px 18px 18px 18px', display: 'flex', gap: 5 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: '#818cf8', animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
            </div>
          </motion.div>
        )}

        {showCalendar && <CalendarInline />}

        {showSlots && !isBooking && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 380, boxShadow: '0 16px 50px rgba(17, 24, 39, 0.08)' }}>
            <p style={{ fontSize: 13, fontWeight: 800, color: '#111827', marginBottom: 4 }}>Available slots</p>
            {availableSlots.map((slot) => (
              <button key={slot.label} onClick={() => handleSlotSelect(slot)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderRadius: 10, border: '1px solid rgba(108, 99, 255, 0.18)', background: '#F8FAFF', color: '#111827', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#EEF2FF'; e.currentTarget.style.borderColor = 'rgba(108, 99, 255, 0.45)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#F8FAFF'; e.currentTarget.style.borderColor = 'rgba(108, 99, 255, 0.18)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: '#6C63FF' }}>schedule</span> {slot.label}
                </span>
                <span style={{ fontSize: 12, color: '#6C63FF' }}>Select</span>
              </button>
            ))}
          </motion.div>
        )}

        {pendingSlot && !isBooking && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 16, padding: 20, maxWidth: 380, boxShadow: '0 16px 50px rgba(17, 24, 39, 0.08)' }}>
            <h4 style={{ fontSize: 14, fontWeight: 800, marginBottom: 16, color: '#111827' }}>Booking Details for {pendingSlot.label}</h4>
            
            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>Meeting Type</label>
            <select value={bookingForm.meeting_type} onChange={e => setBookingForm({...bookingForm, meeting_type: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', marginBottom: 12, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
              <option>Mentorship Session</option>
              <option>Strategic Review</option>
              <option>Quick Catch-up</option>
            </select>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>Communication Method</label>
            <select value={bookingForm.preferred_communication} onChange={e => setBookingForm({...bookingForm, preferred_communication: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', marginBottom: 12, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
              <option value="video">Google Meet</option>
              <option value="phone">Phone Call</option>
              <option value="in_person">In Person</option>
            </select>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>Priority</label>
            <select value={bookingForm.priority} onChange={e => setBookingForm({...bookingForm, priority: e.target.value})} style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', marginBottom: 12, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
              <option value="normal">Normal</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' }}>Notes (Optional)</label>
            <textarea value={bookingForm.reason} onChange={e => setBookingForm({...bookingForm, reason: e.target.value})} placeholder="What would you like to discuss?" style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #E2E8F0', marginBottom: 16, fontSize: 13, background: '#F8FAFC', minHeight: 60, resize: 'none', boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit' }} />

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => { setPendingSlot(null); setShowSlots(true); addMsg('ai', 'Booking cancelled. You can select another slot or ask me anything else.'); }} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: '#F1F5F9', border: 'none', color: '#475569', fontWeight: 600, cursor: 'pointer', transition: '0.2s' }} onMouseEnter={e => e.currentTarget.style.background='#E2E8F0'} onMouseLeave={e => e.currentTarget.style.background='#F1F5F9'}>Cancel</button>
              <button onClick={confirmBooking} style={{ flex: 1, padding: '10px 0', borderRadius: 10, background: 'linear-gradient(135deg, #6C63FF, #00C2FF)', border: 'none', color: 'white', fontWeight: 600, cursor: 'pointer', transition: '0.2s', boxShadow: '0 4px 12px rgba(108, 99, 255, 0.25)' }} onMouseEnter={e => e.currentTarget.style.transform='translateY(-1px)'} onMouseLeave={e => e.currentTarget.style.transform='translateY(0)'}>Confirm</button>
            </div>
          </motion.div>
        )}

        {isBooking && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-text-secondary)' }}>smart_toy</span>
            </div>
            <div style={{ padding: '12px 16px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 14, fontSize: 13, color: '#10b981', display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>pending_actions</span> Submitting your booking request...
            </div>
          </div>
        )}
      </div>

      {/* Quick prompts */}
      {messages.length <= 2 && (
        <div style={{ padding: '0 20px 12px', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0 }}>
          {quickPrompts.map(p => (
            <button key={p} onClick={() => handleSend(p.split(' ').slice(1).join(' '))}
              style={{ padding: '7px 14px', borderRadius: 100, border: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.04)', color: 'var(--color-text-secondary)', fontSize: 12, cursor: 'pointer', transition: 'var(--transition)' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.4)'; e.currentTarget.style.color = '#818cf8'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)'; }}>
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Input area */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--color-border)', background: '#FFFFFF', backdropFilter: 'blur(20px)', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: '#FAFAFA', border: '1px solid var(--color-border)', borderRadius: 16, padding: '10px 10px 10px 16px', transition: 'var(--transition)' }}
          onFocusCapture={(e) => { e.currentTarget.style.borderColor = 'rgba(108, 99, 255, 0.4)'; }}
          onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'var(--color-border)'; }}>
          <input
            style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#111111', fontSize: 14, fontFamily: 'inherit', padding: '4px 0', resize: 'none' }}
            placeholder="Ask about SISU or type 'book a meeting'..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          />
          <button onClick={() => handleSend()} disabled={!input.trim() || isTyping}
            style={{ width: 38, height: 38, borderRadius: 10, background: input.trim() ? 'linear-gradient(135deg, #6C63FF, #00C2FF)' : 'rgba(0,0,0,0.06)', border: 'none', cursor: input.trim() ? 'pointer' : 'default', color: 'white', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'var(--transition)', flexShrink: 0 }}>
            <span className="material-symbols-outlined">send</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.6; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </section>
  );
}
