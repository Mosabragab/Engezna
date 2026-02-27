'use client';

import { useState, useEffect, useCallback } from 'react';

const GUEST_LOCATION_KEY = 'engezna_guest_location';
const GUEST_LOCATION_COOKIE = 'engezna_has_location';

export interface GuestLocation {
  governorateId: string | null;
  governorateName: { ar: string; en: string } | null;
  cityId: string | null;
  cityName: { ar: string; en: string } | null;
}

const defaultLocation: GuestLocation = {
  governorateId: null,
  governorateName: null,
  cityId: null,
  cityName: null,
};

/** Set a cookie flag so middleware can redirect guests without location before SSR */
function setLocationCookie() {
  document.cookie = `${GUEST_LOCATION_COOKIE}=1; path=/; max-age=31536000; SameSite=Lax`;
}

/** Remove the location cookie */
function clearLocationCookie() {
  document.cookie = `${GUEST_LOCATION_COOKIE}=; path=/; max-age=0`;
}

/**
 * Hook to manage guest location in localStorage
 * This allows non-logged-in users to browse stores by location
 */
export function useGuestLocation() {
  const [location, setLocationState] = useState<GuestLocation>(defaultLocation);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load location from localStorage on mount + sync cookie
  useEffect(() => {
    try {
      const stored = localStorage.getItem(GUEST_LOCATION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GuestLocation;
        setLocationState(parsed);
        // Sync cookie for middleware (handles migration for existing users)
        if (parsed.governorateId) {
          setLocationCookie();
        }
      }
    } catch (error) {
      console.error('Error loading guest location:', error);
    }
    setIsLoaded(true);
  }, []);

  // Save location to localStorage
  const setLocation = useCallback((newLocation: GuestLocation) => {
    try {
      localStorage.setItem(GUEST_LOCATION_KEY, JSON.stringify(newLocation));
      setLocationState(newLocation);
      // Sync cookie for middleware
      if (newLocation.governorateId) {
        setLocationCookie();
      } else {
        clearLocationCookie();
      }
      // Dispatch custom event to notify other components of location change
      window.dispatchEvent(new CustomEvent('guestLocationChanged', { detail: newLocation }));
    } catch (error) {
      console.error('Error saving guest location:', error);
    }
  }, []);

  // Clear location from localStorage
  const clearLocation = useCallback(() => {
    try {
      localStorage.removeItem(GUEST_LOCATION_KEY);
      clearLocationCookie();
      setLocationState(defaultLocation);
    } catch (error) {
      console.error('Error clearing guest location:', error);
    }
  }, []);

  // Get stored location (for syncing on login)
  const getStoredLocation = useCallback((): GuestLocation | null => {
    try {
      const stored = localStorage.getItem(GUEST_LOCATION_KEY);
      if (stored) {
        return JSON.parse(stored) as GuestLocation;
      }
    } catch (error) {
      console.error('Error getting stored location:', error);
    }
    return null;
  }, []);

  return {
    location,
    setLocation,
    clearLocation,
    getStoredLocation,
    isLoaded,
    hasLocation: Boolean(location.governorateId),
  };
}

/**
 * Utility functions for direct localStorage access (for server-side or non-hook usage)
 */
export const guestLocationStorage = {
  get: (): GuestLocation | null => {
    if (typeof window === 'undefined') return null;
    try {
      const stored = localStorage.getItem(GUEST_LOCATION_KEY);
      const parsed = stored ? JSON.parse(stored) : null;
      // Sync cookie for middleware (handles migration for existing users)
      if (parsed?.governorateId) {
        setLocationCookie();
      }
      return parsed;
    } catch {
      return null;
    }
  },

  set: (location: GuestLocation): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(GUEST_LOCATION_KEY, JSON.stringify(location));
      if (location.governorateId) {
        setLocationCookie();
      } else {
        clearLocationCookie();
      }
    } catch (error) {
      console.error('Error saving guest location:', error);
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(GUEST_LOCATION_KEY);
      clearLocationCookie();
    } catch (error) {
      console.error('Error clearing guest location:', error);
    }
  },
};
