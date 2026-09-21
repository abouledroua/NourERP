import React, { useState, useEffect } from 'react';
import { Printer, FileSpreadsheet, X, Scissors, CheckCircle2, ShieldCheck, School } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import { getRecommendedDensity, getDensityClass } from '../utils/printScaling';
import { exportJsonToExcel } from '../utils/excelExport';

export default function MultiReceiptModal({ isOpen, onClose, selectedTransactions = [] }) {
  const { t, isRTL } = useLanguage();
  const { settings } = useSettings();
  const [activeTab, setActiveTab] = useState('slips'); // 'slips' | 'table'
  const [density, setDensity] = useState('normal');

  // Auto-tune density based on the number of selected vouchers so they fit on 1 page!
  useEffect(() => {
    if (selectedTransactions.length > 0) {
      setDensity(getRecommendedDensity(selectedTransactions.length));
    }
  }, [selectedTransactions.length]);

  if (!isOpen || selectedTransactions.length === 0) return null;

  // Aggregate totals
  const totalPaid = selectedTransactions.reduce((acc, curr) => acc + Number(curr.paid_amount || 0), 0);
  const totalDebt = selectedTransactions.reduce((acc, curr) => acc + Number(curr.debt_amount || 0), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleExportExcel = () => {
    const excelData = selectedTransactions.map(tx => ({
      [t('finance.col_ref')]: tx.reference_number,
      [t('finance.col_category')]: tx.transaction_category === 'TUITION' ? t('voucher_print.tuition_slip_badge') : t('voucher_print.store_slip_badge'),
      [t('voucher_print.student_name')]: tx.student_name_ar || tx.student_name_en,
      [t('voucher_print.matricule')]: tx.student_matricule,
      [t('voucher_print.class_name')]: tx.class_name || '-',
      [t('voucher_print.item_detail')]: tx.item_description_ar || tx.notes || '-',
      [t('voucher_print.date')]: formatDate(tx.transaction_date),
      [t('finance.col_paid')]: Number(tx.paid_amount || 0),
      [t('finance.col_debt')]: Number(tx.debt_amount || 0),
      [t('finance.col_cashier')]: tx.cashier_name || '-'
    }));

    exportJsonToExcel(excelData, `Receipts_Batch_${Date.now()}.xlsx`, 'Selected Receipts');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-2 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm transition-opacity no-print" 
        onClick={onClose}
      />

      {/* Main Container */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 z-10 my-4 flex flex-col max-h-[92vh]">
        {/* Controls Toolbar (Hidden on print) */}
        <div className="no-print p-4 sm:p-5 border-b border-slate-200 bg-slate-50/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-slate-200/80 p-1 rounded-2xl text-xs font-bold">
              <button
                onClick={() => setActiveTab('slips')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'slips' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('voucher_print.tab_slips')} ({selectedTransactions.length})
              </button>
              <button
                onClick={() => setActiveTab('table')}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t('voucher_print.tab_table')}
              </button>
            </div>

            {/* Density Selector (Active for Slips Mode) */}
            {activeTab === 'slips' && (
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-600 mr-2 rtl:ml-2">
                <span className="font-medium text-slate-500">{t('voucher_print.density_label')}</span>
                <select
                  value={density}
                  onChange={(e) => setDensity(e.target.value)}
                  className="bg-white border border-slate-300 rounded-xl px-2 py-1 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="normal">{t('voucher_print.density_normal')}</option>
                  <option value="compact">{t('voucher_print.density_compact')}</option>
                  <option value="ultra">{t('voucher_print.density_ultra')}</option>
                  <option value="grid">{t('voucher_print.density_grid')}</option>
                </select>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-xl text-xs font-bold border border-emerald-200/60 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t('voucher_print.export_excel')}</span>
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{t('voucher_print.print_now')}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            PRINTABLE SHEET (W3C A4 STRICT SINGLE-PAGE CONTAINER)
            ========================================================================= */}
        <div className="printable-area page-container flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 print:bg-white print:p-0">
          <div className="max-w-[210mm] mx-auto bg-white p-4 print:p-0 rounded-2xl shadow-xs print:shadow-none">
            {activeTab === 'slips' ? (
              /* MODE 1: MULTI-SLIP COUPON VOUCHERS */
              <div className={`space-y-4 print:space-y-0 ${getDensityClass(density)}`}>
                {selectedTransactions.map((tx, idx) => (
                  <React.Fragment key={`${tx.transaction_category}-${tx.id}`}>
                    <div className="voucher-slip border border-slate-300 rounded-2xl p-4 bg-white relative overflow-hidden">
                      {/* Top Header */}
                      <div className="flex items-start justify-between pb-2 mb-2 border-b border-slate-200">
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
                            ن
                          </div>
                          <div>
                            <h4 className="font-extrabold text-xs text-slate-900 leading-tight">
                              {settings.school_name_ar || t('app_name')}
                            </h4>
                            <p className="text-[10px] text-slate-500">{settings.school_address}</p>
                          </div>
                        </div>

                        <div className="text-right rtl:text-left">
                          <span className="inline-block px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                            {tx.transaction_category === 'TUITION' ? t('voucher_print.tuition_slip_badge') : t('voucher_print.store_slip_badge')}
                          </span>
                          <p className="text-xs font-black text-emerald-800 font-mono mt-0.5">{tx.reference_number}</p>
                        </div>
                      </div>

                      {/* Slip Body Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs py-1">
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t('voucher_print.student_name')}</span>
                          <span className="font-bold text-slate-900 truncate block">
                            {tx.student_name_ar || tx.student_name_en || t('inventory.general_customer')}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t('voucher_print.matricule')}</span>
                          <span className="font-semibold text-slate-800 font-mono block">{tx.student_matricule || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t('voucher_print.class_name')}</span>
                          <span className="font-semibold text-slate-800 block">{tx.class_name || '-'}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">{t('voucher_print.date')}</span>
                          <span className="font-semibold text-slate-800 block">{formatDate(tx.transaction_date)}</span>
                        </div>
                      </div>

                      {/* Description & Amount Row */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between bg-slate-50/80 p-2.5 rounded-xl">
                        <div className="text-xs">
                          <span className="text-[10px] text-slate-400 block">{t('voucher_print.item_detail')}</span>
                          <p className="font-medium text-slate-700">
                            {tx.item_description_ar || tx.notes || t('voucher_print.default_service_desc')}
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-left rtl:text-right">
                          <div>
                            <span className="text-[10px] text-slate-400 block">{t('voucher_print.amount_paid')}</span>
                            <span className="text-sm font-black text-emerald-700 font-mono">
                              {formatCurrency(tx.paid_amount, settings.currency)}
                            </span>
                          </div>
                          {Number(tx.debt_amount) > 0 && (
                            <div>
                              <span className="text-[10px] text-rose-500 font-semibold block">{t('voucher_print.remaining_debt')}</span>
                              <span className="text-xs font-bold text-rose-600 font-mono">
                                {formatCurrency(tx.debt_amount, settings.currency)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Stamp & Security Code */}
                      <div className="mt-2 pt-1.5 flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3 text-emerald-600" />
                          <span className="font-mono text-[9px]">SEC-AUTH-{tx.id}-{Date.now().toString().slice(-4)}</span>
                        </div>
                        <div className="italic text-[9px] text-slate-500">
                          {settings.print_receipt_footer || t('voucher_print.default_footer')}
                        </div>
                        <div className="font-medium text-slate-600">
                          {t('voucher_print.cashier_signature')}: <span className="font-bold text-slate-800">{tx.cashier_name || t('voucher_print.cashier_default')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Realistic Cut Line between vouchers (unless last item) */}
                    {idx < selectedTransactions.length - 1 && (
                      <div className="cut-line my-3 flex items-center justify-center text-[10px] text-slate-400 font-mono select-none">
                        <span className="bg-white px-3 flex items-center gap-1 text-slate-400 font-semibold">
                          <Scissors className="w-3.5 h-3.5" />
                          <span>{t('voucher_print.cut_line')}</span>
                        </span>
                      </div>
                    )}
                  </React.Fragment>
                ))}
              </div>
            ) : (
              /* MODE 2: ITEMIZED ACCOUNTING SUMMARY TABLE */
              <div className="space-y-4">
                {/* Header for Summary Statement */}
                <div className="text-center pb-3 border-b-2 border-slate-800">
                  <h3 className="font-black text-base text-slate-900">{settings.school_name_ar || t('app_name')}</h3>
                  <h4 className="font-bold text-xs text-slate-600">{t('voucher_print.summary_title')}</h4>
                  <p className="text-[10px] text-slate-400 mt-1">{t('voucher_print.issue_date', { date: formatDate(new Date()) })}</p>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-right rtl:text-right ltr:text-left border-collapse border border-slate-200">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                        <th className="p-2 border border-slate-200">#</th>
                        <th className="p-2 border border-slate-200">{t('finance.col_ref')}</th>
                        <th className="p-2 border border-slate-200">{t('finance.col_category')}</th>
                        <th className="p-2 border border-slate-200">{t('finance.col_student')}</th>
                        <th className="p-2 border border-slate-200">{t('finance.col_class')}</th>
                        <th className="p-2 border border-slate-200">{t('finance.col_date')}</th>
                        <th className="p-2 border border-slate-200 text-emerald-800">{t('finance.col_paid')}</th>
                        <th className="p-2 border border-slate-200 text-rose-700">{t('finance.col_debt')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTransactions.map((tx, idx) => (
                        <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="p-2 border border-slate-200 font-mono text-slate-400">{idx + 1}</td>
                          <td className="p-2 border border-slate-200 font-mono font-bold text-emerald-800">{tx.reference_number}</td>
                          <td className="p-2 border border-slate-200">
                            {tx.transaction_category === 'TUITION' ? t('voucher_print.tuition_slip_badge') : t('voucher_print.store_slip_badge')}
                          </td>
                          <td className="p-2 border border-slate-200 font-medium">
                            {tx.student_name_ar || tx.student_name_en} ({tx.student_matricule})
                          </td>
                          <td className="p-2 border border-slate-200">{tx.class_name || '-'}</td>
                          <td className="p-2 border border-slate-200 font-mono">{formatDate(tx.transaction_date)}</td>
                          <td className="p-2 border border-slate-200 font-mono font-bold text-emerald-700">
                            {formatCurrency(tx.paid_amount, settings.currency)}
                          </td>
                          <td className="p-2 border border-slate-200 font-mono font-semibold text-rose-600">
                            {formatCurrency(tx.debt_amount, settings.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100/80 font-black text-slate-900 border-t-2 border-slate-300">
                        <td colSpan={6} className="p-2.5 border border-slate-200 text-center font-bold">
                          {t('voucher_print.total_summary_row', { count: selectedTransactions.length })}
                        </td>
                        <td className="p-2.5 border border-slate-200 font-mono font-black text-emerald-800 text-sm">
                          {formatCurrency(totalPaid, settings.currency)}
                        </td>
                        <td className="p-2.5 border border-slate-200 font-mono font-black text-rose-700 text-sm">
                          {formatCurrency(totalDebt, settings.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Stamp block */}
                <div className="pt-6 flex justify-between text-xs text-slate-600">
                  <div className="space-y-1">
                    <p className="font-bold">{t('voucher_print.treasurer_signature')}</p>
                    <div className="h-12 border-b border-dashed border-slate-300 w-48"></div>
                  </div>
                  <div className="space-y-1 text-center">
                    <p className="font-bold">{t('voucher_print.admin_stamp')}</p>
                    <div className="h-12 border border-dashed border-slate-300 w-48 rounded-xl flex items-center justify-center text-slate-300 text-[10px]">
                      {t('voucher_print.official_stamp')}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
