import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { FriendProfile, Friendship } from '@/types/friendship';
import { toast } from 'sonner';

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

      // 3. Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, short_id')
        .in('id', friendIds);

      if (profilesError) throw profilesError;

      // 4. Enrich with status (all are accepted here)
      const friendsList: FriendProfile[] = (profiles || []).map(p => ({
        ...p,
        friendship_status: 'accepted'
      }));

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
  }, [fetchFriends]);

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

      // 2. Extract IDs
      const userIds = new Set<string>();
      requests.forEach(r => {
        userIds.add(r.requester_id);
        userIds.add(r.addressee_id);
      });

      // 3. Fetch profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, username, display_name, avatar_url, short_id')
        .in('id', Array.from(userIds));

      if (profilesError) throw profilesError;

      // 4. Separate into Incoming and Outgoing
      const incomingList: FriendProfile[] = [];
      const outgoingList: FriendProfile[] = [];

      requests.forEach(r => {
        const isIncoming = r.addressee_id === user.id;
        const otherId = isIncoming ? r.requester_id : r.addressee_id;
        const profile = profiles?.find(p => p.id === otherId);

        if (profile) {
          const enriched: FriendProfile = {
            ...profile,
            friendship_status: isIncoming ? 'pending' : 'pending', // UI differentiates by list
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
  }, [fetchRequests]);

  return { incoming, outgoing, loading, refetch: fetchRequests };
}
