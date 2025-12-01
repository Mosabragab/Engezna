'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

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
}

interface FavoriteProvider {
  id: string
  provider_id: string
  created_at: string
  provider: Provider
}

export function useFavorites() {
  const [favoriteProviders, setFavoriteProviders] = useState<Provider[]>([])
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)

  // Check auth and load favorites
  useEffect(() => {
    const supabase = createClient()

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)

      if (user) {
        await loadFavorites(user.id)
      } else {
        setIsLoading(false)
      }
    }

    init()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        await loadFavorites(session.user.id)
      } else {
        setFavoriteProviders([])
        setFavoriteIds(new Set())
        setIsLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadFavorites = async (userId: string) => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(`
          id,
          provider_id,
          created_at,
          provider:providers (
            id,
            name_ar,
            name_en,
            description_ar,
            description_en,
            category,
            logo_url,
            cover_image_url,
            rating,
            total_reviews,
            delivery_fee,
            min_order_amount,
            estimated_delivery_time_min,
            status
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error loading favorites:', error)
        return
      }

      if (data) {
        const providers = data
          .filter((f: any) => f.provider)
          .map((f: any) => f.provider as Provider)

        const ids = new Set(data.map((f: any) => f.provider_id))

        setFavoriteProviders(providers)
        setFavoriteIds(ids)
      }
    } catch (error) {
      console.error('Error loading favorites:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addToFavorites = useCallback(async (providerId: string) => {
    if (!user) return false

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: user.id, provider_id: providerId })

      if (error) {
        console.error('Error adding favorite:', error)
        return false
      }

      // Update local state
      setFavoriteIds(prev => new Set([...prev, providerId]))

      // Reload to get full provider data
      await loadFavorites(user.id)
      return true
    } catch (error) {
      console.error('Error adding favorite:', error)
      return false
    }
  }, [user])

  const removeFromFavorites = useCallback(async (providerId: string) => {
    if (!user) return false

    const supabase = createClient()

    try {
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('provider_id', providerId)

      if (error) {
        console.error('Error removing favorite:', error)
        return false
      }

      // Update local state
      setFavoriteIds(prev => {
        const newSet = new Set(prev)
        newSet.delete(providerId)
        return newSet
      })
      setFavoriteProviders(prev => prev.filter(p => p.id !== providerId))

      return true
    } catch (error) {
      console.error('Error removing favorite:', error)
      return false
    }
  }, [user])

  const toggleFavorite = useCallback(async (providerId: string) => {
    if (favoriteIds.has(providerId)) {
      return await removeFromFavorites(providerId)
    } else {
      return await addToFavorites(providerId)
    }
  }, [favoriteIds, addToFavorites, removeFromFavorites])

  const isFavorite = useCallback((providerId: string) => {
    return favoriteIds.has(providerId)
  }, [favoriteIds])

  return {
    favoriteProviders,
    favoriteIds,
    isLoading,
    isAuthenticated: !!user,
    addToFavorites,
    removeFromFavorites,
    toggleFavorite,
    isFavorite,
    refetch: () => user && loadFavorites(user.id),
  }
}
