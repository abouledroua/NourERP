import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useToast } from '../context/UIFeedbackContext';
import api from '../utils/api'; 
import { 
  ArrowRight, Users, Edit, UserPlus, BookOpen, 
  MapPin, CheckCircle, AlertCircle, FileText, Save, X, Printer
} from 'lucide-react';
import Modal from '../components/Modal';
import TimeInput from '../components/TimeInput';

const DAY_OPTIONS = [6, 0, 1, 2, 3, 4, 5];

const createDefaultDaySchedule = () => Object.fromEntries(
  DAY_OPTIONS.map((day) => [
    day,
    {
      enabled: day !== 5,
      start: '08:00',
      end: '09:00'
    }
  ])
);

const parseScheduleInfo = (scheduleText, t) => {
  const parsed = createDefaultDaySchedule();
  if (!scheduleText) return parsed;

  const segments = scheduleText.split('|').map((segment) => segment.trim()).filter(Boolean);
  segments.forEach((segment) => {
    const match = segment.match(/^(.*?)(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})$/);
    if (!match) return;

    const label = match[1].trim();
    const start = match[2];
    const end = match[3];

    const dayIndex = DAY_OPTIONS.find((day) => {
      const dayLabel = t(`timetable.days.${day}`);
      return dayLabel === label || label.includes(dayLabel);
    });

    if (dayIndex !== undefined) {
      parsed[dayIndex] = { enabled: true, start, end };
    }
  });

  return parsed;
};

const serializeDaySchedule = (scheduleMap, t) => Object.entries(scheduleMap)
  .filter(([, config]) => config?.enabled && config?.start && config?.end)
  .map(([day, config]) => `${t(`timetable.days.${day}`)} ${config.start} - ${config.end}`)
  .join(' | ');

