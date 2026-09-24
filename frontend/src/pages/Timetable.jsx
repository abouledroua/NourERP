import React, { useState, useEffect } from 'react';
import { CalendarDays, Plus, Clock, Trash2, AlertCircle } from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useToast, useConfirm } from '../context/UIFeedbackContext';
import Modal from '../components/Modal';
import { formatTime } from '../utils/formatters';
import TimeInput from '../components/TimeInput';

const DAY_KEYS = [
  { id: 0, key: 'day_sunday' },
  { id: 1, key: 'day_monday' },
  { id: 2, key: 'day_tuesday' },
  { id: 3, key: 'day_wednesday' },
  { id: 4, key: 'day_thursday' },
  { id: 6, key: 'day_saturday' }
];

export default function Timetable() {
  const { t } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();

  const days = DAY_KEYS.map(d => ({
    id: d.id,
    name: t(`timetable.${d.key}`)
  }));

  const [viewMode, setViewMode] = useState('class'); // 'class' | 'teacher'
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [timetableSlots, setTimetableSlots] = useState([]);

  // Add Slot Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [slotForm, setSlotForm] = useState({
    classId: '',
    teacherId: '',
    subjectId: '',
    dayOfWeek: 0,
    startTime: '08:00',
    endTime: '09:00',
    room: 'Salle 01'
  });

  const fetchFilters = async () => {
    try {
      const [cRes, tRes, sRes, rRes] = await Promise.all([
        api.get('/classes'),
        api.get('/teachers'),
        api.get('/teachers/subjects'),
        api.get('/rooms')
      ]);
      if (cRes.success) {
        setClasses(cRes.data);
        if (cRes.data.length > 0 && !selectedId) {
          setSelectedId(cRes.data[0].id);
        }
      }
      if (tRes.success) setTeachers(tRes.data);
      if (sRes.success) setSubjects(sRes.data);
      if (rRes.success) {
        setRooms(rRes.data);
        if (rRes.data.length > 0) {
          setSlotForm(prev => ({ ...prev, room: rRes.data[0].name }));
        }
      }
    } catch (err) {
      console.error('[TIMETABLE] Error loading filters:', err);
    }
  };

  const fetchTimetable = async () => {
    if (!selectedId) return;
    try {
      const param = viewMode === 'class' ? `classId=${selectedId}` : `teacherId=${selectedId}`;
      const res = await api.get(`/timetable?${param}`);
      if (res.success) setTimetableSlots(res.data);
    } catch (err) {
      console.error('[TIMETABLE] Error loading slots:', err);
    }
  };

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchTimetable();
  }, [selectedId, viewMode]);

  const handleAddSlot = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/timetable', slotForm);
      if (res.success) {
        toast.success(t('toast.slot_created'));
        setIsModalOpen(false);
        fetchTimetable();
      }
    } catch (err) {
      toast.error(err.message || t('toast.slot_create_failed'));
    }
  };

  const handleDeleteSlot = async (id) => {
    const confirmed = await confirm({
      title: t('dialog.delete_slot_title'),
      message: t('dialog.delete_slot_msg'),
      confirmText: t('dialog.confirm_delete_slot'),
      cancelText: t('dialog.cancel_btn'),
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await api.delete(`/timetable/${id}`);
      if (res.success) {
        toast.success(t('toast.slot_deleted'));
        fetchTimetable();
      }
    } catch (err) {
      toast.error(err.message || t('toast.slot_delete_failed'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('timetable.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('timetable.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="bg-slate-200/80 p-1 rounded-2xl flex items-center text-xs font-bold">
            <button
              onClick={() => {
                setViewMode('class');
                if (classes.length > 0) setSelectedId(classes[0].id);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                viewMode === 'class' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('timetable.by_class')}
            </button>
            <button
              onClick={() => {
                setViewMode('teacher');
                if (teachers.length > 0) setSelectedId(teachers[0].id);
              }}
              className={`px-3 py-1.5 rounded-xl transition-all ${
                viewMode === 'teacher' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              {t('timetable.by_teacher')}
            </button>
          </div>

          <button
            onClick={() => {
              setSlotForm(prev => ({
                ...prev,
                classId: viewMode === 'class' ? selectedId : (classes[0]?.id || ''),
                teacherId: viewMode === 'teacher' ? selectedId : (teachers[0]?.id || ''),
                subjectId: subjects[0]?.id || ''
              }));
              setIsModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('timetable.add_slot')}</span>
          </button>
        </div>
      </div>

      {/* Target Selector */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex items-center gap-3">
        <span className="text-xs font-bold text-slate-700">
          {viewMode === 'class' ? t('timetable.select_class_label') : t('timetable.select_teacher_label')}
        </span>
        <select
          value={selectedId}
          onChange={e => setSelectedId(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none min-w-[220px]"
        >
          {viewMode === 'class'
            ? classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
            : teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name} ({t.specialty})</option>)
          }
        </select>
      </div>

      {/* Weekly Timetable Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {days.map(day => {
          const daySlots = timetableSlots.filter(s => s.day_of_week === day.id);
          return (
            <div key={day.id} className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col">
              <div className="px-5 py-3.5 bg-slate-900 text-white font-extrabold text-xs flex items-center justify-between">
                <span>{day.name}</span>
                <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded-full text-slate-300 font-mono">
                  {t('timetable.slots_count', { count: daySlots.length })}
                </span>
              </div>

              <div className="p-4 flex-1 space-y-2.5 bg-slate-50/50">
                {daySlots.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8 italic">{t('timetable.no_slots')}</p>
                ) : (
                  daySlots.map(slot => (
                    <div
                      key={slot.id}
                      className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-2xs space-y-1 relative group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-xs text-slate-900">{slot.subject_name_ar}</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-[10px] bg-slate-100 px-1.5 py-0.5 rounded-md text-slate-600 font-bold">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </span>
                          <button
                            onClick={() => handleDeleteSlot(slot.id)}
                            className="text-slate-300 hover:text-rose-500 transition-colors p-1"
                            title={t('timetable.delete_slot')}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-500">
                        {viewMode === 'class' ? (
                          <>{t('timetable.col_teacher')}: <strong className="text-slate-700">{slot.teacher_name}</strong></>
                        ) : (
                          <>{t('timetable.col_class')}: <strong className="text-slate-700">{slot.class_name}</strong></>
                        )}
                        {slot.room && <span className="mr-2 text-slate-400 font-mono">({slot.room})</span>}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Add Slot */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={t('timetable.modal_add_title')}
      >
        <form onSubmit={handleAddSlot} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('timetable.col_class')}</label>
              <select
                required
                value={slotForm.classId}
                onChange={e => setSlotForm({ ...slotForm, classId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('timetable.col_teacher')}</label>
              <select
                required
                value={slotForm.teacherId}
                onChange={e => setSlotForm({ ...slotForm, teacherId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {teachers.map(t => <option key={t.id} value={t.id}>{t.first_name} {t.last_name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('timetable.col_subject')}</label>
              <select
                required
                value={slotForm.subjectId}
                onChange={e => setSlotForm({ ...slotForm, subjectId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name_ar}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('timetable.col_day')}</label>
              <select
                value={slotForm.dayOfWeek}
                onChange={e => setSlotForm({ ...slotForm, dayOfWeek: parseInt(e.target.value, 10) })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {days.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('timetable.col_time_start')}</label>
              <TimeInput
                
                required
                value={slotForm.startTime}
                onChange={e => setSlotForm({ ...slotForm, startTime: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('timetable.col_time_end')}</label>
              <TimeInput
                
                required
                value={slotForm.endTime}
                onChange={e => setSlotForm({ ...slotForm, endTime: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('timetable.col_room')}</label>
              <select
                value={slotForm.room}
                onChange={e => setSlotForm({ ...slotForm, room: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {rooms.map(r => (
                  <option key={r.id} value={r.name}>{r.name} ({r.code || ''})</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30"
            >
              {t('timetable.save_slot_btn')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
