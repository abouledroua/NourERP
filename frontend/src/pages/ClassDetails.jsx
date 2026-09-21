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

export default function ClassDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language, isRTL } = useLanguage();
  const { tracks } = useSettings();
  const toast = useToast();
  
  const [classInfo, setClassInfo] = useState(null);
  const [roster, setRoster] = useState([]);
  const [teachers, setTeachers] = useState([]);
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
      setEditForm({
        name: classInfo.name,
        academic_track_id: classInfo.academic_track_id,
        grade_level: classInfo.grade_level,
        section: classInfo.section || '',
        capacity: classInfo.capacity,
        classroom: classInfo.classroom || '',
        homeroom_teacher_id: classInfo.homeroom_teacher_id || '',
        pricing_type: classInfo.pricing_type || 'MONTHLY',
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
      const res = await api.put(`/classes/${id}`, editForm);
      if (res.success) {
        toast.success(res.message || t('toast.class_updated', 'Class updated successfully'));
        setIsEditModalOpen(false);
        fetchClassDetails();
      }
    } catch (err) {
      toast.error(err.message || t('toast.update_failed', 'Failed to update class'));
    }
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
        <h2 className="text-xl font-bold text-slate-800 mb-2">Class Not Found</h2>
        <button onClick={() => navigate('/classes')} className="text-emerald-600 hover:underline">
          Return to Classes List
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
                'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                {classInfo.status}
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
                  <span className="block text-xs text-slate-500 mb-1">Grade Level</span>
                  <span className="font-bold text-slate-800">{classInfo.grade_level}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 mb-1">Section</span>
                  <span className="font-bold text-slate-800">{classInfo.section}</span>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Classroom
                  </span>
                  <span className="font-bold font-mono text-slate-800">{classInfo.classroom || 'N/A'}</span>
                </div>
                <div>
                  <span className="block text-xs text-slate-500 mb-1">Academic Year</span>
                  <span className="font-bold text-slate-800">{classInfo.academic_year_name}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <span className="block text-xs text-slate-500 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3 h-3" /> Homeroom Teacher
                </span>
                <span className="font-bold text-slate-800">
                  {classInfo.homeroom_teacher_name || <span className="text-slate-400 italic">None Assigned</span>}
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
              Occupancy
            </h3>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Students Enrolled:</span>
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
              <p className="text-xs text-slate-500 text-right mt-1">{occupancy}% Full</p>
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
                      <th className="px-4 py-3">Gender</th>
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
                          {student.gender === 'MALE' ? 'ذكر' : 'أنثى'}
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
        title={t('classes.modal_edit_title', 'Edit Class')}
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
                <label className="block font-bold text-slate-700 mb-1">نوع التسعيرة / Pricing Type</label>
                <select
                  required
                  value={editForm.pricing_type}
                  onChange={e => setEditForm({ ...editForm, pricing_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="MONTHLY">شهري (Monthly)</option>
                  <option value="SESSION">بالحصة (Per Session)</option>
                  <option value="HOURLY">بالساعة (Hourly)</option>
                </select>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">السعر / Price</label>
                <input
                  type="number"
                  required
                  value={editForm.pricing_value}
                  onChange={e => setEditForm({ ...editForm, pricing_value: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">التوقيت / Schedule Info</label>
              <input
                type="text"
                value={editForm.schedule_info}
                onChange={e => setEditForm({ ...editForm, schedule_info: e.target.value })}
                placeholder="مثال: السبت والثلاثاء 10:00 إلى 12:00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('common.status', 'Status')}</label>
              <select
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="STOPPED">STOPPED</option>
                <option value="PENDING">PENDING</option>
                <option value="ARCHIVED">ARCHIVED</option>
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
