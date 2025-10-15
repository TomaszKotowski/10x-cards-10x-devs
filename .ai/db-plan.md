# VibeTravels – Schemat bazy danych (PostgreSQL/Supabase)

Poniższy dokument zawiera kompletną specyfikację schematu bazy danych dla MVP, zgodną z PRD, ustaleniami z planowania oraz stackiem (Supabase + Postgres). Zawiera typy, tabele, relacje, indeksy, RLS oraz kluczowe triggery/funkcje. Może służyć jako podstawa do przygotowania migracji SQL.

## 1. Tabele, kolumny, typy i ograniczenia

### 1.1. Typy ENUM

```sql
-- Budżet planu
create type budget_tier as enum ('ECONOMY', 'STANDARD', 'PREMIUM');

-- Typ pozycji planu
create type plan_item_type as enum ('activity', 'lodging', 'transport');

-- Status przebiegu generowania
create type run_status as enum ('queued', 'running', 'success', 'failed');

-- Tempo podróży (profil)
create type travel_pace as enum ('SLOW', 'STANDARD', 'FAST');

-- Typ akcji do audytu
create type audit_action as enum ('insert', 'update', 'delete');
```



### 1.2. public.profiles

Profil użytkownika powiązany 1–1 z `auth.users` (Supabase). Wpis tworzony triggerem po rejestracji.

```sql
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  display_name        text,
  avatar_url          text,

  -- Preferencje (kolumny „twarde”)
  budget              budget_tier,
  pace                travel_pace,
  interests           text[] not null default '{}',
  cuisines            text[] not null default '{}',
  transport_modes     text[] not null default '{}',

  -- Dodatkowe preferencje i ustawienia (elastyczne)
  extra_preferences   jsonb not null default '{}'::jsonb,

  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

alter table public.profiles
  add constraint profiles_extra_prefs_is_object
  check (jsonb_typeof(extra_preferences) = 'object');
```

### 1.3. public.trips

Główna encja planu podróży. Wersjonowanie poprzez `plan_versions` + wskaźnik `current_version_id`.

```sql
create table if not exists public.trips (
  id                   uuid primary key default gen_random_uuid(),
  owner_id             uuid not null references public.profiles (id) on delete cascade,
  title                text not null,
  description          text,

  destination_city     text,
  destination_country  text,
  destination_meta     jsonb not null default '{}'::jsonb, -- np. współrzędne, identyfikatory zewnętrzne

  budget               budget_tier,

  -- Wskaźnik wersji bieżącej (do ustawienia po utworzeniu wersji)
  current_version_id   uuid,

  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz,

  constraint trips_destination_meta_is_object
    check (jsonb_typeof(destination_meta) = 'object')
);

-- (FK do plan_versions dodany po utworzeniu tabeli plan_versions)
```

Uwaga: FK do `plan_versions` jest zadeklarowany jako deferrable, ponieważ wskazanie wersji następuje zwykle po utworzeniu pierwszego snapshotu.

### 1.4. public.trip_days

Lista dni w ramach wycieczki. Sortowanie po `day_index` (1..N).

```sql
create table if not exists public.trip_days (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips (id) on delete cascade,
  day_index    int  not null,
  note         text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz,

  constraint trip_days_day_index_check check (day_index >= 1),
  constraint trip_days_unique_day unique (trip_id, day_index)
);
```

### 1.5. public.plan_items

Proste pozycje planu w obrębie dnia, sortowane `position` (1..M).

```sql
create table if not exists public.plan_items (
  id            uuid primary key default gen_random_uuid(),
  trip_day_id   uuid not null references public.trip_days (id) on delete cascade,
  position      int  not null,
  type          plan_item_type not null,
  title         text not null,
  notes         text,
  is_paid       boolean,              -- odzwierciedla "płatne/darmowe"
  transit_hint  text,                 -- opis transportu między elementami (opcjonalny)
  details       jsonb not null default '{}'::jsonb,  -- elastyczne doprecyzowanie
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,

  constraint plan_items_position_check check (position >= 1),
  constraint plan_items_details_is_object check (jsonb_typeof(details) = 'object'),
  constraint plan_items_unique_position unique (trip_day_id, position)
);
```

### 1.6. public.plan_versions

Niemutowalne snapshoty planów.

```sql
create table if not exists public.plan_versions (
  id           uuid primary key default gen_random_uuid(),
  trip_id      uuid not null references public.trips (id) on delete cascade,
  version_no   int  not null,
  snapshot     jsonb not null,        -- pełny plan (trip, days, items) jako JSON
  summary      text,
  created_at   timestamptz not null default now(),

  constraint plan_versions_snapshot_is_object check (jsonb_typeof(snapshot) = 'object'),
  constraint plan_versions_unique_no unique (trip_id, version_no)
);
```

