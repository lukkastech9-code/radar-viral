-- Radar Viral V7: execute UMA VEZ no SQL Editor do mesmo projeto Supabase V6.
-- Mantém notícias, contas e políticas existentes.
alter table public.news_articles add column if not exists image_url text;
alter table public.news_articles add column if not exists views bigint not null default 0;
-- Bucket público: somente imagens de notícias, nunca arquivos confidenciais.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('article-images','article-images',true,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];
drop policy if exists "Radar images public read" on storage.objects;
create policy "Radar images public read" on storage.objects for select to anon,authenticated using(bucket_id='article-images');
drop policy if exists "Radar images writers upload" on storage.objects;
create policy "Radar images writers upload" on storage.objects for insert to authenticated with check(bucket_id='article-images' and (storage.foldername(name))[1]=(select auth.uid())::text and lower(storage.extension(name)) in ('jpg','jpeg','png','webp') and exists(select 1 from public.profiles where id=(select auth.uid()) and role in ('admin','writer')));
-- Views contam aberturas de página (não visitantes únicos).
create or replace function public.register_article_view(article_slug text) returns void language plpgsql security definer set search_path='' as $$begin
  if article_slug is null or article_slug !~ '^[a-z0-9-]{1,90}$' then return; end if;
  update public.news_articles set views=views+1 where slug=article_slug and status='published';
end$$;
revoke all on function public.register_article_view(text) from public;
grant execute on function public.register_article_view(text) to anon,authenticated;
