import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDistanceToNow, parseISO } from 'date-fns';

const TYPE_CONFIG = {
  booking_received: { icon: 'calendar_today', color: '#6C63FF' },
  approved:         { icon: 'check_circle', color: '#10b981' },
  rejected:         { icon: 'close', color: '#ef4444' },
  rescheduled:      { icon: 'update', color: '#fb923c' },
  cancelled:        { icon: 'close', color: '#6b7280' },
  reminder:         { icon: 'schedule', color: '#f59e0b' },
};

export default function NotificationsPage() {
  const { user, logout } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
  }, []);

  const handleMarkRead = async (id) => {
    await api.markRead(id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const handleMarkAll = async () => {
    await api.markAllRead();
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div style={{ background: '#070B14', minHeight: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", color: '#F8FAFC' }}>
      
      {/* ── STUNNING TOP NAVIGATION NAVBAR ─────────────────────────────────── */}
      <nav style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,0.06)', background: '#070B14', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #5B5FFF, #00C2FF)', boxShadow: '0 0 12px #5B5FFF' }} />
          <a href="/" style={{ fontSize: 16, fontWeight: 900, letterSpacing: '-0.3px', color: 'white', textDecoration: 'none' }}>SISU</a>
          <span style={{ fontSize: 9, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1.2px', marginLeft: 6, fontWeight: 700 }}>Concierge Cockpit</span>
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <a href="/" style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 600, textDecoration: 'none', background: 'rgba(255,255,255,0.03)', color: 'white', border: '1px solid rgba(255,255,255,0.06)' }}>
            ← Back to Dashboard
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 28, height: 28, background: 'linear-gradient(135deg, #5B5FFF, #00C2FF)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 800 }}>
              {user?.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <span style={{ fontSize: 13, fontWeight: 500, color: '#E2E8F0' }}>{user?.name || 'User'}</span>
          </div>

          <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)' }} />

          <button onClick={logout} style={{ background: 'none', border: 'none', color: '#64748B', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', fontSize: 13, padding: 0 }}>
            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span> Sign Out
          </button>
        </div>
      </nav>

      {/* Ambient glass background layer */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
        <div style={{ position: 'absolute', top: '10%', left: '30%', width: 400, height: 400, background: 'rgba(91,95,255,0.05)', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0 }} />
        <div style={{ position: 'absolute', bottom: '15%', right: '25%', width: 350, height: 350, background: 'rgba(0,194,255,0.03)', borderRadius: '50%', filter: 'blur(80px)', zIndex: 0 }} />

        {/* Unified notifications card deck */}
        <div style={{ width: '100%', maxWidth: 640, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: 'white', margin: 0 }}>Notifications Ledger</h2>
              <p style={{ fontSize: 13, color: '#94A3B8', marginTop: 4, marginBottom: 0 }}>
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''} awaiting review.` : 'Your executive schedule is fully up-to-date.'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: 'rgba(255,255,255,0.03)', color: '#F8FAFC', border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'all 0.2s' }}
              >
                Mark All Read
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ padding: 20, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 14 }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div className="skeleton" style={{ width: 42, height: 42, borderRadius: 12 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton" style={{ height: 14, width: '40%', marginBottom: 10 }} />
                      <div className="skeleton" style={{ height: 12, width: '70%' }} />
                    </div>
                  </div>
                </div>
              ))
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: '#64748B', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: 16 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 44, marginBottom: 12, color: '#64748B' }}>notifications_off</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'white', marginBottom: 4 }}>No notifications found</p>
                <p style={{ fontSize: 12 }}>We will coordinate slot confirmations and reschedule approvals here.</p>
              </div>
            ) : (
              <AnimatePresence>
                {notifications.map((n, i) => {
                  const cfg = TYPE_CONFIG[n.type] || { icon: 'notifications', color: '#5B5FFF' };
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                      style={{
                        padding: 18,
                        background: n.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(91,95,255,0.03)',
                        border: `1px solid ${n.is_read ? 'rgba(255,255,255,0.04)' : 'rgba(91,95,255,0.1)'}`,
                        borderRadius: 14,
                        display: 'flex',
                        gap: 14,
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'all 0.2s'
                      }}
                    >
                      {!n.is_read && (
                        <div style={{ position: 'absolute', top: 18, right: 18, width: 6, height: 6, borderRadius: '50%', background: cfg.color }} />
                      )}
                      
                      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${cfg.color}15`, border: `1px solid ${cfg.color}25`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 20, color: cfg.color }}>{cfg.icon}</span>
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13.5, fontWeight: n.is_read ? 600 : 800, color: 'white', margin: 0 }}>{n.title}</p>
                        <p style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 4, marginBottom: 8, lineHeight: 1.5 }}>{n.message}</p>
                        <p style={{ fontSize: 10, color: '#64748B', margin: 0 }}>
                          {n.created_at ? formatDistanceToNow(parseISO(n.created_at), { addSuffix: true }) : ''}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>

        </div>
      </div>

      <style>{`
        .skeleton {
          background: linear-gradient(90deg, rgba(255,255,255,0.02) 25%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.02) 75%);
          background-size: 200% 100%;
          animation: loading-shimmer 1.5s infinite;
        }

        @keyframes loading-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
