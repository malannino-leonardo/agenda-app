-- ==============================================================================
-- AGENDA WEB APPLICATION - PRODUCTION SUPABASE DATABASE SCHEMA
-- PostgreSQL schema with Foreign Keys, Cascades, Indexes, RLS, and Security Definers
-- ==============================================================================

-- Enable UUID generation extension
create extension if not exists "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE (User Profile Metadata synchronized with auth.users)
-- ------------------------------------------------------------------------------
create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    full_name text default '',
    avatar_url text default '',
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_profiles_id on public.profiles(id);

-- ------------------------------------------------------------------------------
-- 2. CLIENTS TABLE (Freelance Client Directory)
-- ------------------------------------------------------------------------------
create table if not exists public.clients (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    company text,
    email text,
    phone text,
    hourly_rate numeric(10, 2) default 0.00,
    currency varchar(3) default 'EUR',
    notes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_clients_user_id on public.clients(user_id);
create index if not exists idx_clients_created_at on public.clients(created_at desc);

-- ------------------------------------------------------------------------------
-- 3. PROJECTS TABLE (Freelance Projects)
-- ------------------------------------------------------------------------------
do $$ begin
    create type project_status as enum ('pending', 'in_progress', 'completed', 'archived');
exception
    when duplicate_object then null;
end $$;

create table if not exists public.projects (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    client_id uuid references public.clients(id) on delete set null,
    title text not null,
    description text,
    budget numeric(10, 2) default 0.00,
    quoted_price numeric(10, 2) default 0.00,
    invoiced_amount numeric(10, 2) default 0.00,
    status project_status default 'pending' not null,
    deadline timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_projects_user_id on public.projects(user_id);
create index if not exists idx_projects_client_id on public.projects(client_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_deadline on public.projects(deadline);

-- ------------------------------------------------------------------------------
-- 4. TASKS TABLE (Hierarchical Nested Todos for Projects & Daily Agenda)
-- ------------------------------------------------------------------------------
do $$ begin
    create type task_scope as enum ('freelance', 'agenda');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type task_status as enum ('pending', 'in_progress', 'completed');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type task_priority as enum ('low', 'medium', 'high');
exception
    when duplicate_object then null;
end $$;

create table if not exists public.tasks (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    parent_id uuid references public.tasks(id) on delete cascade,
    scope task_scope not null default 'agenda',
    project_id uuid references public.projects(id) on delete cascade,
    title text not null,
    description text,
    status task_status default 'pending' not null,
    priority task_priority default 'medium' not null,
    due_date timestamp with time zone,
    order_index integer default 0 not null,
    completed_at timestamp with time zone,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_tasks_user_id on public.tasks(user_id);
create index if not exists idx_tasks_parent_id on public.tasks(parent_id);
create index if not exists idx_tasks_scope on public.tasks(scope);
create index if not exists idx_tasks_project_id on public.tasks(project_id);
create index if not exists idx_tasks_status on public.tasks(status);
create index if not exists idx_tasks_due_date on public.tasks(due_date);
create index if not exists idx_tasks_order on public.tasks(order_index asc);

-- ------------------------------------------------------------------------------
-- 5. AUTOMATED UPDATED_AT TRIGGER FUNCTION
-- ------------------------------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
    before update on public.profiles
    for each row execute function public.handle_updated_at();

drop trigger if exists set_clients_updated_at on public.clients;
create trigger set_clients_updated_at
    before update on public.clients
    for each row execute function public.handle_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
    before update on public.projects
    for each row execute function public.handle_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
    before update on public.tasks
    for each row execute function public.handle_updated_at();

-- ------------------------------------------------------------------------------
-- 6. AUTOMATED NEW USER PROFILE PROVISIONING TRIGGER
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, avatar_url)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        coalesce(new.raw_user_meta_data->>'avatar_url', '')
    );
    return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 7. SECURE SELF-DELETION RPC PROCEDURE
-- Permanently deletes user from auth.users, cascading to all personal data
-- ------------------------------------------------------------------------------
create or replace function public.delete_user_account()
returns void as $$
begin
    if auth.uid() is null then raise exception 'not_authenticated'; end if;
    perform public.rate_limit_hit('delete_account:' || auth.uid()::text, 3, interval '1 hour');
    delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer set search_path = public;

-- ------------------------------------------------------------------------------
-- 8. CALENDARS (owner = calendars.user_id)
-- ------------------------------------------------------------------------------
create table if not exists public.calendars (
    id uuid primary key default uuid_generate_v4(),
    user_id uuid not null references auth.users(id) on delete cascade,
    name text not null,
    color text default '#6366f1',
    description text,
    is_default boolean default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_calendars_user_id on public.calendars(user_id);
-- At most one main (default) calendar per user, even if two devices sign in at the same moment
create unique index if not exists uniq_calendars_default_per_user on public.calendars(user_id) where is_default;

drop trigger if exists set_calendars_updated_at on public.calendars;
create trigger set_calendars_updated_at
    before update on public.calendars
    for each row execute function public.handle_updated_at();

-- Extra task columns: optional time block, calendar assignment, duration, reminder
alter table public.tasks add column if not exists due_time text;
alter table public.tasks add column if not exists calendar_id uuid references public.calendars(id) on delete set null;
alter table public.tasks add column if not exists duration_minutes integer;
alter table public.tasks add column if not exists remind_before integer;
create index if not exists idx_tasks_calendar_id on public.tasks(calendar_id);

-- ------------------------------------------------------------------------------
-- 9. SHARED CALENDARS: MEMBERS + INVITES (by email or by link)
-- ------------------------------------------------------------------------------

-- Profiles keep the (lower-cased) email so collaborators can be listed by name/email
alter table public.profiles add column if not exists email text;
create index if not exists idx_profiles_email on public.profiles(lower(email));

update public.profiles p
   set email = lower(u.email)
  from auth.users u
 where u.id = p.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger as $$
begin
    insert into public.profiles (id, full_name, avatar_url, email)
    values (
        new.id,
        coalesce(new.raw_user_meta_data->>'full_name', ''),
        coalesce(new.raw_user_meta_data->>'avatar_url', ''),
        lower(new.email)
    )
    on conflict (id) do update set email = excluded.email;
    return new;
end;
$$ language plpgsql security definer set search_path = public;

-- People who accepted an invite. permission: 'view' (read only) | 'edit' (read + write tasks)
create table if not exists public.calendar_members (
    id uuid primary key default uuid_generate_v4(),
    calendar_id uuid not null references public.calendars(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    permission text not null default 'view' check (permission in ('view', 'edit')),
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique (calendar_id, user_id)
);

create index if not exists idx_calendar_members_calendar_id on public.calendar_members(calendar_id);
create index if not exists idx_calendar_members_user_id on public.calendar_members(user_id);

-- Pending invitations. email IS NULL => open invite link, email set => restricted to that address
create table if not exists public.calendar_invites (
    id uuid primary key default uuid_generate_v4(),
    calendar_id uuid not null references public.calendars(id) on delete cascade,
    email text,
    token text not null unique default (replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')),
    permission text not null default 'view' check (permission in ('view', 'edit')),
    created_by uuid references auth.users(id) on delete set null,
    expires_at timestamp with time zone,
    max_uses integer,
    use_count integer not null default 0,
    revoked boolean not null default false,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_calendar_invites_calendar_id on public.calendar_invites(calendar_id);
create index if not exists idx_calendar_invites_email on public.calendar_invites(lower(email));

-- Migrate legacy email-only shares (previous schema) into pending invites
do $$ begin
    if to_regclass('public.calendar_shares') is not null then
        insert into public.calendar_invites (calendar_id, email, permission, created_at)
        select s.calendar_id, lower(s.email), coalesce(s.permission, 'view'), s.created_at
          from public.calendar_shares s;
        drop table public.calendar_shares;
    end if;
end $$;

-- ------------------------------------------------------------------------------
-- 10. ACCESS HELPERS (SECURITY DEFINER: avoid RLS recursion between tables)
-- ------------------------------------------------------------------------------
create or replace function public.calendar_role(cal uuid)
returns text
language sql stable security definer set search_path = public as $$
    select case
        when c.user_id = auth.uid() then 'owner'
        else (select m.permission from public.calendar_members m
               where m.calendar_id = c.id and m.user_id = auth.uid())
    end
      from public.calendars c
     where c.id = cal;
$$;

create or replace function public.can_view_calendar(cal uuid)
returns boolean
language sql stable security definer set search_path = public as $$
    select public.calendar_role(cal) is not null;
$$;

create or replace function public.can_edit_calendar(cal uuid)
returns boolean
language sql stable security definer set search_path = public as $$
    select coalesce(public.calendar_role(cal) in ('owner', 'edit'), false);
$$;

create or replace function public.shares_calendar_with(other uuid)
returns boolean
language sql stable security definer set search_path = public as $$
    select auth.uid() is not null and (
        exists (select 1 from public.calendars c
                  join public.calendar_members m on m.calendar_id = c.id
                 where c.user_id = auth.uid() and m.user_id = other)
        or exists (select 1 from public.calendars c
                  join public.calendar_members m on m.calendar_id = c.id
                 where c.user_id = other and m.user_id = auth.uid())
        or exists (select 1 from public.calendar_members m1
                  join public.calendar_members m2 on m1.calendar_id = m2.calendar_id
                 where m1.user_id = auth.uid() and m2.user_id = other)
    );
$$;

-- ------------------------------------------------------------------------------
-- 11. ROW LEVEL SECURITY (RLS) POLICIES
-- Users see their own data plus calendars (and their tasks) shared with them
-- ------------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.calendars enable row level security;
alter table public.calendar_members enable row level security;
alter table public.calendar_invites enable row level security;

-- Profiles
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can view own or collaborator profiles" on public.profiles;
create policy "Users can view own or collaborator profiles"
    on public.profiles for select
    using (auth.uid() = id or public.shares_calendar_with(id));

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id)
    with check (auth.uid() = id);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- Clients
drop policy if exists "Users can view own clients" on public.clients;
create policy "Users can view own clients" on public.clients for select using (auth.uid() = user_id);
drop policy if exists "Users can create own clients" on public.clients;
create policy "Users can create own clients" on public.clients for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own clients" on public.clients;
create policy "Users can update own clients" on public.clients for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own clients" on public.clients;
create policy "Users can delete own clients" on public.clients for delete using (auth.uid() = user_id);

-- Projects
drop policy if exists "Users can view own projects" on public.projects;
create policy "Users can view own projects" on public.projects for select using (auth.uid() = user_id);
drop policy if exists "Users can create own projects" on public.projects;
create policy "Users can create own projects" on public.projects for insert with check (auth.uid() = user_id);
drop policy if exists "Users can update own projects" on public.projects;
create policy "Users can update own projects" on public.projects for update using (auth.uid() = user_id);
drop policy if exists "Users can delete own projects" on public.projects;
create policy "Users can delete own projects" on public.projects for delete using (auth.uid() = user_id);

-- Calendars: owner full control, members read
drop policy if exists "Users can view own calendars" on public.calendars;
drop policy if exists "Users can view own or shared calendars" on public.calendars;
create policy "Users can view own or shared calendars"
    on public.calendars for select
    using (public.can_view_calendar(id));

drop policy if exists "Users can create own calendars" on public.calendars;
create policy "Users can create own calendars"
    on public.calendars for insert
    with check (auth.uid() = user_id);

drop policy if exists "Users can update own calendars" on public.calendars;
create policy "Users can update own calendars"
    on public.calendars for update
    using (auth.uid() = user_id);

drop policy if exists "Users can delete own calendars" on public.calendars;
create policy "Users can delete own calendars"
    on public.calendars for delete
    using (auth.uid() = user_id);

-- Members: anyone with access sees the member list; owner edits permissions; members can leave
drop policy if exists "Collaborators can view calendar members" on public.calendar_members;
create policy "Collaborators can view calendar members"
    on public.calendar_members for select
    using (public.can_view_calendar(calendar_id));

drop policy if exists "Owner can change member permissions" on public.calendar_members;
create policy "Owner can change member permissions"
    on public.calendar_members for update
    using (public.calendar_role(calendar_id) = 'owner')
    with check (public.calendar_role(calendar_id) = 'owner');

drop policy if exists "Owner can remove members or members can leave" on public.calendar_members;
create policy "Owner can remove members or members can leave"
    on public.calendar_members for delete
    using (public.calendar_role(calendar_id) = 'owner' or user_id = auth.uid());

-- Invites: only the calendar owner manages them (invitees go through the RPCs below)
drop policy if exists "Users can manage shares for their calendars" on public.calendar_invites;
drop policy if exists "Owner can manage invites" on public.calendar_invites;
create policy "Owner can manage invites"
    on public.calendar_invites for all
    using (public.calendar_role(calendar_id) = 'owner')
    with check (public.calendar_role(calendar_id) = 'owner');

-- Tasks: my unassigned tasks + tasks inside calendars I can access (so leaving a calendar hides its tasks);
-- writes need 'edit' on the calendar
drop policy if exists "Users can view own tasks" on public.tasks;
drop policy if exists "Users can view own or shared tasks" on public.tasks;
create policy "Users can view own or shared tasks"
    on public.tasks for select
    using (
        (calendar_id is null and auth.uid() = user_id)
        or (calendar_id is not null and public.can_view_calendar(calendar_id))
    );

drop policy if exists "Users can create own tasks" on public.tasks;
drop policy if exists "Users can create tasks" on public.tasks;
create policy "Users can create tasks"
    on public.tasks for insert
    with check (
        auth.uid() = user_id
        and (calendar_id is null or public.can_edit_calendar(calendar_id))
    );

drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Users can update own or shared tasks" on public.tasks;
create policy "Users can update own or shared tasks"
    on public.tasks for update
    using (
        (calendar_id is null and auth.uid() = user_id)
        or (calendar_id is not null and public.can_edit_calendar(calendar_id))
    )
    with check (
        (calendar_id is null and auth.uid() = user_id)
        or (calendar_id is not null and public.can_edit_calendar(calendar_id))
    );

drop policy if exists "Users can delete own tasks" on public.tasks;
drop policy if exists "Users can delete own or shared tasks" on public.tasks;
create policy "Users can delete own or shared tasks"
    on public.tasks for delete
    using (
        (calendar_id is null and auth.uid() = user_id)
        or (calendar_id is not null and public.can_edit_calendar(calendar_id))
    );

-- ------------------------------------------------------------------------------
-- 12. INVITE RPCs
-- ------------------------------------------------------------------------------

-- Owner creates an invite. p_email NULL => shareable link, otherwise restricted to that address.
create or replace function public.create_calendar_invite(
    p_calendar uuid,
    p_permission text,
    p_email text default null
)
returns public.calendar_invites
language plpgsql security definer set search_path = public as $$
declare
    v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
    inv public.calendar_invites;
begin
    if auth.uid() is null then raise exception 'not_authenticated'; end if;
    perform public.rate_limit_hit('create_invite:' || auth.uid()::text, 30, interval '1 minute');
    if p_permission not in ('view', 'edit') then raise exception 'invalid_permission'; end if;
    if not exists (select 1 from public.calendars where id = p_calendar and user_id = auth.uid()) then
        raise exception 'forbidden';
    end if;

    if v_email is not null then
        if v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' then raise exception 'invalid_email'; end if;
        if exists (
            select 1 from public.calendar_members m
              join public.profiles p on p.id = m.user_id
             where m.calendar_id = p_calendar and lower(p.email) = v_email
        ) then
            raise exception 'already_member';
        end if;

        update public.calendar_invites
           set permission = p_permission
         where calendar_id = p_calendar and lower(email) = v_email and not revoked
        returning * into inv;
        if found then return inv; end if;
    end if;

    insert into public.calendar_invites (calendar_id, email, permission, created_by)
    values (p_calendar, v_email, p_permission, auth.uid())
    returning * into inv;
    return inv;
end;
$$;

-- Public (anon allowed): what is this invite about? Reveals no emails.
create or replace function public.get_invite_info(p_token text)
returns json
language plpgsql volatile security definer set search_path = public as $$
declare
    inv public.calendar_invites;
    cal public.calendars;
    v_owner text;
begin
    -- Anonymous endpoint: throttle token guessing per client address
    perform public.rate_limit_hit('invite_info:' || public.request_client_key(), 30, interval '1 minute');
    if p_token is null or p_token !~ '^[A-Za-z0-9_-]{16,128}$' then
        return json_build_object('valid', false, 'reason', 'invite_invalid');
    end if;
    select * into inv from public.calendar_invites where token = p_token;
    if not found then return json_build_object('valid', false, 'reason', 'invite_invalid'); end if;
    if inv.revoked then return json_build_object('valid', false, 'reason', 'invite_invalid'); end if;
    if inv.expires_at is not null and inv.expires_at < now() then
        return json_build_object('valid', false, 'reason', 'invite_expired');
    end if;
    if inv.max_uses is not null and inv.use_count >= inv.max_uses then
        return json_build_object('valid', false, 'reason', 'invite_exhausted');
    end if;

    select * into cal from public.calendars where id = inv.calendar_id;
    select coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1)) into v_owner
      from public.profiles p where p.id = cal.user_id;

    return json_build_object(
        'valid', true,
        'calendar_name', cal.name,
        'color', cal.color,
        'owner_name', coalesce(v_owner, ''),
        'permission', inv.permission,
        'restricted', inv.email is not null
    );
end;
$$;

-- Invitee accepts: creates/upgrades the membership and returns the calendar id
create or replace function public.accept_calendar_invite(p_token text)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
    inv public.calendar_invites;
    cal public.calendars;
    v_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
    v_existing text;
begin
    if auth.uid() is null then raise exception 'not_authenticated'; end if;
    perform public.rate_limit_hit('accept_invite:' || auth.uid()::text, 20, interval '1 minute');
    if p_token is null or p_token !~ '^[A-Za-z0-9_-]{16,128}$' then raise exception 'invite_invalid'; end if;

    select * into inv from public.calendar_invites where token = p_token for update;
    if not found or inv.revoked then raise exception 'invite_invalid'; end if;
    if inv.expires_at is not null and inv.expires_at < now() then raise exception 'invite_expired'; end if;
    if inv.max_uses is not null and inv.use_count >= inv.max_uses then raise exception 'invite_exhausted'; end if;

    select * into cal from public.calendars where id = inv.calendar_id;
    if cal.user_id = auth.uid() then return cal.id; end if;

    if inv.email is not null and lower(inv.email) <> v_email then
        raise exception 'invite_email_mismatch';
    end if;

    select permission into v_existing from public.calendar_members
     where calendar_id = cal.id and user_id = auth.uid();

    if v_existing is null then
        insert into public.calendar_members (calendar_id, user_id, permission)
        values (cal.id, auth.uid(), inv.permission);
    elsif v_existing = 'view' and inv.permission = 'edit' then
        update public.calendar_members set permission = 'edit'
         where calendar_id = cal.id and user_id = auth.uid();
    end if;

    if inv.email is not null then
        delete from public.calendar_invites where id = inv.id;
    else
        update public.calendar_invites set use_count = use_count + 1 where id = inv.id;
    end if;

    return cal.id;
end;
$$;

-- Invitations addressed to my email that I have not accepted yet
create or replace function public.my_pending_invites()
returns table (
    token text,
    calendar_id uuid,
    calendar_name text,
    color text,
    owner_name text,
    permission text,
    created_at timestamp with time zone
)
language sql stable security definer set search_path = public as $$
    select i.token, c.id, c.name, c.color,
           coalesce(nullif(p.full_name, ''), split_part(p.email, '@', 1)),
           i.permission, i.created_at
      from public.calendar_invites i
      join public.calendars c on c.id = i.calendar_id
      left join public.profiles p on p.id = c.user_id
     where i.email is not null
       and lower(i.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
       and not i.revoked
       and (i.expires_at is null or i.expires_at > now())
     order by i.created_at desc;
$$;

create or replace function public.decline_calendar_invite(p_token text)
returns void
language sql security definer set search_path = public as $$
    delete from public.calendar_invites
     where token = p_token
       and email is not null
       and lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''));
$$;

grant execute on function public.get_invite_info(text) to anon, authenticated;
grant execute on function public.create_calendar_invite(uuid, text, text) to authenticated;
grant execute on function public.accept_calendar_invite(text) to authenticated;
grant execute on function public.my_pending_invites() to authenticated;
grant execute on function public.decline_calendar_invite(text) to authenticated;


-- ------------------------------------------------------------------------------
-- 13. SECURITY HARDENING (idempotent; safe to re-run)
--     a) server-side rate limiting + per-user quotas   (cannot be bypassed from the browser)
--     b) integrity: immutable ownership, cross-user references blocked
--     c) data validation constraints (length / format / range)
--     d) least-privilege grants
-- ------------------------------------------------------------------------------

