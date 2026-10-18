(()=>{'use strict';
const $=id=>document.getElementById(id);
const categories=['Tecnologia','Games','Entretenimento','Tendências','Curiosidades'];
const icons={'Tecnologia':'💻','Games':'🎮','Entretenimento':'🎬','Tendências':'🔥','Curiosidades':'✨'};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const link=a=>'noticia.html?id='+encodeURIComponent(a.slug);
const cover=a=>imageFor(a);
function card(a,main=false){return `<a class="spot-card ${main?'spot-main':''}" href="${link(a)}"><img src="${safe(cover(a))}" alt="" loading="${main?'eager':'lazy'}"><span class="spot-shade"></span><div class="spot-copy"><span class="tag">${safe(a.cat)}</span><h3>${safe(a.title)}</h3>${main?`<p>${safe(a.summary||'')}</p>`:''}<small>👁 ${Number(a.views||0).toLocaleString('pt-BR')} visualizações</small></div></a>`}
function draw(){const items=[...articles].sort((a,b)=>String(b.date).localeCompare(String(a.date)));const top=items.slice(0,3);$('spotlight-grid').innerHTML=top.length?top.map((a,i)=>card(a,i===0)).join(''):'<p class="empty">Os destaques aparecerão quando as primeiras matérias forem publicadas.</p>';
$('editorias-list').innerHTML=categories.map(cat=>{const group=items.filter(a=>a.cat===cat).slice(0,3);return `<section class="editoria"><div class="editoria-heading"><h3>${icons[cat]} ${safe(cat)}</h3><a href="${({Tecnologia:"tecnologia",Games:"games",Entretenimento:"entretenimento",Tendências:"tendencias",Curiosidades:"curiosidades"})[cat]}.html">Ver todas ↗</a></div>${group.length?group.map(a=>`<a href="${link(a)}" class="editoria-story"><img src="${safe(cover(a))}" alt="" loading="lazy"><span>${safe(a.title)}<small>${new Date(a.date+'T12:00:00').toLocaleDateString('pt-BR')}</small></span></a>`).join(''):'<p class="editoria-empty">Novidades em breve.</p>'}</section>`}).join('');}
window.renderV9=draw;
document.addEventListener('click',e=>{const b=e.target.closest('[data-editoria]');if(!b)return;const f=document.querySelector(`.chips [data-filter="${b.dataset.editoria}"]`);if(f){f.click();document.querySelector('.feed').scrollIntoView({behavior:'smooth'});}});
draw();})();