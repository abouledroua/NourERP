import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Plus, 
  Printer, 
  Search, 
  Filter, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Coins, 
  ShoppingBag, 
  ArrowDownCircle, 
  ArrowUpCircle,
  FileSpreadsheet,
  Calendar
} from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency, formatDate } from '../utils/formatters';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import MultiReceiptModal from '../components/MultiReceiptModal';
import { useToast, useConfirm } from '../context/UIFeedbackContext';

export default function Finance() {
  const { t, isRTL } = useLanguage();
  const { settings } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();

  // Active Category Tab: 'ALL' | 'TUITION' | 'STORE_POS' | 'CASH'
  const [activeTab, setActiveTab] = useState('ALL');
  const [transactions, setTransactions] = useState([]);
  const [cashTransactions, setCashTransactions] = useState([]);
  const [kpis, setKpis] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Accounts
  const [accounts, setAccounts] = useState([]);
  const [isNewAccountModalOpen, setIsNewAccountModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [accountForm, setAccountForm] = useState({ name: '', currency: 'DZD', is_default: false, balance: 0 });
  const [transferForm, setTransferForm] = useState({ from_account_id: '', to_account_id: '', amount: 0, notes: '', transfer_date: new Date().toISOString().slice(0, 10) });

  // Multi-selection for vouchers
  const [selectedTxIds, setSelectedTxIds] = useState([]);
  const [isMultiPrintOpen, setIsMultiPrintOpen] = useState(false);

  // Modals
  const [isNewTuitionModalOpen, setIsNewTuitionModalOpen] = useState(false);
  const [isSettleDebtModalOpen, setIsSettleDebtModalOpen] = useState(false);
  const [isNewCashModalOpen, setIsNewCashModalOpen] = useState(false);
  const [targetDebtSale, setTargetDebtSale] = useState(null);

  // Form dependencies
  const [students, setStudents] = useState([]);
  const [feeTypes, setFeeTypes] = useState([]);

  // Form States
  const [tuitionForm, setTuitionForm] = useState({
    student_id: '',
    fee_type_id: '',
    amount_due: 16000.00,
    discount_type: 'NONE',
    discount_value: 0.00,
    amount_paid: 16000.00,
    payment_date: new Date().toISOString().slice(0, 10),
    payment_method: 'CASH',
    covered_months: [new Date().toISOString().slice(0, 7)],
    notes: 't("finance.petty_cash_desc_1")'
  });

  const [settleForm, setSettleForm] = useState({
    payment_amount: 0,
    payment_method: 'CASH',
    notes: 't("finance.petty_cash_desc_2")'
  });

  const [cashForm, setCashForm] = useState({
    transaction_type: 'EXPENSE',
    category: 'SUPPLIES_PURCHASE',
    amount: 1000.00,
    description: '',
    payment_method: 'CASH'
  });

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (activeTab !== 'ALL' && activeTab !== 'CASH' && activeTab !== 'ACCOUNTS') params.append('type', activeTab);
      if (search) params.append('search', search);
      if (statusFilter) params.append('status', statusFilter);
      params.append('_t', Date.now()); // cache buster

      const [ledgerRes, kpisRes, cashRes, accountsRes] = await Promise.all([
        api.get(`/finance/ledger?${params.toString()}`),
        api.get(`/finance/kpis?${params.toString()}`),
        api.get(`/finance/cash-transactions?${params.toString()}`),
        api.get(`/finance/accounts?${params.toString()}`)
      ]);

      if (ledgerRes.success) setTransactions(ledgerRes.data);
      if (kpisRes.success) setKpis(kpisRes.data);
      if (cashRes.success) setCashTransactions(cashRes.data);
      if (accountsRes.success) setAccounts(accountsRes.data);
    } catch (err) {
      console.error('[FINANCE] Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDependencies = async () => {
    try {
      const [sRes, fRes] = await Promise.all([
        api.get('/students?status=ACTIVE'),
        api.get('/finance/fee-types')
      ]);
      if (sRes.success) setStudents(sRes.data);
      if (fRes.success) {
        setFeeTypes(fRes.data);
        if (fRes.data.length > 0) {
          setTuitionForm(prev => ({
            ...prev,
            fee_type_id: fRes.data[0].id,
            amount_due: fRes.data[0].default_amount,
            amount_paid: fRes.data[0].default_amount
          }));
        }
      }
    } catch (err) {
      console.error('[FINANCE] Error loading form dependencies:', err);
    }
  };

  useEffect(() => {
    fetchDependencies();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFinanceData();
    }, 250);
    return () => clearTimeout(timer);
  }, [activeTab, search, statusFilter]);

  // Checkbox handlers
  const handleToggleSelectTx = (idKey) => {
    setSelectedTxIds(prev => 
      prev.includes(idKey) ? prev.filter(i => i !== idKey) : [...prev, idKey]
    );
  };

  const handleSelectAll = () => {
    if (selectedTxIds.length === transactions.length) {
      setSelectedTxIds([]);
    } else {
      setSelectedTxIds(transactions.map(tx => `${tx.transaction_category}-${tx.id}`));
    }
  };

  const selectedTransactionsList = transactions.filter(tx => 
    selectedTxIds.includes(`${tx.transaction_category}-${tx.id}`)
  );

  // Tuition Payment Submission
  const handleCreateTuitionPayment = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/payments', tuitionForm);
      if (res.success) {
        toast.success(res.message || t('toast.tuition_paid_success'));
        setIsNewTuitionModalOpen(false);
        fetchFinanceData();
      }
    } catch (err) {
      toast.error(err.message || t('toast.tuition_paid_failed'));
    }
  };

  // Settle Store Debt Submission
  const handleSettleStoreDebt = async (e) => {
    e.preventDefault();
    if (!targetDebtSale) return;
    try {
      const res = await api.post('/pos/settle-debt', {
        sale_id: targetDebtSale.id,
        payment_amount: settleForm.payment_amount,
        payment_method: settleForm.payment_method,
        notes: settleForm.notes
      });
      if (res.success) {
        toast.success(res.message || t('toast.debt_settled_success'));
        setIsSettleDebtModalOpen(false);
        fetchFinanceData();
      }
    } catch (err) {
      toast.error(err.message || t('toast.debt_settled_failed'));
    }
  };

  // Petty Cash Submission
  const handleCreateCashTx = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/cash-transactions', cashForm);
      if (res.success) {
        toast.success(res.message || t('toast.cash_tx_success'));
        setIsNewCashModalOpen(false);
        fetchFinanceData();
      }
    } catch (err) {
      toast.error(err.message || t('toast.cash_tx_failed'));
    }
  };

  // Void Transaction
  const handleVoidTx = async (tx) => {
    const isConfirmed = await confirm({
      title: t('dialog.void_tx_title'),
      message: t('dialog.void_tx_msg', {
        ref: tx.reference_number || tx.id,
        amount: formatCurrency(tx.paid_amount || tx.amount, settings.currency)
      }),
      confirmText: t('dialog.confirm_void_tx'),
      cancelText: t('dialog.cancel_btn'),
      type: 'danger'
    });

    if (!isConfirmed) return;

    try {
      const res = await api.delete(`/finance/void/${tx.transaction_category}/${tx.id}`, {
        body: { reason: 'User void request' }
      });
      if (res.success) {
        toast.success(res.message || t('toast.tx_void_success'));
        fetchFinanceData();
      }
    } catch (err) {
      toast.error(err.message || t('toast.tx_void_failed'));
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/accounts', accountForm);
      if (res.success) {
        toast.success(res.message);
        setIsNewAccountModalOpen(false);
        fetchFinanceData();
        setAccountForm({ name: '', currency: 'DZD', balance: 0, is_default: false });
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/finance/accounts/transfer', transferForm);
      if (res.success) {
        toast.success(res.message);
        setIsTransferModalOpen(false);
        fetchFinanceData();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleSetDefaultAccount = async (account) => {
    try {
      const res = await api.put(`/finance/accounts/${account.id}`, { is_default: true });
      if (res.success) {
        toast.success('t("finance.toast_default_set")');
        fetchFinanceData();
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('finance.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('finance.subtitle')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Print Selected Vouchers Button */}
          <button
            onClick={() => setIsMultiPrintOpen(true)}
            disabled={selectedTxIds.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl text-xs font-bold border border-slate-200 shadow-xs transition-colors disabled:opacity-40"
          >
            <Printer className="w-4 h-4 text-emerald-600" />
            <span>{t('finance.print_selected_btn')} ({selectedTxIds.length})</span>
          </button>

          <button
            onClick={() => {
              setCashForm({ type: 'EXPENSE', amount: '', category: '', description: '', payment_method: 'CASH' });
              setIsNewCashModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl text-xs font-bold border border-slate-200 shadow-xs transition-colors"
          >
            <Coins className="w-4 h-4 text-amber-500" />
            <span>{t('finance.petty_cash_btn')}</span>
          </button>

          <button
            onClick={() => {
              setTuitionForm({
                student_id: students.length > 0 ? students[0].id : '',
                fee_type_id: '',
                discount_type: 'NONE',
                discount_value: 0,
                amount_paid: 0,
                payment_method: 'CASH',
                notes: '',
                payment_date: new Date().toISOString().split('T')[0]
              });
              setIsNewTuitionModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{t('finance.new_tuition_btn')}</span>
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard
          title={t('finance.kpi_total_paid')}
          value={formatCurrency(kpis?.totalOverallPaid || 0, settings.currency)}
          subtitle={t('finance.kpi_total_paid_sub')}
          icon={Wallet}
          color="emerald"
        />
        <StatCard
          title={t('finance.kpi_total_debt')}
          value={formatCurrency(kpis?.totalOutstandingDebt || 0, settings.currency)}
          subtitle={t('finance.kpi_total_debt_sub')}
          icon={AlertCircle}
          color="rose"
        />
        <StatCard
          title={t('finance.kpi_tuition_paid')}
          value={formatCurrency(kpis?.tuitionPaid || 0, settings.currency)}
          subtitle={`${t('finance.kpi_tuition_debt_label')} ${formatCurrency(kpis?.tuitionDebt || 0, settings.currency)}`}
          icon={Coins}
          color="blue"
        />
        <StatCard
          title={t('finance.kpi_store_receivables')}
          value={formatCurrency(kpis?.storeDebt || 0, settings.currency)}
          subtitle={`${t('finance.kpi_store_paid_label')} ${formatCurrency(kpis?.storePaid || 0, settings.currency)}`}
          icon={ShoppingBag}
          color="amber"
        />
      </div>

      {/* Unified Statement Sub-tabs & Filter bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Sub-tabs */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl text-xs font-bold">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'ALL' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('finance.tab_all')}
            </button>
            <button
              onClick={() => setActiveTab('TUITION')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'TUITION' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('finance.tab_tuition')}
            </button>
            <button
              onClick={() => setActiveTab('STORE_POS')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'STORE_POS' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('finance.tab_store')}
            </button>
            <button
              onClick={() => setActiveTab('CASH')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'CASH' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t('finance.tab_cash')}
            </button>
            <button
              onClick={() => setActiveTab('ACCOUNTS')}
              className={`px-3.5 py-1.5 rounded-xl transition-all ${
                activeTab === 'ACCOUNTS' ? 'bg-white text-emerald-800 shadow-xs font-black' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t("finance.financial_accounts_tab")}
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 rtl:right-0 ltr:left-0 pr-3 rtl:pr-3 ltr:pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-3.5 h-3.5" />
              </div>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('finance.search_placeholder')}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-3 rtl:pr-9 ltr:pl-9 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {activeTab !== 'CASH' && activeTab !== 'ACCOUNTS' && (
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-xl py-1.5 px-2.5 text-xs text-slate-700 font-bold focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">{t('finance.filter_all_status')}</option>
                <option value="PAID">{t('finance.status_paid')}</option>
                <option value="PARTIAL">{t('finance.status_partial')}</option>
                <option value="UNPAID">{t('finance.status_unpaid')}</option>
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Main Table: Either Consolidated Ledger, Petty Cash, or Accounts */}
      {activeTab !== 'CASH' && activeTab !== 'ACCOUNTS' ? (
        /* CONSOLIDATED STATEMENT FEED */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-3 text-center">
                    <input
                      type="checkbox"
                      checked={transactions.length > 0 && selectedTxIds.length === transactions.length}
                      onChange={handleSelectAll}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                  </th>
                  <th className="py-3 px-3">{t('finance.col_ref')}</th>
                  <th className="py-3 px-3">{t('finance.col_category')}</th>
                  <th className="py-3 px-3">{t('finance.col_student')}</th>
                  <th className="py-3 px-3">{t('finance.col_class')}</th>
                  <th className="py-3 px-3">{t('finance.col_description')}</th>
                  <th className="py-3 px-3 font-mono text-emerald-800">{t('finance.col_paid')}</th>
                  <th className="py-3 px-3 font-mono text-rose-700">{t('finance.col_debt')}</th>
                  <th className="py-3 px-3">{t('finance.col_date')}</th>
                  <th className="py-3 px-3 text-center">{t('finance.col_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={10} className="py-8 text-center text-slate-400">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : transactions.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-10 text-center text-slate-400">
                      {t('finance.empty_transactions')}
                    </td>
                  </tr>
                ) : (
                  transactions.map(tx => {
                    const txKey = `${tx.transaction_category}-${tx.id}`;
                    const isSelected = selectedTxIds.includes(txKey);
                    return (
                      <tr key={txKey} className={`hover:bg-slate-50/80 transition-colors ${isSelected ? 'bg-emerald-50/40' : ''}`}>
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectTx(txKey)}
                            className="rounded text-emerald-600 focus:ring-emerald-500"
                          />
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">{tx.reference_number}</td>
                        <td className="py-3 px-3">
                          {tx.transaction_category === 'TUITION' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-blue-50 text-blue-700 border border-blue-100">
                              🪙 {t('finance.badge_tuition')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black bg-amber-50 text-amber-800 border border-amber-100">
                              🛍️ {t('finance.badge_store')}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <span className="font-bold text-slate-900 block">{tx.student_name_ar || tx.student_name_en}</span>
                          <span className="font-mono text-[10px] text-slate-400">{tx.student_matricule}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">{tx.class_name || '-'}</td>
                        <td className="py-3 px-3 text-slate-700 font-medium max-w-[200px] truncate">
                          {tx.item_description_ar || tx.notes}
                        </td>
                        <td className="py-3 px-3 font-mono font-black text-emerald-700 text-sm">
                          {formatCurrency(tx.paid_amount, settings.currency)}
                        </td>
                        <td className="py-3 px-3 font-mono font-bold text-rose-600">
                          {Number(tx.debt_amount) > 0 ? formatCurrency(tx.debt_amount, settings.currency) : '-'}
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">{formatDate(tx.transaction_date)}</td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* Settle Debt Button for POS Credit Sales */}
                            {tx.transaction_category === 'STORE_POS' && Number(tx.debt_amount) > 0 && (
                              <button
                                onClick={() => {
                                  setTargetDebtSale(tx);
                                  setSettleForm({
                                    payment_amount: Number(tx.debt_amount),
                                    payment_method: 'CASH',
                                    notes: t('finance.modal_settle_notes_default', { ref: tx.reference_number })
                                  });
                                  setIsSettleDebtModalOpen(true);
                                }}
                                title={t('finance.action_settle')}
                                className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg text-[10px] font-extrabold border border-amber-200 transition-colors"
                              >
                                {t('finance.action_settle')}
                              </button>
                            )}

                            {/* Print Single Receipt */}
                            <button
                              onClick={() => {
                                setSelectedTxIds([txKey]);
                                setIsMultiPrintOpen(true);
                              }}
                              title={t('finance.action_print')}
                              className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-xl transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            {/* Void Transaction */}
                            <button
                              onClick={() => handleVoidTx(tx)}
                              title={t('finance.action_void')}
                              className="p-1.5 text-rose-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : activeTab === 'CASH' ? (
        /* PETTY CASH REGISTER */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-right rtl:text-right ltr:text-left">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-100 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">{t('finance.col_voucher_no')}</th>
                  <th className="py-3 px-4">{t('finance.col_tx_type')}</th>
                  <th className="py-3 px-4">{t('finance.col_cash_category')}</th>
                  <th className="py-3 px-4">{t('finance.col_cash_description')}</th>
                  <th className="py-3 px-4 font-mono">{t('finance.col_cash_amount')}</th>
                  <th className="py-3 px-4">{t('finance.col_cash_method')}</th>
                  <th className="py-3 px-4">{t('finance.col_cash_date')}</th>
                  <th className="py-3 px-4">{t('finance.col_cash_employee')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {cashTransactions.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{c.voucher_number}</td>
                    <td className="py-3 px-4">
                      {c.transaction_type === 'INCOME' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-50 text-emerald-700">
                          <ArrowDownCircle className="w-3 h-3" /> {t('finance.type_income')}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-50 text-rose-700">
                          <ArrowUpCircle className="w-3 h-3" /> {t('finance.type_expense')}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-700">{c.category}</td>
                    <td className="py-3 px-4 text-slate-900 font-medium">{c.description}</td>
                    <td className={`py-3 px-4 font-mono font-black text-sm ${c.transaction_type === 'INCOME' ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {formatCurrency(c.amount, settings.currency)}
                    </td>
                    <td className="py-3 px-4">{c.payment_method}</td>
                    <td className="py-3 px-4 font-mono">{formatDate(c.transaction_date)}</td>
                    <td className="py-3 px-4 text-slate-600">{c.performed_by_name || t('finance.default_admin')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* FINANCIAL ACCOUNTS */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden p-6 space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg">إدارة {t("finance.financial_accounts_tab")}</h3>
            <div className="flex gap-2">
              <button onClick={() => { setTransferForm({ from_account_id: '', to_account_id: '', amount: 0, notes: '' }); setIsTransferModalOpen(true); }} className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold">{t("finance.transfer_balance")}</button>
              <button onClick={() => { setAccountForm({ name: '', currency: 'DZD', balance: 0, is_default: false }); setIsNewAccountModalOpen(true); }} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold">{t("finance.add_account")}</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(acc => (
              <div key={acc.id} className="border border-slate-200 rounded-2xl p-4 bg-slate-50 relative">
                {acc.is_default ? (
                  <span className="absolute top-2 left-2 px-2 py-1 bg-emerald-100 text-emerald-800 text-[10px] rounded-lg font-bold">{t("finance.default")}</span>
                ) : (
                  <button onClick={() => handleSetDefaultAccount(acc)} className="absolute top-2 left-2 px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] rounded-lg font-bold">{t("finance.set_as_default")}</button>
                )}
                <h4 className="font-bold text-slate-900 mb-2">{acc.name}</h4>
                <p className="text-2xl font-mono text-emerald-700">{formatCurrency(acc.balance, acc.currency)}</p>
                <p className="text-xs text-slate-500 mt-2">{t("finance.currency")}: {acc.currency}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: NEW TUITION PAYMENT
          ========================================================================= */}
      <Modal
        isOpen={isNewTuitionModalOpen}
        onClose={() => setIsNewTuitionModalOpen(false)}
        title={t('finance.modal_tuition_title')}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateTuitionPayment} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_tuition_student')}</label>
            <select
              required
              value={tuitionForm.student_id}
              onChange={e => setTuitionForm({ ...tuitionForm, student_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            >
              <option value="">{t('finance.modal_tuition_select_student')}</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {s.first_name_ar} {s.last_name_ar} ({s.matricule}) - {s.class_name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_tuition_fee_type')}</label>
              <select
                required
                value={tuitionForm.fee_type_id}
                onChange={e => {
                  const ft = feeTypes.find(f => f.id === parseInt(e.target.value, 10));
                  setTuitionForm({
                    ...tuitionForm,
                    fee_type_id: e.target.value,
                    amount_due: ft ? ft.default_amount : tuitionForm.amount_due,
                    amount_paid: ft ? ft.default_amount : tuitionForm.amount_paid
                  });
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                {feeTypes.map(f => (
                  <option key={f.id} value={f.id}>{f.name_ar} ({formatCurrency(f.default_amount, settings.currency)})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_tuition_payment_date')}</label>
              <input
                type="date"
                required
                value={tuitionForm.payment_date}
                onChange={e => setTuitionForm({ ...tuitionForm, payment_date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_tuition_amount_due', { currency: settings.currency || 'DZD' })}</label>
              <input
                type="number"
                required
                value={tuitionForm.amount_due}
                onChange={e => setTuitionForm({ ...tuitionForm, amount_due: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_tuition_discount_type')}</label>
              <select
                value={tuitionForm.discount_type}
                onChange={e => setTuitionForm({ ...tuitionForm, discount_type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              >
                <option value="NONE">{t('finance.discount_none')}</option>
                <option value="PERCENTAGE">{t('finance.discount_percentage')}</option>
                <option value="FIXED">{t('finance.discount_fixed', { currency: settings.currency || 'DZD' })}</option>
              </select>
            </div>

            {tuitionForm.discount_type !== 'NONE' && (
              <div>
                <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_tuition_discount_value')}</label>
                <input
                  type="number"
                  value={tuitionForm.discount_value}
                  onChange={e => setTuitionForm({ ...tuitionForm, discount_value: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-emerald-800 mb-1">{t('finance.modal_tuition_amount_paid')}</label>
              <input
                type="number"
                required
                value={tuitionForm.amount_paid}
                onChange={e => setTuitionForm({ ...tuitionForm, amount_paid: e.target.value })}
                className="w-full bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 font-mono font-black text-emerald-900 text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_tuition_method')}</label>
              <select
                value={tuitionForm.payment_method}
                onChange={e => setTuitionForm({ ...tuitionForm, payment_method: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              >
                <option value="CASH">{t('finance.method_cash')}</option>
                <option value="BANK_TRANSFER">{t('finance.method_transfer')}</option>
                <option value="CHEQUE">{t('finance.method_cheque')}</option>
                <option value="CARD">{t('finance.method_card')}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_tuition_notes')}</label>
            <input
              type="text"
              value={tuitionForm.notes}
              onChange={e => setTuitionForm({ ...tuitionForm, notes: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewTuitionModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30"
            >
              {t('finance.modal_tuition_submit')}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: SETTLE STORE DEBT
          ========================================================================= */}
      <Modal
        isOpen={isSettleDebtModalOpen}
        onClose={() => setIsSettleDebtModalOpen(false)}
        title={t('finance.modal_settle_title')}
      >
        {targetDebtSale && (
          <form onSubmit={handleSettleStoreDebt} className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
              <p>{t('finance.modal_settle_invoice_no')} <strong className="font-mono text-slate-900">{targetDebtSale.reference_number}</strong></p>
              <p>{t('finance.modal_settle_customer')} <strong>{targetDebtSale.student_name_ar || targetDebtSale.buyer_name}</strong></p>
              <p>{t('finance.modal_settle_total')} <strong className="font-mono">{formatCurrency(targetDebtSale.total_amount, settings.currency)}</strong></p>
              <p>{t('finance.modal_settle_previously_paid')} <strong className="font-mono text-emerald-700">{formatCurrency(targetDebtSale.paid_amount, settings.currency)}</strong></p>
              <p className="text-sm font-black text-rose-600">{t('finance.modal_settle_remaining_debt')} {formatCurrency(targetDebtSale.debt_amount, settings.currency)}</p>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_settle_amount_now')}</label>
              <input
                type="number"
                required
                max={targetDebtSale.debt_amount}
                value={settleForm.payment_amount}
                onChange={e => setSettleForm({ ...settleForm, payment_amount: e.target.value })}
                className="w-full bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 font-mono font-black text-emerald-900 text-sm"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_tuition_method')}</label>
              <select
                value={settleForm.payment_method}
                onChange={e => setSettleForm({ ...settleForm, payment_method: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
              >
                <option value="CASH">{t('finance.method_cash')}</option>
                <option value="BANK_TRANSFER">{t('finance.method_transfer')}</option>
                <option value="CHEQUE">{t('finance.method_cheque')}</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsSettleDebtModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30"
              >
                {t('finance.modal_settle_submit')}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* =========================================================================
          MODAL: NEW PETTY CASH ENTRY
          ========================================================================= */}
      <Modal
        isOpen={isNewCashModalOpen}
        onClose={() => setIsNewCashModalOpen(false)}
        title={t('finance.modal_cash_title')}
      >
        <form onSubmit={handleCreateCashTx} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_cash_type')}</label>
              <select
                value={cashForm.transaction_type}
                onChange={e => setCashForm({ ...cashForm, transaction_type: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
              >
                <option value="EXPENSE">{t('finance.modal_cash_type_expense')}</option>
                <option value="INCOME">{t('finance.modal_cash_type_income')}</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_cash_amount', { currency: settings.currency || 'DZD' })}</label>
              <input
                type="number"
                required
                value={cashForm.amount}
                onChange={e => setCashForm({ ...cashForm, amount: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_cash_category')}</label>
            <input
              type="text"
              required
              value={cashForm.category}
              onChange={e => setCashForm({ ...cashForm, category: e.target.value })}
              placeholder={t('finance.modal_cash_category_placeholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('finance.modal_cash_desc')}</label>
            <textarea
              required
              rows={2}
              value={cashForm.description}
              onChange={e => setCashForm({ ...cashForm, description: e.target.value })}
              placeholder={t('finance.modal_cash_desc_placeholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsNewCashModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30"
            >
              {t('finance.modal_cash_submit')}
            </button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: NEW ACCOUNT
          ========================================================================= */}
      <Modal
        isOpen={isNewAccountModalOpen}
        onClose={() => setIsNewAccountModalOpen(false)}
        title={t("finance.new_account_title")}
      >
        <form onSubmit={handleCreateAccount} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t("finance.account_name")}</label>
            <input
              type="text"
              required
              value={accountForm.name}
              onChange={e => setAccountForm({ ...accountForm, name: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t("finance.initial_balance")}</label>
            <input
              type="number"
              step="0.01"
              required
              value={accountForm.balance}
              onChange={e => setAccountForm({ ...accountForm, balance: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
            />
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t("finance.currency")}</label>
            <input
              type="text"
              required
              value={accountForm.currency}
              onChange={e => setAccountForm({ ...accountForm, currency: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsNewAccountModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold">{t("common.cancel")}</button>
            <button type="submit" className="px-5 py-2 bg-emerald-600 text-white rounded-xl font-bold">{t("common.save")}</button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MODAL: TRANSFER
          ========================================================================= */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title={t("finance.transfer_title")}
      >
        <form onSubmit={handleTransfer} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t("finance.from_account")}</label>
            <select
              required
              value={transferForm.from_account_id}
              onChange={e => setTransferForm({ ...transferForm, from_account_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
            >
              <option value="">{t("finance.select_account")}</option>
              {accounts.filter(acc => acc.id.toString() !== transferForm.to_account_id).map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance})</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t("finance.to_account")}</label>
            <select
              required
              value={transferForm.to_account_id}
              onChange={e => setTransferForm({ ...transferForm, to_account_id: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5"
            >
              <option value="">{t("finance.select_account")}</option>
              {accounts.filter(acc => acc.id.toString() !== transferForm.from_account_id).map(acc => <option key={acc.id} value={acc.id}>{acc.name} ({acc.balance})</option>)}
            </select>
          </div>
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t("finance.amount")}</label>
            <input
              type="number"
              step="0.01"
              required
              value={transferForm.amount}
              onChange={e => setTransferForm({ ...transferForm, amount: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button type="button" onClick={() => setIsTransferModalOpen(false)} className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold">{t("common.cancel")}</button>
            <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-xl font-bold">{t("finance.transfer_balance")}</button>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          MULTI-SLIP COUPON & SUMMARY TABLE VOUCHER PRINT MODAL
          ========================================================================= */}
      <MultiReceiptModal
        isOpen={isMultiPrintOpen}
        onClose={() => setIsMultiPrintOpen(false)}
        selectedTransactions={selectedTransactionsList}
      />
    </div>
  );
}
