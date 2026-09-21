import React, { useState, useEffect, useRef } from 'react';
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Users, 
  DoorOpen,
  CheckCircle2, 
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useToast, useConfirm } from '../context/UIFeedbackContext';
import Modal from './Modal';

export default function RoomsManager({ onRoomsChange }) {
  const { t, isRTL } = useLanguage();
  const toast = useToast();
  const confirm = useConfirm();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const roomNameRef = useRef(null);
  const editRoomNameRef = useRef(null);

  const initialForm = {
    name: '',
    code: '',
    capacity: 30,
    building: '',
    floor: '',
    room_type: 'CLASSROOM',
    status: 'AVAILABLE',
    notes: ''
  };

  const [form, setForm] = useState(initialForm);

  const fetchRooms = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await api.get(`/rooms?${params.toString()}`);
      if (res.success) {
        setRooms(res.data);
        if (onRoomsChange) onRoomsChange(res.data);
      }
    } catch (err) {
      console.error('[ROOMS] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRooms();
    }, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  // Auto-focus when add modal opens
  useEffect(() => {
    if (isAddModalOpen) {
      const timer = setTimeout(() => {
        roomNameRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isAddModalOpen]);

  // Auto-focus when edit modal opens
  useEffect(() => {
    if (isEditModalOpen) {
      const timer = setTimeout(() => {
        editRoomNameRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isEditModalOpen]);

  const handleOpenAdd = () => {
    setForm({
      ...initialForm,
      code: `S-${(rooms.length + 1).toString().padStart(2, '0')}`
    });
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (r) => {
    setEditingRoom(r);
    setForm({
      name: r.name || '',
      code: r.code || '',
      capacity: r.capacity || 30,
      building: r.building || '',
      floor: r.floor || '',
      room_type: r.room_type || 'CLASSROOM',
      status: r.status || 'AVAILABLE',
      notes: r.notes || ''
    });
    setIsEditModalOpen(true);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/rooms', form);
      if (res.success) {
        toast.success(res.message || t('toast.room_created', 'تمت إضافة القاعة بنجاح'));
        setIsAddModalOpen(false);
        fetchRooms();
      }
    } catch (err) {
      toast.error(err.message || t('toast.room_create_failed', 'فشل إضافة القاعة'));
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editingRoom) return;
    try {
      const res = await api.put(`/rooms/${editingRoom.id}`, form);
      if (res.success) {
        toast.success(res.message || t('toast.room_updated', 'تم تحديث بيانات القاعة بنجاح'));
        setIsEditModalOpen(false);
        setEditingRoom(null);
        fetchRooms();
      }
    } catch (err) {
      toast.error(err.message || t('toast.room_update_failed', 'فشل تحديث القاعة'));
    }
  };

  const handleDelete = async (r) => {
    const confirmed = await confirm({
      title: t('dialog.delete_room_title', 'حذف القاعة'),
      message: t('dialog.delete_room_msg', `هل أنت متأكد من حذف القاعة "${r.name}" (${r.code || ''})؟`),
      confirmText: t('dialog.confirm_delete_room', 'نعم، حذف القاعة'),
      cancelText: t('dialog.cancel_btn', 'إلغاء'),
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await api.delete(`/rooms/${r.id}`);
      if (res.success) {
        toast.success(res.message || t('toast.room_deleted', 'تم حذف القاعة بنجاح'));
        fetchRooms();
      }
    } catch (err) {
      toast.error(err.message || t('toast.room_delete_failed', 'فشل حذف القاعة'));
    }
  };

  const getRoomTypeLabel = (type) => {
    switch (type) {
      case 'CLASSROOM': return t('rooms.type_classroom', 'قاعة دراسية / Salle de cours');
      case 'LAB': return t('rooms.type_lab', 'مخبر علمي / Laboratoire');
      case 'AMPHI': return t('rooms.type_amphi', 'مدرج / Amphithéâtre');
      case 'SPORT': return t('rooms.type_sport', 'قاعة رياضة / Salle de sport');
      default: return t('rooms.type_other', 'أخرى / Autre');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <span>{t('rooms.title', 'إدارة القاعات الدراسية')}</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('rooms.subtitle', 'إضافة وتعديل وحذف القاعات الدراسية وتحديد سعتها ومواقعها')}
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('rooms.add_btn', 'إضافة قاعة جديدة')}</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
            <DoorOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">{t('rooms.total_rooms', 'إجمالي القاعات')}</div>
            <div className="text-lg font-black text-slate-900">{rooms.length}</div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">{t('rooms.total_capacity', 'السعة الاستيعابية الإجمالية')}</div>
            <div className="text-lg font-black text-slate-900">
              {rooms.reduce((acc, r) => acc + Number(r.capacity || 0), 0)} {t('rooms.places', 'مقعد')}
            </div>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200/80 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[11px] text-slate-500 font-semibold">{t('rooms.available_rooms', 'القاعات الجاهزة')}</div>
            <div className="text-lg font-black text-slate-900">
              {rooms.filter(r => r.status === 'AVAILABLE').length}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <div className="absolute inset-y-0 right-0 rtl:right-0 ltr:left-0 pr-3 rtl:pr-3 ltr:pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('rooms.search_placeholder', 'بحث بالاسم، الرمز، أو المبنى...')}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 rtl:pr-9 ltr:pl-9 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          <option value="">{t('rooms.filter_all_status', 'جميع الحالات')}</option>
          <option value="AVAILABLE">{t('rooms.status_available', 'جاهزة ومتاحة')}</option>
          <option value="OCCUPIED">{t('rooms.status_occupied', 'مشغولة')}</option>
          <option value="MAINTENANCE">{t('rooms.status_maintenance', 'صيانة / غير متوفرة')}</option>
        </select>
      </div>

      {/* Rooms Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">{t('rooms.col_code', 'الرمز')}</th>
                <th className="py-3 px-4">{t('rooms.col_name', 'اسم القاعة')}</th>
                <th className="py-3 px-4">{t('rooms.col_type', 'النوع')}</th>
                <th className="py-3 px-4">{t('rooms.col_capacity', 'السعة')}</th>
                <th className="py-3 px-4">{t('rooms.col_location', 'المبنى / الطابق')}</th>
                <th className="py-3 px-4">{t('rooms.col_assigned_classes', 'الأفواج المربوطة')}</th>
                <th className="py-3 px-4">{t('rooms.col_status', 'الحالة')}</th>
                <th className="py-3 px-4 text-center">{t('common.actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    {t('common.loading')}
                  </td>
                </tr>
              ) : rooms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    {t('rooms.no_results', 'لا توجد قاعات تطابق البحث')}
                  </td>
                </tr>
              ) : (
                rooms.map(r => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-700">{r.code || '-'}</td>
                    <td className="py-3 px-4">
                      <div className="font-extrabold text-slate-900 text-sm">{r.name}</div>
                      {r.notes && (
                        <div className="text-[10px] text-slate-400 line-clamp-1">{r.notes}</div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-700">
                        {getRoomTypeLabel(r.room_type)}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {r.capacity} {t('rooms.seats', 'مقعد')}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {r.building || '-'} {r.floor ? `(${r.floor})` : ''}
                    </td>
                    <td className="py-3 px-4">
                      {Number(r.classes_count) > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200/60">
                          {r.classes_count} {t('rooms.groups_count', 'فوج')}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold ${
                        r.status === 'AVAILABLE' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50'
                          : r.status === 'OCCUPIED'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-amber-50 text-amber-700'
                      }`}>
                        {r.status === 'AVAILABLE' ? t('rooms.status_available', 'جاهزة') :
                         r.status === 'OCCUPIED' ? t('rooms.status_occupied', 'مشغولة') :
                         t('rooms.status_maintenance', 'صيانة')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(r)}
                          title={t('common.edit', 'تعديل')}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(r)}
                          title={t('common.delete', 'حذف')}
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
          MODAL: ADD ROOM
          ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('rooms.modal_add_title', 'إضافة قاعة دراسية جديدة')}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.name_label', 'اسم القاعة')} *</label>
              <input
                ref={roomNameRef}
                autoFocus
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="مثال: القاعة 01 / Salle 01"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.code_label', 'رمز القاعة (Code)')}</label>
              <input
                type="text"
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })}
                placeholder="S-01"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.capacity_label', 'السعة الاستيعابية')} *</label>
              <input
                type="number"
                required
                min={1}
                value={form.capacity}
                onChange={e => setForm({ ...form, capacity: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.type_label', 'نوع القاعة')}</label>
              <select
                value={form.room_type}
                onChange={e => setForm({ ...form, room_type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="CLASSROOM">{t('rooms.type_classroom', 'قاعة دراسية / Salle de cours')}</option>
                <option value="LAB">{t('rooms.type_lab', 'مخبر علمي / Laboratoire')}</option>
                <option value="AMPHI">{t('rooms.type_amphi', 'مدرج / Amphithéâtre')}</option>
                <option value="SPORT">{t('rooms.type_sport', 'قاعة رياضة / Salle de sport')}</option>
                <option value="OTHER">{t('rooms.type_other', 'أخرى / Autre')}</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.status_label', 'الحالة')}</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="AVAILABLE">{t('rooms.status_available', 'جاهزة ومتاحة')}</option>
                <option value="OCCUPIED">{t('rooms.status_occupied', 'مشغولة')}</option>
                <option value="MAINTENANCE">{t('rooms.status_maintenance', 'صيانة / غير متوفرة')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.building_label', 'المبنى / الجناح')}</label>
              <input
                type="text"
                value={form.building}
                onChange={e => setForm({ ...form, building: e.target.value })}
                placeholder="الجناح أ / Bâtiment A"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.floor_label', 'الطابق')}</label>
              <input
                type="text"
                value={form.floor}
                onChange={e => setForm({ ...form, floor: e.target.value })}
                placeholder="الطابق الأول / 1er Étage"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('rooms.notes_label', 'ملاحظات وتجهيزات')}</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="تجهيزات (عاكس ضوئي، تكييف، حواسيب...)"
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
          MODAL: EDIT ROOM
          ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingRoom(null);
        }}
        title={`${t('rooms.modal_edit_title', 'تعديل بيانات القاعة')}: ${editingRoom?.name || ''}`}
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleUpdate} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.name_label', 'اسم القاعة')} *</label>
              <input
                ref={editRoomNameRef}
                autoFocus
                type="text"
                required
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.code_label', 'رمز القاعة (Code)')}</label>
              <input
                type="text"
                value={form.code}
                onChange={e => setForm({ ...form, code: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-mono focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.capacity_label', 'السعة الاستيعابية')} *</label>
              <input
                type="number"
                required
                min={1}
                value={form.capacity}
                onChange={e => setForm({ ...form, capacity: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.type_label', 'نوع القاعة')}</label>
              <select
                value={form.room_type}
                onChange={e => setForm({ ...form, room_type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="CLASSROOM">{t('rooms.type_classroom', 'قاعة دراسية / Salle de cours')}</option>
                <option value="LAB">{t('rooms.type_lab', 'مخبر علمي / Laboratoire')}</option>
                <option value="AMPHI">{t('rooms.type_amphi', 'مدرج / Amphithéâtre')}</option>
                <option value="SPORT">{t('rooms.type_sport', 'قاعة رياضة / Salle de sport')}</option>
                <option value="OTHER">{t('rooms.type_other', 'أخرى / Autre')}</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.status_label', 'الحالة')}</label>
              <select
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="AVAILABLE">{t('rooms.status_available', 'جاهزة ومتاحة')}</option>
                <option value="OCCUPIED">{t('rooms.status_occupied', 'مشغولة')}</option>
                <option value="MAINTENANCE">{t('rooms.status_maintenance', 'صيانة / غير متوفرة')}</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.building_label', 'المبنى / الجناح')}</label>
              <input
                type="text"
                value={form.building}
                onChange={e => setForm({ ...form, building: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('rooms.floor_label', 'الطابق')}</label>
              <input
                type="text"
                value={form.floor}
                onChange={e => setForm({ ...form, floor: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('rooms.notes_label', 'ملاحظات وتجهيزات')}</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingRoom(null);
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30 transition-all"
            >
              {t('common.save_changes', 'تحديث البيانات')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
