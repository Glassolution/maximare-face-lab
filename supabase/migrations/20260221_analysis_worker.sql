-- Analysis Worker: schema updates, policies, and RPC helpers
-- This migration introduces job lifecycle fields on analysis_history,
-- safe acquisition via SKIP LOCKED, stale requeue, completion/failure handling,
-- and service role policies for management.

-- 1) Extend analysis_history with lifecycle fields
ALTER TABLE public.analysis_history
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS retry_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text NULL,
  ADD COLUMN IF NOT EXISTS locked_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS worker_id text NULL;

-- Indexes for efficient picking and monitoring
CREATE INDEX IF NOT EXISTS analysis_history_status_created_idx
  ON public.analysis_history (status, created_at);

CREATE INDEX IF NOT EXISTS analysis_history_locked_idx
  ON public.analysis_history (status, locked_at)
  WHERE status = 'processing';

-- 2) RLS: allow service role to manage analysis_history
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'analysis_history'
      AND policyname = 'Service role can manage analysis_history'
  ) THEN
    CREATE POLICY "Service role can manage analysis_history"
      ON public.analysis_history
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END$$;

-- 3) RPC: Acquire one pending job safely with SKIP LOCKED
CREATE OR REPLACE FUNCTION public.acquire_pending_analysis(_worker_id text)
RETURNS public.analysis_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  picked public.analysis_history%ROWTYPE;
BEGIN
  -- Atomic: select and mark as processing within single statement
  WITH cte AS (
    SELECT id
    FROM public.analysis_history
    WHERE status = 'pending'
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  )
  UPDATE public.analysis_history AS ah
  SET status = 'processing',
      started_at = COALESCE(ah.started_at, now()),
      locked_at = now(),
      worker_id = _worker_id
  FROM cte
  WHERE ah.id = cte.id
  RETURNING ah.* INTO picked;

  IF picked.id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN picked;
END$$;

-- 4) RPC: Mark job completed
CREATE OR REPLACE FUNCTION public.mark_completed(_job_id bigint)
RETURNS public.analysis_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.analysis_history%ROWTYPE;
BEGIN
  UPDATE public.analysis_history
  SET status = 'completed',
      completed_at = now(),
      locked_at = NULL,
      worker_id = NULL
  WHERE id = _job_id
  RETURNING * INTO updated;
  RETURN updated;
END$$;

-- 5a) RPC: Mark job completed and store result/provider meta atomically
CREATE OR REPLACE FUNCTION public.mark_completed_with_result(
  _job_id bigint,
  _result_json jsonb,
  _provider_meta jsonb
)
RETURNS public.analysis_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.analysis_history%ROWTYPE;
BEGIN
  UPDATE public.analysis_history
  SET status = 'completed',
      completed_at = now(),
      locked_at = NULL,
      worker_id = NULL,
      result_json = COALESCE(_result_json, result_json),
      provider_meta = COALESCE(_provider_meta, provider_meta)
  WHERE id = _job_id
  RETURNING * INTO updated;
  RETURN updated;
END$$;

-- 5) RPC: Mark job failed with retry/backoff logic
-- If retry_count+1 < 3 -> move back to pending (for future retry)
-- Else -> dead_letter
CREATE OR REPLACE FUNCTION public.mark_failed(_job_id bigint, _error_message text)
RETURNS public.analysis_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_retry int;
  updated public.analysis_history%ROWTYPE;
BEGIN
  SELECT retry_count INTO current_retry FROM public.analysis_history WHERE id = _job_id FOR UPDATE;

  IF current_retry IS NULL THEN
    RETURN NULL;
  END IF;

  IF current_retry + 1 >= 3 THEN
    UPDATE public.analysis_history
    SET status = 'dead_letter',
        retry_count = current_retry + 1,
        last_error = _error_message,
        locked_at = NULL,
        worker_id = NULL
    WHERE id = _job_id
    RETURNING * INTO updated;
    RETURN updated;
  ELSE
    UPDATE public.analysis_history
    SET status = 'pending',
        retry_count = current_retry + 1,
        last_error = _error_message,
        locked_at = NULL,
        worker_id = NULL
    WHERE id = _job_id
    RETURNING * INTO updated;
    RETURN updated;
  END IF;
END$$;

-- 6) RPC: Requeue stale jobs (processing > 2 minutes)
CREATE OR REPLACE FUNCTION public.requeue_stale_jobs(_stale_seconds int DEFAULT 120)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected int;
BEGIN
  UPDATE public.analysis_history
  SET status = 'pending',
      retry_count = retry_count + 1,
      last_error = COALESCE(last_error, '') || CASE WHEN last_error IS NULL THEN '' ELSE E'\n' END || 'stale_lock_requeue',
      locked_at = NULL,
      worker_id = NULL
  WHERE status = 'processing'
    AND locked_at IS NOT NULL
    AND locked_at < (now() - make_interval(secs => _stale_seconds))
  RETURNING 1 INTO affected;

  -- affected via FOUND count
  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END$$;

-- 7) RPC: Move job explicitly to dead_letter
CREATE OR REPLACE FUNCTION public.move_to_dead_letter(_job_id bigint, _error_message text)
RETURNS public.analysis_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  updated public.analysis_history%ROWTYPE;
BEGIN
  UPDATE public.analysis_history
  SET status = 'dead_letter',
      last_error = _error_message,
      locked_at = NULL,
      worker_id = NULL
  WHERE id = _job_id
  RETURNING * INTO updated;
  RETURN updated;
END$$;
