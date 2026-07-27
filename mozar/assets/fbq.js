/**
 * Meta Pixel + CAPI — OTA Odontologia
 * - Carrega o Meta Pixel base (906409825814867) se ainda nao estiver presente
 * - Dispara PageView automatico
 * - Dispara Lead em qualquer form submit, com phone/email extraidos do form
 * - Envia server-side pela CAPI (/api-tracking.php) com dedupe por eventID
 * Idempotente: convive com o tracking.js legado sem duplicar PageView.
 */
(function () {
  'use strict';
  if (window.__ota_fbq_loaded) return;
  window.__ota_fbq_loaded = true;

  var PIXEL_ID = '906409825814867';
  var CAPI_ENDPOINT = '/api-tracking.php';
  var hadTrackerBefore = typeof window.Tracker !== 'undefined';

  if (typeof window.fbq !== 'function') {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return;
      n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n;
      n.push = n; n.loaded = !0; n.version = '2.0'; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    }(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
    window.fbq('init', PIXEL_ID);
  }

  function getCookie(name) {
    var m = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return m ? m[2] : null;
  }

  function track(eventName, customData, userData) {
    customData = customData || {};
    userData = userData || {};
    var eventId = 'evt_' + Math.floor(Math.random() * 1e6) + '_' + Date.now();

    try {
      if (typeof window.fbq === 'function') {
        window.fbq('track', eventName, customData, { eventID: eventId });
      }
    } catch (e) {}

    var fbclidMatch = location.search.match(/fbclid=([^&]*)/);
    var payload = {
      eventName: eventName,
      eventId: eventId,
      eventUrl: window.location.href,
      fbp: getCookie('_fbp') || null,
      fbc: getCookie('_fbc') || (fbclidMatch ? fbclidMatch[1] : null),
      email: userData.email || null,
      phone: userData.phone || null,
      custom_data: customData
    };
    try {
      fetch(CAPI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      });
    } catch (e) {}
  }

  if (!hadTrackerBefore) {
    window.Tracker = { track: track, getCookie: getCookie };
    track('PageView');
  }

  document.addEventListener('submit', function (e) {
    try {
      var form = e.target;
      var phoneEl = form && form.querySelector ? form.querySelector('[name="phone"], [type="tel"]') : null;
      var emailEl = form && form.querySelector ? form.querySelector('[name="email"], [type="email"]') : null;
      var treatmentEl = form && form.querySelector ? form.querySelector('[name="treatment"]') : null;
      var nameEl = form && form.querySelector ? form.querySelector('[name="name"]') : null;

      var digits = phoneEl ? (phoneEl.value || '').replace(/\D/g, '') : '';
      if (digits && digits.length <= 11) digits = '55' + digits;

      var treatment = treatmentEl ? treatmentEl.value : '';
      var trackFn = (window.Tracker && window.Tracker.track) ? window.Tracker.track : track;
      trackFn('Lead',
        { content_name: treatment || 'avaliacao', content_category: 'odontologia', currency: 'BRL', value: 0 },
        { email: emailEl ? emailEl.value : null, phone: digits || null }
      );
    } catch (err) {}
  }, true);
})();
