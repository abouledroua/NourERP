import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Shuffle, ArrowRight, CheckCircle2, UserCheck, Shield, School, Eye, Trash2, DoorOpen, Edit, Search } from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useToast, useConfirm } from '../context/UIFeedbackContext';
import Modal from '../components/Modal';
import RoomsManager from '../components/RoomsManager';
import Teachers from './Teachers';
import TimeInput from '../components/TimeInput';
import CustomSelect from '../components/CustomSelect';

const DAY_OPTIONS = [6, 0, 1, 2, 3, 4, 5];

const createDefaultDaySchedule = () => Object.fromEntries(
  DAY_OPTIONS.map((day) => [
    day,
    {
      enabled: day !== 5,
      start: '08:00',
      end: '16:00',
      room: ''
    }
  ])
);

const PRICING_PRESETS = {
  MONTH_BASED: 2000,
  SESSION_BASED: 1500,
  HOUR_BASED: 500,
};

const normalizePricingType = (value) => {
  switch (value) {
    case 'MONTHLY':
      return 'MONTH_BASED';
    case 'SESSION':
      return 'SESSION_BASED';
    case 'HOURLY':
      return 'HOUR_BASED';
    case 'MONTH_BASED':
    case 'SESSION_BASED':
    case 'HOUR_BASED':
      return value;
    default:
      return 'MONTH_BASED';
  }
};

const getPricingPreset = (pricingType) => PRICING_PRESETS[normalizePricingType(pricingType)] || 0;

const serializeDaySchedule = (scheduleMap, t) => Object.entries(scheduleMap)
  .filter(([, config]) => config?.enabled && config?.start && config?.end)
  .map(([day, config]) => {
    const roomPart = config.room ? ` (${config.room})` : '';
    return `${t(`timetable.days.${day}`)} ${config.start} - ${config.end}${roomPart}`;
  })
  .join(' | ');

const getClassStatusLabels = (status, t) => {
  const labels = {
    PENDING: t('classes.status_pending', 'En lancement'),
    ACTIVE: t('classes.status_active', 'Démarré'),
    STOPPED: t('classes.status_stopped', 'Arrêté'),
    ARCHIVED: t('classes.status_archived', 'Archivé'),
  };
  return labels[status] || status;
};

const canDeleteClass = (cls) => cls?.status === 'PENDING' || Number(cls?.enrolled_students_count || 0) === 0;

const getNextStatus = (currentStatus, targetStatus) => {
  const allowed = {
    PENDING: ['ACTIVE'],
    ACTIVE: ['STOPPED'],
    STOPPED: ['ACTIVE', 'ARCHIVED'],
    ARCHIVED: [],
  };

  if (targetStatus === currentStatus) return null;
  if (allowed[currentStatus]?.includes(targetStatus)) return targetStatus;
  return null;
};


