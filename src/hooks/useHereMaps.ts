'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  HERE_CONFIG,
  validateHereApiKey,
  Coordinates,
  HereAddress,
  HereSearchResult,
} from '@/lib/here-maps/config';

interface UseHereMapsReturn {
  isLoaded: boolean;
  error: string | null;

  // Geocoding
  geocode: (address: string) => Promise<Coordinates | null>;
  reverseGeocode: (coords: Coordinates) => Promise<HereAddress | null>;

  // Search
  autosuggest: (query: string, coords?: Coordinates) => Promise<HereSearchResult[]>;
  search: (query: string, coords?: Coordinates) => Promise<HereSearchResult[]>;

  // Distance calculation
  calculateDistance: (from: Coordinates, to: Coordinates) => number;

  // Address formatting
  formatAddress: (address: HereAddress) => string;
}

export function useHereMaps(): UseHereMapsReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!validateHereApiKey()) {
      setError('HERE Maps API key not configured');
      return;
    }
    setIsLoaded(true);
  }, []);

  // Geocode address to coordinates
  const geocode = useCallback(async (address: string): Promise<Coordinates | null> => {
    if (!HERE_CONFIG.apiKey) return null;

    try {
      const params = new URLSearchParams({
        q: address,
        in: `countryCode:${HERE_CONFIG.countryCode}`,
        lang: HERE_CONFIG.language,
        apiKey: HERE_CONFIG.apiKey,
      });

      const response = await fetch(`${HERE_CONFIG.endpoints.geocode}?${params}`);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const { lat, lng } = data.items[0].position;
        return { lat, lng };
      }
      return null;
    } catch (err) {
      console.error('Geocoding error:', err);
      return null;
    }
  }, []);

  // Reverse geocode coordinates to address
  const reverseGeocode = useCallback(async (coords: Coordinates): Promise<HereAddress | null> => {
    if (!HERE_CONFIG.apiKey) return null;

    try {
      const params = new URLSearchParams({
        at: `${coords.lat},${coords.lng}`,
        lang: HERE_CONFIG.language,
        apiKey: HERE_CONFIG.apiKey,
      });

      const response = await fetch(`${HERE_CONFIG.endpoints.reverseGeocode}?${params}`);
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        return {
          label: item.title,
          street: item.address?.street,
          houseNumber: item.address?.houseNumber,
          city: item.address?.city,
          district: item.address?.district,
          governorate: item.address?.state || item.address?.county,
          postalCode: item.address?.postalCode,
          countryCode: item.address?.countryCode,
        };
      }
      return null;
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return null;
    }
  }, []);

  // Autosuggest addresses
  const autosuggest = useCallback(
    async (query: string, coords?: Coordinates): Promise<HereSearchResult[]> => {
      if (!HERE_CONFIG.apiKey || query.length < 2) return [];

      try {
        const params = new URLSearchParams({
          q: query,
          in: `countryCode:${HERE_CONFIG.countryCode}`,
          lang: HERE_CONFIG.language,
          limit: '10',
          apiKey: HERE_CONFIG.apiKey,
        });

        // Add location bias if provided
        if (coords) {
          params.set('at', `${coords.lat},${coords.lng}`);
        }

        const response = await fetch(`${HERE_CONFIG.endpoints.autosuggest}?${params}`);
        const data = await response.json();

        return (data.items || []).map((item: any) => ({
          title: item.title,
          id: item.id,
          position: item.position || { lat: 0, lng: 0 },
          address: {
            label: item.title,
            street: item.address?.street,
            houseNumber: item.address?.houseNumber,
            city: item.address?.city,
            district: item.address?.district,
            governorate: item.address?.state || item.address?.county,
            postalCode: item.address?.postalCode,
          },
          distance: item.distance,
        }));
      } catch (err) {
        console.error('Autosuggest error:', err);
        return [];
      }
    },
    []
  );

  // Search for places/addresses
  const search = useCallback(
    async (query: string, coords?: Coordinates): Promise<HereSearchResult[]> => {
      if (!HERE_CONFIG.apiKey) return [];

      try {
        const params = new URLSearchParams({
          q: query,
          in: `countryCode:${HERE_CONFIG.countryCode}`,
          lang: HERE_CONFIG.language,
          limit: '20',
          apiKey: HERE_CONFIG.apiKey,
        });

        if (coords) {
          params.set('at', `${coords.lat},${coords.lng}`);
        }

        const response = await fetch(`${HERE_CONFIG.endpoints.geocode}?${params}`);
        const data = await response.json();

        return (data.items || []).map((item: any) => ({
          title: item.title,
          id: item.id,
          position: item.position,
          address: {
            label: item.title,
            street: item.address?.street,
            houseNumber: item.address?.houseNumber,
            city: item.address?.city,
            district: item.address?.district,
            governorate: item.address?.state || item.address?.county,
            postalCode: item.address?.postalCode,
          },
          distance: item.distance,
          categories: item.categories,
        }));
      } catch (err) {
        console.error('Search error:', err);
        return [];
      }
    },
    []
  );

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = useCallback((from: Coordinates, to: Coordinates): number => {
    const R = 6371; // Earth's radius in km
    const dLat = ((to.lat - from.lat) * Math.PI) / 180;
    const dLng = ((to.lng - from.lng) * Math.PI) / 180;

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((from.lat * Math.PI) / 180) *
        Math.cos((to.lat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }, []);

  // Format address for display
  const formatAddress = useCallback((address: HereAddress): string => {
    const parts: string[] = [];

    if (address.houseNumber) parts.push(address.houseNumber);
    if (address.street) parts.push(address.street);
    if (address.district) parts.push(address.district);
    if (address.city) parts.push(address.city);
    if (address.governorate) parts.push(address.governorate);

    return parts.join('، ') || address.label || '';
  }, []);

  return {
    isLoaded,
    error,
    geocode,
    reverseGeocode,
    autosuggest,
    search,
    calculateDistance,
    formatAddress,
  };
}

// Hook for getting current GPS location
export function useGeolocation() {
  const [location, setLocation] = useState<Coordinates | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const getCurrentLocation = useCallback((): Promise<Coordinates> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('الموقع الجغرافي غير مدعوم في متصفحك'));
        return;
      }

      setLoading(true);
      setError(null);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setLocation(coords);
          setLoading(false);
          resolve(coords);
        },
        (err) => {
          let errorMessage = 'لم نتمكن من الحصول على موقعك';
          switch (err.code) {
            case err.PERMISSION_DENIED:
              errorMessage = 'تم رفض إذن الموقع. يرجى السماح بالوصول للموقع من إعدادات المتصفح';
              break;
            case err.POSITION_UNAVAILABLE:
              errorMessage = 'معلومات الموقع غير متاحة';
              break;
            case err.TIMEOUT:
              errorMessage = 'انتهت مهلة طلب الموقع';
              break;
          }
          setError(errorMessage);
          setLoading(false);
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    });
  }, []);

  return {
    location,
    error,
    loading,
    getCurrentLocation,
  };
}
