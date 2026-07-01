import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { api } from '../../constants/api';

const clientNav = [
  { icon: 'grid_view', label: 'Dashboard', path: '/' },
  { icon: 'calendar_today', label: 'Schedule Session', path: '/book' },
  { icon: 'description', label: 'Notebook', path: '/notebook' },
  { icon: 'receipt_long', label: 'Invoices', path: '/invoices' },
  { icon: 'history', label: 'Points Note', path: '/session-logs' },
  { icon: 'settings', label: 'Settings', path: '/settings' },
];

const adminNav = [
  { icon: 'grid_view', label: 'Dashboard', path: '/admin' },
  { icon: 'receipt_long', label: 'Manage Invoices', path: '/admin/invoices' },
  { icon: 'calendar_month', label: 'Calendar Slots', path: '/admin/calendar-slots' },
  { icon: 'event_available', label: 'Slots Booked', path: '/admin/slots-booked' },
  { icon: 'inbox', label: 'Inbox', path: '/admin/pending' },
  { icon: 'update', label: 'Rescheduled', path: '/admin/rescheduled' },
  { icon: 'admin_panel_settings', label: 'Manage Users', path: '/admin/users' },
  { icon: 'history', label: 'Points Note', path: '/session-logs' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  notifCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose, notifCount = 0 }) => {
  const { logout, isAdmin, user } = useAuth();
  const location = useLocation();
  const navItems = isAdmin ? adminNav : clientNav;
  const currentPath = location.pathname;

  const [inboxCount, setInboxCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    const fetchInboxCount = async () => {
      try {
        const all = await api.adminGetMeetings();
        if (all && Array.isArray(all)) {
          const count = all.filter((m: any) => m.status === 'pending' || m.status === 'reschedule_requested').length;
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
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-white border-r border-slate-200 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-slate-100">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-heading">SISU</h1>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 font-body">
              {isAdmin ? 'Executive Portal' : 'Elite Mentorship'}
            </p>
          </div>
          <button 
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Role badge for Admin */}
        {isAdmin && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2 text-indigo-700">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-600 animate-pulse" />
            <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
              Admin Control
            </span>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 space-y-1 px-4 py-4 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = currentPath === item.path || (item.path !== '/' && item.path !== '/admin' && currentPath.startsWith(item.path));
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={onClose}
                className={`group flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-100' 
                    : 'text-slate-600 hover:bg-slate-50 hover:text-indigo-600'
                }`}
              >
                <span className={`material-symbols-outlined text-lg transition-transform group-hover:scale-110 ${
                  isActive ? 'text-white' : 'text-slate-400 group-hover:text-indigo-600'
                }`}>
                  {item.icon}
                </span>
                <span className="flex-1 font-body">{item.label}</span>
                {item.label === 'Notifications' && notifCount > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive ? 'bg-white text-indigo-600' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {notifCount > 99 ? '99+' : notifCount}
                  </span>
                )}
                {item.label === 'Inbox' && inboxCount > 0 && (
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isActive ? 'bg-white text-indigo-600' : 'bg-indigo-100 text-indigo-700'
                  }`}>
                    {inboxCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Profile Card */}
        <div className="border-t border-slate-100 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 font-heading text-sm font-bold text-white shadow-sm">
              {user?.name ? user.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() : '??'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-slate-800 capitalize font-heading">{user?.name || 'User'}</p>
              <p className="truncate text-[10px] font-medium text-slate-500 uppercase tracking-wider font-body">{user?.job_title || user?.role || 'Client'}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
export default Sidebar;
