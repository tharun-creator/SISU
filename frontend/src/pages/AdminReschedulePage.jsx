import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Layout from '../components/Layout';
import BookingModal from '../components/BookingModal';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { format, parseISO } from 'date-fns';

const PRIORITY_COLORS = {
  urgent: 'var(--color-red)',
  high: 'var(--color-red)',
  medium: 'var(--color-amber)',
  normal: 'var(--color-amber)',
  low: 'var(--color-green)'
};

const STATUS_COLORS = {
  rescheduled: 'var(--color-accent-orange)',
  reschedule_requested: 'var(--color-accent-orange)'
};

function StatCard({ icon, label, value, color = 'var(--color-accent)', delay = 0 }) {
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
      <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: 100, height: 100, background: `radial-gradient(circle, ${color}10 0%, transparent 70%)`, borderRadius: '50%', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ width: 42, height: 42, borderRadius: 12, background: `${color}12`, border: `1px solid ${color}24`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 22, color }}>{icon}</span>
        </div>
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

export default function AdminReschedulePage() {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    window.location.href = '/';
    return null;
  }

  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'rescheduled' | 'reschedule_requested'

  const fetchData = useCallback(async () => {
    try {
      const allMeetings = await api.adminGetMeetings();
      setMeetings(allMeetings || []);
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

  // Filter only rescheduled & reschedule_requested
  const rescheduleList = useMemo(() => {
    return meetings.filter(m => m.status === 'rescheduled' || m.status === 'reschedule_requested');
  }, [meetings]);

  const filteredReschedules = useMemo(() => {
    return rescheduleList.filter(m => {
      const matchesSearch = 
        m.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.client_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.title?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = 
        statusFilter === 'all' || m.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [rescheduleList, searchQuery, statusFilter]);

  // Stats calculations
  const totalRescheduled = rescheduleList.filter(m => m.status === 'rescheduled').length;
  const pendingRequests = rescheduleList.filter(m => m.status === 'reschedule_requested').length;

  return (
    <Layout title="Rescheduled Meetings">
      <AnimatePresence>
        {selectedMeeting && (
          <BookingModal meeting={selectedMeeting} onClose={() => setSelectedMeeting(null)} onAction={handleAction} />
        )}
      </AnimatePresence>

      <div style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: '-10%', left: '20%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(249, 115, 22, 0.04) 0%, transparent 65%)', borderRadius: '50%', filter: 'blur(80px)', pointerEvents: 'none', zIndex: 0 }} />

        {/* Page Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>Reschedules</h1>
            <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, marginBottom: 0 }}>Manage confirmed rescheduled bookings and incoming client reschedule request tickets.</p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="layout-grid grid-cols-2" style={{ marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <StatCard icon="update" label="Rescheduled Confirmed" value={totalRescheduled} color="var(--color-accent-orange)" delay={0} />
          <StatCard icon="pending_actions" label="Pending Reschedule Requests" value={pendingRequests} color="var(--color-amber)" delay={0.05} />
        </div>

        {/* Filter Controls Row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20, position: 'relative', zIndex: 1 }}>
          {/* Search bar */}
          <div style={{ position: 'relative', width: '100%', maxWidth: 300 }}>
            <span className="material-symbols-outlined" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)', fontSize: 20 }}>search</span>
            <input 
              type="text" 
              className="input-premium" 
              placeholder="Search reschedules..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ width: '100%', padding: '10px 12px 10px 40px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Status filter tabs */}
          <div style={{ display: 'flex', gap: 6, background: 'rgba(255,255,255,0.02)', padding: 4, borderRadius: 12, border: '1px solid var(--color-border)' }}>
            {['all', 'rescheduled', 'reschedule_requested'].map(f => {
              const isActive = statusFilter === f;
              const label = f === 'reschedule_requested' ? 'Pending Requests' : f === 'rescheduled' ? 'Confirmed' : 'All';
              return (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
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
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        <motion.div 
          initial={{ opacity: 0, y: 16 }} 
          animate={{ opacity: 1, y: 0 }} 
          transition={{ delay: 0.2 }}
          className="glass-premium"
          style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid var(--color-border)', background: 'var(--glass-bg)', position: 'relative', zIndex: 1 }}
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
                ) : filteredReschedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '64px 0', color: 'var(--color-text-muted)', fontSize: 14 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 32, marginBottom: 8, display: 'block', color: 'var(--color-text-muted)' }}>update</span>
                      No rescheduled sessions or requests found.
                    </td>
                  </tr>
                ) : filteredReschedules.map((m) => {
                  const statusColor = STATUS_COLORS[m.status] || 'white';
                  const statusLabel = m.status === 'reschedule_requested' ? 'Pending Request' : 'Rescheduled';
                  return (
                    <tr 
                      key={m.id} 
                      className="admin-table-row"
                      onClick={() => setSelectedMeeting(m)}
                      style={{ 
                        cursor: 'pointer', 
                        borderBottom: '1px solid var(--color-border)', 
                        transition: 'var(--transition-fast)',
                        background: m.client_is_priority ? 'rgba(234, 179, 8, 0.03)' : 'transparent'
                      }}
                    >
                      <td style={{ padding: '16px 20px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ 
                            width: 34, 
                            height: 34, 
                            background: m.client_is_priority ? 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)' : 'linear-gradient(135deg, var(--color-accent) 0%, var(--color-accent-cyan) 100%)', 
                            borderRadius: '50%', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            fontSize: 12, 
                            fontWeight: 800, 
                            color: 'white', 
                            flexShrink: 0,
                            boxShadow: m.client_is_priority ? '0 2px 10px rgba(234, 179, 8, 0.2)' : '0 2px 10px rgba(59, 130, 246, 0.2)'
                          }}>
                            {m.client_name?.charAt(0) || '?'}
                          </div>
                          <div>
                            <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                              {m.client_name}
                              {m.client_is_priority && (
                                <span style={{ fontSize: 8.5, padding: '1px 5px', background: 'rgba(234, 179, 8, 0.1)', color: '#eab308', border: '1px solid rgba(234, 179, 8, 0.15)', borderRadius: 4, fontWeight: 800, fontFamily: 'var(--font-mono)' }}>⭐ PRIORITY</span>
                              )}
                            </p>
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
                        <span className={`badge-priority badge-priority-${m.priority || 'medium'}`}>
                          {m.priority || 'medium'}
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
                          {statusLabel}
                        </span>
                      </td>
                      <td style={{ padding: '16px 20px', textAlign: 'right' }} onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="btn-premium btn-premium-primary" 
                          onClick={() => setSelectedMeeting(m)}
                          style={{ padding: '6px 12px', fontSize: 12, borderRadius: 8 }}
                        >
                          {m.status === 'reschedule_requested' ? 'Review' : 'Details'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <style>{`
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
        .badge-priority-medium {
          background: rgba(59, 130, 246, 0.1);
          color: var(--color-accent);
          border: 1px solid rgba(59, 130, 246, 0.15);
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
