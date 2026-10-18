(async () => {
  const article = document.getElementById('article');
  const related = document.getElementById('related');
  const relatedList = document.getElementById('related-list');
  const config = window.RADAR_SUPABASE || {};
  const slug = new URLSearchParams(location.search).get('id');
  const error = message => { article.replaceChildren(); const p = document.createElement('p'); p.className = 'article-error'; p.textContent = message; article.append(p); };
  if (!config.url || !config.anonKey || !slug || !/^[a-z0-9-]+$/.test(slug)) { error('Notícia indisponível.'); return; }
  const base = config.url.replace(/\/$/, '');
  const headers = { apikey: config.anonKey, Authorization: 'Bearer ' + config.anonKey, 'Content-Type': 'application/json' };
  const make = (tag, className, text) => { const el = document.createElement(tag); if (className) el.className = className; if (text !== undefined) el.textContent = text; return el; };
  const formatDate = date => { const d = new Date(date + 'T12:00:00'); return Number.isNaN(d.getTime()) ? date : d.toLocaleDateString('pt-BR', {day:'numeric',month:'long',year:'numeric'}); };
  try {
    const url = base + '/rest/v1/news_articles?select=title,cat,date,summary,body,image_url,views&status=eq.published&slug=eq.' + encodeURIComponent(slug) + '&limit=1';
    const response = await fetch(url, { headers });
    if (!response.ok) throw Error('Não foi possível carregar a notícia.');
    const news = (await response.json())[0];
    if (!news) throw Error('Notícia não encontrada.');
    article.replaceChildren();
    const heading = make('div','article-heading');
    heading.append(make('span','article-category',news.cat || 'Notícias'));
    heading.append(make('h1','article-title',news.title || 'Sem título'));
    const meta = make('div','article-meta');
    meta.append(make('span','',formatDate(news.date)));
    meta.append(make('span','meta-separator','•'));
    const count = make('span','article-views','◉ ' + Number(news.views || 0).toLocaleString('pt-BR') + ' visualizações');
    meta.append(count); heading.append(meta); article.append(heading);
    if (news.image_url) { const figure = make('figure','article-figure'); const img = make('img','article-cover'); img.src = news.image_url; img.alt = 'Imagem de capa da matéria: ' + news.title; img.loading = 'eager'; figure.append(img); article.append(figure); }
    const content = make('div','article-content');
    if (news.summary) content.append(make('p','article-lead',news.summary));
    const paragraphs = Array.isArray(news.body) ? news.body : typeof news.body === 'string' ? news.body.split(/\n\s*\n/) : [];
    for (const text of paragraphs) if (String(text).trim()) content.append(make('p','',String(text)));
    article.append(content);
    const share=make('div','article-share');share.append(make('strong','','Compartilhe esta matéria'));const buttons=make('div','share-buttons');
    const pageUrl=location.href;const title=news.title||'Radar Viral';
    const destinations=[['whatsapp','WhatsApp','https://api.whatsapp.com/send?text='+encodeURIComponent(title+' — '+pageUrl)],['facebook','Facebook','https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(pageUrl)],['instagram','Instagram',null],['x','X','https://twitter.com/intent/tweet?url='+encodeURIComponent(pageUrl)+'&text='+encodeURIComponent(title)],['telegram','Telegram','https://t.me/share/url?url='+encodeURIComponent(pageUrl)+'&text='+encodeURIComponent(title)],['linkedin','LinkedIn','https://www.linkedin.com/sharing/share-offsite/?url='+encodeURIComponent(pageUrl)]];
    const notify=async button=>{try{await navigator.clipboard.writeText(pageUrl);button.title='Link copiado!';button.setAttribute('aria-label','Link copiado!')}catch(_){window.prompt('Copie o link:',pageUrl)}};
    for(const [name,label,url] of destinations){const b=make(url?'a':'button','social-share social-'+name);b.title=name==='instagram'?'Instagram: copiar link para compartilhar':`Compartilhar no ${label}`;b.setAttribute('aria-label',b.title);const img=make('img');img.src='imagens/social/'+name+'.svg';img.alt='';b.append(img);if(url){b.href=url;b.target='_blank';b.rel='noopener noreferrer'}else{b.type='button';b.addEventListener('click',async()=>{if(navigator.share){try{await navigator.share({title,text:title,url:pageUrl});return}catch(_){}}await notify(b)})}buttons.append(b)}
    const copy=make('button','social-share social-copy');copy.type='button';copy.title='Copiar link';copy.setAttribute('aria-label','Copiar link');const ci=make('img');ci.src='imagens/social/link.svg';ci.alt='';copy.append(ci);copy.addEventListener('click',()=>notify(copy));buttons.append(copy);share.append(buttons);article.append(share);
    const desc=document.querySelector('meta[name="description"]');if(desc)desc.content=(news.summary||news.title||'').slice(0,155);
    const og=document.querySelector('meta[property="og:title"]');if(og)og.content=news.title;
    const ogdesc=document.querySelector('meta[property="og:description"]');if(ogdesc)ogdesc.content=news.summary||news.title;
    const canonical=document.querySelector('link[rel=canonical]');if(canonical&&location.protocol.startsWith('http'))canonical.href=location.href;const ld=document.createElement('script');ld.type='application/ld+json';ld.textContent=JSON.stringify({'@context':'https://schema.org','@type':'NewsArticle',headline:news.title,description:news.summary||'',datePublished:news.date,image:news.image_url?[news.image_url]:undefined,mainEntityOfPage:location.href,publisher:{'@type':'Organization',name:'Radar Viral'}});document.head.append(ld);const ogimage=document.querySelector('meta[property="og:image"]');if(ogimage&&news.image_url)ogimage.content=news.image_url;

    const end = make('div','article-end'); end.append(make('span','end-line')); end.append(make('strong','', 'RADAR VIRAL')); article.append(end);
    const crumb=document.getElementById('crumb-category');const catPages={Tecnologia:'tecnologia.html',Games:'games.html',Entretenimento:'entretenimento.html','Tendências':'tendencias.html',Curiosidades:'curiosidades.html'};const crumbLink=make('a','',news.cat||'Notícias');crumbLink.href=catPages[news.cat]||'index.html';crumb.replaceChildren(crumbLink);
    document.title = news.title + ' | Radar Viral';
    fetch(base + '/rest/v1/rpc/register_article_view', {method:'POST',headers,body:JSON.stringify({article_slug:slug})}).catch(() => {});
    try {
      const q = base + '/rest/v1/news_articles?select=slug,title,cat,image_url,date&status=eq.published&slug=neq.' + encodeURIComponent(slug) + '&cat=eq.' + encodeURIComponent(news.cat) + '&order=date.desc&limit=3';
      const r = await fetch(q,{headers});
      if (!r.ok) return;
      let items = await r.json(); if(items.length<3){const fallback=await fetch(base+'/rest/v1/news_articles?select=slug,title,cat,image_url,date&status=eq.published&slug=neq.'+encodeURIComponent(slug)+'&order=date.desc&limit=6',{headers});if(fallback.ok){const extra=await fallback.json();items=[...items,...extra.filter(x=>!items.some(y=>y.slug===x.slug))].slice(0,3)}}
      for (const item of items) {
        if (!item.slug || !/^[a-z0-9-]+$/.test(item.slug)) continue;
        const link = make('a','related-card'); link.href = 'noticia.html?id=' + encodeURIComponent(item.slug);
        if (item.image_url) { const img = make('img','related-cover'); img.src = item.image_url; img.alt = ''; img.loading = 'lazy'; link.append(img); }
        else link.append(make('div','related-placeholder','R'));
        const inner = make('div','related-card-body'); inner.append(make('span','related-cat',item.cat || 'Notícias')); inner.append(make('h3','',item.title || 'Notícia')); link.append(inner); relatedList.append(link);
      }
      if (relatedList.children.length) related.hidden = false;
    } catch (_) { /* Related articles are optional. */ }
  } catch (e) { error(e.message || 'Não foi possível carregar a notícia.'); }
})();
