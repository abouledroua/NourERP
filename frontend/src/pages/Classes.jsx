import React, { useState, useEffect } from 'react';
import { Users, Plus, Shuffle, ArrowRight, CheckCircle2, UserCheck, Shield, School, Eye, Trash2 } from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { useToast, useConfirm } from '../context/UIFeedbackContext';
import Modal from '../components/Modal';

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
  const [isRosterOpen, setIsRosterOpen] = useState(false);
  const [activeClass, setActiveClass] = useState(null);
  const [rosterStudents, setRosterStudents] = useState([]);

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
    academic_year_id: ''
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

  useEffect(() => {
    fetchClasses();
    fetchTeachers();
  }, []);

  const handleOpenRoster = async (cls) => {
    setActiveClass(cls);
    try {
      const res = await api.get(`/classes/${cls.id}/roster`);
      if (res.success) {
        setRosterStudents(res.data);
        setIsRosterOpen(true);
      }
    } catch (err) {
      toast.error(err.message || 'تعذر تحميل قائمة تلاميذ القسم');
    }
  };

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
          academic_year_id: ''
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
                  <span className="text-xs font-mono font-bold text-slate-400">
                    {cls.classroom || 'بدون قاعة'}
                  </span>
                </div>

                <h3 className="text-base font-black text-slate-900 leading-snug">
                  {cls.name}
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
                    onClick={() => handleOpenRoster(cls)}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-colors flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{t('classes.view_roster')}</span>
                  </button>
                  <button
                    onClick={() => handleDeleteClass(cls)}
                    title="حذف القسم"
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
              <label className="block font-bold text-slate-700 mb-1">{t('classes.room_name')}</label>
              <input
                type="text"
                value={newClass.classroom}
                onChange={e => setNewClass({ ...newClass, classroom: e.target.value })}
                placeholder={t('classes.room_placeholder')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
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
          MODAL: CLASS ROSTER
          ========================================================================= */}
      <Modal
        isOpen={isRosterOpen}
        onClose={() => setIsRosterOpen(false)}
        title={activeClass ? `${t('classes.modal_roster_title')}: ${activeClass.name} (${rosterStudents.length} ${t('classes.students_count')})` : t('classes.view_roster')}
      >
        <div className="space-y-3">
          {rosterStudents.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-6">{t('classes.roster_empty')}</p>
          ) : (
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold">
                  <th className="p-2 border border-slate-200">{t('students.col_matricule')}</th>
                  <th className="p-2 border border-slate-200">{t('students.col_name')}</th>
                  <th className="p-2 border border-slate-200">{t('students.parent_name')}</th>
                  <th className="p-2 border border-slate-200">{t('students.parent_phone')}</th>
                </tr>
              </thead>
              <tbody>
                {rosterStudents.map(s => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="p-2 border border-slate-200 font-mono font-bold text-slate-700">{s.matricule}</td>
                    <td className="p-2 border border-slate-200 font-bold text-slate-900">{s.first_name_ar} {s.last_name_ar}</td>
                    <td className="p-2 border border-slate-200">{s.parent_name}</td>
                    <td className="p-2 border border-slate-200 font-mono">{s.parent_phone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
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
    </div>
  );
}