-- 13a. Rate limiting ------------------------------------------------------------

-- Hit log used by public.rate_limit_hit(). RLS on + no policies + no grants = only
-- the SECURITY DEFINER functions below can touch it.
create table if not exists public.rate_limit_events (
    id bigserial primary key,
    key text not null,
    created_at timestamp with time zone not null default now()
);
create index if not exists idx_rate_limit_events_key_time on public.rate_limit_events(key, created_at desc);
alter table public.rate_limit_events enable row level security;
revoke all on public.rate_limit_events from anon, authenticated;
revoke all on sequence public.rate_limit_events_id_seq from anon, authenticated;

-- Best-effort client address (only used to throttle anonymous endpoints).
create or replace function public.request_client_key()
returns text
language plpgsql stable set search_path = public as $$
declare
    h json;
    ip text;
begin
    begin
        h := nullif(current_setting('request.headers', true), '')::json;
    exception when others then
        h := null;
    end;
    ip := coalesce(
        nullif(h ->> 'cf-connecting-ip', ''),
        nullif(h ->> 'x-real-ip', ''),
        nullif(trim(split_part(coalesce(h ->> 'x-forwarded-for', ''), ',', 1)), ''),
        'unknown'
    );
    return left(ip, 64);
end;
$$;

-- Sliding-window limiter: raises 'rate_limited' when more than p_max hits were
-- recorded for p_key inside p_window. Note: because the exception aborts the
-- calling transaction, only *allowed* calls leave a row behind, which is exactly
-- what a sliding window needs.
create or replace function public.rate_limit_hit(p_key text, p_max integer, p_window interval)
returns void
language plpgsql security definer set search_path = public as $$
declare
    v_count integer;
