
-- Create payments table for better tracking
CREATE TABLE IF NOT EXISTS public.payments (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    payment_id text NOT NULL, -- Mercado Pago ID
    user_id uuid REFERENCES auth.users(id),
    plan_id text REFERENCES public.plans(id),
    status text NOT NULL DEFAULT 'pending',
    amount numeric,
    currency text DEFAULT 'BRL',
    metadata jsonb,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT unique_payment_id UNIQUE(payment_id)
);

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own payments"
ON public.payments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage payments"
ON public.payments FOR ALL
USING (auth.role() = 'service_role');

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_payments_updated_at
BEFORE UPDATE ON public.payments
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
