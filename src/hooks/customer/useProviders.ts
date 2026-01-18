'use client';

/**
 * useProviders Hook
 *
 * Provides React hooks for fetching and managing provider data.
 * Now uses ProvidersRepository for data access (Phase 3.2).
 */

import { useState, useEffect, useCallback } from 'react';
import { ProvidersRepository, type Provider, type ProviderStatus } from '@/lib/repositories';

// Sort options available in the UI (distance is handled separately)
type UISortOption = 'rating' | 'delivery_time' | 'delivery_fee' | 'distance';

// Map UI sort to repository sort (distance falls back to rating)
type RepositorySortOption =
  | 'rating'
  | 'delivery_time'
  | 'delivery_fee'
  | 'created_at'
  | 'name_ar'
  | 'total_orders';

const mapSortOption = (sort: UISortOption): RepositorySortOption => {
  if (sort === 'distance') {
    // Distance sorting requires geolocation calculation - fallback to rating
    return 'rating';
  }
  return sort;
};

interface UseProvidersOptions {
  category?: string;
  sort?: UISortOption;
  search?: string;
  limit?: number;
  hasOffers?: boolean;
  status?: ProviderStatus[];
  cityId?: string | null;
}

export function useProviders(options: UseProvidersOptions = {}) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);

  const {
    category,
    sort = 'rating',
    search,
    limit = 20,
    status = ['open', 'closed'],
    cityId,
  } = options;

  const fetchProviders = useCallback(
    async (append = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const currentOffset = append ? offset : 0;

        const { data, error: fetchError } = await ProvidersRepository.listProviders({
          status,
          category,
          cityId: cityId ?? undefined,
          search,
          sort: mapSortOption(sort),
          limit,
          offset: currentOffset,
        });

        if (fetchError) {
          throw fetchError;
        }

        if (data) {
          if (append) {
            setProviders((prev) => [...prev, ...data]);
          } else {
            setProviders(data);
          }
          setHasMore(data.length === limit);
          setOffset(currentOffset + data.length);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch providers'));
      } finally {
        setIsLoading(false);
      }
    },
    [category, sort, search, limit, status, offset, cityId]
  );

  useEffect(() => {
    setOffset(0);
    fetchProviders(false);
  }, [category, sort, search, cityId]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchProviders(true);
    }
  }, [isLoading, hasMore, fetchProviders]);

  const refetch = useCallback(() => {
    setOffset(0);
    fetchProviders(false);
  }, [fetchProviders]);

  return {
    providers,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
  };
}

// Hook for top-rated providers
export function useTopRatedProviders(limit = 6) {
  return useProviders({
    sort: 'rating',
    limit,
    status: ['open', 'closed'],
  });
}

// Hook for featured/popular providers
export function useFeaturedProviders(limit = 6) {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      const { data } = await ProvidersRepository.getFeatured(limit);

      if (data) {
        setProviders(data);
      }
      setIsLoading(false);
    }
    fetch();
  }, [limit]);

  return { providers, isLoading };
}