begin
    if random() < 0.02 then
        delete from public.rate_limit_events where created_at < now() - interval '1 day';
    end if;

    select count(*) into v_count
      from public.rate_limit_events
     where key = p_key and created_at > now() - p_window;

    if v_count >= p_max then
        raise exception 'rate_limited';
    end if;

    insert into public.rate_limit_events (key) values (p_key);
end;
$$;

-- Per-user write throttle + total quota on INSERT.
-- trigger args: (max inserts per minute, max rows per user)
create index if not exists idx_tasks_user_created on public.tasks(user_id, created_at desc);
create index if not exists idx_clients_user_created on public.clients(user_id, created_at desc);
create index if not exists idx_projects_user_created on public.projects(user_id, created_at desc);
create index if not exists idx_calendars_user_created on public.calendars(user_id, created_at desc);

create or replace function public.guard_user_insert()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
    v_per_minute integer;
    v_total integer;
    v_recent integer;
    v_count integer;
begin
    -- Only throttle end users; migrations / service role (no JWT subject) are exempt
    if auth.uid() is null then return new; end if;

    v_per_minute := tg_argv[0]::integer;
    v_total := tg_argv[1]::integer;

    execute format(
        'select count(*) from public.%I where user_id = $1 and created_at > now() - interval ''1 minute''',
        tg_table_name
    ) into v_recent using new.user_id;
    if v_recent >= v_per_minute then raise exception 'rate_limited'; end if;

    execute format('select count(*) from public.%I where user_id = $1', tg_table_name)
        into v_count using new.user_id;
    if v_count >= v_total then raise exception 'quota_exceeded'; end if;

    return new;
