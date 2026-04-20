/**
 * Client-Side Tracking Integrado (Navegador + Servidor)
 * Envia eventos para api-tracking.php com todos os parâmetros
 * necessários para nota alta no Meta EMQ (Event Match Quality).
 */

const Tracker = {
    endpoint: './api-tracking.php',
    geoEndpoint: './api-diagnostico.php',

    /* ── Cookie helper ──────────────────────────────────────────── */
    getCookie: function (name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    },

    setCookie: function (name, value, days) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = name + '=' + value + ';expires=' + expires + ';path=/;SameSite=Lax';
    },

    /* ── external_id persistente (180 dias) ─────────────────────── */
    // Identifica o mesmo navegador entre sessões (+51% EMQ)
    getExternalId: function () {
        let id = this.getCookie('_ext_id');
        if (!id) {
            id = 'eid_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
            this.setCookie('_ext_id', id, 180);
        }
        return id;
    },

    /* ── fbc no formato correto: fb.1.{timestamp}.{fbclid} ──────── */
    // O cookie _fbc é setado automaticamente pelo Pixel quando fbclid está na URL.
    // Se o cookie não existir mas fbclid estiver na URL, formatamos manualmente.
    getFbc: function () {
        const cookie = this.getCookie('_fbc');
        if (cookie) return cookie;

        const match = window.location.search.match(/fbclid=([^&]*)/);
        if (match) {
            const fbc = 'fb.1.' + Date.now() + '.' + match[1];
            this.setCookie('_fbc', fbc, 90); // persiste para próximas páginas
            return fbc;
        }
        return null;
    },

    getFbp: function () {
        const cookie = this.getCookie('_fbp');
        if (cookie) return cookie;

        const seed = Math.floor(Math.random() * 1e10);
        const fbp = 'fb.1.' + Date.now() + '.' + seed;
        this.setCookie('_fbp', fbp, 90);
        return fbp;
    },

    normalizeEmail: function (email) {
        return String(email || '').trim().toLowerCase() || null;
    },

    normalizePhone: function (phone) {
        const digits = String(phone || '').replace(/\D/g, '');
        return digits || null;
    },

    getGeo: function () {
        if (window.__diagGeo) {
            return Promise.resolve(window.__diagGeo);
        }

        return fetch(this.geoEndpoint)
            .then((r) => r.ok ? r.json() : null)
            .then((result) => {
                const geo = (result && result.geo) ? result.geo : {};
                window.__diagGeo = geo;
                return geo;
            })
            .catch(() => ({}));
    },

    /* ── Disparo principal ───────────────────────────────────────── */
    /**
     * @param {string} eventName  Ex: 'PageView', 'Lead', 'CompleteRegistration'
     * @param {object} customData Ex: { value: 100, currency: 'BRL', lead_score: 'qualificado' }
     * @param {object} userData   Ex: { email, phone, fn, ln, external_id }
     */
    track: function (eventName, customData = {}, userData = {}) {
        // eventID único — garante deduplicação entre Pixel e CAPI
        const eventId = 'evt_' + Math.random().toString(36).slice(2) + '_' + Date.now();
        const fbp = this.getFbp();
        const fbc = this.getFbc();

        // 1. Pixel client-side (com eventID para deduplicação)
        if (typeof fbq === 'function') {
            fbq('track', eventName, customData, { eventID: eventId });
        } else {
            console.warn('[Tracker] fbq não encontrado — enviando só via servidor.');
        }

        // 2. Payload para o servidor PHP
        const payload = {
            eventName,
            eventId,
            eventUrl:    window.location.href,
            fbp:         fbp,
            fbc:         fbc,
            external_id: userData.external_id || this.getExternalId(),
            email:       this.normalizeEmail(userData.email),
            phone:       this.normalizePhone(userData.phone),   // E.164 sem + quando vier do form
            fn:          userData.fn     || null,   // primeiro nome
            ln:          userData.ln     || null,   // sobrenome
            custom_data: customData,
        };

        // 3. Envio server-side
        fetch(this.endpoint, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify(payload),
        })
        .then(r => r.json())
        .then(d => console.log(`[⚡ ${eventName}] CAPI:`, d))
        .catch(e => console.error(`[🚨 ${eventName}] Erro:`, e));
    },
};

/* ── Disparos automáticos ───────────────────────────────────────── */

// PageView ao carregar (com eventID — deduplicado com o Pixel)
document.addEventListener('DOMContentLoaded', () => {
    Tracker.getGeo().then((geo) => {
        Tracker.track('PageView', {
            cidade: geo.cidade || '',
            estado: geo.estado || '',
            pais: geo.pais || '',
        });
    });
});
