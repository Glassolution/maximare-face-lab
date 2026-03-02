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

  // Generate referral code from email on mount
  useEffect(() => {
    if (user?.email && !referralCode) {
      generateCodeFromEmail(user.email);
    }
  }, [user?.email]);

  // Load referral code from profile if available
  useEffect(() => {
    if (profile && (profile as any).referral_code) {
      setReferralCode((profile as any).referral_code);
    }
  }, [profile]);

  // Generate code from email locally
  const generateCodeFromEmail = (email: string) => {
    // Extract name before @
    const namePart = email.split('@')[0];
    
    // Prefixo fixo
    const prefix = 'MIX';
    
    // Extract letters: first 2 + middle + last 2
    let letters = '';
    if (namePart.length >= 6) {
      letters = namePart.substring(0, 2) + 
               namePart.substring(2, Math.floor(namePart.length / 2)) + 
               namePart.substring(namePart.length - 2);
    } else {
      letters = namePart.substring(0, Math.min(namePart.length, 5));
    }
    
    // Random suffix 10-99
    const randomSuffix = Math.floor(Math.random() * 90) + 10;
    
    const code = prefix + letters.toUpperCase().substring(0, 5) + randomSuffix;
    setReferralCode(code);
    
    // Save to database in background
    saveCodeToDatabase(code);
  };

  // Save code to database
  const saveCodeToDatabase = async (code: string) => {
    if (!user || !profile?.is_ugc) return;
    
    try {
      const { error } = await supabase.rpc('generate_referral_code', {
        p_creator_id: user.id,
        p_code: code
      });

      if (error) {
        console.error('Error saving referral code:', error);
      }
    } catch (error) {
      console.error('Error saving referral code:', error);
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
