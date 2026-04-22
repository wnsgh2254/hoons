-- Enforce that prepaid_passes rows always belong to an existing customer.
-- This guarantees "customers-registered users only" for prepaid records.

-- Remove invalid rows before adding strict constraints.
delete from public.prepaid_passes p
where p.customer_id is null
   or not exists (
    select 1
    from public.customers c
    where c.id = p.customer_id
  );

-- Make customer_id mandatory.
alter table public.prepaid_passes
alter column customer_id set not null;

-- Add FK constraint if it does not already exist.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'prepaid_passes_customer_id_fkey'
      and conrelid = 'public.prepaid_passes'::regclass
  ) then
    alter table public.prepaid_passes
      add constraint prepaid_passes_customer_id_fkey
      foreign key (customer_id)
      references public.customers(id)
      on update cascade
      on delete restrict;
  end if;
end $$;

create index if not exists idx_prepaid_passes_customer_id
  on public.prepaid_passes(customer_id);