end;
$$;

drop trigger if exists guard_tasks_insert on public.tasks;
create trigger guard_tasks_insert before insert on public.tasks
    for each row execute function public.guard_user_insert(300, 20000);

drop trigger if exists guard_clients_insert on public.clients;
create trigger guard_clients_insert before insert on public.clients
    for each row execute function public.guard_user_insert(60, 5000);

drop trigger if exists guard_projects_insert on public.projects;
create trigger guard_projects_insert before insert on public.projects
    for each row execute function public.guard_user_insert(60, 5000);

drop trigger if exists guard_calendars_insert on public.calendars;
create trigger guard_calendars_insert before insert on public.calendars
    for each row execute function public.guard_user_insert(20, 100);

-- Caps on sharing fan-out
create or replace function public.guard_sharing_quota()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
    v_count integer;
begin
    if tg_table_name = 'calendar_invites' then
        select count(*) into v_count from public.calendar_invites where calendar_id = new.calendar_id;
        if v_count >= 200 then raise exception 'quota_exceeded'; end if;
    else
        select count(*) into v_count from public.calendar_members where calendar_id = new.calendar_id;
        if v_count >= 100 then raise exception 'quota_exceeded'; end if;
    end if;
    return new;
end;
$$;

drop trigger if exists guard_invites_insert on public.calendar_invites;
create trigger guard_invites_insert before insert on public.calendar_invites
    for each row execute function public.guard_sharing_quota();

