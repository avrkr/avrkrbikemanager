create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  telegram_chat_id text,
  timezone text not null default 'Asia/Kolkata',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bikes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text,
  manufacturer text not null,
  model text not null,
  variant text,
  registration_number text,
  chassis_number text,
  engine_number text,
  manufacturing_year integer check (manufacturing_year between 1885 and 2100),
  purchase_date date,
  purchase_price numeric(12,2) check (purchase_price >= 0),
  current_odometer integer not null default 0 check (current_odometer >= 0),
  fuel_type text,
  engine_capacity_cc integer check (engine_capacity_cc > 0),
  front_tyre_size text,
  rear_tyre_size text,
  insurance_provider text,
  insurance_expiry date,
  puc_expiry date,
  warranty_expiry date,
  photo_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, owner_id)
);

create table public.maintenance_types (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade,
  name text not null,
  category text not null,
  is_builtin boolean not null default false,
  guidance_note text,
  created_at timestamptz not null default now(),
  unique (id, owner_id)
);

insert into public.maintenance_types (name, category, is_builtin, guidance_note) values
  ('Engine oil replacement', 'Engine', true, 'Generic estimate only; follow your manufacturer service manual.'),
  ('Oil filter replacement', 'Engine', true, 'Generic estimate only; follow your manufacturer service manual.'),
  ('Chain cleaning', 'Drivetrain', true, 'Interval varies with weather and riding conditions.'),
  ('Chain lubrication', 'Drivetrain', true, 'Interval varies with weather and riding conditions.'),
  ('Chain slack adjustment', 'Drivetrain', true, 'Check the model-specific slack specification.'),
  ('Air filter replacement', 'Engine', true, 'Inspect more frequently in dusty conditions.'),
  ('Spark plug replacement', 'Engine', true, 'Follow the manufacturer service manual.'),
  ('Brake pad inspection or replacement', 'Brakes', true, 'Inspect wear and braking performance regularly.'),
  ('Brake fluid replacement', 'Brakes', true, 'Follow the specified fluid and service interval.'),
  ('Coolant replacement', 'Cooling', true, 'Applicable to liquid-cooled motorcycles.'),
  ('Tyre inspection and replacement', 'Tyres', true, 'Check tread, age, pressure, and visible damage.'),
  ('Tyre pressure checks', 'Tyres', true, 'Use the pressure specified for your motorcycle.'),
  ('Battery inspection', 'Electrical', true, 'Inspect terminals and charging condition.'),
  ('General service', 'Service', true, 'Set intervals using manufacturer guidance when available.');

create table public.maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bike_id uuid not null,
  maintenance_type_id uuid,
  name text not null,
  category text not null,
  last_completed_date date,
  last_completed_odometer integer check (last_completed_odometer >= 0),
  interval_days integer check (interval_days > 0),
  interval_km integer check (interval_km > 0),
  next_due_date date,
  next_due_odometer integer check (next_due_odometer >= 0),
  estimated_cost numeric(12,2) check (estimated_cost >= 0),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  status text not null default 'upcoming' check (status in ('upcoming', 'due', 'overdue', 'completed')),
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (bike_id, owner_id) references public.bikes(id, owner_id) on delete cascade,
  foreign key (maintenance_type_id) references public.maintenance_types(id) on delete set null,
  unique (id, owner_id)
);

create table public.service_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bike_id uuid not null,
  maintenance_task_id uuid,
  service_date date not null,
  odometer integer not null check (odometer >= 0),
  workshop text,
  mechanic text,
  parts_replaced text,
  work_performed text,
  oil_brand text,
  oil_grade text,
  oil_quantity_litres numeric(6,2) check (oil_quantity_litres > 0),
  oil_cost numeric(12,2) check (oil_cost >= 0),
  labour_cost numeric(12,2) check (labour_cost >= 0),
  total_cost numeric(12,2) not null default 0 check (total_cost >= 0),
  invoice_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (bike_id, owner_id) references public.bikes(id, owner_id) on delete cascade,
  foreign key (maintenance_task_id, owner_id) references public.maintenance_tasks(id, owner_id) on delete set null (maintenance_task_id),
  unique (id, owner_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bike_id uuid not null,
  expense_date date not null,
  category text not null check (category in ('fuel', 'maintenance', 'parts', 'repair', 'insurance', 'accessories', 'other')),
  description text not null,
  amount numeric(12,2) not null check (amount >= 0),
  odometer integer check (odometer >= 0),
  service_record_id uuid,
  receipt_path text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (bike_id, owner_id) references public.bikes(id, owner_id) on delete cascade,
  foreign key (service_record_id, owner_id) references public.service_records(id, owner_id) on delete set null (service_record_id),
  unique (id, owner_id)
);

