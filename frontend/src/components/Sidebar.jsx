import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../lib/auth.jsx';

const clientNav = [
  { icon: 'grid_view', label: 'Dashboard', path: '/' },
  { icon: 'calendar_today', label: 'Book Meeting', path: '/book' },
  { icon: 'notifications', label: 'Notifications', path: '/notifications' },
  { icon: 'settings', label: 'Settings', path: '/settings' },
];

const adminNav = [
  { icon: 'grid_view', label: 'Dashboard', path: '/admin' },
  { icon: 'calendar_today', label: 'All Meetings', path: '/admin/meetings' },
  { icon: 'pending_actions', label: 'Pending', path: '/admin/pending' },
  { icon: 'notifications', label: 'Notifications', path: '/notifications' },
  { icon: 'settings', label: 'Settings', path: '/settings' },
];

export default function Sidebar({ notifCount = 0, active, onClose }) {
  const { user, logout, isAdmin } = useAuth();
  const navItems = isAdmin ? adminNav : clientNav;
  const currentPath = window.location.pathname;

  return (
    <>
      {/* Sidebar Overlay (Mobile) */}
      <div className={`sidebar-overlay ${active ? 'active' : ''}`} onClick={onClose} />

      <motion.aside
        className={active ? 'active' : ''}
        style={{
          position: 'fixed',
          top: 0, left: 0, bottom: 0,
          width: 260,
          background: '#FFFFFF',
          borderRight: '1px solid var(--color-border)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 70,
          padding: '0 12px 24px',
        }}
      >
        {/* Logo & Mobile Close */}
        <div style={{ padding: '20px 12px 16px', borderBottom: '1px solid var(--color-border)', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span style={{ display: 'inline-block', fontSize: 24, fontWeight: 800, letterSpacing: '-0.3px', background: 'linear-gradient(135deg, #6C63FF, #00C2FF)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', color: '#6C63FF' }}>SISU</span>
            <p style={{ fontSize: 10, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 1 }}>{isAdmin ? 'Executive' : 'Portal'}</p>
          </div>
          <button className="btn btn-ghost btn-icon mobile-only" onClick={onClose} style={{ display: 'none' }}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* CSS for mobile only close button */}
        <style>{`
          @media (max-width: 1024px) {
            .mobile-only { display: flex !important; }
          }
        `}</style>

      {/* Role badge */}
      {isAdmin && (
        <div style={{ margin: '8px 4px 4px', padding: '6px 12px', background: 'rgba(108, 99, 255, 0.08)', border: '1px solid rgba(108, 99, 255, 0.15)', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6C63FF' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6C63FF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Admin Control</span>
        </div>
      )}

      {/* Nav */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, marginTop: 12 }}>
        {navItems.map((item) => {
          const isActive = currentPath === item.path || (item.path !== '/' && item.path !== '/admin' && currentPath.startsWith(item.path));
          return (
            <a
              key={item.path}
              href={item.path}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                borderRadius: 10,
                textDecoration: 'none',
                transition: 'var(--transition)',
                background: isActive ? 'rgba(108, 99, 255, 0.1)' : 'transparent',
                border: isActive ? '1px solid rgba(108, 99, 255, 0.15)' : '1px solid transparent',
                position: 'relative',
              }}
              onMouseEnter={(e) => { if (!isActive) { e.currentTarget.style.background = 'rgba(0,0,0,0.03)'; e.currentTarget.style.borderColor = 'var(--color-border)'; }}}
              onMouseLeave={(e) => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 20, flexShrink: 0, color: isActive ? '#6C63FF' : 'var(--color-text-secondary)' }}>
                {item.icon}
              </span>
              <span style={{ fontSize: 14, fontWeight: isActive ? 600 : 500, color: isActive ? '#6C63FF' : 'var(--color-text-secondary)', transition: 'var(--transition)' }}>
                {item.label}
              </span>
              {item.label === 'Notifications' && notifCount > 0 && (
                <span style={{ marginLeft: 'auto', background: '#6366f1', color: 'white', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100, minWidth: 18, textAlign: 'center' }}>
                  {notifCount > 99 ? '99+' : notifCount}
                </span>
              )}
              {isActive && (
                <motion.div
                  layoutId="activeIndicator"
                  style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, background: '#6C63FF', borderRadius: '0 3px 3px 0' }}
                />
              )}
            </a>
          );
        })}
      </nav>

      {/* User info */}
      <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: 16, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 12, background: '#FAFAFA', border: '1px solid var(--color-border)', marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6C63FF, #00C2FF)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14, fontWeight: 700, color: 'white' }}>
            {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name || 'User'}</p>
            <p style={{ fontSize: 11, color: 'var(--color-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email}</p>
          </div>
        </div>
        <button
          id="sidebar-logout"
          className="btn btn-ghost"
          onClick={logout}
          style={{ width: '100%', justifyContent: 'center', gap: 8, color: 'var(--color-text-muted)', fontSize: 13 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span> Sign Out
        </button>
      </div>
      </motion.aside>
    </>
  );
}
