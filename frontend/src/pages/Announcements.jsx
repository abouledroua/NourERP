import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Trash2,
  Edit,
  Search,
  Filter,
  Users,
  AlertCircle,
  Clock,
  Sparkles,
  Calendar,
  CheckCircle,
  GraduationCap
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { toast, confirmDialog } from '../context/UIFeedbackContext';
import api from '../utils/api';
import Modal from '../components/Modal';
import { formatDate } from '../utils/formatters';

export default function Announcements() {
  const { t } = useLanguage();

  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [targetFilter, setTargetFilter] = useState('ALL_TYPES');
  const [priorityFilter, setPriorityFilter] = useState('');

  // Aux state for target dropdowns
  const [tracks, setTracks] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    priority: 'NORMAL',
    target_type: 'ALL',
    target_id: '',
    expires_at: ''
  });
  const [saving, setSaving] = useState(false);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (targetFilter && targetFilter !== 'ALL_TYPES') params.append('target_type', targetFilter);
      if (priorityFilter) params.append('priority', priorityFilter);

      const res = await api.get(`/announcements?${params.toString()}`);
      if (res.success) {
        setAnnouncements(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'فشل تحميل الإعلانات');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [search, targetFilter, priorityFilter]);

  // Load auxiliary targets once
  useEffect(() => {
    async function loadAuxData() {
      try {
        const [tracksRes, classesRes, studentsRes] = await Promise.all([
          api.get('/settings/academic-tracks').catch(() => ({ data: [] })),
          api.get('/classes?limit=100').catch(() => ({ data: { classes: [] } })),
          api.get('/students?limit=100').catch(() => ({ data: { students: [] } }))
        ]);

        if (tracksRes.data) setTracks(tracksRes.data);
        if (classesRes.data?.classes) setClasses(classesRes.data.classes);
        if (studentsRes.data?.students) setStudents(studentsRes.data.students);
      } catch (err) {
        console.warn('Aux target fetch warning:', err);
      }
    }
    loadAuxData();
  }, []);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      title: '',
      content: '',
      priority: 'NORMAL',
      target_type: 'ALL',
      target_id: '',
      expires_at: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (ann) => {
    setEditingId(ann.id);
    setFormData({
      title: ann.title || '',
      content: ann.content || '',
      priority: ann.priority || 'NORMAL',
      target_type: ann.target_type || 'ALL',
      target_id: ann.target_id || '',
      expires_at: ann.expires_at ? ann.expires_at.substring(0, 10) : ''
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.content.trim()) {
      toast.error(t('announcements.modal_title_label', 'العنوان والمحتوى مطلوبان'));
      return;
    }

    try {
      setSaving(true);
      if (editingId) {
        await api.put(`/announcements/${editingId}`, formData);
        toast.success(t('announcements.update_success', 'تم تحديث الإعلان بنجاح'));
      } else {
        await api.post('/announcements', formData);
        toast.success(t('announcements.save_success', 'تم نشر الإعلان بنجاح'));
      }
      setIsModalOpen(false);
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.message || 'حدث خطأ أثناء حفظ الإعلان');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const confirmed = await confirmDialog({
      title: t('common.delete', 'حذف'),
      message: t('announcements.delete_confirm', 'هل أنت متأكد من حذف هذا الإعلان؟'),
      confirmText: t('common.delete', 'حذف'),
      cancelText: t('common.cancel', 'إلغاء'),
      variant: 'danger'
    });
    if (!confirmed) return;

    try {
      await api.delete(`/announcements/${id}`);
      toast.success(t('announcements.delete_success', 'تم حذف الإعلان بنجاح'));
      fetchAnnouncements();
    } catch (err) {
      toast.error(err.message || 'فشل حذف الإعلان');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
              {t('announcements.title', 'التبليغات والإعلانات المدرسية')}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {t('announcements.subtitle', 'إرسال ونشر الإعلانات الموجهة للأولياء والتلاميذ حسب المسار أو الفوج أو فردياً')}
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-xs shadow-md shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all flex-shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('announcements.dispatch_new', 'نشر إعلان جديد')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث في الإعلانات..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pr-9 pl-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
          />
          <Search className="w-4 h-4 text-slate-400 absolute right-3 top-3 pointer-events-none" />
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Target Filter */}
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL_TYPES">{t('announcements.filter_target', 'كل الجهات المستهدفة')}</option>
            <option value="ALL">{t('announcements.target_all', 'الجميع')}</option>
            <option value="TRACK">{t('announcements.target_track', 'مسار محدد')}</option>
            <option value="CLASS">{t('announcements.target_class', 'قسم محدد')}</option>
            <option value="STUDENT">{t('announcements.target_student', 'تلميذ محدد')}</option>
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">{t('announcements.filter_priority', 'كل درجات الأهمية')}</option>
            <option value="NORMAL">{t('announcements.priority_normal', 'عادي')}</option>
            <option value="IMPORTANT">{t('announcements.priority_important', 'هام')}</option>
            <option value="URGENT">{t('announcements.priority_urgent', 'عاجل')}</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      {loading ? (
        <div className="py-20 text-center">
          <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-slate-400">جاري تحميل الإعلانات...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-12 text-center text-slate-400 text-xs shadow-xs">
          <Megaphone className="w-12 h-12 text-slate-200 mx-auto mb-3" />
          <p className="font-bold text-slate-600">{t('announcements.no_announcements', 'لا توجد إعلانات منشورة حالياً')}</p>
          <p className="mt-1 text-slate-400">يمكنك نشر إعلان جديد الآن وتوجيهه للجميع أو لفوج أو تلميذ محدد.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {announcements.map((ann) => (
            <div
              key={ann.id}
              className={`bg-white rounded-3xl border p-5 shadow-xs transition-all flex flex-col justify-between ${
                ann.priority === 'URGENT'
                  ? 'border-rose-200 hover:border-rose-400 ring-1 ring-rose-100'
                  : ann.priority === 'IMPORTANT'
                  ? 'border-amber-200 hover:border-amber-400 ring-1 ring-amber-100'
                  : 'border-slate-200/80 hover:border-emerald-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                        ann.priority === 'URGENT'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : ann.priority === 'IMPORTANT'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {ann.priority === 'URGENT'
                        ? t('announcements.priority_urgent', 'عاجل')
                        : ann.priority === 'IMPORTANT'
                        ? t('announcements.priority_important', 'هام')
                        : t('announcements.priority_normal', 'عادي')}
                    </span>

                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-100">
                      {ann.target_name || ann.target_type}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(ann)}
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors"
                      title={t('common.edit', 'تعديل')}
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title={t('common.delete', 'حذف')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug">
                  {ann.title}
                </h3>

                <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-line">
                  {ann.content}
                </p>
              </div>

              <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5" />
                  {formatDate(ann.created_at)}
                </span>

                {ann.author_name && (
                  <span className="font-medium text-slate-600">
                    بواسطة: {ann.author_name}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Create / Edit Announcement */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? t('announcements.edit_title', 'تعديل الإعلان') : t('announcements.dispatch_new', 'نشر إعلان جديد')}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('announcements.modal_title_label', 'عنوان الإعلان *')}
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="مثال: تنبيه بخصوص موعد امتحانات الفصل الأول..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('announcements.modal_priority_label', 'درجة الأهمية')}
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="NORMAL">{t('announcements.priority_normal', 'عادي')}</option>
                <option value="IMPORTANT">{t('announcements.priority_important', 'هام')}</option>
                <option value="URGENT">{t('announcements.priority_urgent', 'عاجل')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('announcements.modal_target_label', 'تحديد الجمهور المستهدف *')}
              </label>
              <select
                value={formData.target_type}
                onChange={(e) => setFormData({ ...formData, target_type: e.target.value, target_id: '' })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="ALL">{t('announcements.target_all', 'جميع الأولياء والتلاميذ')}</option>
                <option value="TRACK">{t('announcements.target_track', 'مسار دراسي محدد')}</option>
                <option value="CLASS">{t('announcements.target_class', 'قسم / فوج دراسي')}</option>
                <option value="STUDENT">{t('announcements.target_student', 'تلميذ محدد')}</option>
              </select>
            </div>
          </div>

          {/* Conditional Target Picker */}
          {formData.target_type === 'TRACK' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('announcements.modal_select_track', 'اختر المسار الدراسي')}
              </label>
              <select
                required
                value={formData.target_id}
                onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
              >
                <option value="">-- اختر المسار الدراسي --</option>
                {tracks.map((tr) => (
                  <option key={tr.id} value={tr.id}>{tr.name_ar}</option>
                ))}
              </select>
            </div>
          )}

          {formData.target_type === 'CLASS' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('announcements.modal_select_class', 'اختر القسم / الفوج')}
              </label>
              <select
                required
                value={formData.target_id}
                onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
              >
                <option value="">-- اختر القسم أو الفوج --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>{cls.name} ({cls.grade_level})</option>
                ))}
              </select>
            </div>
          )}

          {formData.target_type === 'STUDENT' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('announcements.modal_select_student', 'اختر التلميذ')}
              </label>
              <select
                required
                value={formData.target_id}
                onChange={(e) => setFormData({ ...formData, target_id: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-bold"
              >
                <option value="">-- اختر التلميذ --</option>
                {students.map((st) => (
                  <option key={st.id} value={st.id}>
                    {st.first_name_ar} {st.last_name_ar} ({st.matricule})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('announcements.modal_content_label', 'محتوى الإعلان *')}
            </label>
            <textarea
              required
              rows={4}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="اكتب نص الإعلان الموجه هنا بكل تفاصيله..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              {t('announcements.modal_expires_label', 'تاريخ انتهاء الصلاحية (اختياري)')}
            </label>
            <input
              type="date"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              {t('common.cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-emerald-600/20"
            >
              {saving ? 'جاري الحفظ...' : editingId ? t('common.save_changes', 'حفظ التعديلات') : t('announcements.dispatch_new', 'نشر الإعلان')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
