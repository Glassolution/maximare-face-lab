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
import { LoserRevealOverlay } from '@/components/battle/LoserRevealOverlay';
import { supabase } from '@/integrations/supabase/client';

export default function BattleRoom() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile: userProfile } = useAuth();
  const { battle, opponentProfile, submissions, result, loading, error, submitPhotos } = useBattleRoom(id!);
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

  const getPhotoUrl = (path: string | null) => {
      if (!path) return null;
      return supabase.storage.from('battles').getPublicUrl(path).data.publicUrl;
  };

  const getAvatarUrl = (pathOrUrl: string | null | undefined) => {
      if (!pathOrUrl) return null;
      if (pathOrUrl.startsWith('http') || pathOrUrl.startsWith('data:')) return pathOrUrl;
      return supabase.storage.from('avatars').getPublicUrl(pathOrUrl).data.publicUrl;
  };

  if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin h-8 w-8" /></div>;
  if (error || !battle) return <div className="p-8 text-center text-red-500">Erro: {error || 'Batalha não encontrada'}</div>;

  // Status: Waiting for Opponent
  if (battle.status === 'waiting_for_opponent') {
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

  // 1. PROCESSING OVERLAY (Highest Priority during processing phase)
  // Show if:
  // - Status is 'processing'
  // - OR Status is advanced ('reveal_loser' or 'completed') BUT animation hasn't finished yet
  // - AND both users have submitted (to be safe)
  const shouldShowProcessing = 
      (battle.status === 'processing') || 
      (!processingAnimationComplete && ['reveal_loser', 'completed'].includes(battle.status) && !!mySubmission && !!opponentSubmission);

  if (shouldShowProcessing) {
      const myAvatar = getPhotoUrl(mySubmission?.front_photo_path) || getAvatarUrl(userProfile?.avatar_url);
      const opponentAvatar = getPhotoUrl(opponentSubmission?.front_photo_path) || getAvatarUrl(opponentProfile?.avatar_url);
      
      // We tell the overlay to finish ONLY if the real status is completed/reveal_loser
      const isReady = ['reveal_loser', 'completed'].includes(battle.status);
      
      // Use matched_at as a fallback for start time
      const startTime = battle.matched_at ? new Date(battle.matched_at).getTime() : undefined;

      return (
        <BattleProcessingOverlay 
            userAvatar={myAvatar} 
            opponentAvatar={opponentAvatar} 
            isReady={isReady}
            onComplete={handleProcessingComplete}
            startTime={startTime}
        />
      );
  }

  // 2. REVEAL OVERLAY (Intermediate Phase)
  // Show if:
  // - Status is 'reveal_loser' (or completed if we skipped reveal_loser in DB but want to show it)
  // - AND Processing animation finished
  // - AND Reveal animation NOT finished
  const shouldShowReveal = 
      processingAnimationComplete && 
      !revealAnimationComplete && 
      ['reveal_loser', 'completed'].includes(battle.status);

  if (shouldShowReveal) {
      const myPhoto = getPhotoUrl(mySubmission?.front_photo_path) || userProfile?.avatar_url;

      return (
        <LoserRevealOverlay 
            result={result} 
            userPhoto={myPhoto}
            onComplete={handleRevealComplete} 
        />
      );
  }

  // 3. FINAL RESULT SCREEN
  if (showResultScreen && result) {
       // Logic to determine labels and colors based on winner/loser
      // Assuming user logged in is viewing
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
                                    <AvatarImage src={result.winner_id === userProfile?.id ? getPhotoUrl(submissions.find(s => s.user_id === userProfile?.id)?.front_photo_path) || userProfile?.avatar_url : getPhotoUrl(submissions.find(s => s.user_id !== userProfile?.id)?.front_photo_path) || opponentProfile?.avatar_url} />
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
                                    <AvatarImage src={result.loser_id === userProfile?.id ? getPhotoUrl(submissions.find(s => s.user_id === userProfile?.id)?.front_photo_path) || userProfile?.avatar_url : getPhotoUrl(submissions.find(s => s.user_id !== userProfile?.id)?.front_photo_path) || opponentProfile?.avatar_url} />
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
  // Only show if status is matched/photo_submission
  if (battle.status === 'matched' || battle.status === 'photo_submission') {
      const hasSubmitted = !!mySubmission;

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
                                    src={getPhotoUrl(mySubmission.front_photo_path) || ''} 
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
