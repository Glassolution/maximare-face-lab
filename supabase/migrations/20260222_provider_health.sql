CREATE TABLE IF NOT EXISTS public.provider_health (
  provider_name text PRIMARY KEY,
  state text NOT NULL DEFAULT 'closed',
  failure_count integer NOT NULL DEFAULT 0,
  last_failure_at timestamptz NULL,
  open_until timestamptz NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  half_open_inflight boolean NOT NULL DEFAULT false
);

CREATE OR REPLACE FUNCTION public.provider_cb_can_call(_provider_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ph public.provider_health%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_provider_name));
  SELECT * INTO ph FROM public.provider_health WHERE provider_name = _provider_name FOR UPDATE;
  IF ph.provider_name IS NULL THEN
    INSERT INTO public.provider_health(provider_name) VALUES (_provider_name)
    RETURNING * INTO ph;
  END IF;
  IF ph.state = 'open' THEN
    IF ph.open_until IS NOT NULL AND now() < ph.open_until THEN
      RETURN FALSE;
    ELSE
      UPDATE public.provider_health
      SET state = 'half_open',
          updated_at = now(),
          half_open_inflight = CASE WHEN half_open_inflight = TRUE THEN TRUE ELSE TRUE END
      WHERE provider_name = _provider_name
      RETURNING * INTO ph;
      IF ph.half_open_inflight = TRUE THEN
        RETURN FALSE;
      END IF;
    END IF;
  END IF;
  IF ph.state = 'half_open' THEN
    IF ph.half_open_inflight = TRUE THEN
      RETURN FALSE;
    ELSE
      UPDATE public.provider_health
      SET half_open_inflight = TRUE,
          updated_at = now()
      WHERE provider_name = _provider_name;
      RETURN TRUE;
    END IF;
  END IF;
  RETURN TRUE;
END$$;

CREATE OR REPLACE FUNCTION public.provider_cb_on_success(_provider_name text, _latency_ms int)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ph public.provider_health%ROWTYPE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_provider_name));
  SELECT * INTO ph FROM public.provider_health WHERE provider_name = _provider_name FOR UPDATE;
  IF ph.provider_name IS NULL THEN
    INSERT INTO public.provider_health(provider_name) VALUES (_provider_name)
    RETURNING * INTO ph;
  END IF;
  IF ph.state = 'half_open' THEN
    UPDATE public.provider_health
    SET state = 'closed',
        failure_count = 0,
        open_until = NULL,
        half_open_inflight = FALSE,
        updated_at = now()
    WHERE provider_name = _provider_name;
    INSERT INTO public.ia_logs(created_at, user_id, ip, event_type, provider)
    VALUES (now(), NULL, NULL, 'circuit_closed', _provider_name);
  ELSE
    UPDATE public.provider_health
    SET failure_count = 0,
        updated_at = now()
    WHERE provider_name = _provider_name;
  END IF;
END$$;

CREATE OR REPLACE FUNCTION public.provider_cb_on_failure(_provider_name text, _error_kind text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ph public.provider_health%ROWTYPE;
  processed int;
  failed int;
  fail_rate numeric;
  p95_latency int;
  should_open boolean := FALSE;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(_provider_name));
  SELECT * INTO ph FROM public.provider_health WHERE provider_name = _provider_name FOR UPDATE;
  IF ph.provider_name IS NULL THEN
    INSERT INTO public.provider_health(provider_name) VALUES (_provider_name)
    RETURNING * INTO ph;
  END IF;

  UPDATE public.provider_health
  SET failure_count = ph.failure_count + 1,
      last_failure_at = now(),
      updated_at = now(),
      half_open_inflight = FALSE
  WHERE provider_name = _provider_name;

  SELECT count(*) INTO processed
  FROM public.analysis_history
  WHERE started_at > (now() - interval '30 seconds')
    AND status IN ('completed','failed')
    AND provider_meta ? 'provider'
    AND provider_meta->>'provider' = _provider_name;

  SELECT count(*) INTO failed
  FROM public.analysis_history
  WHERE started_at > (now() - interval '30 seconds')
    AND status = 'failed'
    AND provider_meta ? 'provider'
    AND provider_meta->>'provider' = _provider_name;

  IF processed > 0 THEN
    fail_rate := failed::numeric / processed::numeric;
  ELSE
    fail_rate := 0;
  END IF;

  SELECT COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY (provider_meta->>'latency_ms')::int), NULL)
  INTO p95_latency
  FROM public.analysis_history
  WHERE started_at > (now() - interval '30 seconds')
    AND status = 'completed'
    AND provider_meta ? 'latency_ms'
    AND provider_meta ? 'provider'
    AND provider_meta->>'provider' = _provider_name;

  SELECT * INTO ph FROM public.provider_health WHERE provider_name = _provider_name;
  IF ph.failure_count >= 5 THEN
    should_open := TRUE;
  END IF;
  IF fail_rate > 0.40 THEN
    should_open := TRUE;
  END IF;
  IF p95_latency IS NOT NULL AND p95_latency > 5000 THEN
    should_open := TRUE;
  END IF;

  IF should_open THEN
    UPDATE public.provider_health
    SET state = 'open',
        open_until = now() + interval '60 seconds',
        half_open_inflight = FALSE,
        updated_at = now()
    WHERE provider_name = _provider_name;
    INSERT INTO public.ia_logs(created_at, user_id, ip, event_type, provider, error_message)
    VALUES (now(), NULL, NULL, 'circuit_opened', _provider_name, _error_kind);
  END IF;
END$$;

