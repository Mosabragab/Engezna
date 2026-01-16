'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Search, Loader2, X, Check, Map } from 'lucide-react';
import { useHereMaps, useGeolocation } from '@/hooks/useHereMaps';
import { Coordinates, HereSearchResult, HERE_CONFIG } from '@/lib/here-maps/config';
import { cn } from '@/lib/utils';

// Dynamic import for InteractiveMapPicker to avoid SSR issues
const InteractiveMapPicker = dynamic(() => import('./InteractiveMapPicker'), {
  ssr: false,
  loading: () => <div className="animate-pulse bg-gray-200 rounded-lg h-96" />,
});

interface LocationPickerProps {
  value?: { lat: number; lng: number } | null;
  onChange: (coords: { lat: number; lng: number }, address?: string) => void;
  placeholder?: string;
  className?: string;
  required?: boolean;
  disabled?: boolean;
  showMap?: boolean;
}

export function LocationPicker({
  value,
  onChange,
  placeholder = 'ابحث عن موقعك أو استخدم GPS',
  className,
  required = false,
  disabled = false,
  showMap = true,
}: LocationPickerProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<HereSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);

  const searchTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);

  const { isLoaded, error, autosuggest, reverseGeocode, formatAddress } = useHereMaps();
  const { loading: gpsLoading, getCurrentLocation } = useGeolocation();

  // Reverse geocode when value changes externally
  useEffect(() => {
    if (value && !selectedAddress) {
      reverseGeocode(value).then((address) => {
        if (address) {
          setSelectedAddress(formatAddress(address));
        }
      });
    }
  }, [value, selectedAddress, reverseGeocode, formatAddress]);

  // Handle search input with debounce
  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);

      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }

      if (query.length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsSearching(true);
      setShowSuggestions(true);

      searchTimeout.current = setTimeout(async () => {
        const results = await autosuggest(query, value || undefined);
        setSuggestions(results);
        setIsSearching(false);
      }, 300);
    },
    [autosuggest, value]
  );

  // Handle suggestion selection
  const handleSelectSuggestion = useCallback(
    async (suggestion: HereSearchResult) => {
      setSearchQuery('');
      setSuggestions([]);
      setShowSuggestions(false);

      if (suggestion.position.lat && suggestion.position.lng) {
        setSelectedAddress(suggestion.title);
        onChange(suggestion.position, suggestion.title);
      }
    },
    [onChange]
  );

  // Handle GPS location
  const handleGetCurrentLocation = useCallback(async () => {
    try {
      const coords = await getCurrentLocation();
      const address = await reverseGeocode(coords);

      if (address) {
        const formattedAddress = formatAddress(address);
        setSelectedAddress(formattedAddress);
        onChange(coords, formattedAddress);
      } else {
        setSelectedAddress('موقعك الحالي');
        onChange(coords, 'موقعك الحالي');
      }
    } catch (err) {
      console.error('Failed to get location:', err);
    }
  }, [getCurrentLocation, reverseGeocode, formatAddress, onChange]);

  // Clear selection
  const handleClear = useCallback(() => {
    setSelectedAddress('');
    setSearchQuery('');
    setSuggestions([]);
  }, []);

  // Handle map picker selection
  const handleMapSelect = useCallback(
    async (coords: { lat: number; lng: number }) => {
      const address = await reverseGeocode(coords);
      if (address) {
        const formattedAddress = formatAddress(address);
        setSelectedAddress(formattedAddress);
        onChange(coords, formattedAddress);
      } else {
        setSelectedAddress('موقع محدد على الخريطة');
        onChange(coords, 'موقع محدد على الخريطة');
      }
    },
    [reverseGeocode, formatAddress, onChange]
  );

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (error) {
    return (
      <div className={cn('p-4 bg-yellow-50 border border-yellow-200 rounded-lg', className)}>
        <p className="text-sm text-yellow-700">{error}</p>
        <p className="text-xs text-yellow-600 mt-1">يمكنك إدخال العنوان يدوياً بدلاً من ذلك</p>
      </div>
    );
  }

  return (
    <div className={cn('space-y-3', className)}>
      {/* Search Input */}
      <div className="relative" ref={inputRef}>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={placeholder}
              className="pr-10 pl-10"
              dir="rtl"
              disabled={disabled || !isLoaded}
            />
            {isSearching && (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleGetCurrentLocation}
            disabled={disabled || gpsLoading || !isLoaded}
            title="استخدم موقعي الحالي"
            className="shrink-0"
          >
            {gpsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowMapPicker(true)}
            disabled={disabled}
            title="اختر من الخريطة"
            className="shrink-0"
          >
            <Map className="h-4 w-4" />
          </Button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion.id}
                type="button"
                className="w-full px-4 py-3 text-right hover:bg-gray-50 flex items-start gap-3 border-b last:border-b-0 transition-colors"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <span className="text-sm text-gray-700 leading-relaxed">{suggestion.title}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Address Display */}
      {selectedAddress && (
        <div className="flex items-center gap-2 text-sm bg-green-50 border border-green-200 p-3 rounded-lg">
          <Check className="h-4 w-4 text-green-600 shrink-0" />
          <span className="flex-1 text-green-700">{selectedAddress}</span>
          {!disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="text-green-600 hover:text-green-800 p-1"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      )}

      {/* Coordinates Display (for debugging/info) */}
      {value && (
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="h-3 w-3" />
          <span dir="ltr">
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
          </span>
        </div>
      )}

      {/* Map Container - OpenStreetMap embed */}
      {showMap && value && (
        <div className="w-full h-48 rounded-lg overflow-hidden border bg-gray-100 relative">
          <iframe
            src={`https://www.openstreetmap.org/export/embed.html?bbox=${value.lng - 0.01}%2C${value.lat - 0.01}%2C${value.lng + 0.01}%2C${value.lat + 0.01}&layer=mapnik&marker=${value.lat}%2C${value.lng}`}
            className="w-full h-full border-0"
            loading="lazy"
            title="Location Map"
          />
          {/* Link to open in full map */}
          <a
            href={`https://www.openstreetmap.org/?mlat=${value.lat}&mlon=${value.lng}#map=16/${value.lat}/${value.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 left-2 bg-white/90 text-xs px-2 py-1 rounded shadow hover:bg-white transition-colors flex items-center gap-1"
          >
            <MapPin className="w-3 h-3" />
            فتح في خريطة أكبر
          </a>
        </div>
      )}

      {/* Instructions */}
      {!value && !disabled && (
        <p className="text-xs text-gray-500 text-center">
          📍 ابحث عن عنوانك أو اضغط على زر GPS للحصول على موقعك الحالي
        </p>
      )}

      {/* Required indicator */}
      {required && !value && <p className="text-xs text-red-500">* يرجى تحديد موقعك</p>}

      {/* Interactive Map Picker Modal */}
      <InteractiveMapPicker
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onSelect={handleMapSelect}
        initialPosition={value}
        title="اختر موقعك على الخريطة"
      />
    </div>
  );
}

export default LocationPicker;
