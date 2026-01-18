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
import { guestLocationStorage, type GuestLocation } from '@/lib/hooks/useGuestLocation';
import { useLocationData } from './LocationDataContext';

export interface UserLocation {
  governorateId: string | null;
  governorateName: { ar: string; en: string } | null;
  cityId: string | null;
  cityName: { ar: string; en: string } | null;
}

interface UserLocationContextValue {
  // Current user location
  userLocation: UserLocation;

  // Loading state
  isUserLocationLoading: boolean;

  // Actions
  setUserLocation: (location: UserLocation) => Promise<void>;
  refreshUserLocation: () => Promise<void>;
}

const defaultUserLocation: UserLocation = {
  governorateId: null,
  governorateName: null,
  cityId: null,
  cityName: null,
};

const UserLocationContext = createContext<UserLocationContextValue | null>(null);

export function UserLocationProvider({ children }: { children: ReactNode }) {
  // Get data from LocationDataContext
  const { governorates, cities, isDataLoaded } = useLocationData();

  // User location state
  const [userLocation, setUserLocationState] = useState<UserLocation>(defaultUserLocation);
  const [isUserLocationLoading, setIsUserLocationLoading] = useState(true);

  // Load user location (from profile or guest storage)
  const loadUserLocation = useCallback(async () => {
    setIsUserLocationLoading(true);
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        // Logged-in user: get location from profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('city_id, governorate_id')
          .eq('id', user.id)
          .single();

        if (profile?.governorate_id) {
          // Get governorate and city names
          const gov = governorates.find((g) => g.id === profile.governorate_id);
          const city = profile.city_id ? cities.find((c) => c.id === profile.city_id) : null;

          setUserLocationState({
            governorateId: profile.governorate_id,
            governorateName: gov ? { ar: gov.name_ar, en: gov.name_en } : null,
            cityId: profile.city_id || null,
            cityName: city ? { ar: city.name_ar, en: city.name_en } : null,
          });
        } else {
          // No location in profile, check guest storage
          const guestLocation = guestLocationStorage.get();
          if (guestLocation?.governorateId) {
            setUserLocationState(guestLocation);
          }
        }
      } else {
        // Guest user: get location from localStorage
        const guestLocation = guestLocationStorage.get();
        if (guestLocation?.governorateId) {
          setUserLocationState(guestLocation);
        }
      }
    } catch {
      // Error loading user location
    } finally {
      setIsUserLocationLoading(false);
    }
  }, [governorates, cities]);

  // Set user location (updates both state and storage)
  const setUserLocation = useCallback(async (location: UserLocation) => {
    setUserLocationState(location);

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && location.governorateId) {
      // Update profile for logged-in users
      await supabase
        .from('profiles')
        .update({
          governorate_id: location.governorateId,
          city_id: location.cityId,
        })
        .eq('id', user.id);
    }

    // Always save to guest storage (for session persistence)
    guestLocationStorage.set({
      governorateId: location.governorateId,
      governorateName: location.governorateName,
      cityId: location.cityId,
      cityName: location.cityName,
    });

    // Dispatch event for other components
    window.dispatchEvent(new CustomEvent('locationChanged', { detail: location }));
  }, []);

  // Load user location after data is loaded
  useEffect(() => {
    if (isDataLoaded) {
      loadUserLocation();
    }
  }, [isDataLoaded, loadUserLocation]);

  // Listen for guest location changes
  useEffect(() => {
    const handleGuestLocationChange = (event: CustomEvent<GuestLocation>) => {
      if (event.detail) {
        setUserLocationState(event.detail);
      }
    };

    window.addEventListener('guestLocationChanged', handleGuestLocationChange as EventListener);
    return () => {
      window.removeEventListener(
        'guestLocationChanged',
        handleGuestLocationChange as EventListener
      );
    };
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createClient();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        // Reload user location on auth change
        if (isDataLoaded) {
          loadUserLocation();
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [isDataLoaded, loadUserLocation]);

  // ✅ useMemo: Prevent unnecessary re-renders of consumers
  const value = useMemo<UserLocationContextValue>(
    () => ({
      userLocation,
      isUserLocationLoading,
      setUserLocation,
      refreshUserLocation: loadUserLocation,
    }),
    [userLocation, isUserLocationLoading, setUserLocation, loadUserLocation]
  );

  return <UserLocationContext.Provider value={value}>{children}</UserLocationContext.Provider>;
}

// Custom hook to use user location context
export function useUserLocationContext() {
  const context = useContext(UserLocationContext);
  if (!context) {
    throw new Error('useUserLocationContext must be used within a UserLocationProvider');
  }
  return context;
}
