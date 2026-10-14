-- Radar Viral V12 — execute UMA VEZ no SQL Editor do Supabase, após V10.
-- Os dados de horas anteriores à execução não podem ser recuperados.
create table if not exists public.article_views_hourly (
 article_slug text not null,
 view_hour timestamptz not null,
 views bigint not null default 0,
 primary key(article_slug,view_hour)
);
create index if not exists article_views_hourly_view_hour_idx on public.article_views_hourly(view_hour);
alter table public.article_views_hourly enable row level security;
drop policy if exists "Radar hourly read" on public.article_views_hourly;
create policy "Radar hourly read" on public.article_views_hourly for select to anon,authenticated using(true);
create or replace function public.register_article_view(article_slug text)
returns void language plpgsql security definer set search_path='' as $$
declare hour_start timestamptz;
begin
 if article_slug is null or article_slug !~ '^[a-z0-9-]{1,90}$' then return; end if;
 update public.news_articles set views=coalesce(views,0)+1 where slug=article_slug and status='published';
 if found then
  insert into public.article_views_daily(article_slug,view_date,views)
  values(article_slug,(now() at time zone 'UTC')::date,1)
  on conflict(article_slug,view_date) do update set views=public.article_views_daily.views+1;
  hour_start:=date_trunc('hour',now());
  insert into public.article_views_hourly(article_slug,view_hour,views)
  values(article_slug,hour_start,1)
  on conflict(article_slug,view_hour) do update set views=public.article_views_hourly.views+1;
 end if;
end;$$;
revoke all on function public.register_article_view(text) from public;
grant execute on function public.register_article_view(text) to anon,authenticated;
-- Nota: 24h calculadas por blocos horários; margem de até 59 minutos.
-- Contagens públicas podem ser infladas por bots; aplique rate limiting antes de alto tráfego.
