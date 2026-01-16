'use client';

import { useState, useEffect, useCallback } from 'react';

const GUEST_LOCATION_KEY = 'engezna_guest_location';

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

/**
 * Hook to manage guest location in localStorage
 * This allows non-logged-in users to browse stores by location
 */
export function useGuestLocation() {
  const [location, setLocationState] = useState<GuestLocation>(defaultLocation);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load location from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(GUEST_LOCATION_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as GuestLocation;
        setLocationState(parsed);
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
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  },

  set: (location: GuestLocation): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(GUEST_LOCATION_KEY, JSON.stringify(location));
    } catch (error) {
      console.error('Error saving guest location:', error);
    }
  },

  clear: (): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(GUEST_LOCATION_KEY);
    } catch (error) {
      console.error('Error clearing guest location:', error);
    }
  },
};
