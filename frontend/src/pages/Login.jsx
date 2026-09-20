import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, User, Laptop, Shield, Sparkles, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import DeviceRegistrationModal from '../components/DeviceRegistrationModal';
import { getWorkstationFingerprint } from '../utils/api';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  const [deviceKey, setDeviceKey] = useState('');

  const { login, workstationName } = useAuth();
  const { t, lang, setLang } = useLanguage();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t('login.error_empty'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await login(username, password);
      if (!res.deviceExists) {
        // Device does not exist in db table 'devices' -> Mandatory naming modal
        setDeviceKey(res.deviceKey || getWorkstationFingerprint());
        setShowDeviceModal(true);
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message || t('login.error_failed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Language Switcher Top Right */}
      <div className="absolute top-6 right-6 z-20 flex items-center bg-slate-800/80 backdrop-blur-md p-1 rounded-2xl border border-slate-700/80 text-xs font-bold text-white">
        <button
          onClick={() => setLang('ar')}
          className={`px-2.5 py-1 rounded-xl transition-all ${lang === 'ar' ? 'bg-emerald-600 text-white font-extrabold' : 'text-slate-400 hover:text-white'}`}
        >
          العربية
        </button>
        <button
          onClick={() => setLang('fr')}
          className={`px-2.5 py-1 rounded-xl transition-all ${lang === 'fr' ? 'bg-emerald-600 text-white font-extrabold' : 'text-slate-400 hover:text-white'}`}
        >
          FR
        </button>
        <button
          onClick={() => setLang('en')}
          className={`px-2.5 py-1 rounded-xl transition-all ${lang === 'en' ? 'bg-emerald-600 text-white font-extrabold' : 'text-slate-400 hover:text-white'}`}
        >
          EN
        </button>
      </div>

      <div className="relative w-full max-w-md">
        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-black/50 text-white">
          {/* Logo & Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-400 mx-auto flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-emerald-500/20 mb-4">
              ن
            </div>
            <h2 className="text-xl font-black text-white tracking-tight leading-snug">
              {t('app_name')}
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              {t('login.subtitle')}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {t('login.username')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 rtl:right-0 ltr:left-0 pr-3.5 rtl:pr-3.5 ltr:pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl py-3 px-4 rtl:pr-10 ltr:pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="admin"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                {t('login.password')}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 right-0 rtl:right-0 ltr:left-0 pr-3.5 rtl:pr-3.5 ltr:pl-3.5 flex items-center pointer-events-none text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700/80 rounded-2xl py-3 px-4 rtl:pr-10 ltr:pl-10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Workstation Badge */}
            <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                <Laptop className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('login.workstation_label')}:</span>
                <strong className="text-emerald-300 font-mono">{workstationName}</strong>
              </span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-900/50 transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50"
            >
              {loading ? (
                <span>{t('common.loading')}</span>
              ) : (
                <>
                  <span>{t('login.submit')}</span>
                  <CheckCircle className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-6 pt-4 border-t border-slate-800 text-center text-[11px] text-slate-500">
            {t('login.demo_hint')} <span className="text-slate-300 font-mono font-bold">admin</span> / <span className="text-slate-300 font-mono font-bold">admin123</span>
          </div>
        </div>
      </div>

      {/* Mandatory Device Registration Modal if device is new */}
      <DeviceRegistrationModal
        isOpen={showDeviceModal}
        deviceKey={deviceKey}
        onSuccess={() => navigate('/')}
      />
    </div>
  );
}
