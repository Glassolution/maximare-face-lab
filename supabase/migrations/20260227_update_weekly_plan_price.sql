DO $$
BEGIN
  -- Update 'plans' table weekly plan to R$ 1,00 if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='plans'
  ) THEN
    -- Try to update; if not present, try to insert with minimal fields
    UPDATE public.plans
      SET price_cents = 100,
          interval = COALESCE(interval, 'weekly'),
          name = COALESCE(name, 'Semanal'),
          updated_at = now()
    WHERE id = 'weekly';
    
    IF NOT FOUND THEN
      BEGIN
        INSERT INTO public.plans (id, name, interval, price_cents, active, created_at, updated_at)
        VALUES ('weekly', 'Semanal', 'weekly', 100, true, now(), now());
      EXCEPTION WHEN undefined_column THEN
        -- Fallback if schema differs: insert minimal known columns
        INSERT INTO public.plans (id, price_cents)
        VALUES ('weekly', 100)
        ON CONFLICT (id) DO UPDATE SET price_cents = EXCLUDED.price_cents;
      END;
    END IF;
  END IF;
END
$$;

