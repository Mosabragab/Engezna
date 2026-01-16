// HERE Maps Configuration for Engezna
// https://developer.here.com/

export const HERE_CONFIG = {
  // API Key from environment variable
  apiKey: process.env.NEXT_PUBLIC_HERE_API_KEY || '',

  // Egypt center coordinates (Beni Suef area - primary market)
  defaultCenter: {
    lat: 29.0744, // Beni Suef latitude
    lng: 31.0986, // Beni Suef longitude
  },

  // Default zoom levels
  defaultZoom: 14,
  cityZoom: 12,
  countryZoom: 6,

  // Map language
  language: 'ar',

  // Supported regions (Egypt only for now)
  regions: ['EGY'],
  countryCode: 'EGY',

  // API endpoints
  endpoints: {
    geocode: 'https://geocode.search.hereapi.com/v1/geocode',
    reverseGeocode: 'https://revgeocode.search.hereapi.com/v1/revgeocode',
    autosuggest: 'https://autosuggest.search.hereapi.com/v1/autosuggest',
    browse: 'https://browse.search.hereapi.com/v1/browse',
  },

  // Map bounds for Egypt (to restrict searches)
  egyptBounds: {
    north: 31.8,
    south: 22.0,
    east: 36.9,
    west: 24.7,
  },
};

// Validate API key exists
export function validateHereApiKey(): boolean {
  if (!HERE_CONFIG.apiKey) {
    console.warn('⚠️ HERE Maps API key not configured. Add NEXT_PUBLIC_HERE_API_KEY to .env.local');
    return false;
  }
  return true;
}

// Export type for coordinates
export interface Coordinates {
  lat: number;
  lng: number;
}

// Export type for address
export interface HereAddress {
  label?: string;
  street?: string;
  houseNumber?: string;
  city?: string;
  district?: string;
  governorate?: string;
  postalCode?: string;
  countryCode?: string;
}

// Export type for search result
export interface HereSearchResult {
  title: string;
  id: string;
  position: Coordinates;
  address: HereAddress;
  distance?: number;
  categories?: Array<{ id: string; name: string }>;
}

// Commission settings type
export interface CommissionSettings {
  enabled: boolean;
  default_rate: number;
  max_rate: number;
  grace_period_days: number;
  grace_period_enabled: boolean;
  customer_service_fee: number;
  customer_service_fee_enabled: boolean;
}

// Default commission settings (6 months grace, 7% max, 0% customer fee)
export const DEFAULT_COMMISSION_SETTINGS: CommissionSettings = {
  enabled: true,
  default_rate: 7.0,
  max_rate: 7.0,
  grace_period_days: 180, // 6 months
  grace_period_enabled: true,
  customer_service_fee: 0.0,
  customer_service_fee_enabled: false,
};
// Build trigger: 1765502394
