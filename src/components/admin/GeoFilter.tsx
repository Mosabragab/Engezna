'use client'

import { useLocale } from 'next-intl'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building, Map, X } from 'lucide-react'

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

// NOTE: district_id is kept for backward compatibility but is DEPRECATED
// The system now uses GPS coordinates instead of districts
export interface GeoFilterValue {
  governorate_id: string | null
  city_id: string | null
  district_id: string | null // DEPRECATED - always null, use GPS coordinates instead
}

interface GeoFilterProps {
  value: GeoFilterValue
  onChange: (value: GeoFilterValue) => void
  showDistrict?: boolean // DEPRECATED - districts no longer used
  className?: string
  inline?: boolean
  showClearButton?: boolean
}

export function GeoFilter({
  value,
  onChange,
  showDistrict = false, // DEPRECATED - Changed default to false
  className = '',
  inline = true,
  showClearButton = true,
}: GeoFilterProps) {
  const locale = useLocale()
  const isRTL = locale === 'ar'

  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLocations()
  }, [])

  async function loadLocations() {
    const supabase = createClient()

    const [govRes, cityRes] = await Promise.all([
      supabase
        .from('governorates')
        .select('*')
        .eq('is_active', true)
        .order('display_order', { ascending: true })
        .order('name_ar'),
      supabase
        .from('cities')
        .select('*')
        .eq('is_active', true)
        .order('name_ar'),
    ])

    setGovernorates(govRes.data || [])
    setCities(cityRes.data || [])
    setLoading(false)
  }

  const filteredCities = value.governorate_id
    ? cities.filter(c => c.governorate_id === value.governorate_id)
    : []

  const handleGovernorateChange = (governorate_id: string) => {
    onChange({
      governorate_id: governorate_id || null,
      city_id: null,
      district_id: null, // Always null - districts deprecated
    })
  }

  const handleCityChange = (city_id: string) => {
    onChange({
      ...value,
      city_id: city_id || null,
      district_id: null, // Always null - districts deprecated
    })
  }

  const clearFilters = () => {
    onChange({
      governorate_id: null,
      city_id: null,
      district_id: null,
    })
  }

  const hasActiveFilter = value.governorate_id || value.city_id

  if (loading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-lg"></div>
        <div className="h-10 w-32 bg-slate-200 animate-pulse rounded-lg"></div>
      </div>
    )
  }

  const selectClass = "px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary bg-white text-sm min-w-[140px]"

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

        {/* Clear Button */}
        {showClearButton && hasActiveFilter && (
          <button
            onClick={clearFilters}
            className="p-2 text-slate-400 hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
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
          className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
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
            className="w-full px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary"
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
    </div>
  )
}

// Hook for using geo filter
export function useGeoFilter() {
  const [geoFilter, setGeoFilter] = useState<GeoFilterValue>({
    governorate_id: null,
    city_id: null,
    district_id: null, // Always null - deprecated
  })

  return { geoFilter, setGeoFilter }
}

// Hook for admin geo filter with automatic regional filtering
export function useAdminGeoFilter() {
  const [geoFilter, setGeoFilter] = useState<GeoFilterValue>({
    governorate_id: null,
    city_id: null,
    district_id: null,
  })
  const [assignedRegions, setAssignedRegions] = useState<Array<{ governorate_id?: string; city_id?: string }>>([])
  const [isRegionalAdmin, setIsRegionalAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAdminRegions()
  }, [])

  async function loadAdminRegions() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      setLoading(false)
      return
    }

    // Get admin user's assigned_regions and role
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select('role, assigned_regions')
      .eq('user_id', user.id)
      .single()

    if (adminUser) {
      const regions = adminUser.assigned_regions || []
      setAssignedRegions(regions)

      // Check if user is a regional admin (has assigned regions and is not super_admin)
      const isRegional = regions.length > 0 && adminUser.role !== 'super_admin'
      setIsRegionalAdmin(isRegional)

      // Auto-apply first region filter for regional admins
      if (isRegional && regions.length > 0) {
        const firstRegion = regions[0]
        setGeoFilter({
          governorate_id: firstRegion.governorate_id || null,
          city_id: firstRegion.city_id || null,
          district_id: null,
        })
      }
    }

    setLoading(false)
  }

  // Get list of allowed governorate IDs for regional admin
  const allowedGovernorateIds = assignedRegions
    .map(r => r.governorate_id)
    .filter(Boolean) as string[]

  return {
    geoFilter,
    setGeoFilter,
    isRegionalAdmin,
    assignedRegions,
    allowedGovernorateIds,
    loading,
  }
}

export default GeoFilter
