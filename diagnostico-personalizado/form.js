(function () {
  'use strict';

  var SUPABASE_URL = 'https://mddfvarvwltbanbmzmao.supabase.co';
  var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZGZ2YXJ2d2x0YmFuYm16bWFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMzQ2MjgsImV4cCI6MjA4NTcxMDYyOH0.64m8Ey1P4jLvDpvnkhMBz9iBEG-UfpXVCNksf4X-TM4';
  var GEO_ENDPOINT = '../api-diagnostico.php';

  var qs = new URLSearchParams(window.location.search);
  var tracking = {
    utm_source: qs.get('utm_source') || '',
    utm_campaign: qs.get('utm_campaign') || '',
    utm_medium: qs.get('utm_medium') || '',
    utm_content: qs.get('utm_content') || '',
    utm_term: qs.get('utm_term') || '',
    fbclid: qs.get('fbclid') || '',
    gclid: qs.get('gclid') || '',
    referral_source: document.referrer || '',
    pagina_origem: window.location.href,
  };

  var state = {
    sessionId: null,
    currentStep: 1,
    geo: {},
    saving: Promise.resolve(),
    contactSaveTimer: null,
    answers: {
      momento_atual: '',
      operacao_atual: '',
      faturamento_faixa: '',
      investimento_mensal_faixa: '',
      dores: [],
      meta_12_meses: '',
      nome: '',
      cargo: '',
      empresa: '',
      email: '',
      ddi: '55',
      telefone: '',
    },
  };

  var flow = document.getElementById('diagFlow');
  var progress = document.getElementById('diagProgress');
  var counter = document.getElementById('diagCounter');
  var resultBase = document.getElementById('diagResultBase');
  var resultQualified = document.getElementById('diagResultQualified');
  var modal = document.getElementById('diagModal');
  var modalClose = document.getElementById('diagModalClose');
  var baseFinalCta = document.getElementById('baseFinalCta');
  var qualifiedFinalCta = document.getElementById('qualifiedFinalCta');
  var totalSteps = 7;
  var INSTAGRAM_URL = 'https://www.instagram.com/mateusrucci/';
  var CAL_URL = 'https://call.ruccia.com.br/mateusrucci/diagnostico';

  var geoReady = fetch(GEO_ENDPOINT)
    .then(function(r) { return r.ok ? r.json() : null; })
    .then(function(result) {
      if (!result || !result.geo) return;
      state.geo = {
        cidade: result.geo.cidade || '',
        estado: result.geo.estado || '',
        pais: result.geo.pais || '',
      };
      window.__diagGeo = state.geo;
    })
    .catch(function() {});

  function waitForGeo() {
    return Promise.race([
      geoReady,
      new Promise(function(resolve) { setTimeout(resolve, 1200); }),
    ]);
  }

  function genSessionId() {
    var arr = new Uint8Array(12);
    crypto.getRandomValues(arr);
    return 'sess_' + Array.from(arr).map(function(b) {
      return b.toString(16).padStart(2, '0');
    }).join('');
  }

  function onlyDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function normalizedPhone() {
    var digits = onlyDigits(state.answers.telefone);
    if (!digits) return '';
    return onlyDigits(state.answers.ddi || '55') + digits;
  }

  function normalizedEmail() {
    return String(state.answers.email || '').trim().toLowerCase();
  }

  function normalizedName() {
    return String(state.answers.nome || '').trim().replace(/\s+/g, ' ');
  }

  function buildPayload(partial, step) {
    var diagnostic = inferResult();
    return {
      session_id: state.sessionId,
      momento_atual: state.answers.momento_atual,
      nome: normalizedName(),
      email: normalizedEmail(),
      telefone: normalizedPhone(),
      empresa: String(state.answers.empresa || '').trim(),
      cargo: String(state.answers.cargo || '').trim(),
      faturamento_faixa: state.answers.faturamento_faixa,
      investimento_mensal_faixa: state.answers.investimento_mensal_faixa,
      operacao_atual: state.answers.operacao_atual,
      clareza_metricas: inferClarityLevel(),
      dores: state.answers.dores,
      meta_12_meses: state.answers.meta_12_meses,
      urgencia: inferUrgency(),
      resultado_diagnostico: diagnostic.resultado,
      recomendacao_oferta: diagnostic.oferta,
      lead_score: shouldScheduleCall() ? 'qualificado' : 'base',
      parcial: partial,
      etapa_atual: step,
      utm_source: tracking.utm_source,
      utm_campaign: tracking.utm_campaign,
      utm_medium: tracking.utm_medium,
      utm_content: tracking.utm_content,
      utm_term: tracking.utm_term,
      fbclid: tracking.fbclid,
      gclid: tracking.gclid,
      referral_source: tracking.referral_source,
      pagina_origem: tracking.pagina_origem,
      cidade: state.geo.cidade || '',
      estado: state.geo.estado || '',
      pais: state.geo.pais || '',
    };
  }

  function inferUrgency() {
    var source = [
      state.answers.momento_atual,
      state.answers.meta_12_meses,
      state.answers.dores.join(' | ')
    ].join(' ').toLowerCase();
    if (/trav|depend|escala|reestruturar|internalizar|governan/.test(source)) return 'alta';
    if (/clareza|seguran/.test(source)) return 'media';
    return 'baixa';
  }

  function inferClarityLevel() {
    var source = [
      state.answers.momento_atual,
      state.answers.dores.join(' | ')
    ].join(' ').toLowerCase();
    if (/caixa-preta|cac|roi|previsibilidade/.test(source)) return 'baixa';
    if (/escala|depend/.test(source)) return 'media';
    return 'alta';
  }

  function shouldScheduleCall() {
    var investimento = state.answers.investimento_mensal_faixa || '';
    var faturamento = state.answers.faturamento_faixa || '';
    var investsEnough = /De R\$ 10 mil a R\$ 30 mil\/mês|De R\$ 30 mil a R\$ 100 mil\/mês|Acima de R\$ 100 mil\/mês/.test(investimento);
    var billsEnough = /De R\$ 500 mil a R\$ 3 milhões\/ano|De R\$ 3 milhões a R\$ 10 milhões\/ano|De R\$ 10 milhões a R\$ 50 milhões\/ano|Acima de R\$ 50 milhões\/ano/.test(faturamento);
    return investsEnough || billsEnough;
  }

  function inferResult() {
    var faturamento = state.answers.faturamento_faixa;
    var investimento = state.answers.investimento_mensal_faixa;
    var dores = state.answers.dores.join(' | ').toLowerCase();
    var operacao = state.answers.operacao_atual;
    var meta = state.answers.meta_12_meses || '';
    var contexto = [state.answers.momento_atual, operacao, meta, dores].join(' ').toLowerCase();
    var revenueScore = 0;
    var investmentScore = 0;
    var dependencyScore = 0;
    var governanceScore = 0;
    var positioningScore = 0;
    var teamScore = 0;

    if (/acima de r\$ 50 milhões|de r\$ 10 milhões a r\$ 50 milhões/.test(faturamento)) revenueScore = 4;
    else if (/de r\$ 3 milhões a r\$ 10 milhões/.test(faturamento)) revenueScore = 3;
    else if (/de r\$ 500 mil a r\$ 3 milhões/.test(faturamento)) revenueScore = 2;
    else revenueScore = 1;

    if (/acima de r\$ 100 mil|de r\$ 30 mil a r\$ 100 mil/.test(investimento)) investmentScore = 4;
    else if (/de r\$ 10 mil a r\$ 30 mil/.test(investimento)) investmentScore = 2;
    else if (/até r\$ 10 mil/.test(investimento)) investmentScore = 1;

    if (/depend|agência externa|freelancer|founder-led|sócio centraliza/.test(contexto)) dependencyScore = 3;
    if (/caixa-preta|cac|roi|previsibilidade|governan/.test(contexto)) governanceScore = 3;
    if (/mensagem|posicionamento|oferta/.test(contexto)) positioningScore = 2;
    if (/time interno|reestruturar um time interno|liderança forte/.test(contexto)) teamScore = 3;

    if (revenueScore >= 3 && investmentScore >= 4 && (dependencyScore >= 3 || teamScore >= 3)) {
      return { resultado: 'soberania_operacional_e_escala', oferta: 'implementacao_time_inhouse', qualificado: true };
    }

    if (revenueScore >= 2 && investmentScore >= 2 && (dependencyScore >= 3 || governanceScore >= 3 || positioningScore >= 2)) {
      return { resultado: 'governanca_e_clareza_de_escala', oferta: 'consultoria_estrategica', qualificado: true };
    }

    if (revenueScore >= 2) {
      return { resultado: 'clareza_e_lideranca_de_marketing', oferta: 'mentoria_individual', qualificado: false };
    }

    return { resultado: 'fundacao_antes_da_escala', oferta: 'direcionamento_estrategico', qualificado: false };
  }

  function getPrimaryPain() {
    var dores = state.answers.dores;
    if (!dores.length) return 'falta de clareza estrutural';
    if (dores.some(function(item) { return /cac|roi|previsibilidade/i.test(item); })) return 'falta de previsibilidade sobre CAC, ROI e decisão';
    if (dores.some(function(item) { return /dependência excessiva/i.test(item); })) return 'dependência operacional de terceiros';
    if (dores.some(function(item) { return /Escala travada/i.test(item); })) return 'escala travada apesar de haver verba e operação';
    if (dores.some(function(item) { return /Mensagem, posicionamento ou oferta/i.test(item); })) return 'posicionamento e oferta desalinhados com o ticket desejado';
    if (dores.some(function(item) { return /Time interno/i.test(item); })) return 'time atual sem nível ou liderança para sustentar a próxima fase';
    return dores[0].toLowerCase();
  }

  function getCurrentExposure() {
    var operacao = (state.answers.operacao_atual || '').toLowerCase();
    if (/agência externa/.test(operacao)) return 'A inteligência crítica da operação ainda está concentrada fora da empresa.';
    if (/freelancer/.test(operacao)) return 'A empresa tem execução pontual, mas ainda sem estrutura estável de decisão.';
    if (/time interno/.test(operacao)) return 'Já existe base interna, mas a liderança e a governança ainda não sustentam o próximo patamar.';
    if (/founder-led|sócio centraliza/.test(operacao)) return 'O crescimento ainda depende demais do founder, o que limita escala e previsibilidade.';
    return 'Há sinais de desalinhamento entre crescimento, decisão e estrutura operacional.';
  }

  function buildNarrative() {
    var result = inferResult();
    var primaryPain = getPrimaryPain();
    var exposure = getCurrentExposure();
    var ambition = (state.answers.meta_12_meses || '').toLowerCase();
    var revenue = state.answers.faturamento_faixa || 'uma faixa relevante de faturamento';
    var investment = state.answers.investimento_mensal_faixa || 'um nível relevante de investimento';
    var response = {
      qualified: shouldScheduleCall(),
      title: '',
      summary: '',
      blocks: []
    };

    if (result.oferta === 'implementacao_time_inhouse') {
      response.title = 'Sua empresa já está num ponto em que execução terceirizada começa a custar caro demais.';
      response.summary = 'Com ' + revenue.toLowerCase() + ' e ' + investment.toLowerCase() + ', o diagnóstico aponta uma empresa que já exige soberania operacional, governança e retenção de inteligência dentro de casa.';
      response.blocks = [
        'O gargalo principal hoje parece ser ' + primaryPain + '.',
        exposure,
        'A rota recomendada é implementação de time in-house, com desenho de estrutura, critérios de gestão e transição de dependência para patrimônio interno.',
        'Como existe fit claro entre estágio, verba e urgência, a agenda estratégica foi liberada para aprofundar a construção dessa operação.'
      ];
      return response;
    }

    if (result.oferta === 'consultoria_estrategica') {
      response.title = 'O seu cenário pede direção executiva antes de mais esforço operacional.';
      response.summary = 'A combinação entre ' + revenue.toLowerCase() + ', ' + investment.toLowerCase() + ' e os sintomas reportados indica uma empresa com potencial de escala, mas ainda sem clareza suficiente sobre onde ajustar a máquina.';
      response.blocks = [
        'O ponto mais sensível hoje parece ser ' + primaryPain + '.',
        exposure,
        'A rota recomendada é uma consultoria estratégica focada em posicionamento, aquisição, governança e soberania de marketing.',
        'Seu perfil foi qualificado para uma conversa direta, porque o problema já é de decisão e arquitetura, não de curiosidade tática.'
      ];
      return response;
    }

    if (result.oferta === 'mentoria_individual') {
      response.title = 'A prioridade agora parece ser elevar repertório, clareza e liderança da operação.';
      response.summary = 'Você já tem base para crescer, mas ainda não no ponto em que uma agenda estratégica pesada seja o melhor primeiro movimento. O maior ganho vem de melhorar leitura, decisão e comando sobre o marketing.';
      response.blocks = [
        'O gargalo mais claro hoje é ' + primaryPain + '.',
        'Sem consolidar essa camada de leitura, a tendência é continuar variando entre tentativa, dependência e pouca previsibilidade.',
        'A recomendação mais coerente é mentoria individual com foco em soberania, posicionamento e tomada de decisão.',
        ambition.indexOf('internalizar') !== -1 ? 'Antes de internalizar mais estrutura, faz sentido consolidar critério, linguagem e visão de liderança.' : 'O próximo passo é consolidar base estratégica antes de liberar uma agenda de prescrição mais profunda.'
      ];
      return response;
    }

    response.title = 'Antes de sofisticar a escala, a sua empresa precisa organizar a base certa.';
    response.summary = '';
    response.blocks = [
      'Hoje, o ponto de maior atrito parece ser ' + primaryPain + '.',
      'Pular essa etapa tende a transformar verba e esforço em ruído, não em patrimônio de aquisição.',
      'A rota mais coerente é um direcionamento estratégico inicial para alinhar posicionamento, estrutura e critério de decisão.',
      'Neste momento, a agenda estratégica não é liberada. Primeiro faz sentido organizar a base para depois aumentar a alavancagem.'
    ];
    return response;
  }

  function sbInsert(data) {
    return fetch(SUPABASE_URL + '/rest/v1/diagnostico_personalizado_leads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify(data),
    }).then(function(r) {
      if (!r.ok) {
        return r.text().then(function(t) {
          console.error('[DP] INSERT falhou (' + r.status + '):', t);
          return null;
        });
      }
      return data.session_id;
    }).catch(function() { return null; });
  }

  function sbUpsert(data) {
    return fetch(SUPABASE_URL + '/rest/v1/diagnostico_personalizado_leads?on_conflict=session_id', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': 'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(data),
    }).then(function(r) {
      if (!r.ok) {
        return r.text().then(function(t) {
          console.error('[DP] UPSERT falhou (' + r.status + '):', t);
          if (t.indexOf('42P10') !== -1 || t.indexOf('no unique or exclusion constraint') !== -1) {
            return sbInsert(data);
          }
          return null;
        });
      }
      return data.session_id;
    }).catch(function() { return null; });
  }

  function persistCurrent(step, partial) {
    if (!state.sessionId) return Promise.resolve(null);
    state.saving = state.saving.then(function() {
      return waitForGeo().then(function() {
        return sbUpsert(buildPayload(partial, step));
      });
    });
    return state.saving;
  }

  function updateProgress() {
    counter.textContent = state.currentStep + ' de ' + totalSteps;
    progress.style.width = ((state.currentStep / totalSteps) * 100) + '%';
  }

  function openModal() {
    if (!modal) return;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function goTo(url) {
    window.location.href = url;
  }

  function showStep(step) {
    state.currentStep = step;
    flow.querySelectorAll('.step').forEach(function(el) {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });
    updateProgress();
    validateCurrentStep();
  }

  function validateCurrentStep() {
    var step = state.currentStep;
    var canProceed = false;
    if (step === 1) canProceed = !!state.answers.momento_atual;
    if (step === 2) canProceed = !!state.answers.operacao_atual;
    if (step === 3) canProceed = state.answers.dores.length > 0;
    if (step === 4) canProceed = !!state.answers.meta_12_meses;
    if (step === 5) canProceed = !!state.answers.faturamento_faixa;
    if (step === 6) canProceed = !!state.answers.investimento_mensal_faixa;
    if (step === 7) {
      canProceed = !!(
        normalizedName() &&
        normalizedEmail().indexOf('@') > 0 &&
        normalizedPhone().length >= 10 &&
        String(state.answers.empresa || '').trim() &&
        String(state.answers.cargo || '').trim()
      );
    }
    var next = flow.querySelector('.step.active [data-next]');
    var submit = flow.querySelector('.step.active [data-submit]');
    if (next) next.disabled = !canProceed;
    if (submit) submit.disabled = !canProceed;
  }

  function bindSingle(field) {
    flow.querySelectorAll('.option[data-field="' + field + '"]:not(.multi)').forEach(function(opt) {
      opt.addEventListener('click', function() {
        var step = opt.closest('.step');
        step.querySelectorAll('.option[data-field="' + field + '"]').forEach(function(el) {
          el.classList.remove('selected');
        });
        opt.classList.add('selected');
        state.answers[field] = opt.dataset.value;
        if (!state.sessionId) state.sessionId = genSessionId();
        validateCurrentStep();
      });
    });
  }

  function bindMulti(field) {
    flow.querySelectorAll('.option.multi[data-field="' + field + '"]').forEach(function(opt) {
      opt.addEventListener('click', function() {
        var value = opt.dataset.value;
        opt.classList.toggle('selected');
        if (opt.classList.contains('selected')) {
          if (state.answers[field].indexOf(value) === -1) state.answers[field].push(value);
        } else {
          state.answers[field] = state.answers[field].filter(function(item) { return item !== value; });
        }
        if (!state.sessionId) state.sessionId = genSessionId();
        validateCurrentStep();
      });
    });
  }

  function showResult() {
    var narrative = buildNarrative();
    var qualified = narrative.qualified;
    var title = narrative.title;
    var summary = narrative.summary;
    var blocks = narrative.blocks;

    var target = qualified ? resultQualified : resultBase;
    var other = qualified ? resultBase : resultQualified;
    other.classList.remove('active');
    target.classList.add('active');
    flow.style.display = 'none';

    if (qualified) {
      document.getElementById('qualifiedTitle').textContent = title;
      document.getElementById('qualifiedSummary').textContent = summary;
      document.getElementById('qualifiedBlock1').textContent = blocks[0];
      document.getElementById('qualifiedBlock2').textContent = blocks[1];
      document.getElementById('qualifiedBlock3').textContent = blocks[2];
      document.getElementById('qualifiedBlock4').textContent = blocks[3];
    } else {
      document.getElementById('resultTitle').textContent = title;
      document.getElementById('resultSummary').textContent = summary;
      document.getElementById('resultBlock1').textContent = blocks[0];
      document.getElementById('resultBlock2').textContent = blocks[1];
      document.getElementById('resultBlock3').textContent = blocks[2];
      document.getElementById('resultBlock4').textContent = blocks[3];
    }
  }

  function nextStep() {
    if (state.currentStep < totalSteps) {
      persistCurrent(state.currentStep, true);
      showStep(state.currentStep + 1);
    }
  }

  function prevStep() {
    if (state.currentStep > 1) showStep(state.currentStep - 1);
  }

  function trackComplete() {
    if (typeof Tracker === 'undefined') return;
    var result = inferResult();
    var fullName = normalizedName().split(' ');
    Tracker.track('Lead', {
      form_type: 'diagnostico_personalizado',
      resultado_diagnostico: result.resultado,
      recomendacao_oferta: result.oferta,
      lead_score: shouldScheduleCall() ? 'qualificado' : 'base',
      faturamento_faixa: state.answers.faturamento_faixa,
      investimento_mensal_faixa: state.answers.investimento_mensal_faixa,
      cidade: state.geo.cidade || '',
      estado: state.geo.estado || '',
      pais: state.geo.pais || '',
    }, {
      email: normalizedEmail(),
      phone: normalizedPhone(),
      fn: fullName[0] || '',
      ln: fullName.slice(1).join(' ') || '',
      external_id: state.sessionId,
    });
  }

  function submit() {
    var btn = flow.querySelector('.step.active [data-submit]');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Gerando seu diagnóstico...';
    }

    waitForGeo()
      .then(function() {
        return state.saving;
      })
      .then(function() {
        var payload = buildPayload(false, 7);
        payload.data_envio = new Date().toISOString();
        return sbUpsert(payload);
      })
      .then(function() {
        trackComplete();
        showResult();
      })
      .catch(function() {
        showResult();
      });
  }

  function bindInputs() {
    var mapping = {
      diagNome: 'nome',
      diagCargo: 'cargo',
      diagEmpresa: 'empresa',
      diagEmail: 'email',
      diagTelefone: 'telefone',
    };
    Object.keys(mapping).forEach(function(id) {
      var el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', function() {
        state.answers[mapping[id]] = el.value;
        validateCurrentStep();
        if (state.currentStep === 7 && state.sessionId) {
          clearTimeout(state.contactSaveTimer);
          state.contactSaveTimer = setTimeout(function() {
            persistCurrent(7, true);
          }, 500);
        }
      });
    });

    var ddi = document.getElementById('diagDdi');
    if (ddi) {
      ddi.addEventListener('change', function() {
        state.answers.ddi = ddi.value;
        validateCurrentStep();
      });
    }
  }

  function init() {
    bindSingle('momento_atual');
    bindSingle('operacao_atual');
    bindSingle('faturamento_faixa');
    bindSingle('investimento_mensal_faixa');
    bindSingle('meta_12_meses');
    bindMulti('dores');
    bindInputs();
    updateProgress();

    document.querySelectorAll('[data-open-diagnostic]').forEach(function(btn) {
      btn.addEventListener('click', openModal);
    });
    document.querySelectorAll('[data-close-diagnostic]').forEach(function(btn) {
      btn.addEventListener('click', closeModal);
    });
    if (modalClose) modalClose.addEventListener('click', closeModal);
    if (baseFinalCta) baseFinalCta.addEventListener('click', function() { goTo(INSTAGRAM_URL); });
    if (qualifiedFinalCta) qualifiedFinalCta.addEventListener('click', function() { goTo(CAL_URL); });
    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape' && modal && modal.classList.contains('open')) closeModal();
    });

    flow.querySelectorAll('[data-next]').forEach(function(btn) {
      btn.addEventListener('click', nextStep);
    });
    flow.querySelectorAll('[data-back]').forEach(function(btn) {
      btn.addEventListener('click', prevStep);
    });
    var submitBtn = flow.querySelector('[data-submit]');
    if (submitBtn) submitBtn.addEventListener('click', submit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
