/* ================================================================
   FORMULÁRIO DIAGNÓSTICO — Mateus Rucci (v2 — ICP + método Ask)
   Supabase + Google Sheets + GTM Events + Partial Saves + Geo
   ================================================================ */
(function () {
  'use strict';

  /* ── Configurações ──────────────────────────────────────────── */
  var SUPABASE_URL = 'https://mddfvarvwltbanbmzmao.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZGZ2YXJ2d2x0YmFuYm16bWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzQ2MjgsImV4cCI6MjA4NTcxMDYyOH0.64m8Ey1P4jLvDpvnkhMBz9iBEG-UfpXVCNksf4X-TM4';
  var GEO_ENDPOINT = './api-diagnostico.php';
  var SHEETS_HOOK  = 'COLE_AQUI_O_WEBHOOK_DO_APPS_SCRIPT';

  /* ── State ──────────────────────────────────────────────────── */
  var state = {
    sessionId:   null,
    recordId:    null,
    currentStep: 1,
    started:     false,
    geo:         {},
    answers: {
      incomodo:           [],   // multi (reutiliza coluna "problemas" no Supabase)
      objetivo:           '',
      situacao_mkt:       '',
      tempo_empresa:      '',
      setor:              '',
      investe_trafego:    '',
      valor_investimento: '',
      faturamento:        '',
      intencao:           '',
      instagram:          '',
      nome:               '',
      email:              '',
      telefone:           '',
      ddi:                '55',
    },
  };

  var TOTAL_STEPS = 10;

  /* ── Labels (para renderização dinâmica do diagnóstico) ─────── */
  var LABELS = {
    faturamento: {
      'ate_25k':   'até R$ 25 mil/mês',
      '25_100k':   'R$ 25–100 mil/mês',
      '100_250k':  'R$ 100–250 mil/mês',
      '250k_1M':   'R$ 250 mil–1 milhão/mês',
      '1M_mais':   'acima de R$ 1 milhão/mês',
    },
    tempo_empresa: {
      'menos_1ano': 'menos de 1 ano',
      '1_3':        '1 a 3 anos',
      'mais_3':     'mais de 3 anos',
    },
  };

  function labelOf(field, value) {
    if (!value) return '—';
    var map = LABELS[field];
    if (map && map[value]) return map[value];
    return value;
  }

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

  function nowBRT() {
    var d = new Date(Date.now() - 3 * 60 * 60 * 1000);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }

  function genSessionId() {
    var arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    return 'sess_' + Array.from(arr).map(function(b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  /* ── Lead score (7 diagnósticos possíveis) ──────────────────── */
  var ALTO_VALOR = [
    'De R$30.000 a R$50.000',
    'De R$50.000 a R$100.000',
    'De R$100.000 a R$300.000',
    '+de R$300.000',
  ];
  var HIGH_FAT = ['250k_1M', '1M_mais'];
  var MID_FAT  = ['25_100k', '100_250k'];

  function calcScore() {
    var a = state.answers;

    // Hard gates (anti-ICP)
    if (a.setor === 'regulado') return 'diag_regulado';
    if (a.faturamento === 'ate_25k' && a.tempo_empresa === 'menos_1ano') return 'diag_pre_validado';

    var quer = a.intencao;
    var fatHigh = HIGH_FAT.indexOf(a.faturamento) !== -1;
    var fatMid  = MID_FAT.indexOf(a.faturamento) !== -1;
    var altoValor = ALTO_VALOR.indexOf(a.valor_investimento) !== -1;

    // Fits explícitos
    if (quer === 'implementacao' && (fatHigh || altoValor)) return 'diag_implementacao';
    if (quer === 'mentoria'      && (fatMid || fatHigh))    return 'diag_mentoria';
    if (quer === 'consultoria'   && a.faturamento !== 'ate_25k') return 'diag_consultoria';
    if (quer === 'indefinido'    && a.faturamento !== 'ate_25k') return 'diag_estrategica';

    // Porte insuficiente ou intenção não-casa com estrutura
    return 'diag_base';
  }

  function hasCal(score) {
    return score === 'diag_implementacao' ||
           score === 'diag_mentoria' ||
           score === 'diag_consultoria' ||
           score === 'diag_estrategica';
  }

  /* ── Sequência condicional ──────────────────────────────────── */
  function sequence() {
    var base = [1, 2, 3, 4, 5, 6];
    if (state.answers.investe_trafego === 'Sim') base.push(7);
    base.push(8, 9, 10);
    return base;
  }
  function totalSteps() { return sequence().length; }
  function stepIndex()  { return sequence().indexOf(state.currentStep); }
  function nextStep()   { var s = sequence(); return s[stepIndex() + 1] !== undefined ? s[stepIndex() + 1] : null; }
  function prevStep()   { var s = sequence(); return s[stepIndex() - 1] !== undefined ? s[stepIndex() - 1] : null; }

  /* ── Geo ────────────────────────────────────────────────────── */
  var geoReady = fetch(GEO_ENDPOINT)
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(result) {
      if (!result || !result.geo) return;
      state.geo = {
        cidade: result.geo.cidade || '',
        estado: result.geo.estado || '',
        pais:   result.geo.pais || '',
      };
      window.__diagGeo = state.geo;
    })
    .catch(function(e) { console.warn('[Diag] Geo server-side falhou:', e); });

  function waitForGeo() {
    return Promise.race([
      geoReady,
      new Promise(function(resolve) { setTimeout(resolve, 1200); }),
    ]);
  }

  /* ── Supabase ───────────────────────────────────────────────── */
  function sbInsert(data) {
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
          return null;
        });
      }
      console.log('[Diag] INSERT ok — session:', data.session_id);
      return data.session_id;
    })
    .catch(function(e) { console.error('[Diag] INSERT erro:', e); return null; });
  }

  function sbUpsert(data) {
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
          // Coluna desconhecida? tenta só com colunas legadas.
          if (r.status === 400 && /column .* does not exist|PGRST204/i.test(t)) {
            console.warn('[Diag] Fallback: enviando só colunas legadas.');
            return sbUpsert(legacyPayload(data));
          }
          if (t.indexOf('42P10') !== -1 || t.indexOf('no unique or exclusion constraint') !== -1) {
            return sbInsert(data);
          }
          return null;
        });
      }
      console.log('[Diag] UPSERT ok — session:', data.session_id);
      return data.session_id;
    })
    .catch(function(e) { console.error('[Diag] UPSERT erro:', e); return null; });
  }

  // Filtra apenas colunas já existentes no schema antigo (fallback caso o usuário ainda
  // não tenha rodado o ALTER TABLE com as novas colunas).
  function legacyPayload(full) {
    var keep = [
      'session_id','investe_trafego','valor_investimento','problemas',
      'instagram','nome','email','telefone','lead_score','etapa_atual','parcial',
      'utm_source','utm_campaign','utm_medium','utm_content','utm_term',
      'fbclid','gclid','referral_source','pagina_origem',
      'cidade','estado','pais','data_envio'
    ];
    var out = {};
    keep.forEach(function(k) { if (full[k] !== undefined) out[k] = full[k]; });
    return out;
  }

  /* ── Sheets + GTM ───────────────────────────────────────────── */
  function sendSheets(data) {
    if (!SHEETS_HOOK || SHEETS_HOOK.indexOf('COLE_AQUI') !== -1) return Promise.resolve();
    return fetch(SHEETS_HOOK, {
      method: 'POST', mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).catch(function(e) { console.warn('[Diag] Sheets:', e); });
  }

  function gtm(event, extra) {
    window.dataLayer = window.dataLayer || [];
    var payload = { event: event, form_session_id: state.sessionId };
    Object.assign(payload, tracking, state.geo, extra || {});
    window.dataLayer.push(payload);
  }

  /* ── Payload ────────────────────────────────────────────────── */
  function buildPayload(partial, step) {
    var a = state.answers;
    var base = {
      session_id:         state.sessionId,
      // Legado (colunas já existentes)
      investe_trafego:    a.investe_trafego,
      valor_investimento: a.valor_investimento,
      problemas:          a.incomodo, // reuso: array de incômodos
      instagram:          normalizedInstagram(),
      nome:               normalizedName(),
      email:              normalizedEmail(),
      telefone:           normalizedPhone(),
      lead_score:         calcScore(),
      etapa_atual:        step || state.currentStep,
      parcial:            partial,
      // Novas colunas (requer ALTER TABLE — ver README de deploy)
      objetivo:           a.objetivo,
      situacao_mkt:       a.situacao_mkt,
      tempo_empresa:      a.tempo_empresa,
      setor:              a.setor,
      faturamento:        a.faturamento,
      intencao:           a.intencao,
    };
    Object.assign(base, tracking, state.geo);
    return base;
  }

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

  /* ── Submit ─────────────────────────────────────────────────── */
  function submitForm() {
    var btn = document.querySelector('.diag-step[data-step="10"] .diag-btn-next');
    if (btn) { btn.disabled = true; btn.textContent = 'Gerando diagnóstico...'; }

    var score = calcScore();

    return waitForGeo()
      .then(function() {
        var payload = buildPayload(false, TOTAL_STEPS);
        payload.data_envio = nowBRT();
        return sbUpsert(payload).then(function() { return payload; });
      })
      .then(function(payload) { return sendSheets(payload); })
      .then(function() {
        gtm('form_complete', {
          lead_score:          score,
          nome:                normalizedName(),
          email:               normalizedEmail(),
          ddi:                 normalizedDdi(),
          telefone:            normalizedPhone(),
          telefone_local:      localPhoneDigits(),
          investe_trafego:     state.answers.investe_trafego,
          valor_investimento:  state.answers.valor_investimento,
          faturamento:         state.answers.faturamento,
          intencao:            state.answers.intencao,
          setor:               state.answers.setor,
          incomodo:            state.answers.incomodo.join(' | '),
          instagram:           normalizedInstagram(),
        });

        if (typeof Tracker !== 'undefined') {
          var nameParts = normalizedName().split(' ');
          Tracker.track(
            'Lead',
            {
              content_name:       'Diagnostico Personalizado',
              lead_score:          score,
              valor_investimento:  state.answers.valor_investimento,
              faturamento:         state.answers.faturamento,
              intencao:            state.answers.intencao,
              cidade:              state.geo.cidade || '',
              estado:              state.geo.estado || '',
              pais:                state.geo.pais || '',
            },
            {
              email:       normalizedEmail(),
              phone:       normalizedPhone(),
              fn:          nameParts[0] || '',
              ln:          nameParts.slice(1).join(' ') || '',
              external_id: state.sessionId,
            }
          );
        }

        showThanks(score);
      })
      .catch(function(e) {
        console.error('[Diag] Submit falhou:', e);
        showThanks(score);
      });
  }

  /* ── DOM refs ───────────────────────────────────────────────── */
  var modal    = document.getElementById('diagModal');
  var diagHdr  = document.getElementById('diagHeader');
  var progress = document.getElementById('diagProgress');
  var counter  = document.getElementById('diagCounter');
  var closeBtn = document.getElementById('diagClose');

  function openModal() {
    modal.removeAttribute('hidden');
    document.body.style.overflow = 'hidden';
    if (diagHdr) diagHdr.style.display = '';
    showStep(1);
    gtm('form_begin', { lead_score: '' });
  }

  function closeModal() {
    modal.setAttribute('hidden', '');
    document.body.style.overflow = '';
  }

  function updateProgress() {
    var idx   = stepIndex() + 1;
    var total = totalSteps();
    counter.textContent  = idx + ' de ' + total;
    progress.style.width = ((idx / total) * 100) + '%';
  }

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

  /* ── Normalização ───────────────────────────────────────────── */
  function onlyDigits(v) { return String(v || '').replace(/\D/g, ''); }
  function normalizedDdi()    { return onlyDigits(state.answers.ddi) || '55'; }
  function localPhoneDigits() { return onlyDigits(state.answers.telefone); }
  function normalizedPhone()  {
    var d = localPhoneDigits();
    return d ? normalizedDdi() + d : '';
  }
  function normalizedEmail() { return state.answers.email.trim().toLowerCase(); }
  function normalizedName()  { return state.answers.nome.trim().replace(/\s+/g, ' '); }
  function normalizedInstagram() { return state.answers.instagram.trim(); }

  /* ── Cal.com (um embed por score) ───────────────────────────── */
  var calLoaded = {};

  function initCal(score) {
    if (calLoaded[score]) return;
    calLoaded[score] = true;

    var namespace = score; // ex: "diag_mentoria"
    var selector  = '#my-cal-inline-' + score;

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
          var ns = ar[1];
          api.q = api.q || [];
          if (typeof ns === 'string') {
            cal.ns[ns] = cal.ns[ns] || api;
            p(cal.ns[ns], ar);
            p(cal, ['initNamespace', ns]);
          } else { p(cal, ar); }
          return;
        }
        p(cal, ar);
      };
    })(window, 'https://call.ruccia.com.br/embed/embed.js', 'init');

    Cal('init', namespace, { origin: 'https://call.ruccia.com.br' });

    Cal.ns[namespace]('inline', {
      elementOrSelector: selector,
      config: { layout: 'month_view', useSlotsViewOnSmallScreen: 'true', theme: 'light' },
      calLink: 'mateusrucci/diagnostico',
    });

    Cal.ns[namespace]('ui', {
      theme: 'light',
      hideEventTypeDetails: false,
      layout: 'month_view',
    });
  }

  /* ── Render dinâmico da tela de resultado ───────────────────── */
  function renderThanks(score) {
    var el = document.querySelector('.diag-step[data-step="thanks-' + score + '"]');
    if (!el) return;
    var a = state.answers;

    var fills = {
      faturamento:   labelOf('faturamento', a.faturamento),
      tempo_empresa: labelOf('tempo_empresa', a.tempo_empresa),
      situacao_mkt:  a.situacao_mkt || '—',
      objetivo:      a.objetivo || '—',
      incomodo:      (a.incomodo && a.incomodo.length) ? a.incomodo.join(' · ') : '—',
      setor:         a.setor || '—',
    };

    el.querySelectorAll('[data-fill]').forEach(function(node) {
      var key = node.getAttribute('data-fill');
      if (fills[key] !== undefined) node.textContent = fills[key];
    });
  }

  function showThanks(score) {
    if (diagHdr) diagHdr.style.display = 'none';
    document.querySelectorAll('.diag-step').forEach(function(el) {
      el.classList.remove('active');
    });
    renderThanks(score);
    var el = document.querySelector('.diag-step[data-step="thanks-' + score + '"]');
    if (el) el.classList.add('active');

    if (hasCal(score)) setTimeout(function() { initCal(score); }, 80);
  }

  /* ── Validação dos botões Continuar ─────────────────────────── */
  function validateBtn(step) {
    var btn = document.querySelector('.diag-step[data-step="' + step + '"] .diag-btn-next');
    if (!btn) return;
    var a  = state.answers;
    var ok = false;
    switch (step) {
      case 1:  ok = a.incomodo.length > 0; break;
      case 2:  ok = !!a.objetivo; break;
      case 3:  ok = !!a.situacao_mkt; break;
      case 4:  ok = !!a.tempo_empresa; break;
      case 5:  ok = !!a.setor; break;
      case 6:  ok = !!a.investe_trafego; break;
      case 7:  ok = !!a.valor_investimento; break;
      case 8:  ok = !!a.faturamento; break;
      case 9:  ok = !!a.intencao; break;
      case 10:
        var tel = localPhoneDigits();
        ok = !!(a.instagram.trim().length > 1 &&
                normalizedName() &&
                normalizedEmail().indexOf('@') > 0 &&
                tel.length >= 8);
        break;
    }
    btn.disabled = !ok;
  }

  /* ── Bind single-select genérico ────────────────────────────── */
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
        ensureStarted();
        savePartial(state.currentStep);
        validateBtn(state.currentStep);
        if (autoAdvance) {
          var nxt = nextStep();
          if (nxt !== null) setTimeout(function() { showStep(nxt); }, 260);
        }
      });
    });
  }

  /* ── Bind multi-select (campo "incomodo", reusa componente) ── */
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
            state.answers.incomodo = state.answers.incomodo.filter(function(p) {
              return p.indexOf('Outro') !== 0;
            });
          }
        } else {
          if (opt.classList.contains('selected')) {
            if (state.answers.incomodo.indexOf(val) === -1) {
              state.answers.incomodo.push(val);
            }
          } else {
            state.answers.incomodo = state.answers.incomodo.filter(function(p) {
              return p !== val;
            });
          }
        }
        ensureStarted();
        validateBtn(1);
      });
    });

    var outroInput = document.getElementById('outroInput');
    if (outroInput) {
      outroInput.addEventListener('input', function() {
        state.answers.incomodo = state.answers.incomodo.filter(function(p) {
          return p.indexOf('Outro:') !== 0;
        });
        var v = outroInput.value.trim();
        if (v) state.answers.incomodo.push('Outro: ' + v);
        validateBtn(1);
      });
    }
  }

  function ensureStarted() {
    if (!state.started) {
      state.started   = true;
      state.sessionId = genSessionId();
    }
  }

  /* ── Init ───────────────────────────────────────────────────── */
  function init() {
    if (!modal) return;

    document.querySelectorAll('[data-diag-open]').forEach(function(btn) {
      btn.addEventListener('click', function(e) { e.preventDefault(); openModal(); });
    });

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', function(e) { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', function(e) { if (e.key === 'Escape') closeModal(); });

    // Step 1 — multi (incômodo)
    bindMulti (document.querySelector('.diag-step[data-step="1"]'));
    // Steps 2, 3, 5, 8, 9 — single (Continuar manual)
    bindSingle(document.querySelector('.diag-step[data-step="2"]'),  false);
    bindSingle(document.querySelector('.diag-step[data-step="3"]'),  false);
    bindSingle(document.querySelector('.diag-step[data-step="5"]'),  false);
    bindSingle(document.querySelector('.diag-step[data-step="8"]'),  false);
    bindSingle(document.querySelector('.diag-step[data-step="9"]'),  false);
    // Steps 4, 6, 7 — single auto-advance (respostas curtas/binárias)
    bindSingle(document.querySelector('.diag-step[data-step="4"]'),  true);
    bindSingle(document.querySelector('.diag-step[data-step="6"]'),  true);
    bindSingle(document.querySelector('.diag-step[data-step="7"]'),  true);

    /* Instagram + Contato (step 10) */
    var instEl = document.getElementById('instagramInput');
    if (instEl) {
      instEl.addEventListener('input', function() {
        state.answers.instagram = instEl.value;
        validateBtn(10);
        if (state.started) saveContactPartial();
      });
    }

    var ddiEl = document.getElementById('ddiSelect');
    if (ddiEl) {
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
        validateBtn(10);
        if (state.started && state.currentStep === 10) saveContactPartial();
      });
    }

    ['nomeInput', 'emailInput', 'telefoneInput'].forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function() {
        var map = { nomeInput: 'nome', emailInput: 'email', telefoneInput: 'telefone' };
        state.answers[map[id]] = el.value;
        validateBtn(10);
        if (state.started) saveContactPartial();
      });
    });

    /* Botões NEXT — salva parcial em transições sensíveis e submete no final */
    document.querySelectorAll('.diag-btn-next').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var cur = parseInt(btn.dataset.cur, 10);
        // Salva parcial ao avançar da etapa atual (exceto auto-advance já salvos em bindSingle)
        if ([1, 2, 3, 5, 8, 9].indexOf(cur) !== -1) {
          ensureStarted();
          savePartial(cur);
        }
        if (cur === 10) { submitForm(); return; }
        var nxt = nextStep();
        if (nxt !== null) showStep(nxt);
      });
    });

    document.querySelectorAll('.diag-btn-back').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var prv = prevStep();
        if (prv !== null) showStep(prv);
      });
    });
  }

  var saveContactPartial = debounce(function() {
    if (state.started && state.currentStep === 10) savePartial(10);
  }, 700);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
