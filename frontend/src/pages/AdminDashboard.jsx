import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import OtterMeetingNotesModal from '../components/OtterMeetingNotesModal';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { format, parseISO, isToday, isThisWeek, isThisMonth } from 'date-fns';

const STATUS_COLORS = { pending: '#f59e0b', approved: '#10b981', rejected: '#ef4444', cancelled: '#6b7280', rescheduled: '#fb923c', reschedule_requested: '#fb923c', completed: '#6C63FF' };
const PRIORITY_COLORS = { urgent: '#ef4444', high: '#fb923c', normal: '#6C63FF', low: '#6ee7b7' };

function StatCard({ icon, label, value, delta, color = '#6C63FF', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="stat-card"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 24, color }}>{icon}</span>
        </div>
        {delta && <span className={`stat-delta ${delta.startsWith('+') ? 'stat-delta-up' : 'stat-delta-down'}`}>{delta}</span>}
      </div>
      <div className="stat-value" style={{ color }}>{value}</div>
      <div className="stat-label">{label}</div>
    </motion.div>
  );
}

function BookingModal({ meeting, onClose, onAction, onOpenOtter }) {
  const [status, setStatus] = useState('approved');
  const [notes, setNotes] = useState('');
  const [meetLink, setMeetLink] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [loading, setLoading] = useState(false);

  if (!meeting) return null;

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await onAction(meeting.id, { status, admin_notes: notes, meet_link: meetLink, new_start_time: newStart || undefined, new_end_time: newEnd || undefined });
      onClose();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div className="modal" initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>Review Meeting Request</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}>✕</button>
        </div>

        {/* Meeting info */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 12, padding: 16, marginBottom: 20 }}>
          <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>{meeting.title}</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>person</span> {meeting.client_name} · {meeting.client_email}</p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span> 
            {meeting.display_date || (meeting.start_time ? format(parseISO(meeting.start_time), 'MMM dd, yyyy') : 'TBD')} · 
            {meeting.display_time || (meeting.start_time ? format(parseISO(meeting.start_time), 'hh:mm a') : 'TBD')}
          </p>
          <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>assignment</span> {meeting.meeting_type} · {meeting.duration_minutes} mins</p>
          {meeting.reason && <p style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 8, fontStyle: 'italic' }}>"{meeting.reason}"</p>}
        <button className="btn btn-ghost btn-sm" onClick={() => onOpenOtter(meeting)} style={{ color: '#00C2FF', fontSize: 11, padding: '6px 12px', border: '1px solid rgba(0,194,255,0.2)', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 10, width: '100%', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>graphic_eq</span> Open Otter AI Notes & Transcript
        </button>
      </div>

        {/* Action selection */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Action</label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['approved', 'rejected', 'rescheduled', 'cancelled'].map(s => (
              <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${status === s ? STATUS_COLORS[s] : 'var(--color-border)'}`, background: status === s ? `${STATUS_COLORS[s]}18` : 'transparent', color: status === s ? STATUS_COLORS[s] : 'var(--color-text-secondary)', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'var(--transition)', textTransform: 'capitalize', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                {s === 'approved' ? <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span> Approve</> : 
                 s === 'rejected' ? <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span> Reject</> : 
                 s === 'cancelled' ? <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>cancel</span> Cancel</> : 
                 <><span className="material-symbols-outlined" style={{ fontSize: 16 }}>update</span> Reschedule</>}
              </button>
            ))}
          </div>
        </div>

        {status === 'approved' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Meeting Link (optional)</label>
            <input className="input" placeholder="https://meet.google.com/..." value={meetLink} onChange={(e) => setMeetLink(e.target.value)} />
          </div>
        )}

        {status === 'rescheduled' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>New Start</label>
              <input className="input" type="datetime-local" value={newStart} onChange={(e) => setNewStart(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>New End</label>
              <input className="input" type="datetime-local" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} />
            </div>
          </div>
        )}

        <div style={{ marginBottom: 24 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>Notes to Client (optional)</label>
          <textarea className="input" placeholder="Add a message for the client..." value={notes} onChange={(e) => setNotes(e.target.value)} style={{ minHeight: 80 }} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <button className="btn btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={loading} style={{ flex: 1 }}>
            {loading ? 'Processing...' : `Confirm ${status.charAt(0).toUpperCase() + status.slice(1)}`}
          </button>
        </div>
      </motion.div>
    </div>
  );
}



export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [meetings, setMeetings] = useState([]);
  const [pendingMeetings, setPendingMeetings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [otterMeeting, setOtterMeeting] = useState(null);
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

  const pieData = [
    { name: 'Approved', value: stats.approved_meetings || 0, color: '#10b981' },
    { name: 'Pending', value: stats.pending_requests || 0, color: '#f59e0b' },
    { name: 'Rejected', value: stats.rejected_meetings || 0, color: '#ef4444' },
    { name: 'Cancelled', value: stats.cancelled_meetings || 0, color: '#6b7280' },
  ].filter(d => d.value > 0);

  return (
    <Layout notifCount={notifications.length}>
      {selectedMeeting && <BookingModal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} onAction={handleAction} onOpenOtter={setOtterMeeting} />}

      <main className="main-content">
        <div className="ambient-bg" />

        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 32 }}>
          <div>
            <h1 className="page-title">Executive Dashboard</h1>
            <p className="page-subtitle">{format(new Date(), 'EEEE, MMMM dd, yyyy')}</p>
          </div>
          <div className="desktop-only" style={{ padding: '6px 14px', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 100, fontSize: 12, fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
             <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 2s infinite' }} />
             {pendingMeetings.length} pending requests
          </div>
        </div>
        <div className="ambient-bg" />

        {/* Stat Cards */}
        <div className="grid-4" style={{ marginBottom: 28 }}>
          <StatCard icon="assessment" label="Total Meetings" value={stats.total_meetings ?? 0} color="#6C63FF" delay={0} />
          <StatCard icon="pending_actions" label="Pending Approval" value={stats.pending_requests ?? 0} color="#f59e0b" delta={stats.pending_requests > 0 ? `${stats.pending_requests} new` : null} delay={0.05} />
          <StatCard icon="check_circle" label="Approved" value={stats.approved_meetings ?? 0} color="#10b981" delay={0.1} />
          <StatCard icon="trending_up" label="Approval Rate" value={stats.approval_rate ?? '0%'} color="#00C2FF" delay={0.15} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          {/* Left column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>


            {/* Meetings Table */}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 16 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '7px 16px', borderRadius: 100, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${activeTab === tab ? 'rgba(108, 99, 255, 0.4)' : 'var(--color-border)'}`, background: activeTab === tab ? 'rgba(108, 99, 255, 0.12)' : 'transparent', color: activeTab === tab ? '#6C63FF' : 'var(--color-text-secondary)', transition: 'var(--transition)', textTransform: 'capitalize' }}>
                      {tab}
                    </button>
                  ))}
                </div>
                
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: 'rgba(0,0,0,0.03)', padding: 4, borderRadius: 100, border: '1px solid var(--color-border)' }}>
                  {['all time', 'today', 'this week', 'this month'].map(filter => (
                    <button key={filter} onClick={() => setDateFilter(filter)} style={{ padding: '6px 14px', borderRadius: 100, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: 'none', background: dateFilter === filter ? '#FFFFFF' : 'transparent', color: dateFilter === filter ? '#111111' : 'var(--color-text-secondary)', transition: 'var(--transition)', textTransform: 'capitalize', boxShadow: dateFilter === filter ? '0 2px 8px rgba(0,0,0,0.06)' : 'none' }}>
                      {filter}
                    </button>
                  ))}
                </div>
              </div>

              <div className="table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Client</th>
                      <th>Meeting</th>
                      <th>Date & Time</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i}>
                          {Array.from({ length: 6 }).map((_, j) => (
                            <td key={j}><div className="skeleton" style={{ height: 16, width: j === 5 ? 60 : '80%' }} /></td>
                          ))}
                        </tr>
                      ))
                    ) : filteredMeetings.length === 0 ? (
                      <tr><td colSpan={6} style={{ textAlign: 'center', padding: '48px 0', color: 'var(--color-text-muted)' }}>No meetings found</td></tr>
                    ) : filteredMeetings.map((m, i) => (
                      <motion.tr key={m.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                        style={{ cursor: 'pointer' }} onClick={() => setSelectedMeeting(m)}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #6C63FF, #00C2FF)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                              {m.client_name?.charAt(0) || '?'}
                            </div>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600 }}>{m.client_name}</p>
                              <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{m.client_email}</p>
                            </div>
                          </div>
                        </td>
                        <td>
                          <p style={{ fontSize: 13, fontWeight: 500 }}>{m.title}</p>
                          <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{m.meeting_type}</p>
                        </td>
                        <td style={{ fontSize: 13, color: 'var(--color-text-secondary)' }}>
                          {m.display_date || (m.start_time ? format(parseISO(m.start_time), 'MMM dd, yyyy') : 'TBD')} · 
                          {m.display_time || (m.start_time ? format(parseISO(m.start_time), 'hh:mm a') : 'TBD')}
                        </td>
                        <td><span className={`badge badge-${m.priority}`}>{m.priority}</span></td>
                        <td>
                          <span className={`badge badge-${m.status}`} style={{ textTransform: 'capitalize' }}>
                            {m.status === 'reschedule_requested' ? 'reschedule requested' : m.status}
                          </span>
                        </td>
                        <td onClick={(e) => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {(m.status === 'pending' || m.status === 'reschedule_requested') ? (
                              <button className="btn btn-primary btn-sm" onClick={() => setSelectedMeeting(m)}>Review</button>
                            ) : (
                              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedMeeting(m)} style={{ fontSize: 11, padding: '4px 10px' }}>Details</button>
                            )}
                            {(m.status === 'approved' || m.status === 'rescheduled' || m.status === 'completed' || m.status === 'pending') && (
                              <button className="btn btn-ghost btn-sm" onClick={() => setOtterMeeting(m)} style={{ color: '#00C2FF', border: '1px solid rgba(0,194,255,0.2)', display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, padding: '4px 10px' }}>
                                <span className="material-symbols-outlined" style={{ fontSize: 14 }}>graphic_eq</span> Otter
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>

          {/* Right sidebar */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
             {/* Pending requests quick actions */}
            <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>Pending & Rejected Requests</h3>
                {pendingMeetings.length > 0 && (
                  <span style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: 100, padding: '2px 10px', fontSize: 11, fontWeight: 700, color: '#f59e0b' }}>
                    {pendingMeetings.length} NEW
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingAndRejectedMeetings.length === 0 ? (
                  <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 13, padding: '20px 0' }}>All caught up!</p>
                ) : pendingAndRejectedMeetings.slice(0, 8).map((m) => (
                  <div key={m.id} style={{ padding: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <div style={{ width: 32, height: 32, background: m.status === 'rejected' ? 'linear-gradient(135deg, #ef4444, #f87171)' : 'linear-gradient(135deg, #f59e0b, #fb923c)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {m.client_name?.charAt(0) || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.client_name}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.title}</p>
                      </div>
                      <span className={`badge badge-${m.priority}`}>{m.priority}</span>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 16 }}>schedule</span> 
                      {m.display_date || (m.start_time ? format(parseISO(m.start_time), 'MMM dd, yyyy') : 'TBD')} · 
                      {m.display_time || (m.start_time ? format(parseISO(m.start_time), 'hh:mm a') : 'TBD')}
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-success btn-sm" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}
                        onClick={() => handleAction(m.id, { status: 'approved' })}><span className="material-symbols-outlined" style={{ fontSize: 16 }}>check</span> Approve</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setSelectedMeeting(m)} style={{ padding: '6px 12px' }}>Review</button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </main>
      <AnimatePresence>
        {otterMeeting && (
          <OtterMeetingNotesModal meeting={otterMeeting} onClose={() => setOtterMeeting(null)} />
        )}
      </AnimatePresence>
      <style>{`
        /* White color style overrides for Admin Dashboard high legibility */
        .page-subtitle {
          color: #E2E8F0 !important;
        }
        .stat-label {
          color: #CBD5E1 !important;
          font-weight: 600 !important;
        }
        .data-table th {
          color: #FFFFFF !important;
          font-weight: 700 !important;
        }
        .data-table td {
          color: #FFFFFF !important;
        }
        .data-table td p {
          color: #FFFFFF !important;
        }
        .data-table td p:last-child {
          color: #CBD5E1 !important;
        }
        .card h3 {
          color: #FFFFFF !important;
        }
        .card p {
          color: #E2E8F0 !important;
        }
        .card p span {
          color: #E2E8F0 !important;
        }
        /* Custom date color in table */
        .data-table td:nth-child(3) {
          color: #FFFFFF !important;
        }
      `}</style>
    </Layout>
  );
}