drop trigger if exists guard_members_insert on public.calendar_members;
create trigger guard_members_insert before insert on public.calendar_members
    for each row execute function public.guard_sharing_quota();

-- 13b. Integrity -----------------------------------------------------------------

-- Ownership and creation time can never be rewritten by an UPDATE
create or replace function public.protect_ownership()
returns trigger
language plpgsql set search_path = public as $$
begin
    if new.user_id is distinct from old.user_id then
        raise exception 'forbidden';
    end if;
    new.created_at := old.created_at;
    return new;
end;
$$;

drop trigger if exists protect_tasks_ownership on public.tasks;
create trigger protect_tasks_ownership before update on public.tasks
    for each row execute function public.protect_ownership();
drop trigger if exists protect_clients_ownership on public.clients;
create trigger protect_clients_ownership before update on public.clients
    for each row execute function public.protect_ownership();
drop trigger if exists protect_projects_ownership on public.projects;
create trigger protect_projects_ownership before update on public.projects
    for each row execute function public.protect_ownership();
drop trigger if exists protect_calendars_ownership on public.calendars;
create trigger protect_calendars_ownership before update on public.calendars
    for each row execute function public.protect_ownership();

-- Foreign keys alone don't stop a user pointing their rows at someone else's UUIDs
create or replace function public.check_relations()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
    if auth.uid() is null then return new; end if;

    if tg_table_name = 'projects' then
        if new.client_id is not null
           and (tg_op = 'INSERT' or new.client_id is distinct from old.client_id)
           and not exists (select 1 from public.clients c where c.id = new.client_id and c.user_id = auth.uid()) then
            raise exception 'forbidden';
        end if;
    elsif tg_table_name = 'tasks' then
        if new.project_id is not null
           and (tg_op = 'INSERT' or new.project_id is distinct from old.project_id)
           and not exists (select 1 from public.projects p where p.id = new.project_id and p.user_id = auth.uid()) then
            raise exception 'forbidden';
        end if;
        if new.parent_id is not null and new.parent_id = new.id then
            raise exception 'forbidden';
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists check_projects_relations on public.projects;
create trigger check_projects_relations before insert or update on public.projects
    for each row execute function public.check_relations();