export default function ClassDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language, isRTL } = useLanguage();
  const { tracks } = useSettings();
  const toast = useToast();
  
  const [classInfo, setClassInfo] = useState(null);
  const [roster, setRoster] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [daySchedule, setDaySchedule] = useState(createDefaultDaySchedule());
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  useEffect(() => {
    fetchClassDetails();
    fetchTeachers();
  }, [id]);

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/teachers');
      if (res.success) setTeachers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchClassDetails = async () => {
    try {
      setLoading(true);
      // Fetch class basic info
      const infoRes = await api.get(`/classes/${id}`);
      if (infoRes.success) {
        setClassInfo(infoRes.data);
      } else {
        toast.error(infoRes.message || t('toast.fetch_failed'));
        navigate('/classes');
        return;
      }
      
      // Fetch class roster (students)
      const rosterRes = await api.get(`/classes/${id}/roster`);
      if (rosterRes.success) {
        setRoster(rosterRes.data);
      }
    } catch (err) {
      toast.error(err.message || t('toast.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEdit = () => {
    if (classInfo) {
      setDaySchedule(parseScheduleInfo(classInfo.schedule_info || '', t));
      setEditForm({
        name: classInfo.name,
        academic_track_id: classInfo.academic_track_id,
        grade_level: classInfo.grade_level,
        section: classInfo.section || '',
        capacity: classInfo.capacity,
        classroom: classInfo.classroom || '',
        homeroom_teacher_id: classInfo.homeroom_teacher_id || '',
        pricing_type: classInfo.pricing_type || 'MONTH_BASED',
        pricing_value: classInfo.pricing_value || 0,
        schedule_info: classInfo.schedule_info || '',
        status: classInfo.status
      });
      setIsEditModalOpen(true);
    }
  };

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/classes/${id}`, {
        ...editForm,
        schedule_info: serializeDaySchedule(daySchedule, t)
      });
      if (res.success) {
        toast.success(res.message || t('toast.class_updated', 'Class updated successfully'));
        setIsEditModalOpen(false);
        fetchClassDetails();
      }
    } catch (err) {
      toast.error(err.message || t('toast.update_failed', 'Failed to update class'));
    }
  };

  const handlePricingTypeChange = (setter, nextType) => {
    const normalizedType = nextType === 'MONTHLY' ? 'MONTH_BASED' : nextType === 'SESSION' ? 'SESSION_BASED' : nextType === 'HOURLY' ? 'HOUR_BASED' : nextType;
    setter((prev) => ({
      ...prev,
      pricing_type: normalizedType,
      pricing_value: {
        MONTH_BASED: 5000,
        SESSION_BASED: 1500,
        HOUR_BASED: 500,
      }[normalizedType] || 0,
    }));
  };

  const adjustPricingValue = (setter, currentValue, delta) => {
    const nextValue = Math.max(0, Number(currentValue || 0) + delta);
    setter((prev) => ({
      ...prev,
      pricing_value: nextValue,
    }));
  };

  const getAllowedStatusOptions = (status) => {
    const options = {
      PENDING: ['PENDING', 'ACTIVE'],
      ACTIVE: ['ACTIVE', 'STOPPED'],
      STOPPED: ['STOPPED', 'ACTIVE', 'ARCHIVED'],
      ARCHIVED: ['ARCHIVED'],
    };
    return options[status] || [status];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">{t('classes.not_found')}</h2>
        <button onClick={() => navigate('/classes')} className="text-emerald-600 hover:underline">
          {t('classes.return_to_classes')}
        </button>
      </div>
    );
  }

  const occupancy = classInfo.capacity > 0 ? Math.min(100, Math.round((classInfo.enrolled_students_count / classInfo.capacity) * 100)) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/classes')}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors"
          >
            <ArrowRight className={`w-5 h-5 text-slate-600 ${language === 'ar' ? 'rotate-180' : ''}`} />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                {classInfo.name}
              </h1>
              <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                classInfo.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                classInfo.status === 'STOPPED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                classInfo.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {t(`classes.status_${classInfo.status?.toLowerCase()}`, classInfo.status)}
              </span>
              <button 
                onClick={handleOpenEdit}
                className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                title={t('common.edit')}
              >
                <Edit className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
              <span className="font-mono bg-slate-100 px-2 rounded text-slate-700">{classInfo.matricule}</span>
              <span>•</span>
              <span>{language === 'ar' ? classInfo.track_name_ar : classInfo.track_name_en}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Class Info */}
        <div className="space-y-6">
          {/* Main Info Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-600" />
              {t('classes.subtitle')}
            </h3>
            
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-slate-500 mb-1">{t('classes.grade_level_label')}</span>
                  <span className="font-bold text-slate-800">{classInfo.grade_level}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 mb-1">{t('classes.section_label')}</span>
                  <span className="font-bold text-slate-800">{classInfo.section}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {t('classes.classroom_label')}
                  </span>
                  <span className="font-bold font-mono text-slate-800">{classInfo.classroom || t('common.not_available', 'N/A')}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 mb-1">{t('classes.academic_year_label')}</span>
                  <span className="font-bold text-slate-800">{classInfo.academic_year_name}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <span className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> {t('classes.homeroom_teacher_label')}
                </span>
                <span className="font-bold text-slate-800">
                  {classInfo.homeroom_teacher_name || <span className="text-slate-400 italic">{t('classes.no_homeroom_teacher')}</span>}
                </span>
                {classInfo.homeroom_teacher_phone && (
                  <span className="block text-xs font-mono text-slate-500 mt-0.5">{classInfo.homeroom_teacher_phone}</span>
                )}
              </div>
            </div>
          </div>

          {/* Occupancy Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-600" />
              {t('classes.occupancy_label')}
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{t('classes.students_enrolled')}:</span>
                <span className="font-black text-slate-900">
                  {classInfo.enrolled_students_count} / {classInfo.capacity}
                </span>
              </div>
              
              <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    occupancy >= 90 ? 'bg-rose-500' : (occupancy >= 70 ? 'bg-amber-500' : 'bg-emerald-500')
                  }`}
                  style={{ width: `${occupancy}%` }}
                />
              </div>
              <p className="text-xs text-slate-500 text-right mt-1">{occupancy}% {t('classes.full_text')}</p>
            </div>
          </div>
        </div>

        {/* Right Column: Roster */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                {t('classes.view_roster')} ({roster.length})
              </h3>
            </div>
            
            <div className="flex-1 overflow-auto p-0">
              {roster.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-3">
                  <Users className="w-12 h-12 text-slate-200" />
                  <p>{t('classes.roster_empty')}</p>
                </div>
              ) : (
                <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
                  <thead className="bg-slate-50 text-slate-600 text-xs uppercase font-bold sticky top-0 z-10 shadow-sm">
                    <tr>
                      <th className="px-4 py-3">{t('students.col_matricule')}</th>
                      <th className="px-4 py-3">{t('students.col_name')}</th>
                      <th className="px-4 py-3">{t('students.col_gender')}</th>
                      <th className="px-4 py-3">{t('students.parent_name')}</th>
                      <th className="px-4 py-3">{t('students.parent_phone')}</th>
                      <th className="px-4 py-3 text-center w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {roster.map(student => (
                      <tr key={student.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3 font-mono font-bold text-slate-600">
                          <Link to={`/students/${student.id}`} className="hover:text-emerald-600 hover:underline">
                            {student.matricule}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/students/${student.id}`} className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {language === 'ar' ? `${student.first_name_ar} ${student.last_name_ar}` : `${student.first_name_en} ${student.last_name_en}`}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {student.gender === 'MALE' ? t('students.gender_male') : t('students.gender_female')}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{student.parent_name || '-'}</td>
                        <td className="px-4 py-3 font-mono text-slate-600">{student.parent_phone || '-'}</td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => navigate(`/students/${student.id}?print=true`)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title={t('students.print_dossier', 'طباعة الملف')}
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Class Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t('classes.modal_edit_title')}
        maxWidth="max-w-xl"
      >
        {editForm && (
          <form onSubmit={handleUpdateClass} className="space-y-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.class_name')} *</label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('classes.academic_track')} *</label>
                <select
                  required
                  value={editForm.academic_track_id}
                  onChange={e => setEditForm({ ...editForm, academic_track_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {tracks.map(tr => (
                    <option key={tr.id} value={tr.id}>{isRTL ? tr.name_ar : (tr.name_fr || tr.name_en || tr.name_ar)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('classes.grade_level')} *</label>
                <input
                  type="text"
                  required
                  value={editForm.grade_level}
                  onChange={e => setEditForm({ ...editForm, grade_level: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('classes.max_capacity')}</label>
                <input
                  type="number"
                  value={editForm.capacity}
                  onChange={e => setEditForm({ ...editForm, capacity: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('classes.room_name')}</label>
                <input
                  type="text"
                  value={editForm.classroom}
                  onChange={e => setEditForm({ ...editForm, classroom: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.homeroom_teacher')}</label>
              <select
                value={editForm.homeroom_teacher_id}
                onChange={e => setEditForm({ ...editForm, homeroom_teacher_id: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">{t('classes.select_teacher')}</option>
                {teachers.map(tea => (
                  <option key={tea.id} value={tea.id}>{tea.first_name} {tea.last_name} ({tea.specialty})</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('classes.pricing_type')}</label>
                <select
                  required
                  value={editForm.pricing_type}
                  onChange={e => handlePricingTypeChange(setEditForm, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="MONTH_BASED">{t('classes.pricing_monthly')}</option>
                  <option value="SESSION_BASED">{t('classes.pricing_session')}</option>
                  <option value="HOUR_BASED">{t('classes.pricing_hourly')}</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('classes.pricing_value')}</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0"
                    step="500"
                    value={editForm.pricing_value}
                    onChange={e => setEditForm({ ...editForm, pricing_value: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-10 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                  <div className="absolute inset-y-0 right-0 flex flex-col border-l border-slate-200">
                    <button
                      type="button"
                      onClick={() => adjustPricingValue(setEditForm, editForm.pricing_value, 500)}
                      className="w-8 h-1/2 border-b border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-tr-xl"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustPricingValue(setEditForm, editForm.pricing_value, -500)}
                      className="w-8 h-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-br-xl"
                    >
                      −
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('timetable.title')}</label>
              <div className="space-y-2.5 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                {DAY_OPTIONS.map((day) => (
                  <div key={day} className="grid grid-cols-[minmax(100px,140px)_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 rounded-xl bg-white px-2 py-2 border border-slate-200">
                    <label className="flex items-center gap-2 text-[11px] font-bold text-slate-700 min-w-0">
                      <input
                        type="checkbox"
                        checked={!!daySchedule[day]?.enabled}
                        onChange={(e) => {
                          setDaySchedule((prev) => ({
                            ...prev,
                            [day]: {
                              ...prev[day],
                              enabled: e.target.checked,
                              start: e.target.checked && !prev[day]?.start ? '08:00' : prev[day]?.start || '08:00',
                              end: e.target.checked && !prev[day]?.end ? '09:00' : prev[day]?.end || '09:00'
                            }
                          }));
                        }}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="truncate">{t(`timetable.days.${day}`)}</span>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">{t('common.start_time')}</span>
                      <TimeInput
                        
                        value={daySchedule[day]?.start || '08:00'}
                        disabled={!daySchedule[day]?.enabled}
                        onChange={(e) => {
                          setDaySchedule((prev) => ({
                            ...prev,
                            [day]: { ...prev[day], start: e.target.value }
                          }));
                        }}
                        className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>

                    <span className="text-center text-[10px] font-bold text-slate-500">-</span>

                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">{t('common.end_time')}</span>
                      <TimeInput
                        
                        value={daySchedule[day]?.end || '09:00'}
                        disabled={!daySchedule[day]?.enabled}
                        onChange={(e) => {
                          setDaySchedule((prev) => ({
                            ...prev,
                            [day]: { ...prev[day], end: e.target.value }
                          }));
                        }}
                        className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('common.status', 'Status')}</label>
              <select
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {getAllowedStatusOptions(editForm.status).map((status) => (
                  <option key={status} value={status}>{t(`classes.status_${status.toLowerCase()}`, status)}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                {t('common.save')}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
