import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface ReferralStats {
  total_uses: number;
  total_commission: number;
  recent_purchases: Array<{
    id: string;
    purchaser_username: string;
    plan_type: string;
    amount_cents: number;
    commission_cents: number;
    created_at: string;
  }>;
}

export function useReferralCode() {
  const { user, profile } = useAuth();
  const [referralCode, setReferralCode] = useState<string>('');
  const [referralStats, setReferralStats] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate consistent 4-digit number based on email (seed)
  const getSeededRandom4Digits = (email: string) => {
    let hash = 0;
    for (let i = 0; i < email.length; i++) {
      const char = email.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash) % 10000; // 0-9999 range
  };

  // Generate code from email locally (MAX + 4 digits)
  const generateCodeFromEmail = (email: string) => {
    // Prefixo fixo
    const prefix = 'MAX';
    
    // Use seeded random for consistency
    const randomSuffix = getSeededRandom4Digits(email);
    
    // Ensure 4 digits with leading zeros
    const paddedNumber = randomSuffix.toString().padStart(4, '0');
    
    const code = prefix + paddedNumber;
    return code;
  };

  // Load referral code with proper persistence logic
  useEffect(() => {
    if (!user?.email) return;

    const initializeReferralCode = async () => {
      console.log('🔍 Initializing referral code for user:', user.email);
      
      // Priority 1: Check database FIRST (most reliable)
      console.log('📋 Checking database for existing code...');
      const existingCode = await loadExistingCode(user.id);
      if (existingCode) {
        console.log('✅ Found existing code in database:', existingCode);
        setReferralCode(existingCode);
        return;
      }
      console.log('❌ No existing code found in database');

      // Priority 2: Check if profile already has referral code
      console.log('👤 Checking profile for referral code...');
      if (profile && (profile as any).referral_code) {
        console.log('✅ Found code in profile:', (profile as any).referral_code);
        setReferralCode((profile as any).referral_code);
        return;
      }
      console.log('❌ No code found in profile');

      // Priority 3: Generate unique code and save (LAST resort)
      console.log('🎲 Generating new unique code...');
      const uniqueCode = await generateUniqueCode(user.email);
      console.log('✅ Generated unique code:', uniqueCode);
      setReferralCode(uniqueCode);
      console.log('💾 Saving code to database...');
      saveCodeToDatabase(uniqueCode);
    };

    initializeReferralCode();
  }, [user?.email]); // Remove profile from dependencies

  // Check if code already exists in database
  const checkCodeUniqueness = async (code: string) => {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('id')
        .eq('code', code)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error checking code uniqueness:', error);
        return false;
      }

      return !data; // Return true if code doesn't exist (unique)
    } catch (error) {
      console.error('Error checking code uniqueness:', error);
      return false;
    }
  };

  // Generate unique code with retry logic
  const generateUniqueCode = async (email: string, maxRetries = 10) => {
    // Generate code once based on original email (no attempt variation)
    const baseCode = generateCodeFromEmail(email);
    
    // Check if base code is unique
    const isUnique = await checkCodeUniqueness(baseCode);
    if (isUnique) {
      return baseCode;
    }
    
    // If not unique, try variations with different suffixes
    for (let attempt = 1; attempt < maxRetries; attempt++) {
      const code = generateCodeFromEmail(email) + attempt; // Add simple suffix
      const isUnique = await checkCodeUniqueness(code);
      if (isUnique) {
        return code;
      }
    }
    
    // Fallback: use timestamp
    const timestamp = Date.now().toString().slice(-4);
    return 'MAX' + timestamp;
  };

  // Load existing referral code from database
  const loadExistingCode = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('creator_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('Error loading existing code:', error);
        return null;
      }

      return data?.code || null;
    } catch (error) {
      console.error('Error loading existing code:', error);
      return null;
    }
  };

  // Save code to database
  const saveCodeToDatabase = async (code: string) => {
    if (!user || !profile?.is_ugc) {
      console.log('❌ Cannot save code: user or is_ugc missing');
      return;
    }
    
    console.log('💾 Attempting to save code to database:', code);
    
    try {
      const { data, error } = await supabase.rpc('generate_referral_code', {
        p_creator_id: user.id,
        p_code: code
      });

      if (error) {
        console.error('❌ Error saving referral code:', error);
      } else {
        console.log('✅ Code saved successfully to database:', data);
      }
    } catch (error) {
      console.error('❌ Exception saving referral code:', error);
    }
  };

  // Load referral stats
  const loadReferralStats = async () => {
    if (!user || !profile?.is_ugc) return;

    try {
      const { data, error } = await supabase.rpc('get_creator_referral_stats', {
        p_creator_id: user.id
      });

      if (error) throw error;

      setReferralStats(data?.[0] || null);
    } catch (error: any) {
      console.error('Error loading referral stats:', error);
    }
  };

  // Apply referral code during purchase
  const applyReferralCode = async (code: string, purchaseId: string, planType: string, amountCents: number) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('apply_referral_code', {
        p_referral_code: code.toUpperCase(),
        p_purchase_id: purchaseId,
        p_purchaser_id: user.id,
        p_plan_type: planType,
        p_amount_cents: amountCents
      });

      if (error) throw error;

      const result = data?.[0];
      if (result?.success) {
        toast.success('Código de apoiador aplicado com sucesso!');
        return result;
      } else {
        toast.error('Código de apoiador inválido ou inativo');
        return null;
      }
    } catch (error: any) {
      console.error('Error applying referral code:', error);
      toast.error('Erro ao aplicar código de apoiador');
      return null;
    }
  };

  // Load stats on component mount
  useEffect(() => {
    if (profile?.is_ugc) {
      loadReferralStats();
    }
  }, [profile]);

  return {
    referralCode,
    referralStats,
    loading,
    loadReferralStats,
    applyReferralCode
  };
}
