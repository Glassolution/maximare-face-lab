import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function useFriendActions() {
  const sendRequest = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase.rpc('send_friend_request', { target_user_id: targetUserId });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success('Pedido de amizade enviado!');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao enviar pedido');
      return false;
    }
  };

  const acceptRequest = async (requesterId: string) => {
    try {
      const { data, error } = await supabase.rpc('accept_friend_request', { requester_uid: requesterId });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success('Amizade aceita!');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao aceitar pedido');
      return false;
    }
  };

  const rejectRequest = async (requesterId: string) => {
    try {
      const { data, error } = await supabase.rpc('reject_friend_request', { requester_uid: requesterId });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.info('Pedido recusado.');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao recusar pedido');
      return false;
    }
  };

  const cancelRequest = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase.rpc('cancel_friend_request', { target_uid: targetUserId });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.info('Pedido cancelado.');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar pedido');
      return false;
    }
  };

  const unfriend = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase.rpc('unfriend', { target_uid: targetUserId });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.info('Amizade desfeita.');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao desfazer amizade');
      return false;
    }
  };

  const blockUser = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase.rpc('block_user', { target_uid: targetUserId });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success('Usuário bloqueado.');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao bloquear usuário');
      return false;
    }
  };

  const unblockUser = async (targetUserId: string) => {
    try {
      const { data, error } = await supabase.rpc('unblock_user', { target_uid: targetUserId });
      if (error) throw error;
      if (!data.success) throw new Error(data.error);
      toast.success('Usuário desbloqueado.');
      return true;
    } catch (error: any) {
      toast.error(error.message || 'Erro ao desbloquear usuário');
      return false;
    }
  };

  return {
    sendRequest,
    acceptRequest,
    rejectRequest,
    cancelRequest,
    unfriend,
    blockUser,
    unblockUser
  };
}
