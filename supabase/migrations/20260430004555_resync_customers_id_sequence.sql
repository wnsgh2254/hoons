-- Re-sync customers_id_seq after imports or legacy id remaps (avoids duplicate customers_pkey on insert).
SELECT setval(
  'public.customers_id_seq',
  GREATEST((SELECT COALESCE(MAX(id), 0) FROM public.customers), 1),
  true
);
