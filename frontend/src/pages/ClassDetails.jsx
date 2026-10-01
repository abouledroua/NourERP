import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useToast, useConfirm } from '../context/UIFeedbackContext';
import api from '../utils/api'; 
import { 
  ArrowRight, Users, Edit, UserPlus, BookOpen, 
  MapPin, CheckCircle, AlertCircle, FileText, Save, X, Printer, Trash2, ArrowRightLeft, Calendar, Wallet
} from 'lucide-react';
import { formatCurrency } from '../utils/formatters';
import Modal from '../components/Modal';
import TimeInput from '../components/TimeInput';
import CustomSelect from '../components/CustomSelect';

const DAY_OPTIONS = [6, 0, 1, 2, 3, 4, 5];

const createDefaultDaySchedule = () => Object.fromEntries(
  DAY_OPTIONS.map((day) => [
    day,
    {
      enabled: day !== 5,
      start: '08:00',
      end: '09:00',
      room: ''
    }
  ])
);

const parseScheduleInfo = (scheduleText, t) => {
  const parsed = Object.fromEntries(
    DAY_OPTIONS.map((day) => [
      day,
      { enabled: false, start: '08:00', end: '09:00', room: '' }
    ])
  );
  if (!scheduleText) return createDefaultDaySchedule();

  const segments = scheduleText.split('|').map((segment) => segment.trim()).filter(Boolean);
  segments.forEach((segment) => {
    const match = segment.match(/^(.*?)\s*(\d{1,2}:\d{2})\s*-\s*(\d{1,2}:\d{2})(?:\s*\((.*?)\))?\s*$/);
    if (!match) return;

    const label = match[1].trim();
    const start = match[2];
    const end = match[3];
    const room = match[4] || '';

    const dayIndex = DAY_OPTIONS.find((day) => {
      const dayLabel = t(`timetable.days.${day}`);
      return dayLabel === label || label.includes(dayLabel);
    });

    if (dayIndex !== undefined) {
      parsed[dayIndex] = { enabled: true, start, end, room };
    }
  });

  return parsed;
};

const serializeDaySchedule = (scheduleMap, t) => Object.entries(scheduleMap)
  .filter(([, config]) => config?.enabled && config?.start && config?.end)
  .map(([day, config]) => {
    const roomPart = config.room ? ` (${config.room})` : '';
    return `${t(`timetable.days.${day}`)} ${config.start} - ${config.end}${roomPart}`;
  })
  .join(' | ');

