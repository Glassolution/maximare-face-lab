import { supabase } from "@/integrations/supabase/client";

// CORRIGIDO: Função para comprimir imagem antes do upload
async function compressImage(file: File, maxWidth: number, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Redimensionar se maior que maxWidth
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Converter para WebP com qualidade especificada
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/webp',
          quality
        );
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export interface AvatarUploadResult {
  publicUrl: string;
  path: string;
}

async function getValidSession() {
  const { data: { session: initialSession } } = await supabase.auth.getSession();

  const isExpired = (sess: typeof initialSession | null) => {
    if (!sess?.expires_at) return false;
    return sess.expires_at * 1000 <= Date.now() + 5_000;
  };

  if (initialSession && !isExpired(initialSession)) {
    return initialSession;
  }

  const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
  if (refreshError) {
    return null;
  }

  return refreshedSession ?? null;
}

export const avatarService = {
  /**
   * Uploads a new avatar for the current user.
   * Automatically handles folder structure: avatars/{userId}/avatar.webp
   * Updates the profile with the new URL.
   */
  async uploadAvatar(file: File): Promise<AvatarUploadResult> {
    console.log('[AvatarService] Starting avatar upload process...');

    const session = await getValidSession();

    if (!session?.user) {
      console.error('[AvatarService] User not authenticated (no valid session)');
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const userId = session.user.id;
    const filePath = `${userId}/avatar.webp`;

    console.log(`[AvatarService] Target user: ${userId}`);
    console.log(`[AvatarService] Target path: ${filePath}`);

    // CORRIGIDO: Comprimir imagem antes do upload para reduzir egress
    let optimizedFile: File | Blob = file;
    try {
      optimizedFile = await compressImage(file, 400, 0.8); // Max 400px, qualidade 80%
      console.log(`[AvatarService] Imagem comprimida: ${file.size} -> ${optimizedFile.size} bytes`);
    } catch (compressError) {
      console.warn('[AvatarService] Falha ao comprimir imagem, usando original:', compressError);
    }

    // 2. Upload to Storage (Force upsert)
    // CORRIGIDO: Cache de 1 ano para avatares (mudam pouco)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, optimizedFile, {
        cacheControl: '31536000', // 1 ano de cache
        upsert: true,
        contentType: 'image/webp' // CORRIGIDO: Sempre WebP para otimização
      });

    if (uploadError) {
      console.error('[AvatarService] Upload error:', uploadError);
      throw uploadError;
    }

    console.log('[AvatarService] Upload success:', uploadData);

    // 3. Get Public URL (for immediate display)
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    console.log('[AvatarService] Public URL resolved:', publicUrl);

    // 4. Update Profile
    // Stores the relative path as requested: "avatars/<user_id>/avatar.webp"
    // Wait... prompt said: profiles.avatar_url = "<user_id>/avatar.webp"
    // The previous implementation stored just "userId/avatar.webp".
    // Let's store exactly what was asked: relative path inside bucket.
    
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: filePath, // Storing "userid/avatar.webp"
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      console.error('[AvatarService] Profile update error:', updateError);
      throw updateError;
    }

    console.log('[AvatarService] Profile updated successfully with:', filePath);

    return { publicUrl, path: filePath };
  },

  async uploadAvatarBlob(blob: Blob, userId?: string): Promise<AvatarUploadResult> {
    console.log('[AvatarService] Starting avatar blob upload process...');

    const session = await getValidSession();
    const effectiveUserId = userId ?? session?.user?.id;

    if (!session?.user || !effectiveUserId) {
      console.error('[AvatarService] User not authenticated (no valid session)');
      throw new Error("Sessão expirada. Faça login novamente.");
    }

    const filePath = `${effectiveUserId}/avatar.webp`;

    // CORRIGIDO: Comprimir blob se for imagem grande
    let optimizedBlob = blob;
    if (blob.size > 100 * 1024) { // Se maior que 100KB
      try {
        // Converter blob para File temporário para compressão
        const tempFile = new File([blob], 'temp.jpg', { type: blob.type || 'image/jpeg' });
        optimizedBlob = await compressImage(tempFile, 400, 0.8);
        console.log(`[AvatarService] Blob comprimido: ${blob.size} -> ${optimizedBlob.size} bytes`);
      } catch (compressError) {
        console.warn('[AvatarService] Falha ao comprimir blob:', compressError);
      }
    }

    // CORRIGIDO: Cache de 1 ano
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, optimizedBlob, {
        cacheControl: '31536000', // 1 ano
        upsert: true,
        contentType: 'image/webp',
      });

    if (uploadError) {
      console.error('[AvatarService] Upload error:', uploadError);
      throw uploadError;
    }

    console.log('[AvatarService] Upload success:', uploadData);

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        avatar_url: filePath,
        updated_at: new Date().toISOString(),
      })
      .eq('id', effectiveUserId);

    if (updateError) {
      console.error('[AvatarService] Profile update error:', updateError);
      throw updateError;
    }

    return { publicUrl, path: filePath };
  },

  /**
   * Helper to get renderable URL from a path or full URL
   * CORRIGIDO: Adiciona parâmetros de transformação para reduzir egress
   */
  getAvatarPublicUrl(pathOrUrl: string | null | undefined, width: number = 200, quality: number = 75): string | null {
    if (!pathOrUrl) return null;

    if (pathOrUrl.startsWith('http') || pathOrUrl.startsWith('data:')) {
      // Se já for URL completa, adicionar parâmetros de transformação se for do Supabase
      if (pathOrUrl.includes('.supabase.co/storage/')) {
        const separator = pathOrUrl.includes('?') ? '&' : '?';
        return `${pathOrUrl}${separator}width=${width}&quality=${quality}`;
      }
      return pathOrUrl;
    }

    // It's a path, resolve it with transform options
    // CORRIGIDO: Usar download com transform para otimizar imagem
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(pathOrUrl, {
        transform: {
          width: width,
          height: width, // Manter proporção quadrada para avatares
          quality: quality,
          resize: 'cover'
        }
      });

    return data.publicUrl;
  }
};
