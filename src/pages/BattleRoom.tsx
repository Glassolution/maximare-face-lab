import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBattleRoom } from '@/hooks/useBattleRoom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Camera, Upload, Trophy, Skull, CheckCircle2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { BattleProcessingOverlay } from '@/components/battle/BattleProcessingOverlay';
import { supabase } from '@/integrations/supabase/client';

export default function BattleRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: userProfile } = useAuth();
  const { battle, opponentProfile, submissions, result, loading, error, submitPhotos, serverTimeOffsetMs, refresh } = useBattleRoom(id!);
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState(false);
  
  // Controls if the processing animation has finished its mandatory cycle (7s minimum)
  const [processingAnimationComplete, setProcessingAnimationComplete] = useState(false);
  
  // Controls if the "Reveal" animation (MOGGADO/ASCENDEU) has finished
  const [revealAnimationComplete, setRevealAnimationComplete] = useState(false);

  // Timer for minimum processing duration (7s)
  // This logic is now handled internally by BattleProcessingOverlay via onComplete callback
  // We just need to ensure we don't unmount it until it calls onComplete.

  const handleProcessingComplete = () => {
      setProcessingAnimationComplete(true);
  };

  const handleRevealComplete = () => {
      setRevealAnimationComplete(true);
      setShowResultScreen(true);
  };

  const getAvatarUrl = (pathOrUrl: string | null | undefined) => {
    console.log('[getAvatarUrl] INPUT:', pathOrUrl);
    if (!pathOrUrl) {
      console.log('[getAvatarUrl] RETURN null - no pathOrUrl');
      return null;
    }
    if (pathOrUrl.startsWith('http') || pathOrUrl.startsWith('data:')) {
      console.log('[getAvatarUrl] RETURN direct URL:', pathOrUrl);
      return pathOrUrl;
    }
    const publicUrl = supabase.storage.from('avatars').getPublicUrl(pathOrUrl).data.publicUrl;
    console.log('[getAvatarUrl] RETURN public URL:', publicUrl);
    return publicUrl;
  };

  const getBattlePhotoUrl = (submission: any | null | undefined) => {
    if (!submission) return null;
    const raw =
      submission.front_url ||
      submission.front_photo_url ||
      submission.photo_url ||
      submission.image_url ||
      submission.front_photo_path;

    if (!raw) return null;
    if (typeof raw === 'string' && (raw.startsWith('http') || raw.startsWith('data:'))) {
      return raw;
    }

    try {
      const { data } = supabase.storage.from('battle-photos').getPublicUrl(raw);
      return data.publicUrl;
    } catch {
      return null;
    }
  };

  const [stableCreatorPhotoUrl, setStableCreatorPhotoUrl] = useState<string | null>(null);
  const [stableOpponentPhotoUrl, setStableOpponentPhotoUrl] = useState<string | null>(null);
  const [photosPreloaded, setPhotosPreloaded] = useState(false);
  const [processingDeadlineMs, setProcessingDeadlineMs] = useState<number | null>(null);
  
  // Estado persistente para as URLs finais do resultado (não dependem de battle estar disponível)
  const [finalResultPhotos, setFinalResultPhotos] = useState<{
    winner: string | null;
    loser: string | null;
    creatorId: string | null;
    opponentId: string | null;
  }>({ winner: null, loser: null, creatorId: null, opponentId: null });

  useEffect(() => {
    if (!battle) return;
    // Always update the stable URLs when battle data changes
    if (battle.challenger_photo_url) setStableCreatorPhotoUrl(battle.challenger_photo_url);
    if (battle.opponent_photo_url) setStableOpponentPhotoUrl(battle.opponent_photo_url);
    if (battle.ready_at && !photosPreloaded) setPhotosPreloaded(true); // Fallback if images fail
    
    // Salvar as URLs finais quando a batalha termina para garantir que tenhamos no resultado
    if (battle.status === 'finished' && battle.challenger_photo_url && battle.opponent_photo_url) {
      setFinalResultPhotos({
        creatorId: battle.created_by,
        opponentId: battle.opponent_id,
        winner: null, // Será definido quando tivermos o resultado
        loser: null    // Será definido quando tivermos o resultado
      });
    }
  }, [battle, photosPreloaded]);

  const isCreator = battle?.created_by === userProfile?.id;
  const myStablePhotoUrl = isCreator ? stableCreatorPhotoUrl : stableOpponentPhotoUrl;
  const opponentStablePhotoUrl = isCreator ? stableOpponentPhotoUrl : stableCreatorPhotoUrl;

  // Atualizar as fotos do resultado quando o resultado for recebido
  useEffect(() => {
    if (result && stableCreatorPhotoUrl && stableOpponentPhotoUrl) {
      const creatorPhoto = isCreator ? myStablePhotoUrl : opponentStablePhotoUrl;
      const opponentPhoto = isCreator ? opponentStablePhotoUrl : myStablePhotoUrl;
      
      const winnerPhoto = result.winner_id === battle?.created_by ? creatorPhoto : opponentPhoto;
      const loserPhoto = result.loser_id === battle?.created_by ? creatorPhoto : opponentPhoto;
      
      setFinalResultPhotos(prev => ({
        ...prev,
        winner: winnerPhoto,
        loser: loserPhoto
      }));
      
      console.log('[BattleRoom] RESULT PHOTOS UPDATED:', {
        result,
        creatorPhoto,
        opponentPhoto,
        winnerPhoto,
        loserPhoto,
        isCreator
      });
    }
  }, [result, stableCreatorPhotoUrl, stableOpponentPhotoUrl, isCreator, myStablePhotoUrl, opponentStablePhotoUrl, battle?.created_by]);

  useEffect(() => {
    if (!battle) return;
    const nowServerApprox = Date.now() + serverTimeOffsetMs;

    if (battle.status === 'canceled' || battle.status === 'expired' || battle.status === 'finished') {
      setProcessingDeadlineMs(null);
      return;
    }

    if ((battle.status === 'ready' || battle.status === 'running') && !result) {
      const base = battle.start_at ? new Date(battle.start_at).getTime() : nowServerApprox;
      const nextDeadline = base + 20000;
      setProcessingDeadlineMs((prev) => (prev ? Math.min(prev, nextDeadline) : nextDeadline));
      return;
    }

    setProcessingDeadlineMs(null);
  }, [battle, result, serverTimeOffsetMs]);

  useEffect(() => {
    if (!myStablePhotoUrl || !opponentStablePhotoUrl) return;

    let cancelled = false;
    setPhotosPreloaded(false);

    const timeout = window.setTimeout(() => {
      if (!cancelled) setPhotosPreloaded(true);
    }, 2500);

    const preload = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });

    Promise.all([preload(myStablePhotoUrl), preload(opponentStablePhotoUrl)]).then(() => {
      window.clearTimeout(timeout);
      if (!cancelled) setPhotosPreloaded(true);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [myStablePhotoUrl, opponentStablePhotoUrl]);

  useEffect(() => {
    if (!battle?.start_at) return;
    if (battle.status !== 'ready') return;

    const startAtMs = new Date(battle.start_at).getTime();
    if (!Number.isFinite(startAtMs)) return;

    const tick = window.setInterval(() => {
      const nowServerApprox = Date.now() + serverTimeOffsetMs;
      if (nowServerApprox >= startAtMs) {
        supabase.rpc('mark_battle_running_v3', { p_battle_id: battle.id });
        window.clearInterval(tick);
      }
    }, 250);

    return () => window.clearInterval(tick);
  }, [battle?.id, battle?.status, battle?.start_at, serverTimeOffsetMs]);

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  if (error || !battle) return <div className="p-8 text-center text-red-500">Erro: {error || 'Batalha não encontrada'}</div>;

  // Status: Waiting for Opponent
  if ((battle.status === 'waiting' && !battle.matched_at) || battle.status === 'waiting_for_opponent') {
    return (
      <div className="container max-w-md mx-auto py-10 px-4 text-center space-y-6">
        <h1 className="text-2xl font-bold">Aguardando Oponente...</h1>
        <div className="p-6 border rounded-xl bg-muted/20 animate-pulse">
           <p className="text-muted-foreground mb-4">Compartilhe o link ou aguarde alguém aceitar.</p>
           <code className="block bg-black/20 p-2 rounded text-xs select-all">{window.location.href}</code>
        </div>
        <Button variant="outline" onClick={() => navigate('/battles')}>Voltar</Button>
      </div>
    );
  }

  // --- LOGIC FOR DECIDING WHICH SCREEN TO SHOW ---

  const mySubmission = submissions.find(s => s.user_id === userProfile?.id);
  const opponentSubmission = submissions.find(s => s.user_id !== userProfile?.id);

  const myBattlePhotoUrl = myStablePhotoUrl || getBattlePhotoUrl(mySubmission) || getAvatarUrl(userProfile?.avatar_url);
  const opponentBattlePhotoUrl = opponentStablePhotoUrl || getBattlePhotoUrl(opponentSubmission) || getAvatarUrl(opponentProfile?.avatar_url);

  if ((battle.status === 'ready' || battle.status === 'running' || battle.status === 'finished') && !photosPreloaded) {
    return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  }

  if (battle.status === 'canceled' || battle.status === 'expired') {
    return (
      <div className="container max-w-md mx-auto py-10 px-4 text-center space-y-6">
        <h1 className="text-2xl font-bold">Batalha cancelada</h1>
        <p className="text-sm text-muted-foreground">Não foi possível concluir esta batalha. Tente novamente.</p>
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => navigate('/battles')}>Tentar novamente</Button>
          <Button variant="outline" className="flex-1" onClick={() => refresh()}>Recarregar</Button>
        </div>
      </div>
    );
  }

  const nowServerApprox = Date.now() + serverTimeOffsetMs;
  const hardTimedOut = !!processingDeadlineMs && nowServerApprox >= processingDeadlineMs && battle.status !== 'finished' && !result;

  if (hardTimedOut) {
    return (
      <div className="container max-w-md mx-auto py-10 px-4 text-center space-y-6">
        <h1 className="text-2xl font-bold">Não conseguimos obter o resultado agora</h1>
        <p className="text-sm text-muted-foreground">Você pode tentar recarregar o resultado ou reiniciar a batalha.</p>
        <div className="flex gap-3">
          <Button className="flex-1" onClick={() => refresh()}>Recarregar resultado</Button>
          <Button variant="outline" className="flex-1" onClick={() => navigate('/battles')}>Reiniciar batalha</Button>
        </div>
      </div>
    );
  }

  // 1. PROCESSING OVERLAY (Highest Priority during processing phase)
  // Show if:
  // - Status is 'processing'
  // - OR Status is advanced ('reveal_loser' or 'completed') BUT animation hasn't finished yet
  // - AND both users have submitted (to be safe)
  const shouldShowProcessing =
      (battle.status === 'ready' || battle.status === 'running') && !!myStablePhotoUrl && !!opponentStablePhotoUrl && !hardTimedOut;

  if (shouldShowProcessing) {
      const myAvatar = myBattlePhotoUrl;
      const opponentAvatar = opponentBattlePhotoUrl;

      const startTime = battle.start_at ? new Date(battle.start_at).getTime() : (battle.matched_at ? new Date(battle.matched_at).getTime() : undefined);
      const adjustedStartTime = startTime ? startTime - serverTimeOffsetMs : undefined;

      const nowServerApprox = Date.now() + serverTimeOffsetMs;
      const readyToResolve = battle.status === 'running' && !!battle.start_at && nowServerApprox >= new Date(battle.start_at).getTime() + 9000;

      return (
        <BattleProcessingOverlay 
            userAvatar={myAvatar} 
            opponentAvatar={opponentAvatar} 
            userName={userProfile?.display_name || userProfile?.username || "Você"}
            opponentName={opponentProfile?.display_name || opponentProfile?.username || "Oponente"}
            isReady={readyToResolve || battle.status === 'finished'}
            onComplete={handleProcessingComplete}
            startTime={adjustedStartTime}
        />
      );
  }

  // 3. FINAL RESULT SCREEN
  if ((battle.status === 'finished' || showResultScreen) && result) {
       // Logic to determine labels and colors based on winner/loser
      // Assuming user logged in is viewing
      
      console.log('[BattleRoom] === RENDERIZANDO TELA DE RESULTADO ===', {
        'battle.status': battle.status,
        'showResultScreen': showResultScreen,
        'result exists': !!result,
        'battle exists': !!battle,
        'userProfile exists': !!userProfile,
        'opponentProfile exists': !!opponentProfile,
        'stableCreatorPhotoUrl': stableCreatorPhotoUrl,
        'stableOpponentPhotoUrl': stableOpponentPhotoUrl,
        'finalResultPhotos': finalResultPhotos
      });
      
      console.log('[BattleRoom] RESULT SCREEN DEBUG:', {
        result,
        battle: !!battle,
        battleChallengerPhoto: battle?.challenger_photo_url,
        battleOpponentPhoto: battle?.opponent_photo_url,
        myStablePhotoUrl,
        opponentStablePhotoUrl,
        myBattlePhotoUrl,
        opponentBattlePhotoUrl,
        userProfileId: userProfile?.id,
        opponentProfileId: opponentProfile?.id,
        isCreator
      });
      
      const winnerPhotoUrl = finalResultPhotos.winner || 
    (result.winner_id === userProfile?.id ? myBattlePhotoUrl : opponentBattlePhotoUrl) ||
    getAvatarUrl(result.winner_id === userProfile?.id ? userProfile : opponentProfile);
  const loserPhotoUrl = finalResultPhotos.loser || 
    (result.loser_id === userProfile?.id ? myBattlePhotoUrl : opponentBattlePhotoUrl) ||
    getAvatarUrl(result.loser_id === userProfile?.id ? userProfile : opponentProfile);
  
  console.log('[BattleRoom] FINAL PHOTO URLS (CORRECTED):', {
    finalResultPhotos,
    winnerPhotoUrl,
    loserPhotoUrl,
    winnerId: result.winner_id,
    loserId: result.loser_id,
    fallbackUsed: !finalResultPhotos.winner || !finalResultPhotos.loser
  });
  
  // RASTREAMENTO COMPLETO DA VARIÁVEL winnerPhotoUrl
  console.log('[BattleRoom] RASTREAMENTO winnerPhotoUrl:', {
    '1. finalResultPhotos.winner': finalResultPhotos.winner,
    '2. result.winner_id === userProfile?.id': result.winner_id === userProfile?.id,
    '3. userProfile?.id': userProfile?.id,
    '4. myBattlePhotoUrl': myBattlePhotoUrl,
    '5. opponentBattlePhotoUrl': opponentBattlePhotoUrl,
    '6. getAvatarUrl()': getAvatarUrl(result.winner_id === userProfile?.id ? userProfile : opponentProfile),
    '7. winnerPhotoUrl FINAL': winnerPhotoUrl,
    '8. typeof winnerPhotoUrl': typeof winnerPhotoUrl,
    '9. winnerPhotoUrl length': winnerPhotoUrl?.length
  });

      return (
          <div className="container max-w-lg mx-auto py-8 px-4 space-y-8 animate-in fade-in duration-500 pb-32">
              <div className="text-center space-y-2">
                  <h1 className="text-3xl font-heading font-black text-primary uppercase tracking-tighter">
                      Resultado Final
                  </h1>
                  <p className="text-sm text-muted-foreground">Batalha #{battle.room_version}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                  {/* Winner Card */}
                  <div className={`relative rounded-xl overflow-hidden border-2 ${result.winner_id ? 'border-amber-500 shadow-[0_0_30px_rgba(245,158,11,0.3)]' : ''}`}>
                      <div className="absolute top-0 inset-x-0 bg-amber-500 text-black text-xs font-bold text-center py-1 uppercase tracking-widest">
                          {result.verdict_label_winner} 🏆
                      </div>
                      <div className="pt-8 pb-4 px-2 text-center bg-card">
                          <div className="h-20 w-20 mx-auto rounded-full border-4 border-amber-500 overflow-hidden mb-2 bg-muted relative">
                              <Avatar className="h-full w-full">
                                    <AvatarImage 
                                      src={winnerPhotoUrl || undefined} 
                                      onError={(e) => console.log('[AvatarImage WINNER ERROR:', e, 'src:', winnerPhotoUrl)}
                                      onLoad={() => console.log('[AvatarImage WINNER LOADED:', winnerPhotoUrl)}
                                    />
                                    <AvatarFallback>WIN</AvatarFallback>
                                </Avatar>
                          </div>
                          <div className="text-2xl font-black text-amber-500 mb-1">{result.winner_score}</div>
                          <p className="font-bold text-sm leading-tight truncate">{result.winner_id === opponentProfile?.id ? opponentProfile.display_name : 'Você'}</p>
                      </div>
                  </div>

                  {/* Loser Card */}
                  <div className="relative rounded-xl overflow-hidden border border-border opacity-80 grayscale-[0.5]">
                      <div className="absolute top-0 inset-x-0 bg-muted text-muted-foreground text-xs font-bold text-center py-1 uppercase tracking-widest">
                          {result.verdict_label_loser} 💀
                      </div>
                      <div className="pt-8 pb-4 px-2 text-center bg-card">
                           <div className="h-20 w-20 mx-auto rounded-full border-2 border-muted overflow-hidden mb-2 bg-muted relative">
                                <Avatar className="h-full w-full">
                                    <AvatarImage 
                                      src={loserPhotoUrl || undefined} 
                                      onError={(e) => console.log('[AvatarImage LOSER ERROR:', e, 'src:', loserPhotoUrl)}
                                      onLoad={() => console.log('[AvatarImage LOSER LOADED:', loserPhotoUrl)}
                                    />
                                    <AvatarFallback>RIP</AvatarFallback>
                                </Avatar>
                          </div>
                          <div className="text-2xl font-bold text-muted-foreground mb-1">{result.loser_score}</div>
                          <p className="font-bold text-sm leading-tight text-muted-foreground truncate">{result.loser_id === opponentProfile?.id ? opponentProfile.display_name : 'Você'}</p>
                      </div>
                  </div>
              </div>

              <Card>
                  <CardHeader>
                      <CardTitle>Análise da IA</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                      <div>
                          <h4 className="font-bold text-green-500 mb-1">Pontos Fortes (Vencedor)</h4>
                          <ul className="list-disc list-inside text-muted-foreground">
                              {result.summary?.winner_pros?.map((p: string, i: number) => <li key={i}>{p}</li>)}
                          </ul>
                      </div>
                      <div>
                          <h4 className="font-bold text-red-500 mb-1">Pontos Fracos (Perdedor)</h4>
                          <ul className="list-disc list-inside text-muted-foreground">
                              {result.summary?.loser_cons?.map((p: string, i: number) => <li key={i}>{p}</li>)}
                          </ul>
                      </div>
                  </CardContent>
              </Card>

              <div className="flex gap-3">
                  <Button className="flex-1" onClick={() => navigate('/battles')}>Nova Batalha</Button>
                  <Button variant="outline" className="flex-1">Compartilhar</Button>
              </div>
          </div>
      );
  }

  // 4. SUBMISSION FORM (Default if not waiting opponent, processing, or revealing)
  // Only show if status is matched/photo_submission/active/ready/waiting(legacy)
  if (['waiting', 'ready', 'matched', 'active', 'photo_submission'].includes(battle.status)) {
      const hasSubmitted = !!myStablePhotoUrl;

      return (
          <div className="container max-w-lg mx-auto py-6 px-4 space-y-6">
              <header className="flex items-center justify-between">
                  <h1 className="text-xl font-bold">Sala de Batalha</h1>
                  <span className="text-xs bg-blue-500/10 text-blue-500 px-2 py-1 rounded-full uppercase font-bold tracking-wider">
                      {hasSubmitted ? 'Aguardando...' : 'Envie sua foto'}
                  </span>
              </header>

              {/* Opponent Status */}
              <Card>
                  <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Oponente</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                          <AvatarImage src={opponentProfile?.avatar_url} />
                          <AvatarFallback>?</AvatarFallback>
                      </Avatar>
                      <div>
                          <p className="font-bold">{opponentProfile?.display_name || 'Oponente'}</p>
                          <p className="text-xs text-muted-foreground">
                              {opponentSubmission ? 'Foto enviada ✅' : 'Aguardando foto...'}
                          </p>
                      </div>
                  </CardContent>
              </Card>

              {/* My Submission Area */}
              <Card className={`border-2 ${hasSubmitted ? 'border-green-500/20 bg-green-500/5' : 'border-dashed'}`}>
                  <CardContent className="pt-6 text-center space-y-4">
                      {hasSubmitted ? (
                          <div className="py-8 space-y-4">
                              <div className="h-20 w-20 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto">
                                  <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                              </div>
                              <h3 className="text-lg font-bold text-green-700 dark:text-green-400">Foto Enviada!</h3>
                              <p className="text-sm text-muted-foreground">
                                  Aguardando {opponentProfile?.display_name || 'oponente'} enviar a foto para iniciar a batalha...
                              </p>
                              <div className="relative aspect-[3/4] max-w-[150px] mx-auto rounded-lg overflow-hidden border shadow-sm opacity-80">
                                  <img 
                                    src={myStablePhotoUrl || ''} 
                                    alt="Minha foto" 
                                    className="w-full h-full object-cover" 
                                  />
                              </div>
                          </div>
                      ) : (
                          <>
                              {!frontFile ? (
                                  <div className="py-8 space-y-4">
                                      <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mx-auto">
                                          <Camera className="h-8 w-8 text-muted-foreground" />
                                      </div>
                                      <p className="text-sm text-muted-foreground">Tire uma foto frontal clara e iluminada</p>
                                      <div className="flex justify-center gap-2">
                                          <Button onClick={() => document.getElementById('file-upload')?.click()}>
                                              <Upload className="mr-2 h-4 w-4" /> Upload
                                          </Button>
                                          <input 
                                              id="file-upload" 
                                              type="file" 
                                              accept="image/*" 
                                              className="hidden" 
                                              onChange={(e) => e.target.files?.[0] && setFrontFile(e.target.files[0])}
                                          />
                                      </div>
                                  </div>
                              ) : (
                                  <div className="relative aspect-[3/4] max-w-[200px] mx-auto rounded-lg overflow-hidden border">
                                      <img src={URL.createObjectURL(frontFile)} alt="Preview" className="w-full h-full object-cover" />
                                      <Button 
                                          variant="destructive" 
                                          size="sm" 
                                          className="absolute top-2 right-2"
                                          onClick={() => setFrontFile(null)}
                                      >
                                          Trocar
                                      </Button>
                                  </div>
                              )}

                              <Button 
                                  className="w-full" 
                                  disabled={!frontFile || uploading} 
                                  onClick={async () => {
                                      if (!frontFile) return;
                                      setUploading(true);
                                      await submitPhotos(frontFile);
                                      setUploading(false);
                                  }}
                              >
                                  {uploading ? <Loader2 className="animate-spin mr-2" /> : 'Enviar Foto & Lutar'}
                              </Button>
                          </>
                      )}
                  </CardContent>
              </Card>
          </div>
      );
  }

  return <div>Estado desconhecido: {battle.status}</div>;
}
