import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { format, parseISO, isToday, isThisWeek, isThisMonth } from 'date-fns';

const STATUS_COLORS = {
  pending: 'var(--color-amber)',
  approved: 'var(--color-green)',
  rejected: 'var(--color-red)',
  cancelled: 'var(--color-text-muted)',
  rescheduled: 'var(--color-accent-orange)',
  reschedule_requested: 'var(--color-accent-orange)',
  completed: 'var(--color-accent)'
};

const PRIORITY_COLORS = {
  urgent: 'var(--color-red)',
  high: 'var(--color-accent-orange)',
  normal: 'var(--color-accent)',
  low: 'var(--color-green)'
};

function StatCard({ icon, label, value, delta, color = 'var(--color-accent)', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="glass-premium"
      style={{
        padding: '24px',
        borderRadius: '16px',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid var(--color-border)',
        background: 'var(--glass-bg)',
      }}
      whileHover={{ y: -4, borderColor: 'var(--color-border-hover)', boxShadow: 'var(--shadow-lg)' }}
    >
      {/* Background soft color glow */}
      <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: 100, height: 100, background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}12`, border: `1px solid ${color}24`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color }}>{icon}</span>
        </div>
        {delta && (
          <span style={{ 
            fontSize: 11, 
            fontWeight: 700, 
            padding: '4px 8px', 
            borderRadius: 6, 
            background: delta.includes('new') || delta.startsWith('+') ? 'rgba(245,158,11,0.1)' : 'rgba(255,255,255,0.03)', 
            color: delta.includes('new') || delta.startsWith('+') ? 'var(--color-amber)' : 'var(--color-text-muted)',
            fontFamily: 'var(--font-mono)'
          }}>
            {delta}
          </span>
        )}
      </div>
      
      <div>
        <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)', marginBottom: 4 }}>
          {value}
        </div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)' }}>
          {label}
        </div>
      </div>
    </motion.div>
  );
}

function AnalyticsPieChart({ stats }) {
  const pieData = [
    { name: 'Approved', value: stats.approved_meetings || 0, color: 'var(--color-green)' },
    { name: 'Pending', value: stats.pending_requests || 0, color: 'var(--color-amber)' },
    { name: 'Rejected', value: stats.rejected_meetings || 0, color: 'var(--color-red)' },
    { name: 'Cancelled', value: stats.cancelled_meetings || 0, color: 'var(--color-text-muted)' },
  ].filter(d => d.value > 0);

  if (pieData.length === 0) {
    return (
      <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: 13 }}>
        No chart data available
      </div>
    );
  }

  const total = pieData.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ width: '100%', height: 160, position: 'relative' }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={pieData}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={64}
              paddingAngle={4}
              dataKey="value"
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} style={{ outline: 'none' }} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                background: 'rgba(21, 21, 21, 0.95)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
                color: 'white',
                fontSize: '12px',
                boxShadow: 'var(--shadow-md)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', pointerEvents: 'none' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
            {total}
          </div>
          <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Total
          </div>
        </div>
      </div>
      
      {/* Legend */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', width: '100%', marginTop: 12 }}>
        {pieData.map((item, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-secondary)' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color }} />
            <span style={{ fontWeight: 500 }}>{item.name}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'var(--font-mono)' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

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

function BookingModal({ meeting, onClose, onAction }) {
  const [status, setStatus] = useState(meeting.status === 'reschedule_requested' ? 'rescheduled' : 'approved');
  const [notes, setNotes] = useState('');
  const [meetLink, setMeetLink] = useState('');
  
  const getInitialDate = () => {
    if (meeting.start_time) {
      return meeting.start_time.split('T')[0];
    }
    return '';
  };

  const getInitialTime = () => {
    if (meeting.start_time) {
      const timePart = meeting.start_time.split('T')[1];
      if (timePart) {
        return timePart.slice(0, 5);
      }
    }
    return '09:00';
  };

  const [rescheduleDate, setRescheduleDate] = useState(getInitialDate());
  const [rescheduleTime, setRescheduleTime] = useState(getInitialTime());
  const [loading, setLoading] = useState(false);

  if (!meeting) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      let finalNewStart = undefined;
      let finalNewEnd = undefined;
      
      if (status === 'rescheduled') {
        if (!rescheduleDate || !rescheduleTime) {
          alert('Please select both a date and time for rescheduling.');
          setLoading(false);
          return;
        }
        
        const startStr = `${rescheduleDate}T${rescheduleTime}:00`;
        finalNewStart = startStr;
        
        const duration = meeting.duration_minutes || 60;
        const [year, month, day] = rescheduleDate.split('-').map(Number);
        const [hour, min] = rescheduleTime.split(':').map(Number);
        const startDate = new Date(year, month - 1, day, hour, min);
        const endDate = new Date(startDate.getTime() + duration * 60 * 1000);
        
        const pad = (num) => String(num).padStart(2, '0');
        const endStr = `${endDate.getFullYear()}-${pad(endDate.getMonth() + 1)}-${pad(endDate.getDate())}T${pad(endDate.getHours())}:${pad(endDate.getMinutes())}:00`;
        finalNewEnd = endStr;
      }
      
      await onAction(meeting.id, { 
        status, 
        admin_notes: notes, 
        meet_link: meetLink, 
        new_start_time: finalNewStart, 
        new_end_time: finalNewEnd 
      });
      onClose();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      style={{ 
        position: 'fixed', 
        inset: 0, 
        zIndex: 500, 
        background: 'rgba(0, 0, 0, 0.65)', 
        backdropFilter: 'blur(12px)', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: 24 
      }} 
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div 
        className="glass-premium-strong" 
        initial={{ scale: 0.95, opacity: 0, y: 12 }} 
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ 
          width: '100%', 
          maxWidth: 540, 
          padding: 32, 
          borderRadius: 24,
          background: 'var(--color-surface-2)',
          boxShadow: 'var(--shadow-lg), 0 0 80px rgba(0,0,0,0.5)',
          border: '1px solid rgba(255,255,255,0.08)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Review Meeting Request</h2>
          <button 
            className="btn-premium btn-premium-ghost" 
            onClick={onClose} 
            style={{ padding: 4, minWidth: 'auto', borderRadius: '50%', width: 32, height: 32 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>close</span>
          </button>
        </div>

        {/* Meeting Details Summary */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--color-border)', borderRadius: 16, padding: 18, marginBottom: 20 }}>
          <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--color-text-primary)', marginBottom: 12 }}>{meeting.title}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>person</span> 
              <span style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{meeting.client_name}</span> · <span style={{ color: 'var(--color-text-muted)' }}>{meeting.client_email}</span>
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>schedule</span> 
              <span>{meeting.display_date || (meeting.start_time ? format(parseISO(meeting.start_time), 'MMM dd, yyyy') : 'TBD')}</span> · 
              <span>{meeting.display_time || (meeting.start_time ? format(parseISO(meeting.start_time), 'hh:mm a') : 'TBD')}</span>
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>assignment</span> 
              <span>{meeting.meeting_type}</span> · <span>{meeting.duration_minutes} mins</span>
            </p>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--color-text-muted)' }}>
                {meeting.preferred_communication === 'video' ? 'videocam' : 
                 meeting.preferred_communication === 'in_person' ? 'home_pin' : 'location_on'}
              </span>
              <span>
                {meeting.preferred_communication === 'video' ? 'Google Meet (Online Video)' : 
                 meeting.preferred_communication === 'in_person' ? 'Spi Edge (In-Office Meet)' : 
                 meeting.preferred_communication?.startsWith('custom_location:') ? meeting.preferred_communication.replace('custom_location:', '').trim() : 'In-Person'}
              </span>
            </p>
          </div>
          {meeting.reason && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--color-border)' }}>
              <p style={{ fontSize: 12, color: 'var(--color-text-muted)', fontStyle: 'italic', lineHeight: 1.5 }}>"{meeting.reason}"</p>
            </div>
          )}
        </div>

        {/* Action Selection Pills */}
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>Select Decision</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
            {['approved', 'rejected', 'rescheduled', 'cancelled'].map(s => {
              const isActive = status === s;
              const col = STATUS_COLORS[s];
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  style={{
                    padding: '10px 0',
                    borderRadius: 10,
                    border: `1px solid ${isActive ? col : 'var(--color-border)'}`,
                    background: isActive ? `${col}15` : 'transparent',
                    color: isActive ? col : 'var(--color-text-secondary)',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'var(--transition-fast)',
                    textTransform: 'capitalize',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                    {s === 'approved' ? 'check_circle' : 
                     s === 'rejected' ? 'cancel' : 
                     s === 'cancelled' ? 'block' : 'update'}
                  </span>
                  <span>{s === 'rescheduled' ? 'Resched' : s}</span>
                </button>
              );
            })}
          </div>
        </div>

        {status === 'approved' && (
          <div style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Meeting Link (optional)</label>
            <input className="input-premium" placeholder="https://meet.google.com/..." value={meetLink} onChange={(e) => setMeetLink(e.target.value)} />
          </div>
        )}

        {status === 'rescheduled' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>New Date</label>
              <input 
                className="input-premium" 
                type="date" 
                value={rescheduleDate} 
                onChange={(e) => setRescheduleDate(e.target.value)} 
                style={{ padding: '10px 12px', width: '100%' }} 
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>New Start Time (IST)</label>
              <select 
                className="input-premium" 
                value={rescheduleTime} 
                onChange={(e) => setRescheduleTime(e.target.value)} 
                style={{ padding: '10px 12px', width: '100%', appearance: 'none', cursor: 'pointer' }}
              >
                {TIME_SLOTS.map(slot => (
                  <option key={slot.value} value={slot.value} style={{ background: 'var(--color-surface-3)', color: 'var(--color-text-primary)' }}>
                    {slot.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 8, fontFamily: 'var(--font-mono)' }}>Notes to Client (optional)</label>
          <textarea className="input-premium" placeholder="Include custom notes or guidelines..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 80, resize: 'vertical' }} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn-premium btn-premium-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn-premium btn-premium-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Processing...' : `Confirm ${status.charAt(0).toUpperCase() + status.slice(1)}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isAdmin } = useAuth();
  if (!isAdmin) {
    window.location.href = '/';
    return null;
  }
  const [stats, setStats] = useState({});
  const [meetings, setMeetings] = useState([]);
  const [pendingMeetings, setPendingMeetings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [dateFilter, setDateFilter] = useState('all time');

  const fetchData = useCallback(async () => {
    try {
      const [statsData, allMeetings, pending, notifs] = await Promise.all([
        api.getStats(),
        api.adminGetMeetings(),
        api.adminGetMeetings('pending'),
        api.getNotifications(),
      ]);
      setStats(statsData);
      setMeetings(allMeetings);
      setPendingMeetings(pending);
      setNotifications(notifs.filter(n => !n.is_read));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleAction = async (id, data) => {
    await api.adminUpdateStatus(id, data);
    await fetchData();
  };

  const filteredMeetings = meetings.filter(m => {
    if (activeTab === 'all') {
      if (m.status !== 'approved' && m.status !== 'rescheduled' && m.status !== 'completed') return false;
    } else if (activeTab === 'pending') {
      if (m.status !== 'pending' && m.status !== 'reschedule_requested' && m.status !== 'rejected') return false;
    } else {
      if (m.status !== activeTab) return false;
    }
    if (dateFilter !== 'all time' && m.start_time) {
      const date = parseISO(m.start_time);
      if (dateFilter === 'today' && !isToday(date)) return false;
      if (dateFilter === 'this week' && !isThisWeek(date)) return false;
      if (dateFilter === 'this month' && !isThisMonth(date)) return false;
    }
    return true;
  });

  const pendingAndRejectedMeetings = meetings.filter(m => m.status === 'pending' || m.status === 'reschedule_requested' || m.status === 'rejected');

  return (
    <Layout title="Executive Dashboard" notifCount={notifications.length}>
      <AnimatePresence>
        {selectedMeeting && (
          <BookingModal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} onAction={handleAction} />
        )}
      </AnimatePresence>

      <div style={{ position: 'relative' }}>
        {/* Background radial glow */}
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.04) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Date / Pending Widget Header Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <div>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 14, fontWeight: 600 }}>
              {format(new Date(), 'EEEE, MMMM dd, yyyy')}
            </p>
          </div>
          {pendingMeetings.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{ 
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
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-amber)', animation: 'pulse 1.8s infinite' }} />
              {pendingMeetings.length} PENDING REQUESTS
            </motion.div>
          )}
        </div>

        {/* Stat Cards Grid */}
        <div className="layout-grid grid-cols-4" style={{ marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <StatCard icon="assessment" label="Total Meetings" value={stats.total_meetings ?? 0} color="var(--color-accent)" delay={0} />
          <StatCard icon="pending_actions" label="Pending Approval" value={stats.pending_requests ?? 0} color="var(--color-amber)" delta={stats.pending_requests > 0 ? `${stats.pending_requests} new` : null} delay={0.05} />
          <StatCard icon="check_circle" label="Approved Sessions" value={stats.approved_meetings ?? 0} color="var(--color-green)" delay={0.1} />
          <StatCard icon="trending_up" label="Approval Rate" value={stats.approval_rate ?? '0%'} color="var(--color-accent-cyan)" delay={0.15} />
        </div>

        {/* Responsive Dashboard Core Grid */}
        <div className="admin-dashboard-grid" style={{ position: 'relative', zIndex: 1 }}>
          
          {/* Left Column: Meetings Table & Tabs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              
              {/* Tab Pills */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: 'rgba(255,255,255,0.02)', padding: 4, borderRadius: 12, border: '1px solid var(--color-border)' }}>
                {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(tab => {
                  const isActive = activeTab === tab;
                  return (
                    <button 
                      key={tab} 
                      onClick={() => setActiveTab(tab)} 
                      style={{ 
                        padding: '6px 14px', 
                        borderRadius: 8, 
                        fontSize: 12, 
                        fontWeight: 700, 
                        cursor: 'pointer', 
                        border: 'none', 
                        background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent', 
                        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', 
                        transition: 'var(--transition-fast)', 
                        textTransform: 'capitalize',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>

              {/* Date Filters */}
              <div style={{ display: 'flex', gap: 4, background: 'rgba(255,255,255,0.02)', padding: 4, borderRadius: 12, border: '1px solid var(--color-border)' }}>
                {['all time', 'today', 'this week', 'this month'].map(filter => {
                  const isActive = dateFilter === filter;
                  return (
                    <button 
                      key={filter} 
                      onClick={() => setDateFilter(filter)} 
                      style={{ 
                        padding: '6px 12px', 
                        borderRadius: 8, 
                        fontSize: 11, 
                        fontWeight: 700, 
                        cursor: 'pointer', 
                        border: 'none', 
                        background: isActive ? 'rgba(255,255,255,0.05)' : 'transparent', 
                        color: isActive ? 'var(--color-text-primary)' : 'var(--color-text-secondary)', 
                        transition: 'var(--transition-fast)', 
                        textTransform: 'capitalize',
                        fontFamily: 'var(--font-mono)'
                      }}
                    >
                      {filter}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Meetings Table Card */}
            <motion.div 
              initial={{ opacity: 0, y: 16 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.2 }}
              className="glass-premium"
              style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--glass-bg)' }}
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--color-border)', background: 'rgba(255,255,255,0.01)' }}>
                      <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Client</th>
                      <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Meeting Details</th>
                      <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Date & Time</th>
                      <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Priority</th>
                      <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)' }}>Status</th>
                      <th style={{ padding: '16px 20px', fontSize: 11, fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: 'var(--font-mono)', textAlign: 'right' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid var(--color-border)' }}>
                          <td style={{ padding: '16px 20px' }}><div className="skeleton-pulse" style={{ height: 32, width: 32, borderRadius: '50%', display: 'inline-block' }} /><div className="skeleton-pulse" style={{ height: 14, width: 80, marginLeft: 8, display: 'inline-block' }} /></td>
                          <td style={{ padding: '16px 20px' }}><div className="skeleton-pulse" style={{ height: 14, width: 120 }} /></td>
                          <td style={{ padding: '16px 20px' }}><div className="skeleton-pulse" style={{ height: 14, width: 100 }} /></td>
                          <td style={{ padding: '16px 20px' }}><div className="skeleton-pulse" style={{ height: 20, width: 50, borderRadius: 6 }} /></td>
                          <td style={{ padding: '16px 20px' }}><div className="skeleton-pulse" style={{ height: 20, width: 60, borderRadius: 6 }} /></td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}><div className="skeleton-pulse" style={{ height: 28, width: 60, borderRadius: 8, display: 'inline-block' }} /></td>
                        </tr>
                      ))
                    ) : filteredMeetings.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 8, display: 'block', color: 'var(--color-text-muted)' }}>calendar_today</span>
                          No scheduled mentorship meetings found.
                        </td>
                      </tr>
                    ) : filteredMeetings.map((m, i) => {
                      const priorityColor = PRIORITY_COLORS[m.priority] || 'var(--color-accent)';
                      const statusColor = STATUS_COLORS[m.status] || 'white';
                      return (
                        <tr 
                          key={m.id} 
                          className="admin-table-row"
                          onClick={() => setSelectedMeeting(m)}
                          style={{ cursor: 'pointer', borderBottom: '1px solid var(--color-border)', transition: 'var(--transition-fast)' }}
                        >
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-cyan) 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: 'white', flexShrink: 0, boxShadow: '0 2px 10px rgba(59, 130, 246, 0.2)' }}>
                                {m.client_name?.charAt(0) || '?'}
                              </div>
                              <div>
                                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)' }}>{m.client_name}</p>
                                <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{m.client_email}</p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)' }}>{m.title}</p>
                            <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{m.meeting_type}</p>
                          </td>
                          <td style={{ padding: '16px 20px', fontSize: 13, color: 'var(--color-text-secondary)' }}>
                            <span style={{ fontWeight: 500 }}>{m.display_date || (m.start_time ? format(parseISO(m.start_time), 'MMM dd, yyyy') : 'TBD')}</span>
                            <span style={{ color: 'var(--color-text-muted)', margin: '0 4px' }}>·</span>
                            <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{m.display_time || (m.start_time ? format(parseISO(m.start_time), 'hh:mm a') : 'TBD')}</span>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span className={`badge-priority badge-priority-${m.priority}`}>
                              {m.priority}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <span 
                              className="badge-status-pill"
                              style={{ 
                                background: `${statusColor}10`, 
                                color: statusColor, 
                                border: `1px solid ${statusColor}20`,
                                textTransform: 'capitalize' 
                              }}
                            >
                              <span style={{ width: 5, height: 5, borderRadius: '50%', background: statusColor }} />
                              {m.status === 'reschedule_requested' ? 'reschedule requested' : m.status}
                            </span>
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                            {(m.status === 'pending' || m.status === 'reschedule_requested') ? (
                              <button 
                                className="btn-premium btn-premium-primary" 
                                onClick={() => setSelectedMeeting(m)}
                                style={{ padding: '6px 14px', fontSize: 12, borderRadius: 8 }}
                              >
                                Review
                              </button>
                            ) : (
                              <button 
                                className="btn-premium btn-premium-secondary" 
                                onClick={() => setSelectedMeeting(m)}
                                style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}
                              >
                                Details
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          {/* Right Column: Analytics & Pending list feed */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            
            {/* Analytics Summary */}
            <motion.div 
              initial={{ opacity: 0, x: 16 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.15 }}
              className="glass-premium"
              style={{ padding: 24, borderRadius: 16, border: '1px solid var(--color-border)', background: 'var(--glass-bg)' }}
            >
              <h3 style={{ fontSize: 15, fontWeight: 800, letterSpacing: '-0.01em', marginBottom: 16, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>
                Session Distribution
              </h3>
              <AnalyticsPieChart stats={stats} />
            </motion.div>

            {/* Pending requests feed */}
            <motion.div 
              initial={{ opacity: 0, x: 16 }} 
              animate={{ opacity: 1, x: 0 }} 
              transition={{ delay: 0.25 }}
              className="glass-premium"
              style={{ padding: 24, borderRadius: 16, border: '1px solid var(--color-border)', background: 'var(--glass-bg)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--color-text-primary)', fontFamily: 'var(--font-heading)' }}>Decision Feed</h3>
                  {pendingMeetings.length > 0 && (
                    <span style={{ 
                      background: 'rgba(245,158,11,0.12)', 
                      border: '1px solid rgba(245,158,11,0.2)', 
                      borderRadius: 100, 
                      padding: '2px 8px', 
                      fontSize: 10, 
                      fontWeight: 800, 
                      color: 'var(--color-amber)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {pendingMeetings.length} ACTIVE
                    </span>
                  )}
                </div>
                <a 
                  href="/admin/pending" 
                  style={{ 
                    fontSize: 11, 
                    fontWeight: 700, 
                    color: 'var(--color-accent)', 
                    textDecoration: 'none', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 4 
                  }}
                >
                  <span>Open Stack</span>
                  <span className="material-symbols-outlined" style={{ fontSize: 14 }}>layers</span>
                </a>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingAndRejectedMeetings.length === 0 ? (
                  <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, padding: '32px 0' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 24, color: 'var(--color-green)', marginBottom: 6, display: 'block' }}>check_circle</span>
                    All requests completed!
                  </div>
                ) : pendingAndRejectedMeetings.slice(0, 5).map((m) => {
                  const priorityColor = PRIORITY_COLORS[m.priority] || 'var(--color-accent)';
                  const isRejected = m.status === 'rejected';
                  return (
                    <div 
                      key={m.id} 
                      style={{ 
                        padding: 16, 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid var(--color-border)', 
                        borderRadius: 14,
                        transition: 'var(--transition-fast)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                        <div style={{ width: 30, height: 30, background: isRejected ? 'linear-gradient(135deg, var(--color-red) 0%, #fb7171 100%)' : 'linear-gradient(135deg, var(--color-amber) 0%, var(--color-accent-orange) 100%)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'white', flexShrink: 0 }}>
                          {m.client_name?.charAt(0) || '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.client_name}</p>
                          <p style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                        </div>
                        <span className={`badge-priority badge-priority-${m.priority}`} style={{ fontSize: 9, padding: '2px 6px', borderRadius: 4 }}>
                          {m.priority}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--color-text-secondary)', marginBottom: 14 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: 'var(--color-text-muted)' }}>schedule</span>
                        <span>{m.display_date || (m.start_time ? format(parseISO(m.start_time), 'MMM dd, yyyy') : 'TBD')}</span>
                        <span>·</span>
                        <span>{m.display_time || (m.start_time ? format(parseISO(m.start_time), 'hh:mm a') : 'TBD')}</span>
                      </div>

                      <div style={{ display: 'flex', gap: 8 }}>
                        {!isRejected && (
                          <button 
                            className="btn-premium btn-premium-primary" 
                            style={{ flex: 1, padding: '6px 12px', fontSize: 11, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                            onClick={() => handleAction(m.id, { status: 'approved' })}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>check</span> Approve
                          </button>
                        )}
                        <button 
                          className="btn-premium btn-premium-secondary" 
                          onClick={() => setSelectedMeeting(m)}
                          style={{ flex: isRejected ? 1 : 'none', padding: '6px 12px', fontSize: 11, borderRadius: 8 }}
                        >
                          Review
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </div>
      </div>

      <style>{`
        .admin-dashboard-grid {
          display: grid;
          grid-template-columns: 2.2fr 1fr;
          gap: 24px;
        }
        @media (max-width: 1200px) {
          .admin-dashboard-grid {
            grid-template-columns: 1fr;
          }
        }
        
        .admin-table-row {
          transition: var(--transition-fast);
        }
        .admin-table-row:hover {
          background: rgba(255, 255, 255, 0.02) !important;
        }
        
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

