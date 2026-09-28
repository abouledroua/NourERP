import React, { useState, useEffect } from 'react';
import { formatDateTime } from '../utils/formatters';
import { 
  Settings as SettingsIcon, 
  School, 
  BookOpen, 
  Calendar, 
  Laptop, 
  Database, 
  Save, 
  Download, 
  Upload, 
  CheckCircle2, 
  ShieldAlert, 
  Check,
  Plus,
  Edit2,
  Trash2,
  X
} from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useToast, useConfirm } from '../context/UIFeedbackContext';

export default function Settings() {
  const { t } = useLanguage();
  const { settings: globalSettings, refreshSettings } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();

  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'general';
  const [activeTab, setActiveTab] = useState(initialTab); // 'general' | 'tracks' | 'years' | 'devices' | 'backup'

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && tab !== activeTab) {
      setActiveTab(tab);
    }
  }, [searchParams]);
  const [formSettings, setFormSettings] = useState(globalSettings);
  const [tracks, setTracks] = useState([]);
  const [years, setYears] = useState([]);
  const [devices, setDevices] = useState([]);
  const [backups, setBackups] = useState([]);
  const [saving, setSaving] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);

  // Track Form Modal
  const [showTrackModal, setShowTrackModal] = useState(false);
  const [trackFormData, setTrackFormData] = useState({
    id: null,
    code: '',
    name_ar: '',
    name_en: '',
    name_fr: '',
    description: '',
    is_active: true
  });

  const handleOpenTrackModal = (track = null) => {
    if (track) {
      setTrackFormData({ ...track });
    } else {
      setTrackFormData({
        id: null,
        code: '',
        name_ar: '',
        name_en: '',
        name_fr: '',
        description: '',
        is_active: true
      });
    }
    setShowTrackModal(true);
  };

  const handleSaveTrack = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      let res;
      if (trackFormData.id) {
        res = await api.put(`/settings/tracks/${trackFormData.id}/edit`, trackFormData);
      } else {
        res = await api.post('/settings/tracks', trackFormData);
      }
      if (res.success) {
        toast.success(res.message || t('toast.success'));
        setShowTrackModal(false);
        fetchFullSettings();
        refreshSettings();
      }
    } catch (err) {
      toast.error(err.message || t('toast.error'));
    } finally {
      setSaving(false);
    }
  };


  const fetchFullSettings = async () => {
    try {
      const [sRes, dRes, bRes] = await Promise.all([
        api.get('/settings'),
        api.get('/auth/devices'),
        api.get('/settings/backups')
      ]);

      if (sRes.success) {
        setFormSettings(sRes.data.settings || {});
        setTracks(sRes.data.tracks || []);
        setYears(sRes.data.years || []);
      }
      if (dRes.success) setDevices(dRes.data || []);
      if (bRes.success) setBackups(bRes.data || []);
    } catch (err) {
      console.error('[SETTINGS] Error loading:', err);
    }
  };

  useEffect(() => {
    fetchFullSettings();
  }, []);

  const handleSaveGeneral = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await api.post('/settings', { settings: formSettings });
      if (res.success) {
        toast.success(t('toast.settings_saved'));
        refreshSettings();
      }
    } catch (err) {
      toast.error(err.message || t('toast.settings_save_failed'));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleTrack = async (trackId, currentActive) => {
    try {
      const res = await api.put(`/settings/tracks/${trackId}`, { is_active: !currentActive });
      if (res.success) {
        toast.success(currentActive ? t('toast.track_disabled') : t('toast.track_enabled'));
        fetchFullSettings();
        refreshSettings();
      }
    } catch (err) {
      toast.error(err.message || t('toast.track_status_failed'));
    }
  };

  const handleDeleteTrack = async (track) => {
    const confirmed = await confirm({
      title: t('settings.delete_track_title', 'Delete Track'),
      message: t('settings.delete_track_msg', { code: track.code }),
      confirmText: t('dialog.delete_btn', 'Delete'),
      cancelText: t('dialog.cancel_btn'),
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await api.delete(`/settings/tracks/${track.id}`);
      if (res.success) {
        toast.success(res.message || t('toast.success'));
        fetchFullSettings();
        refreshSettings();
      }
    } catch (err) {
      toast.error(err.message || t('toast.error'));
    }
  };

  const handleUpdateDevice = async (deviceId, status) => {
    try {
      const res = await api.put(`/auth/devices/${deviceId}`, { status });
      if (res.success) {
        toast.success(t('toast.device_status_updated'));
        fetchFullSettings();
      }
    } catch (err) {
      toast.error(err.message || t('toast.device_status_failed'));
    }
  };

  const handleCreateBackup = async () => {
    try {
      setBackupLoading(true);
      const res = await api.post('/settings/backup');
      if (res.success) {
        toast.success(t('toast.backup_created', { filename: res.data.filename }));
        fetchFullSettings();
      }
    } catch (err) {
      toast.error(err.message || t('toast.backup_create_failed'));
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset input so same file can be chosen again
    e.target.value = '';

    const confirmed = await confirm({
      title: t('dialog.restore_db_title'),
      message: t('dialog.restore_db_msg', { filename: file.name }),
      confirmText: t('dialog.confirm_restore_db'),
      cancelText: t('dialog.cancel_btn'),
      type: 'danger'
    });

    if (!confirmed) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const sqlContent = event.target.result;
        const res = await api.post('/settings/restore', { sqlContent });
        if (res.success) {
          toast.success(t('toast.restore_success'));
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      } catch (err) {
        toast.error(err.message || t('toast.restore_failed'));
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          {t('settings.title')}
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          {t('settings.subtitle')}
        </p>
      </div>

      {/* Tabs bar */}
      <div className="bg-white rounded-3xl p-1.5 border border-slate-200/80 shadow-xs flex flex-wrap gap-1.5 text-xs font-bold">
        <button
          onClick={() => setActiveTab('general')}
          className={`px-4 py-2 rounded-2xl transition-all flex items-center gap-2 ${
            activeTab === 'general' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <School className="w-4 h-4" />
          <span>{t('settings.tab_general')}</span>
        </button>
        <button
          onClick={() => setActiveTab('tracks')}
          className={`px-4 py-2 rounded-2xl transition-all flex items-center gap-2 ${
            activeTab === 'tracks' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{t('settings.tab_tracks')} ({tracks.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('years')}
          className={`px-4 py-2 rounded-2xl transition-all flex items-center gap-2 ${
            activeTab === 'years' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>{t('settings.tab_years')}</span>
        </button>
        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2 rounded-2xl transition-all flex items-center gap-2 ${
            activeTab === 'devices' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Laptop className="w-4 h-4" />
          <span>{t('settings.tab_devices')} ({devices.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('backup')}
          className={`px-4 py-2 rounded-2xl transition-all flex items-center gap-2 ${
            activeTab === 'backup' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>{t('settings.tab_backup')}</span>
        </button>
      </div>

      {/* TAB 1: GENERAL BRANDING */}
      {activeTab === 'general' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('settings.school_name_ar')} *</label>
                <input
                  type="text"
                  required
                  value={formSettings.school_name_ar || ''}
                  onChange={e => setFormSettings({ ...formSettings, school_name_ar: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('settings.school_name_en')}</label>
                <input
                  type="text"
                  value={formSettings.school_name_en || ''}
                  onChange={e => setFormSettings({ ...formSettings, school_name_en: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('settings.school_name_fr')}</label>
                <input
                  type="text"
                  value={formSettings.school_name_fr || ''}
                  onChange={e => setFormSettings({ ...formSettings, school_name_fr: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('settings.address')}</label>
                <input
                  type="text"
                  value={formSettings.school_address || ''}
                  onChange={e => setFormSettings({ ...formSettings, school_address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('settings.phone')}</label>
                <input
                  type="text"
                  value={formSettings.school_phone || ''}
                  onChange={e => setFormSettings({ ...formSettings, school_phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('settings.currency')}</label>
                <input
                  type="text"
                  value={formSettings.currency || 'DA'}
                  onChange={e => setFormSettings({ ...formSettings, currency: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('settings.receipt_footer')}</label>
              <input
                type="text"
                value={formSettings.print_receipt_footer || ''}
                onChange={e => setFormSettings({ ...formSettings, print_receipt_footer: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              />
            </div>

            <div className="flex justify-end pt-4 border-t border-slate-100">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-md shadow-emerald-600/30 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>{t('settings.save_settings')}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: ACADEMIC TRACKS TOGGLES */}
      {activeTab === 'tracks' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 relative">
          <div className="flex justify-between items-center mb-4">
            <p className="text-xs text-slate-500">
              {t('settings.tracks_description')}
            </p>
            <button
              onClick={() => handleOpenTrackModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t('settings.add_track', 'Add Track')}</span>
            </button>
          </div>

          <div className="space-y-3">
            {tracks.map(tr => (
              <div key={tr.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900">{tr.name_ar}</h4>
                  <p className="text-xs text-slate-500">{tr.name_en} | {tr.name_fr} - Code: {tr.code}</p>
                  <p className="text-[11px] text-slate-400 mt-1">{tr.description}</p>
                </div>
                
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    onClick={() => handleToggleTrack(tr.id, tr.is_active)}
                    className={`px-4 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      tr.is_active 
                        ? 'bg-emerald-600 text-white shadow-xs' 
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                  >
                    {tr.is_active ? t('settings.track_active') : t('settings.track_inactive')}
                  </button>
                  
                  <button
                    onClick={() => handleOpenTrackModal(tr)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                    title={t('settings.edit_track', 'Edit Track')}
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => handleDeleteTrack(tr)}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title={t('dialog.delete_btn', 'Delete')}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Track Modal */}
          {showTrackModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
              <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 flex flex-col max-h-[90vh]">
                <div className="flex items-center justify-between p-6 border-b border-slate-100">
                  <h3 className="font-bold text-lg text-slate-900">
                    {trackFormData.id ? t('settings.edit_track', 'Edit Track') : t('settings.add_track', 'Add Track')}
                  </h3>
                  <button onClick={() => setShowTrackModal(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="p-6 overflow-y-auto">
                  <form id="track-form" onSubmit={handleSaveTrack} className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('settings.track_code')}</label>
                      <input
                        type="text"
                        required
                        value={trackFormData.code}
                        onChange={(e) => setTrackFormData({ ...trackFormData, code: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('settings.track_name_ar')}</label>
                      <input
                        type="text"
                        required
                        value={trackFormData.name_ar}
                        onChange={(e) => setTrackFormData({ ...trackFormData, name_ar: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">{t('settings.track_name_en')}</label>
                        <input
                          type="text"
                          required
                          value={trackFormData.name_en}
                          onChange={(e) => setTrackFormData({ ...trackFormData, name_en: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">{t('settings.track_name_fr')}</label>
                        <input
                          type="text"
                          required
                          value={trackFormData.name_fr}
                          onChange={(e) => setTrackFormData({ ...trackFormData, name_fr: e.target.value })}
                          className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">{t('settings.track_description')}</label>
                      <textarea
                        rows="2"
                        value={trackFormData.description || ''}
                        onChange={(e) => setTrackFormData({ ...trackFormData, description: e.target.value })}
                        className="w-full border border-slate-200 rounded-xl p-2.5 text-sm bg-slate-50 focus:ring-2 focus:ring-emerald-500 focus:outline-none resize-none"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2">
                      <input
                        type="checkbox"
                        id="track_active"
                        checked={trackFormData.is_active}
                        onChange={(e) => setTrackFormData({ ...trackFormData, is_active: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                      />
                      <label htmlFor="track_active" className="text-sm font-bold text-slate-700">
                        {t('settings.track_active', 'Active')}
                      </label>
                    </div>
                  </form>
                </div>
                
                <div className="p-6 border-t border-slate-100 flex justify-end gap-3 bg-slate-50/50">
                  <button
                    type="button"
                    onClick={() => setShowTrackModal(false)}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl font-bold text-sm transition-colors"
                  >
                    {t('dialog.cancel_btn', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    form="track-form"
                    disabled={saving}
                    className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm transition-all shadow-md shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-50"
                  >
                    {saving && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {t('dialog.save_btn', 'Save')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ACADEMIC YEARS */}
      {activeTab === 'years' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="space-y-3">
            {years.map(y => (
              <div key={y.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
                <div>
                  <h4 className="font-extrabold text-sm text-slate-900">{y.name}</h4>
                  <p className="text-slate-500 font-mono mt-0.5">
                    {t('settings.year_date_range', { start: y.start_date, end: y.end_date })}
                  </p>
                  <span className="text-[10px] text-slate-400">
                    {t('settings.classes_count', { count: y.classes_count || 0 })}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black ${
                    y.is_current ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                  }`}>
                    {y.is_current ? t('settings.current_year_badge') : y.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: WORKSTATIONS (DEVICES) */}
      {activeTab === 'devices' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <p className="text-xs text-slate-500">
            {t('settings.devices_description')}
          </p>

          <table className="w-full text-xs text-right rtl:text-right ltr:text-left border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <th className="p-2.5">{t('settings.col_workstation')}</th>
                <th className="p-2.5">{t('settings.col_fingerprint')}</th>
                <th className="p-2.5">{t('settings.col_ip')}</th>
                <th className="p-2.5">{t('settings.col_last_seen')}</th>
                <th className="p-2.5">{t('settings.col_device_status')}</th>
                <th className="p-2.5 text-center">{t('settings.col_device_action')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {devices.map(d => (
                <tr key={d.id} className="hover:bg-slate-50">
                  <td className="p-2.5 font-bold text-slate-900">{d.workstation_name}</td>
                  <td className="p-2.5 font-mono text-[10px] text-slate-500">{d.device_fingerprint}</td>
                  <td className="p-2.5 font-mono">{d.ip_address}</td>
                  <td className="p-2.5 text-slate-500">{d.last_seen ? formatDateTime() : '-'}</td>
                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                      d.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {d.status === 'APPROVED' ? t('settings.device_approved') : t('settings.device_blocked')}
                    </span>
                  </td>
                  <td className="p-2.5 text-center">
                    {d.status === 'APPROVED' ? (
                      <button
                        onClick={() => handleUpdateDevice(d.id, 'BLOCKED')}
                        className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-[11px] font-bold"
                      >
                        {t('settings.block_device_btn')}
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateDevice(d.id, 'APPROVED')}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-[11px] font-bold"
                      >
                        {t('settings.unblock_device_btn')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 5: BACKUP & RESTORE */}
      {activeTab === 'backup' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Create immediate backup */}
            <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-100 space-y-3">
              <h4 className="font-extrabold text-sm text-emerald-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>{t('settings.create_backup')}</span>
              </h4>
              <p className="text-emerald-700">
                {t('settings.create_backup_desc')}
              </p>
              <button
                onClick={handleCreateBackup}
                disabled={backupLoading}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>{backupLoading ? t('settings.backing_up') : t('settings.start_backup_btn')}</span>
              </button>
            </div>

            {/* Restore from file */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <h4 className="font-extrabold text-sm text-slate-900 flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-slate-600" />
                <span>{t('settings.restore_backup')}</span>
              </h4>
              <p className="text-slate-600">
                {t('settings.restore_backup_desc')}
              </p>
              <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl font-bold shadow-xs transition-all cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{t('settings.select_sql_btn')}</span>
                <input
                  type="file"
                  accept=".sql"
                  onChange={handleRestoreFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Backup History */}
          <div className="space-y-2 pt-4 border-t border-slate-100">
            <h4 className="font-bold text-slate-800">{t('settings.backup_history')}</h4>
            {backups.length === 0 ? (
              <p className="text-slate-400 italic">{t('settings.no_backups')}</p>
            ) : (
              <div className="space-y-1.5">
                {backups.map(b => (
                  <div key={b.filename} className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center font-mono">
                    <span className="font-bold text-slate-800">{b.filename}</span>
                    <span className="text-[11px] text-slate-500">{(b.size / 1024).toFixed(1)} KB</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
