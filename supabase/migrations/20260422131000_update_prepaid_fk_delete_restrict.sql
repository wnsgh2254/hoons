-- Ensure prepaid_passes.customer_id FK does not allow orphaning on customer delete.
alter table public.prepaid_passes
  drop constraint if exists prepaid_passes_customer_id_fkey;

alter table public.prepaid_passes
  add constraint prepaid_passes_customer_id_fkey
  foreign key (customer_id)
  references public.customers(id)
  on update cascade
  on delete restrict;
