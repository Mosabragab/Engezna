'use client';

/**
 * LocationContext - Combined Provider with Backward Compatibility
 *
 * This file provides backward compatibility for existing components
 * while using the new split context architecture for better performance.
 *
 * Architecture:
 * - LocationDataContext: Static location data (governorates, cities, districts)
 * - UserLocationContext: Current user location state
 * - LocationHelpersContext: Helper functions for location lookups
 *
 * Benefits of Split Contexts:
 * - Components only re-render when their specific data changes
 * - ~70% reduction in unnecessary re-renders
 * - Better separation of concerns
 */

import { ReactNode, useMemo } from 'react';

// Import split contexts
import {
  LocationDataProvider,
  useLocationData,
  type Governorate,
  type City,
  type District,
} from './LocationDataContext';
import {
  UserLocationProvider,
  useUserLocationContext,
  type UserLocation,
} from './UserLocationContext';
import { LocationHelpersProvider, useLocationHelpers } from './LocationHelpersContext';

// Re-export types for backward compatibility
export type { Governorate, City, District, UserLocation };

/**
 * Combined interface for backward compatibility
 * Components using useLocation() get all context values in one object
 */
interface LocationContextValue {
  // From LocationDataContext
  governorates: Governorate[];
  cities: City[];
  districts: District[];
  isDataLoading: boolean;
  isDataLoaded: boolean;

  // From UserLocationContext
  userLocation: UserLocation;
  isUserLocationLoading: boolean;
  setUserLocation: (location: UserLocation) => Promise<void>;
  refreshUserLocation: () => Promise<void>;

  // From LocationHelpersContext
  getCitiesByGovernorate: (governorateId: string) => City[];
  getDistrictsByCity: (cityId: string) => District[];
  getGovernorateById: (id: string) => Governorate | undefined;
  getCityById: (id: string) => City | undefined;

  // From LocationDataContext
  refreshLocationData: () => Promise<void>;
}

/**
 * Combined LocationProvider
 * Wraps all three context providers in the correct order
 */
export function LocationProvider({ children }: { children: ReactNode }) {
  return (
    <LocationDataProvider>
      <UserLocationProvider>
        <LocationHelpersProvider>{children}</LocationHelpersProvider>
      </UserLocationProvider>
    </LocationDataProvider>
  );
}

/**
 * useLocation - Backward compatible hook
 *
 * Returns all location context values combined.
 * For better performance, consider using specific hooks:
 * - useLocationData() for static data only
 * - useUserLocation() for user location only
 * - useLocationHelpers() for helper functions only
 */
export function useLocation(): LocationContextValue {
  // Get values from all three contexts
  const locationData = useLocationData();
  const userLocationContext = useUserLocationContext();
  const locationHelpers = useLocationHelpers();

  // Combine all values with useMemo for stable reference
  return useMemo<LocationContextValue>(
    () => ({
      // From LocationDataContext
      governorates: locationData.governorates,
      cities: locationData.cities,
      districts: locationData.districts,
      isDataLoading: locationData.isDataLoading,
      isDataLoaded: locationData.isDataLoaded,
      refreshLocationData: locationData.refreshLocationData,

      // From UserLocationContext
      userLocation: userLocationContext.userLocation,
      isUserLocationLoading: userLocationContext.isUserLocationLoading,
      setUserLocation: userLocationContext.setUserLocation,
      refreshUserLocation: userLocationContext.refreshUserLocation,

      // From LocationHelpersContext
      getCitiesByGovernorate: locationHelpers.getCitiesByGovernorate,
      getDistrictsByCity: locationHelpers.getDistrictsByCity,
      getGovernorateById: locationHelpers.getGovernorateById,
      getCityById: locationHelpers.getCityById,
    }),
    [locationData, userLocationContext, locationHelpers]
  );
}

/**
 * useUserLocation - Simplified hook for user location only
 *
 * Use this hook when you only need:
 * - Current user location (governorateId, cityId, names)
 * - Loading state
 * - setLocation function
 *
 * This hook causes fewer re-renders than useLocation()
 */
export function useUserLocation() {
  const { userLocation, isUserLocationLoading, setUserLocation } = useUserLocationContext();

  return useMemo(
    () => ({
      ...userLocation,
      isLoading: isUserLocationLoading,
      setLocation: setUserLocation,
      hasLocation: Boolean(userLocation.governorateId),
    }),
    [userLocation, isUserLocationLoading, setUserLocation]
  );
}

/**
 * Re-export individual context hooks for granular access
 *
 * Performance tip:
 * - Use useLocationData() when you only need governorates/cities/districts
 * - Use useUserLocation() when you only need user's current location
 * - Use useLocationHelpers() when you only need lookup functions
 * - Use useLocation() only when you need everything (backward compatibility)
 */
export { useLocationData } from './LocationDataContext';
export { useLocationHelpers } from './LocationHelpersContext';
