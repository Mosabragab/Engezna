'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

// Order mode types
export type OrderType = 'delivery' | 'pickup';
export type DeliveryTiming = 'asap' | 'scheduled';

export interface SavedAddress {
  id: string;
  label: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  area: string | null;
  is_default: boolean;
}

export interface OrderModeState {
  orderType: OrderType;
  timing: DeliveryTiming;
  selectedAddress: SavedAddress | null;
  scheduledTime: Date | null;
}

interface OrderModeContextValue extends OrderModeState {
  setOrderType: (type: OrderType) => void;
  setTiming: (timing: DeliveryTiming) => void;
  setSelectedAddress: (address: SavedAddress | null) => void;
  setScheduledTime: (time: Date | null) => void;
  isPickup: boolean;
  isDelivery: boolean;
}

const OrderModeContext = createContext<OrderModeContextValue | null>(null);

const STORAGE_KEY = 'engezna_order_mode';

// Default state
const defaultState: OrderModeState = {
  orderType: 'delivery',
  timing: 'asap',
  selectedAddress: null,
  scheduledTime: null,
};

export function OrderModeProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OrderModeState>(defaultState);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setState((prev) => ({
          ...prev,
          orderType: parsed.orderType || 'delivery',
          timing: parsed.timing || 'asap',
        }));
      }
    } catch {
      // Ignore parse errors
    }
  }, []);

  // Save to localStorage when orderType or timing changes
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          orderType: state.orderType,
          timing: state.timing,
        })
      );
    } catch {
      // Ignore storage errors
    }
  }, [state.orderType, state.timing]);

  const setOrderType = useCallback((type: OrderType) => {
    setState((prev) => ({ ...prev, orderType: type }));
    // Dispatch event for other components to react
    window.dispatchEvent(new CustomEvent('orderModeChanged', { detail: { orderType: type } }));
  }, []);

  const setTiming = useCallback((timing: DeliveryTiming) => {
    setState((prev) => ({ ...prev, timing }));
  }, []);

  const setSelectedAddress = useCallback((address: SavedAddress | null) => {
    setState((prev) => ({ ...prev, selectedAddress: address }));
  }, []);

  const setScheduledTime = useCallback((time: Date | null) => {
    setState((prev) => ({ ...prev, scheduledTime: time }));
  }, []);

  const value: OrderModeContextValue = {
    ...state,
    setOrderType,
    setTiming,
    setSelectedAddress,
    setScheduledTime,
    isPickup: state.orderType === 'pickup',
    isDelivery: state.orderType === 'delivery',
  };

  return <OrderModeContext.Provider value={value}>{children}</OrderModeContext.Provider>;
}

export function useOrderMode() {
  const context = useContext(OrderModeContext);
  if (!context) {
    throw new Error('useOrderMode must be used within an OrderModeProvider');
  }
  return context;
}

// Hook that doesn't throw - for optional usage
export function useOrderModeOptional() {
  return useContext(OrderModeContext);
}
