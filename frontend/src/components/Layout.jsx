import React, { useState } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../lib/auth';

export default function Layout({ children, notifCount = 0 }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { isAdmin } = useAuth();

  return (
    <div className={`page-wrapper ${isSidebarOpen ? 'sidebar-active' : ''}`}>
      {/* Mobile Header */}
      <header className="mobile-header">
        <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => setIsSidebarOpen(true)} style={{ marginLeft: -8 }}>
            <span className="material-symbols-outlined">menu</span>
          </button>
        </div>
        
        <div style={{ position: 'absolute', left: '50%', transform: 'translateX(-50%)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'linear-gradient(135deg, #6C63FF, #00C2FF)' }} />
          <span style={{ fontWeight: 800, fontSize: 16, letterSpacing: '-0.3px', color: 'var(--color-text-primary)' }}>SISU</span>
        </div>

        <div style={{ flex: 1, display: 'flex', justifyContent: 'flex-end' }}>
          {/* Potential right-side icons like notifications could go here */}
        </div>
      </header>

      <Sidebar 
        active={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        notifCount={notifCount}
      />

      <div style={{ flex: 1, minWidth: 0 }}>
        {children}
      </div>
    </div>
  );
}
