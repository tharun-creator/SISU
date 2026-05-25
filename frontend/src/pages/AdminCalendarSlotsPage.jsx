import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const TIME_SLOTS = [
  { value: "09:00-10:00", label: "09:00 AM - 10:00 AM" },
  { value: "10:00-11:00", label: "10:00 AM - 11:00 AM" },
  { value: "11:00-12:00", label: "11:00 AM - 12:00 PM" },
  { value: "12:00-13:00", label: "12:00 PM - 01:00 PM" },
  { value: "13:00-14:00", label: "01:00 PM - 02:00 PM" },
  { value: "14:00-15:00", label: "02:00 PM - 03:00 PM" },
  { value: "15:00-16:00", label: "03:00 PM - 04:00 PM" },
  { value: "16:00-17:00", label: "04:00 PM - 05:00 PM" },
  { value: "17:00-18:00", label: "05:00 PM - 06:00 PM" },
  { value: "18:00-19:00", label: "06:00 PM - 07:00 PM" },
  { value: "19:00-20:00", label: "07:00 PM - 08:00 PM" },
];

export default function AdminCalendarSlotsPage() {
  const { user } = useAuth();
  if (user?.email !== 'tharunriot@gmail.com') {
    window.location.href = '/';
    return null;
  }
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null); // { year, month, day }
  const [signals, setSignals] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // Editing state for selected date
  const [signalType, setSignalType] = useState('green'); // 'green' | 'yellow' | 'red'
  const [selectedSlots, setSelectedSlots] = useState([]); // List of values e.g. ["09:00-10:00"]

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const today = now.getDate();
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const fetchSignals = async () => {
    try {
      const data = await api.getCalendarSignals();
      setSignals(data || {});
    } catch (err) {
      console.error(err);
      setMessage({ text: 'Failed to fetch calendar settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, [viewMonth, viewYear]);

  const handleDateClick = (day) => {
    const clickedDate = { year: viewYear, month: viewMonth, day };
    setSelectedDate(clickedDate);
    
    const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const sig = signals[dateStr];
    
    if (sig) {
      setSignalType(sig.signal || 'green');
      setSelectedSlots(sig.custom_slots || []);
    } else {
      setSignalType('green');
      setSelectedSlots([]);
    }
    setMessage(null);
  };

  const handleSlotToggle = (slotValue) => {
    setSelectedSlots(prev => 
      prev.includes(slotValue) 
        ? prev.filter(v => v !== slotValue) 
        : [...prev, slotValue]
    );
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!selectedDate) return;
    setSaving(true);
    setMessage(null);
    
    const dateStr = `${selectedDate.year}-${String(selectedDate.month + 1).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`;
    
    try {
      await api.adminSetDateSignal({
        date: dateStr,
        signal: signalType,
        custom_slots: signalType === 'yellow' ? selectedSlots.join(',') : null
      });
      setMessage({ text: 'Availability settings successfully updated!', type: 'success' });
      await fetchSignals();
    } catch (err) {
      setMessage({ text: err.message || 'Failed to save settings', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const getDateStr = (day) => {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  return (
    <Layout title="Calendar Slots">
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>Coaching Calendar Dashboard</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, marginBottom: 0 }}>Configure daily availability signals. Define custom slots for clients or block dates completely.</p>
          </div>
        </div>

        {/* Status messages */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                padding: '12px 16px',
                background: message.type === 'success' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)',
                border: `1px solid ${message.type === 'success' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)'}`,
                borderRadius: 12,
                color: message.type === 'success' ? 'var(--color-green)' : 'var(--color-red)',
                fontSize: 13,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                zIndex: 1,
                position: 'relative'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                {message.type === 'success' ? 'check_circle' : 'error'}
              </span>
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 28, position: 'relative', zIndex: 1 }}>
          {/* Left Side: Big Calendar */}
          <div className="glass-premium" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
                {monthName}
              </h3>
              
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={() => {
                    if (viewMonth === 0) {
                      setViewMonth(11);
                      setViewYear(y => y - 1);
                    } else setViewMonth(m => m - 1);
                    setSelectedDate(null);
                  }}
                  className="btn-premium btn-premium-secondary"
                  style={{ padding: 6, minWidth: 'auto', borderRadius: 8 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                </button>
                <button
                  onClick={() => {
                    if (viewMonth === 11) {
                      setViewMonth(0);
                      setViewYear(y => y + 1);
                    } else setViewMonth(m => m + 1);
                    setSelectedDate(null);
                  }}
                  className="btn-premium btn-premium-secondary"
                  style={{ padding: 6, minWidth: 'auto', borderRadius: 8 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_right</span>
                </button>
              </div>
            </div>

            {/* Calendar Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
                <div key={d} style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', textAlign: 'center', paddingBottom: 10, fontFamily: 'var(--font-mono)' }}>
                  {d}
                </div>
              ))}
              
              {/* Empty padding blocks */}
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}

              {/* Days in Month */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isPast = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day < today;
                const isCurrentToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === today;
                const isSelected = selectedDate?.year === viewYear && selectedDate?.month === viewMonth && selectedDate?.day === day;
                
                const dateStr = getDateStr(day);
                const sigData = signals[dateStr];
                const sig = sigData ? sigData.signal : 'green';

                let bgGlow = 'transparent';
                let borderColor = 'transparent';
                let dotColor = '#84cc16'; // Green dot

                if (sig === 'red') {
                  bgGlow = 'rgba(239, 68, 68, 0.04)';
                  borderColor = 'rgba(239, 68, 68, 0.15)';
                  dotColor = '#ef4444';
                } else if (sig === 'yellow') {
                  bgGlow = 'rgba(245, 158, 11, 0.04)';
                  borderColor = 'rgba(245, 158, 11, 0.15)';
                  dotColor = '#fb923c';
                } else {
                  bgGlow = 'rgba(132, 204, 22, 0.01)';
                  borderColor = 'rgba(132, 204, 22, 0.05)';
                  dotColor = '#84cc16';
                }

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    style={{
                      aspectRatio: 1.1,
                      border: isSelected ? '1px solid var(--color-text-primary)' : `1px solid ${borderColor}`,
                      background: isSelected ? 'var(--color-text-primary)' : bgGlow,
                      color: isSelected ? 'var(--color-bg)' : isPast ? 'var(--color-text-muted)' : 'var(--color-text-primary)',
                      borderRadius: 12,
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      position: 'relative',
                      gap: 4,
                      transition: 'var(--transition-fast)',
                    }}
                    className={isSelected ? '' : 'admin-cal-btn'}
                  >
                    <span style={{ fontSize: 13, fontWeight: isSelected || isCurrentToday ? 800 : 500 }}>
                      {day}
                    </span>
                    
                    {/* Signal status dot */}
                    {!isSelected && (
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: dotColor }} />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, marginTop: 24, padding: 14, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#84cc16' }} />
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Green (Available)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#fb923c' }} />
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Yellow (Custom / Limited)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Red (Blocked / Closed)</span>
              </div>
            </div>
          </div>

          {/* Right Side: Config Panel */}
          <div className="glass-premium" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
            {!selectedDate ? (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px 0', border: '1px dashed var(--color-border)', borderRadius: 16 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 12 }}>touch_app</span>
                <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>Select a Date</p>
                <p style={{ fontSize: 12, maxWidth: 220, margin: '0 auto', lineHeight: 1.5 }}>Click any date on the calendar to change its availability state.</p>
              </div>
            ) : (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 4, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
                  Configure Date Settings
                </h3>
                <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginBottom: 20 }}>
                  Selected: <strong>{new Date(selectedDate.year, selectedDate.month, selectedDate.day).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                </p>

                {/* State selector pills */}
                <div style={{ marginBottom: 24 }}>
                  <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
                    Choose Signal State
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                    {[
                      { type: 'green', label: 'Green', color: '#84cc16', icon: 'check_circle' },
                      { type: 'yellow', label: 'Yellow', color: '#fb923c', icon: 'pending' },
                      { type: 'red', label: 'Red', color: '#ef4444', icon: 'block' }
                    ].map((s) => {
                      const isActive = signalType === s.type;
                      return (
                        <button
                          key={s.type}
                          type="button"
                          onClick={() => setSignalType(s.type)}
                          style={{
                            padding: '12px 6px',
                            borderRadius: 12,
                            border: `1px solid ${isActive ? s.color : 'var(--color-border)'}`,
                            background: isActive ? `${s.color}15` : 'transparent',
                            color: isActive ? s.color : 'var(--color-text-secondary)',
                            cursor: 'pointer',
                            fontSize: 12,
                            fontWeight: 700,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 4,
                            transition: 'var(--transition-fast)'
                          }}
                        >
                          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{s.icon}</span>
                          <span>{s.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Conditional yellow options (custom slots selection) */}
                {signalType === 'yellow' && (
                  <div style={{ marginBottom: 24, flex: 1 }}>
                    <label style={{ display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
                      Select Active Time Slots
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
                      {TIME_SLOTS.map((slot) => {
                        const isChecked = selectedSlots.includes(slot.value);
                        return (
                          <div
                            key={slot.value}
                            onClick={() => handleSlotToggle(slot.value)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 10,
                              padding: '10px 12px',
                              background: isChecked ? 'rgba(245, 158, 11, 0.05)' : 'rgba(255,255,255,0.01)',
                              border: `1px solid ${isChecked ? 'rgba(245, 158, 11, 0.2)' : 'var(--color-border)'}`,
                              borderRadius: 10,
                              cursor: 'pointer',
                              userSelect: 'none',
                              transition: 'var(--transition-fast)'
                            }}
                          >
                            <div style={{
                              width: 16,
                              height: 16,
                              borderRadius: 4,
                              border: `1px solid ${isChecked ? '#fb923c' : 'var(--color-border)'}`,
                              background: isChecked ? '#fb923c' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {isChecked && <span className="material-symbols-outlined" style={{ fontSize: 11, color: 'white', fontWeight: 'bold' }}>done</span>}
                            </div>
                            <span style={{ fontSize: 12.5, fontWeight: 600, color: isChecked ? 'var(--color-text-primary)' : 'var(--color-text-secondary)' }}>
                              {slot.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Info Text */}
                <div style={{ padding: 12, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: 12, marginBottom: 20, fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                  {signalType === 'green' && "🟢 Clients can book any standard time slot for this date."}
                  {signalType === 'yellow' && "🟡 Clients can only select the checked time slots for this date."}
                  {signalType === 'red' && "🔴 This date will be blocked and hidden from the client booking view."}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                  <button type="button" onClick={() => setSelectedDate(null)} className="btn-premium btn-premium-secondary" style={{ flex: 1 }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving || (signalType === 'yellow' && selectedSlots.length === 0)} className="btn-premium btn-premium-primary" style={{ flex: 1, justifyContent: 'center' }}>
                    {saving ? 'Saving...' : 'Save Signal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .admin-cal-btn:hover {
          background: rgba(255, 255, 255, 0.02) !important;
          border-color: var(--color-border-hover) !important;
        }
      `}</style>
    </Layout>
  );
}
