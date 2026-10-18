(()=>{'use strict';
const btn=document.getElementById('rv-enable-notifications');
const status=document.getElementById('rv-notify-status');
if(!btn||!status)return;
const say=t=>{status.textContent=t;status.setAttribute('aria-live','polite')};
const cfg=window.RADAR_PUSH_CONFIG||{};
function b64url(s){const pad='='.repeat((4-s.length%4)%4);const raw=atob((s+pad).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,c=>c.charCodeAt(0))}
function setState(){if(!('Notification'in window)){btn.disabled=true;say('Este navegador não oferece suporte a notificações.');return}if(Notification.permission==='granted'){btn.textContent='✓ Permissão de notificações ativada';say('Permissão concedida neste navegador.');}else if(Notification.permission==='denied'){btn.textContent='Notificações bloqueadas';say('O Chrome bloqueou as notificações. Permita-as nas configurações do site.');}}
btn.addEventListener('click',async()=>{
 btn.disabled=true;const old=btn.textContent;btn.textContent='Ativando…';
 try{
  if(!('Notification'in window)){say('Este navegador não oferece suporte a notificações.');return}
  if(!window.isSecureContext){say('Abra o Radar Viral pelo endereço HTTPS publicado para ativar notificações.');return}
  const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
  if(permission!=='granted'){say(permission==='denied'?'Permissão bloqueada. Altere a permissão de notificações nas configurações do Chrome.':'Você não concedeu permissão para notificações.');return}
  // A permissão do navegador é ativada independentemente da integração de envio push.
  btn.textContent='✓ Permissão ativada';
  if(!('serviceWorker'in navigator)||!('PushManager'in window)){say('Permissão ativada. Este navegador não oferece suporte ao recebimento de push.');return}
  const reg=await navigator.serviceWorker.register('./service-worker.js');
  if(!cfg.vapidPublicKey||!cfg.subscribeEndpoint){
   say('Permissão ativada neste navegador. O envio de push ainda depende de conectar o serviço de envio e a chave pública VAPID.');
   return;
  }
  let sub=await reg.pushManager.getSubscription();
  if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64url(cfg.vapidPublicKey)});
  const res=await fetch(cfg.subscribeEndpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(sub)});
  if(!res.ok)throw new Error('Falha ao registrar inscrição push (HTTP '+res.status+').');
  say('Push registrado neste navegador. Os avisos aparecerão quando o servidor enviar novas notícias.');btn.textContent='✓ Push ativado';
 }catch(e){console.error('Radar Viral notifications:',e);say('A permissão foi solicitada, mas não foi possível concluir o registro push. Verifique a conexão do serviço de envio.');if(Notification.permission!=='granted')btn.textContent=old;}
 finally{btn.disabled=false;}
});
setState();
})();