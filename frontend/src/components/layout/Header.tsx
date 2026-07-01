import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

interface HeaderProps {
  title?: string;
  notifCount?: number;
  onMenuToggle: () => void;
}

export const Header: React.FC<HeaderProps> = ({ title = 'Mentorship Planner', notifCount = 0, onMenuToggle }) => {
  const { logout } = useAuth();

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8">
      {/* Left side: Hamburger + Title */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuToggle}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-2xl">menu</span>
        </button>
        <h2 className="font-heading text-lg font-bold tracking-tight text-slate-800">
          {title}
        </h2>
      </div>

      {/* Right side: Action items */}
      <div className="flex items-center gap-4">
        {/* Notification Icon */}
        <Link
          to="/notifications"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          aria-label="View notifications"
        >
          <span className="material-symbols-outlined text-2xl">notifications</span>
          {notifCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white" />
          )}
        </Link>

        {/* Divider */}
        <span className="h-6 w-px bg-slate-200" aria-hidden="true" />

        {/* Logout Button */}
        <button
          onClick={logout}
          className="flex items-center gap-2 rounded-xl bg-slate-50 hover:bg-rose-50 px-3 py-2 font-body text-sm font-semibold text-slate-600 hover:text-rose-600 transition-all border border-slate-100"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className="hidden sm:inline">Sign Out</span>
        </button>
      </div>
    </header>
  );
};
export default Header;
