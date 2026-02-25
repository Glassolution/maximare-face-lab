import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export interface Friend {
  user_id: string;
  friend_id: string;
  created_at: string;
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    plan_type: string | null;
    visibility_score: string | null;
    last_analysis_score: number | null;
  } | null;
}

export function useFriends() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFriends = async () => {
    if (!user) return;
    setLoading(true);
    try {
        const { data: friendsData, error } = await supabase
            .from('friends')
            .select('user_id, friend_id, created_at')
            .eq('user_id', user.id);

        if (error) throw error;

        if (friendsData && friendsData.length > 0) {
            const friendIds = friendsData.map(f => f.friend_id);
            
            // Fetch profiles
            const { data: profilesData, error: profilesError } = await supabase
                .from('profiles')
                .select('id, username, display_name, avatar_url, plan_type, visibility_score')
                .in('id', friendIds);
            
            if (profilesError) throw profilesError;

            // Fetch user_data for scores
            const { data: userDataList, error: userDataError } = await supabase
                .from('user_data')
                .select('user_id, last_analysis_score')
                .in('user_id', friendIds);
            
            if (userDataError) console.error("Error fetching user data", userDataError);

            const friendsWithProfiles = friendsData.map(f => {
                const profile = profilesData?.find(p => p.id === f.friend_id);
                const userData = userDataList?.find(u => u.user_id === f.friend_id);
                
                return {
                    ...f,
                    profile: profile ? {
                        ...profile,
                        user_id: profile.id, // Compatibility alias
                        last_analysis_score: userData?.last_analysis_score || null
                    } : null
                };
            });
            setFriends(friendsWithProfiles);
        } else {
            setFriends([]);
        }

    } catch (error: any) {
      console.error('Error fetching friends:', error);
      toast({
        title: 'Erro ao carregar amigos',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeFriend = async (friendId: string) => {
    try {
      const { data, error } = await supabase.rpc('remove_friend', { target_friend_id: friendId });
      if (error) throw error;
      
      toast({
        title: 'Amigo removido',
        description: 'Amizade desfeita com sucesso.',
      });
      fetchFriends();
    } catch (error: any) {
      toast({
        title: 'Erro ao remover amigo',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (user) {
      fetchFriends();
    }
  }, [user]);

  return { friends, loading, fetchFriends, removeFriend };
}