drop trigger if exists check_tasks_relations on public.tasks;
create trigger check_tasks_relations before insert or update on public.tasks
    for each row execute function public.check_relations();

-- profiles.email feeds the "already a member" check and collaborator lists, so a
-- user must not be able to claim someone else's address there.
create or replace function public.protect_profile()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
    -- depth 1 = a direct client write; nested calls (auth sync trigger) are trusted
    if auth.uid() is not null and pg_trigger_depth() = 1 then
        if tg_op = 'UPDATE' then
            new.id := old.id;
            new.email := old.email;
        else
            new.email := lower(auth.jwt() ->> 'email');
        end if;
    end if;
    return new;
end;
$$;

drop trigger if exists protect_profiles on public.profiles;
create trigger protect_profiles before insert or update on public.profiles
    for each row execute function public.protect_profile();

-- Keep profiles.email in sync when the confirmed auth e-mail changes
create or replace function public.sync_profile_email()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
    update public.profiles set email = lower(new.email) where id = new.id;
    return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
    after update of email on auth.users
    for each row when (old.email is distinct from new.email)
    execute function public.sync_profile_email();

-- 13c. Validation constraints (NOT VALID: enforced for new/changed rows without
--      failing on legacy data; run `alter table ... validate constraint ...` once clean)
do $$
declare
    c record;
