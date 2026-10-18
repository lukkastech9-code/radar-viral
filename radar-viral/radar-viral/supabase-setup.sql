-- Radar Viral V6: execute uma vez no SQL Editor do seu projeto Supabase.
-- Crie os usuários no Supabase Authentication > Users.
create table if not exists public.profiles (id uuid primary key references auth.users(id) on delete cascade, role text not null default 'writer' check(role in ('writer','admin')));
create table if not exists public.news_articles (id uuid primary key default gen_random_uuid(), slug text unique not null check(slug ~ '^[a-z0-9-]+$'), title text not null, cat text not null check(cat in ('Tecnologia','Games','Entretenimento','Tendências','Curiosidades')), date date not null, summary text not null, body jsonb not null default '[]'::jsonb, emoji text not null default '✦', status text not null default 'draft' check(status in ('draft','review','published')), author_id uuid not null references auth.users(id), created_at timestamptz not null default now());
create or replace function public.make_writer_profile() returns trigger language plpgsql security definer set search_path='' as $$begin insert into public.profiles(id,role) values(new.id,'writer'); return new;end$$;
drop trigger if exists on_auth_user_created_radar on auth.users;
create trigger on_auth_user_created_radar after insert on auth.users for each row execute function public.make_writer_profile();
insert into public.profiles(id,role) select id,'writer' from auth.users on conflict(id) do nothing;
create or replace function public.is_radar_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.profiles where id=(select auth.uid()) and role='admin')$$;
alter table public.profiles enable row level security;
alter table public.news_articles enable row level security;
drop policy if exists "Read own profile" on public.profiles;
create policy "Read own profile" on public.profiles for select to authenticated using(id=(select auth.uid()));
drop policy if exists "Public read published or author or admin" on public.news_articles;
create policy "Public read published or author or admin" on public.news_articles for select to anon,authenticated using(status='published' or (select auth.uid())=author_id or public.is_radar_admin());
drop policy if exists "Writer insert draft or review" on public.news_articles;
create policy "Writer insert draft or review" on public.news_articles for insert to authenticated with check(author_id=(select auth.uid()) and (status in ('draft','review') or public.is_radar_admin()));
drop policy if exists "Writer update own unpublished or admin" on public.news_articles;
create policy "Writer update own unpublished or admin" on public.news_articles for update to authenticated using((author_id=(select auth.uid()) and status<>'published') or public.is_radar_admin()) with check((author_id=(select auth.uid()) and status in ('draft','review')) or public.is_radar_admin());
drop policy if exists "Only admin delete" on public.news_articles;
create policy "Only admin delete" on public.news_articles for delete to authenticated using(public.is_radar_admin());
-- Depois de criar SUA conta no Authentication > Users, promova-a manualmente:
-- update public.profiles set role='admin' where id=(select id from auth.users where email='SEU_EMAIL_AQUI');
-- Nunca execute a promoção sem trocar o e-mail e conferir o usuário.
