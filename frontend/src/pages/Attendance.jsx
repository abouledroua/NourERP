import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, XCircle, AlertCircle, Save, Bell, Calendar } from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/UIFeedbackContext';
import DateInput from '../components/DateInput';

export default function Attendance() {
  const { t } = useLanguage();
  const toast = useToast();

  const [classes, setClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().slice(0, 10));

  const [roster, setRoster] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      if (res.success && res.data.length > 0) {
        setClasses(res.data);
        setSelectedClassId(res.data[0].id);
      }
    } catch (err) {
      console.error('[ATTENDANCE] Error loading classes:', err);
    }
  };

  const fetchRoster = async () => {
    if (!selectedClassId || !selectedDate) return;
    try {
      setLoading(true);
      const res = await api.get(`/attendance/roster?classId=${selectedClassId}&date=${selectedDate}`);
      if (res.success) {
        setRoster(res.data);
      }
    } catch (err) {
      console.error('[ATTENDANCE] Error loading roster:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    fetchRoster();
  }, [selectedClassId, selectedDate]);

  const handleStatusToggle = (studentId, status) => {
    setRoster(prev => prev.map(s => {
      if (s.student_id === studentId) {
        return { ...s, status };
      }
      return s;
    }));
  };

  const handleMinutesLateChange = (studentId, minutes) => {
    setRoster(prev => prev.map(s => {
      if (s.student_id === studentId) {
        return { ...s, minutes_late: parseInt(minutes, 10) || 0 };
      }
      return s;
    }));
  };

  const handleToggleParentNotified = (studentId) => {
    setRoster(prev => prev.map(s => {
      if (s.student_id === studentId) {
        return { ...s, parent_notified: !s.parent_notified };
      }
      return s;
    }));
  };

  const handleSaveAttendance = async () => {
    try {
      const res = await api.post('/attendance/batch', {
        classId: selectedClassId,
        date: selectedDate,
        records: roster.map(r => ({
          student_id: r.student_id,
          status: r.status,
          minutes_late: r.minutes_late || 0,
          reason: r.reason || null,
          parent_notified: r.parent_notified
        }))
      });
      if (res.success) {
        toast.success(t('toast.attendance_saved'));
        fetchRoster();
      }
    } catch (err) {
      toast.error(err.message || t('toast.attendance_save_failed'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('attendance.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('attendance.subtitle')}
          </p>
        </div>

        <button
          onClick={handleSaveAttendance}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
        >
          <Save className="w-4 h-4" />
          <span>{t('attendance.save_roster')}</span>
        </button>
      </div>

      {/* Selectors */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-4 text-xs">
        <div>
          <label className="block font-bold text-slate-500 mb-1">{t('attendance.select_class')}</label>
          <select
            value={selectedClassId}
            onChange={e => setSelectedClassId(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-w-[200px]"
          >
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block font-bold text-slate-500 mb-1">{t('attendance.select_date')}</label>
          <DateInput
            
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
      </div>

      {/* Attendance Roster Checklist Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">{t('attendance.col_matricule')}</th>
                <th className="py-3 px-4">{t('attendance.col_student')}</th>
                <th className="py-3 px-4 text-center">{t('attendance.col_status')}</th>
                <th className="py-3 px-4 text-center">{t('attendance.col_minutes_late')}</th>
                <th className="py-3 px-4 text-center">{t('attendance.col_notify')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roster.length === 0 ? (
                <tr>
                  <td colSpan="5" className="py-8 text-center text-slate-400 italic">
                    {t('attendance.empty_roster')}
                  </td>
                </tr>
              ) : (
                roster.map(s => (
                  <tr key={s.student_id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{s.matricule}</td>
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900 text-sm block">{s.first_name_ar} {s.last_name_ar}</span>
                      <span className="text-[10px] text-slate-400">{t('attendance.parent_label')} {s.parent_name} ({s.parent_phone})</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center bg-slate-100 p-1 rounded-2xl gap-1">
                        <button
                          onClick={() => handleStatusToggle(s.student_id, 'PRESENT')}
                          className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                            s.status === 'PRESENT' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {t('attendance.status_present')}
                        </button>
                        <button
                          onClick={() => handleStatusToggle(s.student_id, 'ABSENT_JUSTIFIED')}
                          className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                            s.status === 'ABSENT_JUSTIFIED' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {t('attendance.status_absent_excused')}
                        </button>
                        <button
                          onClick={() => handleStatusToggle(s.student_id, 'ABSENT_UNJUSTIFIED')}
                          className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                            s.status === 'ABSENT_UNJUSTIFIED' ? 'bg-rose-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {t('attendance.status_absent_unexcused')}
                        </button>
                        <button
                          onClick={() => handleStatusToggle(s.student_id, 'LATE')}
                          className={`px-3 py-1 rounded-xl font-bold transition-all text-xs ${
                            s.status === 'LATE' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                          }`}
                        >
                          {t('attendance.status_late')}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {s.status === 'LATE' ? (
                        <input
                          type="number"
                          min="1"
                          max="120"
                          value={s.minutes_late || 10}
                          onChange={e => handleMinutesLateChange(s.student_id, e.target.value)}
                          className="w-16 p-1 text-center font-mono font-bold bg-purple-50 border border-purple-200 rounded-xl text-purple-900"
                        />
                      ) : (
                        <span className="text-slate-300 font-mono">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        onClick={() => handleToggleParentNotified(s.student_id)}
                        className={`px-3 py-1 rounded-xl text-[11px] font-bold border transition-colors inline-flex items-center gap-1 ${
                          s.parent_notified
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <Bell className="w-3 h-3" />
                        <span>{s.parent_notified ? t('attendance.notified') : t('attendance.notify_parent')}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
