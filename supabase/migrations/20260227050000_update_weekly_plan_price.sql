DO $$
BEGIN
  -- Update 'plans' table weekly plan to R$ 1,00 if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='plans'
  ) THEN
    UPDATE public.plans
      SET price_cents = 100,
          interval = COALESCE(interval, 'weekly'),
          name = COALESCE(name, 'Semanal')
    WHERE id = 'weekly';

    IF NOT FOUND THEN
      INSERT INTO public.plans (id, price_cents)
      VALUES ('weekly', 100)
      ON CONFLICT (id) DO UPDATE SET price_cents = EXCLUDED.price_cents;
    END IF;
  END IF;
END
$$;
