/**
 * ===========================================================================
 *  HUB DE CONVERSÕES — OTA Odontologia
 *  Recebe leads do site (via PHP) e, 1x/dia, envia a JORNADA do cliente
 *  para o Meta (Conversions API): CONTATADO→Contact, Agendado→Schedule,
 *  Cliente→Purchase (com Valor). Idempotente: nunca envia o mesmo evento 2x.
 *
 *  Configuração fica em Script Properties (Projeto > Configurações):
 *    PIXEL_ID, ACCESS_TOKEN, SHARED_SECRET, (opcional) API_VERSION,
 *    SHEET_NAME, TEST_EVENT_CODE
 * ===========================================================================
 */

// Ordem das colunas da planilha (NÃO reordene sem rodar configurarPlanilha de novo)
var COLS = [
  'ID', 'Data/Hora', 'Origem', 'Nome', 'WhatsApp', 'Tratamento', 'Email',
  'fbclid', '_fbp', '_fbc', 'gclid', 'gbraid', 'wbraid',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'Landing', 'Referrer', 'IP', 'UserAgent', 'external_id', 'event_id_lead',
  'Status', 'Valor (R$)', 'Contato_enviado_em', 'Schedule_enviado_em', 'Purchase_enviado_em', 'Log'
];
function col_(name) { return COLS.indexOf(name); } // índice 0-based

function cfg_() {
  var p = PropertiesService.getScriptProperties();
  return {
    PIXEL_ID: p.getProperty('PIXEL_ID') || '',
    TOKEN:    p.getProperty('ACCESS_TOKEN') || '',
    API:      p.getProperty('API_VERSION') || 'v19.0',
    SECRET:   p.getProperty('SHARED_SECRET') || '',
    SHEET:    p.getProperty('SHEET_NAME') || 'Leads',
    TEST:     p.getProperty('TEST_EVENT_CODE') || ''
  };
}
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = cfg_().SHEET;
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
function sha_(v) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(v), Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
}

/* =========================================================================
 *  1) INGESTÃO — Web App (o PHP do site faz POST aqui)
 * ========================================================================= */
function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var body = JSON.parse(e.postData.contents || '{}');
    var c = cfg_();
    if (c.SECRET && body.secret !== c.SECRET) return json_({ ok: false, error: 'unauthorized' });

    var sh = sheet_();
    if (sh.getLastRow() === 0) configurarPlanilha(); // 1ª vez: cria cabeçalho

    var row = [];
    for (var i = 0; i < COLS.length; i++) row.push('');
    row[col_('ID')]            = Utilities.getUuid();
    row[col_('Data/Hora')]     = new Date();
    row[col_('Origem')]        = body.origem || 'Lead enviado';
    row[col_('Nome')]          = body.nome || '';
    row[col_('WhatsApp')]      = body.telefone || '';
    row[col_('Tratamento')]    = body.tratamento || '';
    row[col_('Email')]         = body.email || '';
    row[col_('fbclid')]        = body.fbclid || '';
    row[col_('_fbp')]          = body.fbp || '';
    row[col_('_fbc')]          = body.fbc || '';
    row[col_('gclid')]         = body.gclid || '';
    row[col_('gbraid')]        = body.gbraid || '';
    row[col_('wbraid')]        = body.wbraid || '';
    row[col_('utm_source')]    = body.utm_source || '';
    row[col_('utm_medium')]    = body.utm_medium || '';
    row[col_('utm_campaign')]  = body.utm_campaign || '';
    row[col_('utm_term')]      = body.utm_term || '';
    row[col_('utm_content')]   = body.utm_content || '';
    row[col_('Landing')]       = body.landing || '';
    row[col_('Referrer')]      = body.referrer || '';
    row[col_('IP')]            = body.ip || '';
    row[col_('UserAgent')]     = body.user_agent || '';
    row[col_('external_id')]   = body.external_id || '';
    row[col_('event_id_lead')] = body.event_id || '';
    sh.appendRow(row);
    return json_({ ok: true });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
function doGet() { return json_({ ok: true, hub: 'OTA', status: 'online' }); }

/* =========================================================================
 *  2) DISPARO DIÁRIO — envia a jornada pro Meta (gatilho à meia-noite)
 * ========================================================================= */
