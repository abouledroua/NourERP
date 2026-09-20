import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Users, 
  BookOpen, 
  CalendarDays, 
  Award, 
  Clock, 
  Wallet, 
  ShoppingBag, 
  ShieldCheck, 
  Settings,
  LogOut,
  X
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';

export default function Sidebar({ isOpen, onClose }) {
  const { t, isRTL } = useLanguage();
  const { logout, user } = useAuth();

  const navSections = [
    {
      title: t('nav.section_main'),
      items: [
        { to: '/', icon: LayoutDashboard, label: t('nav.dashboard') }
      ]
    },
    {
      title: t('nav.section_academic'),
      items: [
        { to: '/students', icon: GraduationCap, label: t('nav.students') },
        { to: '/classes', icon: Users, label: t('nav.classes') },
        { to: '/teachers', icon: BookOpen, label: t('nav.teachers') },
        { to: '/attendance', icon: Clock, label: t('nav.attendance') },
        { to: '/timetable', icon: CalendarDays, label: t('nav.timetable') },
        { to: '/grades', icon: Award, label: t('nav.grades') }
      ]
    },
    {
      title: t('nav.section_finance'),
      items: [
        { to: '/finance', icon: Wallet, label: t('nav.finance') },
        { to: '/inventory', icon: ShoppingBag, label: t('nav.inventory') }
      ]
    },
    {
      title: t('nav.section_system'),
      items: [
        { to: '/audit-logs', icon: ShieldCheck, label: t('nav.audit_logs') },
        { to: '/settings', icon: Settings, label: t('nav.settings') }
      ]
    }
  ];

  const sidebarContent = (
    <div className="h-full flex flex-col bg-navy-900 text-slate-100 w-72 select-none">
      {/* Brand Header */}
      <div className="h-20 flex items-center justify-between px-6 border-b border-navy-800/80 bg-navy-950/40">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white font-black text-xl flex-shrink-0">
            ن
          </div>
          <div className="overflow-hidden">
            <h1 className="font-extrabold text-base leading-tight text-white flex items-center gap-1.5 truncate">
              {t('app_name')}
            </h1>
            <p className="text-xs text-slate-400 truncate">{t('app_subtitle')}</p>
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg md:hidden"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation Items with Categorized Sections & Dividers */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {navSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            {section.title && (
              <div className="px-3 pt-1 pb-1 text-[11px] font-bold text-slate-400/80 tracking-wider uppercase flex items-center justify-between">
                <span>{section.title}</span>
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => onClose && onClose()}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-medium transition-all duration-200
                      ${isActive 
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-md shadow-emerald-900/40 font-semibold' 
                        : 'text-slate-300 hover:text-white hover:bg-navy-800/70'}
                    `}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0 opacity-90" />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
            {idx < navSections.length - 1 && (
              <div className="pt-2">
                <div className="border-t border-navy-800/80 mx-2" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* User Card & Logout */}
      <div className="p-4 border-t border-navy-800/80 bg-navy-950/30">
        <div className="flex items-center justify-between mb-1 px-1">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold text-white uppercase border border-slate-600 flex-shrink-0">
              {user?.full_name ? user.full_name[0] : 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-bold text-slate-200 truncate">{user?.full_name || t('common.user')}</p>
              <p className="text-[10px] text-emerald-400 font-medium truncate">{user?.role ? t(`roles.${user.role}`, user.role) : ''}</p>
            </div>
          </div>
          <button
            onClick={logout}
            title={t('nav.logout')}
            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Drawer with Backdrop */}
      <div className={`fixed inset-0 z-50 md:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
          onClick={onClose}
        />
        <aside className={`
          fixed top-0 bottom-0 z-50 w-72 transition-transform duration-300 shadow-2xl
          ${isRTL ? 'right-0' : 'left-0'}
          ${isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')}
        `}>
          {sidebarContent}
        </aside>
      </div>

      {/* Desktop Sticky Sidebar (Always visible on md: screens and above) */}
      <aside className="hidden md:flex flex-col h-screen sticky top-0 shrink-0 z-30 shadow-xl border-slate-800">
        {sidebarContent}
      </aside>
    </>
  );
}
