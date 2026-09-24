import React, { useState } from 'react';
import api from '../utils/api';
import { useSettings } from '../context/SettingsContext';
import { useLanguage } from '../context/LanguageContext';
import { Calendar, Save } from 'lucide-react';
import DateInput from '../components/DateInput';

export default function RequireAcademicYearModal() {
  const { t } = useLanguage();
  const { refreshSettings } = useSettings();
  
  const [formData, setFormData] = useState(() => {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth(); // 0 is January, 7 is August

    let start_date = '';
    let end_date = '';
    let name = '';

    if (currentMonth < 7) {
      // Before August
      start_date = `${currentYear - 1}-09-01`;
      end_date = `${currentYear}-06-30`;
      name = `${currentYear - 1}/${currentYear}`;
    } else {
      // August or after
      start_date = `${currentYear}-09-01`;
      end_date = `${currentYear + 1}-06-30`;
      name = `${currentYear}/${currentYear + 1}`;
    }

    return { name, start_date, end_date };
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/settings/years', formData);
      if (res.success) {
        await refreshSettings();
      } else {
        setError(res.message);
      }
    } catch (err) {
      setError(err.message || t('setup.error_creating_year', 'Error creating academic year'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-md">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">{t('setup.modal_title', 'Create New Academic Year')}</h2>
            <p className="text-sm text-slate-500">{t('setup.modal_desc', 'There is currently no active academic year. You must create one to start using the system.')}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 text-rose-700 rounded-xl text-sm font-bold">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('setup.year_name_label', 'Academic Year Name *')}</label>
            <input 
              type="text" 
              required 
              placeholder={t('setup.year_name_placeholder', 'e.g. 2026/2027')} 
              value={formData.name} 
              onChange={e => setFormData({ ...formData, name: e.target.value })} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('setup.start_date_label', 'Start Date *')}</label>
            <DateInput 
               
              required 
              value={formData.start_date} 
              onChange={e => setFormData({ ...formData, start_date: e.target.value })} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">{t('setup.end_date_label', 'End Date *')}</label>
            <DateInput 
               
              required 
              value={formData.end_date} 
              onChange={e => setFormData({ ...formData, end_date: e.target.value })} 
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none" 
            />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="w-full flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition-all mt-4"
          >
            <Save className="w-5 h-5" />
            <span>{loading ? t('setup.saving', 'Saving...') : t('setup.save_continue_btn', 'Save and Continue')}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
