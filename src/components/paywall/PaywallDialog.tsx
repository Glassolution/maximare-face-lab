import { PaywallContext } from '@/lib/paywall';
import { PaywallModal } from '@/components/PaywallModal';
import { useAuth } from '@/hooks/useAuth';

interface PaywallDialogProps {
  isOpen: boolean;
  onClose: () => void;
  context?: PaywallContext;
}

export const PaywallDialog = ({ isOpen, onClose, context }: PaywallDialogProps) => {
  const { profile } = useAuth();
  
  // Verificação de premium - não renderizar paywall para usuários premium
  const isPremiumProfile = profile?.premium === true || profile?.is_premium === true || profile?.subscription_status === 'active';
  if (isPremiumProfile) {
    return null;
  }
  
  // Não renderizar se não estiver aberto
  if (!isOpen) {
    return null;
  }
  
  return (
    <PaywallModal 
      open={isOpen} 
      onClose={onClose} 
      onUpgrade={() => {}} // Adicionar prop obrigatória
      context={context}
    />
  );
};
