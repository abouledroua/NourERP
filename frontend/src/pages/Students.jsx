import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  FileSpreadsheet,
  Filter,
  Edit,
  Trash2,
  GraduationCap,
  User,
  Phone,
  Calendar,
  Award,
  Clock,
  Wallet,
  Sparkles,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import Modal from '../components/Modal';
import PhotoUpload from '../components/PhotoUpload';
import { useToast, useConfirm } from '../context/UIFeedbackContext';

export default function Students() {
  const navigate = useNavigate();
  const { t, isRTL } = useLanguage();
  const { settings, tracks } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();

  const [students, setStudents] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedTrack, setSelectedTrack] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const initialFormState = {
    national_id: '',
    first_name_ar: '',
    last_name_ar: '',
    first_name_en: '',
    last_name_en: '',
    gender: '',
    birth_date: '',
    birth_place: '',
    blood_group: '',
    academic_track_id: '',
    status: 'ACTIVE',
    parent_name: '',
    parent_phone: '',
    parent_email: '',
    parent_job: '',
    address: '',
    maladies: '',
    medical_notes: '',
    photo_url: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedTrack) params.append('trackId', selectedTrack);
      if (selectedClass) params.append('classId', selectedClass);
      if (selectedStatus) params.append('status', selectedStatus);

      const res = await api.get(`/students?${params.toString()}`);
      if (res.success) setStudents(res.data);
    } catch (err) {
      console.error('[STUDENTS] Error fetching list:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      if (res.success) setClasses(res.data);
    } catch (err) {
      console.error('[STUDENTS] Error fetching classes:', err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchStudents();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedTrack, selectedClass, selectedStatus]);

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      ...initialFormState,
      academic_track_id: tracks[0]?.id || ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (st) => {
    setEditingStudent(st);
    setFormData({
      national_id: st.national_id || '',
      first_name_ar: st.first_name_ar || '',
      last_name_ar: st.last_name_ar || '',
      first_name_en: st.first_name_en || '',
      last_name_en: st.last_name_en || '',
      gender: st.gender || 'MALE',
      birth_date: st.birth_date ? st.birth_date.split('T')[0] : '2018-05-15',
      birth_place: st.birth_place || '',
      blood_group: st.blood_group || 'O+',
      academic_track_id: st.academic_track_id || '',
      status: st.status || 'ACTIVE',
      parent_name: st.parent_name || '',
      parent_phone: st.parent_phone || '',
      parent_email: st.parent_email || '',
      parent_job: st.parent_job || '',
      address: st.address || '',
      maladies: st.maladies || '',
      medical_notes: st.medical_notes || '',
      photo_url: st.photo_url || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitStudent = async (e) => {
    e.preventDefault();
    try {
      if (editingStudent) {
        const res = await api.put(`/students/${editingStudent.id}`, formData);
        if (res.success) {
          toast.success(res.message || t('toast.student_updated', 'تم تحديث بيانات التلميذ بنجاح'));
          setIsModalOpen(false);
          setEditingStudent(null);
          fetchStudents();
        }
      } else {
        const res = await api.post('/students', formData);
        if (res.success) {
          toast.success(res.message || t('toast.student_created', 'تم تسجيل التلميذ بنجاح'));
          setIsModalOpen(false);
          setFormData(initialFormState);
          fetchStudents();
        }
      }
    } catch (err) {
      toast.error(err.message || t('toast.student_save_failed', 'فشل حفظ بيانات التلميذ'));
    }
  };

  const handleDeleteStudent = async (st) => {
    const studentName = `${st.first_name_ar} ${st.last_name_ar}`;
    const confirmed = await confirm({
      title: t('dialog.delete_student_title'),
      message: t('dialog.delete_student_msg', { name: studentName, matricule: st.matricule }),
      confirmText: t('dialog.confirm_delete_student'),
      cancelText: t('dialog.cancel_btn'),
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await api.delete(`/students/${st.id}`);
      if (res.success) {
        toast.success(res.message || t('toast.student_deleted'));
        fetchStudents();
      }
    } catch (err) {
      toast.error(err.message || t('toast.student_delete_failed'));
    }
  };

  const handleExportExcel = () => {
    window.open('/api/students/export/excel', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('students.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('students.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 rounded-2xl text-xs font-bold shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>{t('students.export_excel')}</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('students.add_btn')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <div className="absolute inset-y-0 right-0 rtl:right-0 ltr:left-0 pr-3.5 rtl:pr-3.5 ltr:pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('students.search_placeholder')}
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 rtl:pr-10 ltr:pl-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Track Filter */}
        <select
          value={selectedTrack}
          onChange={(e) => setSelectedTrack(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t('students.filter_track')}</option>
          {tracks.map(t => (
            <option key={t.id} value={t.id}>{t.name_ar}</option>
          ))}
        </select>

        {/* Class Filter */}
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t('students.filter_class')}</option>
          {classes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t('students.filter_status')}</option>
          <option value="ACTIVE">{t('students.status_active', 'نشط مداوم')}</option>
          <option value="GRADUATED">{t('students.status_graduated', 'متخرج')}</option>
          <option value="TRANSFERRED">{t('students.status_transferred', 'محول')}</option>
          <option value="SUSPENDED">{t('students.status_suspended', 'معلق')}</option>
        </select>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">{t('students.col_matricule')}</th>
                <th className="py-3.5 px-4">{t('students.col_name')}</th>
                <th className="py-3.5 px-4">{t('students.col_gender')}</th>
                <th className="py-3.5 px-4">{t('students.col_class')}</th>
                <th className="py-3.5 px-4">{t('students.col_track')}</th>
                <th className="py-3.5 px-4">{t('students.col_parent')}</th>
                <th className="py-3.5 px-4">{t('students.col_debt')}</th>
                <th className="py-3.5 px-4">{t('students.col_status')}</th>
                <th className="py-3.5 px-4 text-center">{t('students.col_actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    {t('common.loading')}
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400">
                    {t('students.no_results', 'لا يوجد تلاميذ يطابقون شروط البحث')}
                  </td>
                </tr>
              ) : (
                students.map((st) => (
                  <tr key={st.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{st.matricule}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => navigate(`/students/${st.id}`)}
                        className="flex items-center gap-2.5 text-right rtl:text-right ltr:text-left group transition-all duration-150 focus:outline-none"
                        title={t('students.view_details', 'عرض ملف التلميذ')}
                      >
                        {st.photo_url ? (
                          <img
                            src={st.photo_url}
                            alt={`${st.first_name_ar} ${st.last_name_ar}`}
                            className="w-8 h-8 rounded-full object-cover border border-emerald-200 shadow-2xs flex-shrink-0 group-hover:ring-2 group-hover:ring-emerald-500/50 transition-all"
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                        ) : (
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold transition-all group-hover:ring-2 group-hover:ring-emerald-500/50 ${st.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'
                            }`}>
                            {st.first_name_ar ? st.first_name_ar.charAt(0) : 'ط'}
                          </div>
                        )}
                        <div>
                          <div className="font-extrabold text-slate-900 text-sm group-hover:text-emerald-600 transition-colors">
                            {st.first_name_ar} {st.last_name_ar}
                          </div>
                          {st.first_name_en && (
                            <div className="text-[10px] text-slate-400 group-hover:text-slate-500 transition-colors">{st.first_name_en} {st.last_name_en}</div>
                          )}
                        </div>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${st.gender === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                        }`}>
                        {st.gender === 'MALE' ? t('students.gender_male', 'ذكر') : t('students.gender_female', 'أنثى')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {st.all_classes_names ? (
                        <div className="flex flex-wrap gap-1 max-w-[220px]">
                          {st.all_classes_names.split(',').map((cName, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                              {cName.trim()}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-medium">{st.class_name || '-'}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700">
                        {st.track_name_ar}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">{st.parent_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{st.parent_phone}</div>
                    </td>
                    <td className="py-3 px-4">
                      {Number(st.total_debt) > 0 ? (
                        <span className="font-bold text-rose-600 font-mono">
                          {formatCurrency(st.total_debt, settings.currency)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 font-medium text-[11px]">{t('students.cleared', 'مستوفى 0.00')}</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${st.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                          : 'bg-slate-100 text-slate-600'
                        }`}>
                        {st.status === 'ACTIVE' ? t('students.status_active') : (t(`students.status_${st.status?.toLowerCase()}`, st.status))}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(st)}
                          title={t('students.edit', 'تعديل البيانات')}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(st)}
                          title={t('students.delete', 'حذف الملف')}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL: ENROLL / EDIT STUDENT
          ========================================================================= */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingStudent(null);
        }}
        title={editingStudent
          ? `${t('students.edit', 'تعديل بيانات التلميذ')}: ${editingStudent.first_name_ar} ${editingStudent.last_name_ar} (${editingStudent.matricule})`
          : t('students.modal_add_title')}
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleSubmitStudent} className="space-y-4">
          {/* Photo Upload Component */}
          <PhotoUpload
            photoUrl={formData.photo_url}
            onChange={(url) => setFormData(prev => ({ ...prev, photo_url: url }))}
            uploadEndpoint="/upload/student"
            label={t('photo_upload.label')}
            shape="circle"
          />

          {/* Section: Personal Info */}
          <div>
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
              {t('students.section_personal')}
            </h4>
            {/* Arabic Name & Surname */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.first_name_ar')} *</label>
                <input
                  type="text"
                  required
                  value={formData.first_name_ar}
                  onChange={e => setFormData({ ...formData, first_name_ar: e.target.value })}
                  placeholder={t('students.first_name_placeholder', 'يونس')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.last_name_ar')} *</label>
                <input
                  type="text"
                  required
                  value={formData.last_name_ar}
                  onChange={e => setFormData({ ...formData, last_name_ar: e.target.value })}
                  placeholder={t('students.last_name_placeholder', 'المنصوري')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            {/* French Name & Surname (Prénom & Nom) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('students.first_name_fr')}
                </label>
                <input
                  type="text"
                  value={formData.first_name_en}
                  onChange={e => setFormData({ ...formData, first_name_en: e.target.value })}
                  placeholder="ex: Younes"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('students.last_name_fr')}
                </label>
                <input
                  type="text"
                  value={formData.last_name_en}
                  onChange={e => setFormData({ ...formData, last_name_en: e.target.value })}
                  placeholder="ex: Mansouri"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.col_gender')}</label>
                <select
                  value={formData.gender}
                  onChange={e => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="MALE">{t('students.gender_male')}</option>
                  <option value="FEMALE">{t('students.gender_female')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.birth_date')} *</label>
                <input
                  type="date"
                  required
                  value={formData.birth_date}
                  onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.birth_place')}</label>
                <input
                  type="text"
                  value={formData.birth_place || ''}
                  onChange={e => setFormData({ ...formData, birth_place: e.target.value })}
                  placeholder={t('students.birth_place_placeholder', 'الجزائر العاصمة / Alger')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.blood_group')}</label>
                <input
                  type="text"
                  value={formData.blood_group}
                  onChange={e => setFormData({ ...formData, blood_group: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="O+"
                />
              </div>
            </div>

            {/* National ID */}
            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('students.national_id', 'رقم التعريف الوطني (NIN)')}
              </label>
              <input
                type="text"
                value={formData.national_id || ''}
                onChange={e => setFormData({ ...formData, national_id: e.target.value })}
                placeholder={t('students.nin_placeholder', '18 رقماً أو رقم بطاقة التعريف الوطنية')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Academic Placement */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
              {t('students.section_academic')}
            </h4>
            <div className={`grid grid-cols-1 ${editingStudent ? 'sm:grid-cols-2' : 'sm:grid-cols-1'} gap-4`}>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.academic_track')} *</label>
                <select
                  required
                  value={formData.academic_track_id}
                  onChange={e => setFormData({ ...formData, academic_track_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">{t('students.filter_track')}</option>
                  {tracks.map(tItem => (
                    <option key={tItem.id} value={tItem.id}>
                      {isRTL ? tItem.name_ar : (tItem.name_fr || tItem.name_en || tItem.name_ar)}
                    </option>
                  ))}
                </select>
              </div>
              {editingStudent && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.col_status')}</label>
                  <select
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="ACTIVE">{t('students.status_active', 'نشط (مداوم)')}</option>
                    <option value="GRADUATED">{t('students.status_graduated', 'متخرج')}</option>
                    <option value="TRANSFERRED">{t('students.status_transferred', 'محول')}</option>
                    <option value="SUSPENDED">{t('students.status_suspended', 'معلق')}</option>
                    <option value="EXPELLED">{t('students.status_expelled', 'مفصول')}</option>
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* Parent Guardian Details */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-3">
              {t('students.section_parent')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.parent_name')} *</label>
                <input
                  type="text"
                  required
                  value={formData.parent_name}
                  onChange={e => setFormData({ ...formData, parent_name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.parent_phone')} *</label>
                <input
                  type="text"
                  required
                  value={formData.parent_phone}
                  onChange={e => setFormData({ ...formData, parent_phone: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="0550 00 00 00"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.parent_email', 'البريد الإلكتروني للولي')}</label>
                <input
                  type="email"
                  value={formData.parent_email || ''}
                  onChange={e => setFormData({ ...formData, parent_email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="parent@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.parent_job', 'مهنة الولي')}</label>
                <input
                  type="text"
                  value={formData.parent_job || ''}
                  onChange={e => setFormData({ ...formData, parent_job: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder={t('students.parent_job_placeholder', 'مهندس، تاجر، موظف...')}
                />
              </div>
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.address', 'العنوان السكني')}</label>
              <input
                type="text"
                value={formData.address || ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder={t('students.address_placeholder', 'الحي، البلدية، الولاية')}
              />
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.maladies', 'الأمراض (إن وجدت)')}</label>
              <textarea
                rows={2}
                value={formData.maladies || ''}
                onChange={e => setFormData({ ...formData, maladies: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder={t('students.maladies_placeholder', 'سجل الأمراض أو الحالات المزمنة هنا...')}
              />
            </div>

            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.medical_notes', 'ملاحظات صحية أو حساسية')}</label>
              <textarea
                rows={2}
                value={formData.medical_notes || ''}
                onChange={e => setFormData({ ...formData, medical_notes: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder={t('students.medical_notes_placeholder', 'حساسية، أمراض مزمنة، أدوية خاصة إن وجدت...')}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingStudent(null);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
            >
              {editingStudent ? t('common.save_changes', 'تحديث البيانات') : t('common.save', 'حفظ التلميذ')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
