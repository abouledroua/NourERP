import React, { useState, useEffect, useRef } from 'react';
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
  AlertCircle,
  Check
} from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import Modal from '../components/Modal';
import PhotoUpload from '../components/PhotoUpload';
import { useToast, useConfirm } from '../context/UIFeedbackContext';
import ArabicInput from '../components/ArabicInput';
import DateInput from '../components/DateInput';

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
  const [selectedDebt, setSelectedDebt] = useState('');

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const firstNameArRef = useRef(null);

  useEffect(() => {
    if (isModalOpen && !editingStudent) {
      const timer = setTimeout(() => {
        firstNameArRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isModalOpen, editingStudent]);

  const defaultParents = [
    {
      id: 1,
      relationship: 'FATHER',
      name: '',
      nin: '',
      phone: '',
      email: '',
      job: '',
      is_primary: true
    }
  ];

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
    parents: defaultParents,
    parent_name: '',
    parent_phone: '',
    phone: '',
    email: '',
    parent_email: '',
    parent_job: '',
    address: '',
    maladies: '',
    medical_notes: '',
    photo_url: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const resolveGuardianRelationship = (parents, index, matchedRelationship) => {
    const desiredRelationship =
      matchedRelationship === 'MOTHER' ? 'MOTHER' : 'FATHER';

    const hasFather = parents.some((p, i) => i !== index && p.relationship === 'FATHER');
    const hasMother = parents.some((p, i) => i !== index && p.relationship === 'MOTHER');

    if (desiredRelationship === 'FATHER' && hasFather) {
      return 'OTHER';
    }
    if (desiredRelationship === 'MOTHER' && hasMother) {
      return 'OTHER';
    }

    return desiredRelationship;
  };

  const lookupParentByNin = async (index, ninValue) => {
    const normalized = String(ninValue || '').replace(/\s+/g, '').replace(/[-_]/g, '');
    if (!normalized || normalized.length < 4) return;

    try {
      const res = await api.get('/parent/lookup', { params: { nin: normalized } });
      if (!res?.success || !res.found || !res.data) {
        setFormData(prev => {
          const updated = [...(prev.parents || [])];
          const current = updated[index] || {};
          updated[index] = {
            ...current,
            nin: normalized,
            name: '',
            phone: '',
            email: '',
            job: '',
          };
          return { ...prev, parents: updated };
        });
        toast.info('لا يوجد ولي أمر مسجل بهذا الرقم / No parent found for this NIN');
        return;
      }

      setFormData(prev => {
        const updated = [...(prev.parents || [])];
        const current = updated[index] || {};
        const matchedRelationship = res.data.relationship || 'FATHER';
        updated[index] = {
          ...current,
          nin: normalized,
          relationship: resolveGuardianRelationship(prev.parents || [], index, matchedRelationship),
          name: current.name?.trim() || res.data.name || '',
          phone: current.phone?.trim() || res.data.phone || '',
          email: current.email?.trim() || res.data.email || '',
          job: current.job?.trim() || res.data.job || '',
        };
        return { ...prev, parents: updated };
      });
    } catch (error) {
      console.warn('Could not auto-load guardian by NIN', error);
      toast.error(error.message || 'Unable to search parent by NIN');
    }
  };

  const handleAddParent = () => {
    const current = formData.parents || [];
    const defaultRel = current.some(p => p.relationship === 'FATHER') ? 'MOTHER' : 'GUARDIAN';
    setFormData({
      ...formData,
      parents: [
        ...current,
        {
          id: Date.now(),
          relationship: defaultRel,
          name: '',
          nin: '',
          phone: '',
          email: '',
          job: '',
          is_primary: current.length === 0
        }
      ]
    });
  };

  const handleRemoveParent = (indexToRemove) => {
    const current = [...(formData.parents || [])];
    current.splice(indexToRemove, 1);
    if (current.length > 0 && !current.some(p => p.is_primary)) {
      current[0].is_primary = true;
    }
    if (current.length === 0) {
      current.push({
        id: Date.now(),
        relationship: 'FATHER',
        name: '',
        nin: '',
        phone: '',
        email: '',
        job: '',
        is_primary: true
      });
    }
    setFormData({ ...formData, parents: current });
  };

  const handleParentChange = (index, field, value) => {
    const updated = [...(formData.parents || [])];
    if (field === 'is_primary' && value === true) {
      updated.forEach((p, i) => {
        p.is_primary = (i === index);
      });
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setFormData({ ...formData, parents: updated });
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/students', {
        params: {
          search: search || undefined,
          trackId: selectedTrack || undefined,
          classId: selectedClass || undefined,
          status: selectedStatus || undefined,
          debtStatus: selectedDebt || undefined,
          limit: 200
        }
      });
      if (res.success) {
        setStudents(res.data);
      }
    } catch (err) {
      toast.error(t('toast.student_load_failed'));
    } finally {
      setLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      if (res.success) {
        setClasses(res.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [search, selectedTrack, selectedClass, selectedStatus, selectedDebt]);

  const handleOpenAddModal = () => {
    setEditingStudent(null);
    setFormData({
      ...initialFormState,
      parents: [
        {
          id: 1,
          relationship: 'FATHER',
          name: '',
          nin: '',
          phone: '',
          email: '',
          job: '',
          is_primary: true
        }
      ],
      academic_track_id: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = async (st) => {
    setEditingStudent(st);
    let guardiansList = [];
    try {
      const res = await api.get(`/students/${st.id}`);
      if (res.success && res.data?.guardians) {
        guardiansList = res.data.guardians;
      }
    } catch (e) {
      console.error(e);
    }

    const loadedParents = guardiansList.length > 0 
      ? guardiansList.map((g, idx) => ({
          id: g.id || idx + 1,
          relationship: g.relationship || 'FATHER',
          name: g.name || '',
          nin: g.nin || '',
          phone: g.phone || '',
          email: g.email || '',
          job: g.job || '',
          is_primary: Boolean(g.is_primary)
        }))
      : [{
          id: 1,
          relationship: 'FATHER',
          name: st.parent_name || '',
          nin: '',
          phone: st.parent_phone || '',
          email: st.parent_email || '',
          job: st.parent_job || '',
          is_primary: true
        }];

    setFormData({
      national_id: st.national_id || '',
      first_name_ar: st.first_name_ar || '',
      last_name_ar: st.last_name_ar || '',
      first_name_en: st.first_name_en || '',
      last_name_en: st.last_name_en || '',
      gender: st.gender || 'MALE',
      birth_date: st.birth_date ? st.birth_date.split('T')[0] : '',
      birth_place: st.birth_place || '',
      blood_group: st.blood_group || '',
      academic_track_id: st.academic_track_id || '',
      status: st.status || 'ACTIVE',
      parents: loadedParents,
      parent_name: st.parent_name || '',
      parent_phone: st.parent_phone || '',
      phone: st.phone || '',
      email: st.email || '',
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
    const validParents = (formData.parents || []).map(p => ({
      relationship: p.relationship || 'FATHER',
      name: p.name ? p.name.trim() : '',
      nin: p.nin ? p.nin.trim().replace(/\s+/g, '').replace(/[-_]/g, '') : '',
      phone: p.phone ? p.phone.trim() : '',
      email: p.email ? p.email.trim().toLowerCase() : '',
      job: p.job ? p.job.trim() : '',
      is_primary: Boolean(p.is_primary)
    }));

    const seenNins = new Set();
    const duplicateNin = validParents.find((p) => {
      if (!p.nin) return false;
      if (seenNins.has(p.nin)) return true;
      seenNins.add(p.nin);
      return false;
    });

    if (duplicateNin) {
      toast.error('لا يمكن أن يتطابق رقم التعريف الوطني لاثنين من الأولياء / Two guardians cannot share the same NIN');
      return;
    }

    const primaryG = validParents.find(p => p.is_primary) || validParents[0] || {};

    const payload = {
      ...formData,
      first_name_en: formData.first_name_en ? formData.first_name_en.trim().toUpperCase() : '',
      last_name_en: formData.last_name_en ? formData.last_name_en.trim().toUpperCase() : '',
      email: formData.email ? formData.email.trim().toLowerCase() : '',
      parents: validParents,
      parent_name: primaryG.name || '',
      parent_phone: primaryG.phone || '',
      parent_email: primaryG.email || '',
      parent_job: primaryG.job || ''
    };
    if (!payload.birth_date) {
      toast.error(t('students.birth_date_required', 'تاريخ الميلاد إلزامي / Date de naissance obligatoire'));
      return;
    }
    if (!payload.academic_track_id) {
      toast.error(t('students.track_required', 'يرجى اختيار الطور التعليمي / Veuillez sélectionner un cycle'));
      return;
    }
    try {
      setIsSubmitting(true);
      if (editingStudent) {
        const res = await api.put(`/students/${editingStudent.id}`, payload);
        if (res.success) {
          if (Array.isArray(res.generatedPasswords) && res.generatedPasswords.length > 0) {
            const passwordText = res.generatedPasswords.map((entry) => `${entry.nin}: ${entry.password}`).join(' | ');
            toast.info(`Parent passwords generated: ${passwordText}`);
          }
          toast.success(res.message || t('toast.student_updated', 'تم تحديث بيانات التلميذ بنجاح'));
          setIsModalOpen(false);
          setEditingStudent(null);
          fetchStudents();
        }
      } else {
        const res = await api.post('/students', payload);
        if (res.success) {
          if (Array.isArray(res.generatedPasswords) && res.generatedPasswords.length > 0) {
            const passwordText = res.generatedPasswords.map((entry) => `${entry.nin}: ${entry.password}`).join(' | ');
            toast.info(`Parent passwords generated: ${passwordText}`);
          }
          toast.success(res.message || t('toast.student_created', 'تم تسجيل التلميذ بنجاح'));
          setIsModalOpen(false);
          setFormData(initialFormState);
          fetchStudents();
        }
      }
    } catch (err) {
      toast.error(err.message || t('toast.student_save_failed', 'فشل حفظ بيانات التلميذ'));
    } finally {
      setIsSubmitting(false);
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

  const handleExportExcel = async () => {
    try {
      const blob = await api.get('/students/export/excel');
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'students_directory.xlsx';
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(err.message || t('toast.export_failed', 'فشل تصدير ملف Excel'));
    }
  };

  const getParentRows = (st) => {
    const parents = [];

    try {
      let guardians = st.guardians_json;

      if (typeof guardians === 'string') {
        guardians = guardians ? JSON.parse(guardians) : [];
      }

      if (Array.isArray(guardians)) {
        guardians.forEach((guardian) => {
          if (guardian && (guardian.name || guardian.phone)) {
            parents.push({
              name: guardian.name || 'ولي أمر',
              phone: guardian.phone || ''
            });
          }
        });
      }
    } catch (error) {
      console.error('Failed to parse guardians_json for student', st.id, error);
    }

    if (parents.length === 0 && (st.parent_name || st.parent_phone)) {
      parents.push({
        name: st.parent_name || 'ولي أمر',
        phone: st.parent_phone || ''
      });
    }

    return parents;
  };

  const getGenderLabel = (gender) => {
    const normalized = String(gender || '').toUpperCase();

    if (normalized === 'MALE' || normalized === 'M') {
      return t('students.gender_male', 'ذكر');
    }

    if (normalized === 'FEMALE' || normalized === 'F') {
      return t('students.gender_female', 'أنثى');
    }

    return String(gender || '-');
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

        {/* Debt Filter */}
        <select
          value={selectedDebt}
          onChange={(e) => setSelectedDebt(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
        >
          <option value="">{t('students.filter_debt_all', 'جميع الوضعيات (الديون)')}</option>
          <option value="DEBT">{t('students.filter_debt_has', 'عليهم ديون مستحقة')}</option>
          <option value="CLEARED">{t('students.filter_debt_cleared', 'مستوفون (بدون ديون)')}</option>
        </select>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
              <tr className="[&>th]:text-right rtl:[&>th]:text-right ltr:[&>th]:text-left">
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
                students.map((st) => {
                  const parentRows = getParentRows(st);

                  return (
                    <tr key={st.id} className="hover:bg-slate-50/80 transition-colors rtl:text-right ltr:text-left">
                      <td className="py-3 px-4 font-mono font-bold text-slate-700 text-right rtl:text-right ltr:text-left">{st.matricule}</td>
                      <td className="py-3 px-4 text-right rtl:text-right ltr:text-left">
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
                      <td className="py-3 px-4 text-right rtl:text-right ltr:text-left">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${String(st.gender || '').toUpperCase() === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'
                          }`}>
                          {getGenderLabel(st.gender)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right rtl:text-right ltr:text-left">
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
                      <td className="py-3 px-4 text-right rtl:text-right ltr:text-left">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {st.track_name_ar}
                        </span>
                      </td>
                      <td className="py-3 px-4 align-top whitespace-normal max-w-[220px] text-right rtl:text-right ltr:text-left">
                        {parentRows.length > 0 ? (
                          <div className="space-y-1.5 break-words">
                            {parentRows.map((parent, idx) => (
                              <div key={`${st.id}-parent-${idx}`} className="leading-tight">
                                <div className="font-medium text-slate-800 break-words">{parent.name || '-'}</div>
                                {parent.phone && (
                                  <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 break-all">
                                    <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" /> {parent.phone}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                        {st.phone && (
                          <div className="text-[10px] text-blue-600 font-mono font-bold flex items-center gap-1 mt-1.5 break-all" title={t('students.student_phone', 'هاتف التلميذ')}>
                            <Phone className="w-2.5 h-2.5 text-blue-500 shrink-0" /> {st.phone}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right rtl:text-right ltr:text-left">
                        {Number(st.total_debt) > 0 ? (
                          <span className="font-bold text-rose-600 font-mono">
                            {formatCurrency(st.total_debt, settings.currency)}
                          </span>
                        ) : (
                          <span className="text-emerald-600 font-medium text-[11px]">{t('students.cleared', 'مستوفى 0.00')}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right rtl:text-right ltr:text-left">
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="md:hidden p-3 space-y-3">
          {loading ? (
            <div className="py-8 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              {t('common.loading')}
            </div>
          ) : students.length === 0 ? (
            <div className="py-10 text-center text-slate-400">
              {t('students.no_results', 'لا يوجد تلاميذ يطابقون شروط البحث')}
            </div>
          ) : (
            students.map((st) => {
              const parentRows = getParentRows(st);

              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => navigate(`/students/${st.id}`)}
                  className="w-full text-left rounded-2xl border border-slate-200 bg-slate-50 p-3 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {st.photo_url ? (
                        <img
                          src={st.photo_url}
                          alt={`${st.first_name_ar} ${st.last_name_ar}`}
                          className="w-9 h-9 rounded-full object-cover border border-emerald-200"
                        />
                      ) : (
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ${st.gender === 'MALE' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                          {st.first_name_ar ? st.first_name_ar.charAt(0) : 'ط'}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-black text-slate-900 text-sm truncate">{st.first_name_ar} {st.last_name_ar}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{st.matricule}</div>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold ${st.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {st.status === 'ACTIVE' ? t('students.status_active') : (t(`students.status_${st.status?.toLowerCase()}`, st.status))}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <div className="text-slate-400">{t('students.col_class')}</div>
                      <div className="font-semibold text-slate-700">{st.class_name || st.all_classes_names || '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">{t('students.col_track')}</div>
                      <div className="font-semibold text-slate-700">{st.track_name_ar || '-'}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">{t('students.col_gender')}</div>
                      <div className="font-semibold text-slate-700">
                        <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold ${String(st.gender || '').toUpperCase() === 'MALE' ? 'bg-blue-50 text-blue-700' : 'bg-pink-50 text-pink-700'}`}>
                          {getGenderLabel(st.gender)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1.5 text-[11px]">
                    <div className="text-slate-400">{t('students.col_parent')}</div>
                    {parentRows.length > 0 ? (
                      parentRows.map((parent, idx) => (
                        <div key={`${st.id}-mobile-parent-${idx}`} className="rounded-lg bg-white px-2 py-1.5 border border-slate-200/80">
                          <div className="font-semibold text-slate-800">{parent.name || '-'}</div>
                          {parent.phone && (
                            <div className="mt-0.5 text-slate-500 font-mono flex items-center gap-1 break-all">
                              <Phone className="w-2.5 h-2.5 text-slate-400 shrink-0" /> {parent.phone}
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-slate-400">-</div>
                    )}
                    {st.phone && (
                      <div className="text-blue-600 font-mono font-bold flex items-center gap-1 break-all">
                        <Phone className="w-2.5 h-2.5 text-blue-500 shrink-0" /> {st.phone}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-slate-400">{t('students.col_debt')}</div>
                      <div className="font-bold text-slate-800">
                        {Number(st.total_debt) > 0 ? (
                          <span className="text-rose-600 font-mono">{formatCurrency(st.total_debt, settings.currency)}</span>
                        ) : (
                          <span className="text-emerald-600">{t('students.cleared', 'مستوفى 0.00')}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleOpenEditModal(st); }}
                        title={t('students.edit', 'تعديل البيانات')}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteStudent(st); }}
                        title={t('students.delete', 'حذف الملف')}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </button>
              );
            })
          )}
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
        headerActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingStudent(null);
              }}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              {t('common.cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              form="studentModalForm"
              disabled={isSubmitting}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-600/30 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {isSubmitting ? 'جاري الحفظ...' : editingStudent ? t('common.save_changes', 'تحديث البيانات') : t('common.save', 'حفظ التلميذ')}
            </button>
          </div>
        }
      >
        <form id="studentModalForm" onSubmit={handleSubmitStudent} className="space-y-4">
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
                <ArabicInput
                  ref={firstNameArRef}
                  autoFocus={!editingStudent}
                  required
                  value={formData.first_name_ar}
                  onChange={e => setFormData({ ...formData, first_name_ar: e.target.value })}
                  placeholder={t('students.first_name_placeholder', 'إسم التلميذ')}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.last_name_ar')} *</label>
                <ArabicInput
                  required
                  value={formData.last_name_ar}
                  onChange={e => setFormData({ ...formData, last_name_ar: e.target.value })}
                  placeholder={t('students.last_name_placeholder', 'لقب التلميذ')}
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
                  onChange={e => setFormData({ ...formData, first_name_en: e.target.value.toUpperCase() })}
                  placeholder={t('students.first_name_fr')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('students.last_name_fr')}
                </label>
                <input
                  type="text"
                  value={formData.last_name_en}
                  onChange={e => setFormData({ ...formData, last_name_en: e.target.value.toUpperCase() })}
                  placeholder="ex: MANSOURI"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase font-semibold"
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
                <DateInput
                  required
                  value={formData.birth_date}
                  onChange={e => setFormData({ ...formData, birth_date: e.target.value })}
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

            {/* Student Phone, Email & National ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('students.student_phone', 'رقم هاتف التلميذ')}
                </label>
                <input
                  type="text"
                  value={formData.phone || ''}
                  onChange={e => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0550 00 00 00"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('students.student_email', 'البريد الإلكتروني للتلميذ')}
                </label>
                <input
                  type="email"
                  value={formData.email || ''}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  placeholder="eleve@example.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
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

            {/* Residential Address */}
            <div className="mt-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.address', 'العنوان السكني')}</label>
              <textarea
                rows={2}
                value={formData.address || ''}
                onChange={e => setFormData({ ...formData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder={t('students.address_placeholder', 'الحي، البلدية، الولاية')}
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
                  <option value="" disabled>{t('students.select_track', '-- اختر الطور التعليمي --')}</option>
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

          {/* Health & Medical Information */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
              {t('students.section_medical', 'الحالة الصحية والملاحظات الطبية')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.maladies', 'الأمراض (إن وجدت)')}</label>
                <textarea
                  rows={2}
                  value={formData.maladies || ''}
                  onChange={e => setFormData({ ...formData, maladies: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder={t('students.maladies_placeholder', 'سجل الأمراض أو الحالات المزمنة هنا...')}
                />
              </div>
              <div>
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
          </div>

          {/* Parent Guardian Details (Multi-parent Support) */}
          <div className="pt-2 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div>
                <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                  {t('students.section_parent', 'بيانات الأولياء والمراسلة')}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {t('students.section_parent_desc', 'يمكنك إضافة معلومات أكثر من ولي أمر أو جهة اتصال (الأب، الأم، الولي الشرعي...)')}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddParent}
                className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/80 rounded-xl text-xs font-bold transition-all shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('students.add_parent', 'إضافة ولي أمر آخر')}</span>
              </button>
            </div>

            <div className="space-y-3">
              {(formData.parents || []).map((parent, idx) => (
                <div
                  key={parent.id || idx}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    parent.is_primary
                      ? 'bg-emerald-50/40 border-emerald-200/80 ring-1 ring-emerald-500/10'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-200/60">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-bold text-slate-800">
                        {parent.relationship === 'FATHER' ? t('students.rel_father', 'الأب')
                          : parent.relationship === 'MOTHER' ? t('students.rel_mother', 'الأم')
                          : parent.relationship === 'GUARDIAN' ? t('students.rel_guardian', 'الولي القانوني')
                          : t('students.rel_other', 'آخر')}
                      </span>
                      {parent.is_primary && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-600 text-white shadow-2xs">
                          {t('students.primary_tag', 'رئيسي')}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
                        <input
                          type="radio"
                          name={`primary_guardian_radio_${idx}`}
                          checked={Boolean(parent.is_primary)}
                          onChange={() => handleParentChange(idx, 'is_primary', true)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-[11px] font-medium text-slate-700">{t('students.is_primary_guardian', 'الولي الرئيسي')}</span>
                      </label>

                      {formData.parents.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveParent(idx)}
                          className="p-1.5 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                          title={t('students.remove_parent', 'حذف')}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {t('students.parent_relationship', 'صلة القرابة')}
                      </label>
                      <select
                        value={parent.relationship || 'FATHER'}
                        onChange={e => handleParentChange(idx, 'relationship', e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="FATHER">{t('students.rel_father', 'الأب')}</option>
                        <option value="MOTHER">{t('students.rel_mother', 'الأم')}</option>
                        <option value="GUARDIAN">{t('students.rel_guardian', 'الولي القانوني')}</option>
                        <option value="OTHER">{t('students.rel_other', 'آخر')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {t('students.parent_nin', 'رقم التعريف الوطني')}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={parent.nin || ''}
                          onChange={e => handleParentChange(idx, 'nin', e.target.value)}
                          onBlur={() => {
                            if (parent.nin) {
                              lookupParentByNin(idx, parent.nin);
                            }
                          }}
                          placeholder={t('students.nin_placeholder', '18 رقماً أو رقم بطاقة التعريف الوطنية')}
                          className="flex-1 bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => lookupParentByNin(idx, parent.nin)}
                          className="inline-flex items-center justify-center px-2.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-xl transition-colors"
                          title={t('students.search_parent_by_nin', 'بحث عن ولي أمر بهذا الرقم')}
                        >
                          <Search className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {t('students.parent_name', 'اسم ولقب الولي')}
                      </label>
                      <input
                        type="text"
                        value={parent.name || ''}
                        onChange={e => handleParentChange(idx, 'name', e.target.value)}
                        placeholder="ex: Mohamed Mansouri"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {t('students.parent_phone', 'رقم الهاتف')}
                      </label>
                      <input
                        type="text"
                        value={parent.phone || ''}
                        onChange={e => handleParentChange(idx, 'phone', e.target.value)}
                        placeholder="0550 00 00 00"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {t('students.parent_job', 'المهنة')}
                      </label>
                      <input
                        type="text"
                        value={parent.job || ''}
                        onChange={e => handleParentChange(idx, 'job', e.target.value)}
                        placeholder={t('students.parent_job_placeholder', 'مهندس، تاجر، موظف...')}
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">
                        {t('students.parent_email', 'البريد الإلكتروني')}
                      </label>
                      <input
                        type="email"
                        value={parent.email || ''}
                        onChange={e => handleParentChange(idx, 'email', e.target.value)}
                        placeholder="parent@example.com"
                        className="w-full bg-white border border-slate-200 rounded-xl p-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
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
              disabled={isSubmitting}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
            >
              {isSubmitting ? 'جاري الحفظ...' : editingStudent ? t('common.save_changes', 'تحديث البيانات') : t('common.save', 'حفظ التلميذ')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
