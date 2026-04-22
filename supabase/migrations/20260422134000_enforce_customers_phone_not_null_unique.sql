-- Enforce one customer per phone number and prevent empty phone rows.

-- Normalize blank phone values to NULL so constraints can be applied safely.
update public.customers
set phone = null
where phone is not null and trim(phone) = '';

-- Remove any residual NULL phones (should be zero after prior cleanup).
delete from public.customers
where phone is null;

-- Enforce required phone.
alter table public.customers
  alter column phone set not null;

-- Enforce one row per phone number.
create unique index if not exists idx_customers_phone_unique
  on public.customers(phone);
