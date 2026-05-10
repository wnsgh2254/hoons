alter table public.sales
  add column if not exists customer_name text;

update public.sales s
set customer_name = c.name
from public.customers c
where s.customer_id = c.id
  and (s.customer_name is null or nullif(trim(s.customer_name), '') is null);
