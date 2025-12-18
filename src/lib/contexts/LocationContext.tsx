'use client'

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'
import { guestLocationStorage, type GuestLocation } from '@/lib/hooks/useGuestLocation'

// Types for location data
export interface Governorate {
  id: string
  name_ar: string
  name_en: string
  is_active: boolean
}

export interface City {
  id: string
  name_ar: string
  name_en: string
  governorate_id: string
  is_active: boolean
}

export interface District {
  id: string
  name_ar: string
  name_en: string
  city_id: string
  governorate_id: string
  is_active: boolean
}

export interface UserLocation {
  governorateId: string | null
  governorateName: { ar: string; en: string } | null
  cityId: string | null
  cityName: { ar: string; en: string } | null
}

interface LocationContextValue {
  // Cached data from Supabase (loaded once)
  governorates: Governorate[]
  cities: City[]
  districts: District[]

  // Current user location
  userLocation: UserLocation

  // Loading states
  isDataLoading: boolean
  isDataLoaded: boolean
  isUserLocationLoading: boolean

  // Helper functions
  getCitiesByGovernorate: (governorateId: string) => City[]
  getDistrictsByCity: (cityId: string) => District[]
  getGovernorateById: (id: string) => Governorate | undefined
  getCityById: (id: string) => City | undefined

  // Actions
  setUserLocation: (location: UserLocation) => Promise<void>
  refreshLocationData: () => Promise<void>
  refreshUserLocation: () => Promise<void>
}

const defaultUserLocation: UserLocation = {
  governorateId: null,
  governorateName: null,
  cityId: null,
  cityName: null,
}

const LocationContext = createContext<LocationContextValue | null>(null)

// Cache key for session storage
const LOCATION_CACHE_KEY = 'engezna_location_cache'
const CACHE_DURATION = 30 * 60 * 1000 // 30 minutes

interface CachedData {
  governorates: Governorate[]
  cities: City[]
  districts: District[]
  timestamp: number
}

function getCachedData(): CachedData | null {
  if (typeof window === 'undefined') return null
  try {
    const cached = sessionStorage.getItem(LOCATION_CACHE_KEY)
    if (cached) {
      const data = JSON.parse(cached) as CachedData
      // Check if cache is still valid
      if (Date.now() - data.timestamp < CACHE_DURATION) {
        return data
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null
}

function setCachedData(data: Omit<CachedData, 'timestamp'>) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({
      ...data,
      timestamp: Date.now(),
    }))
  } catch {
    // Ignore cache errors
  }
}

