'use client';

import { useState, useEffect, useRef } from 'react';
import { useLocale } from 'next-intl';
import Link from 'next/link';
import {
  Truck,
  Store,
  MapPin,
  ChevronDown,
  Home,
  Briefcase,
  Plus,
  Check,
  Clock,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useOrderMode, type SavedAddress } from '@/lib/contexts/OrderModeContext';
import { cn } from '@/lib/utils';

interface DeliveryModeSelectorProps {
  className?: string;
}

export function DeliveryModeSelector({ className }: DeliveryModeSelectorProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';

  const { orderType, setOrderType, selectedAddress, setSelectedAddress, isDelivery } =
    useOrderMode();

  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [showAddressDropdown, setShowAddressDropdown] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Check auth and load addresses
  useEffect(() => {
    async function loadData() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setIsAuthenticated(true);

        // Load saved addresses
        const { data: addressData } = await supabase
          .from('addresses')
          .select(
            `
            id,
            label,
            address_line1,
            address_line2,
            city,
            area,
            is_default
          `
          )
          .eq('user_id', user.id)
          .order('is_default', { ascending: false });

        if (addressData && addressData.length > 0) {
          setAddresses(addressData);
          // Auto-select default address if none selected
          if (!selectedAddress) {
            const defaultAddr = addressData.find((a) => a.is_default) || addressData[0];
            setSelectedAddress(defaultAddr);
          }
        }
      }
      setIsLoading(false);
    }
    loadData();
  }, [selectedAddress, setSelectedAddress]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowAddressDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get icon for address label
  const getAddressIcon = (label: string) => {
    const lowerLabel = label.toLowerCase();
    if (lowerLabel.includes('home') || lowerLabel.includes('منزل') || lowerLabel.includes('بيت')) {
      return <Home className="w-4 h-4" />;
    }
    if (lowerLabel.includes('work') || lowerLabel.includes('عمل') || lowerLabel.includes('شغل')) {
      return <Briefcase className="w-4 h-4" />;
    }
    return <MapPin className="w-4 h-4" />;
  };

  // Format address display
  const formatAddress = (address: SavedAddress) => {
    const parts = [address.address_line1];
    if (address.area) parts.push(address.area);
    return parts.join('، ');
  };

  if (isLoading) {
    return (
      <div className={cn('px-4', className)}>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-3 animate-pulse">
          <div className="flex gap-2">
            <div className="flex-1 h-12 bg-slate-100 rounded-xl" />
            <div className="flex-1 h-12 bg-slate-100 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('px-4', className)}>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm">
        {/* Order Type Toggle */}
        <div className="p-2">
          <div className="flex bg-slate-100 rounded-xl p-1">
            {/* Delivery Option */}
            <button
              onClick={() => setOrderType('delivery')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200',
                isDelivery
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Truck className={cn('w-5 h-5', isDelivery ? 'text-primary' : '')} />
              <span>{isRTL ? 'توصيل' : 'Delivery'}</span>
            </button>

            {/* Pickup Option */}
            <button
              onClick={() => setOrderType('pickup')}
              className={cn(
                'flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200',
                !isDelivery
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              <Store className={cn('w-5 h-5', !isDelivery ? 'text-primary' : '')} />
              <span>{isRTL ? 'استلام من المتجر' : 'Pickup'}</span>
            </button>
          </div>
        </div>

        {/* Address Selector - Only for Delivery */}
        {isDelivery && (
          <div className="border-t border-slate-100">
            {isAuthenticated && addresses.length > 0 ? (
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setShowAddressDropdown(!showAddressDropdown)}
                  className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 text-start min-w-0">
                    <p className="text-xs text-slate-500">{isRTL ? 'توصيل إلى' : 'Deliver to'}</p>
                    <p className="font-medium text-slate-900 truncate">
                      {selectedAddress
                        ? selectedAddress.label
                        : isRTL
                          ? 'اختر عنوان'
                          : 'Select address'}
                    </p>
                    {selectedAddress && (
                      <p className="text-xs text-slate-500 truncate">
                        {formatAddress(selectedAddress)}
                      </p>
                    )}
                  </div>
                  <ChevronDown
                    className={cn(
                      'w-5 h-5 text-slate-400 transition-transform',
                      showAddressDropdown && 'rotate-180'
                    )}
                  />
                </button>

                {/* Address Dropdown */}
                {showAddressDropdown && (
                  <div className="absolute top-full left-0 right-0 z-50 bg-white border border-slate-200 rounded-xl shadow-lg mt-1 max-h-64 overflow-y-auto">
                    {addresses.map((address) => (
                      <button
                        key={address.id}
                        onClick={() => {
                          setSelectedAddress(address);
                          setShowAddressDropdown(false);
                        }}
                        className={cn(
                          'w-full p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0',
                          selectedAddress?.id === address.id && 'bg-primary/5'
                        )}
                      >
                        <div className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center flex-shrink-0">
                          {getAddressIcon(address.label)}
                        </div>
                        <div className="flex-1 text-start min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-slate-900">{address.label}</p>
                            {address.is_default && (
                              <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                                {isRTL ? 'افتراضي' : 'Default'}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 truncate">
                            {formatAddress(address)}
                          </p>
                        </div>
                        {selectedAddress?.id === address.id && (
                          <Check className="w-5 h-5 text-primary flex-shrink-0" />
                        )}
                      </button>
                    ))}

                    {/* Add New Address */}
                    <Link
                      href={`/${locale}/profile/addresses`}
                      className="w-full p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors text-primary"
                    >
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Plus className="w-4 h-4" />
                      </div>
                      <span className="font-medium">
                        {isRTL ? 'إضافة عنوان جديد' : 'Add new address'}
                      </span>
                    </Link>
                  </div>
                )}
              </div>
            ) : isAuthenticated ? (
              // Authenticated but no addresses
              <Link
                href={`/${locale}/profile/addresses`}
                className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                  <Plus className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-primary">
                    {isRTL ? 'إضافة عنوان توصيل' : 'Add delivery address'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isRTL ? 'أضف عنوانك الأول' : 'Add your first address'}
                  </p>
                </div>
              </Link>
            ) : (
              // Not authenticated
              <Link
                href={`/${locale}/auth/login`}
                className="p-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-slate-400" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-700">
                    {isRTL ? 'سجل دخول لإضافة عنوان' : 'Login to add address'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {isRTL ? 'احفظ عناوينك للتوصيل السريع' : 'Save addresses for fast delivery'}
                  </p>
                </div>
              </Link>
            )}
          </div>
        )}

        {/* Pickup Info - Only for Pickup */}
        {!isDelivery && (
          <div className="border-t border-slate-100 p-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                <Store className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-slate-900">
                  {isRTL ? 'استلام من المتجر' : 'Pickup from store'}
                </p>
                <p className="text-xs text-slate-500">
                  {isRTL
                    ? 'اطلب واستلم طلبك من المتجر مباشرة'
                    : 'Order and pick up directly from the store'}
                </p>
              </div>
              <div className="flex items-center gap-1 text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                <Clock className="w-3 h-3" />
                <span>{isRTL ? 'أسرع' : 'Faster'}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DeliveryModeSelector;
