REVOKE ALL ON FUNCTION public.ensure_battle_progress_v3(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_battle_progress_v3(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.mock_process_battle_result(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mock_process_battle_result(uuid) TO authenticated;