```sql
-- FK 'current_version_id' w trips → plan_versions
alter table public.trips
  add constraint trips_current_version_fk
  foreign key (current_version_id) references public.plan_versions (id) deferrable initially deferred;
```

### 1.7. public.generation_runs

Rejestr przebiegów generowania AI (wejście/wyjście, status, ewentualny błąd).

```sql
create table if not exists public.generation_runs (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  triggered_by  uuid references public.profiles (id) on delete set null,
  version_id    uuid references public.plan_versions (id) on delete set null,
  model         text not null,
  input         jsonb not null default '{}'::jsonb,
  output        jsonb,
  status        run_status not null default 'queued',
  error         text,
  created_at    timestamptz not null default now(),

  constraint generation_runs_input_is_object check (jsonb_typeof(input) = 'object'),
  constraint generation_runs_output_is_object check (output is null or jsonb_typeof(output) = 'object')
);
```

### 1.8. public.feedback

Oceny i komentarze do planów (rekomendowane per wersja). Dla MVP: kciuk w górę/dół może być mapowany na 5/1.

```sql
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  version_id  uuid not null references public.plan_versions (id) on delete cascade,
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  rating      smallint not null,      -- 1..5 (dla MVP: 1 = 👎, 5 = 👍)
  comment     text,
  created_at  timestamptz not null default now(),

  constraint feedback_rating_range check (rating between 1 and 5)
);
```

### 1.9. public.audit_logs

Automatyczny audyt CRUD na kluczowych tabelach.

```sql
create table if not exists public.audit_logs (
  id          bigserial primary key,
  actor_id    uuid references public.profiles (id) on delete set null,
  table_name  text not null,
  row_id      uuid,
  action      audit_action not null,
  diff        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),

  constraint audit_diff_is_object check (jsonb_typeof(diff) = 'object')
);
```

### 1.10. Funkcje pomocnicze i triggery

```sql
-- Aktualizacja znacznika updated_at
create or replace function public.fn_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

-- Audyt zmian (INSERT/UPDATE/DELETE)
create or replace function public.fn_audit_changes()
returns trigger language plpgsql as $$
declare
  v_actor uuid;
  v_diff  jsonb;
begin
  -- Pozyskanie aktualnego użytkownika (Supabase)
  begin
    v_actor := auth.uid();
  exception when others then
    v_actor := null; -- na wypadek wywołań systemowych
  end;

  if (tg_op = 'INSERT') then
    v_diff := jsonb_build_object('new', to_jsonb(new));
    insert into public.audit_logs(actor_id, table_name, row_id, action, diff)
    values (v_actor, tg_table_name, new.id, 'insert', v_diff);
    return new;
  elsif (tg_op = 'UPDATE') then
    v_diff := jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new));
    insert into public.audit_logs(actor_id, table_name, row_id, action, diff)
    values (v_actor, tg_table_name, new.id, 'update', v_diff);
    return new;
  elsif (tg_op = 'DELETE') then
    v_diff := jsonb_build_object('old', to_jsonb(old));
    insert into public.audit_logs(actor_id, table_name, row_id, action, diff)
    values (v_actor, tg_table_name, old.id, 'delete', v_diff);
    return old;
  end if;
  return null;
end; $$;

-- Auto-utworzenie profilu po rejestracji użytkownika
create or replace function public.fn_handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end; $$;

-- Triggery updated_at
create trigger trg_profiles_touch
before update on public.profiles
for each row execute function public.fn_touch_updated_at();

create trigger trg_trips_touch
before update on public.trips
for each row execute function public.fn_touch_updated_at();

create trigger trg_trip_days_touch
before update on public.trip_days
for each row execute function public.fn_touch_updated_at();

create trigger trg_plan_items_touch
before update on public.plan_items
for each row execute function public.fn_touch_updated_at();

-- Triggery audytu (na kluczowych tabelach)
create trigger trg_audit_profiles
after insert or update or delete on public.profiles
for each row execute function public.fn_audit_changes();

create trigger trg_audit_trips
after insert or update or delete on public.trips
for each row execute function public.fn_audit_changes();

create trigger trg_audit_trip_days
after insert or update or delete on public.trip_days
for each row execute function public.fn_audit_changes();

create trigger trg_audit_plan_items
after insert or update or delete on public.plan_items
for each row execute function public.fn_audit_changes();

create trigger trg_audit_plan_versions
after insert or update or delete on public.plan_versions
for each row execute function public.fn_audit_changes();

create trigger trg_audit_generation_runs
after insert or update or delete on public.generation_runs
for each row execute function public.fn_audit_changes();

create trigger trg_audit_feedback
after insert or update or delete on public.feedback
for each row execute function public.fn_audit_changes();

-- Trigger Supabase na auth.users (wyzwalany w schemacie auth)
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.fn_handle_new_user();
```

