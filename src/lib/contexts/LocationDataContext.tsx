'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import { createClient } from '@/lib/supabase/client';
import { getCachedGovernorates } from '@/lib/cache/cached-queries';

// Types for location data
export interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

export interface City {
  id: string;
  name_ar: string;
  name_en: string;
  governorate_id: string;
  is_active: boolean;
}

export interface District {
  id: string;
  name_ar: string;
  name_en: string;
  city_id: string;
  is_active: boolean;
}

interface LocationDataContextValue {
  // Cached data from Supabase (loaded once)
  governorates: Governorate[];
  cities: City[];
  districts: District[];

  // Loading states
  isDataLoading: boolean;
  isDataLoaded: boolean;

  // Actions
  refreshLocationData: () => Promise<void>;
}

const LocationDataContext = createContext<LocationDataContextValue | null>(null);

// Cache key for session storage
const LOCATION_CACHE_KEY = 'engezna_location_cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

interface CachedData {
  governorates: Governorate[];
  cities: City[];
  districts: District[];
  timestamp: number;
}

function getCachedData(): CachedData | null {
  if (typeof window === 'undefined') return null;
  try {
    const cached = sessionStorage.getItem(LOCATION_CACHE_KEY);
    if (cached) {
      const data = JSON.parse(cached) as CachedData;
      // Check if cache is still valid
      if (Date.now() - data.timestamp < CACHE_DURATION) {
        return data;
      }
    }
  } catch {
    // Ignore cache errors
  }
  return null;
}

function setCachedData(data: Omit<CachedData, 'timestamp'>) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(
      LOCATION_CACHE_KEY,
      JSON.stringify({
        ...data,
        timestamp: Date.now(),
      })
    );
  } catch {
    // Ignore cache errors
  }
}

export function LocationDataProvider({ children }: { children: ReactNode }) {
  // Location data state
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  // Load all location data (governorates, cities, districts)
  const loadLocationData = useCallback(async (forceRefresh = false) => {
    // Try to use cached data first
    if (!forceRefresh) {
      const cached = getCachedData();
      if (cached) {
        setGovernorates(cached.governorates);
        setCities(cached.cities);
        setDistricts(cached.districts);
        setIsDataLoaded(true);
        setIsDataLoading(false);
        return;
      }
    }

    setIsDataLoading(true);
    const supabase = createClient();

    try {
      // Fetch all data in parallel
      const [govData, cityResult, distResult] = await Promise.all([
        getCachedGovernorates(),
        supabase
          .from('cities')
          .select('id, name_ar, name_en, governorate_id, is_active')
          .eq('is_active', true)
          .order('name_ar'),
        supabase
          .from('districts')
          .select('id, name_ar, name_en, city_id, is_active')
          .eq('is_active', true)
          .order('name_ar'),
      ]);

      const cityData = (cityResult.data || []) as City[];
      const distData = (distResult.data || []) as District[];

      setGovernorates(govData);
      setCities(cityData);
      setDistricts(distData);

      // Cache the data
      setCachedData({
        governorates: govData,
        cities: cityData,
        districts: distData,
      });

      setIsDataLoaded(true);
    } catch {
      // Error loading data - will retry on next mount
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  // Load data on mount
  useEffect(() => {
    loadLocationData();
  }, [loadLocationData]);

  // ✅ useMemo: Prevent unnecessary re-renders of consumers
  const value = useMemo<LocationDataContextValue>(
    () => ({
      governorates,
      cities,
      districts,
      isDataLoading,
      isDataLoaded,
      refreshLocationData: () => loadLocationData(true),
    }),
    [governorates, cities, districts, isDataLoading, isDataLoaded, loadLocationData]
  );

  return <LocationDataContext.Provider value={value}>{children}</LocationDataContext.Provider>;
}

// Custom hook to use location data context
export function useLocationData() {
  const context = useContext(LocationDataContext);
  if (!context) {
    throw new Error('useLocationData must be used within a LocationDataProvider');
  }
  return context;
}
