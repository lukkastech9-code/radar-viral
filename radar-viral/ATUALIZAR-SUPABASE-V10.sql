-- Radar Viral V10: contagem semanal aproximada de aberturas (não usuários únicos).
create table if not exists public.article_views_daily (
 article_slug text not null, view_date date not null default (now() at time zone 'UTC')::date, views bigint not null default 0,
 primary key (article_slug,view_date)
);
alter table public.article_views_daily enable row level security;
drop policy if exists "Radar daily read" on public.article_views_daily;
create policy "Radar daily read" on public.article_views_daily for select to anon,authenticated using(true);
create or replace function public.register_article_view(article_slug text) returns void language plpgsql security definer set search_path='' as $$
begin
 if article_slug is null or article_slug !~ '^[a-z0-9-]{1,90}$' then return; end if;
 update public.news_articles set views=views+1 where slug=article_slug and status='published';
 if found then
 insert into public.article_views_daily(article_slug,view_date,views) values(article_slug,(now() at time zone 'UTC')::date,1)
 on conflict(article_slug,view_date) do update set views=public.article_views_daily.views+1;
 end if;
end;$$;
revoke all on function public.register_article_view(text) from public;
grant execute on function public.register_article_view(text) to anon,authenticated;
-- Nota: em produção, aplique rate limit/antibot no endpoint de contagem.
