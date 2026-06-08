import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';

const STATUS_ACCENT = {
  approved: '#84CC16',
  rescheduled: '#FF7A00',
  completed: '#3b82f6',
};

function formatTime12(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  let h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

function getDateKey(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getCommIcon(comm) {
  if (comm === 'video') return 'videocam';
  if (comm === 'in_person') return 'home_pin';
  return 'location_on';
}

function getCommLabel(comm) {
  if (comm === 'video') return 'Google Meet (Online Video)';
  if (comm === 'in_person') return 'Spi Edge (In-Office Meet)';
  if (comm?.startsWith('custom_location:')) return comm.replace('custom_location:', '').trim();
  return 'In-Person';
}

export default function AdminSlotsBookedPage() {
  const { user, isAdmin } = useAuth();
  if (!isAdmin) {
    window.location.href = '/';
    return null;
  }

  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null); // 'YYYY-MM-DD'
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);

  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const today = now.getDate();
  const monthName = new Date(viewYear, viewMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const fetchMeetings = useCallback(async () => {
    try {
      const all = await api.adminGetMeetings();
      setMeetings(all || []);
    } catch (err) {
      console.error('Failed to fetch meetings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMeetings();
    const interval = setInterval(fetchMeetings, 30000);
    return () => clearInterval(interval);
  }, [fetchMeetings]);

  // Only approved / rescheduled / completed
  const bookedMeetings = useMemo(() => {
    return meetings.filter(
      m => m.status === 'approved' || m.status === 'rescheduled' || m.status === 'completed'
    );
  }, [meetings]);

  // Group by date key
  const meetingsByDate = useMemo(() => {
    const map = {};
    bookedMeetings.forEach(m => {
      if (!m.start_time) return;
      const key = getDateKey(m.start_time);
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    // Sort each day's meetings by start_time
    Object.keys(map).forEach(key => {
      map[key].sort((a, b) => new Date(a.start_time) - new Date(b.start_time));
    });
    return map;
  }, [bookedMeetings]);

  const getDateStr = (day) => {
    return `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const selectedMeetings = selectedDate ? (meetingsByDate[selectedDate] || []) : [];

  const selectedDateObj = selectedDate ? new Date(selectedDate + 'T00:00:00') : null;
  const selectedDateLabel = selectedDateObj
    ? selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    : '';

  const handlePrev = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else {
      setViewMonth(m => m - 1);
    }
    setSelectedDate(null);
  };

  const handleNext = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else {
      setViewMonth(m => m + 1);
    }
    setSelectedDate(null);
  };

  return (
    <Layout title="Slots Booked">
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>Slots Booked</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, marginBottom: 0 }}>View all approved and confirmed meeting slots on the calendar.</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{
              padding: '6px 14px',
              background: 'rgba(132, 204, 22, 0.08)',
              border: '1px solid rgba(132, 204, 22, 0.15)',
              borderRadius: 100,
              fontSize: 12,
              fontWeight: 700,
              color: '#84CC16',
              fontFamily: 'var(--font-mono)'
            }}>
              {bookedMeetings.length} BOOKED
            </span>
          </div>
        </div>

        <div className="slots-booked-grid" style={{ position: 'relative', zIndex: 1 }}>
          {/* Left Side: Calendar */}
          <div className="glass-premium" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
                {monthName}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={handlePrev}
                  className="btn-premium btn-premium-secondary"
                  style={{ padding: 6, minWidth: 'auto', borderRadius: 8 }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>chevron_left</span>
                </button>
                <button
                  onClick={handleNext}
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

              {/* Days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dateStr = getDateStr(day);
                const dayMeetings = meetingsByDate[dateStr] || [];
                const count = dayMeetings.length;
                const isSelected = selectedDate === dateStr;
                const isToday = viewYear === now.getFullYear() && viewMonth === now.getMonth() && day === today;
                const isPast = viewYear < now.getFullYear() || (viewYear === now.getFullYear() && viewMonth < now.getMonth()) || (viewYear === now.getFullYear() && viewMonth === now.getMonth() && day < today);

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      aspectRatio: 1.1,
                      border: isSelected
                        ? '1.5px solid var(--color-accent)'
                        : count > 0
                          ? '1px solid rgba(132, 204, 22, 0.15)'
                          : '1px solid transparent',
                      background: isSelected
                        ? 'rgba(59, 130, 246, 0.1)'
                        : count > 0
                          ? 'rgba(132, 204, 22, 0.03)'
                          : 'transparent',
                      color: isSelected
                        ? 'var(--color-accent)'
                        : isPast
                          ? 'var(--color-text-muted)'
                          : 'var(--color-text-primary)',
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
                    className={isSelected ? '' : 'slots-cal-btn'}
                  >
                    <span style={{ fontSize: 13, fontWeight: isSelected || isToday ? 800 : 500 }}>
                      {day}
                    </span>

                    {/* Slot count indicator */}
                    {count > 0 && (
                      <span style={{
                        fontSize: 9,
                        fontWeight: 800,
                        color: isSelected ? 'var(--color-accent)' : '#84CC16',
                        background: isSelected ? 'rgba(59, 130, 246, 0.12)' : 'rgba(132, 204, 22, 0.12)',
                        padding: '1px 5px',
                        borderRadius: 6,
                        fontFamily: 'var(--font-mono)',
                        lineHeight: '14px'
                      }}>
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 20, marginTop: 24, padding: 14, background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: 12, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#84CC16' }} />
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Approved</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#FF7A00' }} />
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Rescheduled</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6' }} />
                <span style={{ color: 'var(--color-text-secondary)', fontWeight: 600 }}>Completed</span>
              </div>
            </div>
          </div>

          {/* Right Side: Day Detail Panel */}
          <div className="glass-premium" style={{ padding: 24, display: 'flex', flexDirection: 'column', minHeight: 500 }}>
            {loading ? (
              /* Skeleton loader */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div className="skeleton-pulse" style={{ height: 20, width: '60%', borderRadius: 8 }} />
                <div className="skeleton-pulse" style={{ height: 14, width: '40%', borderRadius: 6 }} />
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3].map(i => (
                    <div key={i} className="skeleton-pulse" style={{ height: 90, borderRadius: 12 }} />
                  ))}
                </div>
              </div>
            ) : !selectedDate ? (
              /* No date selected */
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', textAlign: 'center', padding: '40px 0', border: '1px dashed var(--color-border)', borderRadius: 16 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, marginBottom: 14, color: 'var(--color-text-muted)' }}>calendar_month</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 6 }}>Select a Date</p>
                <p style={{ fontSize: 12.5, maxWidth: 240, margin: '0 auto', lineHeight: 1.5 }}>Click any date on the calendar to view booked meeting slots for that day.</p>
              </div>
            ) : (
              /* Date selected — show meetings */
              <>
                <div style={{ marginBottom: 20 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)', margin: 0, marginBottom: 4 }}>
                    {selectedDateLabel}
                  </h3>
                  <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', margin: 0 }}>
                    {selectedMeetings.length === 0
                      ? 'No booked slots for this date.'
                      : `${selectedMeetings.length} meeting${selectedMeetings.length > 1 ? 's' : ''} scheduled`}
                  </p>
                </div>

                {selectedMeetings.length === 0 ? (
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', textAlign: 'center', padding: '32px 0', border: '1px dashed var(--color-border)', borderRadius: 16 }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 10 }}>event_busy</span>
                    <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>No meetings booked</p>
                    <p style={{ fontSize: 11.5, color: 'var(--color-text-muted)', maxWidth: 200, lineHeight: 1.5, marginTop: 4 }}>This day has no approved, rescheduled, or completed meetings.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', flex: 1, paddingRight: 4 }}>
                    <AnimatePresence mode="popLayout">
                      {selectedMeetings.map((m, idx) => {
                        const accent = STATUS_ACCENT[m.status] || '#3b82f6';
                        return (
                          <motion.div
                            key={m.id}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ delay: idx * 0.05, duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                              padding: 16,
                              background: m.client_is_priority ? 'linear-gradient(to bottom, rgba(234, 179, 8, 0.02), rgba(255,255,255,0.02))' : 'rgba(255,255,255,0.02)',
                              border: m.client_is_priority ? '1px solid rgba(234, 179, 8, 0.2)' : '1px solid var(--color-border)',
                              borderLeft: m.client_is_priority ? '4px solid #eab308' : `4px solid ${accent}`,
                              borderRadius: 12,
                              transition: 'var(--transition-fast)',
                              cursor: 'default',
                            }}
                            className="slot-card-hover"
                          >
                            {/* Time Header */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 16, color: accent }}>schedule</span>
                                <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }}>
                                  {formatTime12(m.start_time)} – {formatTime12(m.end_time)}
                                </span>
                              </div>
                              <span style={{
                                fantasy: 'sans-serif',
                                fontSize: 9,
                                fontWeight: 800,
                                padding: '3px 8px',
                                borderRadius: 6,
                                background: `${accent}15`,
                                color: accent,
                                border: `1px solid ${accent}30`,
                                fontFamily: 'var(--font-mono)',
                                textTransform: 'uppercase'
                              }}>
                                {m.status}
                              </span>
                            </div>

                            {/* Title */}
                            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px 0' }}>
                              {m.title}
                            </p>

                            {/* Details Grid */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {/* Client */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>person</span>
                                <span style={{ fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                                  {m.client_name}
                                  {m.client_is_priority && (
                                    <span style={{ fontSize: 8.5, padding: '1px 5px', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: 4, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>⭐ PRIORITY</span>
                                  )}
                                </span>
                                {m.client_email && (
                                  <span style={{ color: 'var(--color-text-muted)', fontSize: 11 }}>({m.client_email})</span>
                                )}
                              </div>

                              {/* Meeting Type & Duration */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>assignment</span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>{m.meeting_type}</span>
                                <span style={{ color: 'var(--color-text-muted)' }}>·</span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>{m.duration_minutes} mins</span>
                              </div>

                              {/* Communication */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5 }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--color-text-muted)' }}>
                                  {getCommIcon(m.preferred_communication)}
                                </span>
                                <span style={{ color: 'var(--color-text-secondary)' }}>
                                  {getCommLabel(m.preferred_communication)}
                                </span>
                              </div>

                              {/* Meet Link */}
                              {m.meet_link && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, marginTop: 2 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: 'var(--color-accent)' }}>link</span>
                                  <a
                                    href={m.meet_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: 'var(--color-accent)',
                                      fontWeight: 600,
                                      textDecoration: 'none',
                                      fontSize: 12,
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap',
                                      maxWidth: 220,
                                      display: 'inline-block',
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    {m.meet_link}
                                  </a>
                                </div>
                              )}

                              {/* Reason */}
                              {m.reason && (
                                <div style={{ marginTop: 6, padding: '8px 12px', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 11.5, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>
                                  "{m.reason}"
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <style>{`
        .slots-booked-grid {
          display: grid;
          grid-template-columns: 1.4fr 1fr;
          gap: 28px;
        }

        @media (max-width: 1024px) {
          .slots-booked-grid {
            grid-template-columns: 1fr;
          }
        }

        .slots-cal-btn:hover {
          background: rgba(255, 255, 255, 0.02) !important;
          border-color: var(--color-border-hover) !important;
        }
        .slot-card-hover:hover {
          background: rgba(255, 255, 255, 0.04) !important;
          border-color: var(--color-border-hover) !important;
        }
        @media (max-width: 900px) {
          .glass-premium {
            min-height: auto !important;
          }
        }
      `}</style>
    </Layout>
  );
}
