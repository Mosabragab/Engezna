'use client';

import { useState, useEffect } from 'react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { LocationPicker } from './LocationPicker';
import { createClient } from '@/lib/supabase/client';
import { getCachedGovernorates, getCachedAllGovernorates } from '@/lib/cache/cached-queries';
import { Loader2 } from 'lucide-react';

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
}

interface City {
  id: string;
  name_ar: string;
  name_en: string;
  governorate_id: string;
  is_active: boolean;
}

interface LocationData {
  governorate_id: string | null;
  city_id: string | null;
  latitude: number | null;
  longitude: number | null;
  address_details?: string;
}

interface LocationSelectorProps {
  value: LocationData;
  onChange: (data: LocationData) => void;
  showMap?: boolean;
  required?: boolean;
  disabled?: boolean;
  onlyActive?: boolean; // Only show active governorates/cities
}

export function LocationSelector({
  value,
  onChange,
  showMap = true,
  required = false,
  disabled = false,
  onlyActive = true,
}: LocationSelectorProps) {
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingGovernorates, setIsLoadingGovernorates] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);

  const supabase = createClient();

  // Fetch governorates on mount
  useEffect(() => {
    async function fetchGovernorates() {
      const data = onlyActive ? await getCachedGovernorates() : await getCachedAllGovernorates();

      setGovernorates(data);
      setIsLoadingGovernorates(false);
    }

    fetchGovernorates();
  }, [onlyActive]);

  // Fetch cities when governorate changes
  useEffect(() => {
    async function fetchCities() {
      if (!value.governorate_id) {
        setCities([]);
        return;
      }

      setIsLoadingCities(true);

      let query = supabase
        .from('cities')
        .select('id, name_ar, name_en, governorate_id, is_active')
        .eq('governorate_id', value.governorate_id)
        .order('name_ar', { ascending: true });

      if (onlyActive) {
        query = query.eq('is_active', true);
      }

      const { data, error } = await query;

      if (!error && data) {
        setCities(data);

        // Auto-select if only one city
        if (data.length === 1 && !value.city_id) {
          onChange({ ...value, city_id: data[0].id });
        }
      }
      setIsLoadingCities(false);
    }

    fetchCities();
  }, [value.governorate_id, onlyActive, supabase]);

  const handleGovernorateChange = (governorateId: string) => {
    onChange({
      ...value,
      governorate_id: governorateId,
      city_id: null, // Reset city when governorate changes
    });
  };

  const handleCityChange = (cityId: string) => {
    onChange({
      ...value,
      city_id: cityId,
    });
  };

  const handleLocationChange = (coords: { lat: number; lng: number }, address?: string) => {
    onChange({
      ...value,
      latitude: coords.lat,
      longitude: coords.lng,
      address_details: address || value.address_details,
    });
  };

  return (
    <div className="space-y-4">
      {/* Governorate Select */}
      <div className="space-y-2">
        <Label htmlFor="governorate">
          المحافظة {required && <span className="text-red-500">*</span>}
        </Label>
        <Select
          value={value.governorate_id || ''}
          onValueChange={handleGovernorateChange}
          disabled={disabled || isLoadingGovernorates}
        >
          <SelectTrigger id="governorate" className="w-full">
            {isLoadingGovernorates ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري التحميل...</span>
              </div>
            ) : (
              <SelectValue placeholder="اختر المحافظة" />
            )}
          </SelectTrigger>
          <SelectContent>
            {governorates.map((gov) => (
              <SelectItem key={gov.id} value={gov.id}>
                {gov.name_ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* City Select */}
      <div className="space-y-2">
        <Label htmlFor="city">المدينة {required && <span className="text-red-500">*</span>}</Label>
        <Select
          value={value.city_id || ''}
          onValueChange={handleCityChange}
          disabled={disabled || !value.governorate_id || isLoadingCities}
        >
          <SelectTrigger id="city" className="w-full">
            {isLoadingCities ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>جاري التحميل...</span>
              </div>
            ) : (
              <SelectValue
                placeholder={value.governorate_id ? 'اختر المدينة' : 'اختر المحافظة أولاً'}
              />
            )}
          </SelectTrigger>
          <SelectContent>
            {cities.map((city) => (
              <SelectItem key={city.id} value={city.id}>
                {city.name_ar}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* GPS Location Picker */}
      {showMap && value.city_id && (
        <div className="space-y-2">
          <Label>
            📍 حدد موقعك على الخريطة {required && <span className="text-red-500">*</span>}
          </Label>
          <LocationPicker
            value={
              value.latitude && value.longitude
                ? { lat: value.latitude, lng: value.longitude }
                : null
            }
            onChange={handleLocationChange}
            disabled={disabled}
            required={required}
          />
        </div>
      )}
    </div>
  );
}

export default LocationSelector;
