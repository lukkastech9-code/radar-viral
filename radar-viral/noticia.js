```javascript
(async () => {
  const article = document.getElementById('article');
  const related = document.getElementById('related');
  const relatedList = document.getElementById('related-list');
  const config = window.RADAR_SUPABASE || {};
  const slug = new URLSearchParams(location.search).get('id');

  const error = message => {
    article.replaceChildren();
    const p = document.createElement('p');
    p.className = 'article-error';
    p.textContent = message;
    article.append(p);
  };

  if (!config.url || !config.anonKey || !slug || !/^[a-z0-9-]+$/.test(slug)) {
    error('Notícia indisponível.');
    return;
  }

  const base = config.url.replace(/\/$/, '');
  const headers = {
    apikey: config.anonKey,
    Authorization: 'Bearer ' + config.anonKey,
    'Content-Type': 'application/json'
  };

  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const formatDate = date => {
    const d = new Date(date + 'T12:00:00');
    return Number.isNaN(d.getTime())
      ? date
      : d.toLocaleDateString('pt-BR', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
  };

  // Renderiza negrito, itálico e links sem inserir HTML não confiável.
  function renderInline(parent, text) {
    const pattern =
      /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|https?:\/\/[^\s<>"']+)/g;

    let last = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      if (match.index > last) {
        parent.append(document.createTextNode(text.slice(last, match.index)));
      }

      const token = match[0];

      if (token.startsWith('**') && token.endsWith('**')) {
        const strong = document.createElement('strong');
        strong.textContent = token.slice(2, -2);
        parent.append(strong);
      } else if (token.startsWith('*') && token.endsWith('*')) {
        const em = document.createElement('em');
        em.textContent = token.slice(1, -1);
        parent.append(em);
      } else {
        const cleanUrl = token.replace(/[.,!?;:)]+$/, '');
        const trailing = token.slice(cleanUrl.length);

        try {
          const parsed = new URL(cleanUrl);

          if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
            const link = document.createElement('a');
            link.href = parsed.href;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.textContent = cleanUrl;
            parent.append(link);
          } else {
            parent.append(document.createTextNode(cleanUrl));
          }
        } catch (_) {
          parent.append(document.createTextNode(cleanUrl));
        }

        if (trailing) {
          parent.append(document.createTextNode(trailing));
        }
      }

      last = match.index + token.length;
    }

    if (last < text.length) {
      parent.append(document.createTextNode(text.slice(last)));
    }
  }

  // Renderiza os blocos da matéria: subtítulos, parágrafos e listas.
  function renderMarkdown(container, source) {
    const normalized = String(source || '')
      .replace(/\r\n?/g, '\n')
      .replace(/\\\n/g, '\n');

    const lines = normalized.split('\n');
    let paragraph = [];
    let list = null;

    const flushParagraph = () => {
      if (!paragraph.length) return;

      const p = document.createElement('p');
      renderInline(p, paragraph.join(' ').trim());
      container.append(p);
      paragraph = [];
    };

    const closeList = () => {
      if (list) {
        container.append(list);
        list = null;
      }
    };

    for (const rawLine of lines) {
      const line = rawLine.trim();

      if (!line) {
        flushParagraph();
        closeList();
        continue;
      }

      const heading = line.match(/^#{1,6}\s+(.+)$/);

      if (heading) {
        flushParagraph();
        closeList();

        const level = Math.min(line.match(/^#+/)[0].length + 1, 6);
        const h = document.createElement('h' + level);
        renderInline(h, heading[1].trim());
        container.append(h);
        continue;
      }

      const bullet = line.match(/^[-*]\s+(.+)$/);
      const numbered = line.match(/^\d+[.)]\s+(.+)$/);

      if (bullet || numbered) {
        flushParagraph();

        const tag = bullet ? 'ul' : 'ol';

        if (!list || list.tagName.toLowerCase() !== tag) {
          closeList();
          list = document.createElement(tag);
        }

        const li = document.createElement('li');
        renderInline(li, (bullet || numbered)[1]);
        list.append(li);
        continue;
      }

      closeList();
      paragraph.push(line);
    }

    flushParagraph();
    closeList();
  }

  try {
    const url =
      base +
      '/rest/v1/news_articles?select=title,cat,date,summary,body,image_url,views' +
      '&status=eq.published&slug=eq.' +
      encodeURIComponent(slug) +
      '&limit=1';

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw Error('Não foi possível carregar a notícia.');
    }

    const news = (await response.json())[0];

    if (!news) {
      throw Error('Notícia não encontrada.');
    }

    article.replaceChildren();

    const heading = make('div', 'article-heading');
    heading.append(make('span', 'article-category', news.cat || 'Notícias'));
    heading.append(make('h1', 'article-title', news.title || 'Sem título'));

    const meta = make('div', 'article-meta');
    meta.append(make('span', '', formatDate(news.date)));
    meta.append(make('span', 'meta-separator', '•'));

    const count = make(
      'span',
      'article-views',
      '◉ ' + Number(news.views || 0).toLocaleString('pt-BR') + ' visualizações'
    );

    meta.append(count);
    heading.append(meta);
    article.append(heading);

    if (news.image_url) {
      const figure = make('figure', 'article-figure');
      const img = make('img', 'article-cover');

      img.src = news.image_url;
      img.alt = 'Imagem de capa da matéria: ' + news.title;
      img.loading = 'eager';

      figure.append(img);
      article.append(figure);
    }

    const content = make('div', 'article-content');

    if (news.summary) {
      const lead = make('p', 'article-lead');
      renderMarkdown(lead, news.summary);
      content.append(lead);
    }

    const paragraphs = Array.isArray(news.body)
      ? news.body
      : typeof news.body === 'string'
        ? news.body.split(/\n\s*\n/)
        : [];

    for (const text of paragraphs) {
      if (!String(text).trim()) continue;

      const block = make('div', 'article-text-block');
      renderMarkdown(block, String(text));
      content.append(block);
    }

    article.append(content);

    // Compartilhamento
    const share = make('div', 'article-share');
    share.append(make('strong', '', 'Compartilhe esta matéria'));

    const buttons = make('div', 'share-buttons');
    const pageUrl = location.href;
    const title = news.title || 'Radar Viral';

    const destinations = [
      ['whatsapp', 'WhatsApp',
        'https://api.whatsapp.com/send?text=' +
        encodeURIComponent(title + ' — ' + pageUrl)],
      ['facebook', 'Facebook',
        'https://www.facebook.com/sharer/sharer.php?u=' +
        encodeURIComponent(pageUrl)],
      ['instagram', 'Instagram', null],
      ['x', 'X',
        'https://twitter.com/intent/tweet?url=' +
        encodeURIComponent(pageUrl) + '&text=' + encodeURIComponent(title)],
      ['telegram', 'Telegram',
        'https://t.me/share/url?url=' +
        encodeURIComponent(pageUrl) + '&text=' + encodeURIComponent(title)],
      ['linkedin', 'LinkedIn',
        'https://www.linkedin.com/sharing/share-offsite/?url=' +
        encodeURIComponent(pageUrl)]
    ];

    const notify = async button => {
      try {
        await navigator.clipboard.writeText(pageUrl);
        button.title = 'Link copiado!';
        button.setAttribute('aria-label', 'Link copiado!');
      } catch (_) {
        window.prompt('Copie o link:', pageUrl);
      }
    };

    for (const [name, label, url] of destinations) {
      const b = make(url ? 'a' : 'button', 'social-share social-' + name);

      b.title = name === 'instagram'
        ? 'Instagram: copiar link para compartilhar'
        : `Compartilhar no ${label}`;

      b.setAttribute('aria-label', b.title);

      const img = make('img');
      img.src = 'imagens/social/' + name + '.svg';
      img.alt = '';
      b.append(img);

      if (url) {
        b.href = url;
        b.target = '_blank';
        b.rel = 'noopener noreferrer';
      } else {
        b.type = 'button';

        b.addEventListener('click', async () => {
          if (navigator.share) {
            try {
              await navigator.share({
                title,
                text: title,
                url: pageUrl
              });
              return;
            } catch (_) {}
          }

          await notify(b);
        });
      }

      buttons.append(b);
    }

    const copy = make('button', 'social-share social-copy');
    copy.type = 'button';
    copy.title = 'Copiar link';
    copy.setAttribute('aria-label', 'Copiar link');

    const ci = make('img');
    ci.src = 'imagens/social/link.svg';
    ci.alt = '';

    copy.append(ci);
    copy.addEventListener('click', () => notify(copy));
    buttons.append(copy);

    share.append(buttons);
    article.append(share);

    // SEO e compartilhamento
    const desc = document.querySelector('meta[name="description"]');
    if (desc) desc.content = (news.summary || news.title || '').slice(0, 155);

    const og = document.querySelector('meta[property="og:title"]');
    if (og) og.content = news.title || '';

    const ogdesc = document.querySelector('meta[property="og:description"]');
    if (ogdesc) ogdesc.content = news.summary || news.title || '';

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && location.protocol.startsWith('http')) {
      canonical.href = location.href;
    }

    const ld = document.createElement('script');
    ld.type = 'application/ld+json';
    ld.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'NewsArticle',
      headline: news.title,
      description: news.summary || '',
      datePublished: news.date,
      image: news.image_url ? [news.image_url] : undefined,
      mainEntityOfPage: location.href,
      publisher: {
        '@type': 'Organization',
        name: 'Radar Viral'
      }
    });

    document.head.append(ld);

    const ogimage = document.querySelector('meta[property="og:image"]');
    if (ogimage && news.image_url) ogimage.content = news.image_url;

    const end = make('div', 'article-end');
    end.append(make('span', 'end-line'));
    end.append(make('strong', '', 'RADAR VIRAL'));
    article.append(end);

    const crumb = document.getElementById('crumb-category');

    const catPages = {
      Tecnologia: 'tecnologia.html',
      Games: 'games.html',
      Entretenimento: 'entretenimento.html',
      'Tendências': 'tendencias.html',
      Curiosidades: 'curiosidades.html'
    };

    const crumbLink = make('a', '', news.cat || 'Notícias');
    crumbLink.href = catPages[news.cat] || 'index.html';
    crumb.replaceChildren(crumbLink);

    document.title = (news.title || 'Notícia') + ' | Radar Viral';

    // Registra a visualização
    fetch(base + '/rest/v1/rpc/register_article_view', {
      method: 'POST',
      headers,
      body: JSON.stringify({ article_slug: slug })
    }).catch(() => {});

    // Notícias relacionadas
    try {
      const q =
        base +
        '/rest/v1/news_articles?select=slug,title,cat,image_url,date' +
        '&status=eq.published&slug=neq.' +
        encodeURIComponent(slug) +
        '&cat=eq.' +
        encodeURIComponent(news.cat) +
        '&order=date.desc&limit=3';

      const r = await fetch(q, { headers });
      if (!r.ok) return;

      let items = await r.json();

      if (items.length < 3) {
        const fallback =
          await fetch(
            base +
            '/rest/v1/news_articles?select=slug,title,cat,image_url,date' +
            '&status=eq.published&slug=neq.' +
            encodeURIComponent(slug) +
            '&order=date.desc&limit=6',
            { headers }
          );

        if (fallback.ok) {
          const extra = await fallback.json();
          items = [
            ...items,
            ...extra.filter(x => !items.some(y => y.slug === x.slug))
          ].slice(0, 3);
        }
      }

      for (const item of items) {
        if (!item.slug || !/^[a-z0-9-]+$/.test(item.slug)) continue;

        const link = make('a', 'related-card');
        link.href = 'noticia.html?id=' + encodeURIComponent(item.slug);

        if (item.image_url) {
          const img = make('img', 'related-cover');
          img.src = item.image_url;
          img.alt = '';
          img.loading = 'lazy';
          link.append(img);
        } else {
          link.append(make('div', 'related-placeholder', 'R'));
        }

        const inner = make('div', 'related-card-body');
        inner.append(make('span', 'related-cat', item.cat || 'Notícias'));
        inner.append(make('h3', '', item.title || 'Notícia'));

        link.append(inner);
        relatedList.append(link);
      }

      if (relatedList.children.length) related.hidden = false;
    } catch (_) {
      // Notícias relacionadas são opcionais.
    }
  } catch (e) {
    error(e.message || 'Não foi possível carregar a notícia.');
  }
})();
```
