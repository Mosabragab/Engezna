'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { ACTIVE_PROVIDER_STATUSES } from '@/types/database';
import {
  ArrowLeft,
  ArrowRight,
  Save,
  RefreshCw,
  ImagePlus,
  X,
  Package,
  DollarSign,
  Clock,
  FileText,
  Leaf,
  Flame,
  Info,
  Trash2,
  FolderOpen,
  Plus,
  Layers,
  Crop,
  AlertCircle,
} from 'lucide-react';

// Image upload constants
const IMAGE_CONFIG = {
  minDimension: 400, // Minimum 400px
  recommendedDimension: 800, // Recommended 800×800
  maxFileSize: 3 * 1024 * 1024, // 3MB
  acceptedFormats: ['image/jpeg', 'image/png', 'image/webp'],
};

type Category = {
  id: string;
  name_ar: string;
  name_en: string;
};

type ProductVariant = {
  id?: string;
  name_ar: string;
  name_en: string;
  price: number;
  original_price?: number | null;
  is_default: boolean;
  display_order: number;
  is_available: boolean;
  isNew?: boolean;
  isDeleted?: boolean;
};

// Force dynamic rendering

export default function EditProductPage() {
  const params = useParams();
  const productId = params.id as string;
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Category state
  const [categories, setCategories] = useState<Category[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryAr, setNewCategoryAr] = useState('');
  const [newCategoryEn, setNewCategoryEn] = useState('');
  const [savingCategory, setSavingCategory] = useState(false);

  // Variants state
  const [hasVariants, setHasVariants] = useState(false);
  const [variants, setVariants] = useState<ProductVariant[]>([]);
  const [showAddVariant, setShowAddVariant] = useState(false);
  const [editingVariantIndex, setEditingVariantIndex] = useState<number | null>(null);
  const [variantForm, setVariantForm] = useState({
    name_ar: '',
    name_en: '',
    price: '',
    original_price: '',
    is_default: false,
  });

  // Form state
  const [formData, setFormData] = useState({
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    price: '',
    original_price: '',
    image_url: '',
    is_available: true,
    is_vegetarian: false,
    is_spicy: false,
    preparation_time_min: '15',
    calories: '',
    category_id: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAuthAndLoadProduct();
  }, [productId]);

  const checkAuthAndLoadProduct = async () => {
    setLoading(true);
    const supabase = createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      router.push(`/${locale}/auth/login?redirect=/provider/products/${productId}`);
      return;
    }

    const { data: providerData } = await supabase
      .from('providers')
      .select('id, status')
      .eq('owner_id', user.id)
      .limit(1);

    const provider = providerData?.[0];
    if (!provider || !ACTIVE_PROVIDER_STATUSES.includes(provider.status)) {
      router.push(`/${locale}/provider`);
      return;
    }

    setProviderId(provider.id);

    // Load categories
    await loadCategories(provider.id);

    // Load product
    const { data: product, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('id', productId)
      .eq('provider_id', provider.id)
      .single();

    if (error || !product) {
      router.push(`/${locale}/provider/products`);
      return;
    }

    setFormData({
      name_ar: product.name_ar || '',
      name_en: product.name_en || '',
      description_ar: product.description_ar || '',
      description_en: product.description_en || '',
      price: product.price?.toString() || '',
      original_price: product.original_price?.toString() || '',
      image_url: product.image_url || '',
      is_available: product.is_available ?? true,
      is_vegetarian: product.is_vegetarian ?? false,
      is_spicy: product.is_spicy ?? false,
      preparation_time_min: product.preparation_time_min?.toString() || '15',
      calories: product.calories?.toString() || '',
      category_id: product.category_id || '',
    });

    if (product.image_url) {
      setImagePreview(product.image_url);
    }

    // Load variants if product has them
    if (product.has_variants) {
      setHasVariants(true);
      const { data: variantsData } = await supabase
        .from('product_variants')
        .select('*')
        .eq('product_id', productId)
        .order('display_order', { ascending: true });

      if (variantsData) {
        setVariants(
          variantsData.map((v) => ({
            id: v.id,
            name_ar: v.name_ar,
            name_en: v.name_en || '',
            price: v.price,
            original_price: v.original_price,
            is_default: v.is_default,
            display_order: v.display_order,
            is_available: v.is_available,
          }))
        );
      }
    }

    setLoading(false);
  };

  const loadCategories = async (provId: string) => {
    setLoadingCategories(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('provider_categories')
      .select('*')
      .eq('provider_id', provId)
      .order('name_ar', { ascending: true });

    if (!error && data) {
      setCategories(data);
    }
    setLoadingCategories(false);
  };

  // Variant management functions
  const handleAddVariant = () => {
    if (!variantForm.name_ar.trim() || !variantForm.price) return;

    const newVariant: ProductVariant = {
      name_ar: variantForm.name_ar.trim(),
      name_en: variantForm.name_en.trim() || variantForm.name_ar.trim(),
      price: parseFloat(variantForm.price),
      original_price: variantForm.original_price ? parseFloat(variantForm.original_price) : null,
      is_default: variants.length === 0 || variantForm.is_default,
      display_order: variants.length + 1,
      is_available: true,
      isNew: true,
    };

    // If this is set as default, unset others
    if (newVariant.is_default) {
      setVariants((prev) => prev.map((v) => ({ ...v, is_default: false })));
    }

    setVariants((prev) => [...prev, newVariant]);
    setVariantForm({ name_ar: '', name_en: '', price: '', original_price: '', is_default: false });
    setShowAddVariant(false);
  };

  const handleEditVariant = (index: number) => {
    const variant = variants[index];
    setVariantForm({
      name_ar: variant.name_ar,
      name_en: variant.name_en,
      price: variant.price.toString(),
      original_price: variant.original_price?.toString() || '',
      is_default: variant.is_default,
    });
    setEditingVariantIndex(index);
  };

  const handleUpdateVariant = () => {
    if (editingVariantIndex === null || !variantForm.name_ar.trim() || !variantForm.price) return;

    setVariants((prev) =>
      prev.map((v, i) => {
        if (i === editingVariantIndex) {
          return {
            ...v,
            name_ar: variantForm.name_ar.trim(),
            name_en: variantForm.name_en.trim() || variantForm.name_ar.trim(),
            price: parseFloat(variantForm.price),
            original_price: variantForm.original_price
              ? parseFloat(variantForm.original_price)
              : null,
            is_default: variantForm.is_default,
          };
        }
        // If the edited variant is now default, unset others
        if (variantForm.is_default) {
          return { ...v, is_default: false };
        }
        return v;
      })
    );

    setVariantForm({ name_ar: '', name_en: '', price: '', original_price: '', is_default: false });
    setEditingVariantIndex(null);
  };

  const handleDeleteVariant = (index: number) => {
    const variant = variants[index];
    if (variant.id) {
      // Mark existing variant for deletion
      setVariants((prev) => prev.map((v, i) => (i === index ? { ...v, isDeleted: true } : v)));
    } else {
      // Remove new variant completely
      setVariants((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSetDefaultVariant = (index: number) => {
    setVariants((prev) =>
      prev.map((v, i) => ({
        ...v,
        is_default: i === index,
      }))
    );
  };

  const handleCreateCategory = async () => {
    if (!newCategoryAr.trim() || !newCategoryEn.trim() || !providerId) return;

    setSavingCategory(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from('provider_categories')
      .insert({
        provider_id: providerId,
        name_ar: newCategoryAr.trim(),
        name_en: newCategoryEn.trim(),
      })
      .select()
      .single();

    if (!error && data) {
      setCategories((prev) => [...prev, data]);
      setFormData((prev) => ({ ...prev, category_id: data.id }));
      setNewCategoryAr('');
      setNewCategoryEn('');
      setShowNewCategory(false);
    }
    setSavingCategory(false);
  };

  // Crop image to square (center crop)
  const cropToSquare = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = Math.min(img.width, img.height);
        const targetSize = Math.min(size, IMAGE_CONFIG.recommendedDimension);

        canvas.width = targetSize;
        canvas.height = targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        // Calculate center crop position
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;

        // Draw cropped and resized image
        ctx.drawImage(img, sx, sy, size, size, 0, 0, targetSize, targetSize);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Could not create blob'));
            }
          },
          'image/jpeg',
          0.9
        );
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  // Validate image dimensions
  const validateImageDimensions = (file: File): Promise<{ width: number; height: number }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => reject(new Error('Could not load image'));
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!IMAGE_CONFIG.acceptedFormats.includes(file.type)) {
      setErrors((prev) => ({
        ...prev,
        image:
          locale === 'ar'
            ? 'صيغة الصورة غير مدعومة. استخدم JPEG, PNG, أو WebP'
            : 'Image format not supported. Use JPEG, PNG, or WebP',
      }));
      return;
    }

    // Validate file size
    if (file.size > IMAGE_CONFIG.maxFileSize) {
      setErrors((prev) => ({
        ...prev,
        image:
          locale === 'ar'
            ? `حجم الصورة يجب أن يكون أقل من ${IMAGE_CONFIG.maxFileSize / 1024 / 1024}MB`
            : `Image must be less than ${IMAGE_CONFIG.maxFileSize / 1024 / 1024}MB`,
      }));
      return;
    }

    setUploading(true);
    setErrors((prev) => ({ ...prev, image: '' }));

    try {
      // Validate dimensions
      const dimensions = await validateImageDimensions(file);

      if (
        dimensions.width < IMAGE_CONFIG.minDimension ||
        dimensions.height < IMAGE_CONFIG.minDimension
      ) {
        setErrors((prev) => ({
          ...prev,
          image:
            locale === 'ar'
              ? `أبعاد الصورة صغيرة جداً. الحد الأدنى ${IMAGE_CONFIG.minDimension}×${IMAGE_CONFIG.minDimension} بكسل`
              : `Image dimensions too small. Minimum ${IMAGE_CONFIG.minDimension}×${IMAGE_CONFIG.minDimension}px`,
        }));
        setUploading(false);
        return;
      }

      // Crop to square
      const croppedBlob = await cropToSquare(file);

      const supabase = createClient();
      const fileName = `products/${providerId}/${Date.now()}.jpg`;

      const { error } = await supabase.storage
        .from('public')
        .upload(fileName, croppedBlob, { upsert: true, contentType: 'image/jpeg' });

      if (error) {
        setErrors((prev) => ({
          ...prev,
          image: locale === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image',
        }));
        return;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('public').getPublicUrl(fileName);

      setFormData((prev) => ({ ...prev, image_url: publicUrl }));
      setImagePreview(publicUrl);
    } catch {
      setErrors((prev) => ({
        ...prev,
        image: locale === 'ar' ? 'فشل رفع الصورة' : 'Failed to upload image',
      }));
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setFormData((prev) => ({ ...prev, image_url: '' }));
    setImagePreview(null);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name_ar.trim()) {
      newErrors.name_ar = locale === 'ar' ? 'الاسم بالعربية مطلوب' : 'Arabic name is required';
    }
    if (!formData.name_en.trim()) {
      newErrors.name_en = locale === 'ar' ? 'الاسم بالإنجليزية مطلوب' : 'English name is required';
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      newErrors.price =
        locale === 'ar'
          ? 'السعر مطلوب ويجب أن يكون أكبر من 0'
          : 'Price is required and must be greater than 0';
    }
    if (
      formData.original_price &&
      parseFloat(formData.original_price) <= parseFloat(formData.price)
    ) {
      newErrors.original_price =
        locale === 'ar'
          ? 'السعر الأصلي يجب أن يكون أكبر من السعر الحالي'
          : 'Original price must be greater than current price';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !providerId) return;

    setSaving(true);
    const supabase = createClient();

    // Get active variants (not deleted)
    const activeVariants = variants.filter((v) => !v.isDeleted);

    // Build product data - only include category_id if it's set
    const productData: Record<string, any> = {
      name_ar: formData.name_ar.trim(),
      name_en: formData.name_en.trim(),
      description_ar: formData.description_ar.trim() || null,
      description_en: formData.description_en.trim() || null,
      price:
        hasVariants && activeVariants.length > 0
          ? activeVariants.find((v) => v.is_default)?.price || activeVariants[0].price
          : parseFloat(formData.price),
      original_price: formData.original_price ? parseFloat(formData.original_price) : null,
      image_url: formData.image_url || null,
      is_available: formData.is_available,
      is_vegetarian: formData.is_vegetarian,
      is_spicy: formData.is_spicy,
      preparation_time_min: parseInt(formData.preparation_time_min) || 15,
      calories: formData.calories ? parseInt(formData.calories) : null,
      has_variants: hasVariants && activeVariants.length > 0,
      updated_at: new Date().toISOString(),
    };

    // Only add category_id if a category is selected
    if (formData.category_id) {
      productData.category_id = formData.category_id;
    }

    const { error } = await supabase.from('menu_items').update(productData).eq('id', productId);

    if (error) {
      console.error('[EditProduct] Update error:', error);
      // If category_id column doesn't exist, retry without it
      if (error.message?.includes('category_id')) {
        delete productData.category_id;
        const { error: retryError } = await supabase
          .from('menu_items')
          .update(productData)
          .eq('id', productId);

        if (retryError) {
          console.error('[EditProduct] Retry error:', retryError);
          setErrors((prev) => ({
            ...prev,
            submit:
              locale === 'ar'
                ? `فشل تحديث المنتج: ${retryError.message}`
                : `Failed to update product: ${retryError.message}`,
          }));
          setSaving(false);
          return;
        }
      } else {
        setErrors((prev) => ({
          ...prev,
          submit:
            locale === 'ar'
              ? `فشل تحديث المنتج: ${error.message}`
              : `Failed to update product: ${error.message}`,
        }));
        setSaving(false);
        return;
      }
    }

    // Handle variants
    if (hasVariants) {
      // Delete variants marked for deletion
      const variantsToDelete = variants.filter((v) => v.isDeleted && v.id);
      for (const variant of variantsToDelete) {
        await supabase.from('product_variants').delete().eq('id', variant.id);
      }

      // Update existing variants
      const variantsToUpdate = activeVariants.filter((v) => v.id && !v.isNew);
      for (const variant of variantsToUpdate) {
        await supabase
          .from('product_variants')
          .update({
            name_ar: variant.name_ar,
            name_en: variant.name_en,
            price: variant.price,
            original_price: variant.original_price,
            is_default: variant.is_default,
            display_order: variant.display_order,
            is_available: variant.is_available,
            updated_at: new Date().toISOString(),
          })
          .eq('id', variant.id);
      }

      // Insert new variants
      const variantsToInsert = activeVariants.filter((v) => v.isNew);
      if (variantsToInsert.length > 0) {
        await supabase.from('product_variants').insert(
          variantsToInsert.map((v, index) => ({
            product_id: productId,
            name_ar: v.name_ar,
            name_en: v.name_en,
            price: v.price,
            original_price: v.original_price,
            is_default: v.is_default,
            display_order: variants.length + index + 1,
            is_available: v.is_available,
            variant_type: 'option',
          }))
        );
      }
    } else {
      // If has_variants is false, delete all variants
      await supabase.from('product_variants').delete().eq('product_id', productId);
    }

    router.push(`/${locale}/provider/products`);
  };

  const handleDelete = async () => {
    setDeleting(true);
    const supabase = createClient();

    const { error } = await supabase.from('menu_items').delete().eq('id', productId);

    if (error) {
      setErrors((prev) => ({
        ...prev,
        submit: locale === 'ar' ? 'فشل حذف المنتج' : 'Failed to delete product',
      }));
      setDeleting(false);
      return;
    }

    router.push(`/${locale}/provider/products`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-slate-500">{locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link
              href={`/${locale}/provider/products`}
              className="flex items-center gap-2 text-slate-500 hover:text-slate-900"
            >
              {isRTL ? <ArrowRight className="w-5 h-5" /> : <ArrowLeft className="w-5 h-5" />}
              <span>{locale === 'ar' ? 'المنتجات' : 'Products'}</span>
            </Link>
            <h1 className="text-xl font-bold text-primary">
              {locale === 'ar' ? 'تعديل المنتج' : 'Edit Product'}
            </h1>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              className="text-red-400 hover:text-red-300 hover:bg-red-500/20"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <Card className="bg-white border-slate-200 max-w-md w-full">
            <CardContent className="pt-6">
              <div className="text-center">
                <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-2 text-slate-900">
                  {locale === 'ar' ? 'حذف المنتج؟' : 'Delete Product?'}
                </h3>
                <p className="text-slate-500 mb-6">
                  {locale === 'ar'
                    ? 'هل أنت متأكد من حذف هذا المنتج؟ لا يمكن التراجع عن هذا الإجراء.'
                    : 'Are you sure you want to delete this product? This action cannot be undone.'}
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 border-slate-300"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDelete}
                    disabled={deleting}
                  >
                    {deleting ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : locale === 'ar' ? (
                      'حذف'
                    ) : (
                      'Delete'
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-6">
          {/* Product Image */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <ImagePlus className="w-5 h-5" />
                {locale === 'ar' ? 'صورة المنتج' : 'Product Image'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Image Guidelines */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <p className="font-medium mb-1">
                      {locale === 'ar' ? 'معايير الصورة المثالية:' : 'Ideal image standards:'}
                    </p>
                    <ul className="space-y-1 text-blue-600">
                      <li className="flex items-center gap-1">
                        <Crop className="w-3 h-3" />
                        {locale === 'ar'
                          ? `نسبة 1:1 (مربعة) - يتم القص تلقائياً`
                          : '1:1 ratio (square) - auto-cropped'}
                      </li>
                      <li>
                        {locale === 'ar'
                          ? `الأبعاد المثالية: ${IMAGE_CONFIG.recommendedDimension}×${IMAGE_CONFIG.recommendedDimension} بكسل`
                          : `Recommended: ${IMAGE_CONFIG.recommendedDimension}×${IMAGE_CONFIG.recommendedDimension}px`}
                      </li>
                      <li>
                        {locale === 'ar'
                          ? `الحد الأدنى: ${IMAGE_CONFIG.minDimension}×${IMAGE_CONFIG.minDimension} بكسل`
                          : `Minimum: ${IMAGE_CONFIG.minDimension}×${IMAGE_CONFIG.minDimension}px`}
                      </li>
                      <li>
                        {locale === 'ar'
                          ? `الحد الأقصى: ${IMAGE_CONFIG.maxFileSize / 1024 / 1024}MB`
                          : `Max size: ${IMAGE_CONFIG.maxFileSize / 1024 / 1024}MB`}
                      </li>
                      <li>
                        {locale === 'ar' ? 'الصيغ: JPEG, PNG, WebP' : 'Formats: JPEG, PNG, WebP'}
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Image Preview - Square */}
              {imagePreview ? (
                <div className="relative max-w-xs mx-auto">
                  <div className="aspect-square rounded-xl overflow-hidden border-2 border-slate-200 shadow-sm">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  </div>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2 rounded-full w-8 h-8 p-0"
                    onClick={removeImage}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                    <Crop className="w-3 h-3" />
                    1:1
                  </div>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full aspect-square max-w-xs mx-auto border-2 border-dashed border-slate-300 rounded-xl cursor-pointer hover:border-primary transition-colors bg-slate-50">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={uploading}
                  />
                  {uploading ? (
                    <div className="text-center">
                      <RefreshCw className="w-10 h-10 text-primary animate-spin mx-auto mb-2" />
                      <span className="text-sm text-slate-500">
                        {locale === 'ar' ? 'جاري معالجة الصورة...' : 'Processing image...'}
                      </span>
                    </div>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mb-3">
                        <ImagePlus className="w-8 h-8 text-slate-400" />
                      </div>
                      <span className="text-sm font-medium text-slate-600">
                        {locale === 'ar' ? 'اضغط لرفع صورة' : 'Click to upload image'}
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        {locale === 'ar'
                          ? 'سيتم قص الصورة تلقائياً لتصبح مربعة'
                          : 'Image will be auto-cropped to square'}
                      </span>
                    </>
                  )}
                </label>
              )}

              {/* Error Message */}
              {errors.image && (
                <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errors.image}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Product Category */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <FolderOpen className="w-5 h-5" />
                {locale === 'ar' ? 'تصنيف المنتج' : 'Product Category'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {!showNewCategory ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      {locale === 'ar' ? 'اختر التصنيف' : 'Select Category'}
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={formData.category_id}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, category_id: e.target.value }))
                        }
                        className="flex-1 bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                        disabled={loadingCategories}
                      >
                        <option value="">
                          {loadingCategories
                            ? locale === 'ar'
                              ? 'جاري التحميل...'
                              : 'Loading...'
                            : locale === 'ar'
                              ? 'بدون تصنيف'
                              : 'No Category'}
                        </option>
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {locale === 'ar' ? cat.name_ar : cat.name_en}
                          </option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowNewCategory(true)}
                        className="border-slate-300 text-slate-700 hover:bg-slate-100"
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    {categories.length === 0 && !loadingCategories && (
                      <p className="text-xs text-slate-500 mt-2">
                        {locale === 'ar'
                          ? 'لا توجد تصنيفات بعد. أضف تصنيفًا جديدًا للبدء.'
                          : 'No categories yet. Add a new category to get started.'}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4 p-4 bg-slate-100 rounded-lg">
                  <h4 className="text-sm font-medium text-slate-900">
                    {locale === 'ar' ? 'إضافة تصنيف جديد' : 'Add New Category'}
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      {locale === 'ar' ? 'اسم التصنيف (عربي)' : 'Category Name (Arabic)'} *
                    </label>
                    <input
                      type="text"
                      value={newCategoryAr}
                      onChange={(e) => setNewCategoryAr(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder={locale === 'ar' ? 'مثال: المشروبات' : 'e.g., المشروبات'}
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">
                      {locale === 'ar' ? 'اسم التصنيف (إنجليزي)' : 'Category Name (English)'} *
                    </label>
                    <input
                      type="text"
                      value={newCategoryEn}
                      onChange={(e) => setNewCategoryEn(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-lg px-4 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                      placeholder="e.g., Beverages"
                      dir="ltr"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowNewCategory(false);
                        setNewCategoryAr('');
                        setNewCategoryEn('');
                      }}
                      className="flex-1 border-slate-300 text-slate-700 hover:bg-slate-200"
                    >
                      {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                    </Button>
                    <Button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={savingCategory || !newCategoryAr.trim() || !newCategoryEn.trim()}
                      className="flex-1"
                    >
                      {savingCategory
                        ? locale === 'ar'
                          ? 'جاري الحفظ...'
                          : 'Saving...'
                        : locale === 'ar'
                          ? 'إضافة'
                          : 'Add'}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Basic Info */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <Package className="w-5 h-5" />
                {locale === 'ar' ? 'معلومات المنتج' : 'Product Info'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Arabic Name */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  {locale === 'ar' ? 'اسم المنتج (عربي)' : 'Product Name (Arabic)'} *
                </label>
                <input
                  type="text"
                  value={formData.name_ar}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name_ar: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="rtl"
                />
                {errors.name_ar && <p className="text-red-400 text-sm mt-1">{errors.name_ar}</p>}
              </div>

              {/* English Name */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  {locale === 'ar' ? 'اسم المنتج (إنجليزي)' : 'Product Name (English)'} *
                </label>
                <input
                  type="text"
                  value={formData.name_en}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name_en: e.target.value }))}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  dir="ltr"
                />
                {errors.name_en && <p className="text-red-400 text-sm mt-1">{errors.name_en}</p>}
              </div>

              {/* Arabic Description */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  {locale === 'ar' ? 'الوصف (عربي)' : 'Description (Arabic)'}
                </label>
                <textarea
                  value={formData.description_ar}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description_ar: e.target.value }))
                  }
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  dir="rtl"
                />
              </div>

              {/* English Description */}
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-2">
                  {locale === 'ar' ? 'الوصف (إنجليزي)' : 'Description (English)'}
                </label>
                <textarea
                  value={formData.description_en}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, description_en: e.target.value }))
                  }
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary resize-none"
                  dir="ltr"
                />
              </div>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                {locale === 'ar' ? 'التسعير' : 'Pricing'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    {locale === 'ar' ? 'السعر (ج.م)' : 'Price (EGP)'} *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {errors.price && <p className="text-red-400 text-sm mt-1">{errors.price}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    {locale === 'ar' ? 'السعر الأصلي' : 'Original Price'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.original_price}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, original_price: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  {errors.original_price && (
                    <p className="text-red-400 text-sm mt-1">{errors.original_price}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Variants */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5" />
                  {locale === 'ar'
                    ? 'خيارات المنتج (أحجام/أوزان)'
                    : 'Product Variants (Sizes/Weights)'}
                </div>
                <button
                  type="button"
                  onClick={() => setHasVariants(!hasVariants)}
                  dir="ltr"
                  className={`w-12 h-6 rounded-full transition-colors relative ${
                    hasVariants ? 'bg-primary' : 'bg-slate-300'
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                      hasVariants ? 'left-[1.375rem]' : 'left-0.5'
                    }`}
                  />
                </button>
              </CardTitle>
            </CardHeader>
            {hasVariants && (
              <CardContent className="space-y-4">
                {/* Variants List */}
                {variants.filter((v) => !v.isDeleted).length > 0 ? (
                  <div className="space-y-2">
                    {variants.map((variant, index) => {
                      if (variant.isDeleted) return null;
                      return (
                        <div
                          key={variant.id || `new-${index}`}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            variant.is_default
                              ? 'border-primary bg-primary/5'
                              : 'border-slate-200 bg-slate-50'
                          }`}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-900">{variant.name_ar}</span>
                              {variant.is_default && (
                                <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full">
                                  {locale === 'ar' ? 'افتراضي' : 'Default'}
                                </span>
                              )}
                              {variant.isNew && (
                                <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                                  {locale === 'ar' ? 'جديد' : 'New'}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-slate-500">
                              {variant.price} {locale === 'ar' ? 'ج.م' : 'EGP'}
                              {variant.original_price && (
                                <span className="line-through mx-2 text-slate-400">
                                  {variant.original_price}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            {!variant.is_default && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSetDefaultVariant(index)}
                                className="text-slate-600 hover:text-primary hover:bg-primary/10"
                              >
                                {locale === 'ar' ? 'تعيين افتراضي' : 'Set Default'}
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditVariant(index)}
                              className="text-slate-600 hover:text-primary hover:bg-primary/10"
                            >
                              {locale === 'ar' ? 'تعديل' : 'Edit'}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteVariant(index)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <Layers className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    <p>{locale === 'ar' ? 'لا توجد خيارات بعد' : 'No variants yet'}</p>
                  </div>
                )}

                {/* Add/Edit Variant Form */}
                {(showAddVariant || editingVariantIndex !== null) && (
                  <div className="p-4 bg-slate-100 rounded-lg space-y-4">
                    <h4 className="font-medium text-slate-900">
                      {editingVariantIndex !== null
                        ? locale === 'ar'
                          ? 'تعديل الخيار'
                          : 'Edit Variant'
                        : locale === 'ar'
                          ? 'إضافة خيار جديد'
                          : 'Add New Variant'}
                    </h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          {locale === 'ar' ? 'الاسم (عربي)' : 'Name (Arabic)'} *
                        </label>
                        <input
                          type="text"
                          value={variantForm.name_ar}
                          onChange={(e) =>
                            setVariantForm((prev) => ({ ...prev, name_ar: e.target.value }))
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder={locale === 'ar' ? 'مثال: صغير' : 'e.g., صغير'}
                          dir="rtl"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          {locale === 'ar' ? 'الاسم (إنجليزي)' : 'Name (English)'}
                        </label>
                        <input
                          type="text"
                          value={variantForm.name_en}
                          onChange={(e) =>
                            setVariantForm((prev) => ({ ...prev, name_en: e.target.value }))
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                          placeholder="e.g., Small"
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          {locale === 'ar' ? 'السعر (ج.م)' : 'Price (EGP)'} *
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={variantForm.price}
                          onChange={(e) =>
                            setVariantForm((prev) => ({ ...prev, price: e.target.value }))
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">
                          {locale === 'ar' ? 'السعر الأصلي' : 'Original Price'}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={variantForm.original_price}
                          onChange={(e) =>
                            setVariantForm((prev) => ({ ...prev, original_price: e.target.value }))
                          }
                          className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={variantForm.is_default}
                        onChange={(e) =>
                          setVariantForm((prev) => ({ ...prev, is_default: e.target.checked }))
                        }
                        className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-slate-600">
                        {locale === 'ar' ? 'تعيين كخيار افتراضي' : 'Set as default option'}
                      </span>
                    </label>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setShowAddVariant(false);
                          setEditingVariantIndex(null);
                          setVariantForm({
                            name_ar: '',
                            name_en: '',
                            price: '',
                            original_price: '',
                            is_default: false,
                          });
                        }}
                        className="flex-1 border-slate-300"
                      >
                        {locale === 'ar' ? 'إلغاء' : 'Cancel'}
                      </Button>
                      <Button
                        type="button"
                        onClick={
                          editingVariantIndex !== null ? handleUpdateVariant : handleAddVariant
                        }
                        disabled={!variantForm.name_ar.trim() || !variantForm.price}
                        className="flex-1"
                      >
                        {editingVariantIndex !== null
                          ? locale === 'ar'
                            ? 'تحديث'
                            : 'Update'
                          : locale === 'ar'
                            ? 'إضافة'
                            : 'Add'}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Add Variant Button */}
                {!showAddVariant && editingVariantIndex === null && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowAddVariant(true)}
                    className="w-full border-dashed border-slate-300 text-slate-600 hover:border-primary hover:text-primary"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    {locale === 'ar' ? 'إضافة خيار جديد' : 'Add New Variant'}
                  </Button>
                )}
              </CardContent>
            )}
          </Card>

          {/* Additional Info */}
          <Card className="bg-white border-slate-200">
            <CardHeader>
              <CardTitle className="text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                {locale === 'ar' ? 'معلومات إضافية' : 'Additional Info'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {locale === 'ar' ? 'وقت التحضير (دقيقة)' : 'Prep Time (min)'}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.preparation_time_min}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, preparation_time_min: e.target.value }))
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-600 mb-2">
                    {locale === 'ar' ? 'السعرات الحرارية' : 'Calories'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.calories}
                    onChange={(e) => setFormData((prev) => ({ ...prev, calories: e.target.value }))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Leaf className="w-5 h-5 text-green-500" />
                    <span className="text-slate-700">
                      {locale === 'ar' ? 'نباتي' : 'Vegetarian'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, is_vegetarian: !prev.is_vegetarian }))
                    }
                    dir="ltr"
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      formData.is_vegetarian ? 'bg-green-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                        formData.is_vegetarian ? 'left-[1.375rem]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-red-500" />
                    <span className="text-slate-700">{locale === 'ar' ? 'حار' : 'Spicy'}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, is_spicy: !prev.is_spicy }))}
                    dir="ltr"
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      formData.is_spicy ? 'bg-red-500' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                        formData.is_spicy ? 'left-[1.375rem]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </label>

                <label className="flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    <span className="text-slate-700">
                      {locale === 'ar' ? 'متاح للطلب' : 'Available for order'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({ ...prev, is_available: !prev.is_available }))
                    }
                    dir="ltr"
                    className={`w-12 h-6 rounded-full transition-colors relative ${
                      formData.is_available ? 'bg-primary' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform absolute top-0.5 ${
                        formData.is_available ? 'left-[1.375rem]' : 'left-0.5'
                      }`}
                    />
                  </button>
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Submit Error */}
          {errors.submit && (
            <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
              <p className="text-red-400 text-center">{errors.submit}</p>
            </div>
          )}

          {/* Submit Button */}
          <Button type="submit" size="lg" className="w-full" disabled={saving}>
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                {locale === 'ar' ? 'جاري الحفظ...' : 'Saving...'}
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                {locale === 'ar' ? 'حفظ التغييرات' : 'Save Changes'}
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
