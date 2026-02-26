import { useState } from "react";
import { useFriends } from "@/hooks/useFriends";
import { useFriendRequests } from "@/hooks/useFriendRequests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserPlus, UserX, Search, X, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

export default function Friends() {
  const { friends, loading: friendsLoading, removeFriend } = useFriends();
  const { incomingRequests, outgoingRequests, loading: requestsLoading, sendRequest, respondRequest, cancelRequest } = useFriendRequests();
  const [searchUsername, setSearchUsername] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const handleSendRequest = async () => {
    if (!searchUsername.trim()) return;
    setIsSearching(true);
    // Remove @ if present
    const username = searchUsername.trim().replace(/^@/, '');
    await sendRequest(username);
    setIsSearching(false);
    setSearchUsername("");
  };

  return (
    <div className="container mx-auto pb-24 pt-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Amigos</h1>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="list">Seus Amigos</TabsTrigger>
          <TabsTrigger value="requests">Solicitações</TabsTrigger>
          <TabsTrigger value="search">Adicionar</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Seus Amigos ({friends.length})</CardTitle>
              <CardDescription>Gerencie suas conexões.</CardDescription>
            </CardHeader>
            <CardContent>
              {friendsLoading ? (
                <div className="text-center py-4">Carregando...</div>
              ) : friends.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Você ainda não tem amigos.
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {friends.map((friend) => (
                      <div key={friend.friend_id} className="flex items-center justify-between p-2 border rounded-lg">
                        <div className="flex items-center gap-3">
                            <Avatar>
                                <AvatarImage src={friend.profile?.avatar_url || undefined} />
                                <AvatarFallback>{friend.profile?.username?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                            </Avatar>
                            <div>
                                <p className="font-medium">{friend.profile?.display_name || friend.profile?.username}</p>
                                <p className="text-xs text-muted-foreground">@{friend.profile?.username}</p>
                                <div className="flex gap-2 mt-1">
                                    {friend.profile?.plan_type && friend.profile.plan_type !== 'free' && (
                                        <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                            {friend.profile.plan_type.toUpperCase()}
                                        </span>
                                    )}
                                    {friend.profile?.last_analysis_score !== null && friend.profile?.visibility_score !== 'private' && (
                                        <span className="text-[10px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                                            GER: {friend.profile.last_analysis_score.toFixed(1)}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive/90 hover:bg-destructive/10"
                            onClick={() => {
                                if (confirm("Tem certeza que deseja remover este amigo?")) {
                                    removeFriend(friend.friend_id);
                                }
                            }}
                        >
                            <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-6">
             {/* Incoming Requests */}
             <Card>
                <CardHeader>
                  <CardTitle>Recebidas ({incomingRequests.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {requestsLoading ? (
                        <div>Carregando...</div>
                    ) : incomingRequests.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Nenhuma solicitação pendente.</div>
                    ) : (
                        <div className="space-y-3">
                            {incomingRequests.map(req => (
                                <div key={req.id} className="flex items-center justify-between p-2 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={req.requester?.avatar_url || undefined} />
                                            <AvatarFallback>{req.requester?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{req.requester?.display_name || req.requester?.username}</p>
                                            <p className="text-xs text-muted-foreground">@{req.requester?.username}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="default" onClick={() => respondRequest(req.id, 'accepted')}>
                                            <Check className="h-4 w-4 mr-1" /> Aceitar
                                        </Button>
                                        <Button size="sm" variant="outline" onClick={() => respondRequest(req.id, 'rejected')}>
                                            <X className="h-4 w-4 mr-1" /> Recusar
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
             </Card>

             {/* Outgoing Requests */}
             <Card>
                <CardHeader>
                  <CardTitle>Enviadas ({outgoingRequests.length})</CardTitle>
                </CardHeader>
                <CardContent>
                    {requestsLoading ? (
                        <div>Carregando...</div>
                    ) : outgoingRequests.length === 0 ? (
                        <div className="text-sm text-muted-foreground">Nenhuma solicitação enviada.</div>
                    ) : (
                        <div className="space-y-3">
                            {outgoingRequests.map(req => (
                                <div key={req.id} className="flex items-center justify-between p-2 border rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <Avatar>
                                            <AvatarImage src={req.addressee?.avatar_url || undefined} />
                                            <AvatarFallback>{req.addressee?.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                                        </Avatar>
                                        <div>
                                            <p className="font-medium">{req.addressee?.display_name || req.addressee?.username}</p>
                                            <p className="text-xs text-muted-foreground">@{req.addressee?.username}</p>
                                        </div>
                                    </div>
                                    <Button size="sm" variant="ghost" onClick={() => cancelRequest(req.id)}>
                                        Cancelar
                                    </Button>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
             </Card>
          </div>
        </TabsContent>

        <TabsContent value="search">
          <Card>
            <CardHeader>
              <CardTitle>Adicionar Amigo</CardTitle>
              <CardDescription>Busque por nome de usuário (ex: @joao) ou ID.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Nome de usuário ou ID" 
                        className="pl-8" 
                        value={searchUsername}
                        onChange={(e) => setSearchUsername(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendRequest()}
                    />
                </div>
                <Button onClick={handleSendRequest} disabled={isSearching || !searchUsername}>
                    {isSearching ? "Enviando..." : <><UserPlus className="mr-2 h-4 w-4" /> Adicionar</>}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