## 2. Relacje między tabelami

- profiles (1–1) auth.users: `profiles.id` = `auth.users.id`.
- profiles (1–N) trips: `trips.owner_id` → `profiles.id`.
- trips (1–N) trip_days: `trip_days.trip_id` → `trips.id`.
- trip_days (1–N) plan_items: `plan_items.trip_day_id` → `trip_days.id`.
- trips (1–N) plan_versions: `plan_versions.trip_id` → `trips.id`.
- trips (1–N) generation_runs: `generation_runs.trip_id` → `trips.id`.
- profiles (1–N) generation_runs.triggered_by → `profiles.id`.
- plan_versions (1–N) feedback: `feedback.version_id` → `plan_versions.id`.
- trips (1–1 opcjonalne) current_version_id → `plan_versions.id` (deferrable, ustawiane po utworzeniu wersji).

Kardynalności: większość relacji to 1–N; brak relacji M–N w MVP.

## 3. Indeksy

```sql
-- Indeksy na kluczach obcych
create index if not exists idx_trips_owner on public.trips (owner_id);
create index if not exists idx_trip_days_trip on public.trip_days (trip_id);
create index if not exists idx_plan_items_trip_day on public.plan_items (trip_day_id);
create index if not exists idx_plan_versions_trip on public.plan_versions (trip_id);
create index if not exists idx_generation_runs_trip on public.generation_runs (trip_id);
create index if not exists idx_generation_runs_triggered_by on public.generation_runs (triggered_by);
create index if not exists idx_feedback_version on public.feedback (version_id);

-- Listowanie po właścicielu (dashboard, najnowsze na górze)
create index if not exists idx_trips_owner_created_desc on public.trips (owner_id, created_at desc);

-- Indeksy partial (pomijają soft-delete)
create index if not exists idx_trips_not_deleted on public.trips (owner_id, created_at desc) where deleted_at is null;
create index if not exists idx_trip_days_not_deleted on public.trip_days (trip_id, day_index) where deleted_at is null;
create index if not exists idx_plan_items_not_deleted on public.plan_items (trip_day_id, position) where deleted_at is null;

-- JSONB GIN (wyszukiwanie po szczegółach/opcjach)
create index if not exists gin_profiles_extra_prefs on public.profiles using gin (extra_preferences);
create index if not exists gin_trips_destination_meta on public.trips using gin (destination_meta);
create index if not exists gin_plan_items_details on public.plan_items using gin (details);
create index if not exists gin_generation_input on public.generation_runs using gin (input);
create index if not exists gin_generation_output on public.generation_runs using gin (output);

-- (Opcjonalnie) pg_trgm do wyszukiwania po tytule/opisie
-- create extension if not exists pg_trgm;
-- create index if not exists trgm_trips_title on public.trips using gin (title gin_trgm_ops);
-- create index if not exists trgm_trips_desc on public.trips using gin (description gin_trgm_ops);
```

## 4. Zasady PostgreSQL (RLS)

RLS włączone i polityki izolujące dane per właściciel. Supabase `service_role` omija RLS (bypass) – nie wymaga dodatkowych reguł.

