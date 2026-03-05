import { PaywallContext } from "@/lib/paywall";

interface Props {
  open: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  context?: PaywallContext;
}

export const PaywallModal = (_props: Props) => {
  return null;
};

export default PaywallModal;