create table public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bike_id uuid not null,
  refuelled_at date not null,
  odometer integer not null check (odometer >= 0),
  litres numeric(8,3) not null check (litres > 0),
  price_per_litre numeric(8,2) not null check (price_per_litre >= 0),
  total_amount numeric(12,2) not null check (total_amount >= 0),
  fuel_station text,
  full_tank boolean not null default true,
  expense_id uuid,
  created_at timestamptz not null default now(),
  foreign key (bike_id, owner_id) references public.bikes(id, owner_id) on delete cascade,
  foreign key (expense_id, owner_id) references public.expenses(id, owner_id) on delete set null (expense_id),
  unique (id, owner_id)
);

create table public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bike_id uuid not null,
  service_record_id uuid,
  document_type text not null check (document_type in ('registration', 'insurance', 'puc', 'invoice', 'warranty', 'receipt', 'other')),
  title text not null,
  storage_path text not null,
  file_name text not null,
  content_type text not null,
  size_bytes bigint not null check (size_bytes between 1 and 20971520),
  expiry_date date,
  uploaded_at timestamptz not null default now(),
  foreign key (bike_id, owner_id) references public.bikes(id, owner_id) on delete cascade,
  foreign key (service_record_id, owner_id) references public.service_records(id, owner_id) on delete set null (service_record_id),
  unique (id, owner_id)
);

create table public.notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid,
  email_enabled boolean not null default true,
  telegram_enabled boolean not null default false,
  reminders_before_days integer not null default 3 check (reminders_before_days between 0 and 90),
  mileage_lead_km integer not null default 200 check (mileage_lead_km between 0 and 10000),
  overdue_every_days integer not null default 3 check (overdue_every_days between 1 and 30),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (task_id, user_id) references public.maintenance_tasks(id, owner_id) on delete cascade
);

create unique index notification_preferences_user_default on public.notification_preferences(user_id) where task_id is null;
create unique index notification_preferences_user_task on public.notification_preferences(user_id, task_id) where task_id is not null;

create table public.notification_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid,
  bike_id uuid,
  document_id uuid,
  channel text not null check (channel in ('email', 'telegram')),
  event_key text not null,
  dedupe_key text not null unique,
  schedule_version text not null,
  payload jsonb not null default '{}'::jsonb,
  delivery_status text not null default 'pending' check (delivery_status in ('pending', 'sending', 'sent', 'failed')),
  attempts integer not null default 0 check (attempts >= 0),
  claimed_at timestamptz,
  sent_at timestamptz,
  next_attempt_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  foreign key (task_id, owner_id) references public.maintenance_tasks(id, owner_id) on delete set null (task_id),
  foreign key (bike_id, owner_id) references public.bikes(id, owner_id) on delete set null (bike_id),
  foreign key (document_id, owner_id) references public.documents(id, owner_id) on delete set null (document_id)
);

create table public.odometer_logs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  bike_id uuid not null,
  recorded_at timestamptz not null default now(),
  odometer integer not null check (odometer >= 0),
  source text not null default 'manual' check (source in ('manual', 'service', 'fuel', 'correction')),
  correction_reason text,
  notes text,
  created_at timestamptz not null default now(),
  foreign key (bike_id, owner_id) references public.bikes(id, owner_id) on delete cascade
);

create table public.user_action_limits (
  user_id uuid not null references auth.users(id) on delete cascade,
  action_name text not null,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0 check (request_count >= 0),
  primary key (user_id, action_name)
);

