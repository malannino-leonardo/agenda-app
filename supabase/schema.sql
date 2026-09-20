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
$$ language plpgsql security definer;

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
    delete from auth.users where id = auth.uid();
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------------------------
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- Strict user isolation guaranteeing users only access their own data
-- ------------------------------------------------------------------------------

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;

-- Profiles policies
create policy "Users can view own profile"
    on public.profiles for select
    using (auth.uid() = id);

create policy "Users can update own profile"
    on public.profiles for update
    using (auth.uid() = id);

create policy "Users can insert own profile"
    on public.profiles for insert
    with check (auth.uid() = id);

-- Clients policies
create policy "Users can view own clients"
    on public.clients for select
    using (auth.uid() = user_id);

create policy "Users can create own clients"
    on public.clients for insert
    with check (auth.uid() = user_id);

create policy "Users can update own clients"
    on public.clients for update
    using (auth.uid() = user_id);

create policy "Users can delete own clients"
    on public.clients for delete
    using (auth.uid() = user_id);

-- Projects policies
create policy "Users can view own projects"
    on public.projects for select
    using (auth.uid() = user_id);

create policy "Users can create own projects"
    on public.projects for insert
    with check (auth.uid() = user_id);

create policy "Users can update own projects"
    on public.projects for update
    using (auth.uid() = user_id);

create policy "Users can delete own projects"
    on public.projects for delete
    using (auth.uid() = user_id);

-- Tasks policies
create policy "Users can view own tasks"
    on public.tasks for select
    using (auth.uid() = user_id);

create policy "Users can create own tasks"
    on public.tasks for insert
    with check (auth.uid() = user_id);

create policy "Users can update own tasks"
    on public.tasks for update
    using (auth.uid() = user_id);

create policy "Users can delete own tasks"
    on public.tasks for delete
    using (auth.uid() = user_id);
