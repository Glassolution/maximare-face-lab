import { useEffect, useMemo, useState } from "react";

export function useBattlePhotos(battle: any | null, isCreator: boolean) {
  const [stableCreatorPhotoUrl, setStableCreatorPhotoUrl] = useState<string | null>(null);
  const [stableOpponentPhotoUrl, setStableOpponentPhotoUrl] = useState<string | null>(null);
  const [photosPreloaded, setPhotosPreloaded] = useState(false);

  useEffect(() => {
    if (!battle) return;
    if (battle.challenger_photo_url && !stableCreatorPhotoUrl) setStableCreatorPhotoUrl(battle.challenger_photo_url);
    if (battle.opponent_photo_url && !stableOpponentPhotoUrl) setStableOpponentPhotoUrl(battle.opponent_photo_url);
    if (battle.ready_at && !photosPreloaded) setPhotosPreloaded(true);
  }, [battle, stableCreatorPhotoUrl, stableOpponentPhotoUrl, photosPreloaded]);

  useEffect(() => {
    const myUrl = isCreator ? stableCreatorPhotoUrl : stableOpponentPhotoUrl;
    const oppUrl = isCreator ? stableOpponentPhotoUrl : stableCreatorPhotoUrl;
    if (!myUrl || !oppUrl) return;

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

    Promise.all([preload(myUrl), preload(oppUrl)]).then(() => {
      window.clearTimeout(timeout);
      if (!cancelled) setPhotosPreloaded(true);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isCreator, stableCreatorPhotoUrl, stableOpponentPhotoUrl]);

  const myStablePhotoUrl = useMemo(
    () => (isCreator ? stableCreatorPhotoUrl : stableOpponentPhotoUrl),
    [isCreator, stableCreatorPhotoUrl, stableOpponentPhotoUrl]
  );
  const opponentStablePhotoUrl = useMemo(
    () => (isCreator ? stableOpponentPhotoUrl : stableCreatorPhotoUrl),
    [isCreator, stableCreatorPhotoUrl, stableOpponentPhotoUrl]
  );

  return { myStablePhotoUrl, opponentStablePhotoUrl, photosPreloaded };
}
