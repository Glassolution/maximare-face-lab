-- Create RPC to cancel a battle by participants
CREATE OR REPLACE FUNCTION public.cancel_battle_v1(p_battle_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  uid uuid := auth.uid();
  b RECORD;
BEGIN
  IF uid IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'not_authenticated');
  END IF;

  SELECT id, created_by, opponent_id, status
  INTO b
  FROM public.battles
  WHERE id = p_battle_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'battle_not_found');
  END IF;

  IF b.created_by <> uid AND b.opponent_id <> uid THEN
    RETURN json_build_object('success', false, 'error', 'not_participant');
  END IF;

  UPDATE public.battles
  SET status = 'canceled',
      canceled_at = now()
  WHERE id = b.id;

  RETURN json_build_object('success', true);
EXCEPTION
  WHEN others THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- Allow execution for authenticated users (function runs as security definer)
REVOKE ALL ON FUNCTION public.cancel_battle_v1(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cancel_battle_v1(uuid) TO authenticated;
