interface PaywallManagerProps {
  children: React.ReactNode;
  trigger: string;
}

export function PaywallManager({ children }: PaywallManagerProps) {
  return <>{children}</>;
}
