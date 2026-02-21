export const PAYMENT_LINKS = {
  weekly: 'https://mpago.la/2n75aFU',
  monthly: 'https://mpago.la/1ZGf947',
  yearly: 'https://mpago.la/26SW8Ef'
} as const;

export type PaymentLinkPlan = keyof typeof PAYMENT_LINKS;
