
export const PLAN_CONFIG = {
  ENABLE_PAYWALL: true,
  PAYWALL_COOLDOWN_HOURS: 72, // 3 days
  MAX_PAYWALL_PER_DAY: 1,
  BACKOFF_AFTER_DISMISS: 3, // After 3 dismisses
  BACKOFF_COOLDOWN_DAYS: 7, // Wait 7 days

  PLANS: {
    weekly: {
      id: 'weekly',
      title: 'Semanal',
      price: 1.00,
      cents: 100,
      description: 'R$ 1,00/semana',
      features: ['Análise ilimitada', 'Resultados detalhados', 'Prioridade no suporte'],
      badge: null
    },
    monthly: {
      id: 'monthly',
      title: 'Mensal',
      price: 49.90,
      cents: 4990,
      description: 'R$ 49,90/mês',
      features: ['Análise ilimitada', 'Resultados detalhados', 'Prioridade no suporte', 'Economize 50% vs Semanal'],
      badge: 'Mais Popular'
    },
    yearly: {
      id: 'yearly',
      title: 'Anual',
      price: 499.90,
      cents: 49990,
      description: 'R$ 499,90/ano',
      features: ['Análise ilimitada', 'Resultados detalhados', 'Prioridade no suporte', '2 meses grátis'],
      badge: 'Melhor Valor'
    }
  }
} as const;

export type PlanType = keyof typeof PLAN_CONFIG.PLANS;
