/* ================================================================
   FORMULÁRIO DIAGNÓSTICO — Mateus Rucci
   Supabase + Google Sheets + GTM Events + Partial Saves + Geo
   ================================================================ */
(function () {
  'use strict';

  /* ── Configurações ──────────────────────────────────────────── */
  var SUPABASE_URL = 'https://mddfvarvwltbanbmzmao.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZGZ2YXJ2d2x0YmFuYm16bWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzQ2MjgsImV4cCI6MjA4NTcxMDYyOH0.64m8Ey1P4jLvDpvnkhMBz9iBEG-UfpXVCNksf4X-TM4';
  var GEO_ENDPOINT = './api-diagnostico.php';
  var SHEETS_HOOK  = 'COLE_AQUI_O_WEBHOOK_DO_APPS_SCRIPT'; // substitua quando tiver

  /* ── State ──────────────────────────────────────────────────── */
  var state = {
    sessionId:   null,
    recordId:    null,
    currentStep: 1,
    started:     false,
    geo:         {},
    answers: {
      investe_trafego:    '',
      valor_investimento: '',
      problemas:          [],
      instagram:          '',
      nome:               '',
      email:              '',
      telefone:           '',  // dígitos locais sem DDI
      ddi:                '55', // padrão Brasil
    },
  };

  /* ── UTMs, fbclid, gclid, referral ─────────────────────────── */
  var qs = new URLSearchParams(window.location.search);
  var tracking = {
    utm_source:      qs.get('utm_source')   || '',
    utm_campaign:    qs.get('utm_campaign') || '',
    utm_medium:      qs.get('utm_medium')   || '',
    utm_content:     qs.get('utm_content')  || '',
    utm_term:        qs.get('utm_term')     || '',
    fbclid:          qs.get('fbclid')       || '',
    gclid:           qs.get('gclid')        || '',
    referral_source: document.referrer      || '',
    pagina_origem:   window.location.href,
  };

  /* ── Data/hora Brasil (UTC-3) ───────────────────────────────── */
  function nowBRT() {
    var d = new Date(Date.now() - 3 * 60 * 60 * 1000);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }

  /* ── Session ID ─────────────────────────────────────────────── */
  function genSessionId() {
    var arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    return 'sess_' + Array.from(arr).map(function(b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  /* ── Lead score ─────────────────────────────────────────────── */
  var ALTO = [
    'De R$30.000 a R$50.000',
    'De R$50.000 a R$100.000',
    'De R$100.000 a R$300.000',
    '+de R$300.000',
  ];

  function calcScore() {
    if (state.answers.investe_trafego === 'Não') return 'desqualificado';
    if (ALTO.indexOf(state.answers.valor_investimento) !== -1) return 'qualificado';
    if (state.answers.valor_investimento) return 'medio';
    return '';
  }

  /* ── Sequência de passos (lógica condicional) ───────────────── */
  function sequence() {
    return state.answers.investe_trafego === 'Não'
      ? [1, 3, 4, 5]
      : [1, 2, 3, 4, 5];
  }
  function totalSteps() { return sequence().length; }
  function stepIndex()  { return sequence().indexOf(state.currentStep); }
  function nextStep()   { var s = sequence(); return s[stepIndex() + 1] !== undefined ? s[stepIndex() + 1] : null; }
  function prevStep()   { var s = sequence(); return s[stepIndex() - 1] !== undefined ? s[stepIndex() - 1] : null; }

  /* ── Geo server-side ────────────────────────────────────────── */
  var geoReady = fetch(GEO_ENDPOINT)
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(result) {
      if (!result || !result.geo) return;
      state.geo = {
        cidade: result.geo.cidade || '',
        estado: result.geo.estado || '',
        pais:   result.geo.pais || '',
      };
    })
    .catch(function(e) {
      console.warn('[Diag] Geo server-side falhou:', e);
    });

  function waitForGeo() {
    return Promise.race([
      geoReady,
      new Promise(function(resolve) { setTimeout(resolve, 1200); }),
    ]);
  }

  /* ── Supabase: insert simples ───────────────────────────────── */
  function sbInsert(data, retryWithoutDdi) {
    return fetch(SUPABASE_URL + '/rest/v1/diagnostico_leads', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer':         'return=minimal',
      },
      body: JSON.stringify(data),
    })
    .then(function(r) {
      if (!r.ok) {
        return r.text().then(function(t) {
          console.error('[Diag] INSERT falhou (' + r.status + '):', t);
          if (retryWithoutDdi !== false && t.indexOf('ddi') !== -1) {
            var fallback = Object.assign({}, data);
            delete fallback.ddi;
            console.warn('[Diag] Tentando salvar novamente sem a coluna ddi.');
            return sbInsert(fallback, false);
          }
          return null;
        });
      }
      console.log('[Diag] INSERT ok — session:', data.session_id);
      return data.session_id;
    })
    .catch(function(e) { console.error('[Diag] INSERT erro de rede:', e); return null; });
  }

  /* ── Supabase: upsert por session_id ────────────────────────── */
  function sbUpsert(data, retryWithoutDdi) {
    return fetch(SUPABASE_URL + '/rest/v1/diagnostico_leads?on_conflict=session_id', {
      method: 'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':         SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer':         'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(data),
    })
    .then(function(r) {
      if (!r.ok) {
        return r.text().then(function(t) {
          console.error('[Diag] UPSERT falhou (' + r.status + '):', t);
          if (t.indexOf('42P10') !== -1 || t.indexOf('no unique or exclusion constraint') !== -1) {
            console.warn('[Diag] session_id não é UNIQUE no Supabase. Fazendo fallback para INSERT.');
            return sbInsert(data, retryWithoutDdi);
          }
          if (retryWithoutDdi !== false && t.indexOf('ddi') !== -1) {
            var fallback = Object.assign({}, data);
            delete fallback.ddi;
            console.warn('[Diag] Tentando salvar novamente sem a coluna ddi.');
            return sbUpsert(fallback, false);
          }
          return null;
        });
      }
      console.log('[Diag] UPSERT ok — session:', data.session_id);
      return data.session_id;
    })
    .catch(function(e) { console.error('[Diag] UPSERT erro de rede:', e); return null; });
  }

  /* ── Google Sheets webhook ──────────────────────────────────── */
  function sendSheets(data) {
    if (!SHEETS_HOOK || SHEETS_HOOK.indexOf('COLE_AQUI') !== -1) return Promise.resolve();
    return fetch(SHEETS_HOOK, {
      method: 'POST',
      mode:   'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(function(e) { console.warn('[Diag] Sheets:', e); });
  }

  /* ── GTM dataLayer ──────────────────────────────────────────── */
  function gtm(event, extra) {
    window.dataLayer = window.dataLayer || [];
    var payload = { event: event, form_session_id: state.sessionId };
    Object.assign(payload, tracking, state.geo, extra || {});
    window.dataLayer.push(payload);
  }

  /* ── Montar payload completo ────────────────────────────────── */
  function buildPayload(partial, step) {
    var base = {
      session_id:         state.sessionId,
      investe_trafego:    state.answers.investe_trafego,
      valor_investimento: state.answers.valor_investimento,
      problemas:          state.answers.problemas,
      instagram:          normalizedInstagram(),
      nome:               normalizedName(),
      email:              normalizedEmail(),
      ddi:                normalizedDdi(),
      telefone:           normalizedPhone(),
      lead_score:         calcScore(),
      etapa_atual:        step || state.currentStep,
      parcial:            partial,
    };
    Object.assign(base, tracking, state.geo);
    return base;
  }

  /* ── Salvar snapshot parcial ────────────────────────────────── */
  function savePartial(step) {
    return waitForGeo().then(function() {
      return sbUpsert(buildPayload(true, step));
    }).then(function(id) {
      if (id) state.recordId = id;
      return id;
    });
  }

  function debounce(fn, delay) {
    var timer = null;
    return function() {
      clearTimeout(timer);
      timer = setTimeout(fn, delay);
    };
  }

  /* ── Submit final ───────────────────────────────────────────── */
  function submitForm() {
    var btn = document.querySelector('.diag-step[data-step="5"] .diag-btn-next');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }

    var score = calcScore();
    var payload = buildPayload(false, 5);
    payload.data_envio = nowBRT();

    return waitForGeo()
      .then(function() {
        payload = buildPayload(false, 5);
        payload.data_envio = nowBRT();
        return sbUpsert(payload);
      })
      .then(function() { return sendSheets(payload); })
      .then(function() {
        // GTM dataLayer
        gtm('form_complete', {
          lead_score:          score,
          nome:                normalizedName(),
          email:               normalizedEmail(),
          ddi:                 normalizedDdi(),
          telefone:            normalizedPhone(),
          telefone_local:      localPhoneDigits(),
          investe_trafego:     state.answers.investe_trafego,
          valor_investimento:  state.answers.valor_investimento,
          problemas:           state.answers.problemas.join(' | '),
          instagram:           normalizedInstagram(),
        });

        // Meta CAPI — evento Lead com todos os dados normalizados (E.164 sem +)
        if (typeof Tracker !== 'undefined') {
          var nameParts = normalizedName().split(' ');
          Tracker.track(
            'Lead',
            {
              content_name:       'Diagnostico Personalizado',
              lead_score:          score,
              valor_investimento:  state.answers.valor_investimento,
            },
            {
              email:       normalizedEmail(),
              phone:       normalizedPhone(),   // ex: "5511999999999"
              fn:          nameParts[0] || '',
              ln:          nameParts.slice(1).join(' ') || '',
              external_id: state.sessionId,
            }
          );
        }

        showThanks(score);
      })
      .catch(function(e) {
        console.error('[Diag] Submit final falhou:', e);
        showThanks(score);
      });
  }

  /* ── DOM refs ───────────────────────────────────────────────── */
  var modal    = document.getElementById('diagModal');
  var diagHdr  = document.getElementById('diagHeader');
  var progress = document.getElementById('diagProgress');
  var counter  = document.getElementById('diagCounter');
  var closeBtn = document.getElementById('diagClose');

  /* ── Abrir / fechar modal ───────────────────────────────────── */
  function openModal() {
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    showStep(1);
    gtm('form_begin', { lead_score: '' });
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  /* ── Atualizar barra de progresso ───────────────────────────── */
  function updateProgress() {
    var idx   = stepIndex() + 1;
    var total = totalSteps();
    counter.textContent  = idx + ' de ' + total;
    progress.style.width = ((idx / total) * 100) + '%';
  }

  /* ── Mostrar passo ──────────────────────────────────────────── */
  function showStep(n) {
    state.currentStep = n;
    document.querySelectorAll('.diag-step').forEach(function(el) {
      el.classList.remove('active');
    });
    var el = document.querySelector('.diag-step[data-step="' + n + '"]');
    if (el) el.classList.add('active');
    updateProgress();
    validateBtn(n);
    var m = document.querySelector('.diag-modal');
    if (m) m.scrollTop = 0;
  }

  /* ── Normalização do telefone (E.164 sem o +) ──────────────── */
  // Resultado: "5511999999999" — formato exigido pelo Meta Pixel
  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function normalizedDdi() {
    return onlyDigits(state.answers.ddi) || '55';
  }

  function localPhoneDigits() {
    return onlyDigits(state.answers.telefone);
  }

  function normalizedPhone() {
    var digits = localPhoneDigits();
    if (!digits) return '';
    return normalizedDdi() + digits;
  }

  function normalizedEmail() {
    return state.answers.email.trim().toLowerCase();
  }

  function normalizedName() {
    return state.answers.nome.trim().replace(/\s+/g, ' ');
  }

  function normalizedInstagram() {
    return state.answers.instagram.trim();
  }

  /* ── Cal.com lazy init (só carrega para leads qualificados) ─── */
  var calLoaded = false;

  function initCal() {
    if (calLoaded) return; // já inicializado
    calLoaded = true;

    // Padrão oficial Cal.com — carrega o embed.js do servidor próprio
    (function (C, A, L) {
      var p = function (a, ar) { a.q.push(ar); };
      var d = C.document;
      C.Cal = C.Cal || function () {
        var cal = C.Cal;
        var ar = arguments;
        if (!cal.loaded) {
          cal.ns = {}; cal.q = cal.q || [];
          d.head.appendChild(d.createElement('script')).src = A;
          cal.loaded = true;
        }
        if (ar[0] === L) {
          var api = function () { p(api, arguments); };
          var namespace = ar[1];
          api.q = api.q || [];
          if (typeof namespace === 'string') {
            cal.ns[namespace] = cal.ns[namespace] || api;
            p(cal.ns[namespace], ar);
            p(cal, ['initNamespace', namespace]);
          } else { p(cal, ar); }
          return;
        }
        p(cal, ar);
      };
    })(window, 'https://call.ruccia.com.br/embed/embed.js', 'init');

    Cal('init', 'diagnostico', { origin: 'https://call.ruccia.com.br' });

    Cal.ns.diagnostico('inline', {
      elementOrSelector: '#my-cal-inline-diagnostico',
      config: {
        layout: 'month_view',
        useSlotsViewOnSmallScreen: 'true',
        theme: 'light',
      },
      calLink: 'mateusrucci/diagnostico',
    });

    Cal.ns.diagnostico('ui', {
      theme: 'light',
      hideEventTypeDetails: false,
      layout: 'month_view',
    });
  }

  /* ── Mostrar tela de obrigado ───────────────────────────────── */
  function showThanks(score) {
    if (diagHdr) diagHdr.style.display = 'none';
    document.querySelectorAll('.diag-step').forEach(function(el) {
      el.classList.remove('active');
    });
    var el = document.querySelector('.diag-step[data-step="thanks-' + score + '"]');
    if (el) el.classList.add('active');

    // Só inicializa o Cal.com se for lead qualificado
    if (score === 'qualificado') {
      // Pequeno delay para a DOM estar visível antes do Cal medir o container
      setTimeout(initCal, 80);
    }
  }

  /* ── Validar botão Continuar ────────────────────────────────── */
  function validateBtn(step) {
    var btn = document.querySelector('.diag-step[data-step="' + step + '"] .diag-btn-next');
    if (!btn) return;
    var a  = state.answers;
    var ok = false;
    if (step === 1) ok = !!a.investe_trafego;
    else if (step === 2) ok = !!a.valor_investimento;
    else if (step === 3) ok = a.problemas.length > 0;
    else if (step === 4) ok = a.instagram.trim().length > 1;
    else if (step === 5) {
      var tel = localPhoneDigits();
      ok = !!(normalizedName() && normalizedEmail().indexOf('@') > 0 && tel.length >= 8);
    }
    btn.disabled = !ok;
  }

  /* ── Bind single-select ─────────────────────────────────────── */
  function bindSingle(stepEl, autoAdvance) {
    if (!stepEl) return;
    stepEl.querySelectorAll('.diag-option:not(.multi)').forEach(function(opt) {
      opt.addEventListener('click', function() {
        stepEl.querySelectorAll('.diag-option').forEach(function(o) {
          o.classList.remove('selected');
        });
        opt.classList.add('selected');
        var field = opt.dataset.field;
        state.answers[field] = opt.dataset.value;

        if (!state.started) {
          state.started   = true;
          state.sessionId = genSessionId();
          savePartial(state.currentStep);
        } else {
          savePartial(state.currentStep);
        }

        validateBtn(state.currentStep);

        if (autoAdvance) {
          var nxt = nextStep();
          if (nxt !== null) {
            setTimeout(function() { showStep(nxt); }, 260);
          }
        }
      });
    });
  }

  /* ── Bind multi-select ──────────────────────────────────────── */
  function bindMulti(stepEl) {
    if (!stepEl) return;
    stepEl.querySelectorAll('.diag-option.multi').forEach(function(opt) {
      opt.addEventListener('click', function() {
        var val = opt.dataset.value;
        opt.classList.toggle('selected');

        if (val === 'Outro') {
          var wrap = document.getElementById('outroWrap');
          if (wrap) wrap.classList.toggle('show', opt.classList.contains('selected'));
          if (!opt.classList.contains('selected')) {
            var inp = document.getElementById('outroInput');
            if (inp) inp.value = '';
            state.answers.problemas = state.answers.problemas.filter(function(p) {
              return p.indexOf('Outro') !== 0;
            });
          }
        } else {
          if (opt.classList.contains('selected')) {
            if (state.answers.problemas.indexOf(val) === -1) {
              state.answers.problemas.push(val);
            }
          } else {
            state.answers.problemas = state.answers.problemas.filter(function(p) {
              return p !== val;
            });
          }
        }
        validateBtn(3);
      });
    });

    var outroInput = document.getElementById('outroInput');
    if (outroInput) {
      outroInput.addEventListener('input', function() {
        state.answers.problemas = state.answers.problemas.filter(function(p) {
          return p.indexOf('Outro:') !== 0;
        });
        var v = outroInput.value.trim();
        if (v) state.answers.problemas.push('Outro: ' + v);
        validateBtn(3);
      });
    }
  }

  /* ── Init ───────────────────────────────────────────────────── */
  function init() {
    if (!modal) return;

    /* Abrir pelo atributo data-diag-open */
    document.querySelectorAll('[data-diag-open]').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        openModal();
      });
    });

    /* Fechar */
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) {
      if (e.target === modal) closeModal();
    });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeModal();
    });

    /* Bind options */
    bindSingle(document.querySelector('.diag-step[data-step="1"]'), true);  // auto-avança
    bindSingle(document.querySelector('.diag-step[data-step="2"]'), true);  // auto-avança
    bindMulti (document.querySelector('.diag-step[data-step="3"]'));

    /* Instagram */
    var instEl = document.getElementById('instagramInput');
    if (instEl) {
      instEl.addEventListener('input', function() {
        state.answers.instagram = instEl.value;
        validateBtn(4);
      });
    }

    /* DDI selector */
    var ddiEl = document.getElementById('ddiSelect');
    if (ddiEl) {
      // Atualiza placeholder do telefone conforme o país selecionado
      var phonePlaceholders = {
        '55': '(11) 99999-9999', '1': '(555) 555-5555',
        '351': '912 345 678',    '54': '11 1234-5678',
        '57': '312 345 6789',    '52': '55 1234 5678',
        '56': '9 1234 5678',     '34': '612 345 678',
        '44': '07700 900000',    '49': '0151 12345678',
      };
      ddiEl.addEventListener('change', function() {
        state.answers.ddi = ddiEl.value;
        var telEl = document.getElementById('telefoneInput');
        if (telEl) telEl.placeholder = phonePlaceholders[ddiEl.value] || 'Número';
        validateBtn(5);
        if (state.started && state.currentStep === 5) saveContactPartial();
      });
    }

    /* Contato */
    ['nomeInput', 'emailInput', 'telefoneInput'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function() {
        var map = { nomeInput: 'nome', emailInput: 'email', telefoneInput: 'telefone' };
        state.answers[map[id]] = el.value;
        validateBtn(5);
        if (state.started) saveContactPartial();
      });
    });

    /* Botões NEXT */
    document.querySelectorAll('.diag-btn-next').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var cur = parseInt(btn.dataset.cur, 10);
        if (cur === 3) savePartial(3);
        if (cur === 4) {
          var ig = document.getElementById('instagramInput');
          if (ig) state.answers.instagram = ig.value.trim();
          savePartial(4);
        }
        if (cur === 5) { submitForm(); return; }
        var nxt = nextStep();
        if (nxt !== null) showStep(nxt);
      });
    });

    /* Botões BACK */
    document.querySelectorAll('.diag-btn-back').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var prv = prevStep();
        if (prv !== null) showStep(prv);
      });
    });
  }

  var saveContactPartial = debounce(function() {
    if (state.started && state.currentStep === 5) savePartial(5);
  }, 700);

  /* Aguarda DOM pronto */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
