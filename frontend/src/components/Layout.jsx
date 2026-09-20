import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useLanguage } from '../context/LanguageContext';

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isRTL } = useLanguage();

  return (
    <div className="min-h-screen w-full bg-slate-50 flex">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        <Header onMenuClick={() => setSidebarOpen(prev => !prev)} />
        <main className="flex-1 p-4 md:p-6 lg:p-8 w-full">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
