-- Lock direct PostgREST access (anon/authenticated JWT).
-- Next.js API routes use SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
-- No permissive policies: external callers with only the anon key cannot read/write data.

DO $$
DECLARE
  pol RECORD;
  tbl RECORD;
BEGIN
  -- Remove legacy "allow everyone" policies if present
  FOR pol IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'DROP POLICY IF EXISTS %I ON %I.%I',
      pol.policyname,
      pol.schemaname,
      pol.tablename
    );
  END LOOP;

  -- Enable RLS on every public table (idempotent)
  FOR tbl IN
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',
      tbl.tablename
    );
  END LOOP;
END $$;
