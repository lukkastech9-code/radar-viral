const SITE_URL = 'https://radar-viral-radar-viral-livid.vercel.app';
const SUPABASE_URL = 'https://zqisturuolabvvmuggbh.supabase.co';
const SUPABASE_PUBLIC_KEY = 'sb_publishable_iWegL7pqJ4hDf7gO-6GMgA_TGkMUb9_';
const staticPaths = [
  '/', '/sobre.html', '/contato.html', '/privacidade.html', '/termos.html',
  '/tecnologia.html', '/games.html', '/entretenimento.html', '/tendencias.html', '/curiosidades.html'
];
const xmlEscape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=3600');
  const urls = new Map();
  for (const path of staticPaths) urls.set(SITE_URL + path, '');
  try {
    const endpoint = SUPABASE_URL + '/rest/v1/news_articles?select=slug,date&status=eq.published&order=date.desc&limit=5000';
    const response = await fetch(endpoint, { headers: { apikey: SUPABASE_PUBLIC_KEY } });
    if (response.ok) {
      const rows = await response.json();
      for (const row of rows) {
        if (!row || typeof row.slug !== 'string' || !/^[a-z0-9-]+$/.test(row.slug)) continue;
        const lastmod = typeof row.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : '';
        urls.set(SITE_URL + '/noticia.html?id=' + encodeURIComponent(row.slug), lastmod);
      }
    }
  } catch (error) {
    // Retorna as páginas estáveis mesmo se o Supabase estiver temporariamente indisponível.
  }
  const body = '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    Array.from(urls.entries()).map(([loc, lastmod]) => '  <url><loc>' + xmlEscape(loc) + '</loc>' + (lastmod ? '<lastmod>' + lastmod + '</lastmod>' : '') + '</url>').join('\n') +
    '\n</urlset>';
  res.statusCode = 200;
  res.end(body);
};
