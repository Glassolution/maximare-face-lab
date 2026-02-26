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

      if (error) {
        // Handle specific PostgREST errors
        if (error.code === '42703' || error.code === 'PGRST205') {
            console.error('Schema mismatch in search:', error);
            throw new Error('Erro interno na busca (schema mismatch).');
        }
        throw error;
      }

      if (data) {
        // Map the result to FriendProfile
        const mapped: FriendProfile[] = data.map((item: any) => {
           // Fallback logic
           const displayName = item.display_name || item.username || `Usuário #${item.public_id || item.short_id}`;
           const username = item.username || `user_${item.public_id || item.short_id}`;
           
           // Avatar URL Logic
           let avatarUrl = item.avatar_url;
           // If it's a relative path (not starting with http/https) and not empty, treat as storage path
           if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
               // Assuming it's a path in 'avatars' bucket (which is public)
               const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
               avatarUrl = data.publicUrl;
           }

           if (import.meta.env.VITE_DEBUG_MODE === 'true') {
               console.log('[Search] Mapped user:', { 
                   original: item, 
                   mapped: { displayName, username, avatarUrl } 
               });
           }

           return {
              id: item.id,
              username: username, // Use processed username
              display_name: displayName, // Use processed display_name
              avatar_url: avatarUrl, // Use processed avatarUrl
              short_id: item.public_id?.toString() || item.short_id,
              friendship_status: item.friendship_status,
              is_requester: item.friendship_status === 'pending_sent'
           };
        });
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
