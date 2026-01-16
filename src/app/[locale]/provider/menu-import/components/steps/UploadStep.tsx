'use client';

import { useState, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { createClient } from '@/lib/supabase/client';
import {
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Check,
  ChevronDown,
  ChevronUp,
  Package,
} from 'lucide-react';
import type { BusinessCategoryCode } from '@/lib/constants/categories';
import type { ExtractedCategory, ExtractedAddon } from '@/types/menu-import';
import { readExcelFile, processAllSheets, type MultiSheetResult } from '@/lib/utils/excel-import';

interface UploadStepProps {
  providerId: string;
  businessType: BusinessCategoryCode;
  onComplete: (categories: ExtractedCategory[], addons: ExtractedAddon[], importId: string) => void;
}

export function UploadStep({ providerId, onComplete }: UploadStepProps) {
  const locale = useLocale();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [result, setResult] = useState<MultiSheetResult | null>(null);
  const [expandedSheets, setExpandedSheets] = useState<Set<string>>(new Set());

  // Handle file upload
  const handleFileSelect = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      // Read all sheets
      const { sheets } = await readExcelFile(file);
      setFileName(file.name);

      // Process all sheets automatically
      const processed = processAllSheets(sheets);
      setResult(processed);

      // Expand first sheet by default
      if (processed.sheets.length > 0) {
        setExpandedSheets(new Set([processed.sheets[0].name]));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل في قراءة الملف');
    } finally {
      setLoading(false);
    }
  }, []);

  // Toggle sheet expansion
  const toggleSheet = useCallback((sheetName: string) => {
    setExpandedSheets((prev) => {
      const next = new Set(prev);
      if (next.has(sheetName)) {
        next.delete(sheetName);
      } else {
        next.add(sheetName);
      }
      return next;
    });
  }, []);

  // Finish and send data
  const handleFinish = useCallback(async () => {
    if (!result) return;

    setLoading(true);
    setError(null);

    try {
      const supabase = createClient();

      // Create import session
      const { data: importData, error: importError } = await supabase
        .from('menu_imports')
        .insert({
          provider_id: providerId,
          status: 'review',
          uploaded_images: [],
          extracted_data: {
            categories: result.combined.categories,
            addons: [],
            warnings: result.combined.warnings.map((w) => ({
              type: 'other',
              message: w,
              severity: 'low',
            })),
            statistics: {
              total_categories: result.combined.categories.length,
              total_products: result.combined.totalProducts,
              products_fixed_price: result.combined.categories.reduce(
                (sum, cat) => sum + cat.products.filter((p) => p.pricing_type === 'fixed').length,
                0
              ),
              products_per_unit: result.combined.categories.reduce(
                (sum, cat) =>
                  sum + cat.products.filter((p) => p.pricing_type === 'per_unit').length,
                0
              ),
              products_with_variants: result.combined.categories.reduce(
                (sum, cat) =>
                  sum + cat.products.filter((p) => p.variants && p.variants.length > 0).length,
                0
              ),
              products_need_review: result.combined.categories.reduce(
                (sum, cat) => sum + cat.products.filter((p) => p.needs_review).length,
                0
              ),
              average_confidence: 1.0,
              addons_found: 0,
            },
          },
          total_items: result.combined.totalProducts,
          reviewed_items: 0,
          products_created: 0,
          products_with_variants: 0,
          retry_count: 0,
        })
        .select()
        .single();

      if (importError || !importData) {
        throw new Error(importError?.message || 'Failed to create import session');
      }

      onComplete(result.combined.categories, [], importData.id);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : locale === 'ar'
            ? 'فشل في استيراد البيانات'
            : 'Failed to import data'
      );
    } finally {
      setLoading(false);
    }
  }, [result, providerId, locale, onComplete]);

  // Handle file drop
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  // Reset to upload new file
  const handleReset = useCallback(() => {
    setResult(null);
    setFileName('');
    setError(null);
  }, []);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {locale === 'ar' ? 'استيراد المنتجات من Excel' : 'Import Products from Excel'}
        </h2>
        <p className="text-slate-600">
          {locale === 'ar'
            ? 'ارفع ملف Excel وسيتم التعرف على البيانات تلقائياً'
            : 'Upload Excel file and data will be detected automatically'}
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Upload Area - Only shown when no result */}
      {!result && (
        <label
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          className={`block border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            loading
              ? 'border-slate-200 bg-slate-50'
              : 'border-slate-300 hover:border-primary/50 hover:bg-slate-50'
          }`}
        >
          <input
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleChange}
            disabled={loading}
            className="hidden"
          />

          {loading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
              <p className="text-slate-600">
                {locale === 'ar' ? 'جاري قراءة الملف...' : 'Reading file...'}
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-slate-700 font-medium mb-1">
                {locale === 'ar'
                  ? 'اسحب الملف هنا أو انقر للاختيار'
                  : 'Drag file here or click to select'}
              </p>
              <p className="text-sm text-slate-500">.xlsx, .xls, .csv</p>
            </div>
          )}
        </label>
      )}

      {/* Results Preview */}
      {result && (
        <div>
          {/* File Info */}
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              <span className="font-medium text-green-800">{fileName}</span>
              <span className="text-sm text-green-600">
                ({result.sheets.length} {locale === 'ar' ? 'صفحة' : 'sheets'})
              </span>
            </div>
            <button
              onClick={handleReset}
              className="text-sm text-green-700 hover:text-green-900 underline"
            >
              {locale === 'ar' ? 'تغيير الملف' : 'Change file'}
            </button>
          </div>

          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-blue-700">
                {result.combined.categories.length}
              </div>
              <div className="text-sm text-blue-600">
                {locale === 'ar' ? 'أقسام' : 'Categories'}
              </div>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-green-700">
                {result.combined.totalProducts}
              </div>
              <div className="text-sm text-green-600">
                {locale === 'ar' ? 'منتجات' : 'Products'}
              </div>
            </div>
          </div>

          {/* Sheets Preview */}
          <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
            <div className="bg-slate-50 px-4 py-2 font-medium text-slate-700 border-b border-slate-200">
              {locale === 'ar' ? 'البيانات المستخرجة' : 'Extracted Data'}
            </div>

            {result.sheets.map((sheet) => (
              <div key={sheet.name} className="border-b border-slate-100 last:border-b-0">
                {/* Sheet Header */}
                <button
                  onClick={() => toggleSheet(sheet.name)}
                  className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className="w-5 h-5 text-slate-400" />
                    <div className="text-start">
                      <div className="font-medium text-slate-900">{sheet.name}</div>
                      <div className="text-sm text-slate-500">
                        {sheet.data.categories.length} {locale === 'ar' ? 'أقسام' : 'categories'} •{' '}
                        {sheet.data.totalProducts} {locale === 'ar' ? 'منتجات' : 'products'}
                      </div>
                    </div>
                  </div>
                  {expandedSheets.has(sheet.name) ? (
                    <ChevronUp className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </button>

                {/* Sheet Content */}
                {expandedSheets.has(sheet.name) && (
                  <div className="px-4 py-2 bg-slate-50/50">
                    {sheet.data.categories.map((category, catIndex) => (
                      <div key={catIndex} className="mb-2 last:mb-0">
                        <div className="text-sm font-medium text-slate-700 mb-1">
                          {category.name_ar}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {category.products.slice(0, 6).map((product, prodIndex) => (
                            <div
                              key={prodIndex}
                              className="bg-white rounded-lg p-2 text-sm border border-slate-100"
                            >
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3 text-slate-400" />
                                <span className="truncate text-slate-700">{product.name_ar}</span>
                              </div>
                              <div className="text-primary font-medium mt-1">
                                {product.pricing_type === 'fixed' ||
                                product.pricing_type === 'per_unit'
                                  ? `${product.price} ${locale === 'ar' ? 'ج.م' : 'EGP'}${product.pricing_type === 'per_unit' && product.unit_type ? `/${product.unit_type}` : ''}`
                                  : `${product.variants?.length || 0} ${locale === 'ar' ? 'خيارات' : 'options'}`}
                              </div>
                            </div>
                          ))}
                          {category.products.length > 6 && (
                            <div className="bg-slate-100 rounded-lg p-2 text-sm flex items-center justify-center text-slate-500">
                              +{category.products.length - 6} {locale === 'ar' ? 'أخرى' : 'more'}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Warnings */}
          {result.combined.warnings.length > 0 && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-sm font-medium text-amber-800 mb-1">
                {locale === 'ar' ? 'تنبيهات:' : 'Warnings:'}
              </p>
              <ul className="text-sm text-amber-700 space-y-1">
                {result.combined.warnings.slice(0, 3).map((warning, i) => (
                  <li key={i}>• {warning}</li>
                ))}
                {result.combined.warnings.length > 3 && (
                  <li className="text-amber-600">
                    {locale === 'ar'
                      ? `و ${result.combined.warnings.length - 3} تنبيهات أخرى...`
                      : `And ${result.combined.warnings.length - 3} more...`}
                  </li>
                )}
              </ul>
            </div>
          )}

          {/* Import Button */}
          <button
            onClick={handleFinish}
            disabled={loading}
            className="w-full px-6 py-3 bg-primary text-white rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Check className="w-5 h-5" />
                {locale === 'ar' ? 'استيراد المنتجات' : 'Import Products'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
