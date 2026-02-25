import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface FriendRequest {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: 'pending' | 'accepted' | 'rejected' | 'canceled';
  created_at: string;
  requester?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
  addressee?: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export function useFriendRequests() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data) {
          const userIds = new Set<string>();
          data.forEach(r => {
              userIds.add(r.requester_id);
              userIds.add(r.addressee_id);
          });
          
          if (userIds.size === 0) {
             setIncomingRequests([]);
             setOutgoingRequests([]);
             return;
          }

          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', Array.from(userIds));

          if (profilesError) throw profilesError;

          const enrichedRequests = data.map(r => ({
              ...r,
              requester: profiles?.find(p => p.id === r.requester_id),
              addressee: profiles?.find(p => p.id === r.addressee_id)
          })) as FriendRequest[];

          setIncomingRequests(enrichedRequests.filter(r => r.addressee_id === user.id));
          setOutgoingRequests(enrichedRequests.filter(r => r.requester_id === user.id));
      } else {
          setIncomingRequests([]);
          setOutgoingRequests([]);
      }

    } catch (error: any) {
      console.error('Error fetching friend requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const sendRequest = async (username: string) => {
    try {
      const { data, error } = await supabase.rpc('send_friend_request', { target_username: username });
      if (error) throw error;
      if (data && !data.success) {
          throw new Error(data.error || 'Falha ao enviar solicitação');
      }
      
      toast({
        title: 'Solicitação enviada',
        description: `Solicitação de amizade enviada para @${username}`,
      });
      fetchRequests();
      return true;
    } catch (error: any) {
      toast({
        title: 'Erro ao enviar solicitação',
        description: error.message,
        variant: 'destructive',
      });
      return false;
    }
  };

  const respondRequest = async (requestId: string, action: 'accepted' | 'rejected') => {
    try {
      const { data, error } = await supabase.rpc('respond_friend_request', { request_id: requestId, action });
      if (error) throw error;
      if (data && !data.success) {
          throw new Error(data.error || 'Falha ao responder solicitação');
      }

      toast({
        title: action === 'accepted' ? 'Solicitação aceita' : 'Solicitação recusada',
        description: action === 'accepted' ? 'Agora vocês são amigos!' : 'Solicitação removida.',
      });
      fetchRequests();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const cancelRequest = async (requestId: string) => {
    try {
      const { data, error } = await supabase.rpc('cancel_friend_request', { request_id: requestId });
      if (error) throw error;
       if (data && !data.success) {
          throw new Error(data.error || 'Falha ao cancelar solicitação');
      }

      toast({
        title: 'Solicitação cancelada',
        description: 'A solicitação de amizade foi cancelada.',
      });
      fetchRequests();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchRequests();
    }
  }, [user]);

  return { incomingRequests, outgoingRequests, loading, fetchRequests, sendRequest, respondRequest, cancelRequest };
}
