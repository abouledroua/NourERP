import React, { useState, useEffect } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useToast } from '../context/UIFeedbackContext';
import Modal from '../components/Modal';
import { 
  Users, Search, Edit2, Trash2, KeyRound, AlertCircle, Phone, Mail, CheckCircle2, FileText, Briefcase, User
} from 'lucide-react';
import api from '../utils/api';

export default function Guardians() {
  const { t, isRTL, lang } = useLanguage();
  const toast = useToast();
  const [guardians, setGuardians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingGuardian, setEditingGuardian] = useState(null);

  // Add Modal State
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newGuardian, setNewGuardian] = useState({
    name: '', nin: '', phone: '', email: '', job: ''
  });

  // Password Modal State
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [resetData, setResetData] = useState(null);

  // Credentials View Modal State
  const [credentialsModalOpen, setCredentialsModalOpen] = useState(false);
  const [guardianToView, setGuardianToView] = useState(null);

  // Confirm Modals State
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [guardianToDelete, setGuardianToDelete] = useState(null);

  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [guardianToReset, setGuardianToReset] = useState(null);

  // Children Modal State
  const [childrenModalOpen, setChildrenModalOpen] = useState(false);
  const [selectedGuardianForChildren, setSelectedGuardianForChildren] = useState(null);
  const [guardianChildren, setGuardianChildren] = useState([]);
  const [loadingChildren, setLoadingChildren] = useState(false);

  useEffect(() => {
    fetchGuardians();
  }, []);

  const fetchGuardians = async () => {
    try {
      setLoading(true);
      const res = await api.get('/guardians');
      if (res.success) {
        setGuardians(res.data);
      }
    } catch (error) {
      const msg = error.response?.data?.message;
      toast.error(typeof msg === 'object' ? msg[lang] || msg.ar : msg || t('guardians.fetch_error', 'Failed to fetch guardians'));
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/guardians', newGuardian);
      if (res.success) {
        const msg = res.message;
        toast.success(typeof msg === 'object' ? msg[lang] || msg.ar : msg || t('guardians.create_success', 'تم إضافة الولي بنجاح'));
        setAddModalOpen(false);
        setNewGuardian({ name: '', nin: '', phone: '', email: '', job: '' });
        fetchGuardians();
        
        // Show password modal for new guardian
        if (res.password) {
          setResetData({
            name: res.guardian.name,
            nin: res.guardian.nin,
            password: res.password
          });
          setPasswordModalOpen(true);
        }
      }
    } catch (error) {
      const msg = error.response?.data?.message;
      toast.error(typeof msg === 'object' ? msg[lang] || msg.ar : msg || t('guardians.create_error', 'Error adding guardian'));
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/guardians/${editingGuardian.id}`, editingGuardian);
      if (res.success) {
        const msg = res.message;
        toast.success(typeof msg === 'object' ? msg[lang] || msg.ar : msg || t('guardians.update_success', 'تم تحديث بيانات الولي بنجاح'));
        setEditModalOpen(false);
        fetchGuardians();
      }
    } catch (error) {
      const msg = error.response?.data?.message;
      toast.error(typeof msg === 'object' ? msg[lang] || msg.ar : msg || t('guardians.update_error', 'Error updating guardian'));
    }
  };

  const handleViewChildren = async (guardian) => {
    setSelectedGuardianForChildren(guardian);
    setChildrenModalOpen(true);
    setLoadingChildren(true);
    setGuardianChildren([]);
    try {
      const res = await api.get(`/guardians/${guardian.id}/children`);
      if (res.success) {
        setGuardianChildren(res.data);
      }
    } catch (error) {
      toast.error(t('common.error', 'حدث خطأ'));
    } finally {
      setLoadingChildren(false);
    }
  };

  const confirmDelete = (guardian) => {
    if (guardian.linked_students_count > 0) {
      toast.error(t('guardians.cannot_delete_linked', 'لا يمكن حذف ولي مرتبط بتلاميذ'));
      return;
    }
    setGuardianToDelete(guardian);
    setDeleteConfirmOpen(true);
  };

  const executeDelete = async () => {
    if (!guardianToDelete) return;
    try {
      const res = await api.delete(`/guardians/${guardianToDelete.id}`);
      if (res.success) {
        const msg = res.message;
        toast.success(typeof msg === 'object' ? msg[lang] || msg.ar : msg || t('guardians.delete_success', 'تم حذف الولي بنجاح'));
        setDeleteConfirmOpen(false);
        setGuardianToDelete(null);
        fetchGuardians();
      }
    } catch (error) {
      const msg = error.response?.data?.message;
      toast.error(typeof msg === 'object' ? msg[lang] || msg.ar : msg || t('guardians.delete_error', 'Error deleting guardian'));
      setDeleteConfirmOpen(false);
      setGuardianToDelete(null);
    }
  };

  const confirmResetPassword = (guardian) => {
    setGuardianToReset(guardian);
    setResetConfirmOpen(true);
  };

  const executeResetPassword = async () => {
    if (!guardianToReset) return;
    try {
      const res = await api.post(`/guardians/${guardianToReset.id}/reset-password`);
      if (res.success) {
        const msg = res.message;
        toast.success(typeof msg === 'object' ? msg[lang] || msg.ar : msg || t('guardians.password_reset_success', 'تمت إعادة تعيين كلمة المرور بنجاح'));
        setResetData({
          name: guardianToReset.name,
          nin: guardianToReset.nin,
          password: res.password
        });
        setResetConfirmOpen(false);
        setGuardianToReset(null);
        setPasswordModalOpen(true);
      }
    } catch (error) {
      const msg = error.response?.data?.message;
      toast.error(typeof msg === 'object' ? msg[lang] || msg.ar : msg || t('guardians.reset_error', 'Error resetting password'));
      setResetConfirmOpen(false);
      setGuardianToReset(null);
    }
  };

  const filteredGuardians = guardians.filter(g => 
    (g.name && g.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (g.nin && g.nin.includes(searchTerm)) ||
    (g.phone && g.phone.includes(searchTerm))
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{t('guardians.title', 'إدارة الأولياء')}</h1>
            <p className="text-sm text-slate-500">{t('guardians.subtitle', 'إدارة حسابات أولياء التلاميذ وكلمات المرور')}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400`} />
            <input
              type="text"
              placeholder={t('guardians.search_placeholder', 'بحث بالاسم، رقم التعريف، الهاتف...')}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className={`w-full md:w-80 bg-white border border-slate-200 rounded-xl ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none`}
            />
          </div>
          <button
            onClick={() => setAddModalOpen(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap"
          >
            + {t('guardians.add_new', 'إضافة ولي')}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className={`w-full text-sm ${isRTL ? 'text-right' : 'text-left'}`}>
            <thead className="bg-slate-50 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">{t('guardians.table_name', 'الولي')}</th>
                <th className="px-6 py-4">{t('guardians.table_nin', 'رقم التعريف الوطني')}</th>
                <th className="px-6 py-4">{t('guardians.table_contact', 'معلومات الاتصال')}</th>
                <th className="px-6 py-4 text-center">{t('guardians.table_children', 'عدد الأبناء')}</th>
                <th className="px-6 py-4 text-center">{t('guardians.table_actions', 'الإجراءات')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">{t('common.loading', 'جاري التحميل...')}</td>
                </tr>
              ) : filteredGuardians.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-slate-500">{t('guardians.no_guardians', 'لا يوجد أولياء')}</td>
                </tr>
              ) : (
                filteredGuardians.map(guardian => (
                  <tr 
                    key={guardian.id} 
                    onClick={() => {
                      if (guardian.linked_students_count > 0) {
                        handleViewChildren(guardian);
                      }
                    }}
                    className={`hover:bg-slate-50/80 transition-colors ${guardian.linked_students_count > 0 ? 'cursor-pointer' : ''}`}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                          {guardian.name ? guardian.name.charAt(0) : '?'}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{guardian.name}</div>
                          {guardian.job && <div className="text-xs text-slate-500 flex items-center gap-1"><Briefcase className="w-3 h-3"/> {guardian.job}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded-md text-xs">{guardian.nin || '-'}</span>
                    </td>
                    <td className="px-6 py-4 space-y-1">
                      {guardian.phone && (
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Phone className="w-3.5 h-3.5" />
                          <span dir="ltr">{guardian.phone}</span>
                        </div>
                      )}
                      {guardian.email && (
                        <div className="flex items-center gap-1.5 text-slate-500 text-xs">
                          <Mail className="w-3.5 h-3.5" />
                          <span>{guardian.email}</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold ${guardian.linked_students_count > 0 ? 'bg-blue-50 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                          {guardian.linked_students_count}
                        </span>
                        {guardian.children_names && (
                          <span className="text-[10px] text-slate-500 max-w-[150px] truncate" title={guardian.children_names}>
                            {guardian.children_names}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => {
                            setGuardianToView(guardian);
                            setCredentialsModalOpen(true);
                          }}
                          title={t('guardians.view_credentials_btn', 'عرض بيانات الدخول')}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        >
                          <User className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => confirmResetPassword(guardian)}
                          title={t('guardians.reset_password_btn', 'إعادة تعيين كلمة المرور')}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                        >
                          <KeyRound className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingGuardian({ ...guardian });
                            setEditModalOpen(true);
                          }}
                          title={t('common.edit', 'تعديل')}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(guardian.id, guardian.linked_students_count)}
                          disabled={guardian.linked_students_count > 0}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 rounded-lg transition-colors"
                          title={guardian.linked_students_count > 0 ? t('guardians.cannot_delete', 'لا يمكن حذفه لارتباطه بتلاميذ') : t('common.delete', 'حذف')}
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

      {/* Add Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={t('guardians.add_title', 'إضافة ولي أمر جديد')}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{t('guardians.field_name', 'الاسم واللقب')}</label>
              <input
                type="text"
                required
                value={newGuardian.name}
                onChange={e => setNewGuardian({...newGuardian, name: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{t('guardians.field_nin', 'رقم التعريف الوطني (NIN)')}</label>
              <input
                type="text"
                required
                value={newGuardian.nin}
                onChange={e => setNewGuardian({...newGuardian, nin: e.target.value})}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none ${isRTL ? 'text-left dir-ltr' : ''}`}
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{t('guardians.field_job', 'المهنة')}</label>
              <input
                type="text"
                value={newGuardian.job || ''}
                onChange={e => setNewGuardian({...newGuardian, job: e.target.value})}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700">{t('guardians.field_phone', 'رقم الهاتف')}</label>
              <input
                type="text"
                value={newGuardian.phone || ''}
                onChange={e => setNewGuardian({...newGuardian, phone: e.target.value})}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none ${isRTL ? 'text-left dir-ltr' : ''}`}
                dir="ltr"
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-sm font-medium text-slate-700">{t('guardians.field_email', 'البريد الإلكتروني')}</label>
              <input
                type="email"
                value={newGuardian.email || ''}
                onChange={e => setNewGuardian({...newGuardian, email: e.target.value})}
                className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none ${isRTL ? 'text-left dir-ltr' : ''}`}
                dir="ltr"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setAddModalOpen(false)}
              className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
            >
              {t('common.cancel', 'إلغاء')}
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-emerald-500/20"
            >
              {t('guardians.add_new', 'إضافة ولي')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={t('guardians.edit_title', 'تعديل بيانات الولي')}
      >
        {editingGuardian && (
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">{t('guardians.field_name', 'الاسم واللقب')}</label>
                <input
                  type="text"
                  required
                  value={editingGuardian.name}
                  onChange={e => setEditingGuardian({...editingGuardian, name: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">{t('guardians.field_job', 'المهنة')}</label>
                <input
                  type="text"
                  value={editingGuardian.job || ''}
                  onChange={e => setEditingGuardian({...editingGuardian, job: e.target.value})}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">{t('guardians.field_phone', 'رقم الهاتف')}</label>
                <input
                  type="text"
                  value={editingGuardian.phone || ''}
                  onChange={e => setEditingGuardian({...editingGuardian, phone: e.target.value})}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none ${isRTL ? 'text-left dir-ltr' : ''}`}
                  dir="ltr"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">{t('guardians.field_email', 'البريد الإلكتروني')}</label>
                <input
                  type="email"
                  value={editingGuardian.email || ''}
                  onChange={e => setEditingGuardian({...editingGuardian, email: e.target.value})}
                  className={`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none ${isRTL ? 'text-left dir-ltr' : ''}`}
                  dir="ltr"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
              >
                {t('common.cancel', 'إلغاء')}
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-medium transition-colors shadow-md shadow-emerald-500/20"
              >
                {t('common.save_changes', 'حفظ التغييرات')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Password Reset Modal */}
      <Modal
        isOpen={passwordModalOpen}
        onClose={() => setPasswordModalOpen(false)}
        title={t('guardians.reset_password_modal_title', 'إعادة تعيين كلمة المرور')}
        maxWidth="max-w-md"
        disableOutsideClick={true}
      >
        {resetData && (
          <div className="p-6">
            <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 text-center mb-2">
              {t('guardians.new_password_success', 'تم إنشاء كلمة مرور جديدة بنجاح')}
            </h3>
            
            <p className="text-slate-500 text-sm text-center mb-8">
              {t('guardians.new_password_hint', 'يرجى الاحتفاظ ببيانات الدخول التالية في مكان آمن. لا يمكن استرجاع كلمة المرور لاحقاً.')}
            </p>

            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{resetData.name}</p>
                    <p className="text-xs text-slate-500">{t('guardians.guardian_label', 'ولي الأمر')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                    {t('guardians.username_label', 'اسم المستخدم (NIN)')}
                  </label>
                  <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono text-sm text-slate-700 select-all cursor-text text-center">
                    {resetData.nin}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                    {t('guardians.new_password_label', 'كلمة المرور الجديدة')}
                  </label>
                  <div className="bg-white px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/50 font-mono text-sm font-bold text-emerald-700 select-all cursor-text text-center tracking-wider">
                    {resetData.password}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setPasswordModalOpen(false)}
                className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-bold shadow-xl shadow-slate-900/20 transition-all active:scale-95"
              >
                {t('guardians.ok_saved', 'حسناً، تم الحفظ')}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setGuardianToDelete(null);
        }}
        title={t('common.confirm_action', 'تأكيد الإجراء')}
        maxWidth="max-w-md"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-red-100 rounded-full flex items-center justify-center mb-6">
            <Trash2 className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {t('guardians.confirm_delete_title', 'حذف ولي الأمر')}
          </h3>
          <p className="text-slate-500 mb-8">
            {t('guardians.confirm_delete_desc', 'هل أنت متأكد من رغبتك في حذف هذا الولي؟ هذا الإجراء لا يمكن التراجع عنه.')}
            <br />
            <span className="font-bold text-slate-700 mt-2 block">{guardianToDelete?.name}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setDeleteConfirmOpen(false);
                setGuardianToDelete(null);
              }}
              className="px-6 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
            >
              {t('common.cancel', 'إلغاء')}
            </button>
            <button
              onClick={executeDelete}
              className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-medium transition-colors shadow-md shadow-red-500/20"
            >
              {t('common.delete_confirm_btn', 'نعم، احذف')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Reset Password Confirmation Modal */}
      <Modal
        isOpen={resetConfirmOpen}
        onClose={() => {
          setResetConfirmOpen(false);
          setGuardianToReset(null);
        }}
        title={t('common.confirm_action', 'تأكيد الإجراء')}
        maxWidth="max-w-md"
      >
        <div className="p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-6">
            <KeyRound className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {t('guardians.confirm_reset_title', 'إعادة تعيين كلمة المرور')}
          </h3>
          <p className="text-slate-500 mb-8">
            {t('guardians.confirm_reset_desc', 'هل أنت متأكد من إعادة تعيين كلمة المرور؟ سيتم إنشاء كلمة مرور جديدة وإلغاء القديمة.')}
            <br />
            <span className="font-bold text-slate-700 mt-2 block">{guardianToReset?.name}</span>
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setResetConfirmOpen(false);
                setGuardianToReset(null);
              }}
              className="px-6 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-medium transition-colors"
            >
              {t('common.cancel', 'إلغاء')}
            </button>
            <button
              onClick={executeResetPassword}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors shadow-md shadow-amber-500/20"
            >
              {t('common.reset_confirm_btn', 'نعم، أعد التعيين')}
            </button>
          </div>
        </div>
      </Modal>

      {/* View Credentials Modal */}
      <Modal
        isOpen={credentialsModalOpen}
        onClose={() => {
          setCredentialsModalOpen(false);
          setGuardianToView(null);
        }}
        title={t('guardians.view_credentials_title', 'بيانات تسجيل الدخول')}
        maxWidth="max-w-md"
      >
        {guardianToView && (
          <div className="p-6">
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{guardianToView.name}</p>
                    <p className="text-xs text-slate-500">{t('guardians.guardian_label', 'ولي الأمر')}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">
                    {t('guardians.username_label', 'اسم المستخدم (NIN)')}
                  </label>
                  <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 font-mono text-sm text-slate-700 select-all cursor-text text-center">
                    {guardianToView.nin}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>{t('guardians.password_label', 'كلمة المرور')}</span>
                  </label>
                  <div className="bg-white px-3 py-2 rounded-lg border border-slate-200 bg-slate-50 font-mono text-sm font-bold text-slate-400 text-center tracking-widest">
                    ••••••••
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                    {t('guardians.password_hidden_hint', 'كلمة المرور مشفرة ولا يمكن عرضها. إذا فقدها الولي، يمكنك إعادة تعيينها.')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center gap-3">
              <button
                onClick={() => {
                  setCredentialsModalOpen(false);
                  confirmResetPassword(guardianToView);
                }}
                className="px-6 py-2.5 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl text-sm font-bold transition-colors flex items-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                {t('guardians.reset_password_btn', 'إعادة تعيين كلمة المرور')}
              </button>
            </div>
          </div>
        )}
      </Modal>
      {/* Children Modal */}
      <Modal
        isOpen={childrenModalOpen}
        onClose={() => setChildrenModalOpen(false)}
        title={selectedGuardianForChildren ? `${t('guardians.children_of', 'أبناء الولي')} ${selectedGuardianForChildren.name}` : t('guardians.children_list', 'قائمة الأبناء')}
        size="lg"
      >
        <div className="p-6">
          {loadingChildren ? (
            <div className="flex justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
            </div>
          ) : guardianChildren.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
              {t('guardians.no_children_found', 'لا يوجد أبناء مسجلين')}
            </div>
          ) : (
            <div className="space-y-4">
              {guardianChildren.map(child => (
                <div key={child.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl">
                  {child.photo_url ? (
                    <img src={child.photo_url} alt={child.first_name_ar} className="w-12 h-12 rounded-full object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                      <User className="w-6 h-6" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="font-bold text-slate-800">
                      {isRTL ? `${child.first_name_ar} ${child.last_name_ar}` : `${child.first_name_fr} ${child.last_name_fr}`}
                    </div>
                    <div className="text-sm text-slate-500 flex gap-2 items-center">
                      <span>{child.matricule}</span>
                      <span>•</span>
                      <span>{child.class_name || t('students.no_class', 'بدون قسم')}</span>
                      <span>•</span>
                      <span>{child.track_name || t('students.no_track', 'بدون مسار')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

    </div>
  );
}
