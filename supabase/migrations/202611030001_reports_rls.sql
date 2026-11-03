-- DeepDive report persistence and Clerk-backed row-level security.
-- Prerequisite: Supabase must trust Clerk JWTs and map them to role=authenticated.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id text NOT NULL,
    thread_id text NOT NULL,
    query text NOT NULL,
    report_text text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can insert their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can update their own reports" ON public.reports;
DROP POLICY IF EXISTS "Users can delete their own reports" ON public.reports;

CREATE POLICY "Users can view their own reports"
ON public.reports FOR SELECT TO authenticated
USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can insert their own reports"
ON public.reports FOR INSERT TO authenticated
WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can update their own reports"
ON public.reports FOR UPDATE TO authenticated
USING ((auth.jwt() ->> 'sub') = user_id)
WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can delete their own reports"
ON public.reports FOR DELETE TO authenticated
USING ((auth.jwt() ->> 'sub') = user_id);

GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reports TO authenticated;

CREATE INDEX IF NOT EXISTS idx_reports_user_created
ON public.reports (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reports_thread
ON public.reports (thread_id);
