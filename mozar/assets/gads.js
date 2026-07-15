/**
 * Google Ads + Analytics Tracking — OTA Odontologia
 * - GA4 pageview (G-L5YRTPWYD2 + G-8GXX55D9P5 legado)
 * - Google Ads page-view conversion: fires once por page load
 * - Lead conversion: fires em qualquer form submit + via gtag_report_conversion()
 * Idempotente: se gtag ja estiver carregado, reutiliza.
 */
(function () {
  'use strict';
  if (window.__ota_gads_loaded) return;
  window.__ota_gads_loaded = true;

  var GADS_ID = 'AW-16570742481';
  var GA_IDS = ['G-L5YRTPWYD2', 'G-8GXX55D9P5'];
  var LEAD_LABEL = 'm_aRCNHCkJcaENHtxd09';
  var PV_LABEL = 'qunXCPnz9tAcENHtxd09';

  window.dataLayer = window.dataLayer || [];
  if (typeof window.gtag !== 'function') {
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_IDS[0];
    document.head.appendChild(s);
  }

  GA_IDS.forEach(function (id) { window.gtag('config', id); });
  window.gtag('config', GADS_ID);

  window.gtag('event', 'conversion', {
    send_to: GADS_ID + '/' + PV_LABEL,
    value: 1.0,
    currency: 'BRL'
  });

  window.gtag_report_conversion = function (url) {
    var navigated = false;
    var go = function () {
      if (navigated) return;
      navigated = true;
      if (typeof url !== 'undefined') { window.location = url; }
    };
    window.gtag('event', 'conversion', {
      send_to: GADS_ID + '/' + LEAD_LABEL,
      event_callback: go
    });
    if (typeof url !== 'undefined') { setTimeout(go, 1200); }
    return false;
  };

  document.addEventListener('submit', function () {
    try {
      window.gtag('event', 'conversion', { send_to: GADS_ID + '/' + LEAD_LABEL });
    } catch (e) {}
  }, true);
})();
