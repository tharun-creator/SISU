import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

export const MobileNav: React.FC = () => {
  const { isAdmin } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const navItems = isAdmin 
    ? [
        { icon: 'grid_view', label: 'Dashboard', path: '/admin' },
        { icon: 'calendar_month', label: 'Slots', path: '/admin/calendar-slots' },
        { icon: 'event_available', label: 'Booked', path: '/admin/slots-booked' },
        { icon: 'pending_actions', label: 'Pending', path: '/admin/pending' },
      ]
    : [
        { icon: 'grid_view', label: 'Dashboard', path: '/' },
        { icon: 'calendar_today', label: 'Schedule', path: '/book' },
        { icon: 'description', label: 'Notebook', path: '/notebook' },
      ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 block bg-white/95 border-t border-slate-200 backdrop-blur-md lg:hidden px-2 pb-safe shadow-lg">
      <div className="flex h-16 items-center justify-around">
        {navItems.map((item) => {
          const isActive = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path));
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center w-16 h-full gap-1 transition-all ${
                isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <span className={`material-symbols-outlined text-xl transition-transform ${
                isActive ? 'scale-110 font-semibold' : ''
              }`}>
                {item.icon}
              </span>
              <span className="text-[10px] font-semibold font-body tracking-tight leading-none">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
export default MobileNav;