function enviarConversoesDiarias() {
  var lock = LockService.getScriptLock();
  lock.waitLock(60000);
  try {
    var c = cfg_();
    if (!c.PIXEL_ID || !c.TOKEN) throw new Error('Faltam PIXEL_ID/ACCESS_TOKEN nas Script Properties.');

    var sh = sheet_();
    var vals = sh.getDataRange().getValues();
    var sentCol = { Contact: 'Contato_enviado_em', Schedule: 'Schedule_enviado_em', Purchase: 'Purchase_enviado_em' };
    var offset  = { Contact: 0, Schedule: 60, Purchase: 120 };
    var base = Math.floor(Date.now() / 1000) - 180; // jornada ordenada nos últimos minutos

    for (var r = 1; r < vals.length; r++) {
      var row = vals[r];
      var status = String(row[col_('Status')] || '').trim().toLowerCase();
      var journey =
        status === 'contatado' ? ['Contact'] :
        status === 'agendado'  ? ['Contact', 'Schedule'] :
        status === 'cliente'   ? ['Contact', 'Schedule', 'Purchase'] : [];
      if (!journey.length) continue;

      var ud = montarUserData_(row);
      for (var j = 0; j < journey.length; j++) {
        var ev = journey[j];
        var sCol = col_(sentCol[ev]);
        if (row[sCol]) continue; // já enviado antes — não duplica

        var cd = { content_name: row[col_('Tratamento')] || '' };
        if (ev === 'Purchase') {
          var valor = parseFloat(String(row[col_('Valor (R$)')]).replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
          if (valor <= 0) { logRow_(sh, r, 'Purchase aguardando Valor'); continue; } // segura até preencher Valor
          cd.value = valor; cd.currency = 'BRL';
        }
        var eid = row[col_('ID')] + '_' + ev.toLowerCase();
        var res = enviarEventoMeta_(ev, ud, cd, eid, base + offset[ev], row[col_('Landing')]);
        if (res.ok) {
          sh.getRange(r + 1, sCol + 1).setValue(new Date());
          logRow_(sh, r, ev + ' enviado (recv=' + res.recv + ')');
        } else {
          logRow_(sh, r, ev + ' ERRO: ' + res.msg);
        }
        Utilities.sleep(300); // respiro entre chamadas
      }
    }
    try { montarGoogleAds(); } catch (e) {} // atualiza a aba de upload do Google Ads
  } finally {
    lock.releaseLock();
  }
}

/**
 * Monta a aba "Google Ads" no formato de importação de conversões offline.
 * O Google Ads puxa essa aba de forma agendada (Ferramentas > Conversões > Uploads).
 * Só inclui leads que vieram do Google (têm gclid) e já têm Status.
 * Re-montar todo dia é seguro: o Google deduplica por gclid + conversão + horário.
 */
function montarGoogleAds() {
  var sh = sheet_();
  var ss = sh.getParent();
  var tab = ss.getSheetByName('Google Ads') || ss.insertSheet('Google Ads');
  tab.clearContents();

  var nomes = { Contatado: 'OTA - Contatado', Agendado: 'OTA - Agendado', Cliente: 'OTA - Cliente' };
  var out = [
    ['Parameters:TimeZone=America/Sao_Paulo', '', '', '', ''],
    ['Google Click ID', 'Conversion Name', 'Conversion Time', 'Conversion Value', 'Conversion Currency']
  ];

  var vals = sh.getDataRange().getValues();
  for (var r = 1; r < vals.length; r++) {
    var row = vals[r];
    var gclid = String(row[col_('gclid')] || '').trim();
    if (!gclid) continue; // só Google
    var status = String(row[col_('Status')] || '').trim().toLowerCase();
    var journey =
      status === 'contatado' ? ['Contatado'] :
      status === 'agendado'  ? ['Contatado', 'Agendado'] :
      status === 'cliente'   ? ['Contatado', 'Agendado', 'Cliente'] : [];
    if (!journey.length) continue;

    var dt = row[col_('Data/Hora')];
    var time = Utilities.formatDate(dt instanceof Date ? dt : new Date(dt), 'America/Sao_Paulo', 'yyyy-MM-dd HH:mm:ss');
    for (var j = 0; j < journey.length; j++) {
      var nm = journey[j], val = '', cur = '';
      if (nm === 'Cliente') {
        var v = parseFloat(String(row[col_('Valor (R$)')]).replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
        if (v <= 0) continue; // sem Valor ainda, não exporta o Cliente
        val = v; cur = 'BRL';
      }
      out.push([gclid, nomes[nm], time, val, cur]);
    }
  }
  tab.getRange(1, 1, out.length, 5).setValues(out);
  SpreadsheetApp.getActiveSpreadsheet().toast('Aba "Google Ads" atualizada (' + (out.length - 2) + ' conversões).', 'Hub OTA', 5);
}

function montarUserData_(row) {
  var ud = {};
  var ph = String(row[col_('WhatsApp')] || '').replace(/\D/g, '');
  if (ph) { if (ph.length <= 11) ph = '55' + ph; ud.ph = [sha_(ph)]; }
  var em = String(row[col_('Email')] || '').trim();
  if (em) ud.em = [sha_(em.toLowerCase())];
  var nome = String(row[col_('Nome')] || '').trim();
  if (nome) {
    var parts = nome.split(/\s+/);
    ud.fn = [sha_(parts[0].toLowerCase())];
    if (parts.length > 1) ud.ln = [sha_(parts.slice(1).join(' ').toLowerCase())];
  }
  if (row[col_('_fbp')]) ud.fbp = row[col_('_fbp')];
  if (row[col_('_fbc')]) ud.fbc = row[col_('_fbc')];
  if (row[col_('external_id')]) ud.external_id = [sha_(String(row[col_('external_id')]))];
  if (row[col_('IP')]) ud.client_ip_address = row[col_('IP')];
  if (row[col_('UserAgent')]) ud.client_user_agent = row[col_('UserAgent')];
  ud.country = [sha_('br')];
  return ud;
}

function enviarEventoMeta_(eventName, userData, customData, eventId, eventTime, sourceUrl) {
  var c = cfg_();
  var ev = {
    event_name: eventName,
    event_time: eventTime,
    action_source: 'system_generated',
    event_id: eventId,
    user_data: userData
  };
  if (sourceUrl) ev.event_source_url = sourceUrl;
  if (customData && Object.keys(customData).length) ev.custom_data = customData;

  var payload = { data: [ev] };
  if (c.TEST) payload.test_event_code = c.TEST;

  var url = 'https://graph.facebook.com/' + c.API + '/' + c.PIXEL_ID + '/events?access_token=' + encodeURIComponent(c.TOKEN);
  try {
    var resp = UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify(payload), muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    var data = JSON.parse(resp.getContentText() || '{}');
    if (code >= 200 && code < 300) return { ok: true, recv: (data.events_received || 0) };
    return { ok: false, msg: 'HTTP ' + code + ' ' + (data.error && data.error.message || resp.getContentText()) };
  } catch (err) {
    return { ok: false, msg: String(err) };
  }
}

function logRow_(sh, rIndex, msg) {
  var cell = sh.getRange(rIndex + 1, col_('Log') + 1);
  var prev = cell.getValue();
  var stamp = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM HH:mm');
  cell.setValue(('[' + stamp + '] ' + msg + (prev ? '\n' + prev : '')).slice(0, 4000));
}

/* =========================================================================
 *  3) SETUP / UTILITÁRIOS (rodar uma vez pelo menu ou pelo editor)
 * ========================================================================= */
function configurarPlanilha() {
  var sh = sheet_();
  sh.getRange(1, 1, 1, COLS.length).setValues([COLS]).setFontWeight('bold').setBackground('#2A2A28').setFontColor('#fff');
  sh.setFrozenRows(1);
  // Dropdown de Status
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(['', 'CONTATADO', 'Agendado', 'Cliente'], true).build();
  sh.getRange(2, col_('Status') + 1, sh.getMaxRows() - 1, 1).setDataValidation(rule);
  // Esconde colunas de rastreamento (fbclid..event_id_lead) e de controle
  sh.hideColumns(col_('fbclid') + 1, col_('event_id_lead') - col_('fbclid') + 1);
  sh.hideColumns(col_('Contato_enviado_em') + 1, 4);
  // Larguras úteis
  sh.setColumnWidth(col_('Nome') + 1, 180);
  sh.setColumnWidth(col_('Status') + 1, 120);
  SpreadsheetApp.getActiveSpreadsheet().toast('Planilha configurada.', 'Hub OTA', 5);
}

function criarGatilhoDiario() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'enviarConversoesDiarias') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('enviarConversoesDiarias').timeBased().everyDays(1).atHour(0).inTimezone('America/Sao_Paulo').create();
  SpreadsheetApp.getActiveSpreadsheet().toast('Gatilho diário criado para 00:00 (BR).', 'Hub OTA', 5);
}

