
export const PLAN_CONFIG = {
  ENABLE_PAYWALL: true,
  PAYWALL_COOLDOWN_HOURS: 72,
  MAX_PAYWALL_PER_DAY: 1,
  BACKOFF_AFTER_DISMISS: 3,
  BACKOFF_COOLDOWN_DAYS: 7,

  PLANS: {
    monthly: {
      id: 'monthly',
      title: 'Mensal',
      price: 49.90,
      cents: 4990,
      frequency: 1,
      frequencyType: 'months' as const,
      description: 'R$ 49,90/mês',
      features: ['Análise ilimitada', 'Resultados detalhados', 'Prioridade no suporte'],
      badge: 'Mais Popular' as const,
    },
    yearly: {
      id: 'yearly',
      title: 'Anual',
      price: 499.90,
      cents: 49990,
      frequency: 12,
      frequencyType: 'months' as const,
      description: 'R$ 499,90/ano',
      features: ['Análise ilimitada', 'Resultados detalhados', 'Prioridade no suporte', '2 meses grátis'],
      badge: 'Melhor Valor' as const,
    },
  },
} as const;

export type PlanType = keyof typeof PLAN_CONFIG.PLANS;
