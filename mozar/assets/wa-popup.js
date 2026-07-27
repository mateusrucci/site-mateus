(function () {
  'use strict';
  if (document.getElementById('wa-popup-overlay')) return;

  /* ── CSS ──────────────────────────────────────────────────────────────── */
  var style = document.createElement('style');
  style.textContent = [
    '.lead-overlay{position:fixed;inset:0;background:rgba(28,28,26,.72);backdrop-filter:blur(4px);z-index:9000;display:none;align-items:center;justify-content:center;padding:16px}',
    '.lead-overlay.open{display:flex;animation:_wapop-in .2s ease-out}',
    '@keyframes _wapop-in{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}',
    '.lead-modal{background:#fff;width:100%;max-width:470px;border-radius:20px;padding:30px 28px 28px;box-shadow:0 30px 90px rgba(0,0,0,.45);position:relative;max-height:94vh;overflow-y:auto}',
    '.lead-modal h3{font-size:1.7rem;line-height:1.15;color:#2A2A28;margin:0 0 6px}',
    '.lead-sub{font-size:1rem;color:#6b6b69;margin:0 0 18px}',
    '.lead-urgency{display:flex;align-items:center;gap:8px;background:rgba(201,169,110,.14);border:1px solid #C8A98A;border-radius:12px;padding:11px 14px;font-size:.95rem;font-weight:700;color:#8a6d45;margin-bottom:20px}',
    '.lead-field{margin-bottom:16px}',
    '.lead-field label{display:block;font-size:1rem;font-weight:700;color:#2A2A28;margin-bottom:7px}',
    '.lead-field input,.lead-field select{width:100%;font-size:1.15rem;padding:15px 16px;border:2px solid #d1d5db;border-radius:13px;background:#fff;color:#2A2A28;outline:none;transition:border-color .2s;-webkit-appearance:none;appearance:none;box-sizing:border-box}',
    '.lead-field input:focus,.lead-field select:focus{border-color:#C8A98A}',
    '.lead-field select{background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%232A2A28\' stroke-width=\'2\'%3E%3Cpath d=\'M6 9l6 6 6-6\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 16px center;padding-right:46px}',
    '.lead-submit{width:100%;font-size:1.18rem;font-weight:800;padding:17px;border:0;border-radius:13px;background:#C8A98A;color:#2A2A28;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:filter .2s;margin-top:4px}',
    '.lead-submit:hover{filter:brightness(1.05)}',
    '.lead-close{position:absolute;top:14px;right:16px;width:38px;height:38px;border-radius:9999px;border:0;background:#f1f5f9;color:#2A2A28;font-size:1.3rem;cursor:pointer;line-height:1}',
    '.lead-note{font-size:.82rem;color:#6b6b69;text-align:center;margin-top:14px}',
    'body.no-scroll{overflow:hidden}'
  ].join('');
  document.head.appendChild(style);

  /* ── HTML ─────────────────────────────────────────────────────────────── */
  var WA_ICON = '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>';

  var overlay = document.createElement('div');
  overlay.className = 'lead-overlay';
  overlay.id = 'wa-popup-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'wa-lead-title');
  overlay.innerHTML = [
    '<div class="lead-modal">',
      '<button type="button" class="lead-close" aria-label="Fechar">&times;</button>',
      '<h3 id="wa-lead-title">Agende sua avaliação</h3>',
      '<p class="lead-sub">Preencha e fale agora no WhatsApp com a nossa equipe.</p>',
      '<div class="lead-urgency">',
        '<span aria-hidden="true">🔥</span>',
        '<span>Atenção: <strong>restam apenas <span class="js-vagas-popup">7</span> vagas</strong> de avaliação esta semana</span>',
      '</div>',
      '<form id="wa-lead-form">',
        '<div class="lead-field">',
          '<label for="wa-lead-name">Seu nome</label>',
          '<input type="text" id="wa-lead-name" name="name" placeholder="Digite seu nome" autocomplete="name" required>',
        '</div>',
        '<div class="lead-field">',
          '<label for="wa-lead-phone">Seu WhatsApp</label>',
          '<input type="tel" id="wa-lead-phone" name="phone" placeholder="(45) 99999-9999" autocomplete="tel" inputmode="numeric" required>',
        '</div>',
        '<div class="lead-field">',
          '<label for="wa-lead-treatment">Tratamento desejado</label>',
          '<select id="wa-lead-treatment" name="treatment" required>',
            '<option value="" disabled selected>Selecione uma opção</option>',
            '<option value="Lentes em Cerâmica">Lentes em Cerâmica</option>',
            '<option value="Implantes Dentários">Implantes Dentários</option>',
            '<option value="Recuperação do Sorriso">Recuperação do Sorriso</option>',
            '<option value="Retratamento">Retratamento (refazer lentes)</option>',
            '<option value="Lentes em Resina">Lentes em Resina</option>',
            '<option value="Clareamento">Clareamento</option>',
            '<option value="Outro">Outro / Não sei ainda</option>',
          '</select>',
        '</div>',
        '<button type="submit" class="lead-submit">' + WA_ICON + ' Falar no WhatsApp</button>',
        '<p class="lead-note">Você fala com uma pessoa de verdade · Sem compromisso</p>',
      '</form>',
    '</div>'
  ].join('');
  document.body.appendChild(overlay);

  /* ── Vagas por dia ─────────────────────────────────────────────────────── */
  var vagasMap = {0:10,1:10,2:8,3:6,4:4,5:2,6:10};
  var vagasN = vagasMap[new Date().getDay()];
  document.querySelectorAll('.js-vagas-popup').forEach(function(el){ el.textContent = vagasN; });

  /* ── Hub de conversões ─────────────────────────────────────────────────── */
  var HUB = '/lead-hub.php';
  var _sent = false, _abnd = false;
  function _param(n){ var m=location.search.match(new RegExp('[?&]'+n+'=([^&#]*)')); return m?decodeURIComponent(m[1]):''; }
  function _cookie(n){ var m=document.cookie.match(new RegExp('(^| )'+n+'=([^;]+)')); return m?m[2]:''; }
  function _persist(){
    var a={}; try{ a=JSON.parse(localStorage.getItem('ota_attr')||'{}'); }catch(e){}
    ['fbclid','gclid','gbraid','wbraid','utm_source','utm_medium','utm_campaign','utm_term','utm_content'].forEach(function(k){ var v=_param(k); if(v) a[k]=v; });
    if(!a.landing) a.landing=location.href.split('#')[0];
    if(!('referrer' in a)) a.referrer=document.referrer||'';
    try{ localStorage.setItem('ota_attr',JSON.stringify(a)); }catch(e){}
    return a;
  }
  function _hubParams(){
    var a=_persist(), fbc=_cookie('_fbc');
    if(!fbc&&a.fbclid) fbc='fb.1.'+Date.now()+'.'+a.fbclid;
    return {fbclid:a.fbclid||'',fbp:_cookie('_fbp')||'',fbc:fbc||'',gclid:a.gclid||'',gbraid:a.gbraid||'',wbraid:a.wbraid||'',utm_source:a.utm_source||'',utm_medium:a.utm_medium||'',utm_campaign:a.utm_campaign||'',utm_term:a.utm_term||'',utm_content:a.utm_content||'',landing:a.landing||location.href,referrer:a.referrer||'',external_id:(window.Tracker&&Tracker.getExternalId)?Tracker.getExternalId():''};
  }
  function _hubSend(origem, dados, beacon){
    var payload=Object.assign({origem:origem},dados,_hubParams()), body=JSON.stringify(payload);
    try{
      if(beacon&&navigator.sendBeacon){ navigator.sendBeacon(HUB,new Blob([body],{type:'application/json'})); }
      else{ fetch(HUB,{method:'POST',headers:{'Content-Type':'application/json'},keepalive:true,body:body}); }
    }catch(e){}
  }
  function _abandon(){
    if(_sent||_abnd) return;
    var n=document.getElementById('wa-lead-name'), p=document.getElementById('wa-lead-phone'), t=document.getElementById('wa-lead-treatment');
    var nome=n?n.value.trim():'', tel=p?p.value.trim():'';
    if(!nome&&!tel) return;
    _abnd=true;
    _hubSend('Abandono de carrinho',{nome:nome,telefone:tel,tratamento:(t?t.value:'')},true);
  }
  document.addEventListener('visibilitychange',function(){ if(document.visibilityState==='hidden') _abandon(); });
  window.addEventListener('pagehide',_abandon);
  _persist();

  /* ── Popup open / close / submit ───────────────────────────────────────── */
  window.openLead = window.openLead || function(treatment){
    var ov = document.getElementById('wa-popup-overlay') || document.getElementById('leadOverlay');
    if (!ov) return;
    ov.classList.add('open');
    document.body.classList.add('no-scroll');
    if (treatment) {
      var sel = document.getElementById('wa-lead-treatment') || document.getElementById('leadTreatment');
      if (sel) { for (var i=0;i<sel.options.length;i++) { if (sel.options[i].value===treatment){ sel.value=treatment; break; } } }
    }
    if (window.Tracker) { Tracker.track('InitiateCheckout',{content_category:'avaliacao'}); }
    setTimeout(function(){ var el=document.getElementById('wa-lead-name'); if(el) el.focus(); },120);
  };

  window.closeLead = window.closeLead || function(){
    var ov = document.getElementById('wa-popup-overlay') || document.getElementById('leadOverlay');
    if (ov) ov.classList.remove('open');
    document.body.classList.remove('no-scroll');
  };

  /* Close on backdrop click */
  overlay.addEventListener('click', function(e){ if(e.target===overlay) window.closeLead(); });
  overlay.querySelector('.lead-close').addEventListener('click', window.closeLead);

  /* Form submit */
  document.getElementById('wa-lead-form').addEventListener('submit', function(e){
    e.preventDefault();
    var name = document.getElementById('wa-lead-name').value.trim();
    var phoneRaw = document.getElementById('wa-lead-phone').value.trim();
    var treatment = document.getElementById('wa-lead-treatment').value;
    if (!name || !phoneRaw || !treatment) return;

    var digits = phoneRaw.replace(/\D/g,'');
    if (digits.length <= 11) digits = '55' + digits;
    _sent = true;
    _hubSend('Lead enviado',{nome:name,telefone:digits,tratamento:treatment});

    var parts = name.split(/\s+/);
    if (window.Tracker) {
      Tracker.track('Lead',
        {content_name:treatment,content_category:'odontologia',currency:'BRL',value:0},
        {firstName:parts[0]||'',lastName:parts.slice(1).join(' ')||'',phone:digits}
      );
    }

    var assunto = treatment==='Outro' ? 'os tratamentos da OTA' : 'o tratamento de '+treatment;
    var msg = 'Olá, meu nome é '+name+' gostaria de saber mais sobre '+assunto+'.';
    var url = 'https://wa.me/5545991282260?text='+encodeURIComponent(msg);
    setTimeout(function(){ window.location.href = url; }, 350);
  });

  /* ── Intercept all wa.me anchor clicks ─────────────────────────────────── */
  document.addEventListener('click', function(e){
    var a = e.target.closest('a[href*="wa.me"]');
    if (!a) return;
    e.preventDefault();
    window.openLead();
  }, true);

  document.addEventListener('keydown', function(e){ if(e.key==='Escape') window.closeLead(); });
})();
