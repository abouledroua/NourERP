import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Users, Plus, Shuffle, ArrowRight, CheckCircle2, UserCheck, Shield, School, Eye, Trash2, DoorOpen } from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useToast, useConfirm } from '../context/UIFeedbackContext';
import Modal from '../components/Modal';
import RoomsManager from '../components/RoomsManager';

export default function Classes() {
  const { t, isRTL } = useLanguage();
  const { tracks, activeYear } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();

  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
  const [rooms, setRooms] = useState([]);
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

  // New Class Form
  const [newClass, setNewClass] = useState({
    name: '',
    academic_track_id: '',
    grade_level: 1,
    capacity: 30,
    room_number: '',
    homeroom_teacher_id: '',
    academic_year_id: '',
    pricing_type: 'MONTHLY',
    pricing_value: 0,
    schedule_info: ''
  });

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



  const handleCreateClass = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/classes', {
        ...newClass,
        academic_year_id: newClass.academic_year_id || activeYear?.id
      });
      if (res.success) {
        toast.success(res.message || t('toast.class_created'));
        setIsAddModalOpen(false);
        setNewClass({
          name: '',
          academic_track_id: tracks[0]?.id || '',
          grade_level: 1,
          capacity: 30,
          room_number: '',
          homeroom_teacher_id: '',
          academic_year_id: '',
          pricing_type: 'MONTHLY',
          pricing_value: 0,
          schedule_info: ''
        });
        fetchClasses();
      }
    } catch (err) {
      toast.error(err.message || t('toast.class_create_failed'));
    }
  };

  const handleDeleteClass = async (cls) => {
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
            <span>{t('classes.manage_rooms_btn', 'Gérer les salles')}</span>
          </button>
          <button
            onClick={() => setIsRolloverOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 shadow-xs transition-colors"
          >
            <Shuffle className="w-4 h-4 text-emerald-600" />
            <span>{t('classes.rollover_btn')}</span>
          </button>
          <button
            onClick={() => {
              if (tracks.length > 0 && !newClass.academic_track_id) {
                setNewClass(prev => ({
                  ...prev,
                  academic_track_id: tracks[0].id,
                  academic_year_id: activeYear?.id || ''
                }));
              }
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('classes.add_btn')}</span>
          </button>
        </div>
      </div>

      {/* Class Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => {
          const occupancy = cls.capacity > 0 ? Math.min(100, Math.round((cls.enrolled_students_count / cls.capacity) * 100)) : 0;
          return (
            <div key={cls.id} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700">
                    {cls.track_name_ar}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400 flex items-center gap-2">
                    {cls.matricule && <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">{cls.matricule}</span>}
                    <span>{cls.classroom || 'بدون قاعة'}</span>
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 leading-snug">
                  <Link to={`/classes/${cls.id}`} className="hover:text-emerald-600 hover:underline transition-colors">
                    {cls.name}
                  </Link>
                </h3>
                <p className="text-xs text-slate-500">
                  المستوى: <strong className="text-slate-700">{cls.grade_level}</strong> | الفوج: <strong className="text-slate-700">{cls.section}</strong>
                </p>
              </div>

              {/* Occupancy Progress */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">نسبة المقاعد:</span>
                  <span className="font-bold text-slate-900">
                    {cls.enrolled_students_count} / {cls.capacity} {t('classes.students_count')} ({occupancy}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      occupancy >= 90 ? 'bg-rose-500' : (occupancy >= 70 ? 'bg-amber-500' : 'bg-emerald-500')
                    }`}
                    style={{ width: `${occupancy}%` }}
                  />
                </div>
              </div>

              {/* Homeroom teacher & View roster button */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <div className="text-[11px] text-slate-600 truncate max-w-[170px]">
                  {cls.homeroom_teacher_name ? (
                    <span>المشرف: <strong className="text-slate-800">{cls.homeroom_teacher_name}</strong></span>
                  ) : (
                    <span className="text-slate-400 italic">بدون أستاذ مشرف</span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleDeleteClass(cls)}
                    title={t('classes.delete_class', 'حذف الفوج')}
                    className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-xl text-xs font-bold border border-slate-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* =========================================================================
          MODAL: CREATE NEW CLASS
          ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('classes.modal_add_title')}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreateClass} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('classes.class_name')} *</label>
            <input
              ref={classNameRef}
              autoFocus
              type="text"
              required
              value={newClass.name}
              onChange={e => setNewClass({ ...newClass, name: e.target.value })}
              placeholder={t('classes.class_name_placeholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.academic_track')} *</label>
              <select
                required
                value={newClass.academic_track_id}
                onChange={e => setNewClass({ ...newClass, academic_track_id: e.target.value })}
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
                value={newClass.grade_level}
                onChange={e => setNewClass({ ...newClass, grade_level: e.target.value })}
                placeholder="1AM / KG2 / 3AP"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.max_capacity')}</label>
              <input
                type="number"
                value={newClass.capacity}
                onChange={e => setNewClass({ ...newClass, capacity: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-bold text-slate-700">{t('classes.room_name')}</label>
                <button
                  type="button"
                  onClick={() => setIsRoomsModalOpen(true)}
                  className="text-[10px] text-emerald-600 hover:underline font-bold"
                >
                  + {t('classes.manage_rooms_btn', 'Gérer les salles')}
                </button>
              </div>
              <select
                value={newClass.classroom || ''}
                onChange={e => setNewClass({ ...newClass, classroom: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">{t('classes.room_placeholder')}</option>
                {rooms.map(r => (
                  <option key={r.id} value={r.name}>
                    {r.name} ({r.capacity} {t('rooms.seats', 'مقعد / places')}{r.building ? ` - ${r.building}` : ''})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('classes.homeroom_teacher')}</label>
            <select
              value={newClass.homeroom_teacher_id}
              onChange={e => setNewClass({ ...newClass, homeroom_teacher_id: e.target.value })}
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
                value={newClass.pricing_type}
                onChange={e => setNewClass({ ...newClass, pricing_type: e.target.value })}
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
                value={newClass.pricing_value}
                onChange={e => setNewClass({ ...newClass, pricing_value: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">التوقيت / Schedule Info</label>
            <input
              type="text"
              value={newClass.schedule_info}
              onChange={e => setNewClass({ ...newClass, schedule_info: e.target.value })}
              placeholder="مثال: السبت والثلاثاء 10:00 إلى 12:00"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
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
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-800 font-medium">
            {t('classes.subtitle')}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.rollover_source_class')} *</label>
              <select
                value={rolloverSourceClass}
                onChange={e => handleLoadRolloverStudents(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="">{t('common.search')}</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('classes.rollover_action')} *</label>
              <select
                value={rolloverAction}
                onChange={e => setRolloverAction(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="PROMOTE">{t('classes.action_promote')}</option>
                <option value="RETAIN">{t('classes.action_retain')}</option>
                <option value="GRADUATE">{t('classes.action_graduate')}</option>
                <option value="REASSIGN">{t('classes.action_reassign')}</option>
              </select>
            </div>

            {(rolloverAction === 'PROMOTE' || rolloverAction === 'REASSIGN' || rolloverAction === 'RETAIN') && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('classes.rollover_target_class')} *</label>
                <select
                  value={targetClassId}
                  onChange={e => setTargetClassId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="">{t('classes.select_target_class')}</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.grade_level})</option>
                  ))}
                </select>
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
    </div>
  );
}
