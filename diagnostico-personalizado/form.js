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
    autoAdvanceTimer: null,
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
  var totalSteps = 7;

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
    if (/depend|trav|controle pra dentro|time interno|escala investimento|resultado não acompanhou|resultado não cresce/.test(source)) return 'alta';
    if (/clareza|dados|rastrear|lead/.test(source)) return 'media';
    return 'baixa';
  }

  function inferClarityLevel() {
    var source = [
      state.answers.momento_atual,
      state.answers.dores.join(' | ')
    ].join(' ').toLowerCase();
    if (/rastrear|venda|roi|dados|lead/.test(source)) return 'baixa';
    if (/escala|depend|sou eu quem puxa tudo/.test(source)) return 'media';
    return 'alta';
  }

  function shouldScheduleCall() {
    var investimento = state.answers.investimento_mensal_faixa || '';
    var faturamento = state.answers.faturamento_faixa || '';
    var investsEnough = /De R\$ 10 mil a R\$ 30 mil\/mês|De R\$ 30 mil a R\$ 100 mil\/mês|Acima de R\$ 100 mil\/mês/.test(investimento);
    var billsEnough = /De R\$ 100 mil a R\$ 500 mil\/ano|De R\$ 500 mil a R\$ 3 milhões\/ano|De R\$ 3 milhões a R\$ 10 milhões\/ano|De R\$ 10 milhões a R\$ 50 milhões\/ano|Acima de R\$ 50 milhões\/ano/.test(faturamento);
    return investsEnough && billsEnough;
  }

  function inferResult() {
    if (!shouldScheduleCall()) {
      return { resultado: 'base_antes_da_escala', oferta: 'direcionamento_estrategico', qualificado: false };
    }

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
    else if (/de r\$ 100 mil a r\$ 500 mil/.test(faturamento)) revenueScore = 1;
    else revenueScore = 0;

    if (/acima de r\$ 100 mil|de r\$ 30 mil a r\$ 100 mil/.test(investimento)) investmentScore = 4;
    else if (/de r\$ 10 mil a r\$ 30 mil/.test(investimento)) investmentScore = 2;
    else if (/até r\$ 10 mil/.test(investimento)) investmentScore = 1;

    if (/depend|agência externa|freelancer|gestor contratado sozinho|torço pra dar certo|sou eu quem puxa tudo|controle pra dentro/.test(contexto)) dependencyScore = 3;
    if (/rastrear o que virou venda|roi|dados|lead\. não entra venda|resultado não cresce|resultado não acompanhou/.test(contexto)) governanceScore = 3;
    if (/entra lead\. não entra venda|funil/.test(contexto)) positioningScore = 2;
    if (/time interno|reestruturar um time interno|meu time atual/.test(contexto)) teamScore = 3;

    if (/controle pra dentro|time interno forte/.test(contexto) || ((dependencyScore >= 3 || teamScore >= 3) && (revenueScore >= 2 || investmentScore >= 2))) {
      return { resultado: 'controle_interno_e_escala', oferta: 'implementacao_time_inhouse', qualificado: true };
    }

    if (/escalar investimento/.test(contexto) || governanceScore >= 3 || positioningScore >= 2) {
      return { resultado: 'clareza_para_destravar_escala', oferta: 'consultoria_estrategica', qualificado: true };
    }

    return { resultado: 'clareza_e_lideranca_de_marketing', oferta: 'mentoria_individual', qualificado: true };
  }

  function getPrimaryPain() {
    var dores = state.answers.dores;
    if (!dores.length) return 'falta de clareza estrutural';
    if (dores.some(function(item) { return /rastrear o que virou venda/i.test(item); })) return 'ninguém consegue rastrear com clareza o que virou venda';
    if (dores.some(function(item) { return /dependo de agência/i.test(item); })) return 'o crescimento ainda depende de terceiros';
    if (dores.some(function(item) { return /verba aumenta mas o resultado não cresce junto/i.test(item); })) return 'a verba sobe, mas o retorno não acompanha';
    if (dores.some(function(item) { return /entra lead\. não entra venda/i.test(item); })) return 'entra lead, mas a venda não acontece na mesma proporção';
    if (dores.some(function(item) { return /meu time atual/i.test(item); })) return 'o time atual não sustenta o nível que a empresa precisa';
    return dores[0].toLowerCase();
  }

  function getCurrentExposure() {
    var operacao = (state.answers.operacao_atual || '').toLowerCase();
    if (/agência externa/.test(operacao)) return 'Hoje a execução está fora da empresa e o aprendizado vai embora junto com o fornecedor.';
    if (/freelancer/.test(operacao)) return 'Existe execução pontual, mas ainda sem processo estável, critério e continuidade.';
    if (/time interno/.test(operacao)) return 'Já existe base interna, mas falta direção técnica para o time operar no próximo nível.';
    if (/sou eu quem puxa tudo/.test(operacao)) return 'O marketing ainda depende demais da sua presença para avançar.';
    return 'Há sinais de desalinhamento entre crescimento, decisão e estrutura operacional.';
  }

  function getQualificationInvite() {
    var investimento = state.answers.investimento_mensal_faixa || '';
    var faturamento = state.answers.faturamento_faixa || '';
    var investsEnough = /De R\$ 10 mil a R\$ 30 mil\/mês|De R\$ 30 mil a R\$ 100 mil\/mês|Acima de R\$ 100 mil\/mês/.test(investimento);
    var billsEnough = /De R\$ 100 mil a R\$ 500 mil\/ano|De R\$ 500 mil a R\$ 3 milhões\/ano|De R\$ 3 milhões a R\$ 10 milhões\/ano|De R\$ 10 milhões a R\$ 50 milhões\/ano|Acima de R\$ 50 milhões\/ano/.test(faturamento);

    if (investsEnough && billsEnough) {
      return 'Você bateu os critérios de entrada para essa conversa: investimento acima de R$ 10 mil/mês e faturamento acima de R$ 100 mil/ano.';
    }
    if (investsEnough) {
      return 'Você bateu pelo menos um dos critérios de entrada para essa conversa: investimento acima de R$ 10 mil/mês.';
    }
    if (billsEnough) {
      return 'Você bateu pelo menos um dos critérios de entrada para essa conversa: faturamento acima de R$ 100 mil/ano.';
    }
    return 'Quando sua operação avançar mais um pouco, esse convite passa a fazer mais sentido.';
  }

  function buildNarrative() {
    var result = inferResult();
    var primaryPain = getPrimaryPain();
    var exposure = getCurrentExposure();
    var canSchedule = shouldScheduleCall();
    var qualificationInvite = getQualificationInvite();
    var response = {
      qualified: canSchedule,
      title: '',
      summary: '',
      blocks: [],
      note: '',
      ctaText: '',
      ctaUrl: ''
    };

    if (result.oferta === 'implementacao_time_inhouse' && canSchedule) {
      response.title = 'Seu diagnóstico está pronto.';
      response.summary = 'O seu cenário aponta para Implementação de Time Interno: hoje a operação já pede mais controle, processo e capacidade dentro da empresa.';
      response.blocks = [
        primaryPain + '. ' + exposure,
        'A Implementação instala gestor, processo, atribuição e acompanhamento por 90 dias para tirar a operação da dependência e colocar controle dentro da empresa.',
        qualificationInvite + ' Se quiser, eu analiso sua operação ao vivo e te digo se entra no próximo ciclo.'
      ];
      response.note = '30 minutos. Análise ao vivo da sua operação. Sem deck, sem SDR.';
      response.ctaText = 'Conversar com o Mateus →';
      response.ctaUrl = 'https://call.ruccia.com.br/mateusrucci/diagnostico';
      return response;
    }

    if (result.oferta === 'consultoria_estrategica' && canSchedule) {
      response.title = 'Seu diagnóstico está pronto.';
      response.summary = 'O seu cenário aponta para Consultoria Estratégica: existe potencial de crescimento, mas hoje falta direção mais precisa sobre o que corrigir primeiro.';
      response.blocks = [
        primaryPain + '. ' + exposure,
        'Na Consultoria eu entro para revisar aquisição, funil, oferta, processo e decisões críticas para destravar crescimento com direção clara.',
        qualificationInvite + ' Se fizer sentido, eu entro na sua operação por 30 minutos e te digo o que faz sentido atacar primeiro.'
      ];
      response.note = '30 minutos. Conversa direta sobre o que precisa ser atacado primeiro.';
      response.ctaText = 'Conversar 30 min comigo →';
      response.ctaUrl = 'https://call.ruccia.com.br/mateusrucci/diagnostico';
      return response;
    }

    if (result.oferta === 'mentoria_individual' && canSchedule) {
      response.title = 'Seu diagnóstico está pronto.';
      response.summary = 'O seu cenário aponta para Mentoria Individual: agora o principal ganho está em organizar a leitura da operação e assumir o controle das decisões de marketing.';
      response.blocks = [
        primaryPain + '. ' + exposure,
        'O que precisa ser feito agora é organizar a leitura da operação e assumir o controle das decisões de marketing sem depender de terceiros para pensar por você.',
        qualificationInvite + ' Na Mentoria eu entro com você por 60 minutos semanais para organizar, priorizar e fazer a operação rodar com clareza.'
      ];
      response.note = '60 minutos comigo por semana, aplicados ao seu cenário atual.';
      response.ctaText = 'Conversar 30 min comigo →';
      response.ctaUrl = 'https://call.ruccia.com.br/mateusrucci/diagnostico';
      return response;
    }

    response.qualified = false;
    response.title = 'Seu diagnóstico está pronto.';
    response.summary = 'O diagnóstico mostra uma fase de estruturação antes de avançar. Agora o foco é organizar a base da operação.';
    response.blocks = [
      primaryPain + '. ' + exposure,
      'Antes de qualquer programa, falta consolidar base mínima de operação, leitura de números e consistência para o marketing não depender só de esforço.',
      'Quando sua operação avançar mais um pouco, esse convite passa a fazer mais sentido.'
    ];
    response.note = '';
    response.ctaText = 'Seguir @mateusrucci no Instagram →';
    response.ctaUrl = 'https://www.instagram.com/mateusrucci/';
    return response;
  }

  function sbInsert(data) {
    return postSupabase('/rest/v1/diagnostico_personalizado_leads', data, 'return=minimal');
  }

  function sbUpsert(data) {
    return postSupabase('/rest/v1/diagnostico_personalizado_leads?on_conflict=session_id', data, 'resolution=merge-duplicates,return=minimal')
      .then(function(result) {
        if (result !== '__UPSERT_CONFLICT__') return result;
        return sbInsert(data);
      });
  }

  function postSupabase(path, data, prefer, removedColumns) {
    var stripped = removedColumns || [];
    var payload = Object.assign({}, data);

    stripped.forEach(function(key) {
      delete payload[key];
    });

    return fetch(SUPABASE_URL + path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Prefer': prefer,
      },
      body: JSON.stringify(payload),
    }).then(function(r) {
      if (!r.ok) {
        return r.text().then(function(t) {
          var missingColumn = getMissingSchemaColumn(t);
          if (missingColumn && stripped.indexOf(missingColumn) === -1) {
            console.warn('[DP] coluna ausente no schema cache, reenviando sem:', missingColumn);
            return postSupabase(path, data, prefer, stripped.concat(missingColumn));
          }

          console.error('[DP] request falhou (' + r.status + '):', t);
          if (t.indexOf('42P10') !== -1 || t.indexOf('no unique or exclusion constraint') !== -1) {
            return '__UPSERT_CONFLICT__';
          }
          return null;
        });
      }
      return payload.session_id;
    }).catch(function() { return null; });
  }

  function getMissingSchemaColumn(message) {
    var match = String(message || '').match(/Could not find the '([^']+)' column/);
    return match ? match[1] : '';
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

  window.__diagOpen = openModal;
  window.__diagClose = closeModal;
  window.__diagGo = function(url) {
    try { window.open(url, '_self'); } catch (e) {}
    try { window.location.assign(url); } catch (e) {}
    window.location.href = url;
  };

  function showStep(step) {
    clearTimeout(state.autoAdvanceTimer);
    state.currentStep = step;
    flow.querySelectorAll('.step').forEach(function(el) {
      el.classList.toggle('active', Number(el.dataset.step) === step);
    });
    updateProgress();
    validateCurrentStep();
    var activeStep = flow.querySelector('.step.active');
    if (activeStep) activeStep.scrollIntoView({ block: 'start', behavior: 'smooth' });
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
        var stepNumber = Number(step.dataset.step);
        step.querySelectorAll('.option[data-field="' + field + '"]').forEach(function(el) {
          el.classList.remove('selected');
        });
        opt.classList.add('selected');
        state.answers[field] = opt.dataset.value;
        if (!state.sessionId) state.sessionId = genSessionId();
        validateCurrentStep();
        var nextBtn = step.querySelector('[data-next]');
        if (nextBtn && !nextBtn.disabled) {
          clearTimeout(state.autoAdvanceTimer);
          state.autoAdvanceTimer = setTimeout(function() {
            if (state.currentStep === stepNumber) nextStep();
          }, 180);
        }
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
    var note = narrative.note;
    var ctaText = narrative.ctaText;
    var ctaUrl = narrative.ctaUrl;

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
      document.getElementById('qualifiedNote').textContent = note;
      document.getElementById('qualifiedNote').style.display = note ? '' : 'none';
      document.getElementById('qualifiedCta').textContent = ctaText;
      document.getElementById('qualifiedCta').setAttribute('href', ctaUrl);
      document.getElementById('qualifiedCta').setAttribute('onclick', "window.__diagGo && window.__diagGo('" + ctaUrl + "'); return false;");
    } else {
      document.getElementById('resultTitle').textContent = title;
      document.getElementById('resultSummary').textContent = summary;
      document.getElementById('resultBlock1').textContent = blocks[0];
      document.getElementById('resultBlock2').textContent = blocks[1];
      document.getElementById('resultBlock3').textContent = blocks[2];
      document.getElementById('resultNote').textContent = note;
      document.getElementById('resultNote').style.display = note ? '' : 'none';
      document.getElementById('resultCta').textContent = ctaText;
      document.getElementById('resultCta').setAttribute('href', ctaUrl);
      document.getElementById('resultCta').setAttribute('onclick', "window.__diagGo && window.__diagGo('" + ctaUrl + "'); return false;");
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
