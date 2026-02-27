'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/client';
import { getCachedAllGovernorates } from '@/lib/cache/cached-queries';
import type {
  PermissionConstraints,
  GeographicConstraint,
  TimeConstraint,
} from '@/types/permissions';
import {
  MapPin,
  Clock,
  DollarSign,
  User,
  Users,
  CheckCircle2,
  AlertTriangle,
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  Settings,
  Shield,
} from 'lucide-react';

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
}

interface City {
  id: string;
  name_ar: string;
  name_en: string;
  governorate_id: string;
}

interface District {
  id: string;
  name_ar: string;
  name_en: string;
  city_id: string | null;
  governorate_id: string;
}

interface ConstraintsEditorProps {
  constraints: PermissionConstraints;
  onChange: (constraints: PermissionConstraints) => void;
  permissionCode?: string;
  resourceCode?: string;
  actionCode?: string;
}

const DAYS_OF_WEEK = [
  { value: 0, ar: 'الأحد', en: 'Sunday' },
  { value: 1, ar: 'الاثنين', en: 'Monday' },
  { value: 2, ar: 'الثلاثاء', en: 'Tuesday' },
  { value: 3, ar: 'الأربعاء', en: 'Wednesday' },
  { value: 4, ar: 'الخميس', en: 'Thursday' },
  { value: 5, ar: 'الجمعة', en: 'Friday' },
  { value: 6, ar: 'السبت', en: 'Saturday' },
];