create index bikes_owner_idx on public.bikes(owner_id);
create index maintenance_tasks_owner_bike_due_idx on public.maintenance_tasks(owner_id, bike_id, next_due_date, next_due_odometer) where is_active;
create index service_records_owner_bike_date_idx on public.service_records(owner_id, bike_id, service_date desc);
create index expenses_owner_bike_date_idx on public.expenses(owner_id, bike_id, expense_date desc);
create index fuel_logs_owner_bike_date_idx on public.fuel_logs(owner_id, bike_id, refuelled_at desc, odometer);
create index documents_owner_bike_expiry_idx on public.documents(owner_id, bike_id, expiry_date);
create index documents_service_record_idx on public.documents(owner_id, service_record_id) where service_record_id is not null;
create index notification_logs_pending_idx on public.notification_logs(delivery_status, next_attempt_at) where delivery_status in ('pending', 'failed');
create index odometer_logs_owner_bike_date_idx on public.odometer_logs(owner_id, bike_id, recorded_at desc);

create or replace function public.guard_odometer_reading()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  highest_reading integer;
begin
  select odometer into highest_reading
  from public.odometer_logs
  where bike_id = new.bike_id and owner_id = new.owner_id
  order by recorded_at desc, created_at desc
  limit 1;

  if highest_reading is not null and new.odometer < highest_reading and nullif(trim(new.correction_reason), '') is null then
    raise exception 'Odometer cannot decrease without an explicit correction reason';
  end if;

  return new;
end;
$$;

create trigger odometer_reading_guard before insert or update on public.odometer_logs
for each row execute function public.guard_odometer_reading();

do $$
declare table_name text;
begin
  foreach table_name in array array['profiles', 'bikes', 'maintenance_types', 'maintenance_tasks', 'service_records', 'expenses', 'fuel_logs', 'documents', 'notification_preferences', 'notification_logs', 'odometer_logs', 'user_action_limits'] loop
    execute format('alter table public.%I enable row level security', table_name);
  end loop;
end;
$$;

