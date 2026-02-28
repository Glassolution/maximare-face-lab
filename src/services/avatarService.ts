import { supabase } from "@/integrations/supabase/client";

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

    // 2. Upload to Storage (Force upsert)
    // Note: We are uploading the file directly as 'avatar.webp' regardless of its original type.
    // Modern browsers handle image types well even with wrong extension, but ideally we would convert.
    // For this requirement, we stick to the file path requested.
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type // Preserve original content type (e.g. image/jpeg) even if named .webp
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

    const contentType = blob.type || 'image/jpeg';

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType,
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
   */
  getAvatarPublicUrl(pathOrUrl: string | null | undefined): string | null {
    if (!pathOrUrl) return null;
    
    if (pathOrUrl.startsWith('http') || pathOrUrl.startsWith('data:')) {
      return pathOrUrl;
    }
    
    // It's a path, resolve it
    const { data } = supabase.storage
      .from('avatars')
      .getPublicUrl(pathOrUrl);
      
    return data.publicUrl;
  }
};
