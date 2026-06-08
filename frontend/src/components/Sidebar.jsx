import React from 'react';
import { useAuth } from '../lib/auth.jsx';

const clientNav = [
  { icon: 'grid_view', label: 'Dashboard', path: '/' },
  { icon: 'calendar_today', label: 'Book Meeting', path: '/book' },
  { icon: 'notifications', label: 'Notifications', path: '/notifications' },
  { icon: 'settings', label: 'Settings', path: '/settings' },
];

const adminNav = [
  { icon: 'grid_view', label: 'Dashboard', path: '/admin' },
  { icon: 'calendar_month', label: 'Calendar Slots', path: '/admin/calendar-slots' },
  { icon: 'event_available', label: 'Slots Booked', path: '/admin/slots-booked' },
  { icon: 'pending_actions', label: 'Pending Requests', path: '/admin/pending' },
  { icon: 'update', label: 'Rescheduled', path: '/admin/rescheduled' },
  { icon: 'admin_panel_settings', label: 'Manage Users', path: '/admin/users' },
  { icon: 'notifications', label: 'Notifications', path: '/notifications' },
  { icon: 'settings', label: 'Settings', path: '/settings' },
];

export default function Sidebar({ notifCount = 0, active, onClose }) {
  const { logout, isAdmin, user } = useAuth();
  const navItems = isAdmin ? adminNav : clientNav;
  const currentPath = window.location.pathname;

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
            const isActive = currentPath === item.path || (item.path !== '/' && item.path !== '/admin' && currentPath.startsWith(item.path));
            return (
              <a
                key={item.path}
                href={item.path}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
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
              </a>
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