export default function Classes() {
  const { t, isRTL } = useLanguage();
  const { tracks, activeYear } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [teacherSearch, setTeacherSearch] = useState('');
  const [roomSearch, setRoomSearch] = useState('');
  const [daySchedule, setDaySchedule] = useState(createDefaultDaySchedule());
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
  const [isTeachersModalOpen, setIsTeachersModalOpen] = useState(false);
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false);
  const [activeRoomDropdown, setActiveRoomDropdown] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [addModalSeed, setAddModalSeed] = useState(0);
  const classNameRef = useRef(null);

  useEffect(() => {
    if (isAddModalOpen) {
      const timer = setTimeout(() => {
        classNameRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAddModalOpen]);

  // Promotion / Rollover Wizard
  const [isRolloverOpen, setIsRolloverOpen] = useState(false);
  const [rolloverSourceClass, setRolloverSourceClass] = useState('');
  const [rolloverStudents, setRolloverStudents] = useState([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState([]);
  const [rolloverAction, setRolloverAction] = useState('PROMOTE'); // PROMOTE | RETAIN | GRADUATE
  const [targetClassId, setTargetClassId] = useState('');

  // List Filter & Pagination
  const [listSearch, setListSearch] = useState('');
  const [gradeFilter, setGradeFilter] = useState('');
  const [teacherFilter, setTeacherFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const filteredClasses = classes.filter(cls => {
      if (gradeFilter && cls.grade_level !== gradeFilter) return false;
      const teacherName = cls.homeroom_teacher_name || '';
      if (teacherFilter && teacherName !== teacherFilter) return false;
      if (!listSearch) return true;
      const q = listSearch.toLowerCase();
      return (
        cls.name?.toLowerCase().includes(q) ||
        cls.track_name_ar?.toLowerCase().includes(q) ||
        cls.grade_level?.toLowerCase().includes(q) ||
        teacherName.toLowerCase().includes(q)
      );
    });
  const totalPages = Math.max(1, Math.ceil(filteredClasses.length / itemsPerPage));
  const paginatedClasses = filteredClasses.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => {
      setCurrentPage(1);
    }, [listSearch, gradeFilter, teacherFilter]);

  const getEmptyClassForm = () => ({
    name: '',
    academic_track_id: tracks[0]?.id || '',
    grade_level: '',
    section: '',
    capacity: 30,
    room_number: '',
    homeroom_teacher_id: '',
    academic_year_id: activeYear?.id || '',
    pricing_type: 'MONTH_BASED',
    pricing_value: 5000,
    schedule_info: ''
  });

  // New Class Form
  const [newClass, setNewClass] = useState(getEmptyClassForm());

  const resetNewClassForm = () => {
    setTeacherSearch('');
    setRoomSearch('');
    setDaySchedule(createDefaultDaySchedule());
    setNewClass(getEmptyClassForm());
  };

  useEffect(() => {
    const track = tracks.find(t => String(t.id) === String(newClass.academic_track_id));
    const trackName = track ? (isRTL ? track.name_ar : (track.name_fr || track.name_en || track.name_ar)) : '';

    const parts = [trackName];
    if (newClass.grade_level) parts.push(newClass.grade_level);
    if (newClass.section) parts.push(newClass.section);

    const generated = parts.filter(Boolean).join(' - ');
    if (generated && generated !== newClass.name) {
      setNewClass(prev => ({ ...prev, name: generated }));
    }
  }, [newClass.academic_track_id, newClass.grade_level, newClass.section, tracks, isRTL]);

  const openAddModal = () => {
    setAddModalSeed((prev) => prev + 1);
    resetNewClassForm();
    setIsAddModalOpen(true);
  };

  const closeAddModal = () => {
    setIsAddModalOpen(false);
    setAddModalSeed((prev) => prev + 1);
    resetNewClassForm();
  };

  useEffect(() => {
    const selectedTeacher = teachers.find((teacher) => String(teacher.id) === String(newClass.homeroom_teacher_id));
    if (selectedTeacher) {
      setTeacherSearch(`${selectedTeacher.first_name} ${selectedTeacher.last_name} (${selectedTeacher.specialty || ''})`.trim());
    } else if (!newClass.homeroom_teacher_id) {
      setTeacherSearch('');
    }
  }, [teachers, newClass.homeroom_teacher_id]);

  useEffect(() => {
    if (newClass.classroom) {
      const selectedRoom = rooms.find((room) => room.name === newClass.classroom);
      setRoomSearch(selectedRoom ? `${selectedRoom.name}${selectedRoom.building ? ` - ${selectedRoom.building}` : ''}` : newClass.classroom);
    } else {
      setRoomSearch('');
    }
  }, [rooms, newClass.classroom]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const res = await api.get('/classes');
      if (res.success) setClasses(res.data);
    } catch (err) {
      console.error('[CLASSES] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const res = await api.get('/teachers');
      if (res.success) setTeachers(res.data);
    } catch (err) {
      console.error('[TEACHERS] Error:', err);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await api.get('/rooms');
      if (res.success) setRooms(res.data);
    } catch (err) {
      console.error('[ROOMS] Error:', err);
    }
  };

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
    fetchRooms();
  }, []);



  const handlePricingTypeChange = (setter, nextType) => {
    const normalizedType = normalizePricingType(nextType);
    setter((prev) => ({
      ...prev,
      pricing_type: normalizedType,
      pricing_value: getPricingPreset(normalizedType)
    }));
  };

  const adjustPricingValue = (setter, currentValue, delta) => {
    const nextValue = Math.max(0, Number(currentValue || 0) + delta);
    setter((prev) => ({
      ...prev,
      pricing_value: nextValue
    }));
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const hasEmptyRoom = Object.values(daySchedule).some(config => config?.enabled && !config.room?.trim());
      if (hasEmptyRoom) {
        toast.warning(t('classes.validation_room_empty', 'الرجاء تحديد قاعة لكل يوم دراسي / Please assign a room for all active days.'));
        return;
      }

      const scheduleText = serializeDaySchedule(daySchedule, t);
      const res = await api.post('/classes', {
        ...newClass,
        schedule_info: scheduleText,
        academic_year_id: newClass.academic_year_id || activeYear?.id
      });
      if (res.success) {
        toast.success(res.message || t('toast.class_created'));
        setIsAddModalOpen(false);
        resetNewClassForm();
        fetchClasses();
      }
    } catch (err) {
      toast.error(err.message || t('toast.class_create_failed'));
    }
  };

  const handleStatusChange = async (cls, nextStatus) => {
    const allowedTransition = getNextStatus(cls.status, nextStatus);
    if (!allowedTransition) return;

    try {
      const res = await api.put(`/classes/${cls.id}`, {
        ...cls,
        status: nextStatus,
      });

      if (res.success) {
        toast.success(res.message || t('toast.class_updated'));
        fetchClasses();
      }
    } catch (err) {
      toast.error(err.message || t('toast.update_failed'));
    }
  };

  const handleDeleteClass = async (cls) => {
    if (!canDeleteClass(cls)) {
      toast.error(t('classes.delete_not_allowed'));
      return;
    }

    const confirmed = await confirm({
      title: t('dialog.delete_class_title'),
      message: t('dialog.delete_class_msg', { name: cls.name }),
      confirmText: t('dialog.confirm_delete_class'),
      cancelText: t('dialog.cancel_btn'),
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await api.delete(`/classes/${cls.id}`);
      if (res.success) {
        toast.success(res.message || t('toast.class_deleted'));
        fetchClasses();
      }
    } catch (err) {
      toast.error(err.message || t('toast.class_delete_failed'));
    }
  };

  const handleLoadRolloverStudents = async (classId) => {
    setRolloverSourceClass(classId);
    if (!classId) {
      setRolloverStudents([]);
      return;
    }
    try {
      const res = await api.get(`/classes/${classId}/roster`);
      if (res.success) {
        setRolloverStudents(res.data);
        setSelectedStudentIds(res.data.map(s => s.id)); // select all by default
      }
    } catch (err) {
      toast.error(err.message || t('toast.class_roster_failed'));
    }
  };

  const handleExecuteRollover = async () => {
    if (selectedStudentIds.length === 0) {
      toast.warning(t('toast.rollover_select_students'));
      return;
    }
    if ((rolloverAction === 'PROMOTE' || rolloverAction === 'REASSIGN') && !targetClassId) {
      toast.warning(t('toast.rollover_select_target'));
      return;
    }

    try {
      const res = await api.post('/classes/rollover', {
        studentIds: selectedStudentIds,
        action: rolloverAction,
        targetClassId: targetClassId || null,
        targetAcademicYearId: activeYear?.id || null,
        remarks: `Rollover ${rolloverAction}`
      });

      if (res.success) {
        toast.success(res.message || t('toast.rollover_success'));
        setIsRolloverOpen(false);
        fetchClasses();
      }
    } catch (err) {
      toast.error(err.message || t('toast.rollover_failed'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('classes.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('classes.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsRoomsModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 shadow-xs transition-colors"
          >
            <DoorOpen className="w-4 h-4 text-emerald-600" />
            <span>{t('classes.manage_rooms_btn')}</span>
          </button>
          <button
            onClick={() => setIsRolloverOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 shadow-xs transition-colors"
          >
            <Shuffle className="w-4 h-4 text-emerald-600" />
            <span>{t('classes.rollover_btn')}</span>
          </button>
          <button
            onClick={openAddModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('classes.add_btn')}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative">
            <div className="absolute inset-y-0 right-0 rtl:right-0 ltr:left-0 pr-3.5 rtl:pr-3.5 ltr:pl-3.5 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder={t('classes.search_placeholder', 'بحث بالاسم، المستوى، الأستاذ... / Search...')}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 rtl:pr-10 ltr:pl-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
            />
          </div>
          <div className="min-w-[150px]">
            <CustomSelect
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">{t('common.all_grades', 'كل المستويات')}</option>
              {[...new Set(classes.map(c => c.grade_level).filter(Boolean))].sort().map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </CustomSelect>
          </div>
          <div className="min-w-[150px]">
            <CustomSelect
              value={teacherFilter}
              onChange={e => setTeacherFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">{t('common.all_teachers', 'كل الأساتذة')}</option>
              {teachers.map(tItem => (
                <option key={tItem.id} value={tItem.first_name + ' ' + tItem.last_name}>{tItem.first_name} {tItem.last_name}</option>
              ))}
            </CustomSelect>
          </div>
        </div>

      {/* Class Cards Grid */}
      {filteredClasses.length === 0 ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-3xl p-10 text-center shadow-xs">
          <div className="text-slate-400 mb-2">
            <School className="w-10 h-10 mx-auto" />
          </div>
          <p className="text-sm font-bold text-slate-600">
            {t('classes.no_classes_found')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {t('classes.no_classes_hint')}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginatedClasses.map((cls) => {
            const occupancy = cls.capacity > 0 ? Math.min(100, Math.round((cls.enrolled_students_count / cls.capacity) * 100)) : 0;
            return (
              <div key={cls.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700">
                      {cls.track_name_ar}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black border ${cls.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                      cls.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        cls.status === 'STOPPED' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                      {getClassStatusLabels(cls.status, t)}
                    </span>
                  </div>

                  <h3 className="text-base font-black text-slate-900 leading-snug">
                    <Link to={`/classes/${cls.id}`} className="hover:text-emerald-600 hover:underline transition-colors">
                      {cls.name}
                    </Link>
                  </h3>
                  <p className="text-xs text-slate-500">
                    {t('classes.grade_level_label')}: <strong className="text-slate-700">{cls.grade_level}</strong> | {t('classes.section_label', 'Group N°')}: <strong className="text-slate-700">{cls.section}</strong>
                  </p>
                </div>

                {/* Occupancy Progress */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">{t('classes.occupancy_label')}:</span>
                    <span className="font-bold text-slate-900">
                      {cls.enrolled_students_count} / {cls.capacity} {t('classes.students_count')} ({occupancy}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${occupancy >= 90 ? 'bg-rose-500' : (occupancy >= 70 ? 'bg-amber-500' : 'bg-emerald-500')
                        }`}
                      style={{ width: `${occupancy}%` }}
                    />
                  </div>
                </div>

                {/* Homeroom teacher & View roster button */}
                <div className="pt-2 space-y-3 border-t border-slate-100">
                  <div className="text-[11px] text-slate-600 truncate max-w-[170px]">
                    {cls.homeroom_teacher_name ? (
                      <span>{t('classes.homeroom_teacher_label')}: <strong className="text-slate-800">{cls.homeroom_teacher_name}</strong></span>
                    ) : (
                      <span className="text-slate-400 italic">{t('classes.no_homeroom_teacher')}</span>
                    )}
                  </div>

                  <div className="flex items-center flex-wrap gap-2">
                    {cls.status === 'PENDING' && (
                      <button
                        onClick={() => handleStatusChange(cls, 'ACTIVE')}
                        className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold"
                      >
                        {t('classes.start_group')}
                      </button>
                    )}

                    {cls.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleStatusChange(cls, 'STOPPED')}
                        className="px-2 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-[10px] font-bold"
                      >
                        {t('classes.stop_group')}
                      </button>
                    )}

                    {cls.status === 'STOPPED' && (
                      <>
                        <button
                          onClick={() => handleStatusChange(cls, 'ACTIVE')}
                          className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-bold"
                        >
                          {t('classes.restart_group')}
                        </button>
                        <button
                          onClick={() => handleStatusChange(cls, 'ARCHIVED')}
                          className="px-2 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-xl text-[10px] font-bold"
                        >
                          {t('classes.archive_group')}
                        </button>
                      </>
                    )}

                    <Link
                      to={`/classes/${cls.id}`}
                      title={t('common.edit', 'Edit')}
                      className="p-1.5 rounded-xl text-xs font-bold border bg-slate-50 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 border-slate-200 transition-colors"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDeleteClass(cls)}
                      title={t('classes.delete_class')}
                      className={`p-1.5 rounded-xl text-xs font-bold border transition-colors ${canDeleteClass(cls)
                        ? 'bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border-slate-200'
                        : 'bg-slate-100 text-slate-300 border-slate-200 cursor-not-allowed opacity-60'}`}
                      disabled={!canDeleteClass(cls)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      <div className="flex items-center justify-center gap-2 mt-6">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-colors"
          >
            {t('common.prev', 'السابق / Prev')}
          </button>
          <span className="text-xs font-bold text-slate-600 px-2">
            {currentPage} / {totalPages}
          </span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold transition-colors"
          >
            {t('common.next', 'التالي / Next')}
          </button>
        </div>

      {/* =========================================================================
          MODAL: CREATE NEW CLASS
          ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={closeAddModal}
        title={t('classes.modal_add_title')}
        maxWidth="max-w-2xl"
        disableOutsideClick={true}
        headerActions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              form="add-class-form"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
            >
              {t('common.save')}
            </button>
          </div>
        }
      >
        <form id="add-class-form" key={addModalSeed} onSubmit={handleCreateClass} className="space-y-4 text-xs pb-32">
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('classes.class_name')} *</label>
            <input
              ref={classNameRef}
              type="text"
              readOnly
              required
              value={newClass.name}
              placeholder={t('classes.class_name_placeholder')}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 text-slate-500 focus:outline-none cursor-not-allowed font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.academic_track')} *</label>
              <CustomSelect
                value={newClass.academic_track_id}
                onChange={e => setNewClass({ ...newClass, academic_track_id: e.target.value })}
                options={tracks.map(tr => ({ value: tr.id, label: isRTL ? tr.name_ar : (tr.name_fr || tr.name_en || tr.name_ar) }))}
                placeholder={t('classes.academic_track')}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.grade_level')}</label>
              <input
                type="text"
                value={newClass.grade_level}
                onChange={e => setNewClass({ ...newClass, grade_level: e.target.value })}
                placeholder={t('classes.grade_level_placeholder')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.section_label', 'Group N°')} *</label>
              <input
                type="text"
                required
                value={newClass.section}
                onChange={e => setNewClass({ ...newClass, section: e.target.value })}
                placeholder={t('classes.section_placeholder', 'E.g., A, 1, 101')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.max_capacity')}</label>
              <input
                type="number"
                value={newClass.capacity}
                onChange={e => setNewClass({ ...newClass, capacity: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold text-slate-700">{t('classes.homeroom_teacher')}</label>
              <button type="button" onClick={() => setIsTeachersModalOpen(true)} className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline">
                {t('settings.manage_teachers', 'Manage Teachers')}
              </button>
            </div>
            <div className="relative">
              <div className="flex items-center gap-2">
                {newClass.homeroom_teacher_id && teachers.find(t => String(t.id) === String(newClass.homeroom_teacher_id))?.photo_url ? (
                  <img
                    src={teachers.find(t => String(t.id) === String(newClass.homeroom_teacher_id)).photo_url}
                    alt="Teacher"
                    className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-sm"
                  />
                ) : newClass.homeroom_teacher_id ? (
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 shadow-sm">
                    <UserCheck className="w-5 h-5 text-slate-400" />
                  </div>
                ) : null}
                <input
                  type="text"
                  value={teacherSearch}
                  onFocus={() => setIsTeacherDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setIsTeacherDropdownOpen(false), 200)}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTeacherSearch(value);
                    setIsTeacherDropdownOpen(true);

                    const selectedTeacher = teachers.find((teacher) => {
                      const fullName = `${teacher.first_name} ${teacher.last_name}`.trim().toLowerCase();
                      const reversedName = `${teacher.last_name} ${teacher.first_name}`.trim().toLowerCase();
                      return fullName === value.trim().toLowerCase() || reversedName === value.trim().toLowerCase();
                    });

                    setNewClass({
                      ...newClass,
                      homeroom_teacher_id: selectedTeacher ? String(selectedTeacher.id) : ''
                    });
                  }}
                  placeholder={t('classes.select_teacher')}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {isTeacherDropdownOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                  {teachers
                    .filter((tea) => {
                      if (!teacherSearch) return true;
                      const searchLower = teacherSearch.toLowerCase();
                      const fullName = `${tea.first_name} ${tea.last_name}`.toLowerCase();
                      const reversedName = `${tea.last_name} ${tea.first_name}`.toLowerCase();
                      return fullName.includes(searchLower) || reversedName.includes(searchLower);
                    })
                    .map((tea) => (
                      <div
                        key={tea.id}
                        onClick={() => {
                          setTeacherSearch(`${tea.first_name} ${tea.last_name}`);
                          setNewClass({
                            ...newClass,
                            homeroom_teacher_id: String(tea.id)
                          });
                          setIsTeacherDropdownOpen(false);
                        }}
                        className="flex items-center gap-3 p-2.5 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                      >
                        {tea.photo_url ? (
                          <img src={tea.photo_url} alt="" className="w-8 h-8 rounded-full object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                            <UserCheck className="w-4 h-4 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <div className="text-sm font-bold text-slate-700">{tea.first_name} {tea.last_name}</div>
                          <div className="text-xs text-slate-500 flex gap-1 items-center">
                            {tea.specialty && <span>{tea.specialty}</span>}
                            {tea.specialty && tea.grades && <span>•</span>}
                            {tea.grades && <span className="font-semibold text-emerald-600">{tea.grades}</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  {teachers.filter((tea) => {
                    if (!teacherSearch) return true;
                    const searchLower = teacherSearch.toLowerCase();
                    const fullName = `${tea.first_name} ${tea.last_name}`.toLowerCase();
                    const reversedName = `${tea.last_name} ${tea.first_name}`.toLowerCase();
                    return fullName.includes(searchLower) || reversedName.includes(searchLower);
                  }).length === 0 && (
                      <div className="p-3 text-sm text-slate-500 text-center">No teachers found</div>
                    )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.pricing_type')}</label>
              <CustomSelect
                value={newClass.pricing_type}
                onChange={e => handlePricingTypeChange(setNewClass, e.target.value)}
                options={[
                  { value: 'MONTH_BASED', label: t('classes.pricing_monthly') },
                  { value: 'SESSION_BASED', label: t('classes.pricing_session') },
                  { value: 'HOUR_BASED', label: t('classes.pricing_hourly') }
                ]}
                placeholder={t('classes.pricing_type')}
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.pricing_value')}</label>
              <div className="relative">
                <input
                  type="number"
                  required
                  min="0"
                  step="500"
                  value={newClass.pricing_value}
                  onChange={e => setNewClass({ ...newClass, pricing_value: Number(e.target.value) || 0 })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pr-10 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
                <div className="absolute inset-y-0 right-0 flex flex-col border-l border-slate-200">
                  <button
                    type="button"
                    onClick={() => adjustPricingValue(setNewClass, newClass.pricing_value, 500)}
                    className="w-8 h-1/2 border-b border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-tr-xl"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => adjustPricingValue(setNewClass, newClass.pricing_value, -500)}
                    className="w-8 h-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-br-xl"
                  >
                    −
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block font-bold text-slate-700">{t('timetable.title')}</label>
              <button
                type="button"
                onClick={() => setIsRoomsModalOpen(true)}
                className="text-[10px] text-emerald-600 hover:underline font-bold"
              >
                + {t('classes.manage_rooms_btn')}
              </button>
            </div>
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

                  <div className="flex items-center gap-1 relative">
                    <input
                      type="text"
                      value={daySchedule[day]?.room || ''}
                      disabled={!daySchedule[day]?.enabled}
                      onFocus={() => setActiveRoomDropdown(day)}
                      onBlur={() => setTimeout(() => { if (activeRoomDropdown === day) setActiveRoomDropdown(null) }, 200)}
                      onChange={(e) => {
                        setDaySchedule((prev) => ({
                          ...prev,
                          [day]: { ...prev[day], room: e.target.value }
                        }));
                        setActiveRoomDropdown(day);
                      }}
                      placeholder={t('classes.room_placeholder', 'Room...')}
                      className="w-full min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1.5 text-slate-900 disabled:cursor-not-allowed disabled:opacity-50 text-[11px]"
                    />
                    {activeRoomDropdown === day && (
                      <div className="absolute top-full right-0 z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-40 overflow-y-auto">
                        {rooms
                          .filter(r => {
                            const search = (daySchedule[day]?.room || '').toLowerCase();
                            if (!search) return true;
                            const roomName = `${r.name}${r.building ? ` - ${r.building}` : ''}`.toLowerCase();
                            return roomName.includes(search);
                          })
                          .map(r => (
                            <div
                              key={r.id}
                              onMouseDown={(e) => {
                                e.preventDefault(); // Prevent onBlur from firing before click
                                setDaySchedule((prev) => ({
                                  ...prev,
                                  [day]: { ...prev[day], room: `${r.name}${r.building ? ` - ${r.building}` : ''}` }
                                }));
                                setActiveRoomDropdown(null);
                              }}
                              className="px-3 py-2 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                            >
                              <div className="text-sm font-bold text-slate-700">{r.name}</div>
                              {r.building && <div className="text-[10px] text-slate-500">{r.building}</div>}
                            </div>
                          ))}
                        {rooms.filter(r => {
                          const search = (daySchedule[day]?.room || '').toLowerCase();
                          if (!search) return true;
                          const roomName = `${r.name}${r.building ? ` - ${r.building}` : ''}`.toLowerCase();
                          return roomName.includes(search);
                        }).length === 0 && (
                            <div className="p-3 text-xs text-slate-500 text-center">No rooms found</div>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30 transition-all"
            >
              {t('common.save')}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: STUDENT PROMOTION & ROLLOVER WIZARD
          ========================================================================= */}
      <Modal
          isOpen={isRolloverOpen}
          onClose={() => setIsRolloverOpen(false)}
          title={t('classes.modal_rollover_title')}
          maxWidth="max-w-3xl"
          headerActions={
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsRolloverOpen(false)}
                className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-bold transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                form="rollover-form"
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
              >
                {t('common.save')}
              </button>
            </div>
          }
        >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800 font-medium">
            {t('classes.subtitle')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.rollover_source_class')} *</label>
              <CustomSelect
                value={rolloverSourceClass}
                onChange={val => handleLoadRolloverStudents(val)}
                options={classes.map(c => ({ value: c.id, label: c.name }))}
                placeholder={t('common.search')}
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.rollover_action')} *</label>
              <CustomSelect
                value={rolloverAction}
                onChange={val => setRolloverAction(val)}
                options={[
                  { value: 'PROMOTE', label: t('classes.action_promote') },
                  { value: 'RETAIN', label: t('classes.action_retain') },
                  { value: 'GRADUATE', label: t('classes.action_graduate') },
                  { value: 'REASSIGN', label: t('classes.action_reassign') }
                ]}
                placeholder={t('classes.rollover_action')}
              />
            </div>

            {(rolloverAction === 'PROMOTE' || rolloverAction === 'REASSIGN' || rolloverAction === 'RETAIN') && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('classes.rollover_target_class')} *</label>
                <CustomSelect
                  value={targetClassId}
                  onChange={val => setTargetClassId(val)}
                  options={classes.map(c => ({ value: c.id, label: `${c.name} (${c.grade_level})` }))}
                  placeholder={t('classes.select_target_class')}
                />
              </div>
            )}
          </div>

          {/* Students Checklist */}
          {rolloverStudents.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">
                  {selectedStudentIds.length} / {rolloverStudents.length} {t('classes.selected_count')}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedStudentIds(
                    selectedStudentIds.length === rolloverStudents.length ? [] : rolloverStudents.map(s => s.id)
                  )}
                  className="text-emerald-700 font-bold hover:underline"
                >
                  {selectedStudentIds.length === rolloverStudents.length ? t('classes.deselect_all') : t('classes.select_all')}
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 p-1">
                {rolloverStudents.map(st => (
                  <label key={st.id} className="flex items-center gap-3 p-2 hover:bg-slate-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedStudentIds.includes(st.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedStudentIds([...selectedStudentIds, st.id]);
                        } else {
                          setSelectedStudentIds(selectedStudentIds.filter(id => id !== st.id));
                        }
                      }}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="font-mono font-bold text-slate-600">{st.matricule}</span>
                    <span className="font-bold text-slate-900">{st.first_name_ar} {st.last_name_ar}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsRolloverOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleExecuteRollover}
              disabled={selectedStudentIds.length === 0}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30 transition-all disabled:opacity-50"
            >
              {t('classes.execute_rollover')}
            </button>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL: ROOMS / SALLES MANAGER
          ========================================================================= */}
      <Modal
        isOpen={isRoomsModalOpen}
        onClose={() => {
          setIsRoomsModalOpen(false);
          fetchRooms();
        }}
        title={t('rooms.title', 'إدارة القاعات الدراسية')}
        maxWidth="max-w-4xl"
      >
        <RoomsManager onRoomsChange={setRooms} />
      </Modal>

      {/* =========================================================================
          MODAL: TEACHERS MANAGER
          ========================================================================= */}
      <Modal
        isOpen={isTeachersModalOpen}
        onClose={() => {
          setIsTeachersModalOpen(false);
          fetchTeachers();
        }}
        title={t('settings.manage_teachers', 'Manage Teachers')}
        maxWidth="max-w-6xl"
      >
        <div className="max-h-[80vh] overflow-y-auto">
          <Teachers
            isEmbedded={true}
            onSelectTeacher={(tea) => {
              setNewClass({
                ...newClass,
                homeroom_teacher_id: String(tea.id)
              });
              setTeacherSearch(`${tea.first_name} ${tea.last_name}`);
              setIsTeachersModalOpen(false);
            }}
          />
        </div>
      </Modal>
    </div>
  );
}
