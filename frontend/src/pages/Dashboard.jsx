import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  GraduationCap, 
  Wallet, 
  Clock, 
  TrendingUp, 
  Plus, 
  ArrowUpRight, 
  BookOpen, 
  ShieldCheck, 
  ShoppingBag,
  School,
  CheckCircle2
} from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, formatDateTime, formatDate } from '../utils/formatters';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const { t, isRTL } = useLanguage();
  const { settings } = useSettings();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await api.get('/dashboard');
        if (res.success) {
          setData(res.data);
        }
      } catch (err) {
        console.error('[DASHBOARD] Error loading data:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  const { students, teachers, classes, attendance, financials, revenueTrends, recentAudits } = data || {};

  return (
    <div className="space-y-8">
      {/* Top Banner / Welcome Header */}
      <div className="bg-gradient-to-r from-navy-900 via-slate-900 to-navy-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="relative z-10 space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
            <School className="w-3.5 h-3.5" />
            <span>{t('app_name')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {settings.school_name_ar || t('app_name')}
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
            {t('app_subtitle')}
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="relative z-10 flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/students')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-lg shadow-emerald-900/50 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('dashboard.new_student')}</span>
          </button>
          <button
            onClick={() => navigate('/finance')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold border border-slate-700 transition-all"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>{t('dashboard.new_payment')}</span>
          </button>
          <button
            onClick={() => navigate('/inventory')}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-2xl text-xs font-bold border border-slate-700 transition-all"
          >
            <ShoppingBag className="w-4 h-4 text-teal-400" />
            <span>{t('dashboard.new_pos_sale')}</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title={t('dashboard.kpi_students')}
          value={students?.total || 0}
          subtitle={`${students?.active || 0} ${t('dashboard.kpi_active_students')}`}
          icon={GraduationCap}
          color="emerald"
        />
        <StatCard
          title={t('dashboard.kpi_teachers')}
          value={teachers?.total || 0}
          subtitle={`${classes?.total || 0} ${t('dashboard.kpi_classes')}`}
          icon={Users}
          color="blue"
        />
        <StatCard
          title={t('dashboard.kpi_overall_paid')}
          value={formatCurrency(financials?.totalOverallPaid || 0, settings.currency)}
          subtitle={`${t('dashboard.kpi_pending_debt')}: ${formatCurrency(financials?.totalOutstandingDebt || 0, settings.currency)}`}
          icon={Wallet}
          color="purple"
        />
        <StatCard
          title={t('dashboard.kpi_today_attendance')}
          value={`${attendance?.rate || 100}%`}
          subtitle={t('dashboard.present_today', { count: attendance?.present || 0 })}
          icon={Clock}
          color="amber"
        />
      </div>

      {/* Middle Row: Academic Tracks Breakdown & Revenue Flow */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Academic Track Cards (1 Col) */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600" />
              <span>{t('dashboard.enrollment_by_track')}</span>
            </h3>
            <button
              onClick={() => navigate('/classes')}
              className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
            >
              <span>{t('dashboard.view_classes')}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {students?.byTrack?.map((track) => (
              <div key={track.code} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-800">{track.name_ar}</h4>
                  <p className="text-[10px] text-slate-400">{track.name_en}</p>
                </div>
                <span className="px-2.5 py-1 bg-white rounded-xl text-xs font-black text-emerald-700 border border-slate-200 shadow-xs">
                  {t('dashboard.students_count_badge', { count: track.student_count })}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Revenue Flow & Financial Performance (2 Cols) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>{t('dashboard.revenue_trends')}</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">{t('dashboard.revenue_subtitle')}</p>
            </div>
            <button
              onClick={() => navigate('/finance')}
              className="px-3 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200/60 transition-colors"
            >
              {t('dashboard.view_finance')}
            </button>
          </div>

          {/* Revenue Breakdown Mini Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-[11px] font-bold text-emerald-700 block">{t('finance.kpi_tuition_collected')}</span>
              <span className="text-lg font-black text-emerald-900 font-mono mt-1 block">
                {formatCurrency(financials?.tuitionPaid || 0, settings.currency)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-teal-50/60 border border-teal-100">
              <span className="text-[11px] font-bold text-teal-700 block">{t('finance.kpi_store_revenue')}</span>
              <span className="text-lg font-black text-teal-900 font-mono mt-1 block">
                {formatCurrency(financials?.storePaid || 0, settings.currency)}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-100">
              <span className="text-[11px] font-bold text-rose-700 block">{t('dashboard.kpi_pending_debt')}</span>
              <span className="text-lg font-black text-rose-900 font-mono mt-1 block">
                {formatCurrency(financials?.totalOutstandingDebt || 0, settings.currency)}
              </span>
            </div>
          </div>

          {/* Monthly Revenue Bars */}
          <div className="pt-2">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              {t('dashboard.recent_months_revenue')}
            </h4>
            <div className="space-y-2">
              {revenueTrends && revenueTrends.length > 0 ? (
                revenueTrends.map((rev) => {
                  const maxVal = Math.max(...revenueTrends.map(r => Number(r.total_collected) || 1));
                  const percent = Math.min(100, Math.round(((Number(rev.total_collected) || 0) / maxVal) * 100));
                  return (
                    <div key={rev.month} className="flex items-center gap-3 text-xs">
                      <span className="w-16 font-mono text-slate-600 font-bold">{rev.month}</span>
                      <div className="flex-1 bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-500"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-800 text-right w-24">
                        {formatCurrency(rev.total_collected, settings.currency)}
                      </span>
                    </div>
                  );
                })
              ) : (
                <p className="text-xs text-slate-400 italic">{t('dashboard.no_chart_data')}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Recent Audit Activities */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{t('dashboard.recent_activity')}</span>
          </h3>
          <button
            onClick={() => navigate('/audit-logs')}
            className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-0.5"
          >
            <span>{t('dashboard.view_all_audits')}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
            <thead>
              <tr className="text-slate-400 border-b border-slate-100 pb-2">
                <th className="pb-2 font-bold">{t('audit.col_time')}</th>
                <th className="pb-2 font-bold">{t('audit.col_user')}</th>
                <th className="pb-2 font-bold">{t('audit.col_workstation')}</th>
                <th className="pb-2 font-bold">{t('audit.col_action')}</th>
                <th className="pb-2 font-bold">{t('audit.col_entity')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recentAudits?.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80">
                  <td className="py-2.5 font-mono text-slate-500">{formatDateTime()}</td>
                  <td className="py-2.5 font-semibold text-slate-800">{log.user_name || t('audit.system_user')}</td>
                  <td className="py-2.5 text-slate-500 font-mono">{log.workstation_name}</td>
                  <td className="py-2.5">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black bg-slate-100 text-slate-700">
                      {log.action_type}
                    </span>
                  </td>
                  <td className="py-2.5 text-slate-600 font-mono">{log.entity_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
