import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Calendar, Phone, Mail, Award, Clock, Search, Trash2, Edit2, Wallet } from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import Modal from '../components/Modal';
import PhotoUpload from '../components/PhotoUpload';
import { useToast, useConfirm } from '../context/UIFeedbackContext';
import DateInput from '../components/DateInput';
import TimeInput from '../components/TimeInput';

export default function Teachers() {
  const { t, isRTL } = useLanguage();
  const { settings } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();

  const [teachers, setTeachers] = useState([]);
  const [substitutions, setSubstitutions] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);

  const [payTeacher, setPayTeacher] = useState(null);
  const [accounts, setAccounts] = useState([]);

  // Forms
  const [newTeacher, setNewTeacher] = useState({
    first_name: '',
    last_name: '',
    specialty: '',
    qualification: '',
    phone: '',
    email: '',
    payment_type: 'MONTHLY',
    monthly_salary: '',
    hourly_rate: '',
    photo_url: ''
  });

  const [editTeacher, setEditTeacher] = useState({
    id: '',
    first_name: '',
    last_name: '',
    specialty: '',
    qualification: '',
    phone: '',
    email: '',
    payment_type: 'MONTHLY',
    monthly_salary: '',
    hourly_rate: '',
    photo_url: ''
  });

  const [payForm, setPayForm] = useState({
    payment_type: 'MONTHLY',
    hours_taught: '',
    amount: 0,
    payment_method: 'CASH',
    account_id: ''
  });

  const [newSub, setNewSub] = useState({
    substitution_date: new Date().toISOString().slice(0, 10),
    original_teacher_id: '',
    substitute_teacher_id: '',
    class_id: '',
    subject_id: '',
    start_time: '08:00',
    end_time: '10:00',
    reason: ''
  });

  const fetchTeachers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/teachers?search=${encodeURIComponent(search)}`);
      if (res.success) setTeachers(res.data);
    } catch (err) {
      console.error('[TEACHERS] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubstitutions = async () => {
    try {
      const res = await api.get('/teachers/substitutions');
      if (res.success) setSubstitutions(res.data);
    } catch (err) {
      console.error('[SUBS] Error:', err);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [cRes, sRes, accRes] = await Promise.all([
        api.get('/classes'),
        api.get('/teachers/subjects'),
        api.get('/finance/accounts')
      ]);
      if (cRes.success) setClasses(cRes.data);
      if (sRes.success) setSubjects(sRes.data);
      if (accRes.success) setAccounts(accRes.data);
    } catch (err) {
      console.error('[DEPS] Error:', err);
    }
  };

  const resetAddForm = () => {
    setNewTeacher({
      first_name: '',
      last_name: '',
      specialty: '',
      qualification: '',
      phone: '',
      email: '',
      payment_type: 'MONTHLY',
      monthly_salary: '',
      hourly_rate: '',
      photo_url: ''
    });
    setIsAddModalOpen(false);
  };

  const resetEditForm = () => {
    setEditTeacher({
      id: '',
      first_name: '',
      last_name: '',
      specialty: '',
      qualification: '',
      phone: '',
      email: '',
      payment_type: 'MONTHLY',
      monthly_salary: '',
      hourly_rate: '',
      photo_url: ''
    });
    setIsEditModalOpen(false);
  };

  const resetPayForm = () => {
    setPayForm({
      payment_type: 'MONTHLY',
      hours_taught: '',
      amount: 0,
      payment_method: 'CASH',
      account_id: ''
    });
    setPayTeacher(null);
    setIsPayModalOpen(false);
  };

  useEffect(() => {
    fetchDependencies();
    fetchSubstitutions();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeachers();
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const handleCreateTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/teachers', newTeacher);
      if (res.success) {
        toast.success(res.message || t('toast.teacher_created'));
        resetAddForm();
        fetchTeachers();
      }
    } catch (err) {
      toast.error(err.message || t('toast.teacher_create_failed'));
    }
  };

  const handleCreateSub = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/teachers/substitutions', newSub);
      if (res.success) {
        toast.success(res.message || t('toast.sub_created'));
        setIsSubModalOpen(false);
        fetchSubstitutions();
      }
    } catch (err) {
      toast.error(err.message || t('toast.sub_create_failed'));
    }
  };

  const handlePayTeacher = async (e) => {
    e.preventDefault();
    if (!payTeacher) return;
    try {
      const res = await api.post(`/teachers/${payTeacher.id}/pay`, payForm);
      if (res.success) {
        toast.success(res.message || t('toast.teacher_paid', 'تم دفع راتب الأستاذ بنجاح'));
        resetPayForm();
        fetchTeachers();
      }
    } catch (err) {
      toast.error(err.message || t('toast.teacher_pay_failed', 'خطأ في دفع الراتب'));
    }
  };

  const handleUpdateTeacher = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/teachers/${editTeacher.id}`, editTeacher);
      if (res.success) {
        toast.success(res.message || t('toast.teacher_updated', 'تم تحديث بيانات الأستاذ بنجاح'));
        resetEditForm();
        fetchTeachers();
      }
    } catch (err) {
      toast.error(err.message || t('toast.teacher_update_failed', 'فشل في تحديث بيانات الأستاذ'));
    }
  };

  const handleDeleteTeacher = async (tea) => {
    const teacherName = `${tea.first_name} ${tea.last_name}`;
    const confirmed = await confirm({
      title: t('dialog.delete_teacher_title'),
      message: t('dialog.delete_teacher_msg', { name: teacherName, code: tea.employee_code }),
      confirmText: t('dialog.confirm_delete_teacher'),
      cancelText: t('dialog.cancel_btn'),
      type: 'danger'
    });

    if (!confirmed) return;

    try {
      const res = await api.delete(`/teachers/${tea.id}`);
      if (res.success) {
        toast.success(res.message || t('toast.teacher_deleted'));
        fetchTeachers();
      }
    } catch (err) {
      toast.error(err.message || t('toast.teacher_delete_failed'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('teachers.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('teachers.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsSubModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-2xl text-xs font-bold border border-slate-200 shadow-xs transition-colors"
          >
            <Clock className="w-4 h-4 text-emerald-600" />
            <span>{t('teachers.substitutions_btn')} ({substitutions.length})</span>
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('teachers.add_btn')}</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs">
        <div className="relative max-w-md">
          <div className="absolute inset-y-0 right-0 rtl:right-0 ltr:left-0 pr-3.5 rtl:pr-3.5 ltr:pl-3.5 flex items-center pointer-events-none text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="بحث بالاسم، التخصص، أو الهاتف..."
            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 rtl:pr-10 ltr:pl-10 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Teachers Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">{t('teachers.col_code')}</th>
                <th className="py-3.5 px-4">{t('teachers.col_name')}</th>
                <th className="py-3.5 px-4">{t('teachers.col_specialty')}</th>
                <th className="py-3.5 px-4">{t('teachers.col_phone')}</th>
                <th className="py-3.5 px-4">{t('teachers.col_salary', 'الراتب / نسبة بالساعة')}</th>
                <th className="py-3.5 px-4">{t('teachers.col_status', 'الحالة')}</th>
                <th className="py-3.5 px-4 text-center">{t('teachers.col_actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {teachers.map(tea => (
                <tr key={tea.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-700">{tea.employee_code}</td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2.5">
                      {tea.photo_url ? (
                        <img
                          src={tea.photo_url}
                          alt={`${tea.first_name} ${tea.last_name}`}
                          className="w-8 h-8 rounded-full object-cover border border-emerald-200 shadow-2xs flex-shrink-0"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                          {tea.first_name ? tea.first_name.charAt(0) : 'أ'}
                        </div>
                      )}
                      <div>
                        <div className="font-black text-slate-900 text-sm">
                          {tea.first_name} {tea.last_name}
                        </div>
                        {tea.email && (
                          <div className="text-[10px] text-slate-400">{tea.email}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-semibold text-emerald-800">{tea.specialty || '-'}</td>
                  <td className="py-3 px-4 font-mono text-slate-600">{tea.phone || '-'}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    {tea.payment_type === 'HOURLY' ? (
                      <div className="text-emerald-700">{formatCurrency(tea.hourly_rate || 0, settings.currency)} / {t('teachers.payment_hourly_short', 'ساعة')}</div>
                    ) : (
                      <div>{formatCurrency(tea.monthly_salary, settings.currency)} / {t('teachers.payment_monthly_short', 'شهر')}</div>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-50 text-emerald-700">
                      {tea.payment_type === 'HOURLY' ? t('teachers.payment_hourly', 'حسب الساعات') : t('teachers.payment_monthly', 'راتب شهري')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => {
                        setPayTeacher(tea);
                        setPayForm({
                          payment_type: tea.payment_type || 'MONTHLY',
                          hours_taught: '',
                          amount: tea.payment_type === 'MONTHLY' ? (tea.monthly_salary || 0) : 0,
                          payment_method: 'CASH',
                          account_id: accounts.find(a => a.is_default)?.id || (accounts[0]?.id || '')
                        });
                        setIsPayModalOpen(true);
                      }}
                      title={t('teachers.pay_salary', 'دفع الراتب')}
                      className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors mx-1"
                    >
                      <Wallet className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditTeacher(tea);
                        setIsEditModalOpen(true);
                      }}
                      title={t('teachers.edit_btn', 'تعديل الأستاذ')}
                      className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors mx-1"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTeacher(tea)}
                      title={t('teachers.delete_btn', 'حذف الأستاذ')}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors mx-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          MODAL: ADD TEACHER
          ========================================================================= */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={resetAddForm}
        title={t('teachers.modal_add_title')}
      >
        <form onSubmit={handleCreateTeacher} className="space-y-4 text-xs">
          {/* Teacher Photo Upload */}
          <PhotoUpload
            photoUrl={newTeacher.photo_url}
            onChange={(url) => setNewTeacher(prev => ({ ...prev, photo_url: url }))}
            uploadEndpoint="/upload/teacher"
            label={t('photo_upload.label')}
            shape="circle"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('teachers.first_name')} *</label>
              <input
                type="text"
                required
                value={newTeacher.first_name}
                onChange={e => setNewTeacher({ ...newTeacher, first_name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('teachers.last_name')} *</label>
              <input
                type="text"
                required
                value={newTeacher.last_name}
                onChange={e => setNewTeacher({ ...newTeacher, last_name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('teachers.specialty')} *</label>
              <input
                type="text"
                required
                value={newTeacher.specialty}
                onChange={e => setNewTeacher({ ...newTeacher, specialty: e.target.value })}
                placeholder={t('teachers.specialty_placeholder')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('teachers.qualification')}</label>
              <input
                type="text"
                value={newTeacher.qualification}
                onChange={e => setNewTeacher({ ...newTeacher, qualification: e.target.value })}
                placeholder={t('teachers.qualification_placeholder')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('teachers.phone')} *</label>
              <input
                type="text"
                required
                value={newTeacher.phone}
                onChange={e => setNewTeacher({ ...newTeacher, phone: e.target.value })}
                placeholder="0550 00 00 00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('teachers.payment_type', 'طريقة الدفع')} *</label>
                <select
                  value={newTeacher.payment_type}
                  onChange={e => setNewTeacher({ ...newTeacher, payment_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="MONTHLY">{t('teachers.payment_monthly', 'راتب شهري')}</option>
                  <option value="HOURLY">{t('teachers.payment_hourly', 'بالساعة')}</option>
                </select>
              </div>
              {newTeacher.payment_type === 'MONTHLY' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('teachers.col_salary', 'الراتب الشهري')} *</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newTeacher.monthly_salary}
                    onChange={e => setNewTeacher({ ...newTeacher, monthly_salary: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('teachers.hourly_rate', 'الراتب بالساعة')} *</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={newTeacher.hourly_rate}
                    onChange={e => setNewTeacher({ ...newTeacher, hourly_rate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={resetAddForm}
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
          MODAL: EDIT TEACHER
          ========================================================================= */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={resetEditForm}
        title={t('teachers.edit_btn', 'تعديل الأستاذ')}
      >
        <form onSubmit={handleUpdateTeacher} className="space-y-4 text-xs">
          {/* Teacher Photo Upload */}
          <PhotoUpload
            photoUrl={editTeacher.photo_url}
            onChange={(url) => setEditTeacher(prev => ({ ...prev, photo_url: url }))}
            uploadEndpoint="/upload/teacher"
            label={t('photo_upload.label')}
            shape="circle"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('teachers.first_name')} *</label>
              <input
                type="text"
                required
                value={editTeacher.first_name}
                onChange={e => setEditTeacher({ ...editTeacher, first_name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('teachers.last_name')} *</label>
              <input
                type="text"
                required
                value={editTeacher.last_name}
                onChange={e => setEditTeacher({ ...editTeacher, last_name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">{t('teachers.col_specialty')}</label>
              <input
                type="text"
                value={editTeacher.specialty}
                onChange={e => setEditTeacher({ ...editTeacher, specialty: e.target.value })}
                placeholder="رياضيات، فيزياء، علوم..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('teachers.col_phone')} *</label>
              <input
                type="text"
                required
                value={editTeacher.phone}
                onChange={e => setEditTeacher({ ...editTeacher, phone: e.target.value })}
                placeholder="0550 00 00 00"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:col-span-2">
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('teachers.payment_type', 'طريقة الدفع')} *</label>
                <select
                  value={editTeacher.payment_type || 'MONTHLY'}
                  onChange={e => setEditTeacher({ ...editTeacher, payment_type: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                >
                  <option value="MONTHLY">{t('teachers.payment_monthly', 'راتب شهري')}</option>
                  <option value="HOURLY">{t('teachers.payment_hourly', 'بالساعة')}</option>
                </select>
              </div>
              {editTeacher.payment_type === 'HOURLY' ? (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('teachers.hourly_rate', 'الراتب بالساعة')} *</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editTeacher.hourly_rate || 0}
                    onChange={e => setEditTeacher({ ...editTeacher, hourly_rate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              ) : (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">{t('teachers.col_salary', 'الراتب الشهري')} *</label>
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={editTeacher.monthly_salary || 0}
                    onChange={e => setEditTeacher({ ...editTeacher, monthly_salary: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={resetEditForm}
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
          MODAL: SUBSTITUTIONS MANAGER
          ========================================================================= */}
      <Modal
        isOpen={isSubModalOpen}
        onClose={() => setIsSubModalOpen(false)}
        title={t('teachers.modal_sub_title')}
        maxWidth="max-w-3xl"
      >
        <div className="space-y-4 text-xs">
          {/* Add New Sub Form */}
          <form onSubmit={handleCreateSub} className="p-4 bg-slate-50 rounded-2xl space-y-3 border border-slate-200">
            <h4 className="font-bold text-slate-800">{t('teachers.add_sub_btn')}</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-600 mb-0.5">{t('teachers.sub_date')}</label>
                <DateInput
                  
                  required
                  value={newSub.substitution_date}
                  onChange={e => setNewSub({ ...newSub, substitution_date: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-0.5">{t('teachers.sub_original_teacher')}</label>
                <select
                  required
                  value={newSub.original_teacher_id}
                  onChange={e => setNewSub({ ...newSub, original_teacher_id: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2"
                >
                  <option value="">{t('common.search')}</option>
                  {teachers.map(tItem => (
                    <option key={tItem.id} value={tItem.id}>{tItem.first_name} {tItem.last_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-0.5">{t('teachers.sub_substitute_teacher')}</label>
                <select
                  required
                  value={newSub.substitute_teacher_id}
                  onChange={e => setNewSub({ ...newSub, substitute_teacher_id: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2"
                >
                  <option value="">{t('common.search')}</option>
                  {teachers.map(tItem => (
                    <option key={tItem.id} value={tItem.id}>{tItem.first_name} {tItem.last_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="block font-semibold text-slate-600 mb-0.5">{t('teachers.sub_class')}</label>
                <select
                  required
                  value={newSub.class_id}
                  onChange={e => setNewSub({ ...newSub, class_id: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2"
                >
                  <option value="">{t('common.search')}</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-0.5">{t('teachers.sub_subject')}</label>
                <select
                  required
                  value={newSub.subject_id}
                  onChange={e => setNewSub({ ...newSub, subject_id: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl p-2"
                >
                  <option value="">{t('common.search')}</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.id}>{isRTL ? s.name_ar : (s.name_fr || s.name_en || s.name_ar)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-600 mb-0.5">{t('timetable.time_from')} - {t('timetable.time_to')}</label>
                <div className="flex items-center gap-1">
                  <TimeInput
                    
                    value={newSub.start_time}
                    onChange={e => setNewSub({ ...newSub, start_time: e.target.value })}
                    className="w-1/2 bg-white border border-slate-200 rounded-xl p-2"
                  />
                  <span>-</span>
                  <TimeInput
                    
                    value={newSub.end_time}
                    onChange={e => setNewSub({ ...newSub, end_time: e.target.value })}
                    className="w-1/2 bg-white border border-slate-200 rounded-xl p-2"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-xs transition-all"
              >
                {t('common.save')}
              </button>
            </div>
          </form>

          {/* List of Substitutions */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-bold">
                <tr>
                  <th className="p-2">{t('teachers.sub_date')}</th>
                  <th className="p-2">{t('teachers.sub_original_teacher')}</th>
                  <th className="p-2">{t('teachers.sub_substitute_teacher')}</th>
                  <th className="p-2">{t('teachers.sub_class')}</th>
                  <th className="p-2">{t('common.status')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {substitutions.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-slate-400 italic">
                      {t('teachers.sub_empty')}
                    </td>
                  </tr>
                ) : (
                  substitutions.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="p-2 font-mono">{formatDate(s.substitution_date)}</td>
                      <td className="p-2 font-bold text-slate-800">{s.original_teacher_name}</td>
                      <td className="p-2 font-bold text-emerald-700">{s.substitute_teacher_name}</td>
                      <td className="p-2">{s.class_name} ({s.subject_name_ar})</td>
                      <td className="p-2">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700">
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Modal>

      {/* =========================================================================
          MODAL: PAY TEACHER
          ========================================================================= */}
      <Modal
        isOpen={isPayModalOpen}
        onClose={resetPayForm}
        title={`${t('teachers.pay_teacher', 'دفع راتب أستاذ:')} ${payTeacher?.first_name || ''} ${payTeacher?.last_name || ''}`}
      >
        <form onSubmit={handlePayTeacher} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('teachers.payment_type', 'طريقة الدفع')}</label>
              <select
                value={payForm.payment_type}
                onChange={e => {
                  const pType = e.target.value;
                  setPayForm({
                    ...payForm,
                    payment_type: pType,
                    amount: pType === 'MONTHLY' ? (payTeacher?.monthly_salary || 0) : ((payForm.hours_taught || 0) * (payTeacher?.hourly_rate || 0))
                  });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              >
                <option value="MONTHLY">{t('teachers.payment_monthly', 'راتب شهري')}</option>
                <option value="HOURLY">{t('teachers.payment_hourly', 'بالساعة')}</option>
              </select>
            </div>
            
            {payForm.payment_type === 'HOURLY' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('teachers.hours_taught', 'عدد الساعات')}</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={payForm.hours_taught}
                  onChange={e => {
                    const hours = e.target.value;
                    const newAmount = hours * (payTeacher?.hourly_rate || 0);
                    setPayForm({ ...payForm, hours_taught: hours, amount: newAmount });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
                  placeholder={t('teachers.hours_taught_placeholder', 'عدد الساعات المنجزة')}
                />
              </div>
            )}
            
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('teachers.total_amount', 'المبلغ الإجمالي')}</label>
              <input
                type="number"
                min="0"
                step="500"
                required
                value={payForm.amount}
                onChange={e => setPayForm({ ...payForm, amount: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('teachers.payment_method', 'وسيلة الدفع')}</label>
              <select
                value={payForm.payment_method}
                onChange={e => setPayForm({ ...payForm, payment_method: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              >
                <option value="CASH">{t('common.cash', 'نقداً')}</option>
                <option value="BANK_TRANSFER">{t('common.bank_transfer', 'تحويل بنكي')}</option>
                <option value="CHEQUE">{t('common.cheque', 'شيك')}</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('finance.financial_account', 'الحساب المالي')}</label>
              <select
                required
                value={payForm.account_id}
                onChange={e => setPayForm({ ...payForm, account_id: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              >
                <option value="">{t('finance.select_account', 'اختر الحساب...')}</option>
                {accounts.map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance})</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={resetPayForm} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold">{t('common.cancel', 'إلغاء')}</button>
            <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold">{t('common.pay', 'دفع')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