create policy profiles_read_own on public.profiles for select using (id = (select auth.uid()));
create policy profiles_insert_own on public.profiles for insert with check (id = (select auth.uid()));
create policy profiles_update_own on public.profiles for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy bikes_own on public.bikes for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy maintenance_types_read on public.maintenance_types for select using (owner_id is null or owner_id = (select auth.uid()));
create policy maintenance_types_manage_own on public.maintenance_types for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy maintenance_tasks_own on public.maintenance_tasks for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy service_records_own on public.service_records for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy expenses_own on public.expenses for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy fuel_logs_own on public.fuel_logs for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy documents_own on public.documents for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy notification_preferences_own on public.notification_preferences for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy notification_logs_read_own on public.notification_logs for select using (owner_id = (select auth.uid()));
create policy odometer_logs_own on public.odometer_logs for all using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy user_action_limits_own on public.user_action_limits for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'display_name', ''))
  on conflict (id) do update set email = excluded.email;
  insert into public.notification_preferences (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_auth_user();

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger bikes_updated_at before update on public.bikes for each row execute function public.set_updated_at();
create trigger maintenance_tasks_updated_at before update on public.maintenance_tasks for each row execute function public.set_updated_at();
create trigger service_records_updated_at before update on public.service_records for each row execute function public.set_updated_at();
create trigger expenses_updated_at before update on public.expenses for each row execute function public.set_updated_at();
create trigger notification_preferences_updated_at before update on public.notification_preferences for each row execute function public.set_updated_at();

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('private-bike-files', 'private-bike-files', false, 20971520, array['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy bike_files_read_own on storage.objects for select to authenticated
using (bucket_id = 'private-bike-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy bike_files_upload_own on storage.objects for insert to authenticated
with check (bucket_id = 'private-bike-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy bike_files_update_own on storage.objects for update to authenticated
using (bucket_id = 'private-bike-files' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'private-bike-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy bike_files_delete_own on storage.objects for delete to authenticated
using (bucket_id = 'private-bike-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.record_service(
  p_bike_id uuid,
  p_task_id uuid,
  p_service_date date,
  p_odometer integer,
  p_workshop text,
  p_mechanic text,
  p_parts_replaced text,
  p_work_performed text,
  p_oil_brand text,
  p_oil_grade text,
  p_oil_quantity_litres numeric,
  p_oil_cost numeric,
  p_labour_cost numeric,
  p_total_cost numeric,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_owner uuid := (select auth.uid());
  bike_row public.bikes%rowtype;
  task_row public.maintenance_tasks%rowtype;
  service_id uuid;
  expense_description text;
  latest_reading_date date;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;

  select * into bike_row from public.bikes
  where id = p_bike_id and owner_id = current_owner for update;
  if not found then raise exception 'Bike not found'; end if;

  if p_task_id is not null then
    select * into task_row from public.maintenance_tasks
    where id = p_task_id and bike_id = p_bike_id and owner_id = current_owner and is_active for update;
    if not found then raise exception 'Maintenance task not found'; end if;
  end if;

  select max(recorded_at::date) into latest_reading_date from public.odometer_logs
  where bike_id = p_bike_id and owner_id = current_owner;
  if latest_reading_date is not null and p_service_date >= latest_reading_date and p_odometer < bike_row.current_odometer then
    raise exception 'A current service reading cannot be lower than the current odometer';
  end if;

  insert into public.service_records (
    owner_id, bike_id, maintenance_task_id, service_date, odometer, workshop, mechanic,
    parts_replaced, work_performed, oil_brand, oil_grade, oil_quantity_litres,
    oil_cost, labour_cost, total_cost, notes
  ) values (
    current_owner, p_bike_id, p_task_id, p_service_date, p_odometer, p_workshop, p_mechanic,
    p_parts_replaced, p_work_performed, p_oil_brand, p_oil_grade, p_oil_quantity_litres,
    p_oil_cost, p_labour_cost, p_total_cost, p_notes
  ) returning id into service_id;

  expense_description := coalesce(nullif(trim(p_work_performed), ''), 'Service visit');
  insert into public.expenses (owner_id, bike_id, expense_date, category, description, amount, odometer, service_record_id)
  values (current_owner, p_bike_id, p_service_date, 'maintenance', expense_description, p_total_cost, p_odometer, service_id);

  if p_task_id is not null and (task_row.last_completed_date is null or p_service_date >= task_row.last_completed_date) then
    update public.maintenance_tasks
    set last_completed_date = p_service_date,
        last_completed_odometer = p_odometer,
        next_due_date = case when interval_days is null then null else p_service_date + interval_days end,
        next_due_odometer = case when interval_km is null then null else p_odometer + interval_km end,
        status = 'upcoming'
    where id = p_task_id and owner_id = current_owner;
  end if;

  if p_odometer > bike_row.current_odometer then
    update public.bikes set current_odometer = p_odometer where id = p_bike_id and owner_id = current_owner;
    insert into public.odometer_logs (owner_id, bike_id, odometer, source, notes)
    values (current_owner, p_bike_id, p_odometer, 'service', 'Updated from service record');
  end if;

  return service_id;
end;
$$;

grant execute on function public.record_service(uuid, uuid, date, integer, text, text, text, text, text, text, numeric, numeric, numeric, numeric, text) to authenticated;

create or replace function public.record_fuel_entry(
  p_bike_id uuid,
  p_refuelled_at date,
  p_odometer integer,
  p_litres numeric,
  p_price_per_litre numeric,
  p_fuel_station text,
  p_full_tank boolean
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_owner uuid := (select auth.uid());
  bike_row public.bikes%rowtype;
  total numeric(12,2) := round(p_litres * p_price_per_litre, 2);
  expense_id uuid;
  fuel_id uuid;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  select * into bike_row from public.bikes where id = p_bike_id and owner_id = current_owner for update;
  if not found then raise exception 'Bike not found'; end if;
  if p_odometer < bike_row.current_odometer then raise exception 'Odometer cannot decrease without an authorized correction'; end if;

  insert into public.expenses (owner_id, bike_id, expense_date, category, description, amount, odometer)
  values (current_owner, p_bike_id, p_refuelled_at, 'fuel', 'Fuel refill', total, p_odometer)
  returning id into expense_id;

  insert into public.fuel_logs (owner_id, bike_id, refuelled_at, odometer, litres, price_per_litre, total_amount, fuel_station, full_tank, expense_id)
  values (current_owner, p_bike_id, p_refuelled_at, p_odometer, p_litres, p_price_per_litre, total, p_fuel_station, p_full_tank, expense_id)
  returning id into fuel_id;

  if p_odometer > bike_row.current_odometer then
    update public.bikes set current_odometer = p_odometer where id = p_bike_id and owner_id = current_owner;
    insert into public.odometer_logs (owner_id, bike_id, odometer, source, notes)
    values (current_owner, p_bike_id, p_odometer, 'fuel', 'Updated from fuel log');
  end if;

  return fuel_id;
end;
$$;

grant execute on function public.record_fuel_entry(uuid, date, integer, numeric, numeric, text, boolean) to authenticated;

create or replace function public.record_odometer_reading(
  p_bike_id uuid,
  p_odometer integer,
  p_correction_reason text,
  p_notes text
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_owner uuid := (select auth.uid());
  bike_row public.bikes%rowtype;
  log_id uuid;
  is_correction boolean;
begin
  if current_owner is null then raise exception 'Authentication required'; end if;
  select * into bike_row from public.bikes where id = p_bike_id and owner_id = current_owner for update;
  if not found then raise exception 'Bike not found'; end if;
  is_correction := p_odometer < bike_row.current_odometer;
  if is_correction and nullif(trim(p_correction_reason), '') is null then
    raise exception 'Odometer cannot decrease without an explicit correction reason';
  end if;

  insert into public.odometer_logs (owner_id, bike_id, odometer, source, correction_reason, notes)
  values (current_owner, p_bike_id, p_odometer, case when is_correction then 'correction' else 'manual' end, p_correction_reason, p_notes)
  returning id into log_id;
  update public.bikes set current_odometer = p_odometer where id = p_bike_id and owner_id = current_owner;
  return log_id;
end;
$$;

grant execute on function public.record_odometer_reading(uuid, integer, text, text) to authenticated;

create or replace function public.consume_user_action_limit(p_action_name text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_owner uuid := (select auth.uid());
  updated_count integer;
begin
  if current_owner is null or p_action_name not in ('bike_write', 'maintenance_write', 'service_write', 'expense_write', 'fuel_write', 'odometer_write', 'document_upload', 'document_delete', 'document_download', 'notification_settings') or p_limit not between 1 and 1000 or p_window_seconds not between 1 and 86400 then
    return false;
  end if;

  insert into public.user_action_limits (user_id, action_name, window_started_at, request_count)
  values (current_owner, p_action_name, now(), 1)
  on conflict (user_id, action_name) do update
    set window_started_at = case
          when public.user_action_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then now()
          else public.user_action_limits.window_started_at
        end,
        request_count = case
          when public.user_action_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) then 1
          else public.user_action_limits.request_count + 1
        end
  returning request_count into updated_count;

  return updated_count <= p_limit;
end;
$$;

revoke all on function public.consume_user_action_limit(text, integer, integer) from public, anon;
grant execute on function public.consume_user_action_limit(text, integer, integer) to authenticated;

create or replace function public.claim_notification(p_notification_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_id uuid;
begin
  update public.notification_logs
  set delivery_status = 'sending', attempts = attempts + 1, claimed_at = now()
  where id = p_notification_id
    and attempts < 5
    and (delivery_status in ('pending', 'failed') and (next_attempt_at is null or next_attempt_at <= now())
      or delivery_status = 'sending' and claimed_at < now() - interval '15 minutes')
  returning id into claimed_id;
  return claimed_id is not null;
end;
$$;

revoke all on function public.claim_notification(uuid) from public, anon, authenticated;
grant execute on function public.claim_notification(uuid) to service_role;