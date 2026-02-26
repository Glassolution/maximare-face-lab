import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FriendProfile } from "@/types/friendship";
import { Swords, MessageCircle, Share2, UserMinus } from "lucide-react";
import { useFriendActions } from "@/hooks/useFriendActions";
import { useNavigate } from "react-router-dom";

interface PublicProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: FriendProfile | null;
}

export function PublicProfileModal({ isOpen, onClose, profile }: PublicProfileModalProps) {
  const { removeFriend } = useFriendActions();
  const navigate = useNavigate();

  if (!profile) return null;

  const displayName = profile.display_name || profile.username || `Usuário #${profile.short_id}`;
  const username = profile.username || `user_${profile.short_id}`;
  // Standardize initials logic: Remove non-letters, take first 2 chars, uppercase. Fallback to "U"
  const initials = (displayName || "?").replace(/[^a-zA-Z]/g, '').substring(0, 2).toUpperCase() || "U";

  // Resolve Avatar URL if needed (though usually passed resolved from list, but modal might fetch fresh)
  // Assuming profile passed here is already processed or raw. 
  // If raw path, we should resolve. But usually the list item has resolved URL.
  // Let's assume it's resolved or we display as is. If broken image, AvatarFallback shows initials.

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[90%] max-w-sm rounded-3xl border-white/10 bg-[#0a0a0a] text-white">
        <DialogHeader className="pt-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24 border-4 border-white/5 shadow-xl">
              <AvatarImage src={profile.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="text-2xl bg-zinc-800 font-bold text-zinc-400">
                {initials}
              </AvatarFallback>
            </Avatar>
            
            <div className="text-center space-y-1">
              <DialogTitle className="text-2xl font-bold">
                {displayName}
              </DialogTitle>
              <p className="text-muted-foreground text-sm">@{username}</p>
              {profile.short_id && (
                <span className="inline-block bg-white/5 px-2 py-0.5 rounded text-[10px] text-zinc-400 mt-1">
                  #{profile.short_id}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-3 mt-6">
          <Button 
            className="w-full bg-blue-600 hover:bg-blue-700"
            onClick={() => {
                onClose();
                // Navigate to battle creation with this user pre-selected if possible, 
                // or just to battles page. For now, create battle directly?
                // Better to use the battle creation flow.
                // We can't easily trigger createBattle from here without the hook context or passing it down.
                // Let's redirect to battles page for now.
                navigate('/battles'); 
            }}
          >
            <Swords className="mr-2 h-4 w-4" /> Desafiar
          </Button>
          <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10">
            <MessageCircle className="mr-2 h-4 w-4" /> Mensagem
          </Button>
        </div>

        <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
           <Button variant="ghost" className="w-full justify-start text-zinc-400 hover:text-white hover:bg-white/5">
              <Share2 className="mr-2 h-4 w-4" /> Compartilhar Perfil
           </Button>
           
           {profile.status === 'accepted' && (
               <Button 
                variant="ghost" 
                className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={async () => {
                    if (confirm("Tem certeza que deseja remover este amigo?")) {
                        await removeFriend(profile.id);
                        onClose();
                    }
                }}
               >
                  <UserMinus className="mr-2 h-4 w-4" /> Desfazer Amizade
               </Button>
           )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