```sql
-- Włączenie RLS
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_days enable row level security;
alter table public.plan_items enable row level security;
alter table public.plan_versions enable row level security;
alter table public.generation_runs enable row level security;
alter table public.feedback enable row level security;
alter table public.audit_logs enable row level security;

-- profiles: dostęp tylko do własnego profilu
create policy profiles_owner_select on public.profiles
  for select using (id = auth.uid());
create policy profiles_owner_update on public.profiles
  for update using (id = auth.uid());
create policy profiles_owner_delete on public.profiles
  for delete using (id = auth.uid());
create policy profiles_owner_insert on public.profiles
  for insert with check (id = auth.uid());

-- trips: właściciel może CRUD
create policy trips_owner_select on public.trips
  for select using (owner_id = auth.uid());
create policy trips_owner_insert on public.trips
  for insert with check (owner_id = auth.uid());
create policy trips_owner_update on public.trips
  for update using (owner_id = auth.uid());
create policy trips_owner_delete on public.trips
  for delete using (owner_id = auth.uid());

-- trip_days: pochodna własności przez trip
create policy trip_days_owner_select on public.trip_days
  for select using (exists (
    select 1 from public.trips t where t.id = trip_days.trip_id and t.owner_id = auth.uid()
  ));
create policy trip_days_owner_insert on public.trip_days
  for insert with check (exists (
    select 1 from public.trips t where t.id = trip_days.trip_id and t.owner_id = auth.uid()
  ));
create policy trip_days_owner_update on public.trip_days
  for update using (exists (
    select 1 from public.trips t where t.id = trip_days.trip_id and t.owner_id = auth.uid()
  ));
create policy trip_days_owner_delete on public.trip_days
  for delete using (exists (
    select 1 from public.trips t where t.id = trip_days.trip_id and t.owner_id = auth.uid()
  ));

-- plan_items: pochodna własności przez trip_day -> trip
create policy plan_items_owner_select on public.plan_items
  for select using (exists (
    select 1 from public.trip_days d join public.trips t on t.id = d.trip_id
    where d.id = plan_items.trip_day_id and t.owner_id = auth.uid()
  ));
create policy plan_items_owner_insert on public.plan_items
  for insert with check (exists (
    select 1 from public.trip_days d join public.trips t on t.id = d.trip_id
    where d.id = plan_items.trip_day_id and t.owner_id = auth.uid()
  ));
create policy plan_items_owner_update on public.plan_items
  for update using (exists (
    select 1 from public.trip_days d join public.trips t on t.id = d.trip_id
    where d.id = plan_items.trip_day_id and t.owner_id = auth.uid()
  ));
create policy plan_items_owner_delete on public.plan_items
  for delete using (exists (
    select 1 from public.trip_days d join public.trips t on t.id = d.trip_id
    where d.id = plan_items.trip_day_id and t.owner_id = auth.uid()
  ));

-- plan_versions: pochodna własności przez trip
create policy versions_owner_select on public.plan_versions
  for select using (exists (
    select 1 from public.trips t where t.id = plan_versions.trip_id and t.owner_id = auth.uid()
  ));
create policy versions_owner_insert on public.plan_versions
  for insert with check (exists (
    select 1 from public.trips t where t.id = plan_versions.trip_id and t.owner_id = auth.uid()
  ));

-- generation_runs: pochodna własności przez trip; insert gdy trip.owner = uid
create policy runs_owner_select on public.generation_runs
  for select using (exists (
    select 1 from public.trips t where t.id = generation_runs.trip_id and t.owner_id = auth.uid()
  ));
create policy runs_owner_insert on public.generation_runs
  for insert with check (exists (
    select 1 from public.trips t where t.id = generation_runs.trip_id and t.owner_id = auth.uid()
  ));

-- feedback: tylko właściciel planu (wersji) może tworzyć/przeglądać swoje opinie
create policy feedback_owner_select on public.feedback
  for select using (exists (
    select 1
    from public.plan_versions v join public.trips t on t.id = v.trip_id
    where v.id = feedback.version_id and t.owner_id = auth.uid()
  ));
create policy feedback_owner_insert on public.feedback
  for insert with check (exists (
    select 1
    from public.plan_versions v join public.trips t on t.id = v.trip_id
    where v.id = feedback.version_id and t.owner_id = auth.uid()
  ));

-- audit_logs: zwykle tylko serwis/adm. W MVP blokujemy dostęp użytkownika
create policy audit_no_access on public.audit_logs
  for all using (false) with check (false);
```

## 5. Dodatkowe uwagi i uzasadnienia

- Wersjonowanie: `plan_versions` przechowuje niemutowalne snapshoty planu. `trips.current_version_id` wskazuje aktywną wersję – ustawiane po utworzeniu wersji (FK deferrable).
- Soft-delete: `deleted_at` na głównych tabelach; indeksy partial wykluczają wiersze usunięte logicznie.
- JSONB: elastyczne pola (`details`, `extra_preferences`, `destination_meta`, `input`, `output`) mają CHECK na typ `object`. Można dodać kolejne CHECK dla kluczowych ścieżek w przyszłości.
- Preferencje: część w kolumnach (`pace`, `interests`, `cuisines`, `transport_modes`, `budget`), reszta w `extra_preferences` (GIN).
- RLS: pełna izolacja per właściciel, z propagacją własności przez `trip`/`trip_day`. Rola `service_role` (Supabase) ma bypass RLS.
- Audyt: triggery na kluczowych tabelach logują różnice do `audit_logs` wraz z `actor_id` na bazie `auth.uid()`.
- Wydajność: indeksy na FK, `(owner_id, created_at desc)` do listowania, partial na soft-delete, GIN dla JSONB. Opcjonalnie `pg_trgm` dla wyszukiwania po tytule/opisie.
- Ograniczenia: unikalność `(trip_id, day_index)` i `(trip_day_id, position)` porządkują pozycje/pola dnia.

Otwarte kwestie do iteracji (poza MVP):
- Schemat `details` per `plan_item_type` (np. pola specyficzne dla hotelu/transportu).
- Dokładniejsza reprezentacja lokalizacji (współrzędne, ID zewnętrzne) w znormalizowanych tabelach.
- Polityka retencji dla `generation_runs` i `audit_logs` oraz ewentualne limity wersji/tripów.
- Ewentualne limity per użytkownik i enforcement w DB (quota, rate-limiting na poziomie app/DB).
