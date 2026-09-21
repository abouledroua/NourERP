import React, { useState, useEffect } from 'react';
import { ShieldCheck, Search, Filter, Terminal, Calendar, Eye } from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { formatDate, formatDateTime } from '../utils/formatters';
import Modal from '../components/Modal';

export default function AuditLogs() {
  const { t } = useLanguage();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState(null);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (actionFilter) params.append('actionType', actionFilter);

      const res = await api.get(`/audit?${params.toString()}`);
      if (res.success) setLogs(res.data);
    } catch (err) {
      console.error('[AUDIT] Error loading logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchLogs();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, actionFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {t('audit.title')}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {t('audit.subtitle')}
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <div className="absolute inset-y-0 right-0 rtl:right-0 ltr:left-0 pr-3 rtl:pr-3 ltr:pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('audit.search_placeholder')}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 rtl:pr-9 ltr:pl-9 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <select
          value={actionFilter}
          onChange={e => setActionFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t('audit.filter_all_actions')}</option>
          <option value="CREATE">{t('audit.action_create')}</option>
          <option value="UPDATE">{t('audit.action_update')}</option>
          <option value="DELETE">{t('audit.action_delete')}</option>
          <option value="VOID_PAYMENT">{t('audit.action_void')}</option>
          <option value="SETTLE_DEBT">{t('audit.action_settle')}</option>
          <option value="LOGIN">{t('audit.action_login')}</option>
          <option value="BACKUP">{t('audit.action_backup')}</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">{t('audit.col_time')}</th>
                <th className="py-3.5 px-4">{t('audit.col_user')}</th>
                <th className="py-3.5 px-4">{t('audit.col_workstation')}</th>
                <th className="py-3.5 px-4">{t('audit.col_action')}</th>
                <th className="py-3.5 px-4">{t('audit.col_entity')}</th>
                <th className="py-3.5 px-4">{t('audit.col_entity_id')}</th>
                <th className="py-3.5 px-4 text-center">{t('common.details')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    {t('common.loading')}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    {t('audit.empty_logs')}
                  </td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-500">{formatDateTime(log.created_at)}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{log.user_full_name || t('audit.system_user')}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{log.workstation_name}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${
                        log.action_type === 'CREATE' ? 'bg-emerald-50 text-emerald-700' :
                        log.action_type === 'UPDATE' ? 'bg-blue-50 text-blue-700' :
                        log.action_type === 'DELETE' || log.action_type === 'VOID_PAYMENT' ? 'bg-rose-50 text-rose-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {log.action_type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{log.entity_name}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{log.entity_id || '-'}</td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => setSelectedLog(log)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>{t('audit.view_btn')}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* JSON Payload Modal */}
      <Modal
        isOpen={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={t('audit.modal_details_title')}
      >
        {selectedLog && (
          <div className="space-y-3 text-xs">
            <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
              <p>{t('audit.col_action')}: <strong className="font-bold text-emerald-800">{selectedLog.action_type}</strong></p>
              <p>{t('audit.col_user')}: <strong>{selectedLog.user_full_name || selectedLog.username}</strong></p>
              <p>{t('audit.col_workstation')}: <strong className="font-mono">{selectedLog.workstation_name}</strong> ({selectedLog.ip_address})</p>
              <p>{t('audit.col_time')}: <strong className="font-mono">{new Date(selectedLog.created_at).toLocaleString('fr-FR')}</strong></p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('audit.col_details')} (JSON Payload):</label>
              <pre className="p-3 bg-slate-900 text-emerald-400 rounded-2xl font-mono text-xs overflow-x-auto max-h-60">
                {JSON.stringify(typeof selectedLog.details === 'string' ? JSON.parse(selectedLog.details || '{}') : selectedLog.details, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
