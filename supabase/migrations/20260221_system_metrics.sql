-- System scale metrics and global AI throttle

-- 1) Metrics table
CREATE TABLE IF NOT EXISTS public.system_metrics (
  id bigserial primary key,
  timestamp timestamptz NOT NULL DEFAULT now(),
  pending_count integer NOT NULL DEFAULT 0,
  processing_count integer NOT NULL DEFAULT 0,
  completed_last_minute integer NOT NULL DEFAULT 0,
  failed_last_minute integer NOT NULL DEFAULT 0,
  created_last_minute integer NOT NULL DEFAULT 0,
  processed_last_minute integer NOT NULL DEFAULT 0,
  avg_processing_time_ms integer NULL,
  avg_queue_time_ms integer NULL,
  p95_processing_time_ms integer NULL,
  daily_cost_estimate numeric(12,4) NULL,
  avg_ai_latency_ms integer NULL,
  p95_ai_latency_ms integer NULL,
  failure_rate_real numeric(6,4) NULL,
  retry_rate_real numeric(6,4) NULL,
  throughput_real_per_minute integer NULL
);

CREATE INDEX IF NOT EXISTS system_metrics_timestamp_idx
  ON public.system_metrics (timestamp DESC);

-- 2) Global throttle counters
CREATE TABLE IF NOT EXISTS public.system_limits (
  key text primary key,
  value integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_limits(key, value)
VALUES ('ai_calls_inflight', 0)
ON CONFLICT (key) DO NOTHING;

-- 3) Auxiliary indexes on analysis_history
CREATE INDEX IF NOT EXISTS analysis_history_retry_idx
  ON public.analysis_history (retry_count);

CREATE INDEX IF NOT EXISTS analysis_history_started_idx
  ON public.analysis_history (started_at)
  WHERE started_at IS NOT NULL;

-- 4) RPC: Update metrics snapshot
CREATE OR REPLACE FUNCTION public.update_system_metrics()
RETURNS public.system_metrics
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pending_cnt int;
  processing_cnt int;
  completed_min int;
  failed_min int;
  created_min int;
  processed_min int;
  avg_proc_ms int;
  avg_queue_ms int;
  p95_proc_ms int;
  cost_est numeric(12,4);
  avg_ai_ms int;
  p95_ai_ms int;
  fail_rate numeric(6,4);
  retry_rate numeric(6,4);
  row public.system_metrics%ROWTYPE;
BEGIN
  SELECT count(*) INTO pending_cnt FROM public.analysis_history WHERE status = 'pending';
  SELECT count(*) INTO processing_cnt FROM public.analysis_history WHERE status = 'processing';
  SELECT count(*) INTO completed_min FROM public.analysis_history WHERE status = 'completed' AND completed_at > (now() - interval '1 minute');
  SELECT count(*) INTO failed_min FROM public.analysis_history WHERE status = 'failed' AND started_at > (now() - interval '1 minute');
  SELECT count(*) INTO created_min FROM public.analysis_history WHERE created_at > (now() - interval '1 minute');
  SELECT count(*) INTO processed_min FROM public.analysis_history WHERE status IN ('completed','failed') AND started_at > (now() - interval '1 minute');

  -- avg processing time over last hour
  SELECT
    COALESCE(AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::int, NULL)
  INTO avg_proc_ms
  FROM public.analysis_history
  WHERE status = 'completed'
    AND completed_at > (now() - interval '1 hour')
    AND started_at IS NOT NULL;

  -- avg queue time over last hour
  SELECT
    COALESCE(AVG(EXTRACT(EPOCH FROM (started_at - created_at)) * 1000)::int, NULL)
  INTO avg_queue_ms
  FROM public.analysis_history
  WHERE status IN ('processing','completed')
    AND started_at IS NOT NULL
    AND started_at > (now() - interval '1 hour');

  -- p95 processing time over last day
  SELECT
    COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000)::int, NULL)
  INTO p95_proc_ms
  FROM public.analysis_history
  WHERE status = 'completed'
    AND completed_at > (now() - interval '1 day')
    AND started_at IS NOT NULL;

  -- avg/p95 AI latency from provider_meta.latency_ms (last hour/day)
  SELECT
    COALESCE(AVG((provider_meta->>'latency_ms')::int), NULL)
  INTO avg_ai_ms
  FROM public.analysis_history
  WHERE status = 'completed'
    AND completed_at > (now() - interval '1 hour')
    AND provider_meta ? 'latency_ms';

  SELECT
    COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY (provider_meta->>'latency_ms')::int), NULL)
  INTO p95_ai_ms
  FROM public.analysis_history
  WHERE status = 'completed'
    AND completed_at > (now() - interval '1 day')
    AND provider_meta ? 'latency_ms';

  -- daily cost estimate from provider_meta.estimated_cost
  SELECT
    COALESCE(SUM(CASE
      WHEN provider_meta ? 'estimated_cost'
      THEN (provider_meta->>'estimated_cost')::numeric
      ELSE 0
    END), 0)::numeric(12,4)
  INTO cost_est
  FROM public.analysis_history
  WHERE created_at::date = now()::date;

  -- failure and retry rate last minute
  SELECT
    CASE WHEN processed_min > 0 THEN failed_min::numeric / processed_min::numeric ELSE NULL END
  INTO fail_rate;

  SELECT
    CASE WHEN processed_min > 0 THEN (
      SELECT count(*) FROM public.analysis_history
      WHERE status IN ('completed','failed')
        AND started_at > (now() - interval '1 minute')
        AND retry_count > 0
    )::numeric / processed_min::numeric ELSE NULL END
  INTO retry_rate;

  INSERT INTO public.system_metrics(
    pending_count, processing_count,
    completed_last_minute, failed_last_minute,
    created_last_minute, processed_last_minute,
    avg_processing_time_ms, avg_queue_time_ms, p95_processing_time_ms,
    daily_cost_estimate,
    avg_ai_latency_ms, p95_ai_latency_ms,
    failure_rate_real, retry_rate_real,
    throughput_real_per_minute
  )
  VALUES (
    pending_cnt, processing_cnt,
    completed_min, failed_min,
    created_min, processed_min,
    avg_proc_ms, avg_queue_ms, p95_proc_ms,
    cost_est,
    avg_ai_ms, p95_ai_ms,
    fail_rate, retry_rate,
    processed_min
  )
  RETURNING * INTO row;
  RETURN row;
END$$;

-- 5) RPC: Acquire global AI slot
CREATE OR REPLACE FUNCTION public.acquire_ai_slot(_max_calls int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current int;
BEGIN
  PERFORM pg_advisory_xact_lock(1234567890);
  SELECT value INTO current FROM public.system_limits WHERE key = 'ai_calls_inflight' FOR UPDATE;
  IF current IS NULL THEN
    INSERT INTO public.system_limits(key, value) VALUES ('ai_calls_inflight', 0)
    ON CONFLICT (key) DO NOTHING;
    current := 0;
  END IF;

  IF current >= _max_calls THEN
    RETURN FALSE;
  END IF;

  UPDATE public.system_limits SET value = current + 1, updated_at = now() WHERE key = 'ai_calls_inflight';
  RETURN TRUE;
END$$;

-- 6) RPC: Release global AI slot
CREATE OR REPLACE FUNCTION public.release_ai_slot()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current int;
BEGIN
  PERFORM pg_advisory_xact_lock(1234567890);
  SELECT value INTO current FROM public.system_limits WHERE key = 'ai_calls_inflight' FOR UPDATE;
  IF current IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.system_limits SET value = GREATEST(0, current - 1), updated_at = now() WHERE key = 'ai_calls_inflight';
END$$;
