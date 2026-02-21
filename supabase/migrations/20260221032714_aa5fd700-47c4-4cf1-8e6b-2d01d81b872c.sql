
-- Tutorial Assets table for caching generated tutorial images
CREATE TABLE public.tutorial_assets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  intervention_type TEXT NOT NULL,
  step_index INTEGER NOT NULL,
  locale TEXT NOT NULL DEFAULT 'pt-BR',
  version INTEGER NOT NULL DEFAULT 1,
  style TEXT NOT NULL DEFAULT 'minimal_app_guide',
  image_url TEXT NOT NULL,
  prompt_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_tutorial_assets_key ON public.tutorial_assets (key);
CREATE INDEX idx_tutorial_assets_type_step ON public.tutorial_assets (intervention_type, step_index);
CREATE INDEX idx_tutorial_assets_hash ON public.tutorial_assets (prompt_hash);

-- Enable RLS
ALTER TABLE public.tutorial_assets ENABLE ROW LEVEL SECURITY;

-- Public read access (tutorial images are shared, not user-specific)
CREATE POLICY "Tutorial assets are publicly readable"
ON public.tutorial_assets FOR SELECT
USING (true);

-- Only service role can insert/update (server-side generation)
CREATE POLICY "Service role can manage tutorial assets"
ON public.tutorial_assets FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- Timestamp trigger
CREATE TRIGGER update_tutorial_assets_updated_at
BEFORE UPDATE ON public.tutorial_assets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Storage bucket for tutorial images
INSERT INTO storage.buckets (id, name, public) VALUES ('tutorial-images', 'tutorial-images', true);

-- Public read for tutorial images
CREATE POLICY "Tutorial images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'tutorial-images');

-- Service role can upload
CREATE POLICY "Service role can upload tutorial images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'tutorial-images');
