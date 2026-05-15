import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from '../components/Sidebar';
import Layout from '../components/Layout';
import { api } from '../lib/api';
import { format, parseISO, formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  booking_received: { icon: 'calendar_today', color: '#6C63FF' },
  approved:         { icon: 'check_circle', color: '#10b981' },
  rejected:         { icon: 'close', color: '#ef4444' },
  rescheduled:      { icon: 'update', color: '#fb923c' },
  cancelled:        { icon: 'close', color: '#6b7280' },
  reminder:         { icon: 'schedule', color: '#f59e0b' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchNotifs = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchNotifs(); }, []);

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
    <Layout notifCount={unreadCount}>
      <main className="main-content" style={{ marginTop: 0 }}>
        <div className="ambient-bg" />
        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h1 className="page-title">Notifications</h1>
              <p className="page-subtitle">{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'All caught up!'}</p>
            </div>
            {unreadCount > 0 && (
              <button className="btn btn-secondary btn-sm" onClick={handleMarkAll}>Mark all as read</button>
            )}
          </div>

          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} style={{ padding: 20, background: 'rgba(255,255,255,0.03)', border: '1px solid var(--color-border)', borderRadius: 14, marginBottom: 12 }}>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '50%', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skeleton" style={{ height: 14, width: '60%', marginBottom: 8 }} />
                    <div className="skeleton" style={{ height: 12, width: '80%' }} />
                  </div>
                </div>
              </div>
            ))
          ) : notifications.length === 0 ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ textAlign: 'center', padding: '80px 20px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 64, marginBottom: 16, color: 'var(--color-text-muted)' }}>notifications_off</span>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>No notifications yet</h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 14 }}>We'll notify you about meeting updates and status changes here.</p>
            </motion.div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <AnimatePresence>
                {notifications.map((n, i) => {
                  const cfg = TYPE_CONFIG[n.type] || { icon: '📌', color: '#818cf8' };
                  return (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                      style={{
                        padding: 18,
                        background: n.is_read ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${n.is_read ? 'var(--color-border)' : `${cfg.color}30`}`,
                        borderRadius: 14,
                        display: 'flex',
                        gap: 14,
                        cursor: 'pointer',
                        transition: 'var(--transition)',
                        position: 'relative',
                      }}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                    >
                      {!n.is_read && (
                        <div style={{ position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: '50%', background: cfg.color }} />
                      )}
                      <div style={{ width: 42, height: 42, borderRadius: 12, background: `${cfg.color}18`, border: `1px solid ${cfg.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <span className="material-symbols-outlined" style={{ fontSize: 22, color: cfg.color }}>{cfg.icon}</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 14, fontWeight: n.is_read ? 500 : 700, marginBottom: 4 }}>{n.title}</p>
                        <p style={{ fontSize: 13, color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: 8 }}>{n.message}</p>
                        <p style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>
                          {n.created_at ? formatDistanceToNow(parseISO(n.created_at), { addSuffix: true }) : ''}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      </main>
    </Layout>
  );
}
