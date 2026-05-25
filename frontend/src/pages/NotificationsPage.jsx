import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { formatDistanceToNow, parseISO } from 'date-fns';
import Layout from '../components/Layout';

const TYPE_CONFIG = {
  booking_received: { icon: 'calendar_today', color: 'var(--color-accent)' },
  approved:         { icon: 'check_circle', color: 'var(--color-green)' },
  rejected:         { icon: 'close', color: 'var(--color-red)' },
  rescheduled:      { icon: 'update', color: 'var(--color-accent-orange)' },
  cancelled:        { icon: 'close', color: 'var(--color-text-muted)' },
  reminder:         { icon: 'schedule', color: 'var(--color-amber)' },
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
    <Layout title="Notifications" notifCount={unreadCount}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', padding: '10px 0' }}>
        <div style={{ position: 'absolute', top: '10%', left: '30%', width: 400, height: 400, background: 'rgba(59,130,255,0.03)', borderRadius: '50%', filter: 'blur(100px)', zIndex: 0 }} />

        {/* Unified notifications card deck */}
        <div style={{ width: '100%', maxWidth: 640, position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-border)', paddingBottom: 16 }}>
            <div>
              <h2 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>Notifications Ledger</h2>
              <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', marginTop: 4, marginBottom: 0 }}>
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''} awaiting review.` : 'Your executive schedule is fully up-to-date.'}
              </p>
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAll}
                className="btn-premium btn-premium-secondary"
                style={{ padding: '8px 16px', fontSize: 12 }}
              >
                Mark All Read
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="glass-premium" style={{ padding: 20 }}>
                  <div style={{ display: 'flex', gap: 14 }}>
                    <div className="skeleton-pulse" style={{ width: 40, height: 40, borderRadius: 10 }} />
                    <div style={{ flex: 1 }}>
                      <div className="skeleton-pulse" style={{ height: 14, width: '40%', marginBottom: 10 }} />
                      <div className="skeleton-pulse" style={{ height: 12, width: '70%' }} />
                    </div>
                  </div>
                </div>
              ))
            ) : notifications.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '80px 20px', color: 'var(--color-text-muted)', border: '1px dashed var(--color-border)', borderRadius: 16 }}>
                <span className="material-symbols-outlined" style={{ fontSize: 44, marginBottom: 12, color: 'var(--color-text-muted)' }}>notifications_off</span>
                <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: 4 }}>No notifications found</p>
                <p style={{ fontSize: 12 }}>We will coordinate slot confirmations and reschedule approvals here.</p>
              </div>
            ) : (
              <AnimatePresence>
                {notifications.map((n, i) => {
                  const cfg = TYPE_CONFIG[n.type] || { icon: 'notifications', color: 'var(--color-accent)' };
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                      className="glow-card"
                      style={{
                        padding: 18,
                        background: n.is_read ? 'rgba(255,255,255,0.01)' : 'rgba(59, 130, 246, 0.03)',
                        border: `1px solid ${n.is_read ? 'var(--color-border)' : 'rgba(59, 130, 246, 0.15)'}`,
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
                        <p style={{ fontSize: 13.5, fontWeight: n.is_read ? 600 : 800, color: 'var(--color-text-primary)', margin: 0, fontFamily: 'var(--font-heading)' }}>{n.title}</p>
                        <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', marginTop: 4, marginBottom: 8, lineHeight: 1.5 }}>{n.message}</p>
                        <p style={{ fontSize: 10, color: 'var(--color-text-muted)', margin: 0, fontFamily: 'var(--font-mono)' }}>
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
    </Layout>
  );
}
