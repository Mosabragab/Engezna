'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface Provider {
  id: string;
  name_ar: string;
  name_en: string;
  description_ar: string | null;
  description_en: string | null;
  category: string;
  logo_url: string | null;
  cover_image_url: string | null;
  rating: number;
  total_reviews: number;
  delivery_fee: number;
  min_order_amount: number;
  estimated_delivery_time_min: number;
  status: string;
  is_featured?: boolean;
  is_verified?: boolean;
}

interface FavoriteProvider {
  id: string;
  provider_id: string;
  created_at: string;
  provider: Provider;
}

export function useFavorites() {
  const [favoriteProviders, setFavoriteProviders] = useState<Provider[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

  // Refs that mirror state. Used inside callbacks that need to read the
  // *current* favorites snapshot without depending on it — depending on
  // it would re-create toggleFavorite/removeFromFavorites on every
  // favorite toggle, breaking React.memo for any consumer that passes
  // these as props (e.g. the 100-card grid in /ar/providers).
  const favoriteIdsRef = useRef(favoriteIds);
  const favoriteProvidersRef = useRef(favoriteProviders);
  useEffect(() => {
    favoriteIdsRef.current = favoriteIds;
  }, [favoriteIds]);
  useEffect(() => {
    favoriteProvidersRef.current = favoriteProviders;
  }, [favoriteProviders]);

  // In-flight guard for toggleFavorite. Without it, a user double-tapping
  // the heart faster than React can commit the optimistic state update
  // (which is what refreshes favoriteIdsRef via the effect above) would
  // hit toggleFavorite twice with the same ref snapshot, causing the
  // second call to issue a duplicate add/remove against the DB. This Set
  // tracks providerIds whose toggle is still in-flight; subsequent calls
  // for the same id are dropped until the first one settles.
  const pendingToggleIdsRef = useRef<Set<string>>(new Set());

  // Check auth and load favorites
  useEffect(() => {
    const supabase = createClient();

    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        await loadFavorites(user.id);
      } else {
        setIsLoading(false);
      }
    }

    init();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadFavorites(session.user.id);
      } else {
        setFavoriteProviders([]);
        setFavoriteIds(new Set());
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadFavorites = async (userId: string) => {
    setIsLoading(true);
    const supabase = createClient();

    try {
      const { data, error } = await supabase
        .from('favorites')
        .select(
          `
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
            status,
            is_featured,
            is_verified
          )
        `
        )
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading favorites:', error);
        return;
      }

      if (data) {
        const providers = data
          .filter((f: any) => f.provider)
          .map((f: any) => f.provider as Provider);

        const ids = new Set(data.map((f: any) => f.provider_id));

        setFavoriteProviders(providers);
        setFavoriteIds(ids);
      }
    } catch (error) {
      console.error('Error loading favorites:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToFavorites = useCallback(
    async (providerId: string) => {
      if (!user) return false;

      const supabase = createClient();

      // Optimistic update - immediately update UI
      setFavoriteIds((prev) => new Set([...prev, providerId]));

      try {
        // Insert favorite
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, provider_id: providerId });

        if (error) {
          // Rollback on error
          setFavoriteIds((prev) => {
            const newSet = new Set(prev);
            newSet.delete(providerId);
            return newSet;
          });
          console.error('Error adding favorite:', error);
          return false;
        }

        // Fetch only the single provider data we need (not all favorites)
        const { data: providerData } = await supabase
          .from('providers')
          .select(
            'id, name_ar, name_en, description_ar, description_en, category, logo_url, cover_image_url, rating, total_reviews, delivery_fee, min_order_amount, estimated_delivery_time_min, status, is_featured, is_verified'
          )
          .eq('id', providerId)
          .single();

        if (providerData) {
          setFavoriteProviders((prev) => [providerData, ...prev]);
        }

        return true;
      } catch (error) {
        // Rollback on error
        setFavoriteIds((prev) => {
          const newSet = new Set(prev);
          newSet.delete(providerId);
          return newSet;
        });
        console.error('Error adding favorite:', error);
        return false;
      }
    },
    [user]
  );

  const removeFromFavorites = useCallback(
    async (providerId: string) => {
      if (!user) return false;

      const supabase = createClient();

      // Capture only this provider's row from the current list so we can
      // re-insert it on failure. We DON'T snapshot the whole favoriteIds
      // / favoriteProviders state — concurrent toggles on other providers
      // (e.g. user adds B while remove(A) is in flight) would otherwise be
      // wiped by a snapshot-restore on rollback. Same delta-only pattern
      // that addToFavorites already uses.
      const removedProvider = favoriteProvidersRef.current.find((p) => p.id === providerId);

      // Optimistic update - immediately update UI
      setFavoriteIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(providerId);
        return newSet;
      });
      setFavoriteProviders((prev) => prev.filter((p) => p.id !== providerId));

      const rollback = () => {
        // Re-add only this providerId; leave other concurrent toggles alone.
        setFavoriteIds((prev) => {
          if (prev.has(providerId)) return prev;
          const newSet = new Set(prev);
          newSet.add(providerId);
          return newSet;
        });
        if (removedProvider) {
          setFavoriteProviders((prev) =>
            prev.some((p) => p.id === providerId) ? prev : [removedProvider, ...prev]
          );
        }
      };

      try {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('provider_id', providerId);

        if (error) {
          rollback();
          console.error('Error removing favorite:', error);
          return false;
        }

        return true;
      } catch (error) {
        rollback();
        console.error('Error removing favorite:', error);
        return false;
      }
    },
    [user]
  );

  const toggleFavorite = useCallback(
    async (providerId: string) => {
      // Read current favorites via ref so this callback's identity is
      // stable — passing it to memoized children (like the 100-card
      // ProviderCard grid) doesn't trigger re-renders on every toggle.

      // Drop rapid re-entries for the same providerId. The optimistic
      // state update in addToFavorites/removeFromFavorites won't be
      // visible on favoriteIdsRef until the React commit fires the
      // mirror effect, so without this guard a fast double-tap reads
      // the same stale snapshot twice and both branches run.
      if (pendingToggleIdsRef.current.has(providerId)) {
        return false;
      }
      pendingToggleIdsRef.current.add(providerId);

      try {
        if (favoriteIdsRef.current.has(providerId)) {
          return await removeFromFavorites(providerId);
        }
        return await addToFavorites(providerId);
      } finally {
        pendingToggleIdsRef.current.delete(providerId);
      }
    },
    [addToFavorites, removeFromFavorites]
  );

  const isFavorite = useCallback(
    (providerId: string) => {
      return favoriteIds.has(providerId);
    },
    [favoriteIds]
  );

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
  };
}
