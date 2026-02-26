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
      // 1. Fetch raw requests
      const { data, error } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
          const userIds = new Set<string>();
          data.forEach(r => {
              userIds.add(r.requester_id);
              userIds.add(r.addressee_id);
          });
          
          // 2. Fetch profiles manually to avoid schema relationship errors
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
            .select('id, username, display_name, avatar_url')
            .in('id', Array.from(userIds));

          if (profilesError) throw profilesError;

          const enrichedRequests = data.map((r: any) => ({
              id: r.id,
              requester_id: r.requester_id,
              addressee_id: r.addressee_id,
              status: r.status,
              created_at: r.created_at,
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

  const sendRequest = async (usernameInput: string) => {
    try {
      if (!user) throw new Error('Usuário não autenticado');

      const username = usernameInput.trim();
      let targetUserId;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);
      const isShortId = /^\d{4}$/.test(username);

      if (isUUID) {
          targetUserId = username;
          // Verify if user exists
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', targetUserId)
            .maybeSingle();
            
          if (profileError) throw profileError;
          if (!profile) throw new Error('Usuário não encontrado pelo ID');
      } else if (isShortId) {
          // Search by Short ID
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('short_id', username)
            .maybeSingle();
            
          if (profileError) throw profileError;
          if (!profile) throw new Error('Usuário não encontrado pelo ID curto');
          
          targetUserId = profile.id;
      } else {
          // 1. Find the user ID from the username or display name
          const searchTerm = username;
          
          // Using a simpler query structure to avoid syntax errors with spaces
          // We search for exact match on username OR partial match on display_name
          const { data: profiles, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .or(`username.eq."${searchTerm}",username.ilike."%${searchTerm}%",display_name.ilike."%${searchTerm}%"`)
            .limit(1)
            .maybeSingle();
    
          if (profileError) throw profileError;
          if (!profiles) throw new Error('Usuário não encontrado');
          
          targetUserId = profiles.id;
      }

      if (targetUserId === user.id) {
        throw new Error('Você não pode adicionar a si mesmo');
      }

      // 2. Check if request already exists
      const { data: existingRequest, error: existingError } = await supabase
        .from('friend_requests')
        .select('*')
        .or(`and(requester_id.eq.${user.id},addressee_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},addressee_id.eq.${user.id})`)
        .maybeSingle();
      
      if (existingError && existingError.code !== 'PGRST116') throw existingError;

      if (existingRequest) {
          if (existingRequest.status === 'pending') {
              throw new Error('Já existe uma solicitação pendente');
          } else if (existingRequest.status === 'accepted') {
              throw new Error('Vocês já são amigos');
          } else {
              // If rejected or canceled, we can try to re-send (update status to pending)
              const { error: updateError } = await supabase
                  .from('friend_requests')
                  .update({ 
                      status: 'pending', 
                      requester_id: user.id, 
                      addressee_id: targetUserId,
                      created_at: new Date().toISOString()
                  })
                  .eq('id', existingRequest.id);
                  
              if (updateError) throw updateError;
          }
      } else {
          // 3. Create new request
          const { error: insertError } = await supabase
            .from('friend_requests')
            .insert({
              requester_id: user.id,
              addressee_id: targetUserId,
              status: 'pending'
            });
            
          if (insertError) throw insertError;
      }
      
      toast({
        title: 'Solicitação enviada',
        description: `Solicitação de amizade enviada para @${username}`,
      });
      fetchRequests();
      return true;
    } catch (error: any) {
      console.error(error);
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
