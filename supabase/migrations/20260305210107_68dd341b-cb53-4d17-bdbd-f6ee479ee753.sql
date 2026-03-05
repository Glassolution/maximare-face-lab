-- Desabilitar apenas o trigger de proteção
ALTER TABLE public.profiles DISABLE TRIGGER protect_subscription_fields_trigger;

UPDATE public.profiles SET
  subscription_status = 'active',
  is_premium = true,
  plan_type = 'monthly',
  premium_since = now(),
  subscription_expires_at = now() + interval '1 month',
  payment_provider = 'mercadopago',
  provider_payment_id = '149007973638',
  last_payment_at = now()
WHERE user_id = '21858475-5b09-4f31-81e1-9b2392301ac7';

UPDATE public.purchases SET status = 'approved' WHERE mp_payment_id = '149007973638';

ALTER TABLE public.profiles ENABLE TRIGGER protect_subscription_fields_trigger;