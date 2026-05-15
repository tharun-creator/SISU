import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import Chat from '../components/Chat';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { format, parseISO } from 'date-fns';

const STATUS_CONFIG = {
  pending:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Pending', border: 'rgba(245,158,11,0.2)' },
  approved:    { color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: 'Approved', border: 'rgba(16,185,129,0.2)' },
  rejected:    { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'Rejected', border: 'rgba(239,68,68,0.2)' },
  cancelled:   { color: '#6b7280', bg: 'rgba(107,114,128,0.1)', label: 'Cancelled', border: 'rgba(107,114,128,0.15)' },
  rescheduled: { color: '#fb923c', bg: 'rgba(251,146,60,0.12)', label: 'Rescheduled', border: 'rgba(251,146,60,0.2)' },
  completed:   { color: '#6C63FF', bg: 'rgba(108, 99, 255, 0.12)', label: 'Completed', border: 'rgba(108, 99, 255, 0.2)' },
};

function MeetingCard({ meeting, onCancel }) {
  const cfg = STATUS_CONFIG[meeting.status] || STATUS_CONFIG.pending;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${cfg.border}`, borderRadius: 14, padding: 16, position: 'relative', overflow: 'hidden' }}
    >
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: cfg.color, opacity: 0.6 }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <p style={{ fontWeight: 600, fontSize: 14, flex: 1, paddingRight: 8, lineHeight: 1.4 }}>{meeting.title}</p>
        <span style={{ padding: '3px 10px', background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, borderRadius: 100, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>{cfg.label}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span> {meeting.start_time ? format(parseISO(meeting.start_time), 'MMM d, yyyy · h:mm a') : '—'}
      </p>
      <p style={{ fontSize: 12, color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>assignment</span> {meeting.meeting_type} · {meeting.duration_minutes} mins</p>
      <div style={{ display: 'flex', justifyContent: meeting.meet_link ? 'space-between' : 'flex-end', alignItems: 'center', marginTop: 12 }}>
        {meeting.meet_link && (
          <a href={meeting.meet_link} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '6px 12px', background: 'rgba(108, 99, 255, 0.1)', border: '1px solid rgba(108, 99, 255, 0.2)', borderRadius: 8, color: '#6C63FF', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>link</span> Join Meeting
          </a>
        )}
        {(meeting.status === 'pending' || meeting.status === 'approved') && (
          <button className="btn btn-ghost btn-sm" onClick={() => onCancel(meeting.id)} style={{ color: '#ef4444', fontSize: 11, padding: '4px 10px', border: '1px solid rgba(239,68,68,0.2)' }}>Cancel</button>
        )}
      </div>
    </motion.div>
  );
}

export default function ClientDashboard() {
  const { user } = useAuth();
  const [meetings, setMeetings] = useState([]);
  const [stats, setStats] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [activeFilter, setActiveFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [meetingsData, statsData, notifsData] = await Promise.all([
        api.getMeetings(),
        api.getStats(),
        api.getNotifications(),
      ]);
      setMeetings(meetingsData);
      setStats(statsData);
      setNotifications(notifsData.filter(n => !n.is_read));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 20000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this meeting?')) return;
    try {
      await api.cancelMeeting(id);
      await fetchData();
    } catch (e) {
      alert(e.message);
    }
  };

  const filtered = activeFilter === 'all' ? meetings : meetings.filter(m => m.status === activeFilter);

  return (
    <Layout notifCount={notifications.length}>
      <main className="dashboard-main">
        {/* Chat area */}
        <div className="chat-container">
          <Chat onMeetingBooked={fetchData} />
        </div>

        {/* Right sidebar: meetings */}
        <div className="meeting-sidebar">
          {/* Header */}
          <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid var(--color-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div style={{ width: 38, height: 38, background: 'linear-gradient(135deg, #6C63FF, #00C2FF)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'white' }}>
                {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14 }}>Welcome, {user?.name?.split(' ')[0]}</p>
                <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{user?.company || 'SISU Platform'}</p>
              </div>
            </div>

            {/* Quick stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {[
                { label: 'Total', value: stats.total_meetings ?? 0, color: '#6C63FF' },
                { label: 'Pending', value: stats.pending_requests ?? 0, color: '#f59e0b' },
                { label: 'Approved', value: stats.approved_meetings ?? 0, color: '#10b981' },
              ].map(({ label, value, color }) => (
                <div key={label} style={{ padding: '10px 8px', background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 10, textAlign: 'center' }}>
                  <p style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{loading ? '—' : value}</p>
                  <p style={{ fontSize: 10, color: 'var(--color-text-muted)', marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 500 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Filter tabs */}
          <div style={{ padding: '12px 20px 0', borderBottom: '1px solid var(--color-border)', display: 'flex', gap: 6, overflowX: 'auto' }}>
            {['all', 'pending', 'approved', 'rejected'].map(tab => (
              <button key={tab} onClick={() => setActiveFilter(tab)} style={{ padding: '7px 14px', borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${activeFilter === tab ? 'rgba(108, 99, 255, 0.4)' : 'transparent'}`, background: activeFilter === tab ? 'rgba(108, 99, 255, 0.12)' : 'transparent', color: activeFilter === tab ? '#6C63FF' : 'var(--color-text-muted)', transition: 'var(--transition)', textTransform: 'capitalize', whiteSpace: 'nowrap', marginBottom: 12 }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Meeting list */}
          <div className="meeting-list">
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ padding: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 14 }}>
                  <div className="skeleton" style={{ height: 14, width: '70%', marginBottom: 10 }} />
                  <div className="skeleton" style={{ height: 12, width: '50%', marginBottom: 6 }} />
                  <div className="skeleton" style={{ height: 12, width: '40%' }} />
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--color-text-muted)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 40, marginBottom: 12 }}>calendar_today</span>
                <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No meetings yet</p>
                <p style={{ fontSize: 13 }}>Chat with the assistant to book your first session</p>
              </div>
            ) : filtered.map(m => (
              <MeetingCard key={m.id} meeting={m} onCancel={handleCancel} />
            ))}
          </div>

          {/* Book button */}
          <div style={{ padding: 16, borderTop: '1px solid var(--color-border)' }}>
            <a href="/book" className="btn btn-primary" style={{ width: '100%', textDecoration: 'none', display: 'flex', justifyContent: 'center', gap: 8 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>calendar_today</span> Book New Meeting
            </a>
          </div>
        </div>

        <style>{`
          .dashboard-main {
            margin-left: var(--sidebar-width);
            display: flex;
            height: 100vh;
            overflow: hidden;
          }
          .chat-container {
            flex: 1;
            overflow: hidden;
            border-right: 1px solid var(--color-border);
          }
          .meeting-sidebar {
            width: 340px;
            display: flex;
            flex-direction: column;
            background: var(--color-surface);
            overflow: hidden;
          }
          .meeting-list {
            flex: 1;
            overflow-y: auto;
            padding: 16;
            display: flex;
            flex-direction: column;
            gap: 12;
          }
          @media (max-width: 1024px) {
            .dashboard-main {
              flex-direction: column;
              height: auto;
              overflow: visible;
              margin-left: 0;
            }
            .chat-container {
              height: 500px;
              border-right: none;
              border-bottom: 1px solid var(--color-border);
            }
            .meeting-sidebar {
              width: 100%;
              height: auto;
            }
          }
        `}</style>
      </main>
    </Layout>
  );
}
