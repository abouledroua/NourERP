import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Calendar,
  Wallet,
  Clock,
  Award,
  Megaphone,
  LogOut,
  User,
  CheckCircle,
  AlertTriangle,
  Receipt,
  BookOpen,
  ArrowRight,
  Sparkles,
  Phone,
  DoorOpen,
  ChevronDown
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { formatCurrency, formatDate } from '../utils/formatters';

const DAYS_OF_WEEK = [
  { id: 0, ar: 'الأحد', fr: 'Dimanche', en: 'Sunday' },
  { id: 1, ar: 'الإثنين', fr: 'Lundi', en: 'Monday' },
  { id: 2, ar: 'الثلاثاء', fr: 'Mardi', en: 'Tuesday' },
  { id: 3, ar: 'الأربعاء', fr: 'Mercredi', en: 'Wednesday' },
  { id: 4, ar: 'الخميس', fr: 'Jeudi', en: 'Thursday' },
  { id: 5, ar: 'الجمعة', fr: 'Vendredi', en: 'Friday' },
  { id: 6, ar: 'السبت', fr: 'Samedi', en: 'Saturday' }
];

export default function ParentPortal() {
  const { t, lang, setLang, isRTL } = useLanguage();
  const navigate = useNavigate();

  const [parentInfo, setParentInfo] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('alnour_parent_info')) || null;
    } catch {
      return null;
    }
  });

  const [children, setChildren] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('alnour_parent_children')) || [];
    } catch {
      return [];
    }
  });

  const [selectedChildId, setSelectedChildId] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('alnour_parent_children')) || [];
      return saved[0]?.id || null;
    } catch {
      return null;
    }
  });

  const [childData, setChildData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const token = localStorage.getItem('alnour_parent_token');

  // Verify token on mount
  useEffect(() => {
    if (!token) {
      navigate('/parent-login');
      return;
    }

    async function fetchParentData() {
      try {
        setLoading(true);
        // 1. Fetch children
        const childrenRes = await fetch('/api/parent/children', {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json());

        if (childrenRes.success && childrenRes.data) {
          setChildren(childrenRes.data);
          localStorage.setItem('alnour_parent_children', JSON.stringify(childrenRes.data));
          if (!selectedChildId && childrenRes.data.length > 0) {
            setSelectedChildId(childrenRes.data[0].id);
          }
        }

        // 2. Fetch announcements
        const annRes = await fetch('/api/parent/announcements', {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json());

        if (annRes.success && annRes.data) {
          setAnnouncements(annRes.data);
        }
      } catch (err) {
        console.error('Failed to load parent portal data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchParentData();
  }, [token, navigate]);

  // Fetch child dossier whenever selectedChildId changes
  useEffect(() => {
    if (!selectedChildId || !token) return;

    async function fetchChildDetails() {
      try {
        const res = await fetch(`/api/parent/children/${selectedChildId}`, {
          headers: { Authorization: `Bearer ${token}` }
        }).then(r => r.json());

        if (res.success && res.data) {
          setChildData(res.data);
        }
      } catch (err) {
        console.error('Failed to load child dossier:', err);
      }
    }

    fetchChildDetails();
  }, [selectedChildId, token]);

  const handleLogout = () => {
    localStorage.removeItem('alnour_parent_token');
    localStorage.removeItem('alnour_parent_info');
    localStorage.removeItem('alnour_parent_children');
    navigate('/parent-login');
  };

  const selectedChild = children.find(c => c.id === selectedChildId) || children[0];

  if (!token) return null;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-xl border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo & School Name */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 ring-2 ring-emerald-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-black text-sm sm:text-base text-white tracking-tight">
                {t('parent_portal.title', 'فضاء أولياء التلاميذ')}
              </h1>
              <p className="text-[10px] text-slate-400 hidden sm:block">
                مؤسسة النور الأكاديمية الخاصة
              </p>
            </div>
          </div>

          {/* Right actions: Parent name, Language, Logout */}
          <div className="flex items-center gap-2 sm:gap-4">
            {parentInfo && (
              <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-xs">
                <User className="w-3.5 h-3.5 text-emerald-400" />
                <span className="font-bold text-slate-200">{parentInfo.name}</span>
                <span className="text-[11px] text-slate-400 font-mono">({parentInfo.phone})</span>
              </div>
            )}

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-800 p-0.5 rounded-xl border border-slate-700 text-xs">
              <button
                onClick={() => setLang('ar')}
                className={`px-2 py-1 rounded-lg transition-all ${lang === 'ar' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                ع
              </button>
              <button
                onClick={() => setLang('fr')}
                className={`px-2 py-1 rounded-lg transition-all ${lang === 'fr' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                FR
              </button>
              <button
                onClick={() => setLang('en')}
                className={`px-2 py-1 rounded-lg transition-all ${lang === 'en' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'}`}
              >
                EN
              </button>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              title={t('parent_portal.logout', 'تسجيل الخروج')}
              className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 transition-colors flex items-center gap-1.5 text-xs font-bold"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">{t('parent_portal.logout', 'خروج')}</span>
            </button>
          </div>
        </div>

        {/* Children Switcher Bar */}
        {children.length > 0 && (
          <div className="bg-slate-950/60 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-2.5">
            <div className="max-w-7xl mx-auto flex items-center gap-2 overflow-x-auto no-scrollbar">
              <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 flex-shrink-0">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>{t('parent_portal.switch_child', 'أبنائي المسجلين')}:</span>
              </span>

              {children.map(child => {
                const isSelected = child.id === selectedChildId;
                return (
                  <button
                    key={child.id}
                    onClick={() => setSelectedChildId(child.id)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex-shrink-0 ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 ring-2 ring-emerald-400/30'
                        : 'bg-slate-800/70 hover:bg-slate-800 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{child.first_name_ar} {child.last_name_ar}</span>
                    <span className="text-[10px] opacity-80 font-normal">
                      ({child.class_name || child.track_name_ar})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {loading && !childData ? (
          <div className="py-24 text-center">
            <div className="w-10 h-10 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">جاري تحميل بيانات فضاء الأولياء...</p>
          </div>
        ) : (
          <>
            {/* Child Hero Banner */}
            {selectedChild && (
              <div className="bg-gradient-to-r from-slate-800 via-slate-800/90 to-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 text-xl font-bold flex-shrink-0 shadow-inner">
                      {selectedChild.photo_url ? (
                        <img
                          src={selectedChild.photo_url}
                          alt={selectedChild.first_name_ar}
                          className="w-full h-full object-cover rounded-2xl"
                        />
                      ) : (
                        <span>{selectedChild.first_name_ar?.charAt(0) || 'ت'}</span>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl sm:text-2xl font-black text-white">
                          {selectedChild.first_name_ar} {selectedChild.last_name_ar}
                        </h2>
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {selectedChild.status || 'ACTIVE'}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1 font-medium">
                        <span className="font-mono text-emerald-300">{selectedChild.matricule}</span>
                        <span>•</span>
                        <span>{selectedChild.track_name_ar}</span>
                        {selectedChild.class_name && (
                          <>
                            <span>•</span>
                            <span className="text-slate-200 font-bold">{selectedChild.class_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Financial Status Quick Badge in Banner */}
                  {childData?.financials?.summary && (
                    <div className={`p-4 rounded-2xl border flex items-center gap-3 sm:self-center ${
                      childData.financials.summary.totalRemainingDebt === 0
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300'
                        : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    }`}>
                      {childData.financials.summary.totalRemainingDebt === 0 ? (
                        <>
                          <CheckCircle className="w-6 h-6 text-emerald-400 flex-shrink-0" />
                          <div>
                            <span className="text-[11px] block font-bold text-emerald-400">
                              {t('parent_portal.no_debt', 'الوضعية المالية مسواة بالكامل')}
                            </span>
                            <span className="text-xs font-mono font-bold">0.00 د.ج</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-6 h-6 text-rose-400 flex-shrink-0 animate-bounce" />
                          <div>
                            <span className="text-[11px] block font-bold text-rose-400">
                              {t('parent_portal.total_debt_label', 'إجمالي الديون المتبقية')}:
                            </span>
                            <span className="text-base font-black font-mono">
                              {formatCurrency(childData.financials.summary.totalRemainingDebt)}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar border-b border-slate-800 pb-2">
              {[
                { id: 'overview', label: t('parent_portal.tab_overview', 'نظرة عامة'), icon: GraduationCap },
                { id: 'timetable', label: t('parent_portal.tab_timetable', 'الجدول الأسبوعي'), icon: Calendar },
                { id: 'finance', label: t('parent_portal.tab_finance', 'المالية والديون'), icon: Wallet },
                { id: 'attendance', label: t('parent_portal.tab_attendance', 'الغيابات والسلوك'), icon: Clock },
                { id: 'grades', label: t('parent_portal.tab_grades', 'النقاط والتقييمات'), icon: Award },
                {
                  id: 'announcements',
                  label: `${t('parent_portal.tab_announcements', 'الإعلانات والتبليغات')} (${announcements.length})`,
                  icon: Megaphone
                }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex-shrink-0 ${
                      isActive
                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                        : 'bg-slate-800/70 hover:bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* =========================================================================
                TAB 1: OVERVIEW
                ========================================================================= */}
            {activeTab === 'overview' && childData && (
              <div className="space-y-6">
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Financial Status */}
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                        <Wallet className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">الوضعية المالية</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">{t('parent_portal.total_debt_label', 'إجمالي الديون المتبقية')}</span>
                      <div className="text-2xl font-black font-mono text-white">
                        {formatCurrency(childData.financials?.summary?.totalRemainingDebt || 0)}
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('finance')}
                      className="text-xs text-emerald-400 font-bold hover:underline flex items-center gap-1 pt-1"
                    >
                      <span>عرض تفاصيل الأقساط والوصولات</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Attendance Stats */}
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                        <Clock className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">سجل المواظبة</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">الغيابات غير المبررة</span>
                      <div className="text-2xl font-black font-mono text-rose-400">
                        {childData.attendance?.stats?.absent_unjustified_count || 0}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400">
                      <span>حضور: {childData.attendance?.stats?.present_count || 0}</span>
                      <span>•</span>
                      <span>مبرر: {childData.attendance?.stats?.absent_justified_count || 0}</span>
                      <span>•</span>
                      <span>تأخر: {childData.attendance?.stats?.late_count || 0}</span>
                    </div>
                  </div>

                  {/* Academic Group */}
                  <div className="bg-slate-800/80 border border-slate-700/80 rounded-3xl p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-slate-400">التمدرس والقسم</span>
                    </div>
                    <div>
                      <span className="text-xs text-slate-400 block mb-1">الفوج الحالي</span>
                      <div className="text-lg font-bold text-white">
                        {childData.student?.class_name || 'غير ملحق بفوج بعد'}
                      </div>
                    </div>
                    <div className="text-xs text-slate-400">
                      <span>المستوى: {childData.student?.grade_level || '-'}</span>
                      {childData.student?.classroom && <span> • القاعة: {childData.student.classroom}</span>}
                    </div>
                  </div>
                </div>

                {/* Recent Announcements Preview */}
                <div className="bg-slate-800/60 border border-slate-700/70 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Megaphone className="w-5 h-5 text-emerald-400" />
                      <h3 className="font-bold text-white text-base">
                        {t('parent_portal.tab_announcements', 'الإعلانات والتبليغات')}
                      </h3>
                    </div>
                    <button
                      onClick={() => setActiveTab('announcements')}
                      className="text-xs text-emerald-400 hover:underline font-bold"
                    >
                      عرض الكل ({announcements.length})
                    </button>
                  </div>

                  {announcements.length === 0 ? (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      {t('parent_portal.no_announcements', 'لا توجد إعلانات موجهة لكم حالياً')}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {announcements.slice(0, 2).map(ann => (
                        <div key={ann.id} className="p-4 rounded-2xl bg-slate-800/90 border border-slate-700/80 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-sm text-white line-clamp-1">{ann.title}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              ann.priority === 'URGENT'
                                ? 'bg-rose-500/20 text-rose-300'
                                : ann.priority === 'IMPORTANT'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}>
                              {ann.priority === 'URGENT' ? 'عاجل' : ann.priority === 'IMPORTANT' ? 'هام' : 'عادي'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2">{ann.content}</p>
                          <div className="text-[10px] text-slate-500 pt-1">
                            {formatDate(ann.created_at)} • {ann.target_label || 'الجميع'}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 2: TIMETABLE & PLANNING
                ========================================================================= */}
            {activeTab === 'timetable' && childData && (
              <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Calendar className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="font-bold text-white text-base">
                        {t('parent_portal.tab_timetable', 'الجدول الأسبوعي والتخطيط الدراسي')}
                      </h3>
                      <p className="text-xs text-slate-400">
                        توقيت الحصص والمواد الدراسية والقاعات الخاصة بفوج التلميذ
                      </p>
                    </div>
                  </div>
                </div>

                {childData.timetable && childData.timetable.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {DAYS_OF_WEEK.map(day => {
                      const daySlots = childData.timetable.filter(t => t.day_of_week === day.id);
                      if (daySlots.length === 0) return null;

                      return (
                        <div key={day.id} className="bg-slate-900/80 border border-slate-700/80 rounded-2xl p-4 space-y-3">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <span className="font-black text-sm text-emerald-400">
                              {lang === 'fr' ? day.fr : lang === 'en' ? day.en : day.ar}
                            </span>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {daySlots.length} حصص
                            </span>
                          </div>

                          <div className="space-y-2">
                            {daySlots.map(slot => (
                              <div
                                key={slot.id}
                                className="p-2.5 rounded-xl bg-slate-800/90 border border-slate-700/70 flex items-start justify-between gap-2"
                              >
                                <div>
                                  <span className="font-bold text-xs text-white block">
                                    {slot.subject_name_ar}
                                  </span>
                                  <span className="text-[11px] text-slate-400 block mt-0.5">
                                    الأستاذ: {slot.teacher_name}
                                  </span>
                                  {slot.room && (
                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                      <DoorOpen className="w-3 h-3 text-emerald-400" />
                                      {slot.room}
                                    </span>
                                  )}
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <span className="font-mono text-[11px] font-bold text-emerald-300 block">
                                    {slot.start_time?.substring(0, 5)}
                                  </span>
                                  <span className="font-mono text-[10px] text-slate-400 block">
                                    {slot.end_time?.substring(0, 5)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    {t('parent_portal.no_timetable', 'لم يتم برمجة جدول توقيت لهذا الفوج بعد')}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                TAB 3: FINANCE & DEBTS
                ========================================================================= */}
            {activeTab === 'finance' && childData && (
              <div className="space-y-6">
                {/* Big Debt / Settlement Alert */}
                <div className={`p-6 rounded-3xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  childData.financials?.summary?.totalRemainingDebt === 0
                    ? 'bg-emerald-500/10 border-emerald-500/20'
                    : 'bg-rose-500/10 border-rose-500/30'
                }`}>
                  <div className="flex items-center gap-3.5">
                    {childData.financials?.summary?.totalRemainingDebt === 0 ? (
                      <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                        <CheckCircle className="w-6 h-6" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle className="w-6 h-6 animate-pulse" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-black text-lg text-white">
                        {childData.financials?.summary?.totalRemainingDebt === 0
                          ? t('parent_portal.no_debt', 'الوضعية المالية مسواة بالكامل')
                          : t('parent_portal.debt_alert', 'توجد مبالغ مستحقة الدفع')}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {childData.financials?.summary?.totalRemainingDebt === 0
                          ? 'شكراً لكم على الالتزام بتسديد الاشتراكات في آجالها المحددة.'
                          : 'يرجى التقرب من أمانة الصندوق لتسوية المستحقات المتبقية.'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-slate-400 block mb-0.5">
                      {t('parent_portal.total_debt_label', 'إجمالي الديون المتبقية')}:
                    </span>
                    <span className={`text-2xl font-black font-mono ${
                      childData.financials?.summary?.totalRemainingDebt === 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                      {formatCurrency(childData.financials?.summary?.totalRemainingDebt || 0)}
                    </span>
                  </div>
                </div>

                {/* Section 1: Tuition Payments */}
                <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-emerald-400" />
                    <h4 className="font-bold text-white text-base">
                      {t('parent_portal.tuition_ledger', 'سجل الأقساط والرسوم الدراسية')}
                    </h4>
                  </div>

                  {childData.financials?.tuitionPayments?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-right">
                        <thead>
                          <tr className="border-b border-slate-700 text-slate-400">
                            <th className="py-2.5 px-3">{t('parent_portal.receipt_no', 'رقم الوصل')}</th>
                            <th className="py-2.5 px-3">{t('parent_portal.date', 'التاريخ')}</th>
                            <th className="py-2.5 px-3">نوع الرسم</th>
                            <th className="py-2.5 px-3">{t('parent_portal.covered_months', 'الأشهر المغطاة')}</th>
                            <th className="py-2.5 px-3">{t('parent_portal.amount_paid', 'المبلغ المدفوع')}</th>
                            <th className="py-2.5 px-3">{t('parent_portal.remaining_debt', 'المتبقي')}</th>
                            <th className="py-2.5 px-3">{t('parent_portal.status', 'الحالة')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {childData.financials.tuitionPayments.map(p => {
                            let covered = [];
                            try {
                              covered = Array.isArray(p.covered_months) ? p.covered_months : JSON.parse(p.covered_months || '[]');
                            } catch {
                              covered = [];
                            }
                            return (
                              <tr key={p.id} className="hover:bg-slate-800/40">
                                <td className="py-3 px-3 font-mono font-bold text-emerald-300">{p.receipt_number}</td>
                                <td className="py-3 px-3 text-slate-400">{formatDate(p.payment_date)}</td>
                                <td className="py-3 px-3 font-medium text-slate-200">{p.fee_type_name_ar}</td>
                                <td className="py-3 px-3 text-slate-400 font-mono">
                                  {covered.length > 0 ? covered.join(', ') : '-'}
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-white">{formatCurrency(p.amount_paid)}</td>
                                <td className="py-3 px-3 font-mono text-rose-400 font-bold">{formatCurrency(p.remaining_debt)}</td>
                                <td className="py-3 px-3">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    p.status === 'PAID'
                                      ? 'bg-emerald-500/20 text-emerald-400'
                                      : 'bg-amber-500/20 text-amber-400'
                                  }`}>
                                    {p.status}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      لا توجد وصولات أقساط مسجلة بعد
                    </div>
                  )}
                </div>

                {/* Section 2: Store / POS Purchases */}
                <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-teal-400" />
                    <h4 className="font-bold text-white text-base">
                      {t('parent_portal.store_ledger', 'مشتريات المتجر والمطبوعات')}
                    </h4>
                  </div>

                  {childData.financials?.storePurchases?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs text-right">
                        <thead>
                          <tr className="border-b border-slate-700 text-slate-400">
                            <th className="py-2.5 px-3">رقم الفاتورة</th>
                            <th className="py-2.5 px-3">{t('parent_portal.date', 'التاريخ')}</th>
                            <th className="py-2.5 px-3">{t('parent_portal.amount_due', 'المبلغ الإجمالي')}</th>
                            <th className="py-2.5 px-3">{t('parent_portal.amount_paid', 'المسدد')}</th>
                            <th className="py-2.5 px-3">{t('parent_portal.remaining_debt', 'المتبقي')}</th>
                            <th className="py-2.5 px-3">{t('parent_portal.status', 'الحالة')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {childData.financials.storePurchases.map(s => (
                            <tr key={s.id} className="hover:bg-slate-800/40">
                              <td className="py-3 px-3 font-mono font-bold text-teal-300">{s.invoice_number}</td>
                              <td className="py-3 px-3 text-slate-400">{formatDate(s.created_at)}</td>
                              <td className="py-3 px-3 font-mono font-medium text-slate-200">{formatCurrency(s.total_amount)}</td>
                              <td className="py-3 px-3 font-mono font-bold text-white">{formatCurrency(s.paid_amount)}</td>
                              <td className="py-3 px-3 font-mono text-rose-400 font-bold">{formatCurrency(s.remaining_debt)}</td>
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  s.payment_status === 'PAID'
                                    ? 'bg-emerald-500/20 text-emerald-400'
                                    : 'bg-rose-500/20 text-rose-400'
                                }`}>
                                  {s.payment_status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      لا توجد مشتريات مسجلة
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =========================================================================
                TAB 4: ATTENDANCE & CONDUCT
                ========================================================================= */}
            {activeTab === 'attendance' && childData && (
              <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 space-y-6">
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {t('parent_portal.tab_attendance', 'سجل المواظبة والغيابات')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      متابعة حضور وغياب وتأخرات التلميذ
                    </p>
                  </div>
                </div>

                {/* Counter boxes */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                    <span className="text-[11px] font-bold text-emerald-400 block mb-1">الحضور</span>
                    <span className="text-2xl font-black font-mono text-emerald-300">
                      {childData.attendance?.stats?.present_count || 0}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-center">
                    <span className="text-[11px] font-bold text-blue-400 block mb-1">
                      {t('parent_portal.absences_justified', 'غيابات مبررة')}
                    </span>
                    <span className="text-2xl font-black font-mono text-blue-300">
                      {childData.attendance?.stats?.absent_justified_count || 0}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-center">
                    <span className="text-[11px] font-bold text-rose-400 block mb-1">
                      {t('parent_portal.absences_unjustified', 'غيابات غير مبررة')}
                    </span>
                    <span className="text-2xl font-black font-mono text-rose-300">
                      {childData.attendance?.stats?.absent_unjustified_count || 0}
                    </span>
                  </div>
                  <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                    <span className="text-[11px] font-bold text-amber-400 block mb-1">
                      {t('parent_portal.delays', 'تأخرات')}
                    </span>
                    <span className="text-2xl font-black font-mono text-amber-300">
                      {childData.attendance?.stats?.late_count || 0}
                    </span>
                  </div>
                </div>

                {/* Recent attendance table */}
                {childData.attendance?.recent?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="py-2.5 px-3">التاريخ</th>
                          <th className="py-2.5 px-3">الحالة</th>
                          <th className="py-2.5 px-3">وقت الوصول</th>
                          <th className="py-2.5 px-3">دقائق التأخر</th>
                          <th className="py-2.5 px-3">السبب / المبرر</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {childData.attendance.recent.map(a => (
                          <tr key={a.id} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-3 font-mono font-medium text-slate-300">{formatDate(a.date)}</td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                a.status === 'PRESENT'
                                  ? 'bg-emerald-500/20 text-emerald-400'
                                  : a.status === 'ABSENT_JUSTIFIED'
                                  ? 'bg-blue-500/20 text-blue-400'
                                  : a.status === 'ABSENT_UNJUSTIFIED'
                                  ? 'bg-rose-500/20 text-rose-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {a.status === 'PRESENT' ? 'حاضر'
                                  : a.status === 'ABSENT_JUSTIFIED' ? 'غياب مبرر'
                                  : a.status === 'ABSENT_UNJUSTIFIED' ? 'غياب غير مبرر'
                                  : 'تأخر'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{a.arrival_time?.substring(0, 5) || '-'}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-400">{a.minutes_late ? `${a.minutes_late} دقيقة` : '-'}</td>
                            <td className="py-2.5 px-3 text-slate-300">{a.reason || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    لا توجد تسجيلات غياب مسجلة
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                TAB 5: GRADES & EVALUATIONS
                ========================================================================= */}
            {activeTab === 'grades' && childData && (
              <div className="bg-slate-800/70 border border-slate-700/80 rounded-3xl p-6 space-y-6">
                <div className="flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-emerald-400" />
                  <div>
                    <h3 className="font-bold text-white text-base">
                      {t('parent_portal.tab_grades', 'النقاط والتقييمات الأكاديمية')}
                    </h3>
                    <p className="text-xs text-slate-400">
                      نتائج الاختبارات والتقييمات الدورية للتلميذ
                    </p>
                  </div>
                </div>

                {childData.grades?.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-right">
                      <thead>
                        <tr className="border-b border-slate-700 text-slate-400">
                          <th className="py-2.5 px-3">الفصل</th>
                          <th className="py-2.5 px-3">المادة</th>
                          <th className="py-2.5 px-3">نوع التقييم</th>
                          <th className="py-2.5 px-3">العلامة</th>
                          <th className="py-2.5 px-3">المعامل</th>
                          <th className="py-2.5 px-3">الملاحظة</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {childData.grades.map(g => (
                          <tr key={g.id} className="hover:bg-slate-800/40">
                            <td className="py-3 px-3 font-bold text-emerald-300">{g.term_name}</td>
                            <td className="py-3 px-3 font-medium text-white">{g.subject_name_ar}</td>
                            <td className="py-3 px-3 text-slate-400">{g.evaluation_type}</td>
                            <td className="py-3 px-3 font-mono font-bold text-base text-white">
                              {g.score} <span className="text-xs text-slate-400 font-normal">/ {g.max_score}</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-400">{g.coefficient}</td>
                            <td className="py-3 px-3 text-slate-300">{g.remarks || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    {t('parent_portal.no_grades', 'لم ترصد نقاط أو تقييمات لهذا الفصل بعد')}
                  </div>
                )}
              </div>
            )}

            {/* =========================================================================
                TAB 6: ANNOUNCEMENTS
                ========================================================================= */}
            {activeTab === 'announcements' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-emerald-400" />
                    <div>
                      <h3 className="font-bold text-white text-base">
                        {t('parent_portal.tab_announcements', 'الإعلانات والتبليغات المدرسية')}
                      </h3>
                      <p className="text-xs text-slate-400">
                        كافة الإعلانات الموجهة لكم من إدارة المدرسة
                      </p>
                    </div>
                  </div>
                </div>

                {announcements.length === 0 ? (
                  <div className="bg-slate-800/60 border border-slate-700/70 rounded-3xl p-12 text-center text-slate-500 text-xs">
                    {t('parent_portal.no_announcements', 'لا توجد إعلانات جديدة موجهة لكم حالياً')}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {announcements.map(ann => (
                      <div
                        key={ann.id}
                        className={`p-5 rounded-3xl border transition-all ${
                          ann.priority === 'URGENT'
                            ? 'bg-rose-950/20 border-rose-500/30'
                            : ann.priority === 'IMPORTANT'
                            ? 'bg-amber-950/20 border-amber-500/30'
                            : 'bg-slate-800/80 border-slate-700/80'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-700/60 pb-3 mb-3">
                          <div className="flex items-center gap-2">
                            <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${
                              ann.priority === 'URGENT'
                                ? 'bg-rose-500/20 text-rose-300'
                                : ann.priority === 'IMPORTANT'
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-slate-700 text-slate-300'
                            }`}>
                              {ann.priority === 'URGENT' ? 'عاجل' : ann.priority === 'IMPORTANT' ? 'هام' : 'إعلان عادي'}
                            </span>
                            <h4 className="font-black text-base text-white">{ann.title}</h4>
                          </div>
                          <div className="text-xs text-slate-400 font-mono">
                            {formatDate(ann.created_at)}
                          </div>
                        </div>

                        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                          {ann.content}
                        </p>

                        <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-800 text-[11px] text-slate-500">
                          <span>الجهة المستهدفة: {ann.target_label || 'جميع الأولياء'}</span>
                          {ann.author_name && <span>الناشر: {ann.author_name}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
