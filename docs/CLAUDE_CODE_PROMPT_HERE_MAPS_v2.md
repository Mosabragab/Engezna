# 🚀 Claude Code Prompt: HERE Maps Integration + System Cleanup

## 📋 Project Context

**Project:** Engezna (إنجزنا) - Food Delivery Platform for Egypt
**Target Market:** بني سويف وصعيد مصر (Beni Suef & Upper Egypt)
**Repository:** Private GitHub repo  
**Tech Stack:** Next.js 16, TypeScript 5.9.3, React 19.2.1, Supabase, Tailwind CSS 3.4.17, shadcn/ui
**Current Status:** MVP ~92% complete (Session 17 - December 11, 2025)
**Brand Color:** Engezna Blue `#009DE0`

### 🎯 Business Model Summary
- **Grace Period:** 6 months (0% commission) - فترة السماح
- **After Grace Period:** Maximum 7% commission (أقل عمولة في السوق)
- **Competitors:** 25-30%
- **Customer Fees:** 0% (NO service fees)
- **Registration Fees:** 0 EGP forever
- **Delivery:** Providers use their own delivery staff

---

## 🎯 Mission Objectives

You are tasked with implementing HERE Maps integration, cleaning up the location system, and building admin management features. This involves:

1. **Removing the Districts (الأحياء) system entirely** from all interfaces
2. **Implementing HERE Maps** for GPS-based location selection
3. **Updating partnership messaging** to reflect the new offer (6 months free, max 7% commission)
4. **Ensuring NO mention of 6% commission** anywhere (old rate - must be removed)
5. **Building Admin Governorate Management** - activate/deactivate governorates, manage cities
6. **Building Admin Commission Management** - platform settings, governorate overrides, provider overrides
7. **Updating all documentation** files with correct information
8. **Documenting all changes** at the end

---

## 📁 Project Structure to Understand First

Before making any changes, explore and understand:

```
/src
├── app/
│   ├── (customer)/          # Customer-facing pages
│   ├── (provider)/          # Provider/Merchant dashboard
│   │   ├── provider/
│   │   │   ├── register/    # Provider registration flow
│   │   │   ├── dashboard/   # Provider dashboard
│   │   │   └── settings/    # Provider settings
│   ├── (admin)/             # Admin dashboard
│   └── api/                 # API routes
├── components/
│   ├── ui/                  # shadcn/ui components
│   ├── forms/               # Form components
│   ├── maps/                # Map components (create if not exists)
│   └── location/            # Location selectors (modify/create)
├── lib/
│   ├── supabase/            # Supabase client
│   ├── hooks/               # Custom hooks
│   └── utils/               # Utility functions
├── types/                   # TypeScript types
└── locales/                 # Arabic translations (if exists)
```

---

## 🔧 PHASE 1: Remove Districts System

### 1.1 Search and Identify All District References

```bash
# Search for district-related code
grep -r "district" --include="*.tsx" --include="*.ts" src/
grep -r "الحي" --include="*.tsx" --include="*.ts" src/
grep -r "أحياء" --include="*.tsx" --include="*.ts" src/
grep -r "حي" --include="*.tsx" --include="*.ts" src/
```

### 1.2 Files to Modify (Expected)

- [ ] `src/components/location/LocationSelector.tsx` - Remove district dropdown
- [ ] `src/components/forms/ProviderRegistrationForm.tsx` - Remove district field
- [ ] `src/components/forms/CustomerAddressForm.tsx` - Remove district field
- [ ] `src/app/(provider)/provider/register/page.tsx` - Update registration flow
- [ ] `src/app/(provider)/provider/settings/page.tsx` - Update settings
- [ ] `src/app/(admin)/admin/providers/*/page.tsx` - Update admin views
- [ ] `src/types/*.ts` - Remove district types
- [ ] Any API routes that handle districts

### 1.3 Remove District from Forms

**Before (Example):**
```tsx
<FormField name="district_id" label="الحي">
  <Select options={districts} />
</FormField>
```

**After:**
```tsx
// REMOVED - Using GPS instead
```

---

## 🗺️ PHASE 2: HERE Maps Integration

### 2.1 Install Dependencies

```bash
npm install @here/maps-api-for-javascript
# OR use CDN approach (recommended for simpler setup)
```

### 2.2 Create HERE Maps Configuration

Create `/src/lib/here-maps/config.ts`:

```typescript
// HERE Maps Configuration
export const HERE_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_HERE_API_KEY!,
  
  // Egypt center coordinates
  defaultCenter: {
    lat: 29.0,  // Beni Suef area
    lng: 31.1
  },
  
  // Default zoom level
  defaultZoom: 12,
  
  // Map language
  language: 'ar',
  
  // Supported regions (Egypt only for now)
  regions: ['EGY']
};

// Validate API key exists
if (!process.env.NEXT_PUBLIC_HERE_API_KEY) {
  console.warn('⚠️ HERE Maps API key not configured. Add NEXT_PUBLIC_HERE_API_KEY to .env.local');
}
```

### 2.3 Create HERE Maps Hook

Create `/src/lib/hooks/useHereMaps.ts`:

