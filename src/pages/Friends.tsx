import { useEffect, useState } from "react";
import { useFriends, useFriendRequests } from "@/hooks/useFriendSystem";
import { useUserSearch } from "@/hooks/useUserSearch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Search, Copy, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FriendActionButtons } from "@/components/friends/FriendActionButtons";
import { FriendProfile } from "@/types/friendship";
import { Button } from "@/components/ui/button";
import { PublicProfileModal } from "@/components/profile/PublicProfileModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const ResolvedAvatarImage = ({ avatarUrl }: { avatarUrl: string | null | undefined }) => {
  const [src, setSrc] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    setSrc(undefined);

    if (!avatarUrl) return () => { active = false; };

    if (avatarUrl.startsWith('http') || avatarUrl.startsWith('data:')) {
      setSrc(avatarUrl);
      return () => { active = false; };
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(avatarUrl);
    const resolved = data.publicUrl ? `${data.publicUrl}?t=${Date.now()}` : undefined;
    if (active) setSrc(resolved);

    return () => { active = false; };
  }, [avatarUrl]);

  return <AvatarImage src={src} className="object-cover" />;
};

export default function Friends() {
  const { friends, loading: friendsLoading, refetch: refetchFriends } = useFriends();
  const { incoming, outgoing, loading: requestsLoading, refetch: refetchRequests } = useFriendRequests();
  const { query, setQuery, results, loading: searchLoading, search } = useUserSearch();
  
  const { user } = useAuth();
  const [selectedProfile, setSelectedProfile] = useState<FriendProfile | null>(null);
  const [myShortId, setMyShortId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch user's short_id
  useEffect(() => {
    const fetchShortId = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("short_id")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data?.short_id) {
        setMyShortId(data.short_id);
      }
    };
    fetchShortId();
  }, [user]);

  const copyCode = async () => {
    if (!myShortId) return;
    try {
      await navigator.clipboard.writeText(`#${myShortId}`);
      setCopied(true);
      toast.success("Código copiado!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Erro ao copiar");
    }
  };

  const handleActionComplete = () => {
    refetchFriends();
    refetchRequests();
    if (query) search(query);
  };

  const renderUserItem = (userProfile: FriendProfile) => {
    const displayName = userProfile.display_name || userProfile.full_name || userProfile.username || `Usuário`;
    const initials = (displayName || "?").substring(0, 2).toUpperCase().replace(/[^A-Z]/g, '') || "U";
    const shortId = userProfile.short_id;

    return (
      <div key={userProfile.id} className="flex items-center justify-between p-3 border rounded-lg bg-card/50 hover:bg-card/80 transition-colors">
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer"
          onClick={() => setSelectedProfile(userProfile)}
        >
          <Avatar className="h-10 w-10 border border-border">
            <ResolvedAvatarImage avatarUrl={userProfile.avatar_url} />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium text-sm">{displayName}</p>
            <div className="flex items-center gap-2">
              {shortId && <span className="text-[11px] text-muted-foreground font-mono">#{shortId}</span>}
              {userProfile.username && <span className="text-[11px] text-muted-foreground">@{userProfile.username}</span>}
            </div>
          </div>
        </div>
        <FriendActionButtons 
          profile={userProfile} 
          onActionComplete={handleActionComplete} 
          compact={true}
        />
      </div>
    );
  };

  return (
    <div className="container mx-auto pb-24 pt-6 px-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Social</h1>
      </div>

      {/* My Code Card */}
      {myShortId && (
        <div className="mb-6 p-4 rounded-xl border border-primary/30 bg-primary/5 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Seu código de amigo</p>
            <p className="text-2xl font-bold font-mono tracking-wider text-primary">#{myShortId}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={copyCode}
            className="gap-2"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      )}

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-6">
          <TabsTrigger value="list">Amigos ({friends.length})</TabsTrigger>
          <TabsTrigger value="requests">Solicitações ({incoming.length + outgoing.length})</TabsTrigger>
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
                    {friends.map(friend => renderUserItem(friend))}
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
                    {incoming.map(req => renderUserItem(req))}
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
                    {outgoing.map(req => renderUserItem(req))}
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
              <CardDescription>Busque pelo código # ou nome do seu amigo.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Ex: #1234 ou nome..." 
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
                    {results.map(u => renderUserItem(u))}
                  </div>
                ) : query ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado para "{query}".
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg">
                    <p className="mb-2">Cole o código <span className="font-mono font-bold text-primary">#0000</span> do seu amigo</p>
                    <p className="text-xs">ou busque pelo nome de usuário</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <PublicProfileModal 
        isOpen={!!selectedProfile} 
        onClose={() => setSelectedProfile(null)} 
        profile={selectedProfile} 
      />
    </div>
  );
}
