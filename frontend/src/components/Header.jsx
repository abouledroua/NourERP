import React from 'react';
import { Menu, Laptop, Calendar, LogOut, User as UserIcon } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

export default function Header({ onMenuClick }) {
  const { lang, setLang, isRTL, t } = useLanguage();
  const { user, logout, workstationName } = useAuth();
  const { settings, activeYear, activeTerm } = useSettings();

  const getRoleLabel = (role) => {
    if (!role) return '';
    return t(`roles.${role}`, role);
  };

  return (
    <header className="h-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between shadow-xs">
      {/* Left: Mobile menu button & School branding title */}
      <div className="flex items-center gap-3 sm:gap-4">
        <button
          onClick={onMenuClick}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl md:hidden transition-colors"
          title="Menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        <div>
          <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
            {isRTL ? settings.school_name_ar : (lang === 'fr' ? (settings.school_name_fr || settings.school_name_ar) : (settings.school_name_en || settings.school_name_ar))}
          </h2>
          <p className="text-[11px] text-slate-500 hidden sm:flex items-center gap-1.5 mt-0.5">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            {t('app_subtitle')}
          </p>
        </div>
      </div>

      {/* Right side items */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Active Academic Term Badge */}
        {activeYear && (
          <div className="hidden xl:flex items-center gap-2 px-3 py-1.5 bg-slate-100/90 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200/60">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>{activeYear.name}</span>
            {activeTerm && <span className="text-slate-400">| {activeTerm.name.split('/')[0]}</span>}
          </div>
        )}

        {/* Workstation Badge */}
        {workstationName && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-medium border border-emerald-200/60">
            <Laptop className="w-3.5 h-3.5 text-emerald-600" />
            <span className="truncate max-w-[130px]">{workstationName}</span>
          </div>
        )}

        {/* Multilingual Selector Toggle (AR / FR / EN) */}
        <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200 text-xs font-bold">
          <button
            onClick={() => setLang('ar')}
            className={`px-2 py-1 rounded-xl transition-all ${
              lang === 'ar' ? 'bg-white text-emerald-700 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            العربية
          </button>
          <button
            onClick={() => setLang('fr')}
            className={`px-2 py-1 rounded-xl transition-all ${
              lang === 'fr' ? 'bg-white text-emerald-700 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            FR
          </button>
          <button
            onClick={() => setLang('en')}
            className={`px-2 py-1 rounded-xl transition-all ${
              lang === 'en' ? 'bg-white text-emerald-700 shadow-xs font-extrabold' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            EN
          </button>
        </div>

        {/* Divider */}
        <div className="h-7 w-[1px] bg-slate-200 mx-0.5 sm:mx-1" />

        {/* User Profile Info Badge */}
        <div className="flex items-center gap-2.5 px-2 py-1 rounded-2xl hover:bg-slate-50 transition-colors">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-black text-sm shadow-sm flex-shrink-0">
            {user?.full_name ? user.full_name[0] : (user?.username ? user.username[0].toUpperCase() : 'U')}
          </div>
          <div className="hidden sm:block text-start leading-tight">
            <div className="text-xs font-bold text-slate-800 truncate max-w-[140px]">
              {user?.full_name || user?.username || t('common.user')}
            </div>
            <div className="text-[10px] font-semibold text-emerald-600 truncate">
              {getRoleLabel(user?.role)}
            </div>
          </div>
        </div>

        {/* Distinct Logout Button */}
        <button
          onClick={logout}
          title={t('nav.logout')}
          className="flex items-center gap-1.5 px-3 py-2 text-slate-600 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 rounded-2xl text-xs font-bold transition-all shadow-2xs"
        >
          <LogOut className="w-4 h-4 text-rose-500" />
          <span className="hidden md:inline">{t('nav.logout')}</span>
        </button>
      </div>
    </header>
  );
}
