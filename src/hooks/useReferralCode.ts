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

  // Load referral code from profile
  useEffect(() => {
    if (profile?.referral_code) {
      setReferralCode(profile.referral_code);
    }
  }, [profile]);

  // Generate referral code for creator
  const generateReferralCode = async () => {
    if (!user || !profile?.is_ugc) {
      toast.error('Apenas criadores podem ter códigos de apoiador');
      return;
    }

    setLoading(true);
    try {
      const code = `${profile?.username?.replace(/\s/g, '').toUpperCase().slice(0, 6) || ''}10`;
      
      const { error } = await supabase.rpc('generate_referral_code', {
        p_creator_id: user.id,
        p_code: code
      });

      if (error) throw error;

      setReferralCode(code);
      toast.success('Código de apoiador gerado com sucesso!');
    } catch (error: any) {
      console.error('Error generating referral code:', error);
      toast.error('Erro ao gerar código de apoiador');
    } finally {
      setLoading(false);
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
    generateReferralCode,
    loadReferralStats,
    applyReferralCode
  };
}
