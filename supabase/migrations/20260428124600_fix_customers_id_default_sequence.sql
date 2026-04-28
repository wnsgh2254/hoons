-- Ensure customers.id auto-increments for new customer inserts.
do $$
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relkind = 'S'
      and n.nspname = 'public'
      and c.relname = 'customers_id_seq'
  ) then
    create sequence public.customers_id_seq;
  end if;

  alter sequence public.customers_id_seq owned by public.customers.id;

  alter table public.customers
    alter column id set default nextval('public.customers_id_seq'::regclass);

  perform setval(
    'public.customers_id_seq',
    greatest((select coalesce(max(id), 0) from public.customers), 1),
    true
  );
end $$;
