
import PremiumContent from "@/components/PremiumContent";
import { useLocation } from "react-router-dom";
import { PaywallContext } from "@/lib/paywall";

export default function Premium() {
  const location = useLocation();
  const context = location.state?.context as PaywallContext | undefined;

  return <PremiumContent context={context} />;
}
