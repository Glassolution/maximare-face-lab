import { Button } from '@/components/ui/button';
import { UserPlus, UserMinus, UserX, UserCheck, X, Ban, ShieldCheck } from 'lucide-react';
import { useFriendActions } from '@/hooks/useFriendActions';
import { FriendProfile, FriendshipStatus } from '@/types/friendship';
import { useState } from 'react';

interface FriendActionButtonsProps {
  profile: FriendProfile;
  onActionComplete?: () => void;
  compact?: boolean;
}

export function FriendActionButtons({ profile, onActionComplete, compact = false }: FriendActionButtonsProps) {
  const { sendRequest, acceptRequest, rejectRequest, cancelRequest, unfriend, blockUser, unblockUser } = useFriendActions();
  const [loading, setLoading] = useState(false);

  const handleAction = async (action: () => Promise<boolean>) => {
    setLoading(true);
    const success = await action();
    setLoading(false);
    if (success && onActionComplete) {
      onActionComplete();
    }
  };

  // Determine status
  // Search results return explicit status.
  // Friends list implies 'accepted'.
  // Requests list implies 'pending'.
  const status = profile.friendship_status || 'none';
  const isRequester = profile.is_requester; // For pending requests

  if (status === 'blocked') {
    return (
      <Button 
        variant="destructive" 
        size={compact ? "icon" : "sm"} 
        onClick={() => handleAction(() => unblockUser(profile.id))}
        disabled={loading}
        title="Desbloquear"
      >
        {compact ? <ShieldCheck className="h-4 w-4" /> : "Desbloquear"}
      </Button>
    );
  }

  if (status === 'accepted') {
    return (
      <div className="flex gap-2">
        <Button 
          variant="outline" 
          size={compact ? "icon" : "sm"} 
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => {
            if (confirm(`Tem certeza que deseja desfazer a amizade com ${profile.display_name || profile.username}?`)) {
              handleAction(() => unfriend(profile.id));
            }
          }}
          disabled={loading}
          title="Desfazer amizade"
        >
          {compact ? <UserMinus className="h-4 w-4" /> : "Desfazer"}
        </Button>
        <Button 
          variant="ghost" 
          size={compact ? "icon" : "sm"} 
          className="text-muted-foreground hover:text-destructive"
          onClick={() => {
            if (confirm(`Bloquear ${profile.display_name || profile.username}? Vocês deixarão de ser amigos.`)) {
              handleAction(() => blockUser(profile.id));
            }
          }}
          disabled={loading}
          title="Bloquear"
        >
          {compact ? <Ban className="h-4 w-4" /> : "Bloquear"}
        </Button>
      </div>
    );
  }

  if (status === 'pending_sent' || (status === 'pending' && isRequester)) {
    return (
      <Button 
        variant="secondary" 
        size={compact ? "icon" : "sm"} 
        onClick={() => handleAction(() => cancelRequest(profile.id))}
        disabled={loading}
        title="Cancelar solicitação"
      >
        {compact ? <X className="h-4 w-4" /> : "Cancelar"}
      </Button>
    );
  }

  if (status === 'pending_received' || (status === 'pending' && !isRequester)) {
    return (
      <div className="flex gap-2">
        <Button 
          variant="default" 
          size={compact ? "icon" : "sm"} 
          onClick={() => handleAction(() => acceptRequest(profile.id))}
          disabled={loading}
          title="Aceitar"
        >
          {compact ? <UserCheck className="h-4 w-4" /> : "Aceitar"}
        </Button>
        <Button 
          variant="outline" 
          size={compact ? "icon" : "sm"} 
          onClick={() => handleAction(() => rejectRequest(profile.id))}
          disabled={loading}
          title="Recusar"
        >
          {compact ? <X className="h-4 w-4" /> : "Recusar"}
        </Button>
      </div>
    );
  }

  // Default: None -> Add Friend
  return (
    <div className="flex gap-2">
        <Button 
        variant="default" 
        size={compact ? "icon" : "sm"} 
        onClick={() => handleAction(() => sendRequest(profile.id))}
        disabled={loading}
        title="Adicionar amigo"
        >
        {compact ? <UserPlus className="h-4 w-4" /> : "Adicionar"}
        </Button>
        <Button 
          variant="ghost" 
          size={compact ? "icon" : "sm"} 
          className="text-muted-foreground hover:text-destructive h-8 w-8 p-0"
          onClick={() => {
            if (confirm(`Bloquear ${profile.display_name || profile.username}?`)) {
              handleAction(() => blockUser(profile.id));
            }
          }}
          disabled={loading}
          title="Bloquear"
        >
          <Ban className="h-4 w-4" />
        </Button>
    </div>
  );
}