function testarMeta() {
  var c = cfg_();
  if (!c.PIXEL_ID || !c.TOKEN) { Logger.log('Configure PIXEL_ID e ACCESS_TOKEN primeiro.'); return; }
  var ud = { external_id: [sha_('teste_hub')], country: [sha_('br')] };
  var res = enviarEventoMeta_('Lead', ud, { content_name: 'Teste Hub' }, 'teste_hub_' + Date.now(), Math.floor(Date.now() / 1000), 'https://otaodontologia.com.br/');
  Logger.log(JSON.stringify(res));
  SpreadsheetApp.getActiveSpreadsheet().toast(res.ok ? 'Meta OK (recv=' + res.recv + ')' : 'Erro: ' + res.msg, 'Teste', 8);
}

function onOpen() {
  SpreadsheetApp.getUi().createMenu('⚡ Hub Conversões')
    .addItem('Configurar planilha', 'configurarPlanilha')
    .addItem('Criar gatilho diário (00:00)', 'criarGatilhoDiario')
    .addSeparator()
    .addItem('Enviar conversões agora', 'enviarConversoesDiarias')
    .addItem('Atualizar aba Google Ads', 'montarGoogleAds')
    .addItem('Testar conexão com o Meta', 'testarMeta')
    .addToUi();
}
