import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FriendProfile } from '@/types/friendship';
import { useAuth } from '@/hooks/useAuth';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function useUserSearch() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 500); // 500ms debounce
  const [results, setResults] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || !user) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.rpc('search_users', {
        search_query: searchQuery,
        limit_count: 20,
        offset_count: 0
      });

      if (error) throw error;

      if (data) {
        // Map the result to FriendProfile
        const mapped: FriendProfile[] = data.map((item: any) => ({
          id: item.id,
          username: item.username,
          display_name: item.display_name,
          avatar_url: item.avatar_url,
          short_id: item.short_id,
          friendship_status: item.friendship_status,
          is_requester: item.friendship_status === 'pending_sent' // Derived from status
        }));
        setResults(mapped);
      } else {
        setResults([]);
      }
    } catch (err: any) {
      console.error('Search error:', err);
      setError(err.message || 'Erro ao buscar usuários');
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Trigger search when debounced query changes
  useEffect(() => {
    if (debouncedQuery) {
      search(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery, search]);

  return {
    query,
    setQuery,
    results,
    loading,
    error,
    search // Manual trigger if needed
  };
}
