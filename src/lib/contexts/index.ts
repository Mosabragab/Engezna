// Main entry point for location contexts
// Provides backward compatibility while enabling granular access

// Combined provider and backward-compatible hooks
export { LocationProvider, useLocation, useUserLocation } from './LocationContext';

// Granular hooks for better performance (use these when possible)
export { useLocationData } from './LocationDataContext';
export { useLocationHelpers } from './LocationHelpersContext';

// Type exports
export type { Governorate, City, District, UserLocation } from './LocationContext';
