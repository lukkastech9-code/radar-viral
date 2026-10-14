/* Radar Viral V5 — gera arquivos locais sem servidor ou Python. */
(function(){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const datePt=s=>{const a=s.split('-');return a[2]+'/'+a[1]+'/'+a[0]};
function page(a){
 const notice=a.draft?'<p class="warning">ARTIGO DEMONSTRATIVO — conteúdo de teste, não uma notícia verificada.</p>':'';
 const body=a.body.map(p=>'<p>'+esc(p)+'</p>').join('\n');
 const tag=esc(a.cat.toUpperCase())+(a.draft?' • EXEMPLO':'');
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#101014"><title>${esc(a.title)} | Radar Viral</title><meta name="description" content="${esc(a.summary)}"><link rel="stylesheet" href="../style.css"><link rel="stylesheet" href="../paginas.css"></head><body><div class="topline"><div class="wrap topinside"><span>● RADAR AO VIVO <span class="muted">— descubra o que importa</span></span><span>RADAR VIRAL</span></div></div><header class="header"><div class="wrap headinner"><a href="../index.html" class="brand" aria-label="Radar Viral, início"><span class="brandmark">R<span class="pulse">●</span></span><span>RADAR<span class="red">VIRAL</span><small>INFORMAÇÃO EM MOVIMENTO</small></span></a><nav class="subnav"><a href="../index.html">← Voltar ao portal</a></nav></div></header><main class="wrap submain"><article class="subarticle"><span class="tag">${tag}</span><h1>${esc(a.title)}</h1><p class="lead">${esc(a.summary)}</p><time datetime="${esc(a.date)}">Publicado em ${datePt(a.date)}</time>${notice}${body}<a class="back" href="../index.html">← Voltar às notícias</a></article></main><footer><div class="wrap footinner"><div><strong>RADAR<span class="red">VIRAL</span></strong><p>O mundo em destaque.</p></div><div><a href="../sobre.html">Sobre</a><a href="../contato.html">Contato</a><a href="../privacidade.html">Privacidade</a></div><span>© ${new Date().getFullYear()} Radar Viral</span></div></footer></body></html>`;
}
function download(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),60000)}
const button=document.getElementById('generate');
button.addEventListener('click',async()=>{
 button.disabled=true;
 try{
  validate(data);
  if(typeof JSZip==='undefined')throw Error('Biblioteca ZIP não encontrada. Mantenha jszip.min.js na mesma pasta.');
  const zip=new JSZip();const dir=zip.folder('radar-viral');
  for(const [name,b64] of Object.entries(ARQUIVOS_BASE))dir.file(name,b64,{base64:true});
  dir.file('artigos.json',JSON.stringify(data,null,2));
  dir.file('content.js','const articles = '+JSON.stringify(data,null,2)+';\n');
  for(const article of data)dir.file('artigos/'+article.id+'.html',page(article));
  dir.file('editor-local.html',EDITOR_SOURCE);
  dir.file('jszip.min.js',Uint8Array.from(atob(JSZIP_BASE64),c=>c.charCodeAt(0)));
  dir.file('arquivos-base.js','const ARQUIVOS_BASE = '+JSON.stringify(ARQUIVOS_BASE)+';\nconst JSZIP_BASE64 = '+JSON.stringify(JSZIP_BASE64)+';\nconst EDITOR_SOURCE = '+JSON.stringify(EDITOR_SOURCE)+';\nconst GERADOR_SOURCE = '+JSON.stringify(GERADOR_SOURCE)+';\n');
  dir.file('gerador-v5.js',GERADOR_SOURCE);
  dir.file('LEIA-ME.txt','Radar Viral V5\n\nAbra index.html para ver o site.\nAbra editor-local.html para editar artigos.\nImporte artigos.json antes de editar.\nClique em Gerar site ZIP e extraia o novo ZIP.\nPara publicar, envie os arquivos da pasta radar-viral ao seu serviço de hospedagem.\nO editor-local.html e os arquivos auxiliares de edição são privados: NÃO os envie à hospedagem.\nSem Python, sem instalação.\n');
  document.getElementById('status').textContent='Gerando ZIP...';
  const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:5}});
  download(blob,'radar-viral-v5-atualizado.zip');
  document.getElementById('status').textContent='ZIP pronto! Extraia e abra radar-viral/index.html. A publicação online é manual.';
 }catch(err){document.getElementById('status').textContent='Erro: '+err.message}
 finally{button.disabled=false}
});
})();
