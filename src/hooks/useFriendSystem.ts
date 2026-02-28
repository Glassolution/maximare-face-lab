import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FriendProfile } from '@/types/friendship';
import { toast } from 'sonner';

// Helper to normalize profile data consistently across the app
// Should match logic in useUserSearch.ts
const normalizeProfile = (rawProfile: any): FriendProfile => {
  const displayName = rawProfile.display_name || rawProfile.full_name || rawProfile.username || `Usuário #${rawProfile.public_id || rawProfile.short_id}`;
  const username = rawProfile.username ?? null;
  
  let avatarUrl = rawProfile.avatar_url;
  // If it's a relative path (not starting with http/https) and not empty, treat as storage path
  if (avatarUrl && !avatarUrl.startsWith('http') && !avatarUrl.startsWith('data:')) {
      // Assuming it's a path in 'avatars' bucket (which is public)
      const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
      // Add cache buster to force refresh if it's the same URL but updated content
      avatarUrl = data.publicUrl + `?t=${Date.now()}`;
  }

  return {
    id: rawProfile.id,
    username,
    display_name: displayName,
    avatar_url: avatarUrl,
    short_id: rawProfile.public_id?.toString() || rawProfile.short_id,
    friendship_status: rawProfile.friendship_status, // Will be overridden or set by caller
    is_requester: rawProfile.is_requester
  };
};

export function useFriends() {
  const { user } = useAuth();
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [fatalError, setFatalError] = useState(false);

  const fetchFriends = useCallback(async () => {
    if (!user || fatalError) return;
    setLoading(true);
    try {
      // 1. Fetch accepted friendships
      const { data: friendships, error } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
            console.error('Critical Error: Friendships table missing. Stopping retries.');
            setFatalError(true);
            toast.error('Erro de sistema: Tabela de amigos não encontrada.');
            return;
        }
        throw error;
      }

      if (!friendships || friendships.length === 0) {
        setFriends([]);
        return;
      }

      // 2. Extract friend IDs
      const friendIds = friendships.map(f => 
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      // 3. Fetch profiles with ALL necessary fields
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name, avatar_url, short_id, public_id') // Added full_name, public_id
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      // 4. Enrich and Normalize
      const friendsList: FriendProfile[] = (profiles || []).map(p => {
        const normalized = normalizeProfile(p);
        return {
          ...normalized,
          friendship_status: 'accepted'
        };
      });

      setFriends(friendsList);
    } catch (error: any) {
      console.error('Error fetching friends:', error);
      toast.error('Erro ao carregar amigos');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchFriends();

    // Realtime subscription for friends list updates
    const channel = supabase
      .channel('friends-list-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'friendships',
          // We can't easily filter by OR in realtime filter syntax for multiple columns securely/simply in one go sometimes,
          // but we can filter by where either column equals user.id if Supabase supports it, 
          // or just listen to all friendships and filter in client (inefficient) or use 2 channels.
          // Actually, Supabase Realtime filters are limited. 
          // Simplest robust way: Listen to table changes where requester_id=user.id OR addressee_id=user.id
          // But 'or' syntax in filter string is tricky.
          // Let's use two subscriptions or just rely on global table events if volume is low, but better be specific.
          // Syntax: "column=eq.value"
          // We will subscribe to changes where we are involved.
          // Ideally: filter: `requester_id=eq.${user.id}` AND another for addressee.
        }, 
        (payload) => {
            // Check if we are involved in this change
            const rec = payload.new as any || payload.old as any;
            if (rec && (rec.requester_id === user?.id || rec.addressee_id === user?.id)) {
                 fetchFriends();
            }
        }
      )
      .subscribe();
      
      // Since we can't do OR in filter string easily, let's create two listeners or one generic?
      // Actually, standard practice: Subscribe to the table, and in callback check if it relates to us.
      // But without filter, we get ALL events from DB (bad for scale).
      // Let's create two channels for safety.
      
      const channel1 = supabase.channel(`friends-req-${user?.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${user?.id}` }, () => fetchFriends())
        .subscribe();

      const channel2 = supabase.channel(`friends-addr-${user?.id}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${user?.id}` }, () => fetchFriends())
        .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, [fetchFriends, user]);

  return { friends, loading, refetch: fetchFriends };
}

export function useFriendRequests() {
  const { user } = useAuth();
  const [incoming, setIncoming] = useState<FriendProfile[]>([]);
  const [outgoing, setOutgoing] = useState<FriendProfile[]>([]);
  const [loading, setLoading] = useState(true);

  const [fatalError, setFatalError] = useState(false);

  const fetchRequests = useCallback(async () => {
    if (!user || fatalError) return;
    setLoading(true);
    try {
      // 1. Fetch pending friendships
      const { data: requests, error } = await supabase
        .from('friendships')
        .select('id, requester_id, addressee_id, status, created_at')
        .eq('status', 'pending')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (error) {
        if (error.code === 'PGRST205' || error.message.includes('does not exist')) {
            console.error('Critical Error: Friendships table missing. Stopping retries.');
            setFatalError(true);
            toast.error('Erro de sistema: Tabela de solicitações não encontrada.');
            return;
        }
        throw error;
      }

      if (!requests || requests.length === 0) {
        setIncoming([]);
        setOutgoing([]);
        return;
      }

      // 2. Extract IDs involved
      const userIds = new Set<string>();
      requests.forEach(r => {
        if (r.requester_id !== user.id) userIds.add(r.requester_id);
        if (r.addressee_id !== user.id) userIds.add(r.addressee_id);
      });

      // 3. Fetch profiles with ALL necessary fields
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, full_name, avatar_url, short_id, public_id') // Added full_name, public_id
        .in('id', Array.from(userIds));

      if (profilesError) throw profilesError;

      // 4. Separate into Incoming and Outgoing
      const incomingList: FriendProfile[] = [];
      const outgoingList: FriendProfile[] = [];

      requests.forEach(r => {
        const isIncoming = r.addressee_id === user.id;
        const otherId = isIncoming ? r.requester_id : r.addressee_id;
        const rawProfile = profiles?.find(p => p.id === otherId);

        if (rawProfile) {
          const normalized = normalizeProfile(rawProfile);
          
          const enriched: FriendProfile = {
            ...normalized,
            friendship_status: isIncoming ? 'pending_received' : 'pending_sent', // Explicit status for UI
            is_requester: !isIncoming
          };
          
          if (isIncoming) incomingList.push(enriched);
          else outgoingList.push(enriched);
        }
      });

      setIncoming(incomingList);
      setOutgoing(outgoingList);
    } catch (error: any) {
      console.error('Error fetching requests:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchRequests();

    if (!user) return;

    // Listen for changes where I am the addressee (incoming requests)
    const channel1 = supabase.channel(`req-incoming-${user.id}`)
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${user.id}` }, 
            () => fetchRequests()
        )
        .subscribe();

    // Listen for changes where I am the requester (outgoing requests updates)
    const channel2 = supabase.channel(`req-outgoing-${user.id}`)
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'friendships', filter: `requester_id=eq.${user.id}` }, 
            () => fetchRequests()
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel1);
        supabase.removeChannel(channel2);
    };
  }, [fetchRequests, user]);

  return { incoming, outgoing, loading, refetch: fetchRequests };
}
