(function(){
  "use strict";
  var cfg=window.RADAR_ADSENSE_CONFIG||{};
  var slots=document.querySelectorAll("[data-rv-ad]");
  if(!cfg.publisherId || !/^ca-pub-\\d+$/.test(cfg.publisherId)){
    if(cfg.previewPlaceholders){
      slots.forEach(function(el){el.classList.add("is-preview");el.innerHTML='<span class="rv-ad-label">Publicidade</span><span>Espaço reservado para futura integração com o Google AdSense</span>';});
    }
    return;
  }
  var script=document.createElement("script");
  script.async=true;
  script.src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client="+encodeURIComponent(cfg.publisherId);
  script.crossOrigin="anonymous";
  script.onload=function(){
    slots.forEach(function(el){
      var key=el.getAttribute("data-rv-ad"), slotId=cfg.slots&&cfg.slots[key];
      if(!slotId)return;
      el.classList.remove("is-preview");
      el.innerHTML="";
      var ins=document.createElement("ins");
      ins.className="adsbygoogle"; ins.style.display="block";
      ins.setAttribute("data-ad-client",cfg.publisherId);
      ins.setAttribute("data-ad-slot",slotId);
      ins.setAttribute("data-ad-format","auto");
      ins.setAttribute("data-full-width-responsive","true");
      el.appendChild(ins);
      try{(window.adsbygoogle=window.adsbygoogle||[]).push({});}catch(e){}
    });
  };
  document.head.appendChild(script);
})();