export function LocationProvider({ children }: { children: ReactNode }) {
  // Location data state
  const [governorates, setGovernorates] = useState<Governorate[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [districts, setDistricts] = useState<District[]>([])
  const [isDataLoading, setIsDataLoading] = useState(true)
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  // User location state
  const [userLocation, setUserLocationState] = useState<UserLocation>(defaultUserLocation)
  const [isUserLocationLoading, setIsUserLocationLoading] = useState(true)

  // Load all location data (governorates, cities, districts)
  const loadLocationData = useCallback(async (forceRefresh = false) => {
    // Try to use cached data first
    if (!forceRefresh) {
      const cached = getCachedData()
      if (cached) {
        setGovernorates(cached.governorates)
        setCities(cached.cities)
        setDistricts(cached.districts)
        setIsDataLoaded(true)
        setIsDataLoading(false)
        return
      }
    }

    setIsDataLoading(true)
    const supabase = createClient()

    try {
      // Fetch all data in parallel
      const [govResult, cityResult, distResult] = await Promise.all([
        supabase
          .from('governorates')
          .select('id, name_ar, name_en, is_active')
          .eq('is_active', true)
          .order('name_ar'),
        supabase
          .from('cities')
          .select('id, name_ar, name_en, governorate_id, is_active')
          .eq('is_active', true)
          .order('name_ar'),
        supabase
          .from('districts')
          .select('id, name_ar, name_en, city_id, governorate_id, is_active')
          .eq('is_active', true)
          .order('name_ar'),
      ])

      const govData = (govResult.data || []) as Governorate[]
      const cityData = (cityResult.data || []) as City[]
      const distData = (distResult.data || []) as District[]

      setGovernorates(govData)
      setCities(cityData)
      setDistricts(distData)

      // Cache the data
      setCachedData({
        governorates: govData,
        cities: cityData,
        districts: distData,
      })

      setIsDataLoaded(true)
    } catch {
      // Error loading data - will retry on next mount
    } finally {
      setIsDataLoading(false)
    }
  }, [])

  // Load user location (from profile or guest storage)
  const loadUserLocation = useCallback(async () => {
    setIsUserLocationLoading(true)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Logged-in user: get location from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('city_id, governorate_id')
          .eq('id', user.id)
          .single()

        if (profile?.governorate_id) {
          // Get governorate and city names
          const gov = governorates.find(g => g.id === profile.governorate_id)
          const city = profile.city_id ? cities.find(c => c.id === profile.city_id) : null

          setUserLocationState({
            governorateId: profile.governorate_id,
            governorateName: gov ? { ar: gov.name_ar, en: gov.name_en } : null,
            cityId: profile.city_id || null,
            cityName: city ? { ar: city.name_ar, en: city.name_en } : null,
          })
        } else {
          // No location in profile, check guest storage
          const guestLocation = guestLocationStorage.get()
          if (guestLocation?.governorateId) {
            setUserLocationState(guestLocation)
          }
        }
      } else {
        // Guest user: get location from localStorage
        const guestLocation = guestLocationStorage.get()
        if (guestLocation?.governorateId) {
          setUserLocationState(guestLocation)
        }
      }
    } catch {
      // Error loading user location
    } finally {
      setIsUserLocationLoading(false)
    }
  }, [governorates, cities])

  // Set user location (updates both state and storage)
  const setUserLocation = useCallback(async (location: UserLocation) => {
    setUserLocationState(location)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user && location.governorateId) {
      // Update profile for logged-in users
      await supabase
        .from('profiles')
        .update({
          governorate_id: location.governorateId,
          city_id: location.cityId,
        })
        .eq('id', user.id)
    }

    // Always save to guest storage (for session persistence)
    guestLocationStorage.set({
      governorateId: location.governorateId,
      governorateName: location.governorateName,
      cityId: location.cityId,
      cityName: location.cityName,
    })

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('locationChanged', { detail: location }))
  }, [])

  // Helper functions
  const getCitiesByGovernorate = useCallback((governorateId: string): City[] => {
    return cities.filter(c => c.governorate_id === governorateId)
  }, [cities])

  const getDistrictsByCity = useCallback((cityId: string): District[] => {
    return districts.filter(d => d.city_id === cityId)
  }, [districts])

  const getGovernorateById = useCallback((id: string): Governorate | undefined => {
    return governorates.find(g => g.id === id)
  }, [governorates])

  const getCityById = useCallback((id: string): City | undefined => {
    return cities.find(c => c.id === id)
  }, [cities])

  // Load data on mount
  useEffect(() => {
    loadLocationData()
  }, [loadLocationData])

  // Load user location after data is loaded
  useEffect(() => {
    if (isDataLoaded) {
      loadUserLocation()
    }
  }, [isDataLoaded, loadUserLocation])

  // Listen for guest location changes
  useEffect(() => {
    const handleGuestLocationChange = (event: CustomEvent<GuestLocation>) => {
      if (event.detail) {
        setUserLocationState(event.detail)
      }
    }

    window.addEventListener('guestLocationChanged', handleGuestLocationChange as EventListener)
    return () => {
      window.removeEventListener('guestLocationChanged', handleGuestLocationChange as EventListener)
    }
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createClient()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // Reload user location on auth change
        if (isDataLoaded) {
          loadUserLocation()
        }
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [isDataLoaded, loadUserLocation])

  const value: LocationContextValue = {
    governorates,
    cities,
    districts,
    userLocation,
    isDataLoading,
    isDataLoaded,
    isUserLocationLoading,
    getCitiesByGovernorate,
    getDistrictsByCity,
    getGovernorateById,
    getCityById,
    setUserLocation,
    refreshLocationData: () => loadLocationData(true),
    refreshUserLocation: loadUserLocation,
  }

  return (
    <LocationContext.Provider value={value}>
      {children}
    </LocationContext.Provider>
  )
}

// Custom hook to use location context
export function useLocation() {
  const context = useContext(LocationContext)
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider')
  }
  return context
}

// Export a simpler hook for just user location data
export function useUserLocation() {
  const { userLocation, isUserLocationLoading, setUserLocation } = useLocation()
  return {
    ...userLocation,
    isLoading: isUserLocationLoading,
    setLocation: setUserLocation,
    hasLocation: Boolean(userLocation.governorateId),
  }
}
