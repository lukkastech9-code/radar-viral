
(async () => {
  const article = document.getElementById('article');
  const related = document.getElementById('related');
  const relatedList = document.getElementById('related-list');
  const config = window.RADAR_SUPABASE || {};
  const slug = new URLSearchParams(location.search).get('id');

  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const error = message => {
    article.replaceChildren();
    article.append(make('p', 'article-error', message));
  };

  if (!config.url || !config.anonKey || !slug ||
      !/^[a-z0-9-]+$/.test(slug)) {
    error('Notícia indisponível.');
    return;
  }

  const base = config.url.replace(/\/$/, '');
  const headers = {
    apikey: config.anonKey,
    Authorization: 'Bearer ' + config.anonKey,
    'Content-Type': 'application/json'
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

  // Markdown seguro: não insere HTML bruto.
  function renderInline(parent, text) {
    const pattern =
      /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;

    let last = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      parent.append(
        document.createTextNode(text.slice(last, match.index))
      );

      const token = match[0];
      let el;

      if (token.startsWith('**')) {
        el = make('strong', '', token.slice(2, -2));
      } else if (token.startsWith('*')) {
        el = make('em', '', token.slice(1, -1));
      } else if (token.startsWith('`')) {
        el = make('code', '', token.slice(1, -1));
      } else {
        el = make('a', '', match[2]);
        el.href = match[3];
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
      }

      parent.append(el);
      last = pattern.lastIndex;
    }

    parent.append(
      document.createTextNode(text.slice(last))
    );
  }

  function renderMarkdown(container, source) {
    container.replaceChildren();

    const text = String(source || '')
      .replace(/\r\n?/g, '\n')
      .replace(/^\\(?=#{1,6}\s)/gm, '')
      .replace(/\\(?=\*\*)/g, '');

    const blocks = text.split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (!block.trim()) continue;

      const heading = lines[0].match(/^(#{1,6})\s+(.+)$/);

      if (heading) {
        const level = Math.min(6, heading[1].length);
        const el = make('h' + level, 'article-body-heading');
        renderInline(el, heading[2]);
        container.append(el);

        for (const line of lines.slice(1)) {
          if (line.trim()) {
            const p = make('p');
            renderInline(p, line);
            container.append(p);
          }
        }

        continue;
      }

      if (lines.every(line => /^\s*[-*]\s+/.test(line))) {
        const list = make('ul');

        for (const line of lines) {
          const li = make('li');
          renderInline(li, line.replace(/^\s*[-*]\s+/, ''));
          list.append(li);
        }

        container.append(list);
        continue;
      }

      const p = make('p');

      lines.forEach((line, index) => {
        if (index) p.append(document.createElement('br'));
        renderInline(p, line);
      });

      container.append(p);
    }
  }

  try {
    const endpoint =
      base + '/rest/v1/news_articles?select=title,cat,date,summary,body,image_url,views' +
      '&status=eq.published&slug=eq.' + encodeURIComponent(slug) +
      '&limit=1';

    const response = await fetch(endpoint, { headers });

    if (!response.ok) {
      throw Error('Não foi possível carregar a notícia.');
    }

    const news = (await response.json())[0];

    if (!news) {
      throw Error('Notícia não encontrada.');
    }

    article.replaceChildren();

    const heading = make('div', 'article-heading');
    heading.append(
      make('span', 'article-category', news.cat || 'Notícias')
    );
    heading.append(
      make('h1', 'article-title', news.title || 'Sem título')
    );

    const meta = make('div', 'article-meta');
    meta.append(make('span', '', formatDate(news.date || '')));
    meta.append(make('span', 'meta-separator', '•'));

    const viewCounter = make(
      'span',
      'article-views',
      '◉ ' + Number(news.views || 0).toLocaleString('pt-BR') +
      ' visualizações'
    );

    meta.append(viewCounter);
    heading.append(meta);
    article.append(heading);

    if (news.image_url) {
      const figure = make('figure', 'article-figure');
      const img = make('img', 'article-cover');

      img.src = news.image_url;
      img.alt = 'Imagem de capa da matéria: ' + (news.title || '');
      img.loading = 'eager';

      figure.append(img);
      article.append(figure);
    }

    const content = make('div', 'article-content');

    if (news.summary) {
      const lead = make('p', 'article-lead');
      renderInline(lead, news.summary);
      content.append(lead);
    }

    const body = Array.isArray(news.body)
      ? news.body.join('\n\n')
      : String(news.body || '');

    renderMarkdown(content, body);
    article.append(content);

    // Compartilhamento.
    const share = make('div', 'article-share');
    share.append(
      make('strong', '', 'Compartilhe esta matéria')
    );

    const buttons = make('div', 'share-buttons');
    const pageUrl = location.href;
    const title = news.title || 'Radar Viral';

    const destinations = [
      [
        'whatsapp',
        'WhatsApp',
        'https://api.whatsapp.com/send?text=' +
          encodeURIComponent(title + ' — ' + pageUrl)
      ],
      [
        'facebook',
        'Facebook',
        'https://www.facebook.com/sharer/sharer.php?u=' +
          encodeURIComponent(pageUrl)
      ],
      ['instagram', 'Instagram', null],
      [
        'x',
        'X',
        'https://twitter.com/intent/tweet?url=' +
          encodeURIComponent(pageUrl) +
          '&text=' + encodeURIComponent(title)
      ],
      [
        'telegram',
        'Telegram',
        'https://t.me/share/url?url=' +
          encodeURIComponent(pageUrl) +
          '&text=' + encodeURIComponent(title)
      ],
      [
        'linkedin',
        'LinkedIn',
        'https://www.linkedin.com/sharing/share-offsite/?url=' +
          encodeURIComponent(pageUrl)
      ]
    ];

    const copyLink = async button => {
      try {
        await navigator.clipboard.writeText(pageUrl);
        button.title = 'Link copiado!';
        button.setAttribute('aria-label', 'Link copiado!');
      } catch (_) {
        window.prompt('Copie o link:', pageUrl);
      }
    };

    for (const [name, label, url] of destinations) {
      const button = make(
        url ? 'a' : 'button',
        'social-share social-' + name
      );

      button.title = name === 'instagram'
        ? 'Instagram: copiar link para compartilhar'
        : 'Compartilhar no ' + label;

      button.setAttribute('aria-label', button.title);

      const img = make('img');
      img.src = 'imagens/social/' + name + '.svg';
      img.alt = '';
      button.append(img);

      if (url) {
        button.href = url;
        button.target = '_blank';
        button.rel = 'noopener noreferrer';
      } else {
        button.type = 'button';

        button.addEventListener('click', async () => {
          if (navigator.share) {
            try {
              await navigator.share({ title, url: pageUrl });
              return;
            } catch (_) {}
          }

          await copyLink(button);
        });
      }

      buttons.append(button);
    }

    const copy = make('button', 'social-share social-copy');
    copy.type = 'button';
    copy.title = 'Copiar link';
    copy.setAttribute('aria-label', 'Copiar link');

    const copyImg = make('img');
    copyImg.src = 'imagens/social/link.svg';
    copyImg.alt = '';
    copy.append(copyImg);

    copy.addEventListener('click', () => copyLink(copy));

    buttons.append(copy);
    share.append(buttons);
    article.append(share);

    // SEO.
    const description =
      document.querySelector('meta[name="description"]');

    if (description) {
      description.content =
        (news.summary || news.title || '').slice(0, 155);
    }

    const ogTitle =
      document.querySelector('meta[property="og:title"]');

    if (ogTitle) {
      ogTitle.content = news.title || 'Radar Viral';
    }

    const ogDescription =
      document.querySelector('meta[property="og:description"]');

    if (ogDescription) {
      ogDescription.content = news.summary || news.title || '';
    }

    const canonical =
      document.querySelector('link[rel="canonical"]');

    if (canonical && location.protocol.startsWith('http')) {
      canonical.href = location.href;
    }

    const ogImage =
      document.querySelector('meta[property="og:image"]');

    if (ogImage && news.image_url) {
      ogImage.content = news.image_url;
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
    article.append(make('div', 'article-end', 'RADAR VIRAL'));

    document.title = (news.title || 'Notícia') + ' | Radar Viral';

    const crumb = document.getElementById('crumb-category');

    if (crumb) {
      const pages = {
        Tecnologia: 'tecnologia.html',
        Games: 'games.html',
        Entretenimento: 'entretenimento.html',
        Tendências: 'tendencias.html',
        Curiosidades: 'curiosidades.html'
      };

      const link = make('a', '', news.cat || 'Notícias');
      link.href = pages[news.cat] || 'index.html';
      crumb.replaceChildren(link);
    }

    // Registra a visualização e atualiza o contador com o total retornado.
    try {
      const viewResponse = await fetch(
        base + '/rest/v1/rpc/register_article_view',
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ article_slug: slug })
        }
      );

      if (!viewResponse.ok) {
        throw Error(await viewResponse.text());
      }

      const updatedViews = await viewResponse.json();

      if (updatedViews !== null && updatedViews !== undefined) {
        viewCounter.textContent =
          '◉ ' + Number(updatedViews).toLocaleString('pt-BR') +
          ' visualizações';
      }
    } catch (viewError) {
      console.error(
        'Erro ao registrar visualização:',
        viewError
      );
    }

    // Notícias relacionadas.
    if (relatedList) {
      relatedList.replaceChildren();
    }

    const relatedUrl =
      base + '/rest/v1/news_articles?select=slug,title,cat,image_url,date' +
      '&status=eq.published&slug=neq.' + encodeURIComponent(slug) +
      '&cat=eq.' + encodeURIComponent(news.cat || '') +
      '&order=date.desc&limit=3';

    let items = [];
    const relatedResponse = await fetch(relatedUrl, { headers });

    if (relatedResponse.ok) {
      items = await relatedResponse.json();
    }

    if (items.length < 3) {
      const fallbackUrl =
        base + '/rest/v1/news_articles?select=slug,title,cat,image_url,date' +
        '&status=eq.published&slug=neq.' + encodeURIComponent(slug) +
        '&order=date.desc&limit=6';

      const fallback = await fetch(fallbackUrl, { headers });

      if (fallback.ok) {
        const extra = await fallback.json();

        items = [
          ...items,
          ...extra.filter(item =>
            !items.some(existing => existing.slug === item.slug)
          )
        ].slice(0, 3);
      }
    }

    for (const item of items) {
      if (!item.slug || !/^[a-z0-9-]+$/.test(item.slug)) {
        continue;
      }

      const link = make('a', 'related-card');
      link.href = 'noticia.html?id=' + encodeURIComponent(item.slug);

      if (item.image_url) {
        const img = make('img', 'related-cover');
        img.src = item.image_url;
        img.alt = '';
        img.loading = 'lazy';
        link.append(img);
      } else {
        link.append(
          make('div', 'related-placeholder', 'R')
        );
      }

      const inner = make('div', 'related-card-body');
      inner.append(
        make('span', 'related-cat', item.cat || 'Notícias')
      );
      inner.append(make('h3', '', item.title || 'Notícia'));

      link.append(inner);

      if (relatedList) {
        relatedList.append(link);
      }
    }

    if (related && relatedList && relatedList.children.length) {
      related.hidden = false;
    }

  } catch (e) {
    console.error('Erro ao carregar notícia:', e);
    error(e.message || 'Não foi possível carregar a notícia.');
  }
})();

(async () => {
  const article = document.getElementById('article');
  const related = document.getElementById('related');
  const relatedList = document.getElementById('related-list');
  const config = window.RADAR_SUPABASE || {};
  const slug = new URLSearchParams(location.search).get('id');

  const make = (tag, className, text) => {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (text !== undefined) el.textContent = text;
    return el;
  };

  const error = message => {
    article.replaceChildren();
    article.append(make('p', 'article-error', message));
  };

  if (!config.url || !config.anonKey || !slug ||
      !/^[a-z0-9-]+$/.test(slug)) {
    error('Notícia indisponível.');
    return;
  }

  const base = config.url.replace(/\/$/, '');
  const headers = {
    apikey: config.anonKey,
    Authorization: 'Bearer ' + config.anonKey,
    'Content-Type': 'application/json'
  };

  const formatDate = date => {
    const d = new Date(date + 'T12:00:00');
    return Number.isNaN(d.getTime())
      ? date
      : d.toLocaleDateString('pt-BR', {
          day: 'numeric', month: 'long', year: 'numeric'
        });
  };

  // Converte texto Markdown em elementos seguros, sem inserir HTML bruto.
  function renderInline(parent, text) {
    const pattern =
      /(\*\*[^*]+\*\*|\*[^*]+\*|`[^`]+`|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\))/g;

    let last = 0;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      parent.append(document.createTextNode(text.slice(last, match.index)));

      const token = match[0];
      let el;

      if (token.startsWith('**')) {
        el = make('strong', '', token.slice(2, -2));
      } else if (token.startsWith('*')) {
        el = make('em', '', token.slice(1, -1));
      } else if (token.startsWith('`')) {
        el = make('code', '', token.slice(1, -1));
      } else {
        el = make('a', '', match[2]);
        el.href = match[3];
        el.target = '_blank';
        el.rel = 'noopener noreferrer';
      }

      parent.append(el);
      last = pattern.lastIndex;
    }

    parent.append(document.createTextNode(text.slice(last)));
  }

  function renderMarkdown(container, source) {
    container.replaceChildren();

    const text = String(source || '')
      .replace(/\r\n?/g, '\n')
      .replace(/^\\(?=#{1,6}\s)/gm, '')
      .replace(/\\(?=\*\*)/g, '');

    const blocks = text.split(/\n\s*\n/);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (!block.trim()) continue;

      const heading = lines[0].match(/^(#{1,6})\s+(.+)$/);

      if (heading) {
        const level = Math.min(6, heading[1].length);
        const el = make('h' + level, 'article-body-heading');
        renderInline(el, heading[2]);
        container.append(el);

        for (const line of lines.slice(1)) {
          if (line.trim()) {
            const p = make('p');
            renderInline(p, line);
            container.append(p);
          }
        }
        continue;
      }

      if (lines.every(line => /^\s*[-*]\s+/.test(line))) {
        const list = make('ul');
        for (const line of lines) {
          const li = make('li');
          renderInline(li, line.replace(/^\s*[-*]\s+/, ''));
          list.append(li);
        }
        container.append(list);
        continue;
      }

      const p = make('p');
      lines.forEach((line, index) => {
        if (index) p.append(document.createElement('br'));
        renderInline(p, line);
      });
      container.append(p);
    }
  }

  try {
    const endpoint =
      base + '/rest/v1/news_articles?select=title,cat,date,summary,body,image_url,views' +
      '&status=eq.published&slug=eq.' + encodeURIComponent(slug) +
      '&limit=1';

    const response = await fetch(endpoint, { headers });
    if (!response.ok) throw Error('Não foi possível carregar a notícia.');

    const news = (await response.json())[0];
    if (!news) throw Error('Notícia não encontrada.');

    article.replaceChildren();

    const heading = make('div', 'article-heading');
    heading.append(make('span', 'article-category', news.cat || 'Notícias'));
    heading.append(make('h1', 'article-title', news.title || 'Sem título'));

    const meta = make('div', 'article-meta');
    meta.append(make('span', '', formatDate(news.date || '')));
    meta.append(make('span', 'meta-separator', '•'));
    meta.append(make(
      'span',
      'article-views',
      '◉ ' + Number(news.views || 0).toLocaleString('pt-BR') +
      ' visualizações'
    ));

    heading.append(meta);
    article.append(heading);

    if (news.image_url) {
      const figure = make('figure', 'article-figure');
      const img = make('img', 'article-cover');
      img.src = news.image_url;
      img.alt = 'Imagem de capa da matéria: ' + (news.title || '');
      img.loading = 'eager';
      figure.append(img);
      article.append(figure);
    }

    const content = make('div', 'article-content');

    if (news.summary) {
      const lead = make('p', 'article-lead');
      renderInline(lead, news.summary);
      content.append(lead);
    }

    const body = Array.isArray(news.body)
      ? news.body.join('\n\n')
      : String(news.body || '');

    renderMarkdown(content, body);
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
        'https://t.me/share/url?url=' + encodeURIComponent(pageUrl) +
        '&text=' + encodeURIComponent(title)],
      ['linkedin', 'LinkedIn',
        'https://www.linkedin.com/sharing/share-offsite/?url=' +
        encodeURIComponent(pageUrl)]
    ];

    const copyLink = async button => {
      try {
        await navigator.clipboard.writeText(pageUrl);
        button.title = 'Link copiado!';
        button.setAttribute('aria-label', 'Link copiado!');
      } catch (_) {
        window.prompt('Copie o link:', pageUrl);
      }
    };

    for (const [name, label, url] of destinations) {
      const button = make(url ? 'a' : 'button',
        'social-share social-' + name);

      button.title = name === 'instagram'
        ? 'Instagram: copiar link para compartilhar'
        : 'Compartilhar no ' + label;
      button.setAttribute('aria-label', button.title);

      const img = make('img');
      img.src = 'imagens/social/' + name + '.svg';
      img.alt = '';
      button.append(img);

      if (url) {
        button.href = url;
        button.target = '_blank';
        button.rel = 'noopener noreferrer';
      } else {
        button.type = 'button';
        button.addEventListener('click', async () => {
          if (navigator.share) {
            try {
              await navigator.share({ title, url: pageUrl });
              return;
            } catch (_) {}
          }
          await copyLink(button);
        });
      }

      buttons.append(button);
    }

    const copy = make('button', 'social-share social-copy');
    copy.type = 'button';
    copy.title = 'Copiar link';
    copy.setAttribute('aria-label', 'Copiar link');

    const copyImg = make('img');
    copyImg.src = 'imagens/social/link.svg';
    copyImg.alt = '';
    copy.append(copyImg);
    copy.addEventListener('click', () => copyLink(copy));

    buttons.append(copy);
    share.append(buttons);
    article.append(share);

    // SEO
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.content = (news.summary || news.title || '').slice(0, 155);
    }

    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.content = news.title || 'Radar Viral';

    const ogDescription =
      document.querySelector('meta[property="og:description"]');
    if (ogDescription) {
      ogDescription.content = news.summary || news.title || '';
    }

    const canonical = document.querySelector('link[rel="canonical"]');
    if (canonical && location.protocol.startsWith('http')) {
      canonical.href = location.href;
    }

    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && news.image_url) ogImage.content = news.image_url;

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
      publisher: { '@type': 'Organization', name: 'Radar Viral' }
    });
    document.head.append(ld);

    article.append(make('div', 'article-end', 'RADAR VIRAL'));
    document.title = (news.title || 'Notícia') + ' | Radar Viral';

    const crumb = document.getElementById('crumb-category');
    if (crumb) {
      const pages = {
        Tecnologia: 'tecnologia.html',
        Games: 'games.html',
        Entretenimento: 'entretenimento.html',
        Tendências: 'tendencias.html',
        Curiosidades: 'curiosidades.html'
      };

      const link = make('a', '', news.cat || 'Notícias');
      link.href = pages[news.cat] || 'index.html';
      crumb.replaceChildren(link);
    }

    // Registra visualização no Supabase.
    fetch(base + '/rest/v1/rpc/register_article_view', {
      method: 'POST',
      headers,
      body: JSON.stringify({ article_slug: slug })
    }).catch(() => {});

    // Notícias relacionadas
    if (relatedList) relatedList.replaceChildren();

    const relatedUrl =
      base + '/rest/v1/news_articles?select=slug,title,cat,image_url,date' +
      '&status=eq.published&slug=neq.' + encodeURIComponent(slug) +
      '&cat=eq.' + encodeURIComponent(news.cat || '') +
      '&order=date.desc&limit=3';

    let items = [];
    const relatedResponse = await fetch(relatedUrl, { headers });

    if (relatedResponse.ok) items = await relatedResponse.json();

    if (items.length < 3) {
      const fallbackUrl =
        base + '/rest/v1/news_articles?select=slug,title,cat,image_url,date' +
        '&status=eq.published&slug=neq.' + encodeURIComponent(slug) +
        '&order=date.desc&limit=6';

      const fallback = await fetch(fallbackUrl, { headers });

      if (fallback.ok) {
        const extra = await fallback.json();
        items = [...items,
          ...extra.filter(item => !items.some(existing =>
            existing.slug === item.slug))
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

    if (related && relatedList && relatedList.children.length) {
      related.hidden = false;
    }

  } catch (e) {
    console.error('Erro ao carregar notícia:', e);
    error(e.message || 'Não foi possível carregar a notícia.');
  }
})();
