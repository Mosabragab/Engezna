'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  MapPin,
  ChevronDown,
  Check,
  Plus,
  Home,
  Briefcase,
  MapPinned,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { useGuestLocation } from '@/lib/hooks/useGuestLocation';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface SavedAddress {
  id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  area: string | null;
  is_default: boolean;
  governorate?: { name_ar: string; name_en: string } | null;
  city_ref?: { name_ar: string; name_en: string } | null;
}

interface AddressSelectorProps {
  className?: string;
}

export function AddressSelector({ className }: AddressSelectorProps) {
  const locale = useLocale();
  const router = useRouter();
  const isRTL = locale === 'ar';

  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<SavedAddress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Guest location hook
  const { location: guestLocation, isLoaded: guestLocationLoaded } = useGuestLocation();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch user and addresses
  const fetchAddresses = useCallback(async () => {
    const supabase = createClient();

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        // Fetch saved addresses
        const { data, error } = await supabase
          .from('addresses')
          .select(
            `
            id,
            label,
            address_line1,
            address_line2,
            city,
            area,
            is_default,
            governorate:governorates(name_ar, name_en),
            city_ref:cities(name_ar, name_en)
          `
          )
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('is_default', { ascending: false });

        if (!error && data) {
          // Transform Supabase response to our interface
          // Supabase returns joined relations - extract the data correctly
          const transformedAddresses: SavedAddress[] = data.map((addr) => {
            // Supabase may return single object or array depending on relation
            const govData = addr.governorate as unknown as {
              name_ar: string;
              name_en: string;
            } | null;
            const cityData = addr.city_ref as unknown as {
              name_ar: string;
              name_en: string;
            } | null;

            return {
              id: addr.id,
              label: addr.label,
              address_line1: addr.address_line1,
              address_line2: addr.address_line2,
              city: addr.city,
              area: addr.area,
              is_default: addr.is_default,
              governorate: govData,
              city_ref: cityData,
            };
          });
          setAddresses(transformedAddresses);
          // Set selected to default address or first one
          const defaultAddr =
            transformedAddresses.find((a) => a.is_default) || transformedAddresses[0];
          if (defaultAddr) {
            setSelectedAddress(defaultAddr);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching addresses:', error);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (guestLocationLoaded) {
      fetchAddresses();
    }
  }, [guestLocationLoaded, fetchAddresses]);

  // Change default address
  const handleSelectAddress = async (address: SavedAddress) => {
    if (!user || address.id === selectedAddress?.id) {
      setIsOpen(false);
      return;
    }

    setIsUpdating(true);
    const supabase = createClient();

    try {
      // Unset current default
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', user.id)
        .eq('is_default', true);

      // Set new default
      await supabase.from('addresses').update({ is_default: true }).eq('id', address.id);

      // Update local state
      setAddresses((prev) =>
        prev.map((a) => ({
          ...a,
          is_default: a.id === address.id,
        }))
      );
      setSelectedAddress({ ...address, is_default: true });
    } catch (error) {
      console.error('Error updating default address:', error);
    }

    setIsUpdating(false);
    setIsOpen(false);
  };

  // Get icon type for address label (returns string to avoid component creation during render)
  const getAddressIconType = (label: string): 'home' | 'work' | 'default' => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('home') || lowerLabel.includes('منزل') || lowerLabel.includes('بيت')) {
      return 'home';
    }
    if (lowerLabel.includes('work') || lowerLabel.includes('عمل') || lowerLabel.includes('شغل')) {
      return 'work';
    }
    return 'default';
  };

  // Get icon component for address label (for use in address list)
  const getAddressIcon = (label: string) => {
    const type = getAddressIconType(label);
    if (type === 'home') return Home;
    if (type === 'work') return Briefcase;
    return MapPinned;
  };

  // Format display address
  const getDisplayAddress = (address: SavedAddress) => {
    const cityName = isRTL
      ? address.city_ref?.name_ar || address.city
      : address.city_ref?.name_en || address.city;
    return address.area ? `${address.area}، ${cityName}` : cityName;
  };

  // For guests or users without addresses - don't show anything
  // (they use the governorate/city selector in the header instead)
  if (!user || addresses.length === 0) {
    return null;
  }

  // For logged-in users with addresses
  // Determine which icon to show based on address label
  const iconType = selectedAddress ? getAddressIconType(selectedAddress.label) : 'default';

  return (
    <div ref={dropdownRef} className={cn('relative', className)}>
      {/* Trigger Button - Styled as a card for homepage placement */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isUpdating}
        className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 transition-all duration-200 hover:border-primary/50 hover:shadow-sm active:scale-[0.99] disabled:opacity-50"
      >
        {/* Icon */}
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          {isUpdating ? (
            <Loader2 className="h-5 w-5 text-primary animate-spin" />
          ) : iconType === 'home' ? (
            <Home className="h-5 w-5 text-primary" />
          ) : iconType === 'work' ? (
            <Briefcase className="h-5 w-5 text-primary" />
          ) : (
            <MapPin className="h-5 w-5 text-primary" />
          )}
        </div>

        {/* Address Info */}
        <div className="flex-1 min-w-0 text-start">
          <span className="text-xs text-slate-500 block">
            {isRTL ? 'التوصيل إلى' : 'Deliver to'}
          </span>
          <span className="font-semibold text-slate-800 truncate block">
            {selectedAddress?.label || (isRTL ? 'اختر عنوان' : 'Select')}
          </span>
          <span className="text-xs text-slate-500 truncate block">
            {selectedAddress ? getDisplayAddress(selectedAddress) : ''}
          </span>
        </div>

        {/* Arrow */}
        <ChevronDown
          className={cn(
            'h-5 w-5 text-slate-400 transition-transform duration-200 flex-shrink-0',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={cn(
            'absolute top-full mt-2 w-72 bg-white rounded-2xl shadow-elegant-lg border border-slate-100 overflow-hidden z-50 animate-slide-up',
            isRTL ? 'right-0' : 'left-0'
          )}
        >
          {/* Header */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">
              {isRTL ? 'عناوين التوصيل' : 'Delivery Addresses'}
            </h3>
          </div>

          {/* Addresses List */}
          <div className="max-h-64 overflow-y-auto">
            {addresses.map((address) => {
              const AddressIcon = getAddressIcon(address.label);
              const isSelected = selectedAddress?.id === address.id;

              return (
                <button
                  key={address.id}
                  onClick={() => handleSelectAddress(address)}
                  className={cn(
                    'w-full p-3 flex items-start gap-3 hover:bg-slate-50 transition-colors text-start',
                    isSelected && 'bg-primary/5'
                  )}
                >
                  <div
                    className={cn(
                      'w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0',
                      isSelected ? 'bg-primary/10' : 'bg-slate-100'
                    )}
                  >
                    <AddressIcon
                      className={cn('h-5 w-5', isSelected ? 'text-primary' : 'text-slate-500')}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          'font-medium text-sm',
                          isSelected ? 'text-primary' : 'text-slate-800'
                        )}
                      >
                        {address.label}
                      </span>
                      {address.is_default && (
                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                          {isRTL ? 'افتراضي' : 'Default'}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">
                      {address.address_line1}
                    </p>
                    <p className="text-xs text-slate-400 truncate">{getDisplayAddress(address)}</p>
                  </div>
                  {isSelected && <Check className="h-5 w-5 text-primary flex-shrink-0 mt-2" />}
                </button>
              );
            })}
          </div>

          {/* Add New Address */}
          <div className="border-t border-slate-100">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push(`/${locale}/profile/addresses`);
              }}
              className="w-full px-4 py-3 flex items-center justify-center gap-2 text-primary hover:bg-slate-50 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span className="text-sm font-medium">
                {isRTL ? 'إضافة عنوان جديد' : 'Add New Address'}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
