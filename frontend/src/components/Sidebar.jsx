import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../lib/auth.jsx';
import { api } from '../constants/api';

const clientNav = [
  { icon: 'grid_view', label: 'Dashboard', path: '/' },
  { icon: 'calendar_today', label: 'Schedule', path: '/?view=book' },
  { icon: 'description', label: 'Notebook', path: '/notebook' },
  { icon: 'receipt_long', label: 'Invoices', path: '/invoices' },
  { icon: 'settings', label: 'Settings', path: '/?view=settings' },
];

const adminNav = [
  { icon: 'grid_view', label: 'Dashboard', path: '/admin' },
  { icon: 'receipt_long', label: 'Manage Invoices', path: '/admin/invoices' },
  { icon: 'calendar_month', label: 'Calendar Slots', path: '/admin/calendar-slots' },
  { icon: 'event_available', label: 'Slots Booked', path: '/admin/slots-booked' },
  { icon: 'inbox', label: 'Inbox', path: '/admin/pending' },
  { icon: 'update', label: 'Rescheduled', path: '/admin/rescheduled' },
  { icon: 'admin_panel_settings', label: 'Manage Users', path: '/admin/users' },
  { icon: 'settings', label: 'Settings', path: '/?view=settings' },
];


export default function Sidebar({ notifCount = 0, active, onClose }) {
  const { logout, isAdmin, user } = useAuth();
  const navItems = isAdmin ? adminNav : clientNav;
  const currentPath = window.location.pathname;

  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchInboxCount = async () => {
      try {
        const all = await api.adminGetMeetings();
        if (all && Array.isArray(all)) {
          const count = all.filter(m => m.status === 'pending' || m.status === 'reschedule_requested').length;
          setInboxCount(count);
        }
      } catch (err) {
        console.error('Failed to fetch inbox count:', err);
      }
    };
    fetchInboxCount();
    const interval = setInterval(fetchInboxCount, 30000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  return (
    <>
      {/* Backdrop for mobile drawer toggle */}
      {active && (
        <div className="sidebar-drawer-backdrop" onClick={onClose} />
      )}

      {/* Sisu Sidebar */}
      <aside className={`sisu-sidebar ${active ? 'open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="sidebar-logo">SISU</h1>
            <p className="sidebar-subtitle">{isAdmin ? 'EXECUTIVE PORTAL' : 'ELITE MENTORSHIP'}</p>
          </div>
          <button className="sidebar-toggle-btn mobile-only" onClick={onClose} style={{ display: 'none', border: 'none', background: 'none', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* CSS helper for closing in mobile */}
        <style>{`
          .mobile-only { display: none; }
          @media (max-width: 1024px) {
            .mobile-only { display: block !important; }
          }
        `}</style>

        {/* Role badge for Admin */}
        {isAdmin && (
          <div style={{ margin: '0 24px 20px 24px', padding: '6px 12px', background: 'rgba(26, 107, 74, 0.08)', border: '1px solid rgba(26, 107, 74, 0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-accent)' }} />
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'var(--font-mono)' }}>Admin Control</span>
          </div>
        )}

        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const currentFullPath = currentPath + window.location.search;
            const isActive = (item.path.includes('?') 
              ? currentFullPath === item.path 
              : currentPath === item.path) || 
              (item.path !== '/' && item.path !== '/admin' && currentPath.startsWith(item.path.split('?')[0]));
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={onClose}
              >
                <span className="material-symbols-outlined">
                  {item.icon}
                </span>
                <span>
                  {item.label}
                </span>
                {item.label === 'Notifications' && notifCount > 0 && (
                  <span style={{ marginLeft: 'auto', background: 'var(--color-accent)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100, minWidth: 18, textAlign: 'center' }}>
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
                {item.label === 'Inbox' && inboxCount > 0 && (
                  <span style={{ marginLeft: 'auto', background: 'var(--color-accent)', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100, minWidth: 18, textAlign: 'center' }}>
                    {inboxCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-card">
            <div className="avatar-box" style={{ fontWeight: 800, fontSize: '13px' }}>
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
            </div>
            <div className="profile-info">
              <p className="profile-name" style={{ textTransform: 'capitalize' }}>{user?.name || 'User'}</p>
              <p className="profile-role" style={{ textTransform: 'uppercase' }}>{user?.job_title || user?.role || 'CLIENT'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
