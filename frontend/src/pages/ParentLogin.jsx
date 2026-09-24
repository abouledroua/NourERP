import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Phone, ArrowLeft, ArrowRight, ShieldCheck, Sparkles, AlertCircle, HeartHandshake, KeyRound } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import api from '../utils/api';

export default function ParentLogin() {
  const [nin, setNin] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { t, lang, setLang, isRTL } = useLanguage();
  const navigate = useNavigate();

  const saveParentSession = (payload) => {
    localStorage.setItem('alnour_parent_token', payload.token);
    localStorage.setItem('alnour_parent_info', JSON.stringify(payload.parent));
    if (payload.children && payload.children.length > 0) {
      localStorage.setItem('alnour_parent_children', JSON.stringify(payload.children));
    }
    navigate('/parent');
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!nin || !nin.trim()) {
      setError(t('parent_portal.nin_required', 'يرجى إدخال رقم التعريف الوطني'));
      return;
    }

    if (!password || !password.trim()) {
      setError(t('parent_portal.password_required', 'يرجى إدخال كلمة المرور'));
      return;
    }

    try {
      setLoading(true);
      setError('');

      const res = await api.post('/parent/login', {
        nin: nin.trim(),
        password: password.trim(),
      });

      if (res.success && res.token) {
        saveParentSession(res);
      } else {
        setError(res.message || 'فشل تسجيل الدخول');
      }
    } catch (err) {
      setError(err.message || 'فشل الاتصال بالنظام، يرجى المحاولة لاحقاً');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-navy-950 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 -right-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -left-20 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="absolute top-6 right-6 z-20 flex items-center bg-slate-800/80 backdrop-blur-md p-1 rounded-2xl border border-slate-700/80 text-xs font-bold text-white">
        <button onClick={() => setLang('ar')} className={`px-2.5 py-1 rounded-xl transition-all ${lang === 'ar' ? 'bg-emerald-600 text-white font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'}`}>العربية</button>
        <button onClick={() => setLang('fr')} className={`px-2.5 py-1 rounded-xl transition-all ${lang === 'fr' ? 'bg-emerald-600 text-white font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'}`}>Français</button>
        <button onClick={() => setLang('en')} className={`px-2.5 py-1 rounded-xl transition-all ${lang === 'en' ? 'bg-emerald-600 text-white font-extrabold shadow-sm' : 'text-slate-400 hover:text-white'}`}>English</button>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="bg-slate-900/85 backdrop-blur-2xl border border-slate-800/90 rounded-3xl p-8 sm:p-10 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-500" />

          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20 mb-4 ring-4 ring-emerald-500/10">
              <HeartHandshake className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{t('parent_portal.title', 'فضاء أولياء التلاميذ')}</h1>
            <p className="text-xs text-slate-400 mt-2 leading-relaxed">{t('parent_portal.subtitle', 'متابعة مسار التمدرس، التخطيط الأسبوعي، والوضعية المالية لأبنائكم')}</p>
          </div>

          {error && (
            <div className="mb-6 p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-2xl flex items-start gap-2.5 text-xs text-rose-300 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">{t('parent_portal.nin_label', 'رقم التعريف الوطني')}</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  autoFocus
                  value={nin}
                  onChange={(e) => setNin(e.target.value.replace(/\s+/g, '').replace(/[^0-9A-Za-z]/g, '').slice(0, 30))}
                  placeholder={t('parent_portal.nin_placeholder', 'NIN / 000000000000000000')}
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                  dir="ltr"
                  disabled={loading}
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <Phone className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-normal">
                {t('parent_portal.login_prompt', 'أدخل رقم التعريف الوطني وكلمة المرور الخاصة بك للدخول إلى فضاء الأولياء')}
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">{t('parent_portal.password_label', 'كلمة المرور')}</label>
              <div className="relative">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('parent_portal.password_placeholder', '••••••••')}
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-2xl px-4 py-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  disabled={loading}
                />
                <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                  <KeyRound className="w-4 h-4 text-emerald-400" />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/30 hover:shadow-emerald-600/40 transition-all flex items-center justify-center gap-2 group disabled:opacity-50 text-sm"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>{t('parent_portal.login_btn', 'دخول فضاء الأولياء')}</span>
                  {isRTL ? <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" /> : <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-800 text-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors">
              <ShieldCheck className="w-4 h-4" />
              <span>{t('parent_portal.staff_login_link', 'دخول الطاقم الإداري والتربوي')}</span>
            </Link>
          </div>
        </div>

        <div className="mt-6 text-center text-[11px] text-slate-500 flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-emerald-400/60" />
          <span>Al-Nour ERP &copy; {new Date().getFullYear()}</span>
        </div>
      </div>
    </div>
  );
}
