'use client';

import { useLocale } from 'next-intl';
import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Search,
  X,
  User,
  Store,
  ShoppingBag,
  ChevronDown,
  Building,
  Map,
  Check,
} from 'lucide-react';
import { GeoFilter, GeoFilterValue } from './GeoFilter';

// Types
interface BaseItem {
  id: string;
  label: string;
  sublabel?: string;
}

interface CustomerItem extends BaseItem {
  phone?: string;
  email?: string;
  governorate_id?: string;
  city_id?: string;
}

interface ProviderItem extends BaseItem {
  phone?: string;
  governorate_id?: string;
  city_id?: string;
}

interface OrderItem extends BaseItem {
  customer_name?: string;
  total?: number;
}

type ItemType = CustomerItem | ProviderItem | OrderItem;

interface SearchableSelectProps {
  type: 'customer' | 'provider' | 'order';
  value: string;
  onChange: (value: string, item?: ItemType) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  showGeoFilter?: boolean;
  className?: string;
}

export function SearchableSelect({
  type,
  value,
  onChange,
  placeholder,
  label,
  required = false,
  disabled = false,
  showGeoFilter = true,
  className = '',
}: SearchableSelectProps) {
  const locale = useLocale();
  const isRTL = locale === 'ar';
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [items, setItems] = useState<ItemType[]>([]);
  const [filteredItems, setFilteredItems] = useState<ItemType[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemType | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoFilter, setGeoFilter] = useState<GeoFilterValue>({
    governorate_id: null,
    city_id: null,
    district_id: null,
  });

  const loadItems = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();

    try {
      if (type === 'customer') {
        const { data } = await supabase
          .from('profiles')
          .select(
            `
            id,
            full_name,
            phone,
            email,
            default_address:customer_addresses(governorate_id, city_id)
          `
          )
          .eq('role', 'customer')
          .order('full_name')
          .limit(500);

        const customers: CustomerItem[] = (data || []).map((c: any) => ({
          id: c.id,
          label: c.full_name || c.email || c.phone || 'Unknown',
          sublabel: c.email || c.phone,
          phone: c.phone,
          email: c.email,
          governorate_id: c.default_address?.[0]?.governorate_id,
          city_id: c.default_address?.[0]?.city_id,
        }));

        setItems(customers);
      } else if (type === 'provider') {
        const { data } = await supabase
          .from('providers')
          .select('id, name_ar, name_en, phone, governorate_id, city_id')
          .order('name_ar')
          .limit(500);

        const providers: ProviderItem[] = (data || []).map((p: any) => ({
          id: p.id,
          label: locale === 'ar' ? p.name_ar : p.name_en,
          sublabel: p.phone,
          phone: p.phone,
          governorate_id: p.governorate_id,
          city_id: p.city_id,
        }));

        setItems(providers);
      } else if (type === 'order') {
        const { data } = await supabase
          .from('orders')
          .select(
            `
            id,
            order_number,
            total,
            customer:profiles!orders_customer_id_fkey(full_name)
          `
          )
          .order('created_at', { ascending: false })
          .limit(500);

        const orders: OrderItem[] = (data || []).map((o: any) => ({
          id: o.id,
          label: `#${o.order_number}`,
          sublabel: o.customer?.full_name || 'N/A',
          customer_name: o.customer?.full_name,
          total: o.total,
        }));

        setItems(orders);
      }
    } catch (error) {
      console.error('Error loading items:', error);
    }

    setLoading(false);
  }, [locale, type]);

  const filterItems = useCallback(() => {
    let filtered = [...items];

    // Text search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((item) => {
        const searchText = `${item.label} ${item.sublabel || ''}`.toLowerCase();
        return searchText.includes(query);
      });
    }

    // Geo filter (for customers and providers)
    if (type !== 'order' && (geoFilter.governorate_id || geoFilter.city_id)) {
      filtered = filtered.filter((item: CustomerItem | ProviderItem) => {
        if (geoFilter.city_id && item.city_id) {
          return item.city_id === geoFilter.city_id;
        }
        if (geoFilter.governorate_id && item.governorate_id) {
          return item.governorate_id === geoFilter.governorate_id;
        }
        return true;
      });
    }

    setFilteredItems(filtered);
  }, [items, searchQuery, geoFilter, type]);

  // Load items on mount
  useEffect(() => {
    loadItems();
  }, [loadItems]);

  // Filter items when search or geo filter changes
  useEffect(() => {
    filterItems();
  }, [filterItems]);

  // Set selected item when value changes
  useEffect(() => {
    if (value && items.length > 0) {
      const item = items.find((i) => i.id === value);
      if (item) {
        setSelectedItem(item);
      }
    } else {
      setSelectedItem(null);
    }
  }, [value, items]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function handleSelect(item: ItemType) {
    setSelectedItem(item);
    onChange(item.id, item);
    setIsOpen(false);
    setSearchQuery('');
  }

  function handleClear() {
    setSelectedItem(null);
    onChange('');
    setSearchQuery('');
  }

  const getIcon = () => {
    switch (type) {
      case 'customer':
        return <User className="w-4 h-4" />;
      case 'provider':
        return <Store className="w-4 h-4" />;
      case 'order':
        return <ShoppingBag className="w-4 h-4" />;
    }
  };

  const getDefaultPlaceholder = () => {
    switch (type) {
      case 'customer':
        return locale === 'ar' ? 'اختر العميل' : 'Select customer';
      case 'provider':
        return locale === 'ar' ? 'اختر المتجر' : 'Select provider';
      case 'order':
        return locale === 'ar' ? 'اختر الطلب' : 'Select order';
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-2">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      {/* Selected Value / Trigger */}
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`
          flex items-center justify-between gap-2 px-4 py-2.5 border rounded-lg cursor-pointer transition-colors
          ${disabled ? 'bg-slate-100 cursor-not-allowed' : 'bg-white hover:border-slate-300'}
          ${isOpen ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200'}
        `}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-slate-400">{getIcon()}</span>
          {selectedItem ? (
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{selectedItem.label}</p>
              {selectedItem.sublabel && (
                <p className="text-xs text-slate-500 truncate">{selectedItem.sublabel}</p>
              )}
            </div>
          ) : (
            <span className="text-slate-400">{placeholder || getDefaultPlaceholder()}</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {selectedItem && !disabled && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 text-slate-400 hover:text-red-500 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100">
            <div className="relative">
              <Search
                className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400`}
              />
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={locale === 'ar' ? 'بحث...' : 'Search...'}
                className={`w-full ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500`}
                autoFocus
              />
            </div>
          </div>

          {/* Geo Filter */}
          {showGeoFilter && type !== 'order' && (
            <div className="p-2 border-b border-slate-100 bg-slate-50">
              <GeoFilter
                value={geoFilter}
                onChange={setGeoFilter}
                showDistrict={false}
                showClearButton={true}
              />
            </div>
          )}

          {/* Items List */}
          <div className="max-h-60 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-slate-500">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-red-500 border-t-transparent mx-auto mb-2"></div>
                {locale === 'ar' ? 'جاري التحميل...' : 'Loading...'}
              </div>
            ) : filteredItems.length > 0 ? (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  className={`
                    flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors
                    ${item.id === value ? 'bg-red-50' : 'hover:bg-slate-50'}
                  `}
                >
                  <span className={`${item.id === value ? 'text-red-600' : 'text-slate-400'}`}>
                    {getIcon()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-medium truncate ${item.id === value ? 'text-red-600' : 'text-slate-900'}`}
                    >
                      {item.label}
                    </p>
                    {item.sublabel && (
                      <p className="text-xs text-slate-500 truncate">{item.sublabel}</p>
                    )}
                  </div>
                  {item.id === value && <Check className="w-4 h-4 text-red-600" />}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-slate-500">
                {locale === 'ar' ? 'لا توجد نتائج' : 'No results found'}
              </div>
            )}
          </div>

          {/* Count */}
          <div className="p-2 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 text-center">
            {filteredItems.length} {locale === 'ar' ? 'نتيجة' : 'results'}
          </div>
        </div>
      )}
    </div>
  );
}

export default SearchableSelect;
