'use client';

import { createContext, useContext, useCallback, useMemo, ReactNode } from 'react';
import { useLocationData, type City, type District, type Governorate } from './LocationDataContext';

interface LocationHelpersContextValue {
  // Helper functions (stable references via useCallback)
  getCitiesByGovernorate: (governorateId: string) => City[];
  getDistrictsByCity: (cityId: string) => District[];
  getGovernorateById: (id: string) => Governorate | undefined;
  getCityById: (id: string) => City | undefined;
}

const LocationHelpersContext = createContext<LocationHelpersContextValue | null>(null);

export function LocationHelpersProvider({ children }: { children: ReactNode }) {
  // Get data from LocationDataContext
  const { governorates, cities, districts } = useLocationData();

  // ✅ useCallback: Stable function references
  const getCitiesByGovernorate = useCallback(
    (governorateId: string): City[] => {
      return cities.filter((c) => c.governorate_id === governorateId);
    },
    [cities]
  );

  const getDistrictsByCity = useCallback(
    (cityId: string): District[] => {
      return districts.filter((d) => d.city_id === cityId);
    },
    [districts]
  );

  const getGovernorateById = useCallback(
    (id: string): Governorate | undefined => {
      return governorates.find((g) => g.id === id);
    },
    [governorates]
  );

  const getCityById = useCallback(
    (id: string): City | undefined => {
      return cities.find((c) => c.id === id);
    },
    [cities]
  );

  // ✅ useMemo: Prevent unnecessary re-renders
  const value = useMemo<LocationHelpersContextValue>(
    () => ({
      getCitiesByGovernorate,
      getDistrictsByCity,
      getGovernorateById,
      getCityById,
    }),
    [getCitiesByGovernorate, getDistrictsByCity, getGovernorateById, getCityById]
  );

  return (
    <LocationHelpersContext.Provider value={value}>{children}</LocationHelpersContext.Provider>
  );
}

// Custom hook to use location helpers context
export function useLocationHelpers() {
  const context = useContext(LocationHelpersContext);
  if (!context) {
    throw new Error('useLocationHelpers must be used within a LocationHelpersProvider');
  }
  return context;
}
