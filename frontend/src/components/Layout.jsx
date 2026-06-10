import React, { useState } from 'react';
import Sidebar from './Sidebar.jsx';
import { useAuth } from '../lib/auth.jsx';

export default function Layout({ children, title, notifCount = 0 }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { logout } = useAuth();

  return (
    <div className="guided-workspace-container">
      <Sidebar 
        active={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        notifCount={notifCount}
      />

      <div className="main-content-area">
        {/* Unified Premium Header */}
        <header className="main-header glass-premium" style={{ border: 'none', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button className="sidebar-toggle-btn" onClick={() => setIsSidebarOpen(true)}>
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h2 className="header-title" style={{ fontFamily: "var(--font-heading)", letterSpacing: '-0.02em', fontSize: 18 }}>
              {title || 'Mentorship Planner'}
            </h2>
          </div>

          <div className="header-actions">
            <a
              href="/notifications"
              className="header-icon-btn"
              style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 22 }}>notifications</span>
              {notifCount > 0 && <span className="notif-badge" style={{ background: 'var(--color-red)' }} />}
            </a>

            <button onClick={logout} className="signout-btn" style={{ fontFamily: "var(--font-body)", fontWeight: 600 }}>
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>logout</span>
              <span>Sign Out</span>
            </button>
          </div>
        </header>

        {/* Content Wrapper */}
        <main style={{ flex: 1, padding: 'clamp(16px, 3vw, 32px)', overflowY: 'auto', overflowX: 'hidden', position: 'relative' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
