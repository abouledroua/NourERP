import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Search, 
  Barcode, 
  Trash2, 
  Minus, 
  AlertTriangle, 
  CheckCircle2, 
  Package, 
  Coins, 
  User, 
  FileText 
} from 'lucide-react';
import api from '../utils/api';
import { useLanguage } from '../context/LanguageContext';
import { useSettings } from '../context/SettingsContext';
import { formatCurrency } from '../utils/formatters';
import Modal from '../components/Modal';
import { useToast, useConfirm } from '../context/UIFeedbackContext';

export default function InventoryPOS() {
  const { t } = useLanguage();
  const { settings, tracks } = useSettings();
  const toast = useToast();
  const confirm = useConfirm();

  const [products, setProducts] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Cart State
  const [cart, setCart] = useState([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState('');
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [buyerName, setBuyerName] = useState('');
  const [notes, setNotes] = useState('');

  // Modals
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [newProduct, setNewProduct] = useState({
    sku: '',
    barcode: '',
    name: '',
    category: 'SUPPLIES',
    academic_track_id: '',
    cost_price: 1000,
    selling_price: 1500,
    stock_quantity: 20,
    min_stock_alert: 5
  });

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryFilter) params.append('category', categoryFilter);
      if (lowStockOnly) params.append('lowStock', 'true');

      const res = await api.get(`/pos/products?${params.toString()}`);
      if (res.success) setProducts(res.data);
    } catch (err) {
      console.error('[POS] Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    try {
      const res = await api.get('/students?status=ACTIVE');
      if (res.success) setStudents(res.data);
    } catch (err) {
      console.error('[POS] Error loading students:', err);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, categoryFilter, lowStockOnly]);

  // Cart operations
  const handleAddToCart = (product) => {
    if (product.stock_quantity <= 0) {
      toast.warning(t('inventory.out_of_stock'));
      return;
    }

    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock_quantity) {
          toast.warning(t('inventory.max_stock_reached'));
          return prev;
        }
        return prev.map(item =>
          item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, {
        product_id: product.id,
        name: product.name,
        price: Number(product.selling_price),
        quantity: 1,
        maxStock: product.stock_quantity
      }];
    });
  };

  const handleUpdateQuantity = (productId, delta) => {
    setCart(prev => prev.map(item => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        if (newQty <= 0) return null;
        if (newQty > item.maxStock) {
          toast.warning(t('inventory.cannot_exceed_stock'));
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }).filter(Boolean));
  };

  const handleRemoveFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  // Cart calculations
  const cartSubtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const cartTotal = Math.max(0, cartSubtotal - Number(discountAmount || 0));
  const actualPaid = paidAmount === '' ? cartTotal : Math.min(cartTotal, Number(paidAmount || 0));
  const remainingDebt = Math.max(0, cartTotal - actualPaid);

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.warning(t('toast.cart_empty'));
      return;
    }
    if (remainingDebt > 0 && !selectedStudentId && !buyerName) {
      toast.warning(t('inventory.debt_requires_student'));
      return;
    }

    try {
      const payload = {
        student_id: selectedStudentId || null,
        buyer_name: buyerName || null,
        items: cart.map(i => ({ product_id: i.product_id, quantity: i.quantity })),
        discount_amount: Number(discountAmount || 0),
        paid_amount: actualPaid,
        notes: notes || t('inventory.notes')
      };

      const res = await api.post('/pos/sales', payload);
      if (res.success) {
        toast.success(t('toast.sale_success', { invoice: res.data?.invoice_number || '' }));
        setCart([]);
        setDiscountAmount(0);
        setPaidAmount('');
        setSelectedStudentId('');
        setBuyerName('');
        setNotes('');
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.message || t('toast.sale_failed'));
    }
  };

  const handleCreateProduct = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/pos/products', newProduct);
      if (res.success) {
        toast.success(res.message || t('toast.product_created'));
        setIsAddProductModalOpen(false);
        fetchProducts();
      }
    } catch (err) {
      toast.error(err.message || t('toast.product_create_failed'));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            {t('inventory.title')}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('inventory.subtitle')}
          </p>
        </div>

        <button
          onClick={() => setIsAddProductModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold shadow-md shadow-emerald-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>{t('inventory.add_product_btn')}</span>
        </button>
      </div>

      {/* Main Two-Column Layout: Catalog (Left/Right) & Active Cart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left/Main Column: Product Catalog (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Search & Category Filter Bar */}
          <div className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <div className="absolute inset-y-0 right-0 rtl:right-0 ltr:left-0 pr-3 rtl:pr-3 ltr:pl-3 flex items-center pointer-events-none text-slate-400">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t('inventory.search_barcode')}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 rtl:pr-9 ltr:pl-9 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-2xl py-2 px-3 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">{t('inventory.all_categories')}</option>
              <option value="TEXTBOOK">{t('inventory.category_textbook')}</option>
              <option value="UNIFORM">{t('inventory.category_uniform')}</option>
              <option value="SUPPLIES">{t('inventory.category_supplies')}</option>
              <option value="OTHER">{t('inventory.category_other')}</option>
            </select>

            <button
              onClick={() => setLowStockOnly(!lowStockOnly)}
              className={`px-3 py-2 rounded-2xl text-xs font-bold border transition-colors flex items-center gap-1 ${
                lowStockOnly ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{t('inventory.low_stock_warning')}</span>
            </button>
          </div>

          {/* Product Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {loading ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                {t('common.loading')}
              </div>
            ) : products.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-400">
                {t('inventory.empty_products')}
              </div>
            ) : (
              products.map(p => {
                const isLow = p.stock_quantity <= p.min_stock_alert;
                return (
                  <div
                    key={p.id}
                    onClick={() => handleAddToCart(p)}
                    className="bg-white rounded-3xl p-4 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between space-y-3 group"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                        <span>{p.sku}</span>
                        {p.barcode && <span className="flex items-center gap-0.5"><Barcode className="w-3 h-3" /> {p.barcode}</span>}
                      </div>
                      <h4 className="font-extrabold text-xs text-slate-900 line-clamp-2 group-hover:text-emerald-700 transition-colors">
                        {p.name}
                      </h4>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-black text-sm font-mono text-emerald-800">
                        {formatCurrency(p.selling_price, settings.currency)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        p.stock_quantity <= 0 
                          ? 'bg-rose-100 text-rose-800' 
                          : (isLow ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700')
                      }`}>
                        {t('inventory.stock_badge', { stock: p.stock_quantity })}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Sales POS Cart (1 Col) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-lg flex flex-col justify-between space-y-4 h-fit sticky top-24">
          <div className="space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-black text-sm text-slate-900 flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-emerald-600" />
                <span>{t('inventory.cart_title')}</span>
              </h3>
              <span className="text-xs bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                {t('inventory.cart_items_count', { count: cart.reduce((a, b) => a + b.quantity, 0) })}
              </span>
            </div>

            {/* Cart Items List */}
            <div className="max-h-64 overflow-y-auto space-y-2 pr-1 divide-y divide-slate-100">
              {cart.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-8 italic">
                  {t('inventory.cart_empty')}
                </p>
              ) : (
                cart.map(item => (
                  <div key={item.product_id} className="pt-2 flex items-center justify-between gap-2 text-xs">
                    <div className="truncate flex-1">
                      <p className="font-bold text-slate-800 truncate">{item.name}</p>
                      <span className="font-mono text-[11px] text-emerald-700">
                        {formatCurrency(item.price * item.quantity, settings.currency)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                      <button
                        onClick={() => handleUpdateQuantity(item.product_id, -1)}
                        className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-bold font-mono px-1.5">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.product_id, 1)}
                        className="p-1 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg transition-colors"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveFromCart(item.product_id)}
                      className="p-1 text-slate-300 hover:text-rose-500 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Checkout Totals & Debt Controls */}
          {cart.length > 0 && (
            <div className="pt-4 border-t border-slate-100 space-y-3 text-xs">
              {/* Assign Student for Credit Sales */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">
                  {t('inventory.select_student')}:
                </label>
                <select
                  value={selectedStudentId}
                  onChange={e => setSelectedStudentId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">{t('inventory.general_customer')}</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.first_name_ar} {s.last_name_ar} ({s.matricule}) - {s.class_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Discount and Payment inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 mb-0.5">{t('inventory.discount')}:</label>
                  <input
                    type="number"
                    min="0"
                    value={discountAmount}
                    onChange={e => setDiscountAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-1.5 font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-emerald-800 mb-0.5">{t('inventory.paid_now')}:</label>
                  <input
                    type="number"
                    min="0"
                    placeholder={String(cartTotal)}
                    value={paidAmount}
                    onChange={e => setPaidAmount(e.target.value)}
                    className="w-full bg-emerald-50 border border-emerald-300 rounded-xl p-1.5 font-mono font-black text-emerald-900"
                  />
                </div>
              </div>

              {/* Totals Summary */}
              <div className="p-3 bg-slate-50 rounded-2xl space-y-1">
                <div className="flex justify-between font-bold text-slate-600">
                  <span>{t('inventory.total_cart')}:</span>
                  <span className="font-mono text-sm font-black text-slate-900">{formatCurrency(cartTotal, settings.currency)}</span>
                </div>
                {remainingDebt > 0 && (
                  <div className="flex justify-between font-bold text-rose-600 border-t border-slate-200 pt-1">
                    <span>{t('inventory.remaining_as_debt')}:</span>
                    <span className="font-mono font-black">{formatCurrency(remainingDebt, settings.currency)}</span>
                  </div>
                )}
              </div>

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold rounded-2xl shadow-lg shadow-emerald-900/30 transition-all flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{t('inventory.checkout_btn')}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODAL: ADD NEW PRODUCT
          ========================================================================= */}
      <Modal
        isOpen={isAddProductModalOpen}
        onClose={() => setIsAddProductModalOpen(false)}
        title={t('inventory.modal_add_title')}
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-slate-700 mb-1">{t('inventory.product_name_label')}</label>
            <input
              type="text"
              required
              value={newProduct.name}
              onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
              placeholder={t('inventory.product_name_placeholder')}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('inventory.category_label')}</label>
              <select
                value={newProduct.category}
                onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
              >
                <option value="TEXTBOOK">{t('inventory.category_textbook_long')}</option>
                <option value="UNIFORM">{t('inventory.category_uniform_long')}</option>
                <option value="SUPPLIES">{t('inventory.category_supplies_long')}</option>
                <option value="OTHER">{t('inventory.category_other')}</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('inventory.barcode_label')}</label>
              <input
                type="text"
                value={newProduct.barcode}
                onChange={e => setNewProduct({ ...newProduct, barcode: e.target.value })}
                placeholder="613000000001"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('inventory.cost_price_label', { currency: settings.currency || 'DZD' })}</label>
              <input
                type="number"
                value={newProduct.cost_price}
                onChange={e => setNewProduct({ ...newProduct, cost_price: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-emerald-800 mb-1">{t('inventory.selling_price_label', { currency: settings.currency || 'DZD' })}</label>
              <input
                type="number"
                required
                value={newProduct.selling_price}
                onChange={e => setNewProduct({ ...newProduct, selling_price: e.target.value })}
                className="w-full bg-emerald-50 border border-emerald-300 rounded-xl p-2.5 font-mono font-black text-emerald-900 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('inventory.initial_stock_label')}</label>
              <input
                type="number"
                value={newProduct.stock_quantity}
                onChange={e => setNewProduct({ ...newProduct, stock_quantity: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">{t('inventory.min_alert_label')}</label>
              <input
                type="number"
                value={newProduct.min_stock_alert}
                onChange={e => setNewProduct({ ...newProduct, min_stock_alert: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsAddProductModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md shadow-emerald-600/30"
            >
              {t('inventory.submit_add_product')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
