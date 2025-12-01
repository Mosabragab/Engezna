'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Provider {
  id: string
  name_ar: string
  name_en: string
  description_ar: string | null
  description_en: string | null
  category: string
  logo_url: string | null
  cover_image_url: string | null
  rating: number
  total_reviews: number
  delivery_fee: number
  min_order_amount: number
  estimated_delivery_time_min: number
  status: string
  is_featured: boolean
}

interface UseProvidersOptions {
  category?: string
  sort?: 'rating' | 'delivery_time' | 'delivery_fee' | 'distance'
  search?: string
  limit?: number
  hasOffers?: boolean
  status?: string[]
}

export function useProviders(options: UseProvidersOptions = {}) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const {
    category,
    sort = 'rating',
    search,
    limit = 20,
    hasOffers,
    status = ['open', 'closed'],
  } = options

  const fetchProviders = useCallback(async (append = false) => {
    setIsLoading(true)
    setError(null)

    const supabase = createClient()

    try {
      let query = supabase
        .from('providers')
        .select('*')
        .in('status', status)

      // Category filter
      if (category && category !== 'all') {
        query = query.eq('category', category)
      }

      // Search filter
      if (search && search.trim()) {
        query = query.or(`name_ar.ilike.%${search}%,name_en.ilike.%${search}%`)
      }

      // Sorting
      switch (sort) {
        case 'rating':
          query = query.order('is_featured', { ascending: false })
            .order('rating', { ascending: false })
          break
        case 'delivery_time':
          query = query.order('estimated_delivery_time_min', { ascending: true })
          break
        case 'delivery_fee':
          query = query.order('delivery_fee', { ascending: true })
          break
        default:
          query = query.order('is_featured', { ascending: false })
            .order('rating', { ascending: false })
      }

      // Pagination
      const currentOffset = append ? offset : 0
      query = query.range(currentOffset, currentOffset + limit - 1)

      const { data, error: fetchError } = await query

      if (fetchError) {
        throw fetchError
      }

      if (data) {
        if (append) {
          setProviders(prev => [...prev, ...data])
        } else {
          setProviders(data)
        }
        setHasMore(data.length === limit)
        setOffset(currentOffset + data.length)
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch providers'))
    } finally {
      setIsLoading(false)
    }
  }, [category, sort, search, limit, status, offset])

  useEffect(() => {
    setOffset(0)
    fetchProviders(false)
  }, [category, sort, search])

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      fetchProviders(true)
    }
  }, [isLoading, hasMore, fetchProviders])

  const refetch = useCallback(() => {
    setOffset(0)
    fetchProviders(false)
  }, [fetchProviders])

  return {
    providers,
    isLoading,
    error,
    hasMore,
    loadMore,
    refetch,
  }
}

// Hook for top-rated providers
export function useTopRatedProviders(limit = 6) {
  return useProviders({
    sort: 'rating',
    limit,
    status: ['open', 'closed'],
  })
}

// Hook for featured/popular providers
export function useFeaturedProviders(limit = 6) {
  const [providers, setProviders] = useState<Provider[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetch() {
      const supabase = createClient()
      const { data } = await supabase
        .from('providers')
        .select('*')
        .eq('is_featured', true)
        .in('status', ['open', 'closed'])
        .order('rating', { ascending: false })
        .limit(limit)

      if (data) {
        setProviders(data)
      }
      setIsLoading(false)
    }
    fetch()
  }, [limit])

  return { providers, isLoading }
}