export function ConstraintsEditor({
  constraints,
  onChange,
  permissionCode,
  resourceCode,
  actionCode,
}: ConstraintsEditorProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['geographic']));

  // Geography data
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(true);

  const loadGeoData = useCallback(async () => {
    const supabase = createClient();
    setLoadingGeo(true);

    const [govData, cityRes, distRes] = await Promise.all([
      getCachedAllGovernorates(),
      supabase.from('cities').select('id, name_ar, name_en, governorate_id').order('name_ar'),
      supabase
        .from('districts')
        .select('id, name_ar, name_en, city_id, governorate_id')
        .order('name_ar'),
    ]);

    setGovernorates(govData);
    if (cityRes.data) setCities(cityRes.data);
    if (distRes.data) setDistricts(distRes.data);
    setLoadingGeo(false);
  }, []);

  useEffect(() => {
    loadGeoData();
  }, [loadGeoData]);

  function toggleSection(section: string) {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  }

  function updateConstraint<K extends keyof PermissionConstraints>(
    key: K,
    value: PermissionConstraints[K] | undefined
  ) {
    const newConstraints = { ...constraints };
    if (value === undefined || value === null || (Array.isArray(value) && value.length === 0)) {
      delete newConstraints[key];
    } else {
      newConstraints[key] = value;
    }
    onChange(newConstraints);
  }

  // Geographic handlers
  function toggleGovernorate(govId: string) {
    const current = constraints.geographic?.governorates || [];
    const newGovs = current.includes(govId)
      ? current.filter((id) => id !== govId)
      : [...current, govId];

    updateConstraint('geographic', {
      ...constraints.geographic,
      governorates: newGovs.length > 0 ? newGovs : undefined,
    } as GeographicConstraint);
  }

  function toggleCity(cityId: string) {
    const current = constraints.geographic?.cities || [];
    const newCities = current.includes(cityId)
      ? current.filter((id) => id !== cityId)
      : [...current, cityId];

    updateConstraint('geographic', {
      ...constraints.geographic,
      cities: newCities.length > 0 ? newCities : undefined,
    } as GeographicConstraint);
  }

  // Time restriction handlers
  function updateTimeRestriction(field: keyof TimeConstraint, value: string | number[]) {
    const current = constraints.time_restriction || {
      start: '09:00',
      end: '22:00',
      days: [0, 1, 2, 3, 4, 5, 6],
    };
    updateConstraint('time_restriction', {
      ...current,
      [field]: value,
    });
  }

  function toggleDay(day: number) {
    const current = constraints.time_restriction?.days || [0, 1, 2, 3, 4, 5, 6];
    const newDays = current.includes(day)
      ? current.filter((d) => d !== day)
      : [...current, day].sort();
    updateTimeRestriction('days', newDays);
  }

  // Check which constraint types are relevant for this permission
  const showGeographic =
    resourceCode &&
    ['providers', 'orders', 'customers', 'support', 'locations'].includes(resourceCode);
  const showAmountLimit = actionCode && ['refund', 'settle', 'approve'].includes(actionCode);
  const showOwnOnly = actionCode && ['update', 'delete', 'assign'].includes(actionCode);
  const showAssignedOnly = actionCode && ['view', 'update', 'assign'].includes(actionCode);
  const showRequiresApproval =
    actionCode && ['delete', 'refund', 'ban', 'settle', 'approve', 'reject'].includes(actionCode);
  const showTimeRestriction = true; // Available for all
  const showFields = resourceCode && ['customers', 'providers'].includes(resourceCode);

  const hasActiveConstraints = Object.keys(constraints).length > 0;

  return (
    <div className="space-y-3">
      {/* Summary */}
      {hasActiveConstraints && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-amber-700">
            <span className="font-medium">
              {locale === 'ar' ? 'هذه الصلاحية مقيدة' : 'This permission has constraints'}
            </span>
            <ul className="mt-1 list-disc list-inside text-xs space-y-0.5">
              {constraints.geographic && (
                <li>{locale === 'ar' ? 'قيود جغرافية' : 'Geographic restrictions'}</li>
              )}
              {constraints.amount_limit && (
                <li>
                  {locale === 'ar'
                    ? `حد أقصى: ${constraints.amount_limit} ج.م`
                    : `Max amount: ${constraints.amount_limit} EGP`}
                </li>
              )}
              {constraints.requires_approval && (
                <li>{locale === 'ar' ? 'يحتاج موافقة' : 'Requires approval'}</li>
              )}
              {constraints.time_restriction && (
                <li>{locale === 'ar' ? 'مقيد بالوقت' : 'Time restricted'}</li>
              )}
              {constraints.own_only && (
                <li>{locale === 'ar' ? 'ما أنشأه فقط' : 'Own items only'}</li>
              )}
              {constraints.assigned_only && (
                <li>{locale === 'ar' ? 'المعين له فقط' : 'Assigned only'}</li>
              )}
            </ul>
          </div>
        </div>
      )}

      {/* Geographic Constraints */}
      {showGeographic && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('geographic')}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-700">
                {locale === 'ar' ? 'القيود الجغرافية' : 'Geographic Constraints'}
              </span>
              {constraints.geographic && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">
                  {locale === 'ar' ? 'مفعل' : 'Active'}
                </span>
              )}
            </div>
            {expandedSections.has('geographic') ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedSections.has('geographic') && (
            <div className="p-3 border-t border-slate-200 bg-white">
              {loadingGeo ? (
                <div className="text-center py-4 text-slate-500">
                  {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">
                    {locale === 'ar'
                      ? 'اختر المحافظات والمدن المسموح بها. اتركها فارغة للوصول الكامل.'
                      : 'Select allowed governorates and cities. Leave empty for full access.'}
                  </p>

                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {governorates.map((gov) => {
                      const isSelected = constraints.geographic?.governorates?.includes(gov.id);
                      const govCities = cities.filter((c) => c.governorate_id === gov.id);

                      return (
                        <div key={gov.id} className="space-y-1">
                          <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={isSelected || false}
                              onChange={() => toggleGovernorate(gov.id)}
                              className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-slate-700">
                              {locale === 'ar' ? gov.name_ar : gov.name_en}
                            </span>
                          </label>

                          {isSelected && govCities.length > 0 && (
                            <div className={`${isRTL ? 'mr-6' : 'ml-6'} space-y-1`}>
                              {govCities.map((city) => {
                                const isCitySelected = constraints.geographic?.cities?.includes(
                                  city.id
                                );
                                return (
                                  <label
                                    key={city.id}
                                    className="flex items-center gap-2 p-1.5 rounded hover:bg-slate-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isCitySelected || false}
                                      onChange={() => toggleCity(city.id)}
                                      className="w-3.5 h-3.5 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                                    />
                                    <span className="text-xs text-slate-600">
                                      {locale === 'ar' ? city.name_ar : city.name_en}
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {constraints.geographic && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateConstraint('geographic', undefined)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <X className="w-3 h-3 me-1" />
                      {locale === 'ar' ? 'إزالة القيود الجغرافية' : 'Remove geographic constraints'}
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Amount Limit */}
      {showAmountLimit && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('amount')}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-700">
                {locale === 'ar' ? 'الحد المالي' : 'Amount Limit'}
              </span>
              {constraints.amount_limit && (
                <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                  {constraints.amount_limit} {locale === 'ar' ? 'ج.م' : 'EGP'}
                </span>
              )}
            </div>
            {expandedSections.has('amount') ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedSections.has('amount') && (
            <div className="p-3 border-t border-slate-200 bg-white space-y-3">
              <p className="text-xs text-slate-500">
                {locale === 'ar'
                  ? 'الحد الأقصى للمبلغ المسموح به لهذا الإجراء'
                  : 'Maximum amount allowed for this action'}
              </p>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={constraints.amount_limit || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined;
                    updateConstraint('amount_limit', val);
                  }}
                  placeholder={locale === 'ar' ? 'مثال: 500' : 'e.g., 500'}
                  className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-500">{locale === 'ar' ? 'ج.م' : 'EGP'}</span>
              </div>

              <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={constraints.requires_approval || false}
                  onChange={(e) =>
                    updateConstraint('requires_approval', e.target.checked || undefined)
                  }
                  className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">
                  {locale === 'ar'
                    ? 'يحتاج موافقة إذا تجاوز الحد'
                    : 'Requires approval if exceeds limit'}
                </span>
              </label>

              {constraints.requires_approval && (
                <div>
                  <label className="block text-xs text-slate-600 mb-1">
                    {locale === 'ar' ? 'حد الموافقة (اختياري)' : 'Approval threshold (optional)'}
                  </label>
                  <input
                    type="number"
                    value={constraints.approval_threshold || ''}
                    onChange={(e) => {
                      const val = e.target.value ? Number(e.target.value) : undefined;
                      updateConstraint('approval_threshold', val);
                    }}
                    placeholder={locale === 'ar' ? 'مثال: 200' : 'e.g., 200'}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {locale === 'ar'
                      ? 'طلب موافقة إذا تجاوز هذا المبلغ'
                      : 'Request approval if amount exceeds this value'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ownership Constraints */}
      {(showOwnOnly || showAssignedOnly) && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('ownership')}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-700">
                {locale === 'ar' ? 'قيود الملكية' : 'Ownership Constraints'}
              </span>
              {(constraints.own_only || constraints.assigned_only) && (
                <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                  {locale === 'ar' ? 'مفعل' : 'Active'}
                </span>
              )}
            </div>
            {expandedSections.has('ownership') ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedSections.has('ownership') && (
            <div className="p-3 border-t border-slate-200 bg-white space-y-3">
              {showOwnOnly && (
                <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={constraints.own_only || false}
                    onChange={(e) => updateConstraint('own_only', e.target.checked || undefined)}
                    className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm text-slate-700">
                      {locale === 'ar' ? 'ما أنشأه فقط' : 'Own items only'}
                    </span>
                    <p className="text-xs text-slate-500">
                      {locale === 'ar'
                        ? 'المشرف يمكنه فقط التعامل مع العناصر التي أنشأها'
                        : 'Supervisor can only manage items they created'}
                    </p>
                  </div>
                </label>
              )}

              {showAssignedOnly && (
                <label className="flex items-center gap-2 p-2 rounded hover:bg-slate-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={constraints.assigned_only || false}
                    onChange={(e) =>
                      updateConstraint('assigned_only', e.target.checked || undefined)
                    }
                    className="w-4 h-4 text-purple-600 border-slate-300 rounded focus:ring-purple-500"
                  />
                  <div>
                    <span className="text-sm text-slate-700">
                      {locale === 'ar' ? 'المعين له فقط' : 'Assigned only'}
                    </span>
                    <p className="text-xs text-slate-500">
                      {locale === 'ar'
                        ? 'المشرف يمكنه فقط التعامل مع العناصر المعينة له'
                        : 'Supervisor can only manage items assigned to them'}
                    </p>
                  </div>
                </label>
              )}
            </div>
          )}
        </div>
      )}

      {/* Time Restriction */}
      {showTimeRestriction && (
        <div className="border border-slate-200 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('time')}
            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="font-medium text-slate-700">
                {locale === 'ar' ? 'قيود الوقت' : 'Time Restrictions'}
              </span>
              {constraints.time_restriction && (
                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
                  {constraints.time_restriction.start} - {constraints.time_restriction.end}
                </span>
              )}
            </div>
            {expandedSections.has('time') ? (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {expandedSections.has('time') && (
            <div className="p-3 border-t border-slate-200 bg-white space-y-3">
              <p className="text-xs text-slate-500">
                {locale === 'ar'
                  ? 'تحديد أوقات محددة يمكن فيها استخدام هذه الصلاحية'
                  : 'Set specific times when this permission can be used'}
              </p>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!!constraints.time_restriction}
                  onChange={(e) => {
                    if (e.target.checked) {
                      updateConstraint('time_restriction', {
                        start: '09:00',
                        end: '22:00',
                        days: [0, 1, 2, 3, 4, 5, 6],
                      });
                    } else {
                      updateConstraint('time_restriction', undefined);
                    }
                  }}
                  className="w-4 h-4 text-orange-600 border-slate-300 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-slate-700">
                  {locale === 'ar' ? 'تفعيل قيود الوقت' : 'Enable time restrictions'}
                </span>
              </label>

              {constraints.time_restriction && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        {locale === 'ar' ? 'من الساعة' : 'From'}
                      </label>
                      <input
                        type="time"
                        value={constraints.time_restriction.start}
                        onChange={(e) => updateTimeRestriction('start', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-600 mb-1">
                        {locale === 'ar' ? 'إلى الساعة' : 'To'}
                      </label>
                      <input
                        type="time"
                        value={constraints.time_restriction.end}
                        onChange={(e) => updateTimeRestriction('end', e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-600 mb-2">
                      {locale === 'ar' ? 'أيام الأسبوع' : 'Days of week'}
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {DAYS_OF_WEEK.map((day) => {
                        const isSelected = constraints.time_restriction?.days.includes(day.value);
                        return (
                          <button
                            key={day.value}
                            type="button"
                            onClick={() => toggleDay(day.value)}
                            className={`px-2 py-1 text-xs rounded-full transition-colors ${
                              isSelected
                                ? 'bg-orange-600 text-white'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            {locale === 'ar' ? day.ar : day.en}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Requires Approval */}
      {showRequiresApproval && !showAmountLimit && (
        <div className="border border-slate-200 rounded-lg p-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={constraints.requires_approval || false}
              onChange={(e) => updateConstraint('requires_approval', e.target.checked || undefined)}
              className="w-4 h-4 text-primary border-slate-300 rounded focus:ring-primary"
            />
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-500" />
              <div>
                <span className="text-sm font-medium text-slate-700">
                  {locale === 'ar' ? 'يحتاج موافقة' : 'Requires Approval'}
                </span>
                <p className="text-xs text-slate-500">
                  {locale === 'ar'
                    ? 'هذا الإجراء يحتاج موافقة المدير قبل التنفيذ'
                    : 'This action requires manager approval before execution'}
                </p>
              </div>
            </div>
          </label>
        </div>
      )}

      {/* Clear All */}
      {hasActiveConstraints && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange({})}
          className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full"
        >
          <X className="w-4 h-4 me-2" />
          {locale === 'ar' ? 'إزالة جميع القيود' : 'Remove all constraints'}
        </Button>
      )}
    </div>
  );
}

export default ConstraintsEditor;
