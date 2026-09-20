import React, { useState, useEffect } from 'react';
import { Laptop, ShieldCheck, KeyRound, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function DeviceRegistrationModal({ isOpen, deviceKey, onSuccess }) {
  const { t, isRTL } = useLanguage();
  const { updateWorkstation } = useAuth();
  const [workstationName, setWorkstationNameInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setWorkstationNameInput('');
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyKey = () => {
    if (deviceKey) {
      navigator.clipboard.writeText(deviceKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanName = workstationName.trim();
    if (!cleanName || cleanName.length < 2) {
      setError(t('device_modal.name_required_error'));
      return;
    }

    try {
      setLoading(true);
      setError('');
      const res = await api.post('/auth/register-device', {
        deviceKey,
        workstationName: cleanName
      });

      if (res.success) {
        updateWorkstation(cleanName);
        if (onSuccess) onSuccess(cleanName);
      }
    } catch (err) {
      setError(err.message || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="relative w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-emerald-950/50 text-white animate-in fade-in zoom-in-95 duration-200">
        
        {/* Glow Accent */}
        <div className="absolute top-0 right-1/4 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Icon & Title */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 mx-auto flex items-center justify-center text-white shadow-lg shadow-emerald-600/30 mb-3">
            <Laptop className="w-7 h-7" />
          </div>
          <h3 className="text-lg sm:text-xl font-black text-white tracking-tight">
            {t('device_modal.title')}
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
            {t('device_modal.subtitle')}
          </p>
        </div>

        {/* Device Key Display Badge */}
        <div className="mb-6 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                {t('device_modal.key_label')}
              </div>
              <div className="text-base font-mono font-black text-emerald-400 tracking-wider">
                {deviceKey}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCopyKey}
            className="px-2.5 py-1.5 rounded-xl bg-slate-700/60 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors flex items-center gap-1"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">{t('common.copied')}</span>
              </>
            ) : (
              <span>{t('common.copy')}</span>
            )}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              {t('device_modal.name_label')} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={workstationName}
              onChange={(e) => setWorkstationNameInput(e.target.value)}
              placeholder={t('device_modal.name_placeholder')}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl py-3 px-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading || !workstationName.trim()}
            className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black py-3.5 px-6 rounded-2xl shadow-lg shadow-emerald-900/50 transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span>{t('common.loading')}</span>
            ) : (
              <>
                <span>{t('device_modal.submit_btn')}</span>
                <ArrowRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
