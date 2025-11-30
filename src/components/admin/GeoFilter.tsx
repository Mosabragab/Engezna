'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building, Map, Home, X, ChevronDown } from 'lucide-react'

interface Governorate {
  id: string
  name_ar: string
  name_en: string
  is_active: boolean
}

interface City {
  id: string
  governorate_id: string
  name_ar: string
  name_en: string
  is_active: boolean
}

interface District {
  id: string
  governorate_id: string
  city_id: string | null
  name_ar: string
  name_en: string
  is_active: boolean
}

export interface GeoFilterValue {
  governorate_id: string | null
  city_id: string | null
  district_id: string | null
}

interface GeoFilterProps {
  value: GeoFilterValue
  onChange: (value: GeoFilterValue) => void
  showDistrict?: boolean
  className?: string
  inline?: boolean
  showClearButton?: boolean
}

export function GeoFilter({
  value,
  onChange,
  showDistrict = true,
  className = '',
  inline = true,
  showClearButton = true,
}: GeoFilterProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLocations()
  }, [])

  async function loadLocations() {
    const supabase = createClient()

    const [govRes, cityRes, districtRes] = await Promise.all([
      supabase.from('governorates').select('*').eq('is_active', true).order('name_ar'),
      supabase.from('cities').select('*').eq('is_active', true).order('name_ar'),
      supabase.from('districts').select('*').eq('is_active', true).order('name_ar'),
    ])

    setGovernorates(govRes.data || [])
    setCities(cityRes.data || [])
    setDistricts(districtRes.data || [])
    setLoading(false)
  }

  const filteredCities = value.governorate_id
    ? cities.filter(c => c.governorate_id === value.governorate_id)
    : []

  const filteredDistricts = value.city_id
    ? districts.filter(d => d.city_id === value.city_id)
    : value.governorate_id
    ? districts.filter(d => d.governorate_id === value.governorate_id && !d.city_id)
    : []

  const handleGovernorateChange = (governorate_id: string) => {
    onChange({
      governorate_id: governorate_id || null,
      city_id: null,
      district_id: null,
    })
  }

  const handleCityChange = (city_id: string) => {
    onChange({
      ...value,
      city_id: city_id || null,
      district_id: null,
    })
  }

  const handleDistrictChange = (district_id: string) => {
    onChange({
      ...value,
      district_id: district_id || null,
    })
  }

  const clearFilters = () => {
    onChange({
      governorate_id: null,
      city_id: null,
      district_id: null,
    })
  }

  const hasActiveFilter = value.governorate_id || value.city_id || value.district_id

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-lg"></div>
        <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-lg"></div>
      </div>
    )
  }

  const selectClass = "px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500 bg-white text-sm min-w-[140px]"

  if (inline) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {/* Governorate */}
        <div className="relative">
          <Building className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
          <select
            value={value.governorate_id || ''}
            onChange={(e) => handleGovernorateChange(e.target.value)}
            className={`${selectClass} ${isRTL ? 'pr-10' : 'pl-10'}`}
          >
            <option value="">{locale === 'ar' ? 'كل المحافظات' : 'All Governorates'}</option>
            {governorates.map((g) => (
              <option key={g.id} value={g.id}>
                {locale === 'ar' ? g.name_ar : g.name_en}
              </option>
            ))}
          </select>
        </div>

        {/* City */}
        {value.governorate_id && filteredCities.length > 0 && (
          <div className="relative">
            <Map className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
            <select
              value={value.city_id || ''}
              onChange={(e) => handleCityChange(e.target.value)}
              className={`${selectClass} ${isRTL ? 'pr-10' : 'pl-10'}`}
            >
              <option value="">{locale === 'ar' ? 'كل المدن' : 'All Cities'}</option>
              {filteredCities.map((c) => (
                <option key={c.id} value={c.id}>
                  {locale === 'ar' ? c.name_ar : c.name_en}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* District */}
        {showDistrict && value.governorate_id && filteredDistricts.length > 0 && (
          <div className="relative">
            <Home className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`} />
            <select
              value={value.district_id || ''}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className={`${selectClass} ${isRTL ? 'pr-10' : 'pl-10'}`}
            >
              <option value="">{locale === 'ar' ? 'كل الأحياء' : 'All Districts'}</option>
              {filteredDistricts.map((d) => (
                <option key={d.id} value={d.id}>
                  {locale === 'ar' ? d.name_ar : d.name_en}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clear Button */}
        {showClearButton && hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
            title={locale === 'ar' ? 'مسح الفلترة' : 'Clear filters'}
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
    )
  }

  // Stacked layout
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Governorate */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {locale === 'ar' ? 'المحافظة' : 'Governorate'}
        </label>
        <select
          value={value.governorate_id || ''}
          onChange={(e) => handleGovernorateChange(e.target.value)}
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
        >
          <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
          {governorates.map((g) => (
            <option key={g.id} value={g.id}>
              {locale === 'ar' ? g.name_ar : g.name_en}
            </option>
          ))}
        </select>
      </div>

      {/* City */}
      {filteredCities.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {locale === 'ar' ? 'المدينة' : 'City'}
          </label>
          <select
            value={value.city_id || ''}
            onChange={(e) => handleCityChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
            {filteredCities.map((c) => (
              <option key={c.id} value={c.id}>
                {locale === 'ar' ? c.name_ar : c.name_en}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* District */}
      {showDistrict && filteredDistricts.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {locale === 'ar' ? 'الحي' : 'District'}
          </label>
          <select
            value={value.district_id || ''}
            onChange={(e) => handleDistrictChange(e.target.value)}
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-red-500"
          >
            <option value="">{locale === 'ar' ? 'الكل' : 'All'}</option>
            {filteredDistricts.map((d) => (
              <option key={d.id} value={d.id}>
                {locale === 'ar' ? d.name_ar : d.name_en}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}

// Hook for using geo filter
export function useGeoFilter() {
  const [geoFilter, setGeoFilter] = useState<GeoFilterValue>({
    governorate_id: null,
    city_id: null,
    district_id: null,
  })

  return { geoFilter, setGeoFilter }
}

export default GeoFilter