export default function ClassDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, language, isRTL } = useLanguage();
  const { tracks, settings } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();
  
  const [classInfo, setClassInfo] = useState(null);
  const [roster, setRoster] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [daySchedule, setDaySchedule] = useState(createDefaultDaySchedule());
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);

  // Assign Student State
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [allStudents, setAllStudents] = useState([]);
  const [assignStudentId, setAssignStudentId] = useState('');
  const [assignRemarks, setAssignRemarks] = useState('');
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [reduction, setReduction] = useState(0);
  const [assigning, setAssigning] = useState(false);

  // Transfer Student State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [allClasses, setAllClasses] = useState([]);
  const [transferFormData, setTransferFormData] = useState({ student_id: '', to_class_id: '', remarks: '' });
  const [transferring, setTransferring] = useState(false);

  useEffect(() => {
    fetchClassDetails();
    fetchTeachers();
    fetchRooms();
  }, [id]);

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      if (res.success) setRooms(res.data);
    } catch (err) {
      console.error(err);
    }
  };

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
        setDaySchedule(parseScheduleInfo(infoRes.data.schedule_info || '', t));
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
  const fetchAllStudents = async () => {
    try {
      const res = await api.get('/students');
      if (res.success) setAllStudents(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenAssignModal = () => {
    if (allStudents.length === 0) fetchAllStudents();
    setAssignStudentId('');
    setAssignRemarks('');
    setPaymentAmount(classInfo?.pricing_value || 0);
    setReduction(0);
    setIsAssignModalOpen(true);
  };

  const handleAssignStudent = async (e) => {
    e.preventDefault();
    if (!assignStudentId) {
      toast.error(t('toast.select_student_required', 'يرجى اختيار التلميذ'));
      return;
    }
    if (Number(reduction || 0) > Number(paymentAmount || 0)) {
      toast.error(t('finance.reduction_exceeds_payment', 'لا يمكن أن يكون التخفيض أكبر من مبلغ الدفع'));
      return;
    }
    try {
      setAssigning(true);
      const res = await api.post(`/students/${assignStudentId}/classes`, {
        class_id: id,
        remarks: assignRemarks,
        payment_amount: paymentAmount,
        reduction: reduction
      });
      if (res.success) {
        toast.success(res.message || t('toast.assign_class_success', 'تم إلحاق التلميذ بهذا الفوج بنجاح'));
        setIsAssignModalOpen(false);
        fetchClassDetails();
      }
    } catch (err) {
      toast.error(err.message || t('toast.assign_class_failed', 'فشل إلحاق التلميذ بالفوج'));
    } finally {
      setAssigning(false);
    }
  };
  const fetchAllClasses = async () => {
    try {
      const res = await api.get('/classes');
      if (res.success) setAllClasses(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenTransferModal = (studentId) => {
    if (allClasses.length === 0) fetchAllClasses();
    setTransferFormData({ student_id: studentId, to_class_id: '', remarks: '' });
    setIsTransferModalOpen(true);
  };

  const handleTransferStudent = async (e) => {
    e.preventDefault();
    if (!transferFormData.to_class_id) {
      toast.error(t('toast.select_class_required', 'يرجى اختيار الفوج الجديد'));
      return;
    }
    const toClass = allClasses.find(c => String(c.id) === String(transferFormData.to_class_id));
    const toClassName = toClass ? toClass.name : '';

    const confirmed = await confirm({
      title: t('dialog.transfer_class_title', 'تحويل التلميذ إلى فوج آخر'),
      message: t('dialog.transfer_class_msg', `هل أنت متأكد من تحويل التلميذ إلى الفوج الجديد "${toClassName}"؟`),
      confirmText: t('dialog.confirm_transfer', 'نعم، قم بالتحويل'),
      cancelText: t('dialog.cancel_btn', 'تراجع'),
      type: 'warning'
    });

    if (confirmed) {
      try {
        setTransferring(true);
        const assignRes = await api.post(`/students/${transferFormData.student_id}/classes`, { 
          class_id: transferFormData.to_class_id, 
          remarks: transferFormData.remarks 
        });
        if (assignRes.success) {
          await api.delete(`/students/${transferFormData.student_id}/classes/${id}`);
          toast.success(t('toast.transfer_success', 'تم تحويل التلميذ بنجاح'));
          setIsTransferModalOpen(false);
          fetchClassDetails();
        }
      } catch (err) {
        toast.error(err.message || t('toast.transfer_failed', 'فشل تحويل التلميذ'));
      } finally {
        setTransferring(false);
      }
    }
  };

  const handleUnassignStudent = async (studentId) => {
    const confirmed = await confirm({
      title: t('dialog.unassign_class_title', 'إلغاء تسجيل التلميذ'),
      message: t('dialog.unassign_class_msg', 'هل أنت متأكد من إلغاء تسجيل هذا التلميذ من الفوج؟'),
      confirmText: t('dialog.confirm_unassign', 'نعم، إلغاء التسجيل'),
      cancelText: t('dialog.cancel_btn', 'تراجع'),
      type: 'danger'
    });

    if (confirmed) {
      try {
        const res = await api.delete(`/students/${studentId}/classes/${id}`);
        if (res.success) {
          toast.success(t('toast.unassign_success', 'تم إلغاء التسجيل بنجاح'));
          fetchClassDetails();
        }
      } catch (err) {
        toast.error(err.message || t('toast.unassign_failed', 'فشل إلغاء التسجيل'));
      }
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

  useEffect(() => {
    if (!editForm) return;
    const track = tracks.find(t => String(t.id) === String(editForm.academic_track_id));
    const trackName = track ? (isRTL ? track.name_ar : (track.name_fr || track.name_en || track.name_ar)) : '';
    const grade = editForm.grade_level ? editForm.grade_level : '';
    const section = editForm.section ? ' - ' + editForm.section : '';
    const generated = `${trackName} - ${grade}${section}`.replace(/^ - | - $/g, '').trim();
    if (generated && generated !== editForm.name) {
      setEditForm(prev => ({ ...prev, name: generated }));
    }
  }, [editForm?.academic_track_id, editForm?.grade_level, editForm?.section, tracks, isRTL]);

  const handleUpdateClass = async (e) => {
    e.preventDefault();
    try {
      const hasEmptyRoom = Object.values(daySchedule).some(config => config?.enabled && !config.room?.trim());
      if (hasEmptyRoom) {
        toast.warning(t('classes.validation_room_empty', 'الرجاء تحديد قاعة لكل يوم دراسي / Please assign a room for all active days.'));
        return;
      }

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
    <div className="space-y-6 w-full max-w-[96%] 2xl:max-w-[90%] mx-auto pb-12">
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

      <div className="grid grid-cols-1 xl:grid-cols-4 lg:grid-cols-3 gap-6">
        {/* Left Column: Class Info */}
        <div className="xl:col-span-1 lg:col-span-1 space-y-6">
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
                  <span className="block text-xs text-slate-500 mb-1">{t('classes.section_label', 'Group N°')}</span>
                  <span className="font-bold text-slate-800">{classInfo.section}</span>
                </div>
              </div>
              
              <div>
                <span className="block text-xs text-slate-500 mb-1">{t('classes.academic_year_label')}</span>
                <span className="font-bold text-slate-800">{classInfo.academic_year_name}</span>
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

          {/* Schedule Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              {t('timetable.title', 'أوقات الدراسة')}
            </h3>
            <div className="space-y-3">
              {DAY_OPTIONS.map(day => {
                const schedule = daySchedule[day];
                if (!schedule?.enabled) return null;
                return (
                  <div key={day} className="flex items-center justify-between text-sm p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="font-bold text-slate-700">{t(`timetable.days.${day}`)}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-600 font-mono bg-white px-2 py-1 rounded-md border border-slate-200">
                        {schedule.start} - {schedule.end}
                      </span>
                      {(schedule.room || classInfo.classroom) && (
                        <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md">
                          {schedule.room || classInfo.classroom}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {!Object.values(daySchedule).some(s => s?.enabled) && (
                <div className="text-center text-sm text-slate-400 py-4 italic">
                  {t('timetable.no_schedule', 'لا توجد أوقات دراسة محددة')}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Roster */}
        <div className="xl:col-span-3 lg:col-span-2">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h3 className="font-black text-slate-800 flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                {t('classes.view_roster')} ({roster.length})
              </h3>
              <button
                onClick={handleOpenAssignModal}
                className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-lg text-sm font-bold hover:bg-emerald-100 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                {t('classes.assign_student_btn', 'إضافة تلميذ')}
              </button>
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
                      <th className="px-4 py-3">{t('students.assigned_at', 'تاريخ التسجيل')}</th>
                      <th className="px-4 py-3">{t('finance.payment_status', 'حالة الدفع')}</th>
                      <th className="px-4 py-3 text-center w-36"></th>
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
                        <td className="px-4 py-3 text-slate-500 font-medium">
                          {student.assigned_at ? new Date(student.assigned_at).toLocaleDateString(language === 'ar' ? 'ar-EG' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}
                        </td>
                        <td className="px-4 py-3">
                          {student.total_debt > 0 ? (
                            <div className="flex flex-col">
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded w-fit">
                                <AlertCircle className="w-3 h-3" />
                                {t('finance.status_unpaid', 'غير مسدد')}
                              </span>
                              <span className="text-xs font-mono font-bold text-rose-600 mt-0.5">
                                {formatCurrency(student.total_debt, settings?.currency || 'DZD')}
                              </span>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-700 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded w-fit">
                              <CheckCircle className="w-3 h-3" />
                              {t('finance.no_dues', 'لا توجد ديون')}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => navigate(`/finance?student_id=${student.id}&action=new`)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title={t('dashboard.new_payment', 'دفع جديد')}
                          >
                            <Wallet className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenTransferModal(student.id)}
                            className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                            title={t('students.transfer_class', 'تحويل')}
                          >
                            <ArrowRightLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleUnassignStudent(student.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title={t('students.unassign_class_btn', 'إلغاء التسجيل')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => navigate(`/students/${student.id}?print=true`)}
                            className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
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
        maxWidth="max-w-2xl"
        disableOutsideClick={true}
        headerActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              form="edit-class-form"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {t('common.save')}
            </button>
          </div>
        }
      >
        {editForm && (
          <form id="edit-class-form" onSubmit={handleUpdateClass} className="space-y-4 text-xs pb-32">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.class_name')} *</label>
              <input
                type="text"
                readOnly
                required
                value={editForm.name}
                className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-500 focus:outline-none cursor-not-allowed font-bold"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('classes.academic_track')} *</label>
                <CustomSelect
                  required
                  value={editForm.academic_track_id}
                  onChange={e => setEditForm({ ...editForm, academic_track_id: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  {tracks.map(tr => (
                    <option key={tr.id} value={tr.id}>{isRTL ? tr.name_ar : (tr.name_fr || tr.name_en || tr.name_ar)}</option>
                  ))}
                </CustomSelect>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('classes.grade_level')}</label>
                <input
                  type="text"
                  value={editForm.grade_level}
                  onChange={e => setEditForm({ ...editForm, grade_level: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('classes.section_label', 'Group N°')} *</label>
                <input
                  type="text"
                  required
                  value={editForm.section}
                  onChange={e => setEditForm({ ...editForm, section: e.target.value })}
                  placeholder={t('classes.section_placeholder', 'E.g., A, 1, 101')}
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
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.homeroom_teacher')}</label>
              <CustomSelect
                value={editForm.homeroom_teacher_id}
                onChange={e => setEditForm({ ...editForm, homeroom_teacher_id: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">{t('classes.select_teacher')}</option>
                {teachers.map(tea => (
                  <option key={tea.id} value={tea.id}>{tea.first_name} {tea.last_name} ({tea.specialty})</option>
                ))}
              </CustomSelect>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('classes.pricing_type')}</label>
                <CustomSelect
                  required
                  value={editForm.pricing_type}
                  onChange={e => handlePricingTypeChange(setEditForm, e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="MONTH_BASED">{t('classes.pricing_monthly')}</option>
                  <option value="SESSION_BASED">{t('classes.pricing_session')}</option>
                  <option value="HOUR_BASED">{t('classes.pricing_hourly')}</option>
                </CustomSelect>
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
                <div className="grid grid-cols-[minmax(90px,110px)_minmax(0,1fr)_auto_minmax(0,1fr)_minmax(80px,120px)] items-center gap-2 px-2 pb-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('timetable.day', 'Day')}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">{t('common.start_time', 'Start Time')}</span>
                  <span className="w-2"></span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">{t('common.end_time', 'End Time')}</span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">{t('classes.room_name', 'Room')}</span>
                </div>
                {DAY_OPTIONS.map((day) => (
                  <div key={day} className="grid grid-cols-[minmax(90px,110px)_minmax(0,1fr)_auto_minmax(0,1fr)_minmax(80px,120px)] items-center gap-2 rounded-xl bg-white px-2 py-2 border border-slate-200">
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

                    <div className="flex items-center gap-1">
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

                    <div className="flex items-center gap-1">
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

                    <div className="flex items-center gap-1">
                      <CustomSelect
                        value={daySchedule[day]?.room || ''}
                        disabled={!daySchedule[day]?.enabled}
                        onChange={(e) => {
                          setDaySchedule((prev) => ({
                            ...prev,
                            [day]: { ...prev[day], room: e.target.value }
                          }));
                        }}
                        className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 text-[11px] focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                      >
                        <option value="">{t('classes.room_placeholder', 'Room...')}</option>
                        {rooms.map(r => (
                          <option key={r.id} value={r.name}>{r.name}</option>
                        ))}
                      </CustomSelect>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('common.status', 'Status')}</label>
              <CustomSelect
                value={editForm.status}
                onChange={e => setEditForm({ ...editForm, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {getAllowedStatusOptions(editForm.status).map((status) => (
                  <option key={status} value={status}>{t(`classes.status_${status.toLowerCase()}`, status)}</option>
                ))}
              </CustomSelect>
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

      {/* Assign Student Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title={t('classes.assign_student_title', 'إضافة تلميذ للفوج')}
      >
        <form id="assign-student-form" onSubmit={handleAssignStudent} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('classes.select_student', 'اختر التلميذ')}
            </label>
            <CustomSelect
              value={assignStudentId}
              onChange={e => setAssignStudentId(e.target.value)}
              searchable
            >
              <option value="">{t('classes.select_student_placeholder', 'ابحث عن تلميذ...')}</option>
              {allStudents.map(s => {
                const isAlready = roster.some(r => String(r.id) === String(s.id));
                const stName = language === 'ar' ? `${s.first_name_ar} ${s.last_name_ar}` : `${s.first_name_en} ${s.last_name_en}`;
                const photoUrl = s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(stName)}&background=10b981&color=fff`;
                const searchString = `${s.first_name_ar} ${s.last_name_ar} ${s.first_name_en} ${s.last_name_en} ${s.matricule}`;
                return (
                  <option key={s.id} value={s.id} disabled={isAlready} data-image={photoUrl} data-search={searchString}>
                    {s.matricule} - {stName} {isAlready ? t('students.class_already_enrolled', ' (مسجل به بالفعل)') : ''}
                  </option>
                );
              })}
            </CustomSelect>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('students.enrollment_remarks', 'ملاحظات التسجيل (اختياري)')}
            </label>
            <textarea
              rows="2"
              value={assignRemarks}
              onChange={e => setAssignRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-3 mt-4">
            <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Wallet className="w-4 h-4 text-emerald-600" />
              {t('finance.payment_section', 'القسم المالي')}
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {t('finance.payment_amount', 'مبلغ الدفع')}
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={paymentAmount}
                  onChange={e => setPaymentAmount(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  {t('finance.reduction', 'التخفيض')}
                </label>
                <input
                  type="number"
                  min="0"
                  max={paymentAmount || 0}
                  step="500"
                  value={reduction}
                  onChange={e => setReduction(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-lg p-2 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700">{t('finance.total_amount', 'المبلغ الإجمالي')}</span>
              <span className="text-sm font-bold text-emerald-600">
                {formatCurrency(Math.max(0, Number(paymentAmount || 0) - Number(reduction || 0)), settings?.currency || 'DZD')}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAssignModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              disabled={assigning}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md shadow-emerald-600/30 text-sm disabled:opacity-50 flex items-center gap-2"
              disabled={!assignStudentId || assigning}
            >
              <Save className="w-4 h-4" />
              {assigning ? t('common.saving', 'جاري الحفظ...') : t('common.save', 'حفظ')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Transfer Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title={t('students.transfer_class', 'تحويل التلميذ إلى فوج آخر')}
      >
        <form id="transfer-student-form" onSubmit={handleTransferStudent} className="space-y-4 pb-32">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('students.select_class_label', 'الفوج الجديد')}
            </label>
            <CustomSelect
              value={transferFormData.to_class_id}
              onChange={e => setTransferFormData({ ...transferFormData, to_class_id: e.target.value })}
              searchable
            >
              <option value="">{t('students.select_class_placeholder', 'اختر الفوج الجديد...')}</option>
              {allClasses.filter(c => String(c.id) !== String(id)).map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.grade_level ? `(${c.grade_level})` : ''} {c.track_name_ar ? `- ${c.track_name_ar}` : ''}
                  </option>
              ))}
            </CustomSelect>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('students.enrollment_remarks', 'ملاحظات التحويل (اختياري)')}
            </label>
            <textarea
              rows="2"
              value={transferFormData.remarks}
              onChange={e => setTransferFormData({ ...transferFormData, remarks: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsTransferModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors text-sm"
              disabled={transferring}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md shadow-emerald-600/30 text-sm disabled:opacity-50 flex items-center gap-2"
              disabled={!transferFormData.to_class_id || transferring}
            >
              <ArrowRightLeft className="w-4 h-4" />
              {transferring ? t('common.saving', 'جاري الحفظ...') : t('dialog.confirm_transfer', 'تأكيد التحويل')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
