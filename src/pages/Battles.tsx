import { useState } from 'react';
import { useBattles } from '@/hooks/useBattles';
import { useAuth } from '@/hooks/useAuth';
import { trackEvent } from '@/lib/posthog';
import { useFriends } from '@/hooks/useFriendSystem';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Swords, Plus, Search, Loader2 } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { EnrichedBattle } from '@/types/battle';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Battles() {
  const { battles, loading, createBattle, acceptBattle, rejectBattle } = useBattles();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("active");

  console.log('Battle status:', battles.map(b => b.status));

  const pendingBattles = battles.filter(b => b.status === 'waiting' && !b.is_creator && !b.matched_at);
  const activeBattles = battles.filter(b => 
    b.status === 'waiting_for_opponent' || 
    b.status === 'waiting' || 
    b.status === 'matched' || 
    b.status === 'active' || 
    b.status === 'photo_submission' ||
    b.status === 'ready' ||
    b.status === 'running'
  );
  const historyBattles = battles.filter(b => ['finished', 'canceled', 'expired'].includes(b.status));

  const handleBattleClick = (battle: EnrichedBattle) => {
    if (battle.status === 'waiting' && !battle.is_creator && !battle.matched_at) {
       // If pending and I am opponent, don't navigate, let them use buttons
       return;
    } else {
       navigate(`/battle/${battle.id}`);
    }
  };

  if (!user) return null;

  return (
    <div className="container mx-auto pb-24 pt-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary" /> Duelos
        </h1>
        <CreateBattleModal onCreate={createBattle} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="active">Ativos ({activeBattles.length})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({pendingBattles.length})</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
            {loading ? <div className="text-center p-4"><Loader2 className="animate-spin mx-auto"/></div> : 
             activeBattles.length === 0 ? <p className="text-center text-muted-foreground py-8">Nenhum duelo ativo.</p> :
             activeBattles.map(b => <BattleCard key={b.id} battle={b} onClick={() => handleBattleClick(b)} onAccept={acceptBattle} onReject={rejectBattle} />)}
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
            {loading ? <div className="text-center p-4"><Loader2 className="animate-spin mx-auto"/></div> : 
             pendingBattles.length === 0 ? <p className="text-center text-muted-foreground py-8">Nenhum convite pendente.</p> :
             pendingBattles.map(b => <BattleCard key={b.id} battle={b} onClick={() => handleBattleClick(b)} onAccept={acceptBattle} onReject={rejectBattle} />)}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
            {loading ? <div className="text-center p-4"><Loader2 className="animate-spin mx-auto"/></div> : 
             historyBattles.length === 0 ? <p className="text-center text-muted-foreground py-8">Histórico vazio.</p> :
             historyBattles.map(b => <BattleCard key={b.id} battle={b} onClick={() => handleBattleClick(b)} onAccept={acceptBattle} onReject={rejectBattle} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function BattleCard({ battle, onClick, onAccept, onReject }: { 
    battle: EnrichedBattle, 
    onClick: () => void,
    onAccept?: (id: string) => Promise<boolean>,
    onReject?: (id: string) => Promise<boolean>
}) {
    const isPending = battle.status === 'waiting' && !battle.is_creator && !battle.matched_at;
    const opponentName = battle.opponent_profile?.display_name || 'Aguardando...';

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'waiting': return battle.matched_at ? 'Aguardando Fotos' : 'Convite Pendente';
            case 'ready': return 'Pronto';
            case 'running': return 'Em andamento';
            case 'finished': return 'Finalizado';
            case 'canceled': return 'Cancelado';
            case 'expired': return 'Expirado';
            default: return status.replace(/_/g, ' ');
        }
    };
    
    return (
        <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={onClick}>
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Avatar className="h-[48px] w-[48px] border-2 border-background rounded-full">
                            <AvatarImage 
                                src={battle.opponent_profile?.avatar_url || undefined} 
                                className="object-cover object-center w-full h-full"
                            />
                            <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                        <div className={`absolute -bottom-1 -right-1 h-3 w-3 rounded-full border-2 border-background ${
                            battle.status === 'running' ? 'bg-blue-500 animate-pulse' : 
                            battle.status === 'finished' ? 'bg-green-500' : 'bg-yellow-500'
                        }`} />
                    </div>
                    <div>
                        <p className="font-bold text-sm">{opponentName === 'Aguardando...' ? 'Novo Duelo' : `vs ${opponentName}`}</p>
                        <p className="text-xs text-muted-foreground capitalize">
                            {getStatusLabel(battle.status)} • {formatDistanceToNow(new Date(battle.created_at), { addSuffix: true, locale: ptBR })}
                        </p>
                    </div>
                </div>
                
                {isPending && !battle.is_creator ? (
                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                         <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600" onClick={() => onReject && onReject(battle.id)}>
                            Recusar
                        </Button>
                        <Button size="sm" variant="default" onClick={() => onAccept && onAccept(battle.id)}>
                            Aceitar
                        </Button>
                    </div>
                ) : (
                    <Button size="sm" variant="secondary">
                        Ver
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function CreateBattleModal({ onCreate }: { onCreate: (id: string) => Promise<boolean> }) {
    const [open, setOpen] = useState(false);
    const { friends, loading } = useFriends();
    const [search, setSearch] = useState("");
    const [sending, setSending] = useState<string | null>(null);

    const filtered = friends.filter(f => 
        (f.username || "").toLowerCase().includes(search.toLowerCase()) || 
        (f.display_name || "").toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async (friendId: string) => {
        setSending(friendId);
        const success = await onCreate(friendId);
        setSending(null);
        if (success) {
          // PostHog: track battle created
          trackEvent('user', 'battle_created', {
            opponent_id: friendId,
          });
          setOpen(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button size="sm" className="gap-1">
                    <Plus className="h-4 w-4" /> Novo Duelo
                </Button>
            </DialogTrigger>
            <DialogContent className="w-[90%] max-w-sm rounded-3xl">
                <DialogHeader>
                    <DialogTitle>Desafiar Amigo</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            placeholder="Buscar amigo..." 
                            className="pl-8 rounded-xl" 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <ScrollArea className="h-[300px]">
                        {loading ? (
                            <div className="p-4 text-center text-muted-foreground">Carregando...</div>
                        ) : filtered.length === 0 ? (
                            <div className="p-4 text-center text-muted-foreground">Nenhum amigo encontrado.</div>
                        ) : (
                            <div className="space-y-2">
                                {filtered.map(f => (
                                    <div key={f.id} className="flex items-center justify-between p-2 hover:bg-muted rounded-xl transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={f.avatar_url || undefined} />
                                                <AvatarFallback>{f.username?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                                            </Avatar>
                                            <div className="overflow-hidden">
                                                <p className="font-medium text-sm truncate">{f.display_name || f.username}</p>
                                                <p className="text-xs text-muted-foreground">@{f.username}</p>
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="secondary"
                                            disabled={!!sending}
                                            onClick={() => handleCreate(f.id)}
                                            className="rounded-lg"
                                        >
                                            {sending === f.id ? "Enviando..." : "Desafiar"}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}
