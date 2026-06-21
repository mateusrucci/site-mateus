/**
 * Rastreamento integrado (Navegador + Servidor) — OTA Odontologia
 * Dispara o Pixel (fbq) e a Conversions API (api-tracking.php) com o MESMO eventID
 * (desduplicação) e enriquecimento máximo de dados. Pixel: 906409825814867.
 */

const Tracker = {
    endpoint: './api-tracking.php',

    getCookie: function (name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    },

    getParam: function (name) {
        const m = window.location.search.match(new RegExp('[?&]' + name + '=([^&]*)'));
        return m ? decodeURIComponent(m[1]) : null;
    },

    // ID externo persistente do visitante (melhora muito a qualidade do match)
    getExternalId: function () {
        try {
            let id = localStorage.getItem('ota_eid');
            if (!id) {
                id = 'ota_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
                localStorage.setItem('ota_eid', id);
            }
            return id;
        } catch (e) {
            return null;
        }
    },

    // Monta o fbc a partir do cookie ou do fbclid da URL
    getFbc: function () {
        const c = this.getCookie('_fbc');
        if (c) return c;
        const fbclid = this.getParam('fbclid');
        if (fbclid) return 'fb.1.' + Date.now() + '.' + fbclid;
        return null;
    },

    /**
     * Dispara um evento no navegador (Pixel) e no servidor (CAPI) com o mesmo eventID.
     * @param {string} eventName  Ex.: 'PageView', 'ViewContent', 'Lead'
     * @param {object} customData Ex.: { content_name: 'Lentes' }
     * @param {object} userData   Ex.: { firstName, lastName, phone, email }
     */
    track: function (eventName, customData = {}, userData = {}) {
        const eventId = 'evt_' + Math.floor(Math.random() * 1000000) + '_' + Date.now();
        const externalId = this.getExternalId();

        // 1) PIXEL DO NAVEGADOR (com advanced matching quando houver dados)
        if (typeof fbq === 'function') {
            if (userData.firstName || userData.lastName || userData.phone || userData.email) {
                try {
                    fbq('init', '906409825814867', {
                        fn: userData.firstName || undefined,
                        ln: userData.lastName || undefined,
                        ph: userData.phone || undefined,
                        em: userData.email || undefined,
                        external_id: externalId || undefined
                    });
                } catch (e) {}
            }
            fbq('track', eventName, customData, { eventID: eventId });
        } else {
            console.warn('Pixel (fbq) não encontrado; enviando apenas via servidor.');
        }

        // 2) SERVIDOR (CAPI) — pacote enriquecido
        const payload = {
            eventName: eventName,
            eventId: eventId,
            eventUrl: window.location.href,
            fbp: this.getCookie('_fbp') || null,
            fbc: this.getFbc(),
            fbclid: this.getParam('fbclid'),
            external_id: externalId,
            email: userData.email || null,
            phone: userData.phone || null,
            firstName: userData.firstName || null,
            lastName: userData.lastName || null,
            city: userData.city || null,
            state: userData.state || null,
            country: userData.country || 'br',
            custom_data: customData
        };

        fetch(this.endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            keepalive: true,
            body: JSON.stringify(payload)
        })
            .then(res => res.json())
            .then(data => console.log('[⚡ TRACK ' + eventName + '] OK via CAPI', data))
            .catch(err => console.error('[🚨 TRACK ' + eventName + '] Erro CAPI', err));
    }
};

// PageView automático
document.addEventListener('DOMContentLoaded', function () {
    Tracker.track('PageView');
});

window.Tracker = Tracker;
