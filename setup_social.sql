-- 1. Create Friends Table
CREATE TABLE IF NOT EXISTS public.friends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, friend_id)
);

-- 2. Create Friend Requests Table
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create User Data Table (for scores)
CREATE TABLE IF NOT EXISTS public.user_data (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    last_analysis_score NUMERIC,
    visibility_score TEXT DEFAULT 'public',
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Enable RLS
ALTER TABLE public.friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_data ENABLE ROW LEVEL SECURITY;

-- 5. Fix Profiles Table (Add display_name)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name TEXT;
UPDATE public.profiles SET display_name = full_name WHERE display_name IS NULL;

-- 6. Policies

-- Friends: Users can view their own friends
DROP POLICY IF EXISTS "Users can view their own friends" ON public.friends;
CREATE POLICY "Users can view their own friends" ON public.friends
    FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Friend Requests: Users can view requests they sent or received
DROP POLICY IF EXISTS "Users can view their requests" ON public.friend_requests;
CREATE POLICY "Users can view their requests" ON public.friend_requests
    FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Friend Requests: Users can insert requests (as requester)
DROP POLICY IF EXISTS "Users can send requests" ON public.friend_requests;
CREATE POLICY "Users can send requests" ON public.friend_requests
    FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Friend Requests: Users can update their requests
DROP POLICY IF EXISTS "Users can update their requests" ON public.friend_requests;
CREATE POLICY "Users can update their requests" ON public.friend_requests
    FOR UPDATE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- User Data: Public read
DROP POLICY IF EXISTS "User data is viewable by everyone" ON public.user_data;
CREATE POLICY "User data is viewable by everyone" ON public.user_data
    FOR SELECT USING (true);

-- User Data: Update own
DROP POLICY IF EXISTS "Users can update their own data" ON public.user_data;
CREATE POLICY "Users can update their own data" ON public.user_data
    FOR UPDATE USING (auth.uid() = user_id);
    
-- User Data: Insert own
DROP POLICY IF EXISTS "Users can insert their own data" ON public.user_data;
CREATE POLICY "Users can insert their own data" ON public.user_data
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Functions for Friend Logic

-- remove_friend
CREATE OR REPLACE FUNCTION public.remove_friend(target_friend_id UUID)
RETURNS VOID AS $$
BEGIN
  DELETE FROM public.friends 
  WHERE (user_id = auth.uid() AND friend_id = target_friend_id)
     OR (user_id = target_friend_id AND friend_id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- send_friend_request
CREATE OR REPLACE FUNCTION public.send_friend_request(target_username TEXT)
RETURNS JSONB AS $$
DECLARE
  target_uid UUID;
  existing_req UUID;
  already_friends BOOLEAN;
BEGIN
  -- Find user by username
  SELECT id INTO target_uid FROM public.profiles WHERE username = target_username;
  
  IF target_uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Usuário não encontrado');
  END IF;

  IF target_uid = auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não pode adicionar a si mesmo');
  END IF;

  -- Check if already friends
  SELECT EXISTS(
    SELECT 1 FROM public.friends 
    WHERE (user_id = auth.uid() AND friend_id = target_uid)
       OR (user_id = target_uid AND friend_id = auth.uid())
  ) INTO already_friends;

  IF already_friends THEN
    RETURN jsonb_build_object('success', false, 'error', 'Vocês já são amigos');
  END IF;

  -- Check existing request
  SELECT id INTO existing_req FROM public.friend_requests
  WHERE (requester_id = auth.uid() AND addressee_id = target_uid AND status = 'pending')
     OR (requester_id = target_uid AND addressee_id = auth.uid() AND status = 'pending');

  IF existing_req IS NOT NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Já existe uma solicitação pendente');
  END IF;

  -- Insert request
  INSERT INTO public.friend_requests (requester_id, addressee_id)
  VALUES (auth.uid(), target_uid);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- respond_friend_request
CREATE OR REPLACE FUNCTION public.respond_friend_request(request_id UUID, action TEXT)
RETURNS JSONB AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req FROM public.friend_requests WHERE id = request_id;
  
  IF req IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  IF req.addressee_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autorizado');
  END IF;

  IF req.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação já processada');
  END IF;

  IF action = 'accepted' THEN
    UPDATE public.friend_requests SET status = 'accepted', updated_at = now() WHERE id = request_id;
    -- Create bi-directional friendship
    INSERT INTO public.friends (user_id, friend_id) VALUES (req.requester_id, req.addressee_id);
    INSERT INTO public.friends (user_id, friend_id) VALUES (req.addressee_id, req.requester_id);
  ELSE
    UPDATE public.friend_requests SET status = 'rejected', updated_at = now() WHERE id = request_id;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- cancel_friend_request
CREATE OR REPLACE FUNCTION public.cancel_friend_request(request_id UUID)
RETURNS JSONB AS $$
DECLARE
  req RECORD;
BEGIN
  SELECT * INTO req FROM public.friend_requests WHERE id = request_id;
  
  IF req IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação não encontrada');
  END IF;

  IF req.requester_id != auth.uid() THEN
    RETURN jsonb_build_object('success', false, 'error', 'Não autorizado');
  END IF;

  IF req.status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Solicitação já processada');
  END IF;

  UPDATE public.friend_requests SET status = 'canceled', updated_at = now() WHERE id = request_id;
  
  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger to sync Analysis Score to User Data
CREATE OR REPLACE FUNCTION public.update_user_score()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_data (user_id, last_analysis_score, updated_at)
  VALUES (new.user_id, (new.result_json->>'ger')::numeric, now())
  ON CONFLICT (user_id) 
  DO UPDATE SET last_analysis_score = (new.result_json->>'ger')::numeric, updated_at = now();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_analysis_inserted ON public.analysis_history;
CREATE TRIGGER on_analysis_inserted
  AFTER INSERT ON public.analysis_history
  FOR EACH ROW EXECUTE PROCEDURE public.update_user_score();
