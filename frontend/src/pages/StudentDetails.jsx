import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import {
  ArrowRight,
  ArrowLeft,
  ArrowRightLeft,
  GraduationCap,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  HeartPulse,
  Briefcase,
  Award,
  Clock,
  Wallet,
  Printer,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  FileText,
  ShoppingBag,
  Sparkles,
  BookOpen,
  Edit,
  Plus,
  Trash2,
  Users,
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

export default function StudentDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { t, isRTL } = useLanguage();
  const { settings, tracks } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [classes, setClasses] = useState([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignFormData, setAssignFormData] = useState({
    class_id: '',
    roll_number: '',
    remarks: ''
  });
  const [assigningClass, setAssigningClass] = useState(false);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFormData, setTransferFormData] = useState({
    from_class_id: '',
    from_class_name: '',
    to_class_id: '',
    remarks: ''
  });
  const [transferringClass, setTransferringClass] = useState(false);
  const defaultParents = [
    {
      id: 1,
      relationship: 'FATHER',
      name: '',
      phone: '',
      email: '',
      job: '',
      is_primary: true
    }
  ];

  const [editFormData, setEditFormData] = useState({
    national_id: '',
    first_name_ar: '',
    last_name_ar: '',
    first_name_en: '',
    last_name_en: '',
    gender: 'MALE',
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
  });

  const handleAddParent = () => {
    const current = editFormData.parents || [];
    const defaultRel = current.some(p => p.relationship === 'FATHER') ? 'MOTHER' : 'GUARDIAN';
    setEditFormData({
      ...editFormData,
      parents: [
        ...current,
        {
          id: Date.now(),
          relationship: defaultRel,
          name: '',
          phone: '',
          email: '',
          job: '',
          is_primary: current.length === 0
        }
      ]
    });
  };

  const handleRemoveParent = (indexToRemove) => {
    const current = [...(editFormData.parents || [])];
    current.splice(indexToRemove, 1);
    if (current.length > 0 && !current.some(p => p.is_primary)) {
      current[0].is_primary = true;
    }
    if (current.length === 0) {
      current.push({
        id: Date.now(),
        relationship: 'FATHER',
        name: '',
        phone: '',
        email: '',
        job: '',
        is_primary: true
      });
    }
    setEditFormData({ ...editFormData, parents: current });
  };

  const handleParentChange = (index, field, value) => {
    const updated = [...(editFormData.parents || [])];
    if (field === 'is_primary' && value === true) {
      updated.forEach((p, i) => {
        p.is_primary = (i === index);
      });
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setEditFormData({ ...editFormData, parents: updated });
  };

  useEffect(() => {
    fetchStudentDossier();
    fetchClasses();
  }, [id]);

  const fetchClasses = async () => {
    try {
      const res = await api.get('/classes');
      if (res.success) setClasses(res.data);
    } catch (err) {
      console.error('[STUDENT_DETAILS] Error fetching classes:', err);
    }
  };

  const fetchStudentDossier = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/students/${id}`);
      if (res.success && res.data) {
        setDossier(res.data);
      } else {
        setError(res.message || t('students.student_load_failed', 'تعذر تحميل بيانات التلميذ'));
      }
    } catch (err) {
      console.error('[STUDENT_DETAILS] Error loading dossier:', err);
      setError(err.message || t('students.student_load_failed', 'تعذر تحميل بيانات التلميذ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && dossier?.student) {
      const params = new URLSearchParams(location.search);
      if (params.get('print') === 'true') {
        setTimeout(() => {
          window.print();
        }, 500);
      }
    }
  }, [loading, dossier, location.search]);

  const handleOpenEditModal = () => {
    if (!dossier?.student) return;
    const st = dossier.student;
    const loadedParents = (dossier.guardians && dossier.guardians.length > 0)
      ? dossier.guardians.map((g, idx) => ({
          id: g.id || idx + 1,
          relationship: g.relationship || 'FATHER',
          name: g.name || '',
          phone: g.phone || '',
          email: g.email || '',
          job: g.job || '',
          is_primary: Boolean(g.is_primary)
        }))
      : [{
          id: 1,
          relationship: 'FATHER',
          name: st.parent_name || '',
          phone: st.parent_phone || '',
          email: st.parent_email || '',
          job: st.parent_job || '',
          is_primary: true
        }];

    setEditFormData({
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
    setIsEditModalOpen(true);
  };

  const handleAssignClass = async (e) => {
    e.preventDefault();
    if (!assignFormData.class_id) {
      toast.error(t('toast.select_class_required', 'يرجى اختيار الفوج'));
      return;
    }
    try {
      setAssigningClass(true);
      const res = await api.post(`/students/${id}/classes`, assignFormData);
      if (res.success) {
        toast.success(res.message || t('toast.assign_class_success', 'تم إلحاق التلميذ بهذا الفوج بنجاح'));
        setIsAssignModalOpen(false);
        setAssignFormData({ class_id: '', roll_number: '', remarks: '' });
        fetchStudentDossier();
      }
    } catch (err) {
      toast.error(err.message || t('toast.assign_class_failed', 'فشل إلحاق التلميذ بالفوج'));
    } finally {
      setAssigningClass(false);
    }
  };

  const openTransferModal = (classItem) => {
    setTransferFormData({
      from_class_id: classItem.id || classItem.class_id,
      from_class_name: classItem.name || classItem.class_name,
      to_class_id: '',
      remarks: classItem.remarks || ''
    });
    setIsTransferModalOpen(true);
  };

  const handleTransferClass = async (e) => {
    e.preventDefault();
    if (!transferFormData.to_class_id) {
      toast.error(t('toast.select_class_required', 'يرجى اختيار الفوج الجديد'));
      return;
    }
    const toClass = classes.find(c => c.id == transferFormData.to_class_id);
    const toClassName = toClass ? toClass.name : '';

    const confirmed = await confirm({
      title: t('dialog.transfer_class_title', 'تحويل التلميذ إلى فوج آخر'),
      message: t('dialog.transfer_class_msg', `هل أنت متأكد من تحويل التلميذ من فوج "${transferFormData.from_class_name}" إلى الفوج الجديد "${toClassName}"؟`),
      confirmText: t('dialog.confirm_transfer', 'نعم، قم بالتحويل'),
      cancelText: t('dialog.cancel_btn', 'تراجع'),
      type: 'warning'
    });

    if (confirmed) {
      try {
        setTransferringClass(true);
        const assignRes = await api.post(`/students/${id}/classes`, { 
          class_id: transferFormData.to_class_id, 
          remarks: transferFormData.remarks 
        });
        if (assignRes.success) {
          await api.delete(`/students/${id}/classes/${transferFormData.from_class_id}`);
          toast.success(t('toast.transfer_success', 'تم تحويل التلميذ بنجاح'));
          setIsTransferModalOpen(false);
          setTransferFormData({ from_class_id: '', from_class_name: '', to_class_id: '', remarks: '' });
          fetchStudentDossier();
        }
      } catch (err) {
        toast.error(err.message || t('toast.transfer_failed', 'فشل تحويل التلميذ'));
      } finally {
        setTransferringClass(false);
      }
    }
  };

  const handleRemoveClass = async (classItem) => {
    const className = classItem.name || classItem.class_name;
    const classId = classItem.id || classItem.class_id;
    const confirmed = await confirm({
      title: t('dialog.unassign_class_title', 'إلغاء قيد التلميذ من هذا الفوج'),
      message: t('dialog.unassign_class_msg', { name: className }, `هل أنت متأكد من رغبتك في إلغاء قيد التلميذ من فوج "${className}"؟`),
      confirmText: t('dialog.confirm_unassign_class', 'نعم، إلغاء القيد'),
      cancelText: t('dialog.cancel_btn', 'تراجع'),
      type: 'danger'
    });

    if (confirmed) {
      try {
        const res = await api.delete(`/students/${id}/classes/${classId}`);
        if (res.success) {
          toast.success(res.message || t('toast.unassign_class_success', 'تم إلغاء قيد التلميذ من هذا الفوج'));
          fetchStudentDossier();
        }
      } catch (err) {
        toast.error(err.message || t('toast.unassign_class_failed', 'فشل إلغاء القيد'));
      }
    }
  };

  const handleUpdateStudent = async (e) => {
    e.preventDefault();
    const validParents = (editFormData.parents || []).map(p => ({
      relationship: p.relationship || 'FATHER',
      name: p.name ? p.name.trim() : '',
      phone: p.phone ? p.phone.trim() : '',
      email: p.email ? p.email.trim().toLowerCase() : '',
      job: p.job ? p.job.trim() : '',
      is_primary: Boolean(p.is_primary)
    }));
    const primaryG = validParents.find(p => p.is_primary) || validParents[0] || {};

    const payload = {
      ...editFormData,
      first_name_en: editFormData.first_name_en ? editFormData.first_name_en.trim().toUpperCase() : '',
      last_name_en: editFormData.last_name_en ? editFormData.last_name_en.trim().toUpperCase() : '',
      email: editFormData.email ? editFormData.email.trim().toLowerCase() : '',
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
      const res = await api.put(`/students/${id}`, payload);
      if (res.success) {
        toast.success(res.message || t('toast.student_updated', 'تم تحديث بيانات التلميذ بنجاح'));
        setIsEditModalOpen(false);
        fetchStudentDossier();
      }
    } catch (err) {
      toast.error(err.message || t('toast.student_save_failed', 'فشل حفظ بيانات التلميذ'));
    }
  };

  const calculateAge = (birthDateString) => {
    if (!birthDateString) return null;
    const birth = new Date(birthDateString);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handlePrint = () => {
    window.print();
  };

  const BackArrow = isRTL ? ArrowRight : ArrowLeft;

  if (loading) {
    return (
      <div className="space-y-6">
        {/* Back Button Skeleton */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-200 rounded-xl animate-pulse" />
          <div className="h-6 w-48 bg-slate-200 rounded-lg animate-pulse" />
        </div>

        {/* Hero Card Skeleton */}
        <div className="bg-white rounded-3xl border border-slate-200/80 p-6 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-24 h-24 rounded-full bg-slate-200 animate-pulse flex-shrink-0" />
          <div className="space-y-3 flex-1 w-full text-center sm:text-right">
            <div className="h-7 w-64 bg-slate-200 rounded-lg animate-pulse mx-auto sm:mx-0" />
            <div className="h-4 w-40 bg-slate-200 rounded-lg animate-pulse mx-auto sm:mx-0" />
            <div className="flex gap-2 justify-center sm:justify-start">
              <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
              <div className="h-6 w-20 bg-slate-200 rounded-full animate-pulse" />
              <div className="h-6 w-24 bg-slate-200 rounded-full animate-pulse" />
            </div>
          </div>
        </div>

        {/* Content Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="h-64 bg-white rounded-3xl border border-slate-200/80 animate-pulse" />
          <div className="h-64 bg-white rounded-3xl border border-slate-200/80 animate-pulse" />
          <div className="h-64 bg-white rounded-3xl border border-slate-200/80 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !dossier || !dossier.student) {
    return (
      <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center max-w-lg mx-auto my-12 shadow-xs">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-2">
          {error || t('students.student_load_failed', 'لم يتم العثور على التلميذ')}
        </h2>
        <p className="text-xs text-slate-500 mb-6">
          {t('students.student_not_found_desc', 'الملف المطلوب قد يكون محذوفاً أو تم نقله، يرجى مراجعة قائمة التلاميذ.')}
        </p>
        <button
          onClick={() => navigate('/students')}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
        >
          <BackArrow className="w-4 h-4" />
          {t('students.back_to_list', 'العودة لقائمة التلاميذ')}
        </button>
      </div>
    );
  }

  const { student, assignedClasses = [], grades, attendance, financials, milestones } = dossier;
  const age = calculateAge(student.birth_date);
  const isPreschool = student.track_code === 'PRE_SCHOOL' || (milestones && milestones.length > 0);

  // Calculate Attendance Stats
  const totalSessions = Number(attendance?.total_sessions || 0);
  const presentCount = Number(attendance?.present_count || 0);
  const absentCount = Number(attendance?.abs_count || attendance?.absent_count || 0);
  const lateCount = Number(attendance?.late_count || 0);
  const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

  // Calculate Average Grade if any
  const validGrades = (grades || []).filter(g => g.score !== null && g.max_score > 0);
  const overallAverage = validGrades.length > 0
    ? (validGrades.reduce((sum, g) => sum + (Number(g.score) / Number(g.max_score)) * 20, 0) / validGrades.length).toFixed(2)
    : null;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Bar: Breadcrumb + Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/students')}
            className="p-2.5 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-2xl shadow-2xs transition-all hover:scale-105 active:scale-95"
            title={t('students.back_to_list', 'العودة لقائمة التلاميذ')}
          >
            <BackArrow className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
              <Link to="/students" className="hover:text-emerald-600 transition-colors">
                {t('students.title', 'دليل وسجلات التلاميذ')}
              </Link>
              <span>/</span>
              <span className="text-slate-600 font-bold">{student.matricule}</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-0.5">
              {student.first_name_ar} {student.last_name_ar}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleOpenEditModal}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-50 border border-blue-200/80 hover:bg-blue-100 text-blue-700 rounded-2xl text-xs font-bold shadow-2xs transition-all"
            title={t('students.edit', 'تعديل البيانات')}
          >
            <Edit className="w-4 h-4 text-blue-600" />
            <span>{t('students.edit', 'تعديل البيانات')}</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200/80 hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold shadow-2xs transition-all"
            title={t('students.print_dossier', 'طباعة الملف')}
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>{t('students.print_dossier', 'طباعة الملف الشامل')}</span>
          </button>
          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-2xl text-xs font-bold transition-all"
          >
            <BackArrow className="w-4 h-4" />
            <span>{t('students.list_title', 'قائمة التلاميذ')}</span>
          </button>
        </div>
      </div>

      {/* Hero Profile Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 left-0 h-2 bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-600" />

        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 pt-2">
          {/* Student Photo / Avatar */}
          <div className="relative flex-shrink-0">
            {student.photo_url ? (
              <img
                src={student.photo_url}
                alt={`${student.first_name_ar} ${student.last_name_ar}`}
                className="w-28 h-28 rounded-3xl object-cover border-4 border-white shadow-md ring-2 ring-emerald-500/20"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            ) : (
              <div className={`w-28 h-28 rounded-3xl border-4 border-white shadow-md flex items-center justify-center text-3xl font-black ${student.gender === 'MALE'
                  ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-500/20'
                  : 'bg-pink-100 text-pink-700 ring-2 ring-pink-500/20'
                }`}>
                {student.first_name_ar ? student.first_name_ar.charAt(0) : 'ط'}
              </div>
            )}
            <span className={`absolute bottom-0 end-0 px-2 py-0.5 rounded-full text-[10px] font-bold border-2 border-white shadow-xs ${student.gender === 'MALE' ? 'bg-blue-600 text-white' : 'bg-pink-600 text-white'
              }`}>
              {student.gender === 'MALE' ? t('students.gender_male', 'ذكر') : t('students.gender_female', 'أنثى')}
            </span>
          </div>

          {/* Identity Info */}
          <div className="flex-1 text-center md:text-right rtl:md:text-right ltr:md:text-left space-y-3">
            <div>
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-2.5">
                <h2 className="text-2xl font-black text-slate-900">
                  {student.first_name_ar} {student.last_name_ar}
                </h2>
                {student.first_name_en && (
                  <span className="text-sm font-medium text-slate-400">
                    ({student.first_name_en} {student.last_name_en})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1">
                {t('students.school_registration_number', 'رقم التسجيل المدرسي:')} <strong className="text-slate-800 font-bold">{student.matricule}</strong>
              </p>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-xs">
              <span className="px-3 py-1 rounded-xl font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5" />
                {student.track_name_ar || student.track_name_en}
              </span>
              {assignedClasses && assignedClasses.length > 0 ? (
                assignedClasses.map(ac => (
                  <span key={ac.id || ac.class_id} className="px-3 py-1 rounded-xl font-bold bg-slate-100 text-slate-700 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{ac.name || ac.class_name}</span>
                  </span>
                ))
              ) : (
                <span className="px-3 py-1 rounded-xl font-bold bg-slate-100 text-slate-500 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  {t('students.not_enrolled_in_class', 'غير مسجل في أي فوج')}
                </span>
              )}
              <span className={`px-3 py-1 rounded-xl font-bold ${student.status === 'ACTIVE'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                  : 'bg-slate-100 text-slate-600'
                }`}>
                {student.status === 'ACTIVE' ? t('students.status_active', 'نشط مداوم') : student.status}
              </span>
              {Number(student.total_debt || 0) > 0 ? (
                <span className="px-3 py-1 rounded-xl font-bold bg-rose-50 text-rose-700 border border-rose-200/60 font-mono flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                  {t('students.pending_dues', 'مستحقات معلقة:')} {formatCurrency(student.total_debt, settings.currency)}
                </span>
              ) : (
                <span className="px-3 py-1 rounded-xl font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  {t('students.debt_cleared', 'الذمة المالية مستوفاة')}
                </span>
              )}
            </div>
          </div>

          {/* Fast KPI Cards */}
          <div className="grid grid-cols-2 gap-3 w-full md:w-auto flex-shrink-0">
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-center min-w-[110px]">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">{t('students.attendance_rate', 'نسبة الحضور')}</span>
              <span className={`text-lg font-black font-mono ${attendanceRate >= 85 ? 'text-emerald-600' : attendanceRate >= 70 ? 'text-amber-600' : 'text-rose-600'
                }`}>
                {attendanceRate}%
              </span>
            </div>
            <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl text-center min-w-[110px]">
              <span className="text-[10px] text-slate-400 font-bold block mb-1">{t('students.overall_average', 'المعدل العام')}</span>
              <span className="text-lg font-black text-slate-900 font-mono">
                {overallAverage ? `${overallAverage}/20` : '-'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Dossier Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 text-xs font-bold overflow-x-auto">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-2xl transition-all flex items-center gap-2 flex-shrink-0 ${activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
        >
          <User className="w-4 h-4" />
          <span>{t('students.tab_overview', 'البيانات الشخصية والأكاديمية')}</span>
        </button>

        <button
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2.5 rounded-2xl transition-all flex items-center gap-2 flex-shrink-0 ${activeTab === 'classes'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>{t('students.tab_classes', 'الأقسام والأفواج')}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'classes' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'
            }`}>
            {assignedClasses?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('grades')}
          className={`px-4 py-2.5 rounded-2xl transition-all flex items-center gap-2 flex-shrink-0 ${activeTab === 'grades'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
        >
          <Award className="w-4 h-4" />
          <span>{t('students.tab_grades', 'النقاط وكشوف التقييم')}</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === 'grades' ? 'bg-emerald-700 text-emerald-100' : 'bg-slate-200 text-slate-700'
            }`}>
            {grades?.length || 0}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2.5 rounded-2xl transition-all flex items-center gap-2 flex-shrink-0 ${activeTab === 'attendance'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
        >
          <Clock className="w-4 h-4" />
          <span>{t('students.tab_attendance', 'المواظبة والغيابات')}</span>
        </button>

        <button
          onClick={() => setActiveTab('finance')}
          className={`px-4 py-2.5 rounded-2xl transition-all flex items-center gap-2 flex-shrink-0 ${activeTab === 'finance'
              ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
        >
          <Wallet className="w-4 h-4" />
          <span>{t('students.tab_finance', 'الاشتراكات والذمة المالية')}</span>
        </button>

        {isPreschool && (
          <button
            onClick={() => setActiveTab('milestones')}
            className={`px-4 py-2.5 rounded-2xl transition-all flex items-center gap-2 flex-shrink-0 ${activeTab === 'milestones'
                ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>{t('students.tab_milestones', 'التقييم النمائي للطفل')}</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          TAB 1: OVERVIEW
          ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card: Academic Placement */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                {t('students.section_academic', 'المعلومات الأكاديمية والتمدرس')}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">{t('students.col_matricule')}:</span>
                <strong className="font-mono font-bold text-slate-900">{student.matricule}</strong>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">{t('students.academic_track')}:</span>
                <span className="font-bold text-emerald-800">{student.track_name_ar}</span>
              </div>
              <div className="py-2 border-b border-slate-50 space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{t('students.assigned_classes_list', 'الأقسام والفصول الملتحق بها:')}</span>
                  <button
                    onClick={() => setActiveTab('classes')}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    {t('students.manage_classes', 'إدارة الأفواج')}
                  </button>
                </div>
                {assignedClasses && assignedClasses.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {assignedClasses.map((ac) => (
                      <span
                        key={ac.id || ac.class_id}
                        onClick={() => setActiveTab('classes')}
                        className="cursor-pointer inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/70 hover:bg-emerald-100 transition-colors"
                      >
                        <BookOpen className="w-3 h-3 text-emerald-600" />
                        {ac.name || ac.class_name}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-400 font-medium text-xs">{t('students.no_classes_assigned', 'غير مسجل في أي فوج حالياً')}</div>
                )}
              </div>
              {student.grade_level && (
                <div className="flex justify-between items-center py-1 border-b border-slate-50">
                  <span className="text-slate-500">{t('students.grade_level_label', 'المستوى الدراسي:')}</span>
                  <span className="font-bold text-slate-700">{student.grade_level}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">{t('students.enrollment_date', 'تاريخ التسجيل:')}</span>
                <span className="font-bold text-slate-700">{formatDate(student.enrollment_date)}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">{t('students.col_status')}:</span>
                <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-emerald-50 text-emerald-700">
                  {student.status}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Personal & Civil Details */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-800 text-sm">
                {t('students.section_personal', 'البيانات المدنية والشخصية')}
              </h3>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">{t('students.birth_date', 'تاريخ الميلاد')}:</span>
                <span className="font-bold text-slate-900">
                  {formatDate(student.birth_date)} {age !== null && `(${age} ${t('students.years_old', 'سنة')})`}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">{t('students.birth_place', 'مكان الميلاد')}:</span>
                <span className="font-bold text-slate-900">{student.birth_place || '-'}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">{t('students.blood_group', 'فصيلة الدم')}:</span>
                <span className="font-mono font-bold px-2 py-0.5 bg-slate-100 rounded text-slate-800">
                  {student.blood_group || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-50">
                <span className="text-slate-500">{t('students.col_gender', 'الجنس')}:</span>
                <span className="font-bold text-slate-800">
                  {student.gender === 'MALE' ? t('students.gender_male', 'ذكر') : t('students.gender_female', 'أنثى')}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">{t('students.first_name_fr', 'الاسم باللاتينية:')}</span>
                <span className="font-medium text-slate-700">
                  {student.first_name_en ? `${student.first_name_en} ${student.last_name_en || ''}` : '-'}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Guardian & Contacts */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Phone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">
                  {t('students.section_parent', 'بيانات الأولياء والمراسلة')}
                </h3>
              </div>
              <button
                onClick={handleOpenEditModal}
                className="text-xs text-emerald-700 hover:text-emerald-800 font-bold flex items-center gap-1"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>{t('students.edit', 'تعديل')}</span>
              </button>
            </div>

            {/* List of Multiple Guardians */}
            <div className="space-y-3">
              {((dossier.guardians && dossier.guardians.length > 0)
                ? dossier.guardians
                : (student.parent_name ? [{
                    relationship: 'FATHER',
                    name: student.parent_name,
                    phone: student.parent_phone,
                    email: student.parent_email,
                    job: student.parent_job,
                    is_primary: 1
                  }] : [])
              ).map((guardian, gIdx) => (
                <div key={guardian.id || gIdx} className="p-3 bg-slate-50/80 border border-slate-200/70 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 border-b border-slate-200/60 pb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-800">
                        {guardian.relationship === 'FATHER' ? t('students.rel_father', 'الأب')
                          : guardian.relationship === 'MOTHER' ? t('students.rel_mother', 'الأم')
                          : guardian.relationship === 'GUARDIAN' ? t('students.rel_guardian', 'الولي القانوني')
                          : t('students.rel_other', 'آخر')}
                      </span>
                      {Boolean(guardian.is_primary) && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {t('students.primary_tag', 'رئيسي')}
                        </span>
                      )}
                    </div>
                    <strong className="font-bold text-slate-900">{guardian.name || '-'}</strong>
                  </div>

                  <div className="space-y-1.5 pt-0.5">
                    {guardian.phone && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t('students.parent_phone', 'الهاتف')}:</span>
                        <a
                          href={`tel:${guardian.phone}`}
                          className="font-mono font-bold text-emerald-700 hover:underline flex items-center gap-1"
                          dir="ltr"
                        >
                          <Phone className="w-3 h-3 text-emerald-600" />
                          {guardian.phone}
                        </a>
                      </div>
                    )}
                    {guardian.email && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">{t('students.parent_email', 'البريد')}:</span>
                        <a
                          href={`mailto:${guardian.email}`}
                          className="font-mono text-blue-700 hover:underline truncate max-w-[170px]"
                        >
                          {guardian.email}
                        </a>
                      </div>
                    )}
                    {guardian.job && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-slate-500">{t('students.parent_job', 'المهنة')}:</span>
                        <span className="font-medium text-slate-800">{guardian.job}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {(!dossier.guardians || dossier.guardians.length === 0) && !student.parent_name && (
                <div className="text-center py-2 text-slate-400 text-xs">
                  {t('students.no_parents_registered', 'لم يتم تسجيل بيانات الولي')}
                </div>
              )}
            </div>

            <div className="space-y-2 text-xs pt-2 border-t border-slate-100">
              <div className="py-1 border-b border-slate-50">
                <span className="text-slate-500 block mb-0.5">{t('students.address', 'العنوان السكني')}:</span>
                <span className="font-medium text-slate-800">{student.address || '-'}</span>
              </div>
              <div className="py-1 border-b border-slate-50">
                <span className="text-slate-500 block mb-0.5">{t('students.maladies', 'الأمراض')}:</span>
                <span className="font-medium text-slate-800">{student.maladies || '-'}</span>
              </div>
              <div className="py-1">
                <span className="text-slate-500 block mb-0.5">{t('students.medical_notes', 'ملاحظات صحية')}:</span>
                {student.medical_notes ? (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-start gap-2">
                    <HeartPulse className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                    <span>{student.medical_notes}</span>
                  </div>
                ) : (
                  <span className="text-slate-400">{t('students.no_medical_notes', 'لا توجد ملاحظات صحية مسجلة')}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB: ASSIGNED CLASSES / COHORTS (MULTI-CLASS SUPPORT)
          ========================================================================= */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          {/* Header Card */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                  {t('students.classes_section_title', 'الأقسام والأفواج المسجل بها التلميذ')}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {t('students.classes_section_desc', 'يمكن للتلميذ الالتحاق بأكثر من فوج بالتوازي (مثلاً: الفوج العام، حلقة تحفيظ، نادي اللغات أو الدعم)')}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition-all shadow-sm shadow-emerald-600/20"
            >
              <Plus className="w-4 h-4" />
              <span>{t('students.assign_new_class_btn', 'إلحاق بفوج جديد')}</span>
            </button>
          </div>

          {/* List of Enrolled Classes */}
          {(!assignedClasses || assignedClasses.length === 0) ? (
            <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center max-w-lg mx-auto shadow-xs">
              <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8" />
              </div>
              <h4 className="font-bold text-slate-800 text-sm mb-1">{t('students.no_classes_empty_title', 'لا توجد أقسام مسجلة لهذا التلميذ حالياً')}</h4>
              <p className="text-xs text-slate-500 mb-6">
                {t('students.no_classes_empty_desc', 'قم بإلحاق التلميذ بفوج دراسي للبدء في تتبع درجاته، غياباته وجدوله.')}
              </p>
              <button
                onClick={() => setIsAssignModalOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-2xl transition-all shadow-md shadow-emerald-600/20"
              >
                <Plus className="w-4 h-4" />
                <span>{t('students.assign_class_now', 'إلحاق بفوج الآن')}</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {assignedClasses.map((ac) => {
                const classId = ac.id || ac.class_id;
                const className = ac.name || ac.class_name;
                return (
                  <div
                    key={classId}
                    className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs hover:border-emerald-200 hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Badges */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                          {ac.track_name_ar || t('tracks.general_track', 'مسار تعليمي')}
                        </span>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${ac.enrollment_status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-600'
                          }`}>
                          {ac.enrollment_status === 'ACTIVE' ? t('students.enrollment_status_active', 'قيد نشط') : ac.enrollment_status}
                        </span>
                      </div>

                      {/* Class Title */}
                      <div className="flex items-center gap-2.5 mb-3">
                        <div className="w-9 h-9 rounded-xl bg-emerald-100/70 text-emerald-700 flex items-center justify-center flex-shrink-0">
                          <BookOpen className="w-4 h-4" />
                        </div>
                        <div 
                          className="cursor-pointer hover:opacity-80 transition-opacity group" 
                          onClick={() => navigate(`/classes/${ac.class_id || ac.id}`)}
                          title={t('students.click_to_view_class', 'انقر لعرض تفاصيل الفوج')}
                        >
                          <h4 className="font-extrabold text-slate-900 text-sm leading-tight group-hover:text-emerald-700 transition-colors">
                            {className}
                          </h4>
                          {ac.academic_year_name && (
                            <span className="text-[11px] text-slate-400 font-medium">
                              {t('students.academic_year_label', 'الموسم:')} {ac.academic_year_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Details List */}
                      <div className="space-y-2 text-xs border-t border-slate-100 pt-3 text-slate-600">
                        {ac.grade_level && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-[11px]">{t('students.grade_level_label', 'المستوى الدراسي:')}</span>
                            <span className="font-bold text-slate-800">{ac.grade_level}</span>
                          </div>
                        )}
                        {ac.homeroom_teacher_name && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-[11px]">{t('students.homeroom_teacher_label', 'الأستاذ المشرف:')}</span>
                            <span className="font-bold text-slate-800">{ac.homeroom_teacher_name}</span>
                          </div>
                        )}
                        {ac.classroom && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-[11px]">{t('students.classroom_label', 'القاعة الدراسية:')}</span>
                            <span className="font-semibold text-slate-700">{ac.classroom}</span>
                          </div>
                        )}
                        {ac.roll_number && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-[11px]">{t('students.roll_number_display', 'رقم المقعد/القيد:')}</span>
                            <span className="font-mono font-bold text-emerald-700">{ac.roll_number}</span>
                          </div>
                        )}
                        {ac.enrolled_at && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-[11px]">{t('students.enrolled_date_label', 'تاريخ الإلحاق:')}</span>
                            <span className="text-slate-700">{formatDate(ac.enrolled_at)}</span>
                          </div>
                        )}
                        {ac.remarks && (
                          <div className="p-2 bg-slate-50 rounded-xl text-[11px] text-slate-600 border border-slate-100 mt-2">
                            <strong className="block text-slate-700 mb-0.5">{t('students.remarks_label', 'ملاحظات:')}</strong>
                            {ac.remarks}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={() => window.print()}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>{t('students.print_dossier', 'طباعة الملف')}</span>
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openTransferModal(ac)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-blue-600 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          <span>{t('students.transfer_class_btn', 'تحويل الفوج')}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveClass(ac)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{t('students.unassign_class_btn', 'إلغاء الإلحاق بالفوج')}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 2: GRADES & EVALUATION
          ========================================================================= */}
      {activeTab === 'grades' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">{t('students.grades_history_title', 'سجل النقاط والتقييمات الأكاديمية')}</h3>
                <p className="text-xs text-slate-500">{t('students.grades_history_desc', 'كشف شامل بالدرجات المحصل عليها في الفصول والامتحانات')}</p>
              </div>
              {overallAverage && (
                <div className="px-4 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl text-center">
                  <span className="text-[10px] text-emerald-600 font-bold block">{t('students.approx_average', 'المعدل العام التقريبي')}</span>
                  <span className="text-base font-black text-emerald-800 font-mono">{overallAverage} / 20</span>
                </div>
              )}
            </div>

            {!grades || grades.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <Award className="w-12 h-12 mx-auto mb-3 text-slate-300 stroke-[1.5]" />
                <p className="text-sm font-bold text-slate-600">{t('students.no_grades_recorded', 'لا توجد علامات مسجلة لهذا التلميذ حتى الآن')}</p>
                <p className="text-xs text-slate-400 mt-1">{t('students.no_grades_hint', 'يتم تسجيل العلامات من واجهة كشوف النقاط والتقييمات')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead>
                    <tr className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200">
                      <th className="py-3 px-4">{t('students.col_term', 'الفصل الدراسي')}</th>
                      <th className="py-3 px-4">{t('students.col_subject', 'المادة الدراسية')}</th>
                      <th className="py-3 px-4">{t('students.col_evaluation_type', 'نوع التقييم')}</th>
                      <th className="py-3 px-4 text-center">{t('students.col_score', 'العلامة')}</th>
                      <th className="py-3 px-4 text-center">{t('students.col_coefficient', 'المعامل')}</th>
                      <th className="py-3 px-4 text-center">{t('students.col_percentage', 'النسبة المئوية')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grades.map((g) => {
                      const percentage = g.max_score > 0 ? Math.round((Number(g.score) / Number(g.max_score)) * 100) : 0;
                      const isPassing = percentage >= 50;

                      return (
                        <tr key={g.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 px-4 font-medium text-slate-700">{g.term_name}</td>
                          <td className="py-3 px-4 font-bold text-slate-900">
                            {g.subject_name_ar}
                            {g.subject_name_en && (
                              <span className="text-[10px] text-slate-400 font-normal block">{g.subject_name_en}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-600">{g.evaluation_type}</td>
                          <td className="py-3 px-4 text-center font-mono font-black text-sm">
                            <span className={isPassing ? 'text-emerald-700' : 'text-rose-600'}>
                              {g.score}
                            </span>
                            <span className="text-slate-400 text-xs font-normal"> / {g.max_score}</span>
                          </td>
                          <td className="py-3 px-4 text-center font-mono font-bold text-slate-600">
                            {g.coefficient || 1}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono ${isPassing ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}>
                              {percentage}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: ATTENDANCE
          ========================================================================= */}
      {activeTab === 'attendance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-3xl border border-slate-200/80 shadow-xs text-center">
              <span className="text-xs text-slate-400 block mb-1">{t('students.total_sessions', 'إجمالي الحصص المسجلة')}</span>
              <span className="text-2xl font-black text-slate-800 font-mono">{totalSessions}</span>
            </div>
            <div className="p-4 bg-white rounded-3xl border border-emerald-100 shadow-xs text-center">
              <span className="text-xs text-emerald-600 block mb-1">{t('students.present_times', 'مرات الحضور')}</span>
              <span className="text-2xl font-black text-emerald-700 font-mono">{presentCount}</span>
            </div>
            <div className="p-4 bg-white rounded-3xl border border-rose-100 shadow-xs text-center">
              <span className="text-xs text-rose-600 block mb-1">{t('students.absent_times', 'مرات الغياب')}</span>
              <span className="text-2xl font-black text-rose-700 font-mono">{absentCount}</span>
            </div>
            <div className="p-4 bg-white rounded-3xl border border-amber-100 shadow-xs text-center">
              <span className="text-xs text-amber-600 block mb-1">{t('students.late_times', 'مرات التأخير')}</span>
              <span className="text-2xl font-black text-amber-700 font-mono">{lateCount}</span>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-800 text-sm">{t('students.discipline_rate_title', 'معدل المواظبة والانضباط المدرسي')}</h4>
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-600 mb-1.5">
                <span>{t('students.overall_attendance_rate', 'نسبة الحضور الإجمالية')}</span>
                <span className="font-mono">{attendanceRate}%</span>
              </div>
              <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                <div
                  style={{ width: `${attendanceRate}%` }}
                  className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                />
              </div>
            </div>
            <p className="text-xs text-slate-500">
              {t('students.attendance_auto_hint', 'يتم رصد الحضور والغياب بصورة آلية عند تسجيل كل حصة دراسية في لوحة المواظبة اليومية.')}
            </p>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 4: FINANCE
          ========================================================================= */}
      {activeTab === 'finance' && (
        <div className="space-y-6">
          {/* Standing Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-6 shadow-md flex flex-col sm:flex-row justify-between items-center gap-4">
            <div>
              <span className="text-xs text-slate-400 block mb-1 font-bold">{t('students.student_finance_status', 'الحالة المالية للتلميذ')}</span>
              <h3 className="text-xl font-bold">{t('students.student_ledger_title', 'دفتر الاشتراكات والذمة المالية')}</h3>
            </div>
            <div className="text-center sm:text-right">
              <span className="text-xs text-slate-300 block mb-1">{t('students.pending_amount_to_pay', 'المستحقات المتبقية للدفع')}</span>
              <span className={`text-2xl font-black font-mono ${Number(student.total_debt || 0) > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}>
                {formatCurrency(student.total_debt || 0, settings.currency)}
              </span>
            </div>
          </div>

          {/* Tuition Payments */}
          <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
            <h4 className="font-bold text-slate-900 text-sm mb-3">{t('students.receipts_history_title', 'وصولات وسجلات دفع الاشتراكات المدرسية')}</h4>
            {(!financials?.tuitionPayments || financials.tuitionPayments.length === 0) ? (
              <p className="text-xs text-slate-400 text-center py-6">{t('students.no_receipts_recorded', 'لم يتم تسجيل أي وصولات دفع لهذا التلميذ حتى الآن.')}</p>
            ) : (
              <div className="space-y-2">
                {financials.tuitionPayments.map((p) => (
                  <div
                    key={p.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900">{p.receipt_number}</span>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {p.fee_name_ar || t('students.tuition_fee', 'اشتراك دراسي')}
                        </span>
                      </div>
                      <span className="text-slate-400 text-[11px] block mt-1">{formatDate(p.payment_date)}</span>
                    </div>
                    <div className="text-right sm:text-left rtl:sm:text-right ltr:sm:text-left">
                      <span className="font-mono font-black text-emerald-700 text-sm block">
                        {formatCurrency(p.amount_paid, settings.currency)}
                      </span>
                      {Number(p.remaining_debt) > 0 && (
                        <span className="text-[10px] text-rose-600 font-bold block">
                          {t('students.remaining', 'متبقي:')} {formatCurrency(p.remaining_debt, settings.currency)}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Store POS Purchases if any */}
          {financials?.storePurchases && financials.storePurchases.length > 0 && (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs">
              <h4 className="font-bold text-slate-900 text-sm mb-3">{t('students.pos_purchases_title', 'مشتريات المتجر المدرسي (POS)')}</h4>
              <div className="space-y-2">
                {financials.storePurchases.map((sale) => (
                  <div
                    key={sale.id}
                    className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 flex justify-between items-center"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <ShoppingBag className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono font-bold text-slate-800 text-xs">{sale.receipt_number || `فاتورة #${sale.id}`}</span>
                      </div>
                      <span className="text-slate-400 text-[10px] block mt-1">{formatDate(sale.created_at)}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-slate-900 text-xs block">
                        {formatCurrency(sale.total_amount, settings.currency)}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        {sale.payment_method === 'CASH' ? t('students.payment_cash', 'نقداً') : sale.payment_method}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          TAB 5: PRESCHOOL MILESTONES (OPTIONAL)
          ========================================================================= */}
      {isPreschool && activeTab === 'milestones' && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-5 shadow-xs space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="font-bold text-slate-900 text-sm">{t('students.preschool_skills_title', 'سجل المهارات النمائية والتقويم النفس حركي')}</h3>
              <p className="text-xs text-slate-500">{t('students.preschool_skills_desc', 'تتبع تطور الطفل في مهارات التواصل، التفاعل الحركي والاجتماعي')}</p>
            </div>
          </div>

          {(!milestones || milestones.length === 0) ? (
            <p className="text-xs text-slate-400 text-center py-6">{t('students.no_milestones', 'لم يتم تسجيل أي مهارات نمائية بعد لهذا الطفل.')}</p>
          ) : (
            <div className="space-y-3">
              {milestones.map((m) => (
                <div key={m.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/70 space-y-1.5">
                  <div className="flex justify-between items-center">
                    <h4 className="font-bold text-slate-800 text-xs">{m.milestone_name_ar || m.milestone_name}</h4>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                      {m.term_name || t('students.col_term', 'الفصل الدراسي')}
                    </span>
                  </div>
                  {m.notes && <p className="text-xs text-slate-600">{m.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          MODAL: EDIT STUDENT DETAILS
          ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`${t('students.edit', 'تعديل بيانات التلميذ')}: ${student.first_name_ar} ${student.last_name_ar} (${student.matricule})`}
        maxWidth="max-w-3xl"
        headerActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              {t('common.cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              form="studentEditModalForm"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs shadow-emerald-600/30 transition-all flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              {t('common.save_changes', 'تحديث البيانات')}
            </button>
          </div>
        }
      >
        <form id="studentEditModalForm" onSubmit={handleUpdateStudent} className="space-y-4">
          {/* Photo Upload Component */}
          <PhotoUpload
            photoUrl={editFormData.photo_url}
            onChange={(url) => setEditFormData(prev => ({ ...prev, photo_url: url }))}
            uploadEndpoint="/upload/student"
            label={t('photo_upload.label')}
            shape="circle"
          />

          {/* Section: Personal Info */}
          <div>
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
              {t('students.section_personal', 'البيانات الشخصية والمدنية')}
            </h4>
            {/* Arabic Name & Surname */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.first_name_ar')} *</label>
                <ArabicInput
                  required
                  value={editFormData.first_name_ar}
                  onChange={e => setEditFormData({ ...editFormData, first_name_ar: e.target.value })}
                  placeholder={t('students.first_name_placeholder', 'يونس')}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.last_name_ar')} *</label>
                <ArabicInput
                  required
                  value={editFormData.last_name_ar}
                  onChange={e => setEditFormData({ ...editFormData, last_name_ar: e.target.value })}
                  placeholder={t('students.last_name_placeholder', 'المنصوري')}
                />
              </div>
            </div>

            {/* Latin Name & Surname */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('students.first_name_fr', 'الاسم باللاتينية')}
                </label>
                <input
                  type="text"
                  value={editFormData.first_name_en}
                  onChange={e => setEditFormData({ ...editFormData, first_name_en: e.target.value.toUpperCase() })}
                  placeholder="ex: YOUNES"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase font-semibold"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('students.last_name_fr', 'اللقب باللاتينية')}
                </label>
                <input
                  type="text"
                  value={editFormData.last_name_en}
                  onChange={e => setEditFormData({ ...editFormData, last_name_en: e.target.value.toUpperCase() })}
                  placeholder="ex: MANSOURI"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none uppercase font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.col_gender')}</label>
                <select
                  value={editFormData.gender}
                  onChange={e => setEditFormData({ ...editFormData, gender: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="MALE">{t('students.gender_male', 'ذكر')}</option>
                  <option value="FEMALE">{t('students.gender_female', 'أنثى')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.birth_date')} *</label>
                <DateInput
                  required
                  value={editFormData.birth_date}
                  onChange={e => setEditFormData({ ...editFormData, birth_date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.birth_place')}</label>
                <input
                  type="text"
                  value={editFormData.birth_place || ''}
                  onChange={e => setEditFormData({ ...editFormData, birth_place: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.blood_group')}</label>
                <input
                  type="text"
                  value={editFormData.blood_group}
                  onChange={e => setEditFormData({ ...editFormData, blood_group: e.target.value })}
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
                  value={editFormData.phone || ''}
                  onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
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
                  value={editFormData.email || ''}
                  onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
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
                  value={editFormData.national_id || ''}
                  onChange={e => setEditFormData({ ...editFormData, national_id: e.target.value })}
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
                value={editFormData.address || ''}
                onChange={e => setEditFormData({ ...editFormData, address: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder={t('students.address_placeholder', 'الحي، البلدية، الولاية')}
              />
            </div>
          </div>

          {/* Academic Placement */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-emerald-800 uppercase tracking-wider mb-2">
              {t('students.section_academic', 'البيانات الأكاديمية والفوج')}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.academic_track')} *</label>
                <select
                  required
                  value={editFormData.academic_track_id}
                  onChange={e => setEditFormData({ ...editFormData, academic_track_id: e.target.value })}
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
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.col_status')}</label>
                <select
                  value={editFormData.status}
                  onChange={e => setEditFormData({ ...editFormData, status: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="ACTIVE">{t('students.status_active', 'نشط (مداوم)')}</option>
                  <option value="GRADUATED">{t('students.status_graduated', 'متخرج')}</option>
                  <option value="TRANSFERRED">{t('students.status_transferred', 'محول')}</option>
                  <option value="SUSPENDED">{t('students.status_suspended', 'معلق')}</option>
                  <option value="EXPELLED">{t('students.status_expelled', 'مفصول')}</option>
                </select>
              </div>
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
                  value={editFormData.maladies || ''}
                  onChange={e => setEditFormData({ ...editFormData, maladies: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder={t('students.maladies_placeholder', 'سجل الأمراض أو الحالات المزمنة هنا...')}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">{t('students.medical_notes', 'ملاحظات صحية أو حساسية')}</label>
                <textarea
                  rows={2}
                  value={editFormData.medical_notes || ''}
                  onChange={e => setEditFormData({ ...editFormData, medical_notes: e.target.value })}
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
              {(editFormData.parents || []).map((parent, idx) => (
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
                          name={`edit_primary_guardian_radio_${idx}`}
                          checked={Boolean(parent.is_primary)}
                          onChange={() => handleParentChange(idx, 'is_primary', true)}
                          className="text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-[11px] font-medium text-slate-700">{t('students.is_primary_guardian', 'الولي الرئيسي')}</span>
                      </label>

                      {editFormData.parents.length > 1 && (
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
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors"
            >
              {t('common.cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
            >
              {t('common.save_changes', 'تحديث البيانات')}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: ASSIGN STUDENT TO CLASS / COHORT
          ========================================================================= */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={t('students.modal_assign_class_title', 'إلحاق التلميذ بفوج دراسي')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAssignClass} className="space-y-4">
          <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="block font-bold text-emerald-900">
                {student.first_name_ar} {student.last_name_ar}
              </span>
              <span className="text-emerald-700 font-mono text-[11px]">{student.matricule}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('students.select_class_label', 'اختر الفوج *')}
            </label>
            <select
              required
              value={assignFormData.class_id}
              onChange={e => setAssignFormData({ ...assignFormData, class_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
            >
              <option value="">{t('students.select_class_placeholder', '-- اختر الفوج --')}</option>
              {classes.map(c => {
                const isAlready = assignedClasses?.some(ac => (ac.id || ac.class_id) == c.id);
                return (
                  <option key={c.id} value={c.id} disabled={isAlready}>
                    {c.name} {c.grade_level ? `(${c.grade_level})` : ''} {c.track_name_ar ? `- ${c.track_name_ar}` : ''} {isAlready ? t('students.class_already_enrolled', ' (مسجل به بالفعل)') : ''}
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              رقم القيد في الفوج (اختياري)
            </label>
            <input
              type="text"
              value={assignFormData.roll_number}
              onChange={e => setAssignFormData({ ...assignFormData, roll_number: e.target.value })}
              placeholder="مثال: 01 أو A-12"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ملاحظات التسجيل في هذا الفوج (اختياري)
            </label>
            <textarea
              rows="2"
              value={assignFormData.remarks}
              onChange={e => setAssignFormData({ ...assignFormData, remarks: e.target.value })}
              placeholder="مثال: فوج تحفيظ القرآن الصباحي / حصص الدعم..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={assigningClass}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{assigningClass ? 'جاري الإلحاق...' : 'تأكيد الإلحاق بالفوج'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: TRANSFER STUDENT TO ANOTHER CLASS
          ========================================================================= */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title={t('students.modal_transfer_class_title', 'تحويل التلميذ إلى فوج آخر')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleTransferClass} className="space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="block font-bold text-blue-900">
                {student.first_name_ar} {student.last_name_ar}
              </span>
              <span className="text-blue-700 font-mono text-[11px]">{t('students.from_class', 'من الفوج:')} {transferFormData.from_class_name}</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('students.select_target_class_label', 'اختر الفوج الجديد *')}
            </label>
            <select
              required
              value={transferFormData.to_class_id}
              onChange={e => setTransferFormData({ ...transferFormData, to_class_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
            >
              <option value="">{t('students.select_target_class_placeholder', '-- اختر الفوج الجديد --')}</option>
              {classes
                .filter(c => c.id != transferFormData.from_class_id)
                .map(c => {
                  const isAlready = assignedClasses?.some(ac => (ac.id || ac.class_id) == c.id);
                  return (
                    <option key={c.id} value={c.id} disabled={isAlready}>
                      {c.name} {c.grade_level ? `(${c.grade_level})` : ''} {c.track_name_ar ? `- ${c.track_name_ar}` : ''} {isAlready ? t('students.class_already_enrolled', ' (مسجل به بالفعل)') : ''}
                    </option>
                  );
              })}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('students.transfer_remarks_label', 'ملاحظات التحويل (اختياري)')}
            </label>
            <textarea
              rows="2"
              value={transferFormData.remarks}
              onChange={e => setTransferFormData({ ...transferFormData, remarks: e.target.value })}
              placeholder={t('students.transfer_remarks_placeholder', 'سبب التحويل، ملاحظات...')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {t('common.cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              disabled={transferringClass}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>{transferringClass ? t('students.transferring', 'جاري التحويل...') : t('students.confirm_transfer', 'تأكيد التحويل')}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