begin
    for c in
        select * from (values
            ('profiles',  'profiles_len_chk',  $c$char_length(coalesce(full_name, '')) <= 120 and char_length(coalesce(email, '')) <= 254 and (coalesce(avatar_url, '') = '' or (char_length(avatar_url) <= 2048 and avatar_url ~* '^https://'))$c$),
            ('clients',   'clients_valid_chk', $c$char_length(name) between 1 and 120 and char_length(coalesce(company, '')) <= 120 and char_length(coalesce(email, '')) <= 254 and (coalesce(email, '') = '' or email ~ '^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$') and char_length(coalesce(phone, '')) <= 32 and char_length(coalesce(notes, '')) <= 5000 and coalesce(hourly_rate, 0) >= 0 and coalesce(currency, 'EUR') ~ '^[A-Za-z]{3}$'$c$),
            ('projects',  'projects_valid_chk',$c$char_length(title) between 1 and 200 and char_length(coalesce(description, '')) <= 5000 and coalesce(budget, 0) >= 0 and coalesce(quoted_price, 0) >= 0 and coalesce(invoiced_amount, 0) >= 0$c$),
            ('tasks',     'tasks_valid_chk',   $c$char_length(title) between 1 and 200 and char_length(coalesce(description, '')) <= 5000 and (due_time is null or due_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$') and (duration_minutes is null or duration_minutes between 1 and 1440) and (remind_before is null or remind_before between 0 and 10080) and order_index between -1000000 and 1000000$c$),
            ('calendars', 'calendars_valid_chk',$c$char_length(name) between 1 and 120 and char_length(coalesce(description, '')) <= 500 and coalesce(color, '#6366f1') ~ '^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$'$c$),
            ('calendar_invites', 'calendar_invites_valid_chk', $c$char_length(coalesce(email, '')) <= 254 and (max_uses is null or max_uses > 0)$c$)
        ) as t(tbl, cname, expr)
    loop
        execute format('alter table public.%I drop constraint if exists %I', c.tbl, c.cname);
        execute format('alter table public.%I add constraint %I check (%s) not valid', c.tbl, c.cname, c.expr);
    end loop;
end $$;

-- 13d. Least privilege ------------------------------------------------------------
-- Signed-out visitors never need direct table access (RLS already denies it; this is defence in depth).
revoke all on all tables in schema public from anon;

-- Functions are executable by PUBLIC by default. Close that for OUR functions only (never blanket-revoke on
-- the schema: extension functions such as uuid_generate_v4() live here and column defaults call them as the user).
revoke execute on function
    public.handle_updated_at(), public.handle_new_user(), public.delete_user_account(),
    public.calendar_role(uuid), public.can_view_calendar(uuid), public.can_edit_calendar(uuid),
    public.shares_calendar_with(uuid), public.create_calendar_invite(uuid, text, text),
    public.get_invite_info(text), public.accept_calendar_invite(text), public.my_pending_invites(),
    public.decline_calendar_invite(text), public.request_client_key(),
    public.rate_limit_hit(text, integer, interval), public.guard_user_insert(),
    public.guard_sharing_quota(), public.protect_ownership(), public.check_relations(),
    public.protect_profile(), public.sync_profile_email()
from public, anon, authenticated;

-- RLS policy helpers run as the caller, so signed-in users need them
grant execute on function public.calendar_role(uuid) to authenticated;
grant execute on function public.can_view_calendar(uuid) to authenticated;
grant execute on function public.can_edit_calendar(uuid) to authenticated;
grant execute on function public.shares_calendar_with(uuid) to authenticated;

-- RPCs used by the client
grant execute on function public.get_invite_info(text) to anon, authenticated;
grant execute on function public.create_calendar_invite(uuid, text, text) to authenticated;
grant execute on function public.accept_calendar_invite(text) to authenticated;
grant execute on function public.my_pending_invites() to authenticated;
grant execute on function public.decline_calendar_invite(text) to authenticated;
grant execute on function public.delete_user_account() to authenticated;
