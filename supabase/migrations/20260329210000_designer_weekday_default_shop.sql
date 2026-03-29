-- Default venue per weekday for multi-venue designers (e.g. 윤훈/태훈).
-- Used by /api/designer-schedules so customers only book at the intended shop until date-specific overrides.

CREATE TABLE IF NOT EXISTS public.designer_weekday_default_shop (
  designer_id INTEGER NOT NULL REFERENCES public.designers(id) ON DELETE CASCADE,
  weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
  shop_id INTEGER NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (designer_id, weekday)
);

CREATE INDEX IF NOT EXISTS idx_designer_weekday_default_shop_designer
  ON public.designer_weekday_default_shop(designer_id);

COMMENT ON TABLE public.designer_weekday_default_shop IS
  '0=Sun..6=Sat (Sydney calendar). For designers linked to 2+ shops: normal booking shop per weekday; 특별 근무일 can override non-default venue.';

ALTER TABLE public.designer_weekday_default_shop ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all on designer_weekday_default_shop"
  ON public.designer_weekday_default_shop
  FOR ALL
  USING (true)
  WITH CHECK (true);
