'use client';

import { useLocale } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { AdminHeader, useAdminSidebar, AdminLayout } from '@/components/admin';
import {
  Shield,
  Store,
  ArrowRight,
  ArrowLeft,
  RefreshCw,
  X,
  Package,
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  FolderPlus,
  Search,
  ImageOff,
  Save,
  Clock,
} from 'lucide-react';

interface Category {
  id: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  display_order: number;
  is_active: boolean;
}

interface Product {
  id: string;
  name_ar: string;
  name_en: string | null;
  description_ar: string | null;
  description_en: string | null;
  price: number;
  original_price: number | null;
  image_url: string | null;
  is_available: boolean;
  preparation_time_min: number;
  display_order: number;
  category_id: string | null;
  pricing_type: string;
}

interface ProviderInfo {
  id: string;
  name_ar: string;
  name_en: string;
}

export default function AdminProviderProductsPage() {
  const locale = useLocale();
  const params = useParams();
  const isRTL = locale === 'ar';
  const providerId = params.id as string;

  const { toggle: toggleSidebar } = useAdminSidebar();

  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const [provider, setProvider] = useState<ProviderInfo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'available' | 'unavailable'>('all');

  // Category modal
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryNameAr, setCategoryNameAr] = useState('');
  const [categoryNameEn, setCategoryNameEn] = useState('');
  const [categoryLoading, setCategoryLoading] = useState(false);

  // Product modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    price: '',
    original_price: '',
    preparation_time_min: '15',
    category_id: '',
    is_available: true,
  });
  const [productLoading, setProductLoading] = useState(false);

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [deleteCategoryConfirm, setDeleteCategoryConfirm] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createClient();

    // Fetch provider info, categories, and products in parallel
    const [providerResult, categoriesResult, productsResult] = await Promise.all([
      supabase.from('providers').select('id, name_ar, name_en').eq('id', providerId).single(),
      supabase
        .from('provider_categories')
        .select('*')
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('menu_items')
        .select(
          'id, name_ar, name_en, description_ar, description_en, price, original_price, image_url, is_available, preparation_time_min, display_order, category_id, pricing_type'
        )
        .eq('provider_id', providerId)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false }),
    ]);

    if (providerResult.data) setProvider(providerResult.data);
    if (categoriesResult.data) setCategories(categoriesResult.data);
    if (productsResult.data) setProducts(productsResult.data);
  }, [providerId]);

  const checkAuth = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    setUser(user);

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role === 'admin') {
        setIsAdmin(true);
        await loadData();
      }
    }

    setLoading(false);
  }, [loadData]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // ─── Category Actions ────────────────────────────────────────

  function openAddCategory() {
    setEditingCategory(null);
    setCategoryNameAr('');
    setCategoryNameEn('');
    setShowCategoryModal(true);
  }

  function openEditCategory(cat: Category) {
    setEditingCategory(cat);
    setCategoryNameAr(cat.name_ar);
    setCategoryNameEn(cat.name_en || '');
    setShowCategoryModal(true);
  }

  async function handleSaveCategory() {
    if (!categoryNameAr.trim()) return;
    setCategoryLoading(true);
    const supabase = createClient();

    if (editingCategory) {
      const { error } = await supabase
        .from('provider_categories')
        .update({
          name_ar: categoryNameAr.trim(),
          name_en: categoryNameEn.trim() || categoryNameAr.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingCategory.id);

      if (!error) {
        await loadData();
        setShowCategoryModal(false);
      }
    } else {
      const { error } = await supabase.from('provider_categories').insert({
        provider_id: providerId,
        name_ar: categoryNameAr.trim(),
        name_en: categoryNameEn.trim() || categoryNameAr.trim(),
        display_order: categories.length,
        is_active: true,
      });

      if (!error) {
        await loadData();
        setShowCategoryModal(false);
      }
    }
    setCategoryLoading(false);
  }

  async function handleDeleteCategory(categoryId: string) {
    const supabase = createClient();
    const { error } = await supabase
      .from('provider_categories')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', categoryId);

    if (!error) {
      await loadData();
      setDeleteCategoryConfirm(null);
      if (selectedCategory === categoryId) setSelectedCategory(null);
    }
  }

  // ─── Product Actions ─────────────────────────────────────────

  function openAddProduct() {
    setEditingProduct(null);
    setProductForm({
      name_ar: '',
      name_en: '',
      description_ar: '',
      description_en: '',
      price: '',
      original_price: '',
      preparation_time_min: '15',
      category_id: selectedCategory || '',
      is_available: true,
    });
    setShowProductModal(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product);
    setProductForm({
      name_ar: product.name_ar,
      name_en: product.name_en || '',
      description_ar: product.description_ar || '',
      description_en: product.description_en || '',
      price: product.price?.toString() || '',
      original_price: product.original_price?.toString() || '',
      preparation_time_min: product.preparation_time_min?.toString() || '15',
      category_id: product.category_id || '',
      is_available: product.is_available,
    });
    setShowProductModal(true);
  }

  async function handleSaveProduct() {
    if (!productForm.name_ar.trim() || !productForm.price) return;
    setProductLoading(true);
    const supabase = createClient();

    const data: Record<string, unknown> = {
      name_ar: productForm.name_ar.trim(),
      name_en: productForm.name_en.trim() || productForm.name_ar.trim(),
      description_ar: productForm.description_ar.trim() || null,
      description_en: productForm.description_en.trim() || null,
      price: parseFloat(productForm.price),
      original_price: productForm.original_price ? parseFloat(productForm.original_price) : null,
      preparation_time_min: parseInt(productForm.preparation_time_min) || 15,
      category_id: productForm.category_id || null,
      is_available: productForm.is_available,
      updated_at: new Date().toISOString(),
    };

    if (editingProduct) {
      const { error } = await supabase.from('menu_items').update(data).eq('id', editingProduct.id);
      if (!error) {
        await loadData();
        setShowProductModal(false);
      }
    } else {
      const { error } = await supabase.from('menu_items').insert({
        ...data,
        provider_id: providerId,
        display_order: products.length,
        pricing_type: 'fixed',
      });
      if (!error) {
        await loadData();
        setShowProductModal(false);
      }
    }
    setProductLoading(false);
  }

  async function handleToggleAvailability(productId: string, currentStatus: boolean) {
    setActionLoading(productId);
    const supabase = createClient();

    const { error } = await supabase
      .from('menu_items')
      .update({ is_available: !currentStatus, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (!error) await loadData();
    setActionLoading(null);
  }

  async function handleDeleteProduct(productId: string) {
    setActionLoading(productId);
    const supabase = createClient();

    const { error } = await supabase.from('menu_items').delete().eq('id', productId);

    if (!error) await loadData();
    setActionLoading(null);
    setDeleteConfirm(null);
  }

  // ─── Filtering ─────────────────────────────────────────────

  const normalizeArabicText = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[ةه]/g, 'ه')
      .replace(/[أإآا]/g, 'ا')
      .replace(/[يى]/g, 'ي')
      .replace(/[\u064B-\u065F]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const filteredProducts = products
    .filter((p) => {
      if (selectedCategory === 'uncategorized') return !p.category_id;
      if (selectedCategory) return p.category_id === selectedCategory;
      return true;
    })
    .filter((p) => {
      if (filter === 'available') return p.is_available;
      if (filter === 'unavailable') return !p.is_available;
      return true;
    })
    .filter((p) => {
      if (!searchQuery.trim()) return true;
      const q = normalizeArabicText(searchQuery);
      return (
        normalizeArabicText(p.name_ar || '').includes(q) ||
        (p.name_en || '').toLowerCase().includes(q)
      );
    });

  const availableCount = products.filter((p) => p.is_available).length;
  const unavailableCount = products.filter((p) => !p.is_available).length;
  const uncategorizedCount = products.filter((p) => !p.category_id).length;

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return locale === 'ar' ? 'بدون تصنيف' : 'Uncategorized';
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? (locale === 'ar' ? cat.name_ar : cat.name_en || cat.name_ar) : '';
  };

  // ─── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <>
        <div className="h-16 bg-white border-b border-slate-200 animate-pulse" />
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-primary border-t-transparent"></div>
        </div>
      </>
    );
  }

  if (!user || !isAdmin) {
    return (
      <>
        <header className="bg-white border-b border-slate-200 px-4 lg:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-center h-10">
            <h1 className="text-lg font-semibold text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
          </div>
        </header>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'غير مصرح' : 'Unauthorized'}
            </h1>
            <Link href={`/${locale}/auth/login`}>
              <Button size="lg" className="bg-primary hover:bg-primary/90">
                {locale === 'ar' ? 'تسجيل الدخول' : 'Login'}
              </Button>
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!provider) {
    return (
      <AdminLayout>
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center bg-white p-8 rounded-2xl border border-slate-200 shadow-lg">
            <Store className="w-16 h-16 text-slate-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2 text-slate-900">
              {locale === 'ar' ? 'المتجر غير موجود' : 'Provider Not Found'}
            </h1>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <>
      <AdminHeader
        user={user}
        title={locale === 'ar' ? `منتجات ${provider.name_ar}` : `${provider.name_en} Products`}
        onMenuClick={toggleSidebar}
      />

      <main className="flex-1 p-4 lg:p-6 overflow-auto">
        {/* Back to Provider */}
        <Link
          href={`/${locale}/admin/providers/${providerId}`}
          className="inline-flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          <span>
            {locale === 'ar' ? `العودة إلى ${provider.name_ar}` : `Back to ${provider.name_en}`}
          </span>
        </Link>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{products.length}</p>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'إجمالي المنتجات' : 'Total Products'}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <Eye className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{availableCount}</p>
                <p className="text-xs text-slate-500">{locale === 'ar' ? 'متاح' : 'Available'}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                <EyeOff className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{unavailableCount}</p>
                <p className="text-xs text-slate-500">
                  {locale === 'ar' ? 'غير متاح' : 'Unavailable'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Categories Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              {locale === 'ar' ? 'التصنيفات' : 'Categories'}{' '}
              <span className="text-sm font-normal text-slate-400">({categories.length})</span>
            </h2>
            <Button size="sm" onClick={openAddCategory}>
              <FolderPlus className="w-4 h-4 me-2" />
              {locale === 'ar' ? 'إضافة تصنيف' : 'Add Category'}
            </Button>
          </div>

          {categories.length > 0 ? (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                    selectedCategory === cat.id
                      ? 'border-primary bg-primary/5'
                      : 'border-slate-100 bg-slate-50 hover:bg-slate-100'
                  }`}
                >
                  <button
                    className="flex-1 text-start"
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  >
                    <span className="font-medium text-slate-900">
                      {locale === 'ar' ? cat.name_ar : cat.name_en || cat.name_ar}
                    </span>
                    <span className="text-xs text-slate-400 ms-2">
                      ({products.filter((p) => p.category_id === cat.id).length}{' '}
                      {locale === 'ar' ? 'منتج' : 'products'})
                    </span>
                  </button>
                  <div className="flex items-center gap-1">
                    {deleteCategoryConfirm === cat.id ? (
                      <>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteCategory(cat.id)}
                        >
                          {locale === 'ar' ? 'تأكيد' : 'Confirm'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setDeleteCategoryConfirm(null)}
                        >
                          {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                        </Button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => openEditCategory(cat)}
                          className="p-1.5 text-slate-400 hover:text-primary rounded-md hover:bg-primary/10"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteCategoryConfirm(cat.id)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-md hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <FolderPlus className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm text-slate-500">
                {locale === 'ar'
                  ? 'لا توجد تصنيفات. أضف تصنيفاً لتنظيم المنتجات.'
                  : 'No categories yet. Add a category to organize products.'}
              </p>
            </div>
          )}
        </div>

        {/* Search + Add Product */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute top-1/2 -translate-y-1/2 left-3 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder={locale === 'ar' ? 'ابحث عن منتج...' : 'Search products...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 px-10 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary/30 shadow-sm"
            />
          </div>
          <Button onClick={openAddProduct}>
            <Plus className="w-4 h-4 me-2" />
            {locale === 'ar' ? 'إضافة منتج' : 'Add Product'}
          </Button>
          <Button variant="outline" onClick={loadData}>
            <RefreshCw className="w-4 h-4 me-2" />
            {locale === 'ar' ? 'تحديث' : 'Refresh'}
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className={filter !== 'all' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'الكل' : 'All'}
            <span className="mx-1 text-xs opacity-70">({products.length})</span>
          </Button>
          <Button
            variant={filter === 'available' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('available')}
            className={filter !== 'available' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'متاح' : 'Available'}
            <span className="mx-1 text-xs opacity-70">({availableCount})</span>
          </Button>
          <Button
            variant={filter === 'unavailable' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('unavailable')}
            className={filter !== 'unavailable' ? 'border-slate-300 text-slate-600' : ''}
          >
            {locale === 'ar' ? 'غير متاح' : 'Unavailable'}
            <span className="mx-1 text-xs opacity-70">({unavailableCount})</span>
          </Button>
        </div>

        {/* Category quick filter */}
        {categories.length > 0 && (
          <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === null ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory(null)}
              className={selectedCategory !== null ? 'border-slate-300 text-slate-600' : ''}
            >
              {locale === 'ar' ? 'جميع التصنيفات' : 'All Categories'}
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat.id}
                variant={selectedCategory === cat.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                className={selectedCategory !== cat.id ? 'border-slate-300 text-slate-600' : ''}
              >
                {locale === 'ar' ? cat.name_ar : cat.name_en || cat.name_ar}
                <span className="mx-1 text-xs opacity-70">
                  ({products.filter((p) => p.category_id === cat.id).length})
                </span>
              </Button>
            ))}
            {uncategorizedCount > 0 && (
              <Button
                variant={selectedCategory === 'uncategorized' ? 'default' : 'outline'}
                size="sm"
                onClick={() =>
                  setSelectedCategory(selectedCategory === 'uncategorized' ? null : 'uncategorized')
                }
                className={
                  selectedCategory !== 'uncategorized' ? 'border-slate-300 text-slate-600' : ''
                }
              >
                {locale === 'ar' ? 'بدون تصنيف' : 'Uncategorized'}
                <span className="mx-1 text-xs opacity-70">({uncategorizedCount})</span>
              </Button>
            )}
          </div>
        )}

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl border border-slate-200 shadow-sm">
            <Package className="w-16 h-16 mx-auto mb-4 text-slate-300" />
            <h2 className="text-xl font-semibold mb-2 text-slate-900">
              {searchQuery
                ? locale === 'ar'
                  ? 'لا توجد نتائج'
                  : 'No results found'
                : locale === 'ar'
                  ? 'لا توجد منتجات بعد'
                  : 'No products yet'}
            </h2>
            <p className="text-slate-500 text-sm mb-6">
              {locale === 'ar'
                ? 'أضف منتجات لهذا المتجر لمساعدته في الإعداد'
                : 'Add products for this provider to help with onboarding'}
            </p>
            {!searchQuery && (
              <Button onClick={openAddProduct}>
                <Plus className="w-5 h-5 me-2" />
                {locale === 'ar' ? 'إضافة أول منتج' : 'Add First Product'}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredProducts.map((product) => {
              const isLoading = actionLoading === product.id;
              const showDelete = deleteConfirm === product.id;
              const hasDiscount =
                product.original_price != null && product.original_price > product.price;

              return (
                <div
                  key={product.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Image */}
                  <div className="relative h-40 bg-slate-100">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={locale === 'ar' ? product.name_ar : product.name_en || product.name_ar}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="w-12 h-12 text-slate-300" />
                      </div>
                    )}

                    {/* Availability badge */}
                    <div className={`absolute top-2 ${isRTL ? 'left-2' : 'right-2'}`}>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${
                          product.is_available
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {product.is_available
                          ? locale === 'ar'
                            ? 'متاح'
                            : 'Available'
                          : locale === 'ar'
                            ? 'غير متاح'
                            : 'Unavailable'}
                      </span>
                    </div>

                    {/* Discount badge */}
                    {hasDiscount && (
                      <div className={`absolute top-2 ${isRTL ? 'right-2' : 'left-2'}`}>
                        <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-500 text-white">
                          {Math.round(
                            (1 - product.price / (product.original_price || product.price)) * 100
                          )}
                          % {locale === 'ar' ? 'خصم' : 'OFF'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    {product.category_id && (
                      <span className="inline-block px-2 py-0.5 bg-primary/10 text-primary text-xs font-medium rounded-full mb-2">
                        {getCategoryName(product.category_id)}
                      </span>
                    )}

                    <h3 className="font-bold text-lg mb-1 line-clamp-1 text-slate-900">
                      {locale === 'ar' ? product.name_ar : product.name_en || product.name_ar}
                    </h3>

                    {(product.description_ar || product.description_en) && (
                      <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                        {locale === 'ar'
                          ? product.description_ar
                          : product.description_en || product.description_ar}
                      </p>
                    )}

                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold text-primary">
                          {product.price?.toFixed(2)}
                        </span>
                        <span className="text-sm text-slate-500">
                          {locale === 'ar' ? 'ج.م' : 'EGP'}
                        </span>
                        {hasDiscount && (
                          <span className="text-sm text-slate-400 line-through">
                            {product.original_price?.toFixed(2)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-sm text-slate-400">
                        <Clock className="w-4 h-4" />
                        {product.preparation_time_min} {locale === 'ar' ? 'د' : 'min'}
                      </div>
                    </div>

                    {/* Actions */}
                    {showDelete ? (
                      <div className="space-y-2">
                        <p className="text-sm text-center text-red-500">
                          {locale === 'ar' ? 'هل أنت متأكد من الحذف؟' : 'Confirm delete?'}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setDeleteConfirm(null)}
                          >
                            {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleDeleteProduct(product.id)}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : locale === 'ar' ? (
                              'حذف'
                            ) : (
                              'Delete'
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-slate-300"
                          onClick={() => handleToggleAvailability(product.id, product.is_available)}
                          disabled={isLoading}
                        >
                          {isLoading ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : product.is_available ? (
                            <>
                              <EyeOff className="w-4 h-4 me-1" />
                              {locale === 'ar' ? 'إخفاء' : 'Hide'}
                            </>
                          ) : (
                            <>
                              <Eye className="w-4 h-4 me-1" />
                              {locale === 'ar' ? 'إظهار' : 'Show'}
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 border-slate-300"
                          onClick={() => openEditProduct(product)}
                        >
                          <Edit className="w-4 h-4 me-1" />
                          {locale === 'ar' ? 'تعديل' : 'Edit'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-red-200 text-red-500 hover:bg-red-50"
                          onClick={() => setDeleteConfirm(product.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Category Modal */}
      {showCategoryModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCategoryModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-900">
                {editingCategory
                  ? locale === 'ar'
                    ? 'تعديل التصنيف'
                    : 'Edit Category'
                  : locale === 'ar'
                    ? 'إضافة تصنيف جديد'
                    : 'Add New Category'}
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'اسم التصنيف (عربي) *' : 'Category Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  value={categoryNameAr}
                  onChange={(e) => setCategoryNameAr(e.target.value)}
                  placeholder={locale === 'ar' ? 'مثال: بيتزا' : 'e.g., Pizza'}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="rtl"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'اسم التصنيف (إنجليزي)' : 'Category Name (English)'}
                </label>
                <input
                  type="text"
                  value={categoryNameEn}
                  onChange={(e) => setCategoryNameEn(e.target.value)}
                  placeholder={locale === 'ar' ? 'اختياري' : 'Optional'}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-100">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCategoryModal(false)}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveCategory}
                disabled={!categoryNameAr.trim() || categoryLoading}
              >
                {categoryLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'حفظ' : 'Save'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowProductModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-lg text-slate-900">
                {editingProduct
                  ? locale === 'ar'
                    ? 'تعديل المنتج'
                    : 'Edit Product'
                  : locale === 'ar'
                    ? 'إضافة منتج جديد'
                    : 'Add New Product'}
              </h3>
              <button
                onClick={() => setShowProductModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Name AR */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'اسم المنتج (عربي) *' : 'Product Name (Arabic) *'}
                </label>
                <input
                  type="text"
                  value={productForm.name_ar}
                  onChange={(e) => setProductForm({ ...productForm, name_ar: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="rtl"
                />
              </div>

              {/* Name EN */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'اسم المنتج (إنجليزي)' : 'Product Name (English)'}
                </label>
                <input
                  type="text"
                  value={productForm.name_en}
                  onChange={(e) => setProductForm({ ...productForm, name_en: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="ltr"
                />
              </div>

              {/* Description AR */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
                </label>
                <textarea
                  value={productForm.description_ar}
                  onChange={(e) =>
                    setProductForm({ ...productForm, description_ar: e.target.value })
                  }
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="rtl"
                />
              </div>

              {/* Description EN */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
                </label>
                <textarea
                  value={productForm.description_en}
                  onChange={(e) =>
                    setProductForm({ ...productForm, description_en: e.target.value })
                  }
                  rows={2}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="ltr"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  {locale === 'ar' ? 'التصنيف' : 'Category'}
                </label>
                <select
                  value={productForm.category_id}
                  onChange={(e) => setProductForm({ ...productForm, category_id: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">{locale === 'ar' ? 'بدون تصنيف' : 'No Category'}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {locale === 'ar' ? cat.name_ar : cat.name_en || cat.name_ar}
                    </option>
                  ))}
                </select>
              </div>

              {/* Price + Original Price */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'السعر (ج.م) *' : 'Price (EGP) *'}
                  </label>
                  <input
                    type="number"
                    value={productForm.price}
                    onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                    min={0}
                    step={0.5}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'السعر قبل الخصم' : 'Original Price'}
                  </label>
                  <input
                    type="number"
                    value={productForm.original_price}
                    onChange={(e) =>
                      setProductForm({ ...productForm, original_price: e.target.value })
                    }
                    min={0}
                    step={0.5}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Prep Time + Availability */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {locale === 'ar' ? 'وقت التحضير (دقيقة)' : 'Prep Time (min)'}
                  </label>
                  <input
                    type="number"
                    value={productForm.preparation_time_min}
                    onChange={(e) =>
                      setProductForm({
                        ...productForm,
                        preparation_time_min: e.target.value,
                      })
                    }
                    min={0}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={productForm.is_available}
                      onChange={(e) =>
                        setProductForm({
                          ...productForm,
                          is_available: e.target.checked,
                        })
                      }
                      className="w-5 h-5 text-primary border-slate-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      {locale === 'ar' ? 'متاح للطلب' : 'Available'}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-100 sticky bottom-0 bg-white">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowProductModal(false)}
              >
                {locale === 'ar' ? 'إلغاء' : 'Cancel'}
              </Button>
              <Button
                className="flex-1"
                onClick={handleSaveProduct}
                disabled={!productForm.name_ar.trim() || !productForm.price || productLoading}
              >
                {productLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4 me-2" />
                    {locale === 'ar' ? 'حفظ' : 'Save'}
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
