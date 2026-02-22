import { useState, useMemo } from 'react';
import { useBattles, Battle } from '@/hooks/useBattles';
import { useAuth } from '@/hooks/useAuth';
import { useFriends } from '@/hooks/useFriends';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Swords, Trophy, Upload, X, Check, Search, Plus, UserX } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";

export default function Battles() {
  const { battles, loading: battlesLoading, error, createBattle, respondBattle, fetchBattles } = useBattles();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState("active");
  
  // Categorize Battles
  const { pendingIncoming, pendingOutgoing, active, history } = useMemo(() => {
    const pendingIncoming: Battle[] = [];
    const pendingOutgoing: Battle[] = [];
    const active: Battle[] = [];
    const history: Battle[] = [];

    battles.forEach(b => {
      if (b.status === 'finished' || b.status === 'rejected' || b.status === 'canceled') {
        history.push(b);
      } else if (b.status === 'pending') {
        if (b.challenger_id === user?.id) {
            pendingOutgoing.push(b);
        } else {
            pendingIncoming.push(b);
        }
      } else {
        // waiting_upload, analyzing
        active.push(b);
      }
    });

    return { pendingIncoming, pendingOutgoing, active, history };
  }, [battles, user]);

  if (!user) return null;

  if (error === 'SETUP_REQUIRED') {
      return (
          <div className="container mx-auto pt-20 px-6 text-center">
              <div className="max-w-md mx-auto p-6 bg-red-500/10 border border-red-500/20 rounded-2xl">
                  <Swords className="h-12 w-12 text-red-500 mx-auto mb-4" />
                  <h2 className="text-xl font-bold mb-2">Configuração Pendente</h2>
                  <p className="text-muted-foreground text-sm mb-4">
                      O sistema de batalhas ainda não foi configurado no banco de dados.
                  </p>
                  <div className="text-left bg-black/30 p-3 rounded-lg overflow-auto max-h-40 text-xs font-mono text-zinc-400 mb-4">
                      ERROR: relation "public.battles" does not exist (PGRST205)
                  </div>
                  <p className="text-xs text-muted-foreground">
                      Por favor, rode o script <code>supabase/migrations/CONSOLIDATED_SETUP.sql</code> no Editor SQL do Supabase.
                  </p>
              </div>
          </div>
      );
  }

  if (battlesLoading && battles.length === 0) {
      return <div className="container mx-auto pt-10 text-center text-muted-foreground">Carregando duelos...</div>;
  }
  
  return (
    <div className="container mx-auto pb-24 pt-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
            <Swords className="h-6 w-6 text-primary" /> Duelos
        </h1>
        <CreateBattleModal onCreate={createBattle} />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="active">Ativos ({active.length + pendingIncoming.length})</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
            
            {/* Incoming Requests */}
            {pendingIncoming.length > 0 && (
                <section>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Solicitações de Duelo</h3>
                    <div className="grid gap-3">
                        {pendingIncoming.map(b => (
                            <BattleRequestCard key={b.id} battle={b} onRespond={respondBattle} />
                        ))}
                    </div>
                </section>
            )}

            {/* Active Battles */}
            <section>
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3">Em Andamento</h3>
                {active.length === 0 && pendingIncoming.length === 0 && pendingOutgoing.length === 0 ? (
                    <div className="text-center py-10 bg-muted/20 rounded-xl border border-dashed">
                        <Swords className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">Nenhum duelo ativo no momento.</p>
                        <p className="text-xs text-muted-foreground mt-1">Desafie um amigo para começar!</p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {active.map(b => (
                            <ActiveBattleCard key={b.id} battle={b} currentUserId={user.id} />
                        ))}
                        {pendingOutgoing.map(b => (
                            <div key={b.id} className="p-4 rounded-xl border bg-card/50 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Avatar>
                                        <AvatarImage src={b.opponent?.avatar_url || undefined} />
                                        <AvatarFallback>?</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-medium text-sm">Aguardando {b.opponent?.display_name || 'oponente'}</p>
                                        <p className="text-xs text-muted-foreground">Enviado em {new Date(b.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <span className="text-xs bg-muted px-2 py-1 rounded text-muted-foreground">Pendente</span>
                            </div>
                        ))}
                    </div>
                )}
            </section>
        </TabsContent>

        <TabsContent value="history">
            <div className="grid gap-3">
                {history.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">Nenhum duelo finalizado.</div>
                ) : (
                    history.map(b => (
                        <HistoryBattleCard key={b.id} battle={b} currentUserId={user.id} />
                    ))
                )}
            </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreateBattleModal({ onCreate }: { onCreate: (id: string) => Promise<boolean> }) {
    const [open, setOpen] = useState(false);
    const { friends, loading } = useFriends();
    const [search, setSearch] = useState("");
    const [sending, setSending] = useState<string | null>(null);

    const filtered = friends.filter(f => 
        f.profile?.username.toLowerCase().includes(search.toLowerCase()) || 
        f.profile?.display_name?.toLowerCase().includes(search.toLowerCase())
    );

    const handleCreate = async (friendId: string) => {
        setSending(friendId);
        const success = await onCreate(friendId);
        setSending(null);
        if (success) setOpen(false);
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
                                    <div key={f.friend_id} className="flex items-center justify-between p-2 hover:bg-muted rounded-xl transition-colors">
                                        <div className="flex items-center gap-3">
                                            <Avatar>
                                                <AvatarImage src={f.profile?.avatar_url || undefined} />
                                                <AvatarFallback>{f.profile?.username.substring(0, 2).toUpperCase()}</AvatarFallback>
                                            </Avatar>
                                            <div className="overflow-hidden">
                                                <p className="font-medium text-sm truncate">{f.profile?.display_name}</p>
                                                <p className="text-xs text-muted-foreground">@{f.profile?.username}</p>
                                            </div>
                                        </div>
                                        <Button 
                                            size="sm" 
                                            variant="secondary"
                                            disabled={!!sending}
                                            onClick={() => handleCreate(f.friend_id)}
                                            className="rounded-lg"
                                        >
                                            {sending === f.friend_id ? "Enviando..." : "Desafiar"}
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

function BattleRequestCard({ battle, onRespond }: { battle: Battle, onRespond: (id: string, action: 'accepted' | 'rejected') => void }) {
    return (
        <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10 border-2 border-background">
                        <AvatarImage src={battle.challenger?.avatar_url || undefined} />
                        <AvatarFallback>?</AvatarFallback>
                    </Avatar>
                    <div>
                        <p className="font-bold text-sm">@{battle.challenger?.username}</p>
                        <p className="text-xs text-muted-foreground">te desafiou para um duelo!</p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onRespond(battle.id, 'rejected')}>
                        <X className="h-4 w-4" />
                    </Button>
                    <Button size="sm" className="gap-1 h-8" onClick={() => onRespond(battle.id, 'accepted')}>
                        <Swords className="h-3.5 w-3.5" /> Aceitar
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}

function ActiveBattleCard({ battle, currentUserId }: { battle: Battle, currentUserId: string }) {
    const navigate = useNavigate();
    const isChallenger = battle.challenger_id === currentUserId;
    const opponent = isChallenger ? battle.opponent : battle.challenger;
    const myScore = isChallenger ? battle.challenger_score : battle.opponent_score;
    const opponentScore = isChallenger ? battle.opponent_score : battle.challenger_score;

    const needsUpload = myScore === null;
    const opponentNeedsUpload = opponentScore === null;

    return (
        <Card>
            <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={opponent?.avatar_url || undefined} />
                            <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">vs @{opponent?.username}</span>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-bold uppercase">
                        {battle.status === 'analyzing' ? 'Analisando' : 'Aguardando'}
                    </span>
                </div>

                <div className="flex gap-2">
                    {needsUpload ? (
                        <Button 
                            className="w-full gap-2" 
                            onClick={() => navigate(`/analysis?start=true&battleId=${battle.id}`)}
                        >
                            <Upload className="h-4 w-4" /> Enviar Foto
                        </Button>
                    ) : (
                        <div className="w-full p-2 bg-muted/50 rounded-lg text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                            <Check className="h-4 w-4 text-green-500" /> Foto enviada
                        </div>
                    )}
                </div>
                
                {!needsUpload && opponentNeedsUpload && (
                    <p className="text-xs text-center text-muted-foreground mt-2">
                        Aguardando oponente enviar foto...
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

function HistoryBattleCard({ battle, currentUserId }: { battle: Battle, currentUserId: string }) {
    if (battle.status === 'canceled' || battle.status === 'rejected') return null;

    const isChallenger = battle.challenger_id === currentUserId;
    const opponent = isChallenger ? battle.opponent : battle.challenger;
    const myScore = isChallenger ? battle.challenger_score : battle.opponent_score;
    const opponentScore = isChallenger ? battle.opponent_score : battle.challenger_score;
    
    const iWon = battle.winner_id === currentUserId;
    const isDraw = !battle.winner_id; // Should technically not happen with logic but possible

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Card className={`cursor-pointer hover:bg-muted/50 transition-colors ${iWon ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-red-500'}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full flex items-center justify-center ${iWon ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {iWon ? <Trophy className="h-5 w-5" /> : <UserX className="h-5 w-5" />}
                            </div>
                            <div>
                                <p className="font-bold text-sm">{iWon ? 'Vitória' : 'Derrota'}</p>
                                <p className="text-xs text-muted-foreground">vs @{opponent?.username}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold">{myScore?.toFixed(1)} <span className="text-muted-foreground text-xs">vs</span> {opponentScore?.toFixed(1)}</p>
                            <p className="text-[10px] text-muted-foreground">{new Date(battle.finished_at || battle.updated_at).toLocaleDateString()}</p>
                        </div>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="text-center text-xl font-heading">Resultado do Duelo</DialogTitle>
                </DialogHeader>
                
                <div className="flex justify-between items-center py-4">
                    {/* Me */}
                    <div className="flex flex-col items-center gap-2">
                        <Avatar className="h-16 w-16 border-2 border-primary">
                            <AvatarImage src={undefined} /> {/* My avatar logic needed or use context */}
                            <AvatarFallback>EU</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-lg">{myScore?.toFixed(1)}</span>
                        {iWon && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">VENCEDOR</span>}
                        {!iWon && <span className="text-xs text-red-500 font-bold tracking-widest">MOGGADO</span>}
                    </div>

                    <div className="text-muted-foreground font-bold text-xl">VS</div>

                    {/* Opponent */}
                    <div className="flex flex-col items-center gap-2">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={opponent?.avatar_url || undefined} />
                            <AvatarFallback>?</AvatarFallback>
                        </Avatar>
                        <span className="font-bold text-lg">{opponentScore?.toFixed(1)}</span>
                        {!iWon && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">VENCEDOR</span>}
                        {iWon && <span className="text-xs text-red-500 font-bold tracking-widest">MOGGADO</span>}
                    </div>
                </div>

                {battle.win_reason && (
                    <div className="bg-muted p-3 rounded-lg text-center text-sm text-muted-foreground mt-2">
                        <p>{battle.win_reason}</p>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
