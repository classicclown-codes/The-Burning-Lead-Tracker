create extension if not exists "pgcrypto";

create table if not exists leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  full_name text not null,
  whatsapp text,
  business_type text,
  city text,
  monthly_revenue text,
  monthly_ad_spend text,
  goal text,
  main_objection text,
  stage text default 'new_dms',
  outcome text check (outcome in ('won', 'lost') or outcome is null),
  call_date timestamptz,
  last_contact timestamptz default now(),
  created_at timestamptz default now()
);

create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid references leads(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table leads enable row level security;
alter table notes enable row level security;

create policy "Users can view own leads"
  on leads for select
  using (auth.uid() = user_id);

create policy "Users can insert own leads"
  on leads for insert
  with check (auth.uid() = user_id);

create policy "Users can update own leads"
  on leads for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own leads"
  on leads for delete
  using (auth.uid() = user_id);

create policy "Users can view notes for own leads"
  on notes for select
  using (
    exists (
      select 1 from leads
      where leads.id = notes.lead_id
      and leads.user_id = auth.uid()
    )
  );

create policy "Users can insert notes for own leads"
  on notes for insert
  with check (
    exists (
      select 1 from leads
      where leads.id = notes.lead_id
      and leads.user_id = auth.uid()
    )
  );

create index if not exists leads_user_stage_idx on leads(user_id, stage);
create index if not exists leads_last_contact_idx on leads(last_contact);
create index if not exists notes_lead_created_idx on notes(lead_id, created_at desc);
