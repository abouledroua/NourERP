import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X, Trash2 } from 'lucide-react';
import { useLanguage } from './LanguageContext';

const ToastContext = createContext(null);
const ConfirmContext = createContext(null);

// Global references for convenient imperative usage
let globalToast = null;
let globalConfirm = null;

export const toast = {
  success: (msg, opts) => globalToast?.success(msg, opts),
  error: (msg, opts) => globalToast?.error(msg, opts),
  warning: (msg, opts) => globalToast?.warning(msg, opts),
  info: (msg, opts) => globalToast?.info(msg, opts)
};

export const confirmDialog = (opts) => {
  if (globalConfirm) {
    return globalConfirm(opts);
  }
  return Promise.resolve(window.confirm(opts.message || 'Confirm?'));
};

export function UIFeedbackProvider({ children }) {
  const { t, isRTL } = useLanguage();

  // ==========================================
  // TOAST NOTIFICATIONS STATE
  // ==========================================
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((type, message, options = {}) => {
    const id = ++toastIdRef.current;
    const duration = options.duration || 3000; // Auto hide after 3 seconds

    const newToast = {
      id,
      type,
      message,
      title: options.title || null,
      duration
    };

    setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 active

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }

    return id;
  }, [removeToast]);

  const toastMethods = {
    success: (msg, opts) => addToast('success', msg, opts),
    error: (msg, opts) => addToast('error', msg, opts),
    warning: (msg, opts) => addToast('warning', msg, opts),
    info: (msg, opts) => addToast('info', msg, opts),
    dismiss: removeToast
  };

  useEffect(() => {
    globalToast = toastMethods;
  }, [addToast]);

  // ==========================================
  // CONFIRM DIALOG STATE
  // ==========================================
  const [dialogConfig, setDialogConfig] = useState(null);
  const resolverRef = useRef(null);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setDialogConfig({
        title: options.title || t('dialog.confirm_title', 'تأكيد العملية'),
        message: options.message || t('dialog.confirm_message', 'هل أنت متأكد من الاستمرار؟'),
        confirmText: options.confirmText || (options.type === 'danger' ? t('dialog.confirm_delete_btn', 'نعم، تأكيد الحذف') : t('common.confirm', 'تأكيد')),
        cancelText: options.cancelText || t('dialog.cancel_btn', 'إلغاء'),
        type: options.type || 'danger', // 'danger' | 'warning' | 'info'
        icon: options.icon || 'trash'
      });
    });
  }, [t]);

  useEffect(() => {
    globalConfirm = confirm;
  }, [confirm]);

  const handleConfirm = () => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setDialogConfig(null);
  };

  const handleCancel = () => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setDialogConfig(null);
  };

  // Keyboard navigation for dialog
  useEffect(() => {
    if (!dialogConfig) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleCancel();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleConfirm();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dialogConfig]);

  return (
    <ToastContext.Provider value={toastMethods}>
      <ConfirmContext.Provider value={confirm}>
        {children}

        {/* =========================================================================
            MODERN GLASS TOAST CONTAINER (Top Center / Auto-Dismiss 3s)
            ========================================================================= */}
        <div
          dir={isRTL ? 'rtl' : 'ltr'}
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[100000] flex flex-col gap-2.5 pointer-events-none w-[92vw] max-w-md"
        >
          {toasts.map((tItem) => {
            const isSuccess = tItem.type === 'success';
            const isError = tItem.type === 'error';
            const isWarning = tItem.type === 'warning';

            return (
              <div
                key={tItem.id}
                className={`pointer-events-auto relative overflow-hidden rounded-2xl p-4 shadow-2xl backdrop-blur-2xl border transition-all duration-300 animate-in fade-in slide-in-from-top-4 flex items-start gap-3.5 ${
                  isRTL ? 'text-right' : 'text-left'
                } ${
                  isSuccess
                    ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40'
                    : isError
                    ? 'bg-rose-950/80 border-rose-500/40 text-rose-100 shadow-rose-950/40'
                    : isWarning
                    ? 'bg-amber-950/80 border-amber-500/40 text-amber-100 shadow-amber-950/40'
                    : 'bg-slate-900/85 border-slate-700/60 text-slate-100 shadow-slate-950/40'
                }`}
              >
                {/* Icon */}
                <div className="flex-shrink-0 mt-0.5">
                  {isSuccess && (
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                  {isError && (
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-400/30 flex items-center justify-center text-rose-400">
                      <AlertCircle className="w-5 h-5" />
                    </div>
                  )}
                  {isWarning && (
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                  )}
                  {!isSuccess && !isError && !isWarning && (
                    <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center text-cyan-400">
                      <Info className="w-5 h-5" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 pr-1 rtl:pr-1 ltr:pl-1">
                  {tItem.title && (
                    <h5 className="text-xs font-black tracking-wide text-white mb-0.5">
                      {tItem.title}
                    </h5>
                  )}
                  <p className="text-xs font-semibold leading-relaxed break-words">
                    {tItem.message}
                  </p>
                </div>

                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => removeToast(tItem.id)}
                  className="flex-shrink-0 text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* 3-second animated countdown bar */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 overflow-hidden">
                  <div
                    className={`h-full animate-toast-progress ${
                      isSuccess ? 'bg-emerald-400' : isError ? 'bg-rose-400' : isWarning ? 'bg-amber-400' : 'bg-cyan-400'
                    }`}
                    style={{ animationDuration: `${tItem.duration}ms` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* =========================================================================
            MODERN GLASS CONFIRMATION DIALOG BOX (Delete & Destructive actions)
            ========================================================================= */}
        {dialogConfig && (
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-md animate-in fade-in duration-200"
          >
            <div
              className="relative w-full max-w-md rounded-3xl bg-white/95 backdrop-blur-2xl border border-white/60 shadow-2xl p-6 overflow-hidden animate-in zoom-in-95 duration-200 text-slate-900"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Background ambient glow */}
              <div
                className={`absolute -top-16 ${isRTL ? '-right-16' : '-left-16'} w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-40 ${
                  dialogConfig.type === 'danger' ? 'bg-rose-500' : 'bg-amber-500'
                }`}
              />

              {/* Header Icon + Title */}
              <div className="flex items-center gap-3.5 mb-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 border shadow-inner ${
                    dialogConfig.type === 'danger'
                      ? 'bg-rose-100/90 border-rose-200 text-rose-600'
                      : 'bg-amber-100/90 border-amber-200 text-amber-600'
                  }`}
                >
                  {dialogConfig.type === 'danger' ? (
                    <Trash2 className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <div className={isRTL ? 'text-right' : 'text-left'}>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    {dialogConfig.title}
                  </h3>
                  <span className="text-[11px] font-bold text-rose-600 block">
                    {dialogConfig.type === 'danger' ? t('dialog.irreversible_action', 'عملية لا يمكن التراجع عنها') : t('dialog.caution_action', 'يرجى توخي الحذر')}
                  </span>
                </div>
              </div>

              {/* Message */}
              <p className={`text-xs text-slate-600 leading-relaxed my-4 font-medium bg-slate-50/70 p-3 rounded-2xl border border-slate-200/60 ${isRTL ? 'text-right pr-1' : 'text-left pl-1'}`}>
                {dialogConfig.message}
              </p>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200/80 active:scale-95 transition-all"
                >
                  {dialogConfig.cancelText}
                </button>
                <button
                  type="button"
                  autoFocus
                  onClick={handleConfirm}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black text-white shadow-lg transition-all active:scale-95 flex items-center gap-1.5 ${
                    dialogConfig.type === 'danger'
                      ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/30'
                      : 'bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-600/30'
                  }`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{dialogConfig.confirmText}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </ConfirmContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a UIFeedbackProvider');
  }
  return context;
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within a UIFeedbackProvider');
  }
  return context;
}
