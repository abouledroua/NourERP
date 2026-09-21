import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLanguage } from '../context/LanguageContext';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopSidebarVisible, setIsDesktopSidebarVisible] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(288);
  const { isRTL } = useLanguage();

  const handleMenuClick = () => {
    if (window.innerWidth < 768) {
      setSidebarOpen(prev => !prev);
    } else {
      setIsDesktopSidebarVisible(prev => !prev);
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={() => setSidebarOpen(false)} 
        isDesktopVisible={isDesktopSidebarVisible}
        width={sidebarWidth}
        setWidth={setSidebarWidth}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
        <Header onMenuClick={handleMenuClick} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