```typescript
'use client';

import { useState, useCallback, useEffect } from 'react';
import { HERE_CONFIG } from '@/lib/here-maps/config';

interface Coordinates {
  lat: number;
  lng: number;
}

interface Address {
  label?: string;
  street?: string;
  city?: string;
  governorate?: string;
  postalCode?: string;
}

interface UseHereMapsReturn {
  isLoaded: boolean;
  error: string | null;
  
  // Geocoding
  geocode: (address: string) => Promise<Coordinates | null>;
  reverseGeocode: (coords: Coordinates) => Promise<Address | null>;
  
  // Autosuggest
  autosuggest: (query: string, coords?: Coordinates) => Promise<Address[]>;
  
  // Distance calculation
  calculateDistance: (from: Coordinates, to: Coordinates) => number;
}

export function useHereMaps(): UseHereMapsReturn {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!HERE_CONFIG.apiKey) {
      setError('HERE Maps API key not configured');
      return;
    }
    setIsLoaded(true);
  }, []);

  // Geocode address to coordinates
  const geocode = useCallback(async (address: string): Promise<Coordinates | null> => {
    try {
      const response = await fetch(
        `https://geocode.search.hereapi.com/v1/geocode?q=${encodeURIComponent(address)}&in=countryCode:EGY&lang=ar&apiKey=${HERE_CONFIG.apiKey}`
      );
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
  const reverseGeocode = useCallback(async (coords: Coordinates): Promise<Address | null> => {
    try {
      const response = await fetch(
        `https://revgeocode.search.hereapi.com/v1/revgeocode?at=${coords.lat},${coords.lng}&lang=ar&apiKey=${HERE_CONFIG.apiKey}`
      );
      const data = await response.json();
      
      if (data.items && data.items.length > 0) {
        const item = data.items[0];
        return {
          label: item.title,
          street: item.address?.street,
          city: item.address?.city,
          governorate: item.address?.state,
          postalCode: item.address?.postalCode
        };
      }
      return null;
    } catch (err) {
      console.error('Reverse geocoding error:', err);
      return null;
    }
  }, []);

  // Autosuggest addresses
  const autosuggest = useCallback(async (query: string, coords?: Coordinates): Promise<Address[]> => {
    try {
      let url = `https://autosuggest.search.hereapi.com/v1/autosuggest?q=${encodeURIComponent(query)}&in=countryCode:EGY&lang=ar&apiKey=${HERE_CONFIG.apiKey}`;
      
      if (coords) {
        url += `&at=${coords.lat},${coords.lng}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      return data.items?.map((item: any) => ({
        label: item.title,
        street: item.address?.street,
        city: item.address?.city,
        governorate: item.address?.state
      })) || [];
    } catch (err) {
      console.error('Autosuggest error:', err);
      return [];
    }
  }, []);

  // Calculate distance between two points (Haversine formula)
  const calculateDistance = useCallback((from: Coordinates, to: Coordinates): number => {
    const R = 6371; // Earth's radius in km
    const dLat = (to.lat - from.lat) * Math.PI / 180;
    const dLng = (to.lng - from.lng) * Math.PI / 180;
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
      Math.sin(dLng/2) * Math.sin(dLng/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }, []);

  return {
    isLoaded,
    error,
    geocode,
    reverseGeocode,
    autosuggest,
    calculateDistance
  };
}
```

### 2.4 Create Location Picker Component

Create `/src/components/maps/LocationPicker.tsx`:

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, Navigation, Search, Loader2 } from 'lucide-react';
import { useHereMaps } from '@/lib/hooks/useHereMaps';

interface LocationPickerProps {
  value?: { lat: number; lng: number };
  onChange: (coords: { lat: number; lng: number }, address?: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationPicker({ 
  value, 
  onChange, 
  placeholder = "ابحث عن موقعك أو استخدم GPS",
  className 
}: LocationPickerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [marker, setMarker] = useState<any>(null);
  
  const { isLoaded, geocode, reverseGeocode, autosuggest } = useHereMaps();

  // Initialize HERE Map
  useEffect(() => {
    if (!isLoaded || !mapRef.current) return;

    const H = (window as any).H;
    if (!H) {
      // Load HERE Maps script dynamically
      const script = document.createElement('script');
      script.src = `https://js.api.here.com/v3/3.1/mapsjs-core.js`;
      script.async = true;
      document.head.appendChild(script);
      
      script.onload = () => {
        const script2 = document.createElement('script');
        script2.src = `https://js.api.here.com/v3/3.1/mapsjs-service.js`;
        document.head.appendChild(script2);
        
        const script3 = document.createElement('script');
        script3.src = `https://js.api.here.com/v3/3.1/mapsjs-ui.js`;
        document.head.appendChild(script3);
        
        const script4 = document.createElement('script');
        script4.src = `https://js.api.here.com/v3/3.1/mapsjs-mapevents.js`;
        document.head.appendChild(script4);
      };
      return;
    }

    initMap(H);
  }, [isLoaded]);

  const initMap = (H: any) => {
    const platform = new H.service.Platform({
      apikey: process.env.NEXT_PUBLIC_HERE_API_KEY
    });

    const defaultLayers = platform.createDefaultLayers();
    
    const map = new H.Map(
      mapRef.current,
      defaultLayers.vector.normal.map,
      {
        center: value || { lat: 29.0744, lng: 31.0986 }, // Beni Suef
        zoom: 14,
        pixelRatio: window.devicePixelRatio || 1
      }
    );

    // Enable map interaction
    const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
    
    // Add UI controls
    const ui = H.ui.UI.createDefault(map, defaultLayers, 'ar-EG');

    // Handle map click
    map.addEventListener('tap', async (evt: any) => {
      const coord = map.screenToGeo(
        evt.currentPointer.viewportX,
        evt.currentPointer.viewportY
      );
      
      updateMarker(map, H, coord);
      
      // Reverse geocode
      const address = await reverseGeocode(coord);
      if (address) {
        setSelectedAddress(address.label || '');
      }
      
      onChange({ lat: coord.lat, lng: coord.lng }, address?.label);
    });

    setMapInstance(map);

    // Add initial marker if value exists
    if (value) {
      updateMarker(map, H, value);
    }

    return () => map.dispose();
  };

  const updateMarker = (map: any, H: any, coords: { lat: number; lng: number }) => {
    // Remove existing marker
    if (marker) {
      map.removeObject(marker);
    }

    // Add new marker
    const newMarker = new H.map.Marker(coords);
    map.addObject(newMarker);
    setMarker(newMarker);
    
    // Center map on marker
    map.setCenter(coords);
  };

  // Handle search input
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length < 3) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    const results = await autosuggest(query, value);
    setSuggestions(results);
    setIsLoading(false);
  };

  // Handle suggestion selection
  const handleSelectSuggestion = async (suggestion: any) => {
    setSearchQuery(suggestion.label);
    setSuggestions([]);
    
    const coords = await geocode(suggestion.label);
    if (coords) {
      onChange(coords, suggestion.label);
      setSelectedAddress(suggestion.label);
      
      if (mapInstance && (window as any).H) {
        updateMarker(mapInstance, (window as any).H, coords);
      }
    }
  };

  // Get current location
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('الموقع الجغرافي غير مدعوم في متصفحك');
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
        
        // Reverse geocode to get address
        const address = await reverseGeocode(coords);
        
        onChange(coords, address?.label);
        setSelectedAddress(address?.label || 'موقعك الحالي');
        
        if (mapInstance && (window as any).H) {
          updateMarker(mapInstance, (window as any).H, coords);
        }
        
        setIsGettingLocation(false);
      },
      (error) => {
        console.error('Geolocation error:', error);
        alert('لم نتمكن من الحصول على موقعك. تأكد من تفعيل خدمات الموقع.');
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Input */}
      <div className="relative">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder={placeholder}
              className="pr-10"
              dir="rtl"
            />
            {isLoading && (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-gray-400" />
            )}
          </div>
          
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            title="استخدم موقعي الحالي"
          >
            {isGettingLocation ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Navigation className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Suggestions Dropdown */}
        {suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className="w-full px-4 py-2 text-right hover:bg-gray-100 flex items-center gap-2"
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <span className="truncate">{suggestion.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected Address Display */}
      {selectedAddress && (
        <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-2 rounded-lg">
          <MapPin className="h-4 w-4" />
          <span>{selectedAddress}</span>
        </div>
      )}

      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-64 rounded-lg border bg-gray-100"
        style={{ minHeight: '250px' }}
      />
      
      {/* Instructions */}
      <p className="text-xs text-gray-500 text-center">
        📍 اضغط على الخريطة لتحديد موقعك بدقة، أو استخدم زر GPS
      </p>
    </div>
  );
}
```

### 2.5 Create Simplified Location Selector

Create `/src/components/location/LocationSelector.tsx`:

```typescript
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
import { LocationPicker } from '@/components/maps/LocationPicker';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
}

interface City {
  id: string;
  name_ar: string;
  name_en: string;
  governorate_id: string;
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
}

export function LocationSelector({ 
  value, 
  onChange, 
  showMap = true,
  required = false 
}: LocationSelectorProps) {
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [isLoadingGovernorates, setIsLoadingGovernorates] = useState(true);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  
  const supabase = createClientComponentClient();

  // Fetch governorates on mount
  useEffect(() => {
    async function fetchGovernorates() {
      const { data, error } = await supabase
        .from('governorates')
        .select('id, name_ar, name_en')
        .eq('is_active', true)
        .order('display_order');
      
      if (!error && data) {
        setGovernorates(data);
      }
      setIsLoadingGovernorates(false);
    }
    
    fetchGovernorates();
  }, []);

  // Fetch cities when governorate changes
  useEffect(() => {
    async function fetchCities() {
      if (!value.governorate_id) {
        setCities([]);
        return;
      }
      
      setIsLoadingCities(true);
      
      const { data, error } = await supabase
        .from('cities')
        .select('id, name_ar, name_en, governorate_id')
        .eq('governorate_id', value.governorate_id)
        .eq('is_active', true)
        .order('display_order');
      
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
  }, [value.governorate_id]);

  const handleGovernorateChange = (governorateId: string) => {
    onChange({
      ...value,
      governorate_id: governorateId,
      city_id: null // Reset city when governorate changes
    });
  };

  const handleCityChange = (cityId: string) => {
    onChange({
      ...value,
      city_id: cityId
    });
  };

  const handleLocationChange = (coords: { lat: number; lng: number }, address?: string) => {
    onChange({
      ...value,
      latitude: coords.lat,
      longitude: coords.lng,
      address_details: address || value.address_details
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
          disabled={isLoadingGovernorates}
        >
          <SelectTrigger id="governorate">
            <SelectValue placeholder="اختر المحافظة" />
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
        <Label htmlFor="city">
          المدينة {required && <span className="text-red-500">*</span>}
        </Label>
        <Select
          value={value.city_id || ''}
          onValueChange={handleCityChange}
          disabled={!value.governorate_id || isLoadingCities}
        >
          <SelectTrigger id="city">
            <SelectValue placeholder={value.governorate_id ? "اختر المدينة" : "اختر المحافظة أولاً"} />
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
            value={value.latitude && value.longitude ? { lat: value.latitude, lng: value.longitude } : undefined}
            onChange={handleLocationChange}
          />
        </div>
      )}
    </div>
  );
}
```

---

## 📝 PHASE 3: Update Partnership Messaging

### 3.1 Search for Old Commission References

```bash
# Find all commission percentage mentions
grep -r "6%" --include="*.tsx" --include="*.ts" src/
grep -r "٦%" --include="*.tsx" --include="*.ts" src/
grep -r "commission" --include="*.tsx" --include="*.ts" src/
grep -r "عمولة" --include="*.tsx" --include="*.ts" src/
```

### 3.2 Key Messages to Update

**OLD Messages (REMOVE/UPDATE):**
- ❌ "عمولة 6%"
- ❌ "6% فقط"
- ❌ Any reference to 6% commission

**NEW Messages (USE THESE):**

```typescript
// Partnership value proposition
const PARTNERSHIP_MESSAGES = {
  // Hero section
  heroTitle: "انضم لعائلة إنجزنا",
  heroSubtitle: "الأقل عمولة في مصر - نحمي ربحك",
  
  // Key benefits
  benefits: {
    freeperiod: {
      title: "6 أشهر مجانية",
      description: "ابدأ بدون أي عمولة لمدة 6 أشهر كاملة - فرصتك للنمو بدون تكلفة"
    },
    lowCommission: {
      title: "أقل عمولة في السوق",
      description: "بعد الفترة المجانية، عمولة لا تتجاوز 7% كحد أقصى - مقارنة بـ 25-30% في المنصات الأخرى"
    },
    noHiddenFees: {
      title: "بدون رسوم خفية",
      description: "لا رسوم تسجيل، لا اشتراك شهري، لا مفاجآت"
    },
    ownDelivery: {
      title: "فريق توصيلك",
      description: "استخدم فريق التوصيل الخاص بك - وفر أكثر"
    }
  },
  
  // Call to action
  cta: {
    primary: "سجل الآن مجاناً",
    secondary: "تعرف على المزيد"
  },
  
  // Commission explanation
  commissionExplanation: `
    نموذج عملنا بسيط وشفاف:
    • أول 6 أشهر: عمولة 0% (صفر) على جميع الطلبات
    • بعد ذلك: عمولة لا تتجاوز 7% كحد أقصى
    • هذه العمولة هي الأدنى في سوق التوصيل المصري
  `,
  
  // Trust badges
  trustBadges: [
    "✅ 0% عمولة لأول 6 أشهر",
    "✅ 7% كحد أقصى بعد الفترة المجانية", 
    "✅ بدون رسوم تسجيل",
    "✅ دعم فني مجاني"
  ]
};
```

### 3.3 Pages to Update

1. **Provider Landing/Registration Page:**
   - `/src/app/(provider)/provider/page.tsx`
   - `/src/app/(provider)/provider/register/page.tsx`

2. **Provider Dashboard:**
   - `/src/app/(provider)/provider/dashboard/page.tsx`
   - Show remaining grace period days

3. **Home Page (if exists):**
   - `/src/app/page.tsx`

4. **About/Partnership Page:**
   - Any marketing pages

### 3.4 Example: Provider Registration Page Update

```tsx
// src/app/(provider)/provider/register/page.tsx

export default function ProviderRegisterPage() {
  return (
    <div className="container max-w-4xl py-8">
      {/* Hero Section */}
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">
          🚀 انضم لعائلة إنجزنا
        </h1>
        <p className="text-xl text-gray-600 mb-6">
          المنصة الأقل عمولة في مصر - نحمي ربحك
        </p>
        
        {/* Trust Badges */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Badge variant="success" className="text-lg px-4 py-2">
            ✅ 0% عمولة لأول 6 أشهر
          </Badge>
          <Badge variant="outline" className="text-lg px-4 py-2">
            ✅ 7% كحد أقصى بعد ذلك
          </Badge>
        </div>
      </div>

      {/* Benefits Grid */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Gift className="h-6 w-6 text-green-500" />
              6 أشهر مجانية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>ابدأ بدون أي عمولة لمدة 6 أشهر كاملة. فرصتك للنمو واكتساب عملاء جدد بدون أي تكلفة.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Percent className="h-6 w-6 text-blue-500" />
              أقل عمولة في السوق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>بعد الفترة المجانية، عمولة <strong>7% كحد أقصى</strong> فقط - مقارنة بـ 25-30% في المنصات الأخرى.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-6 w-6 text-red-500" />
              بدون رسوم خفية
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>لا رسوم تسجيل، لا اشتراك شهري، لا مفاجآت. كل شيء واضح من البداية.</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-6 w-6 text-orange-500" />
              فريق توصيلك
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>استخدم فريق التوصيل الخاص بك. هذا يوفر عليك المزيد ويمنحك تحكم كامل.</p>
          </CardContent>
        </Card>
      </div>

      {/* Registration Form */}
      <Card>
        <CardHeader>
          <CardTitle>سجل متجرك الآن</CardTitle>
          <CardDescription>
            ابدأ رحلة النمو مع إنجزنا - التسجيل مجاني
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProviderRegistrationForm />
        </CardContent>
      </Card>
    </div>
  );
}
```

---

## 🔍 PHASE 4: Comprehensive Cleanup Checklist

### 4.1 Remove ALL District References

- [ ] Remove `district_id` from all forms
- [ ] Remove district dropdowns from UI
- [ ] Remove district validation
- [ ] Update TypeScript types to remove district fields
- [ ] Update API routes (if any handle districts)
- [ ] Remove district-related translations

### 4.2 Remove ALL 6% Commission References

- [ ] Search for "6%" in all files
- [ ] Search for "٦%" (Arabic numeral)
- [ ] Search for "six percent"
- [ ] Update to 7% maximum
- [ ] Update grace period to 6 months (180 days)

### 4.3 Verify Database Schema Alignment

Ensure code matches the new database schema:

```typescript
// src/types/database.ts

interface Provider {
  id: string;
  name_ar: string;
  name_en?: string;
  
  // Location (NO district_id!)
  governorate_id: string;
  city_id: string;
  latitude?: number;    // NEW
  longitude?: number;   // NEW
  
  // Commission
  commission_status: 'in_grace_period' | 'active' | 'exempt';
  grace_period_start?: string;
  grace_period_end?: string;
  custom_commission_rate?: number;
  
  // ... other fields
}

interface CustomerAddress {
  id: string;
  user_id: string;
  governorate_id?: string;
  city_id?: string;
  latitude: number;     // Required
  longitude: number;    // Required
  address_line: string;
  building_number?: string;
  floor_number?: string;
  apartment_number?: string;
  landmark?: string;
  label: string;        // المنزل، العمل، etc
  is_default: boolean;
}
```

---

## 🌍 PHASE 5: Environment Variables

### 5.1 Add HERE Maps API Key

Add to `.env.local`:

```env
# HERE Maps
NEXT_PUBLIC_HERE_API_KEY=your_here_api_key_here
```

### 5.2 Verify All Required Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# HERE Maps
NEXT_PUBLIC_HERE_API_KEY=your_here_api_key

# App Config
NEXT_PUBLIC_APP_NAME=Engezna
NEXT_PUBLIC_APP_URL=https://engezna.com
```

---

## 📚 PHASE 6: Update ALL Documentation Files

### ⚠️ CRITICAL: Fix Brand & Commission Documentation

The following files contain **WRONG information** that MUST be corrected:

### 6.0 Files to Update (MANDATORY)

| File | Current (WRONG ❌) | Correct (✅) |
|------|-------------------|-------------|
| `branding/BRAND_IDENTITY_GUIDE.md` | 9 months, 6%, 2% service fee | **6 months, 7%, 0% service fee** |
| `PRD.md` | "6% commission", "9 months" | **7% max, 6 months** |
| `README.md` | "6% commission" in settlements | **7% max** |
| `claude.md` | "6% platform fee" | **7% max** |

### 6.0.1 Update BRAND_IDENTITY_GUIDE.md - Section 12

**Find and replace in `branding/BRAND_IDENTITY_GUIDE.md`:**

**BEFORE (WRONG ❌):**
```markdown
## 12. Business & Economic Model (Brand-Level)

- **Merchant registration fees:**
  - **0 EGP – forever** (no sign-up fee for service providers).

- **Merchant commission:**
  - 0% for the first **9 months** from platform launch in their city.
  - **6% commission** on order value after that period.

- **Customer service fee:**
  - 0% for the first **12 months** from platform launch.
  - **2% service fee** on order value after that period.
```

**AFTER (CORRECT ✅):**
```markdown
## 12. Business & Economic Model (Brand-Level)

### Merchant Partnership Model (نموذج الشراكة)

- **Registration fees:**
  - **0 EGP – forever** ✅ (no sign-up fee)
  - **No monthly subscription** ✅
  - **No hidden fees** ✅

- **Commission Structure:**
  - **0% for the first 6 months** (Grace Period / فترة السماح)
  - **Maximum 7%** after grace period (lowest in Egyptian market!)
  - Competitors charge 25-30%

- **Customer service fee:**
  - **0% – always** ✅
  - We never charge customers any platform fees
  - This is part of our "No Hidden Fees" promise

- **Own Delivery Model:**
  - Providers use their existing delivery staff
  - No Engezna delivery fleet (Phase 1)
  - Provider keeps full control of delivery experience
```

### 6.0.2 Search and Replace in ALL Documentation

Run these searches across ALL markdown files in the project:

```bash
# Find all commission rate mentions
grep -rn "6%" --include="*.md" .
grep -rn "٦%" --include="*.md" .
grep -rn "six percent" --include="*.md" .
grep -rn "6 percent" --include="*.md" .

# Find all grace period mentions  
grep -rn "9 months" --include="*.md" .
grep -rn "٩ أشهر" --include="*.md" .
grep -rn "9 أشهر" --include="*.md" .
grep -rn "nine months" --include="*.md" .

# Find service fee mentions
grep -rn "2% service" --include="*.md" .
grep -rn "service fee" --include="*.md" .
```

### 6.0.3 Update PRD.md Sections

**Section: Business Model**
- Change "9 months" → "6 months"
- Change "6% commission" → "7% maximum commission"
- Remove any "2% service fee" mentions

**Section: Settlements**
- Change "6% platform commission" → "7% maximum platform commission"
- Update any hardcoded percentages

### 6.0.4 Update README.md Sections

**Search and replace:**
- "6% commission" → "7% maximum commission"
- "6% platform fee" → "7% maximum platform fee"
- Update settlements section to reflect 7%

### 6.0.5 Update claude.md Sections

**Session logs mentioning 6%:**
- Update any mentions of "6% platform fee"
- Update finance page descriptions
- Update settlements system descriptions

---

### 6.1 Create New Project Documentation

At the end of all changes, create/update documentation files:

**Create `/docs/CHANGELOG.md`:**
```markdown
# Changelog

## [Date] - HERE Maps Integration & System Cleanup

### Added
- HERE Maps integration for GPS-based location selection
- LocationPicker component with map and GPS support
- useHereMaps hook for geocoding and reverse geocoding
- customer_addresses table for storing customer locations
- Distance calculation functions

### Changed
- Simplified location system: Governorate → City → GPS (removed Districts)
- Updated provider registration flow to use GPS
- Updated customer address form to use GPS
- Updated partnership messaging (6 months free, 7% max commission)

### Removed
- Districts (الأحياء) system from all interfaces
- District dropdown from all forms
- All references to 6% commission (old rate)
- district_id from provider and address forms

### Fixed
- Commission percentage now correctly shows 7% max
- Grace period correctly shows 6 months (180 days)
```

**Update `/docs/LOCATION_SYSTEM.md`:**
```markdown
# Location System Documentation

## Overview
Engezna uses a simplified location system with GPS integration.

## Structure
```
Governorate (المحافظة)
└── City (المدينة)
    └── GPS Coordinates (latitude, longitude)
        └── Address Details (street, building, etc.)
```

## Components

### LocationSelector
Main component for selecting location with governorate, city, and GPS.

### LocationPicker
HERE Maps integration for selecting precise GPS coordinates.

## HERE Maps Integration
- API: HERE Geocoding & Search API
- Free tier: 250,000 requests/month
- Features used: Geocoding, Reverse Geocoding, Autosuggest
```

**Update `/docs/COMMISSION_SYSTEM.md`:**
```markdown
# Commission System Documentation

## Partnership Model

### Grace Period (فترة السماح)
- Duration: 6 months (180 days)
- Commission: 0%
- Starts: From provider registration date

### After Grace Period
- Maximum commission: 7%
- This is the lowest rate in the Egyptian market
- Competitors charge 25-30%

## Commission Calculation Priority
1. System disabled → 0%
2. In grace period → 0%
3. Provider exempt → 0%
4. Provider custom rate → use it
5. Governorate override → use it
6. Platform default → use it (max 7%)
```

---

## ✅ Final Verification Checklist

Before considering the task complete:

### Location System
- [ ] **No district references** in any UI component
- [ ] **HERE Maps** working for location selection
- [ ] **GPS coordinates** saved to database
- [ ] **All forms** work without districts

### Commission System
- [ ] **No 6% commission** mentions anywhere (code OR documentation)
- [ ] **Partnership messages** updated to:
  - 6 months free (0% commission)
  - Maximum 7% after grace period
  - **NO customer service fees**
- [ ] **Admin commission settings page** working:
  - [ ] Platform-wide settings (enable/disable, default rate, grace period)
  - [ ] Governorate overrides
  - [ ] Provider overrides
  - [ ] Grace period tracking
- [ ] **Provider dashboard** shows grace period status

### Admin Expansion Management
- [ ] **Governorate management page** working:
  - [ ] List all governorates with stats
  - [ ] Activate/deactivate governorates
  - [ ] Manage cities within governorates
- [ ] **Expansion analytics tab** showing:
  - [ ] Providers per governorate
  - [ ] Customers per governorate
  - [ ] Orders per governorate
  - [ ] Readiness score

### Documentation
- [ ] **Documentation** updated:
  - [ ] BRAND_IDENTITY_GUIDE.md - Section 12 fixed
  - [ ] PRD.md - Commission and grace period fixed
  - [ ] README.md - Commission mentions fixed
  - [ ] claude.md - Session logs updated
- [ ] **Environment variables** documented
- [ ] **TypeScript types** updated
- [ ] **Translations files** updated (remove district, update commission messages)

### Testing
- [ ] **No console errors** related to removed features
- [ ] **Commission calculation** returns correct values
- [ ] **Grace period** tracked correctly for new providers
- [ ] **Admin can toggle** governorate active status
- [ ] **Admin can set** commission overrides

---

## 🚨 Important Notes

1. **DO NOT** create new commission percentages - stick to 7% max
2. **DO NOT** add district fields back anywhere
3. **DO NOT** use Google Maps - use HERE Maps only
4. **DO NOT** mention any customer service fees - we charge 0%
5. **ALWAYS** test forms after removing district fields
6. **ENSURE** Arabic text direction (RTL) is maintained
7. **VERIFY** Supabase RLS policies allow location updates
8. **UPDATE** all documentation files (not just code!)

---

## 🎨 PHASE 7: Brand Identity Alignment

### 7.1 Key Brand Messages (MUST BE CONSISTENT)

```
✅ CORRECT MESSAGES:

العربية:
- "0% عمولة لأول 6 أشهر"
- "7% كحد أقصى بعد الفترة المجانية"
- "بدون رسوم تسجيل"
- "بدون رسوم خفية"
- "بدون اشتراك شهري"
- "أقل عمولة في السوق المصري"
- "المنافسون يأخذون 25-30%"

English:
- "0% commission for first 6 months"
- "Maximum 7% after grace period"
- "No registration fees"
- "No hidden fees"
- "No monthly subscription"
- "Lowest commission in Egyptian market"
- "Competitors charge 25-30%"
```

```
❌ WRONG MESSAGES (MUST BE REMOVED):

- "9 months free" / "9 أشهر مجانية"
- "6% commission" / "6% عمولة"
- "2% service fee" / "2% رسوم خدمة"
- "Customer platform fee" / "رسوم منصة للعميل"
- Any variation of 6% or 9 months
```

### 7.2 Brand Colors Reference

When updating partnership pages, use these colors:

| Element | Color | Usage |
|---------|-------|-------|
| Primary Blue | `#009DE0` | CTAs, highlights, Engezna branding |
| Success Green | `#00C27A` | "Free", "0%", success states |
| Gold | `#FFD166` | Premium features, highlights |
| Error Red | `#FF5A5F` | "No fees", comparisons to competitors |

### 7.3 Partnership Page Visual Hierarchy

```
┌─────────────────────────────────────────┐
│  🎁 6 أشهر مجانية (0% عمولة)            │  ← Green highlight
├─────────────────────────────────────────┤
│  📊 7% كحد أقصى بعد الفترة المجانية      │  ← Blue (Primary)
├─────────────────────────────────────────┤
│  ❌ المنافسون: 25-30%                   │  ← Red strikethrough
├─────────────────────────────────────────┤
│  ✅ بدون رسوم تسجيل                     │  ← Green check
│  ✅ بدون رسوم خفية                      │  ← Green check
│  ✅ بدون اشتراك شهري                    │  ← Green check
└─────────────────────────────────────────┘
```

### 7.4 Files to Check for Brand Consistency

```bash
# Search for partnership/commission mentions
grep -rn "commission" --include="*.tsx" --include="*.ts" src/
grep -rn "عمولة" --include="*.tsx" --include="*.ts" src/
grep -rn "grace" --include="*.tsx" --include="*.ts" src/
grep -rn "فترة" --include="*.tsx" --include="*.ts" src/
grep -rn "percent" --include="*.tsx" --include="*.ts" src/
grep -rn "%" --include="*.tsx" --include="*.ts" src/
```

---

## 🏛️ PHASE 9: Admin Governorate & Commission Management

### 9.1 Governorate Expansion Management

**Create/Update Admin Locations Page:** `/admin/locations/page.tsx`

The admin should be able to:
1. **View all governorates** with their status (active/inactive)
2. **Activate/Deactivate governorates** for expansion
3. **Manage cities** within each governorate
4. **View expansion analytics** (providers, customers, orders per governorate)

**UI Structure:**

```tsx
// /src/app/[locale]/admin/locations/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, Building2, Users, ShoppingBag, TrendingUp } from 'lucide-react';

interface Governorate {
  id: string;
  name_ar: string;
  name_en: string;
  is_active: boolean;
  cities_count: number;
  active_cities_count: number;
  providers_count: number;
  customers_count: number;
  orders_count: number;
  // Commission override
  commission_override?: number;
}

export default function AdminLocationsPage() {
  const [governorates, setGovernorates] = useState<Governorate[]>([]);
  const [activeTab, setActiveTab] = useState('governorates');

  // Toggle governorate active status
  const toggleGovernorate = async (id: string, isActive: boolean) => {
    const { error } = await supabase
      .from('governorates')
      .update({ is_active: isActive })
      .eq('id', id);
    
    if (!error) {
      // Refresh data
      fetchGovernorates();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">إدارة المواقع والتوسع</h1>
        <Button>
          <MapPin className="h-4 w-4 ml-2" />
          إضافة محافظة جديدة
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="governorates">المحافظات</TabsTrigger>
          <TabsTrigger value="cities">المدن</TabsTrigger>
          <TabsTrigger value="analytics">تحليلات التوسع</TabsTrigger>
          <TabsTrigger value="commission">إعدادات العمولة</TabsTrigger>
        </TabsList>

        <TabsContent value="governorates">
          {/* Governorates Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {governorates.map((gov) => (
              <Card key={gov.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">{gov.name_ar}</CardTitle>
                  <Switch
                    checked={gov.is_active}
                    onCheckedChange={(checked) => toggleGovernorate(gov.id, checked)}
                  />
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{gov.active_cities_count}/{gov.cities_count} مدينة</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{gov.providers_count} متجر</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                      <span>{gov.orders_count} طلب</span>
                    </div>
                    {gov.commission_override && (
                      <Badge variant="outline">
                        عمولة: {gov.commission_override}%
                      </Badge>
                    )}
                  </div>
                  <Button variant="outline" size="sm" className="mt-4 w-full">
                    إدارة المدن
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="commission">
          {/* Commission Settings - See 9.2 */}
        </TabsContent>
      </Tabs>
    </div>
  );
}
```

### 9.2 Commission Management System

**Create Admin Commission Settings Page:** `/admin/settings/commission/page.tsx`

**Features Required:**
1. **Platform-wide settings** (default commission, grace period)
2. **Per-governorate overrides** (different rates for different regions)
3. **Per-provider overrides** (special deals with specific providers)
4. **Grace period management** (track who's in grace period)
5. **Commission change requests** (approval workflow)

**Database Schema (Already in Migration):**

```sql
-- Platform settings table
CREATE TABLE platform_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default commission settings
INSERT INTO platform_settings (key, value) VALUES 
('commission', '{
  "enabled": true,
  "default_rate": 7.00,
  "max_rate": 7.00,
  "grace_period_days": 180,
  "grace_period_enabled": true
}'::jsonb);

-- Governorate commission overrides
ALTER TABLE governorates ADD COLUMN IF NOT EXISTS commission_override DECIMAL(5,2);

-- Provider commission fields (already exist)
-- providers.commission_status: 'in_grace_period' | 'active' | 'exempt'
-- providers.grace_period_start: TIMESTAMPTZ
-- providers.grace_period_end: TIMESTAMPTZ
-- providers.custom_commission_rate: DECIMAL(5,2)
```

**Commission Settings UI:**

```tsx
// /src/app/[locale]/admin/settings/commission/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { AlertCircle, Percent, Calendar, Building2, Store } from 'lucide-react';

interface CommissionSettings {
  enabled: boolean;
  default_rate: number;
  max_rate: number;
  grace_period_days: number;
  grace_period_enabled: boolean;
}

export default function CommissionSettingsPage() {
  const [settings, setSettings] = useState<CommissionSettings>({
    enabled: true,
    default_rate: 7.00,
    max_rate: 7.00,
    grace_period_days: 180,
    grace_period_enabled: true
  });
  
  const [governorateOverrides, setGovernorateOverrides] = useState<any[]>([]);
  const [providerOverrides, setProviderOverrides] = useState<any[]>([]);

  const saveSettings = async () => {
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ 
        key: 'commission', 
        value: settings,
        updated_at: new Date().toISOString()
      });
    
    if (!error) {
      toast.success('تم حفظ الإعدادات بنجاح');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">إعدادات العمولة</h1>
          <p className="text-muted-foreground">
            إدارة نسب العمولة وفترات السماح للمتاجر
          </p>
        </div>
        <Button onClick={saveSettings}>
          حفظ الإعدادات
        </Button>
      </div>

      {/* Platform-wide Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Percent className="h-5 w-5" />
            الإعدادات العامة
          </CardTitle>
          <CardDescription>
            تطبق على جميع المتاجر ما لم يتم تحديد استثناء
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Commission */}
          <div className="flex items-center justify-between">
            <div>
              <Label>تفعيل نظام العمولة</Label>
              <p className="text-sm text-muted-foreground">
                عند التعطيل، لن يتم احتساب أي عمولة على الطلبات
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => 
                setSettings(prev => ({ ...prev, enabled: checked }))
              }
            />
          </div>

          {/* Default Commission Rate */}
          <div className="space-y-2">
            <Label>نسبة العمولة الافتراضية</Label>
            <div className="flex items-center gap-4">
              <Slider
                value={[settings.default_rate]}
                onValueChange={([value]) => 
                  setSettings(prev => ({ ...prev, default_rate: value }))
                }
                max={settings.max_rate}
                step={0.5}
                className="flex-1"
              />
              <span className="text-2xl font-bold w-16 text-left">
                {settings.default_rate}%
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              الحد الأقصى المسموح: {settings.max_rate}%
            </p>
          </div>

          {/* Grace Period */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  فترة السماح (Grace Period)
                </Label>
                <p className="text-sm text-muted-foreground">
                  فترة بدون عمولة للمتاجر الجديدة
                </p>
              </div>
              <Switch
                checked={settings.grace_period_enabled}
                onCheckedChange={(checked) => 
                  setSettings(prev => ({ ...prev, grace_period_enabled: checked }))
                }
              />
            </div>

            {settings.grace_period_enabled && (
              <div className="space-y-2">
                <Label>مدة فترة السماح (بالأيام)</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="number"
                    value={settings.grace_period_days}
                    onChange={(e) => 
                      setSettings(prev => ({ 
                        ...prev, 
                        grace_period_days: parseInt(e.target.value) 
                      }))
                    }
                    className="w-24"
                  />
                  <span className="text-muted-foreground">
                    = {Math.round(settings.grace_period_days / 30)} شهر تقريباً
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Governorate Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            استثناءات المحافظات
          </CardTitle>
          <CardDescription>
            تحديد نسب عمولة مختلفة لمحافظات معينة
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {governorateOverrides.map((gov) => (
              <div key={gov.id} className="flex items-center justify-between p-3 border rounded-lg">
                <span className="font-medium">{gov.name_ar}</span>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={gov.commission_override || ''}
                    placeholder="افتراضي"
                    className="w-20"
                    onChange={(e) => updateGovernorateCommission(gov.id, e.target.value)}
                  />
                  <span>%</span>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              + إضافة استثناء لمحافظة
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Provider Overrides */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            استثناءات المتاجر
          </CardTitle>
          <CardDescription>
            تحديد نسب عمولة خاصة لمتاجر معينة (صفقات خاصة)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {providerOverrides.map((provider) => (
              <div key={provider.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <span className="font-medium">{provider.name_ar}</span>
                  <Badge variant="outline" className="mr-2">
                    {provider.commission_status === 'in_grace_period' 
                      ? 'في فترة السماح' 
                      : provider.commission_status === 'exempt'
                      ? 'معفى'
                      : 'نشط'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={provider.custom_commission_rate || ''}
                    placeholder="افتراضي"
                    className="w-20"
                    onChange={(e) => updateProviderCommission(provider.id, e.target.value)}
                  />
                  <span>%</span>
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full">
              + إضافة استثناء لمتجر
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Grace Period Overview */}
      <Card>
        <CardHeader>
          <CardTitle>متاجر في فترة السماح</CardTitle>
          <CardDescription>
            المتاجر التي لا تدفع عمولة حالياً
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Table of providers in grace period with:
              - Provider name
              - Grace period start date
              - Grace period end date
              - Days remaining
              - Action to extend/end grace period
          */}
        </CardContent>
      </Card>
    </div>
  );
}
```

### 9.3 Commission Calculation Function

**Create utility function:** `/src/lib/utils/commission.ts`

```typescript
import { createClient } from '@/lib/supabase/client';

interface CommissionResult {
  rate: number;
  source: 'disabled' | 'grace_period' | 'exempt' | 'provider_custom' | 'governorate' | 'platform_default';
  isInGracePeriod: boolean;
  gracePeriodDaysRemaining?: number;
}

export async function calculateProviderCommission(providerId: string): Promise<CommissionResult> {
  const supabase = createClient();
  
  // 1. Get platform settings
  const { data: settingsData } = await supabase
    .from('platform_settings')
    .select('value')
    .eq('key', 'commission')
    .single();
  
  const settings = settingsData?.value || {
    enabled: true,
    default_rate: 7.00,
    max_rate: 7.00,
    grace_period_days: 180,
    grace_period_enabled: true
  };
  
  // 2. If commission system is disabled
  if (!settings.enabled) {
    return { rate: 0, source: 'disabled', isInGracePeriod: false };
  }
  
  // 3. Get provider details
  const { data: provider } = await supabase
    .from('providers')
    .select(`
      commission_status,
      grace_period_start,
      grace_period_end,
      custom_commission_rate,
      governorate_id,
      governorates!inner(commission_override)
    `)
    .eq('id', providerId)
    .single();
  
  if (!provider) {
    return { rate: settings.default_rate, source: 'platform_default', isInGracePeriod: false };
  }
  
  // 4. Check grace period
  if (provider.commission_status === 'in_grace_period' && provider.grace_period_end) {
    const endDate = new Date(provider.grace_period_end);
    const now = new Date();
    
    if (now < endDate) {
      const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      return { 
        rate: 0, 
        source: 'grace_period', 
        isInGracePeriod: true,
        gracePeriodDaysRemaining: daysRemaining
      };
    }
  }
  
  // 5. Check if exempt
  if (provider.commission_status === 'exempt') {
    return { rate: 0, source: 'exempt', isInGracePeriod: false };
  }
  
  // 6. Check provider custom rate
  if (provider.custom_commission_rate !== null) {
    return { 
      rate: Math.min(provider.custom_commission_rate, settings.max_rate), 
      source: 'provider_custom', 
      isInGracePeriod: false 
    };
  }
  
  // 7. Check governorate override
  if (provider.governorates?.commission_override !== null) {
    return { 
      rate: Math.min(provider.governorates.commission_override, settings.max_rate), 
      source: 'governorate', 
      isInGracePeriod: false 
    };
  }
  
  // 8. Use platform default
  return { 
    rate: settings.default_rate, 
    source: 'platform_default', 
    isInGracePeriod: false 
  };
}

// Apply commission to order
export function calculateOrderCommission(orderTotal: number, commissionRate: number): number {
  return Math.round(orderTotal * (commissionRate / 100) * 100) / 100;
}
```

### 9.4 Admin Navigation Updates

**Update AdminSidebar to include new pages:**

```tsx
// Add to /src/components/admin/AdminSidebar.tsx

const menuItems = [
  // ... existing items ...
  {
    title: 'المواقع والتوسع',
    icon: MapPin,
    href: '/admin/locations',
    children: [
      { title: 'المحافظات', href: '/admin/locations' },
      { title: 'المدن', href: '/admin/locations/cities' },
      { title: 'تحليلات التوسع', href: '/admin/locations/analytics' },
    ]
  },
  {
    title: 'إعدادات العمولة',
    icon: Percent,
    href: '/admin/settings/commission',
  },
];
```

### 9.5 Provider Dashboard - Grace Period Display

**Update Provider Dashboard to show grace period status:**

```tsx
// Add to /src/app/[locale]/provider/page.tsx (dashboard)

{provider.commission_status === 'in_grace_period' && (
  <Card className="border-green-200 bg-green-50">
    <CardHeader>
      <CardTitle className="flex items-center gap-2 text-green-700">
        <Gift className="h-5 w-5" />
        أنت في فترة السماح 🎉
      </CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-green-600">
        عمولتك الحالية: <strong>0%</strong>
      </p>
      <p className="text-sm text-green-600 mt-2">
        يتبقى {gracePeriodDaysRemaining} يوم حتى انتهاء فترة السماح
      </p>
      <div className="mt-4 bg-green-100 rounded-full h-2">
        <div 
          className="bg-green-500 h-2 rounded-full"
          style={{ width: `${(gracePeriodDaysRemaining / 180) * 100}%` }}
        />
      </div>
    </CardContent>
  </Card>
)}
```

---

## 📞 Questions to Ask If Unclear

1. What is the exact file structure of the project?
2. Are there any existing map components to replace?
3. What is the current provider registration flow?
4. Are there any other pages showing commission rates?
5. Is there a translations file (i18n) that needs updating?

---

## 🌐 PHASE 8: Update Translations (i18n)

### 8.1 Locate Translation Files

```bash
# Find translation files
find . -name "*.json" -path "*/i18n/*"
find . -name "*.json" -path "*/locales/*"
find . -name "*.json" -path "*/messages/*"
```

Expected locations:
- `src/i18n/messages/ar.json`
- `src/i18n/messages/en.json`
- OR `src/locales/ar.json` and `src/locales/en.json`

### 8.2 Update Arabic Translations (ar.json)

**Add/Update these keys:**

```json
{
  "partnership": {
    "title": "انضم لإنجزنا",
    "subtitle": "أقل عمولة في السوق المصري",
    "gracePeriod": "6 أشهر مجانية",
    "gracePeriodDesc": "ابدأ بدون أي عمولة لمدة 6 أشهر كاملة",
    "commissionAfter": "7% كحد أقصى",
    "commissionAfterDesc": "بعد الفترة المجانية، عمولة 7% فقط - مقارنة بـ 25-30% في المنصات الأخرى",
    "noRegistrationFee": "بدون رسوم تسجيل",
    "noHiddenFees": "بدون رسوم خفية",
    "noMonthlySubscription": "بدون اشتراك شهري",
    "ownDelivery": "استخدم فريق التوصيل الخاص بك",
    "competitors": "المنافسون يأخذون 25-30%",
    "cta": "سجل متجرك الآن - مجاناً"
  },
  "location": {
    "selectGovernorate": "اختر المحافظة",
    "selectCity": "اختر المدينة",
    "markLocation": "حدد موقعك على الخريطة",
    "useCurrentLocation": "استخدم موقعي الحالي",
    "searchAddress": "ابحث عن عنوان",
    "addressDetails": "تفاصيل العنوان",
    "street": "الشارع",
    "buildingNumber": "رقم المبنى",
    "floor": "الطابق",
    "apartment": "الشقة",
    "landmark": "علامة مميزة",
    "gpsRequired": "يرجى تحديد موقعك على الخريطة"
  },
  "provider": {
    "dashboard": {
      "graceStatus": "فترة السماح",
      "daysRemaining": "يتبقى {days} يوم",
      "gracePeriodActive": "أنت في فترة السماح - 0% عمولة",
      "gracePeriodEnded": "انتهت فترة السماح - العمولة الآن 7% كحد أقصى",
      "commissionRate": "نسبة العمولة الحالية"
    }
  }
}
```

### 8.3 Update English Translations (en.json)

**Add/Update these keys:**

```json
{
  "partnership": {
    "title": "Join Engezna",
    "subtitle": "Lowest commission in the Egyptian market",
    "gracePeriod": "6 Months Free",
    "gracePeriodDesc": "Start with 0% commission for 6 full months",
    "commissionAfter": "Maximum 7%",
    "commissionAfterDesc": "After the free period, only 7% commission - compared to 25-30% on other platforms",
    "noRegistrationFee": "No registration fees",
    "noHiddenFees": "No hidden fees",
    "noMonthlySubscription": "No monthly subscription",
    "ownDelivery": "Use your own delivery team",
    "competitors": "Competitors charge 25-30%",
    "cta": "Register your store now - Free"
  },
  "location": {
    "selectGovernorate": "Select Governorate",
    "selectCity": "Select City",
    "markLocation": "Mark your location on the map",
    "useCurrentLocation": "Use my current location",
    "searchAddress": "Search for an address",
    "addressDetails": "Address Details",
    "street": "Street",
    "buildingNumber": "Building Number",
    "floor": "Floor",
    "apartment": "Apartment",
    "landmark": "Landmark",
    "gpsRequired": "Please mark your location on the map"
  },
  "provider": {
    "dashboard": {
      "graceStatus": "Grace Period Status",
      "daysRemaining": "{days} days remaining",
      "gracePeriodActive": "You are in grace period - 0% commission",
      "gracePeriodEnded": "Grace period ended - Commission is now max 7%",
      "commissionRate": "Current commission rate"
    }
  }
}
```

### 8.4 Remove Old/Wrong Translation Keys

**Search and remove any keys with:**
- `6%` or `٦%`
- `9 months` or `9 أشهر`
- `service fee` or `رسوم خدمة`
- `district` or `الحي` or `أحياء` (keep only if needed for legacy)

```bash
# Search for problematic translation values
grep -rn "6%" --include="*.json" src/
grep -rn "9 months" --include="*.json" src/
grep -rn "service fee" --include="*.json" src/
grep -rn "district" --include="*.json" src/
```

---

**End of Prompt**
