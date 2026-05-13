
create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender text not null check (sender in ('papa','lorenzo')),
  content text not null,
  type text not null default 'text' check (type in ('text','sticker','voice','quick')),
  created_at timestamptz not null default now()
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  xp integer not null default 10,
  difficulty text not null default 'facile' check (difficulty in ('facile','media','difficile','rara')),
  status text not null default 'nuova' check (status in ('nuova','accettata','completata','approvata')),
  proof text,
  created_by text not null default 'papa',
  created_at timestamptz not null default now()
);

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  agent text not null default 'lorenzo',
  badge text not null,
  title text not null,
  icon text,
  created_at timestamptz not null default now()
);

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text,
  image_url text,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;
alter table public.missions enable row level security;
alter table public.rewards enable row level security;
alter table public.memories enable row level security;

-- Private family app gated by shared PIN at the UI layer; allow anon CRUD.
create policy "family open" on public.messages for all using (true) with check (true);
create policy "family open" on public.missions for all using (true) with check (true);
create policy "family open" on public.rewards for all using (true) with check (true);
create policy "family open" on public.memories for all using (true) with check (true);

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.missions;
