import { useState } from "react";
import { useFriends, useFriendRequests } from "@/hooks/useFriendSystem";
import { useUserSearch } from "@/hooks/useUserSearch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FriendActionButtons } from "@/components/friends/FriendActionButtons";
import { FriendProfile } from "@/types/friendship";

export default function Friends() {
  const { friends, loading: friendsLoading, refetch: refetchFriends } = useFriends();
  const { incoming, outgoing, loading: requestsLoading, refetch: refetchRequests } = useFriendRequests();
  const { query, setQuery, results, loading: searchLoading, search } = useUserSearch();

  const handleActionComplete = () => {
    refetchFriends();
    refetchRequests();
    // Re-run search if active to update button states
    if (query) search(query);
  };

  const renderUserItem = (user: FriendProfile, context: 'friend' | 'request' | 'search') => (
    <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border border-border">
          <AvatarImage src={user.avatar_url || undefined} />
          <AvatarFallback>{user.username?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium text-sm">
            {user.display_name || user.username}
          </p>
          <div className="flex items-center gap-2">
             {user.username && <p className="text-xs text-muted-foreground">@{user.username}</p>}
             {user.short_id && <span className="text-[10px] bg-muted px-1 rounded text-muted-foreground">#{user.short_id}</span>}
          </div>
        </div>
      </div>
      <FriendActionButtons 
        profile={user} 
        onActionComplete={handleActionComplete} 
        compact={true}
      />
    </div>
  );

  return (
    <div className="container mx-auto pb-24 pt-6 px-4">
      <h1 className="text-2xl font-bold mb-6">Amigos</h1>

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="list">Amigos ({friends.length})</TabsTrigger>
          <TabsTrigger value="requests">Solicitações ({incoming.length})</TabsTrigger>
          <TabsTrigger value="search">Buscar</TabsTrigger>
        </TabsList>

        <TabsContent value="list">
          <Card>
            <CardHeader>
              <CardTitle>Seus Amigos</CardTitle>
              <CardDescription>Gerencie suas conexões.</CardDescription>
            </CardHeader>
            <CardContent>
              {friendsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Carregando...</div>
              ) : friends.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                  <p>Você ainda não tem amigos.</p>
                  <Button variant="link" onClick={() => document.querySelector<HTMLElement>('[data-value="search"]')?.click()}>
                    Buscar pessoas
                  </Button>
                </div>
              ) : (
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-3">
                    {friends.map(friend => renderUserItem(friend, 'friend'))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recebidas ({incoming.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {requestsLoading ? (
                  <div className="text-sm text-muted-foreground">Carregando...</div>
                ) : incoming.length === 0 ? (
                  <div className="text-sm text-muted-foreground italic">Nenhuma solicitação pendente.</div>
                ) : (
                  <div className="space-y-3">
                    {incoming.map(req => renderUserItem(req, 'request'))}
                  </div>
                )}
              </CardContent>
            </Card>

            {outgoing.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Enviadas ({outgoing.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {outgoing.map(req => renderUserItem(req, 'request'))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="search">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Adicionar Amigo</CardTitle>
              <CardDescription>Busque por @username, nome ou ID.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Buscar..." 
                  className="pl-9" 
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="min-h-[300px]">
                {searchLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Buscando...</div>
                ) : results.length > 0 ? (
                  <div className="space-y-3">
                    {results.map(user => renderUserItem(user, 'search'))}
                  </div>
                ) : query ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado para "{query}".
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                    Digite para buscar usuários.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
