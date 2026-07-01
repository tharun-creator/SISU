import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import MobileNav from './MobileNav';

interface AppLayoutProps {
  children: React.ReactNode;
  title?: string;
  notifCount?: number;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children, title, notifCount = 0 }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Sidebar - responsive side-drawer */}
      <Sidebar 
        isOpen={isSidebarOpen} 
        onClose={() => setIsSidebarOpen(false)} 
        notifCount={notifCount}
      />

      {/* Main Workspace Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header */}
        <Header 
          title={title}
          notifCount={notifCount}
          onMenuToggle={() => setIsSidebarOpen(true)}
        />

        {/* Content Wrapper */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-20 sm:p-6 lg:p-8 lg:pb-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>

        {/* Bottom Mobile Navigation */}
        <MobileNav />
      </div>
    </div>
  );
};
export default AppLayout;
