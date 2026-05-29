import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { format, parseISO } from 'date-fns';

const STATUS_COLORS = {
  pending: 'var(--color-amber)',
  reschedule_requested: 'var(--color-accent-orange)',
  approved: 'var(--color-green)',
  rejected: 'var(--color-red)',
  cancelled: 'var(--color-text-muted)'
};

const PRIORITY_COLORS = {
  urgent: 'var(--color-red)',
  high: 'var(--color-accent-orange)',
  normal: 'var(--color-accent)',
  low: 'var(--color-green)'
};

const TIME_SLOTS = [
  { value: '09:00', label: '09:00 AM' },
  { value: '09:30', label: '09:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '01:00 PM' },
  { value: '13:30', label: '01:30 PM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '14:30', label: '02:30 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '15:30', label: '03:30 PM' },
  { value: '16:00', label: '04:00 PM' },
  { value: '16:30', label: '04:30 PM' },
  { value: '17:00', label: '05:00 PM' },
  { value: '17:30', label: '05:30 PM' },
  { value: '18:00', label: '06:00 PM' },
  { value: '18:30', label: '06:30 PM' },
  { value: '19:00', label: '07:00 PM' },
  { value: '19:30', label: '07:30 PM' },
  { value: '20:00', label: '08:00 PM' },
  { value: '20:30', label: '08:30 PM' },
  { value: '21:00', label: '09:00 PM' },
];

export default function AdminDecisionFeed() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    window.location.href = '/';
    return null;
  }

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  
  // Action states for the top card
  const [actionType, setActionType] = useState(null); // 'approve' | 'reject' | 'reschedule' | null
  const [notes, setNotes] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('09:00');
  const [processing, setProcessing] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [allMeetings, notifs] = await Promise.all([
        api.adminGetMeetings(),
        api.getNotifications(),
      ]);
      setMeetings(allMeetings);
      setNotifications(notifs.filter(n => !n.is_read));
    } catch (e) {
      console.error('Error fetching data:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  // Filter requests that need decisions
  const decisionRequests = meetings.filter(
    m => m.status === 'pending' || m.status === 'reschedule_requested'
  );

  // Filter approved/completed meetings for conflict checks
  const approvedMeetings = meetings.filter(
    m => m.status === 'approved' || m.status === 'rescheduled' || m.status === 'completed'
  );

  // Active meeting on top of the stack
  const activeMeeting = decisionRequests[activeIndex];

  // Check for calendar conflicts
  const getConflict = (meeting) => {
    if (!meeting || !meeting.start_time || !meeting.end_time) return null;
    const currentStart = new Date(meeting.start_time).getTime();
    const currentEnd = new Date(meeting.end_time).getTime();

    return approvedMeetings.find(m => {
      if (!m.start_time || !m.end_time || m.id === meeting.id) return false;
      const mStart = new Date(m.start_time).getTime();
      const mEnd = new Date(m.end_time).getTime();
      return currentStart < mEnd && currentEnd > mStart;
    });
  };

  // Find client total sessions count
  const getClientSessionCount = (clientEmail) => {
    return meetings.filter(
      m => m.client_email === clientEmail && (m.status === 'approved' || m.status === 'completed')
    ).length;
  };

  const handleDecision = async (id, status, details = {}) => {
    setProcessing(true);
    try {
      await api.adminUpdateStatus(id, {
        status,
        admin_notes: details.notes || undefined,
        meet_link: details.meetLink || undefined,
        new_start_time: details.newStart || undefined,
        new_end_time: details.newEnd || undefined
      });
      
      // Clear inputs
      setActionType(null);
      setNotes('');
      setMeetLink('');
      setNewStart('');
      setNewEnd('');
      
      // Fetch latest meetings to update lists
      await fetchData();
      
      // If we processed the last card, reset index or handle boundary
      if (activeIndex >= decisionRequests.length - 1) {
        setActiveIndex(0);
      }
    } catch (e) {
      alert('Error updating status: ' + e.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSkip = () => {
    if (decisionRequests.length <= 1) return;
    
    // Cycle the skipped item to the end of the stack
    const skippedMeeting = decisionRequests[activeIndex];
    
    // Animate transition by setting the active index
    if (activeIndex >= decisionRequests.length - 1) {
      setActiveIndex(0);
    } else {
      setActiveIndex(activeIndex + 1);
    }
    
    setActionType(null);
  };

  return (
    <Layout title="Decision Feed" notifCount={notifications.length}>
      <div style={{ position: 'relative', minHeight: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
        {/* Decorative Background Radial Glow */}
        <div style={{ 
          position: 'absolute', 
          top: '10%', 
          left: '50%', 
          transform: 'translateX(-50%)', 
          width: 500, 
          height: 500, 
          background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)', 
          borderRadius: '50%', 
          filter: 'blur(60px)', 
          pointerEvents: 'none', 
          zIndex: 0 
        }} />

        {/* Header Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <div>
            <h3 style={{ fontSize: 24, fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em', marginBottom: 4 }}>Pending Decisions</h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 13, fontWeight: 500 }}>
              {decisionRequests.length === 0 
                ? "No pending requests remaining" 
                : `${decisionRequests.length} meeting request${decisionRequests.length > 1 ? 's' : ''} require your decision`
              }
            </p>
          </div>
          
          {decisionRequests.length > 0 && (
            <div style={{ 
              padding: '6px 14px', 
              background: 'rgba(245,158,11,0.08)', 
              border: '1px solid rgba(245,158,11,0.15)', 
              borderRadius: 100, 
              fontSize: 12, 
              fontWeight: 700, 
              color: 'var(--color-amber)', 
              display: 'flex', 
              alignItems: 'center', 
              gap: 8,
              fontFamily: 'var(--font-mono)'
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-amber)', animation: 'pulse 1.8s infinite' }} />
              STACKED VIEW ({activeIndex + 1}/{decisionRequests.length})
            </div>
          )}
        </div>

        {/* Main Stack Area */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, paddingBottom: 40 }}>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div className="skeleton-pulse" style={{ height: 450, width: 480, borderRadius: 24 }} />
            </div>
          ) : decisionRequests.length === 0 ? (
            /* Celebration Screen (Satisfying Inbox Zero State) */
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              className="glass-premium"
              style={{ 
                maxWidth: 480, 
                width: '100%', 
                padding: '48px 32px', 
                borderRadius: 24, 
                textAlign: 'center', 
                border: '1px solid var(--color-border)', 
                background: 'var(--glass-bg)',
                boxShadow: 'var(--shadow-lg)'
              }}
            >
              <div style={{ 
                width: 72, 
                height: 72, 
                borderRadius: '50%', 
                background: 'rgba(16,185,129,0.1)', 
                border: '1px solid rgba(16,185,129,0.2)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                margin: '0 auto 24px',
                boxShadow: '0 0 30px rgba(16,185,129,0.15)'
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 36, color: 'var(--color-green)' }}>done_all</span>
              </div>
              <h4 style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)', marginBottom: 8, letterSpacing: '-0.01em' }}>Decision Feed Cleared!</h4>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 28 }}>
                All pending client meeting requests and reschedule tickets have been resolved. You are completely caught up!
              </p>
              <div style={{ display: 'flex', gap: 12 }}>
                <a href="/admin" className="btn-premium btn-premium-primary" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  Go to Dashboard
                </a>
                <a href="/admin/meetings" className="btn-premium btn-premium-secondary" style={{ flex: 1, textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  View Calendar
                </a>
              </div>
            </motion.div>
          ) : (
            /* Active Card Stack */
            <div style={{ position: 'relative', width: '100%', maxWidth: 490, height: 520 }}>
              <AnimatePresence mode="popLayout">
                {decisionRequests.slice(activeIndex, activeIndex + 3).map((meeting, stackIdx) => {
                  const relativeIdx = stackIdx; // 0 is top, 1 is middle, 2 is bottom
                  const isTop = relativeIdx === 0;
                  const statusColor = STATUS_COLORS[meeting.status] || 'white';
                  const conflict = getConflict(meeting);
                  const clientSessions = getClientSessionCount(meeting.client_email);

                  return (
                    <motion.div
                      key={meeting.id}
                      initial={isTop ? { scale: 0.9, opacity: 0, y: 30 } : false}
                      animate={{
                        scale: 1 - relativeIdx * 0.04,
                        y: relativeIdx * 14,
                        opacity: relativeIdx === 0 ? 1 : relativeIdx === 1 ? 0.7 : 0.45,
                        zIndex: 10 - relativeIdx,
                      }}
                      exit={isTop ? { 
                        x: actionType === 'approve' ? 180 : actionType === 'reject' ? -180 : 0,
                        y: actionType === 'reschedule' ? -100 : 80,
                        opacity: 0,
                        scale: 0.9,
                        rotate: actionType === 'approve' ? 10 : actionType === 'reject' ? -10 : 0
                      } : false}
                      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                      className="glass-premium-strong"
                      style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: 24,
                        background: 'var(--color-surface-2)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: isTop ? 'var(--shadow-xl), 0 10px 40px rgba(0,0,0,0.3)' : 'var(--shadow-md)',
                        padding: 28,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        pointerEvents: isTop ? 'auto' : 'none',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Card Content Wrapper */}
                      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', position: 'relative' }}>
                        
                        {/* Header Details */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ 
                              width: 42, 
                              height: 42, 
                              background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-cyan) 100%)', 
                              borderRadius: '50%', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center', 
                              fontSize: 14, 
                              fontWeight: 800, 
                              color: 'white',
                              boxShadow: '0 4px 14px rgba(59, 130, 246, 0.25)' 
                            }}>
                              {meeting.client_name?.charAt(0).toUpperCase() || '?'}
                            </div>
                            <div>
                              <h4 style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 2 }}>{meeting.client_name}</h4>
                              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span>{meeting.client_email}</span>
                                {meeting.phone && meeting.phone !== 'N/A' && (
                                  <>
                                    <span>·</span>
                                    <span>{meeting.phone}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <span className={`badge-priority badge-priority-${meeting.priority}`} style={{ transform: 'scale(0.95)' }}>
                            {meeting.priority}
                          </span>
                        </div>

                        {/* Slide-in Action Drawer Form Panels */}
                        <AnimatePresence mode="wait">
                          {actionType === null ? (
                            /* Core Details View */
                            <motion.div 
                              key="details"
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -10 }}
                              transition={{ duration: 0.2 }}
                              style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
                            >
                              {/* Request Type Indicator */}
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                                <span className="badge-status-pill" style={{ background: `${statusColor}12`, color: statusColor, border: `1px solid ${statusColor}18` }}>
                                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
                                  {meeting.status === 'reschedule_requested' ? 'Reschedule Requested' : 'New Request'}
                                </span>
                                {clientSessions > 0 && (
                                  <span style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: 6, padding: '3px 8px', fontSize: 9, fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}>
                                    {clientSessions} PAST SESSION{clientSessions > 1 ? 'S' : ''}
                                  </span>
                                )}
                              </div>

                              {/* Title / Description */}
                              <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)', marginBottom: 8, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{meeting.title}</h2>
                              <p style={{ fontSize: 11, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, fontFamily: 'var(--font-mono)', marginBottom: 14 }}>
                                {meeting.meeting_type} · {meeting.duration_minutes} Mins · {
                                  meeting.preferred_communication === 'video' ? 'Google Meet' : 
                                  meeting.preferred_communication === 'in_person' ? 'Spi Edge (In-Office)' : 
                                  meeting.preferred_communication?.startsWith('custom_location:') ? meeting.preferred_communication.replace('custom_location:', '').trim() : 'In-Person'
                                }
                              </p>
                              {meeting.phone && meeting.phone !== 'N/A' && (
                                <p style={{ fontSize: 12, color: 'var(--color-text-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>phone</span>
                                  Contact Phone: {meeting.phone}
                                </p>
                              )}

                              {/* Proposed Slot Info */}
                              <div style={{ background: 'rgba(255,255,255,0.015)', border: '1px solid var(--color-border)', borderRadius: 14, padding: '14px 16px', marginBottom: 14 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--color-text-primary)' }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--color-accent)' }}>calendar_today</span>
                                  <div>
                                    <p style={{ fontSize: 13, fontWeight: 700 }}>{meeting.display_date || format(parseISO(meeting.start_time), 'EEEE, MMM dd, yyyy')}</p>
                                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginTop: 2 }}>{meeting.display_time || format(parseISO(meeting.start_time), 'hh:mm a')} IST</p>
                                  </div>
                                </div>
                              </div>

                              {/* Calendar Conflict Warn Warning */}
                              {conflict && (
                                <div style={{ 
                                  background: 'rgba(239,68,68,0.08)', 
                                  border: '1px solid rgba(239,68,68,0.18)', 
                                  borderRadius: 12, 
                                  padding: '10px 14px', 
                                  fontSize: 12, 
                                  color: 'var(--color-red)', 
                                  fontWeight: 600,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 8,
                                  marginBottom: 14
                                }}>
                                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>warning</span>
                                  <span>Time Conflict: Overlaps with "{conflict.title}"</span>
                                </div>
                              )}

                              {/* Client Message / Reason */}
                              {meeting.reason && (
                                <div style={{ flex: 1, overflowY: 'auto', maxHeight: 85, paddingRight: 6 }}>
                                  <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>Reason / Business Goals:</span>
                                  <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.5, fontStyle: 'italic' }}>
                                    "{meeting.reason}"
                                  </p>
                                </div>
                              )}
                            </motion.div>
                          ) : actionType === 'approve' ? (
                            /* Approve Panel */
                            <motion.div 
                              key="approve"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              transition={{ duration: 0.2 }}
                              style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
                            >
                              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-green)', fontFamily: 'var(--font-heading)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="material-symbols-outlined">check_circle</span> Confirm Approval
                              </h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                  Are you sure you want to approve this mentorship session?
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                                <button className="btn-premium btn-premium-secondary" onClick={() => setActionType(null)} style={{ flex: 1, padding: '8px 0', fontSize: 12 }}>Back</button>
                                <button 
                                  className="btn-premium btn-premium-primary" 
                                  onClick={() => handleDecision(meeting.id, 'approved', { notes: '', meetLink: '' })} 
                                  disabled={processing}
                                  style={{ flex: 2, background: 'var(--color-green)', borderColor: 'var(--color-green)', padding: '8px 0', fontSize: 12 }}
                                >
                                  {processing ? 'Processing...' : 'Confirm Approve'}
                                </button>
                              </div>
                            </motion.div>
                          ) : actionType === 'reject' ? (
                            /* Reject Panel */
                            <motion.div 
                              key="reject"
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: 20 }}
                              transition={{ duration: 0.2 }}
                              style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
                            >
                              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-red)', fontFamily: 'var(--font-heading)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="material-symbols-outlined">cancel</span> Decline Request
                              </h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                                <p style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                                  Are you sure you want to decline this mentorship request?
                                </p>
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                                <button className="btn-premium btn-premium-secondary" onClick={() => setActionType(null)} style={{ flex: 1, padding: '8px 0', fontSize: 12 }}>Back</button>
                                <button 
                                  className="btn-premium btn-premium-primary" 
                                  onClick={() => handleDecision(meeting.id, 'rejected', { notes: '' })} 
                                  disabled={processing}
                                  style={{ flex: 2, background: 'var(--color-red)', borderColor: 'var(--color-red)', padding: '8px 0', fontSize: 12 }}
                                >
                                  {processing ? 'Processing...' : 'Confirm Decline'}
                                </button>
                              </div>
                            </motion.div>
                          ) : (
                            /* Reschedule Panel */
                            <motion.div 
                              key="reschedule"
                              initial={{ opacity: 0, y: -20 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 20 }}
                              transition={{ duration: 0.2 }}
                              style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
                            >
                              <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-accent-orange)', fontFamily: 'var(--font-heading)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span className="material-symbols-outlined">schedule</span> Reschedule Meeting
                              </h3>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                                  <div>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>New Date</label>
                                    <input 
                                      className="input-premium" 
                                      type="date" 
                                      value={rescheduleDate} 
                                      onChange={(e) => setRescheduleDate(e.target.value)} 
                                      style={{ padding: '8px 10px', fontSize: 11, width: '100%' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6, fontFamily: 'var(--font-mono)' }}>New Start Time (IST)</label>
                                    <select 
                                      className="input-premium" 
                                      value={rescheduleTime} 
                                      onChange={(e) => setRescheduleTime(e.target.value)} 
                                      style={{ padding: '8px 10px', fontSize: 11, width: '100%', appearance: 'none', cursor: 'pointer' }}
                                    >
                                      {TIME_SLOTS.map(slot => (
                                        <option key={slot.value} value={slot.value} style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-primary)' }}>
                                          {slot.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              </div>
                              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                                <button className="btn-premium btn-premium-secondary" onClick={() => setActionType(null)} style={{ flex: 1, padding: '8px 0', fontSize: 12 }}>Back</button>
                                <button 
                                  className="btn-premium btn-premium-primary" 
                                  onClick={() => {
                                    if (!rescheduleDate || !rescheduleTime) return;
                                    const startStr = `${rescheduleDate}T${rescheduleTime}:00`;
                                    const duration = meeting.duration_minutes || 60;
                                    const [year, month, day] = rescheduleDate.split('-').map(Number);
                                    const [hour, min] = rescheduleTime.split(':').map(Number);
                                    const startDate = new Date(year, month - 1, day, hour, min);
                                    const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
                                    const pad = (num) => String(num).padStart(2, '0');
                                    const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;
                                    
                                    handleDecision(meeting.id, 'rescheduled', { notes: '', newStart: startStr, newEnd: endStr });
                                  }}
                                  disabled={processing || !rescheduleDate || !rescheduleTime}
                                  style={{ flex: 2, background: 'var(--color-accent-orange)', borderColor: 'var(--color-accent-orange)', padding: '8px 0', fontSize: 12 }}
                                >
                                  {processing ? 'Processing...' : 'Confirm Reschedule'}
                                </button>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        {/* Top Card Navigation Action Bar (Only visible in default state) */}
                        {actionType === null && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                            <button 
                              className="btn-premium btn-premium-ghost" 
                              onClick={() => setActionType('reject')}
                              style={{ 
                                padding: '10px 0', 
                                flex: 1, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: 6,
                                border: '1px solid rgba(239, 68, 68, 0.15)',
                                color: 'var(--color-red)'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span> Decline
                            </button>
                            <button 
                              className="btn-premium btn-premium-secondary" 
                              onClick={() => {
                                setActionType('reschedule');
                                if (meeting.start_time) {
                                  setRescheduleDate(meeting.start_time.split('T')[0]);
                                  const timePart = meeting.start_time.split('T')[1];
                                  if (timePart) {
                                    setRescheduleTime(timePart.slice(0, 5));
                                  }
                                }
                              }}
                              style={{ 
                                padding: '10px 0', 
                                flex: 1.2, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: 6,
                                border: '1px solid rgba(249, 115, 22, 0.15)',
                                color: 'var(--color-accent-orange)'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>update</span> Reschedule
                            </button>
                            <button 
                              className="btn-premium btn-premium-primary" 
                              onClick={() => setActionType('approve')}
                              style={{ 
                                padding: '10px 0', 
                                flex: 1.4, 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center', 
                                gap: 6,
                                background: 'var(--color-green)',
                                borderColor: 'var(--color-green)'
                              }}
                            >
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>check_circle</span> Approve
                            </button>
                          </div>
                        )}

                        {/* Skip Card to back of stack (Only visible in default state & when stack > 1) */}
                        {actionType === null && decisionRequests.length > 1 && (
                          <button 
                            onClick={handleSkip}
                            style={{
                              marginTop: 12,
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--color-text-muted)',
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              alignSelf: 'center',
                              fontFamily: 'var(--font-mono)'
                            }}
                          >
                            <span>REVIEW LATER (SKIP)</span>
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>chevron_right</span>
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
      <style>{`
        .badge-priority {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 6px;
          font-family: var(--font-mono);
          display: inline-block;
        }
        .badge-priority-urgent {
          background: rgba(239, 68, 68, 0.1);
          color: var(--color-red);
          border: 1px solid rgba(239, 68, 68, 0.15);
        }
        .badge-priority-high {
          background: rgba(249, 115, 22, 0.1);
          color: var(--color-accent-orange);
          border: 1px solid rgba(249, 115, 22, 0.15);
        }
        .badge-priority-normal {
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-accent);
          border: 1px solid rgba(59, 130, 246, 0.15);
        }
        .badge-priority-low {
          background: rgba(132, 204, 22, 0.1);
          color: var(--color-green);
          border: 1px solid rgba(132, 204, 22, 0.15);
        }
        .badge-status-pill {
          font-size: 9px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 3px 8px;
          border-radius: 6px;
          font-family: var(--font-mono);
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>
    </Layout>
  );
}
