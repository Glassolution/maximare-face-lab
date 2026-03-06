
-- Table to track page views (including anonymous visitors)
CREATE TABLE public.page_views (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id text NOT NULL,
    user_id uuid,
    page_path text NOT NULL,
    referrer text,
    user_agent text,
    duration_seconds integer DEFAULT 0,
    is_exit boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.page_views ENABLE ROW LEVEL SECURITY;

-- Only service role and anonymous inserts
CREATE POLICY "Anyone can insert page views" ON public.page_views
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role manages page views" ON public.page_views
    FOR ALL USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Indexes
CREATE INDEX idx_page_views_created_at ON public.page_views(created_at);
CREATE INDEX idx_page_views_page_path ON public.page_views(page_path);
CREATE INDEX idx_page_views_session_id ON public.page_views(session_id);

-- RPC to get aggregated analytics (admin only via security definer)
CREATE OR REPLACE FUNCTION public.get_page_analytics(days_back integer DEFAULT 30)
RETURNS TABLE(
    total_visitors bigint,
    total_pageviews bigint,
    unique_sessions bigint,
    registered_visitors bigint,
    anonymous_visitors bigint,
    pages jsonb,
    daily_visitors jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    start_date timestamptz := now() - (days_back || ' days')::interval;
    pages_data jsonb;
    daily_data jsonb;
    total_v bigint;
    total_pv bigint;
    unique_s bigint;
    reg_v bigint;
    anon_v bigint;
BEGIN
    -- Total pageviews
    SELECT count(*) INTO total_pv FROM page_views WHERE created_at >= start_date;
    
    -- Unique sessions
    SELECT count(DISTINCT session_id) INTO unique_s FROM page_views WHERE created_at >= start_date;
    
    -- Total visitors (unique sessions)
    total_v := unique_s;
    
    -- Registered vs anonymous
    SELECT count(DISTINCT session_id) INTO reg_v FROM page_views WHERE created_at >= start_date AND user_id IS NOT NULL;
    anon_v := unique_s - reg_v;
    
    -- Pages analytics: views, unique visitors, avg duration, exit count
    SELECT jsonb_agg(row_to_json(t)) INTO pages_data
    FROM (
        SELECT
            page_path,
            count(*) AS views,
            count(DISTINCT session_id) AS unique_visitors,
            round(avg(CASE WHEN duration_seconds > 0 THEN duration_seconds ELSE NULL END)) AS avg_duration_seconds,
            count(*) FILTER (WHERE is_exit = true) AS exit_count,
            CASE WHEN count(*) > 0 THEN round((count(*) FILTER (WHERE is_exit = true))::numeric / count(*)::numeric * 100, 1) ELSE 0 END AS exit_rate
        FROM page_views
        WHERE created_at >= start_date
        GROUP BY page_path
        ORDER BY views DESC
    ) t;
    
    -- Daily visitors
    SELECT jsonb_agg(row_to_json(t)) INTO daily_data
    FROM (
        SELECT
            to_char(created_at::date, 'DD/MM') AS day,
            count(DISTINCT session_id) AS visitors,
            count(*) AS pageviews
        FROM page_views
        WHERE created_at >= start_date
        GROUP BY created_at::date
        ORDER BY created_at::date
    ) t;
    
    RETURN QUERY SELECT total_v, total_pv, unique_s, reg_v, anon_v, COALESCE(pages_data, '[]'::jsonb), COALESCE(daily_data, '[]'::jsonb);
END;
$$;
